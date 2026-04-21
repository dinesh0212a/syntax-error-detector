/**
 * flightRecorder.js — The Omniscient Shift-Reduce Parser
 *
 * Unlike a normal parser that overwrites its stack, this records a complete
 * snapshot of EVERY operation. If a syntax error occurs, it performs
 * predictive crash diagnostics using FIRST/FOLLOW sets.
 */
'use strict';

const { EOF } = require('./grammarParser');
const { buildSLRTable } = require('./slrTable');
const { computeSets, formatSetsForAPI } = require('./firstFollowSets');

/**
 * tokenize(source)
 * Naively splits source into tokens by whitespace and single-char punctuation.
 * For real use, a proper lexer would go here.
 */
function tokenize(source) {
  // Split on whitespace, keep punctuation as separate tokens
  const raw = source.trim().split(/\s+/);
  const tokens = [];
  for (const tok of raw) {
    // Further split multi-char tokens that contain punctuation
    const parts = tok.match(/([a-zA-Z_][a-zA-Z0-9_]*|[^a-zA-Z0-9_\s])/g) || [tok];
    tokens.push(...parts);
  }
  tokens.push(EOF); // Append end marker
  return tokens;
}

/**
 * formatStackForDisplay(stateStack, symbolStack)
 */
function formatStack(stateStack, symbolStack) {
  const pairs = [];
  for (let i = 0; i < stateStack.length; i++) {
    pairs.push(symbolStack[i] !== undefined ? `${symbolStack[i]}(${stateStack[i]})` : `(${stateStack[i]})`);
  }
  return pairs.join(' ');
}

/**
 * parse(grammar, sourceCode)
 *
 * Returns a complete history object:
 * {
 *   success: bool,
 *   steps: [{ step, action, actionDetail, stateStack, symbolStack, inputBuffer, status }],
 *   diagnostic: string | null,
 *   expectedTokens: string[],
 *   crashState: number | null,
 *   productions: [...],
 *   sets: { first, follow }
 * }
 */
function parse(grammar, sourceCode) {
  const { ACTION, GOTO, states, conflicts, augGrammar } = buildSLRTable(grammar);
  const { firstSets, followSets } = computeSets(grammar);
  const { first, follow } = formatSetsForAPI(firstSets, followSets);
  const tokens = tokenize(sourceCode);

  const history = [];
  let stateStack  = [0];
  let symbolStack = ['$start'];
  let inputPos    = 0;
  let stepNum     = 0;

  function snapshot(action, actionDetail, status) {
    stepNum++;
    history.push({
      step       : stepNum,
      action,
      actionDetail,
      stateStack : [...stateStack],
      symbolStack: [...symbolStack],
      stackDisplay: formatStack(stateStack, symbolStack),
      inputBuffer: tokens.slice(inputPos).join(' '),
      currentToken: tokens[inputPos],
      status
    });
  }

  // Initial snapshot
  snapshot('INIT', 'Parser initialized. Pushing state 0.', 'running');

  const MAX_STEPS = 500;

  while (stepNum < MAX_STEPS) {
    const state   = stateStack[stateStack.length - 1];
    const token   = tokens[inputPos];
    const actionEntry = ACTION[state] && ACTION[state][token];

    if (!actionEntry) {
      // ── SYNTAX ERROR: Predictive Crash Diagnostics ─────────────────────
      const validTokens = Object.keys(ACTION[state] || {}).filter(k => ACTION[state][k]);

      // What FIRST sets are relevant to the current state?
      // Find any item in this state with the dot before a non-terminal
      const stateItems = states[state] || [];
      const relevantFirst = new Set();
      const relevantFollow = new Set();

      for (const item of stateItems) {
        const prod = augGrammar.productions[item.prodId];
        if (item.dot < prod.rhs.length) {
          const nextSym = prod.rhs[item.dot];
          if (grammar.nonTerminals.has(nextSym)) {
            const fs = firstSets.get(nextSym) || new Set();
            for (const s of fs) if (s !== 'ε') relevantFirst.add(s);
          }
        }
        // FOLLOW of the LHS if at the end
        if (item.dot >= prod.rhs.length && grammar.nonTerminals.has(prod.lhs)) {
          const fw = followSets.get(prod.lhs) || new Set();
          for (const s of fw) relevantFollow.add(s);
        }
      }

      const lastShifted = symbolStack[symbolStack.length - 1];
      const diagnostic = buildDiagnostic(
        state, token, validTokens, lastShifted,
        relevantFirst, relevantFollow, stateItems, augGrammar
      );

      snapshot('ERROR', diagnostic, 'error');

      return {
        success: false,
        steps: history,
        diagnostic,
        expectedTokens: validTokens,
        relevantFirst : [...relevantFirst],
        relevantFollow: [...relevantFollow],
        crashState: state,
        crashToken: token,
        productions: grammar.productions,
        conflicts,
        sets: { first, follow }
      };
    }

    if (actionEntry === 'acc') {
      snapshot('ACCEPT', `✅ Input accepted! Parsing complete.`, 'accepted');
      return {
        success: true,
        steps: history,
        diagnostic: null,
        expectedTokens: [],
        crashState: null,
        productions: grammar.productions,
        conflicts,
        sets: { first, follow }
      };
    }

    if (actionEntry.startsWith('s')) {
      // ── SHIFT ────────────────────────────────────────────────────────────
      const nextState = parseInt(actionEntry.slice(1), 10);
      stateStack.push(nextState);
      symbolStack.push(token);
      inputPos++;
      snapshot(
        'SHIFT',
        `Shift token "${token}" → go to state ${nextState}`,
        'running'
      );

    } else if (actionEntry.startsWith('r')) {
      // ── REDUCE ──────────────────────────────────────────────────────────
      const prodId = parseInt(actionEntry.slice(1), 10);
      const prod   = grammar.productions[prodId];
      const rhsLen = (prod.rhs.length === 1 && prod.rhs[0] === 'ε') ? 0 : prod.rhs.length;

      // Pop |rhs| symbols
      for (let i = 0; i < rhsLen; i++) {
        stateStack.pop();
        symbolStack.pop();
      }

      const topState = stateStack[stateStack.length - 1];
      const gotoState = GOTO[topState] && GOTO[topState][prod.lhs];

      if (gotoState === undefined) {
        const diag = `GOTO error after reduce by production ${prodId}: No entry for state ${topState} on "${prod.lhs}".`;
        snapshot('ERROR', diag, 'error');
        return {
          success: false,
          steps: history,
          diagnostic: diag,
          expectedTokens: [],
          crashState: topState,
          productions: grammar.productions,
          conflicts,
          sets: { first, follow }
        };
      }

      stateStack.push(gotoState);
      symbolStack.push(prod.lhs);

      snapshot(
        'REDUCE',
        `Reduce by: ${prod.lhs} → ${prod.rhs.join(' ')}  (prod #${prodId}). GOTO[${topState}][${prod.lhs}] = ${gotoState}`,
        'running'
      );
    }
  }

  return {
    success: false,
    steps: history,
    diagnostic: `Parser exceeded ${MAX_STEPS} steps — possible infinite loop in grammar.`,
    expectedTokens: [],
    crashState: stateStack[stateStack.length - 1],
    productions: grammar.productions,
    conflicts,
    sets: { first, follow }
  };
}

function buildDiagnostic(state, got, expected, lastShifted, relevantFirst, relevantFollow, stateItems, augGrammar) {
  const firstStr  = relevantFirst.size  > 0 ? `FIRST = {${[...relevantFirst].join(', ')}}` : null;
  const followStr = relevantFollow.size > 0 ? `FOLLOW = {${[...relevantFollow].join(', ')}}` : null;

  const setInfo = [firstStr, followStr].filter(Boolean).join('; ');

  const activeRules = stateItems
    .map(it => {
      const p = augGrammar.productions[it.prodId];
      const rhs = [...p.rhs];
      rhs.splice(it.dot, 0, '•');
      return `${p.lhs} → ${rhs.join(' ')}`;
    })
    .slice(0, 4) // limit display
    .join(' | ');

  return (
    `Parser crashed in State ${state}. ` +
    `Received unexpected token "${got}" after shifting "${lastShifted}". ` +
    `Expected one of: [${expected.join(', ')}]. ` +
    (setInfo ? `Mathematical sets in this state: ${setInfo}. ` : '') +
    `Active items: ${activeRules}.`
  );
}

module.exports = { parse, tokenize };
