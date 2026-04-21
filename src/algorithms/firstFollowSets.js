/**
 * ============================================================
 * MODULE: firstFollowSets.js
 * PHASE 1 — FIRST and FOLLOW Set Computation
 * ============================================================
 *
 * MATHEMATICAL DEFINITIONS
 * ────────────────────────
 *
 * FIRST(α) — for any string of grammar symbols α:
 *   The set of terminals that can appear as the FIRST symbol
 *   of some string derived from α.  ε is included iff α ⟹* ε.
 *
 * FOLLOW(A) — for any non-terminal A:
 *   The set of terminals (plus $) that can appear immediately
 *   to the RIGHT of A in some sentential form.
 *   ε is NEVER in FOLLOW.
 *
 * ALGORITHM (both use fixed-point / worklist iteration)
 * ─────────────────────────────────────────────────────
 *
 * computeFirst:
 *   For each non-terminal X, initialise FIRST(X) = {}.
 *   Repeat until no set changes:
 *     For each production X → Y1 Y2 … Yn:
 *       i = 1
 *       loop:
 *         add FIRST(Yi) \ {ε}  to FIRST(X)
 *         if ε ∉ FIRST(Yi), break
 *         i++
 *       if i > n (all Yi derive ε), add ε to FIRST(X)
 *
 * computeFollow:
 *   FOLLOW(S) = {$}  (S = start symbol)
 *   Repeat until no set changes:
 *     For each production A → α B β:
 *       add FIRST(β) \ {ε}  to FOLLOW(B)
 *       if ε ∈ FIRST(β), add FOLLOW(A) to FOLLOW(B)
 *     For each production A → α B (β is empty):
 *       add FOLLOW(A) to FOLLOW(B)
 *
 * COMPLEXITY: O(|G|² × |Σ|) where |G| is number of productions
 *             in the worst case (saturates after a bounded number
 *             of fixed-point rounds in practice).
 */

'use strict';

const { EPSILON, EOF } = require('./grammarParser');

/**
 * firstOfSequence
 * ───────────────
 * Helper: compute FIRST of a sequence of symbols [Y1,Y2,...,Yn]
 * given the already-computed firstSets map.
 *
 * @param  {string[]}              sequence
 * @param  {Map<string, Set>}      firstSets   current FIRST sets
 * @param  {Set<string>}           nonTerminals
 * @returns {Set<string>}          FIRST(sequence)
 */
function firstOfSequence(sequence, firstSets, nonTerminals) {
  const result = new Set();

  if (sequence.length === 0) {
    result.add(EPSILON);
    return result;
  }

  let allCanDeriveEpsilon = true;

  for (const sym of sequence) {
    if (sym === EPSILON) {
      // Bare ε in the sequence → contributes ε, continue
      result.add(EPSILON);
      continue;
    }

    if (!nonTerminals.has(sym)) {
      // Terminal symbol
      result.add(sym);
      allCanDeriveEpsilon = false;
      break;
    }

    // Non-terminal: add its FIRST \ {ε}
    const fSym = firstSets.get(sym) || new Set();
    for (const t of fSym) {
      if (t !== EPSILON) result.add(t);
    }

    if (!fSym.has(EPSILON)) {
      allCanDeriveEpsilon = false;
      break;
    }
    // If FIRST(sym) contains ε, continue to next symbol
  }

  if (allCanDeriveEpsilon) result.add(EPSILON);
  return result;
}

/**
 * computeFirst
 * ────────────
 * Compute FIRST sets for all non-terminals using fixed-point iteration.
 *
 * @param  {object} grammar  Output of parseGrammar()
 * @returns {Map<string, Set<string>>}  nonTerminal → FIRST set
 */
function computeFirst(grammar) {
  const { nonTerminals, productions } = grammar;

  // Initialise every NT with an empty set
  const firstSets = new Map();
  for (const nt of nonTerminals) {
    firstSets.set(nt, new Set());
  }

  let changed = true;
  let iterations = 0;

  while (changed) {
    changed = false;
    iterations++;

    for (const { lhs, rhs } of productions) {
      const target = firstSets.get(lhs);
      const before = target.size;

      const contribution = firstOfSequence(rhs, firstSets, nonTerminals);
      for (const sym of contribution) {
        target.add(sym);
      }

      if (target.size !== before) changed = true;
    }

    // Safety valve — theoretically cannot exceed |NT| × |T| rounds
    if (iterations > 1000) {
      throw new Error('FIRST set computation did not converge (possible grammar cycle).');
    }
  }

  return firstSets;
}

/**
 * computeFollow
 * ─────────────
 * Compute FOLLOW sets for all non-terminals using fixed-point iteration.
 * Requires that FIRST sets have already been computed.
 *
 * @param  {object}                   grammar    Output of parseGrammar()
 * @param  {Map<string, Set<string>>} firstSets  Output of computeFirst()
 * @returns {Map<string, Set<string>>}            nonTerminal → FOLLOW set
 */
function computeFollow(grammar, firstSets) {
  const { startSymbol, nonTerminals, productions } = grammar;

  // Initialise every NT with an empty set
  const followSets = new Map();
  for (const nt of nonTerminals) {
    followSets.set(nt, new Set());
  }

  // Rule 1: $ ∈ FOLLOW(start)
  followSets.get(startSymbol).add(EOF);

  let changed = true;
  let iterations = 0;

  while (changed) {
    changed = false;
    iterations++;

    for (const { lhs, rhs } of productions) {
      // Walk each symbol in the RHS
      for (let i = 0; i < rhs.length; i++) {
        const B = rhs[i];

        // Only non-terminals can have FOLLOW sets
        if (!nonTerminals.has(B)) continue;

        const followB = followSets.get(B);
        const before  = followB.size;

        // β = the suffix after B
        const beta = rhs.slice(i + 1);

        if (beta.length === 0) {
          // Rule 3: A → α B   (B is last) → FOLLOW(B) ⊇ FOLLOW(A)
          const followA = followSets.get(lhs);
          for (const sym of followA) followB.add(sym);
        } else {
          // Rule 2: A → α B β
          const firstBeta = firstOfSequence(beta, firstSets, nonTerminals);

          // Add FIRST(β) \ {ε} to FOLLOW(B)
          for (const sym of firstBeta) {
            if (sym !== EPSILON) followB.add(sym);
          }

          // If ε ∈ FIRST(β), also add FOLLOW(A) to FOLLOW(B)
          if (firstBeta.has(EPSILON)) {
            const followA = followSets.get(lhs);
            for (const sym of followA) followB.add(sym);
          }
        }

        if (followB.size !== before) changed = true;
      }
    }

    if (iterations > 1000) {
      throw new Error('FOLLOW set computation did not converge.');
    }
  }

  return followSets;
}

/**
 * computeSets
 * ───────────
 * Convenience wrapper: compute both FIRST and FOLLOW in one call.
 *
 * @param  {object} grammar  Output of parseGrammar()
 * @returns {{ firstSets, followSets, firstOfSequence }}
 */
function computeSets(grammar) {
  const firstSets  = computeFirst(grammar);
  const followSets = computeFollow(grammar, firstSets);

  // Expose firstOfSequence for downstream use (LR table construction)
  return {
    firstSets,
    followSets,
    firstOfSequence: (seq) => firstOfSequence(seq, firstSets, grammar.nonTerminals)
  };
}

/**
 * formatSetsForAPI
 * ────────────────
 * Convert Maps of Sets → plain objects for JSON serialisation.
 */
function formatSetsForAPI(firstSets, followSets) {
  const first  = {};
  const follow = {};

  for (const [nt, s] of firstSets)  first[nt]  = [...s].sort();
  for (const [nt, s] of followSets) follow[nt] = [...s].sort();

  return { first, follow };
}

module.exports = { computeFirst, computeFollow, computeSets, firstOfSequence, formatSetsForAPI };
