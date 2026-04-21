/**
 * slrTable.js — SLR(1) Parsing Table Construction
 *
 * ACTION[state][terminal] = shift s | reduce n | accept
 * GOTO[state][nonTerminal] = state
 */
'use strict';

const { EPSILON, EOF } = require('./grammarParser');
const { buildAutomaton } = require('./lrAutomaton');
const { computeSets } = require('./firstFollowSets');

function buildSLRTable(grammar) {
  const { followSets } = computeSets(grammar);
  const { states, transitions, augGrammar } = buildAutomaton(grammar);

  const { productions: augProds, augProd } = augGrammar;
  const origProds = grammar.productions;

  const ACTION = []; // ACTION[i] = { terminal: action_string }
  const GOTO   = []; // GOTO[i]   = { nonTerminal: stateId }
  const conflicts = [];

  for (let i = 0; i < states.length; i++) {
    ACTION.push({});
    GOTO.push({});
  }

  for (let stateId = 0; stateId < states.length; stateId++) {
    const items = states[stateId];
    const trans = transitions.get(stateId) || new Map();

    // ── Shift and Goto entries from transitions ──────────────────────────
    for (const [sym, nextState] of trans.entries()) {
      if (grammar.terminals.has(sym)) {
        // Shift
        const entry = `s${nextState}`;
        if (ACTION[stateId][sym] && ACTION[stateId][sym] !== entry) {
          conflicts.push({ stateId, symbol: sym, existing: ACTION[stateId][sym], new: entry });
        }
        ACTION[stateId][sym] = entry;
      } else if (augGrammar.nonTerminals.has(sym) && sym !== augGrammar.startSymbol) {
        GOTO[stateId][sym] = nextState;
      }
    }

    // ── Reduce entries ───────────────────────────────────────────────────
    for (const item of items) {
      const prod = augProds[item.prodId];
      const rhs  = prod.rhs;
      const atEnd = item.dot >= rhs.length || (rhs.length === 1 && rhs[0] === EPSILON);

      if (!atEnd) continue;

      // Accept: S' → S •
      if (prod.lhs === augGrammar.startSymbol) {
        ACTION[stateId][EOF] = 'acc';
        continue;
      }

      // Find the original production index
      const origProd = origProds.find(
        p => p.lhs === prod.lhs && p.rhs.join(' ') === prod.rhs.join(' ')
      );
      if (!origProd) continue;

      const follow = followSets.get(prod.lhs) || new Set();
      for (const terminal of follow) {
        const entry = `r${origProd.id}`;
        if (ACTION[stateId][terminal] && ACTION[stateId][terminal] !== entry) {
          conflicts.push({
            stateId,
            symbol: terminal,
            existing: ACTION[stateId][terminal],
            new: entry,
            type: ACTION[stateId][terminal].startsWith('s') ? 'shift-reduce' : 'reduce-reduce'
          });
        } else {
          ACTION[stateId][terminal] = entry;
        }
      }
    }
  }

  return { ACTION, GOTO, states, transitions, augGrammar, conflicts };
}

module.exports = { buildSLRTable };
