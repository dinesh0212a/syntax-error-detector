/**
 * ============================================================
 * MODULE: grammarParser.js
 * PHASE 1 — Context-Free Grammar String → Structured Data
 * ============================================================
 *
 * RESPONSIBILITY:
 *   Accept a raw multi-line string such as:
 *
 *     E  -> E + T | T
 *     T  -> T * F | F
 *     F  -> ( E ) | id
 *
 *   and transform it into the canonical internal representation
 *   used by every downstream algorithm (FIRST, FOLLOW, LR table).
 *
 * OUTPUT SCHEMA:
 *   {
 *     startSymbol : string,          // First LHS encountered
 *     nonTerminals: Set<string>,     // All LHS symbols
 *     terminals   : Set<string>,     // All RHS symbols not in nonTerminals
 *     productions : [                // Flat array of single productions
 *       { lhs: string, rhs: string[] }
 *     ],
 *     productionMap: Map<string, string[][]>  // nonTerminal → [[sym,...],...]
 *   }
 *
 * GRAMMAR FORMAT RULES (accepted by this parser):
 *   • Arrow: '->' or '→' or '::='
 *   • Alternation: '|' separates alternatives on the same line
 *   • Epsilon: write 'ε', 'epsilon', or '#' to denote empty string
 *   • Symbols are whitespace-delimited tokens
 *   • Blank lines and lines starting with '//' are ignored
 *   • Non-terminals are any token that appears as the LHS of a rule
 *     (they may also appear on the RHS; terminals are everything else)
 */

'use strict';

// Canonical epsilon representation used internally
const EPSILON = 'ε';
const EOF     = '$';

/**
 * Normalise raw epsilon tokens to the canonical EPSILON constant.
 */
function normaliseEpsilon(token) {
  if (token === 'ε' || token === 'epsilon' || token === '#') return EPSILON;
  return token;
}

/**
 * parseGrammar
 * ------------
 * @param  {string} rawText  Multi-line CFG string from the user
 * @returns {object}         Structured grammar object (see schema above)
 * @throws  {Error}          On malformed input with a descriptive message
 */
function parseGrammar(rawText) {
  if (typeof rawText !== 'string' || rawText.trim() === '') {
    throw new Error('Grammar input is empty or not a string.');
  }

  // ── Step 1: Tokenise lines ──────────────────────────────────────────────
  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('//'));

  if (lines.length === 0) {
    throw new Error('No valid grammar rules found after stripping comments/blanks.');
  }

  // ── Step 2: Parse each line into { lhs, alternatives[] } ───────────────
  const rawRules = []; // [ { lhs: string, alternatives: string[][] } ]

  for (const line of lines) {
    // Split on arrow variants
    const arrowMatch = line.match(/^(.+?)\s*(?:->|→|::=)\s*(.+)$/);
    if (!arrowMatch) {
      throw new Error(`Malformed rule (no arrow found): "${line}"`);
    }

    const lhsRaw = arrowMatch[1].trim();
    const rhsRaw = arrowMatch[2].trim();

    // LHS must be a single symbol
    if (/\s/.test(lhsRaw)) {
      throw new Error(`LHS must be a single symbol, got: "${lhsRaw}"`);
    }
    const lhs = lhsRaw;

    // Split RHS on '|' to get alternatives
    const alternatives = rhsRaw
      .split('|')
      .map(alt => {
        const symbols = alt.trim().split(/\s+/).map(normaliseEpsilon);
        if (symbols.length === 0 || (symbols.length === 1 && symbols[0] === '')) {
          throw new Error(`Empty alternative in rule for "${lhs}".`);
        }
        return symbols;
      });

    rawRules.push({ lhs, alternatives });
  }

  // ── Step 3: Identify start symbol and non-terminals ────────────────────
  const startSymbol  = rawRules[0].lhs;
  const nonTerminals = new Set(rawRules.map(r => r.lhs));

  // ── Step 4: Build flat productions array and productionMap ──────────────
  const productions  = []; // { id, lhs, rhs }
  const productionMap = new Map(); // string → string[][]

  for (const rule of rawRules) {
    if (!productionMap.has(rule.lhs)) productionMap.set(rule.lhs, []);

    for (const alt of rule.alternatives) {
      const prod = { id: productions.length, lhs: rule.lhs, rhs: alt };
      productions.push(prod);
      productionMap.get(rule.lhs).push(alt);
    }
  }

  // ── Step 5: Identify terminals (all RHS symbols not in nonTerminals) ───
  const terminals = new Set();
  for (const { rhs } of productions) {
    for (const sym of rhs) {
      if (sym !== EPSILON && !nonTerminals.has(sym)) {
        terminals.add(sym);
      }
    }
  }
  // EOF is always a terminal (used by FOLLOW)
  terminals.add(EOF);

  // ── Step 6: Validate – every NT on the RHS has at least one production ─
  for (const { rhs } of productions) {
    for (const sym of rhs) {
      if (nonTerminals.has(sym) && !productionMap.has(sym)) {
        throw new Error(
          `Non-terminal "${sym}" is used on RHS but has no production rules.`
        );
      }
    }
  }

  return {
    startSymbol,
    nonTerminals,
    terminals,
    productions,
    productionMap,
    EPSILON,
    EOF
  };
}

module.exports = { parseGrammar, EPSILON, EOF };
