'use strict';
/**
 * grammarChecks.js
 * ─────────────────
 * Detects left recursion (direct & indirect) and left factoring issues.
 * Also performs left-recursion elimination and left-factoring transformation.
 */

const { EPSILON } = require('./grammarParser');

// ─────────────────────────────────────────────
// LEFT RECURSION DETECTION
// ─────────────────────────────────────────────

/**
 * Detect direct left recursion: A → A α
 */
function detectDirectLeftRecursion(grammar) {
  const issues = [];
  for (const [nt, alts] of grammar.productionMap.entries()) {
    const recursive = alts.filter(rhs => rhs[0] === nt);
    if (recursive.length > 0) {
      issues.push({
        type: 'direct',
        nonTerminal: nt,
        recursiveProductions: recursive.map(r => `${nt} → ${r.join(' ')}`),
        nonRecursiveProductions: alts
          .filter(rhs => rhs[0] !== nt)
          .map(r => `${nt} → ${r.join(' ')}`)
      });
    }
  }
  return issues;
}

/**
 * Detect indirect left recursion using reachability / cycle detection.
 * A → B γ and B →* A δ ⟹ indirect left recursion involving A and B.
 */
function detectIndirectLeftRecursion(grammar) {
  const { nonTerminals, productionMap } = grammar;
  const ntList = [...nonTerminals];

  // Build first-symbol reachability graph: NT → set of NTs that can appear first
  function firstNTs(nt, visited = new Set()) {
    if (visited.has(nt)) return new Set();
    visited.add(nt);
    const reach = new Set();
    const alts = productionMap.get(nt) || [];
    for (const rhs of alts) {
      const first = rhs[0];
      if (first && nonTerminals.has(first) && first !== EPSILON) {
        reach.add(first);
        for (const r of firstNTs(first, new Set(visited))) reach.add(r);
      }
    }
    return reach;
  }

  const cycles = [];
  const reported = new Set();

  for (const nt of ntList) {
    const reachable = firstNTs(nt);
    if (reachable.has(nt)) {
      // Find the cycle path
      const path = findCyclePath(nt, productionMap, nonTerminals, grammar);
      const key = path.join('→');
      if (!reported.has(key)) {
        reported.add(key);
        cycles.push({ type: 'indirect', cycle: path, description: path.join(' → ') });
      }
    }
  }
  return cycles;
}

function findCyclePath(start, productionMap, nonTerminals, grammar) {
  const queue = [[start, [start]]];
  const visited = new Set();
  while (queue.length) {
    const [cur, path] = queue.shift();
    const alts = productionMap.get(cur) || [];
    for (const rhs of alts) {
      const first = rhs[0];
      if (!first || !nonTerminals.has(first) || first === EPSILON) continue;
      if (first === start) return [...path, start];
      if (!visited.has(first)) {
        visited.add(first);
        queue.push([first, [...path, first]]);
      }
    }
  }
  return [start, start];
}

// ─────────────────────────────────────────────
// LEFT FACTORING DETECTION
// ─────────────────────────────────────────────

/**
 * A non-terminal needs left factoring if two or more of its alternatives
 * share a common prefix (first symbol).
 */
function detectLeftFactoring(grammar) {
  const issues = [];
  for (const [nt, alts] of grammar.productionMap.entries()) {
    const groups = {};
    for (const rhs of alts) {
      const key = rhs[0] || EPSILON;
      if (!groups[key]) groups[key] = [];
      groups[key].push(rhs);
    }
    for (const [prefix, prods] of Object.entries(groups)) {
      if (prods.length > 1) {
        issues.push({
          nonTerminal: nt,
          commonPrefix: prefix,
          conflictingProductions: prods.map(r => `${nt} → ${r.join(' ')}`)
        });
      }
    }
  }
  return issues;
}

// ─────────────────────────────────────────────
// LEFT RECURSION ELIMINATION
// ─────────────────────────────────────────────

/**
 * Eliminate direct left recursion for a single non-terminal.
 * A → A α₁ | A α₂ | β₁ | β₂
 * becomes:
 * A  → β₁ A' | β₂ A'
 * A' → α₁ A' | α₂ A' | ε
 */
function eliminateDirectLeftRecursion(nt, alts) {
  const recursive    = alts.filter(r => r[0] === nt);
  const nonRecursive = alts.filter(r => r[0] !== nt);

  if (recursive.length === 0) return null; // nothing to do

  const newNT   = nt + "'";
  const newAlts = nonRecursive.map(r => [...r, newNT]);
  const tailAlts = recursive.map(r => [...r.slice(1), newNT]);
  tailAlts.push([EPSILON]);

  return { nt, newNT, newAlts, tailAlts };
}

/**
 * Full left-recursion elimination result (direct only for now).
 * Returns transformed grammar rules as a string.
 */
function eliminateLeftRecursion(grammar) {
  const lines = [];
  const extra  = [];

  for (const [nt, alts] of grammar.productionMap.entries()) {
    const res = eliminateDirectLeftRecursion(nt, alts);
    if (!res) {
      lines.push(`${nt} → ${alts.map(r => r.join(' ')).join(' | ')}`);
    } else {
      lines.push(`${res.nt} → ${res.newAlts.map(r => r.join(' ')).join(' | ')}`);
      extra.push(`${res.newNT} → ${res.tailAlts.map(r => r.join(' ')).join(' | ')}`);
    }
  }
  return [...lines, ...extra].join('\n');
}

// ─────────────────────────────────────────────
// LEFT FACTORING TRANSFORMATION
// ─────────────────────────────────────────────

function applyLeftFactoring(grammar) {
  const lines = [];

  for (const [nt, alts] of grammar.productionMap.entries()) {
    const groups = {};
    for (const rhs of alts) {
      const key = rhs[0] || EPSILON;
      if (!groups[key]) groups[key] = [];
      groups[key].push(rhs);
    }

    const newProds = [];
    const extras = [];
    let counter = 1;

    for (const [prefix, prods] of Object.entries(groups)) {
      if (prods.length === 1) {
        newProds.push(prods[0]);
      } else {
        const factored = `${nt}${counter++}`;
        newProds.push([prefix, factored]);
        const tails = prods.map(r => r.slice(1).length === 0 ? [EPSILON] : r.slice(1));
        extras.push(`${factored} → ${tails.map(r => r.join(' ')).join(' | ')}`);
      }
    }
    lines.push(`${nt} → ${newProds.map(r => r.join(' ')).join(' | ')}`);
    lines.push(...extras);
  }
  return lines.join('\n');
}

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────

function analyzeGrammar(grammar) {
  const directLR   = detectDirectLeftRecursion(grammar);
  const indirectLR = detectIndirectLeftRecursion(grammar);
  const leftFactor = detectLeftFactoring(grammar);

  const hasLR = directLR.length > 0 || indirectLR.length > 0;
  const hasLF = leftFactor.length > 0;

  let eliminatedLR  = null;
  let factoredGrammar = null;

  if (hasLR) {
    try { eliminatedLR = eliminateLeftRecursion(grammar); } catch (e) { /* ignore */ }
  }
  if (hasLF) {
    try { factoredGrammar = applyLeftFactoring(grammar); } catch (e) { /* ignore */ }
  }

  return {
    leftRecursion: {
      detected: hasLR,
      direct: directLR,
      indirect: indirectLR,
      eliminatedGrammar: eliminatedLR
    },
    leftFactoring: {
      detected: hasLF,
      issues: leftFactor,
      transformedGrammar: factoredGrammar
    }
  };
}

module.exports = { analyzeGrammar };
