'use strict';
/**
 * clrLalrTable.js
 * ────────────────
 * CLR(1) — Canonical LR(1) parsing table
 * LALR(1) — Lookahead LR(1) parsing table (merges CLR(1) states)
 *
 * An LR(1) item is: [prodId, dot, lookahead]
 * The lookahead set is a Set<terminal>.
 */

const { EPSILON, EOF } = require('./grammarParser');
const { firstOfSequence, computeSets } = require('./firstFollowSets');

// ──────────────────────────────────────────────────────────
// AUGMENT GRAMMAR
// ──────────────────────────────────────────────────────────

function augment(grammar) {
  const augStart = `${grammar.startSymbol}'`;
  const augProd  = { id: 0, lhs: augStart, rhs: [grammar.startSymbol] };
  const allProds = [augProd, ...grammar.productions.map(p => ({ ...p, id: p.id + 1 }))];

  return {
    ...grammar,
    startSymbol: augStart,
    productions: allProds,
    productionMap: new Map([
      [augStart, [[grammar.startSymbol]]],
      ...grammar.productionMap
    ]),
    nonTerminals: new Set([augStart, ...grammar.nonTerminals]),
    origStartSymbol: grammar.startSymbol,
    augProd
  };
}

// ──────────────────────────────────────────────────────────
// LR(1) CLOSURE & GOTO
// ──────────────────────────────────────────────────────────

function lr1ItemKey(prodId, dot, lookahead) {
  return `${prodId}:${dot}:${lookahead}`;
}

function lr1Closure(items, augG, firstSets) {
  const closed = new Map();
  const queue  = [];

  for (const item of items) {
    const key = lr1ItemKey(item.prodId, item.dot, item.lookahead);
    if (!closed.has(key)) {
      closed.set(key, item);
      queue.push(item);
    }
  }

  while (queue.length > 0) {
    const { prodId, dot, lookahead } = queue.shift();
    const prod = augG.productions[prodId];
    if (!prod || dot >= prod.rhs.length) continue;

    const B = prod.rhs[dot];
    if (!augG.nonTerminals.has(B) || B === EPSILON) continue;

    // Compute FIRST(β a) where β = prod.rhs[dot+1..] and a = lookahead
    const beta = [...prod.rhs.slice(dot + 1), lookahead];
    const firstBeta = firstOfSequence(beta, firstSets, augG.nonTerminals);

    for (const p of augG.productions) {
      if (p.lhs !== B) continue;
      for (const la of firstBeta) {
        if (la === EPSILON) continue;
        const key = lr1ItemKey(p.id, 0, la);
        if (!closed.has(key)) {
          const newItem = { prodId: p.id, dot: 0, lookahead: la };
          closed.set(key, newItem);
          queue.push(newItem);
        }
      }
    }
  }

  return [...closed.values()];
}

function lr1Goto(items, symbol, augG, firstSets) {
  const moved = items
    .filter(({ prodId, dot }) => {
      const p = augG.productions[prodId];
      return p && dot < p.rhs.length && p.rhs[dot] === symbol;
    })
    .map(({ prodId, dot, lookahead }) => ({ prodId, dot: dot + 1, lookahead }));

  if (moved.length === 0) return null;
  return lr1Closure(moved, augG, firstSets);
}

function stateKey1(items) {
  return items.map(i => lr1ItemKey(i.prodId, i.dot, i.lookahead)).sort().join('|');
}

// ──────────────────────────────────────────────────────────
// BUILD CLR(1) AUTOMATON
// ──────────────────────────────────────────────────────────

function buildCLRAutomaton(grammar) {
  const augG = augment(grammar);
  const { firstSets } = computeSets(grammar);

  const allSymbols = [
    ...grammar.terminals,
    ...augG.nonTerminals
  ].filter(s => s !== EOF);

  const initItems = lr1Closure(
    [{ prodId: 0, dot: 0, lookahead: EOF }],
    augG, firstSets
  );

  const states      = [initItems];
  const stateIndex  = new Map([[stateKey1(initItems), 0]]);
  const transitions = new Map([[0, new Map()]]);
  const queue       = [0];

  while (queue.length > 0) {
    const sid = queue.shift();
    const items = states[sid];

    for (const sym of allSymbols) {
      const next = lr1Goto(items, sym, augG, firstSets);
      if (!next || next.length === 0) continue;

      const key = stateKey1(next);
      let nid;
      if (!stateIndex.has(key)) {
        nid = states.length;
        states.push(next);
        stateIndex.set(key, nid);
        transitions.set(nid, new Map());
        queue.push(nid);
      } else {
        nid = stateIndex.get(key);
      }
      transitions.get(sid).set(sym, nid);
    }
  }

  return { states, transitions, augG, firstSets };
}

// ──────────────────────────────────────────────────────────
// BUILD CLR(1) PARSING TABLE
// ──────────────────────────────────────────────────────────

function buildCLRTable(grammar) {
  const { states, transitions, augG } = buildCLRAutomaton(grammar);
  const origProds = grammar.productions;

  const ACTION = states.map(() => ({}));
  const GOTO   = states.map(() => ({}));
  const conflicts = [];

  for (let sid = 0; sid < states.length; sid++) {
    const items = states[sid];
    const trans = transitions.get(sid) || new Map();

    // Shifts & Gotos
    for (const [sym, nid] of trans.entries()) {
      if (grammar.terminals.has(sym)) {
        setAction(ACTION, conflicts, sid, sym, `s${nid}`);
      } else if (augG.nonTerminals.has(sym) && sym !== augG.startSymbol) {
        GOTO[sid][sym] = nid;
      }
    }

    // Reduces & Accept
    for (const item of items) {
      const prod = augG.productions[item.prodId];
      const atEnd = item.dot >= prod.rhs.length ||
        (prod.rhs.length === 1 && prod.rhs[0] === EPSILON);
      if (!atEnd) continue;

      if (prod.lhs === augG.startSymbol) {
        setAction(ACTION, conflicts, sid, EOF, 'acc');
        continue;
      }

      const orig = origProds.find(
        p => p.lhs === prod.lhs && p.rhs.join(' ') === prod.rhs.join(' ')
      );
      if (!orig) continue;

      setAction(ACTION, conflicts, sid, item.lookahead, `r${orig.id}`);
    }
  }

  return { ACTION, GOTO, states, transitions, augG, conflicts };
}

// ──────────────────────────────────────────────────────────
// LALR(1): MERGE CLR(1) STATES WITH SAME LR(0) CORE
// ──────────────────────────────────────────────────────────

function lr0Core(items) {
  return items.map(i => `${i.prodId}:${i.dot}`).sort().join('|');
}

function buildLALRTable(grammar) {
  const { states: clrStates, transitions: clrTrans, augG } = buildCLRAutomaton(grammar);
  const origProds = grammar.productions;

  // Group CLR states by LR(0) core
  const coreMap = new Map(); // coreKey → [clrStateId, ...]
  for (let i = 0; i < clrStates.length; i++) {
    const core = lr0Core(clrStates[i]);
    if (!coreMap.has(core)) coreMap.set(core, []);
    coreMap.get(core).push(i);
  }

  // Map each CLR state id → LALR state id
  const clrToLalr = new Map();
  const lalrStates = [];
  let lalrId = 0;

  for (const [, clrIds] of coreMap.entries()) {
    // Merge items: same prodId:dot, union of lookaheads
    const merged = new Map();
    for (const cid of clrIds) {
      clrToLalr.set(cid, lalrId);
      for (const item of clrStates[cid]) {
        const coreKey = `${item.prodId}:${item.dot}`;
        if (!merged.has(coreKey)) merged.set(coreKey, { ...item, lookaheads: new Set() });
        merged.get(coreKey).lookaheads.add(item.lookahead);
      }
    }
    lalrStates.push([...merged.values()]);
    lalrId++;
  }

  // Rebuild transitions for LALR
  const lalrTrans = new Map();
  for (let i = 0; i < lalrStates.length; i++) lalrTrans.set(i, new Map());

  for (const [cid, lid] of clrToLalr.entries()) {
    const trans = clrTrans.get(cid) || new Map();
    for (const [sym, nextCid] of trans.entries()) {
      const nextLid = clrToLalr.get(nextCid);
      lalrTrans.get(lid).set(sym, nextLid);
    }
  }

  // Build ACTION / GOTO
  const ACTION = lalrStates.map(() => ({}));
  const GOTO   = lalrStates.map(() => ({}));
  const conflicts = [];

  for (let sid = 0; sid < lalrStates.length; sid++) {
    const items = lalrStates[sid];
    const trans = lalrTrans.get(sid) || new Map();

    for (const [sym, nid] of trans.entries()) {
      if (grammar.terminals.has(sym)) {
        setAction(ACTION, conflicts, sid, sym, `s${nid}`);
      } else if (augG.nonTerminals.has(sym) && sym !== augG.startSymbol) {
        GOTO[sid][sym] = nid;
      }
    }

    for (const item of items) {
      const prod = augG.productions[item.prodId];
      const atEnd = item.dot >= prod.rhs.length ||
        (prod.rhs.length === 1 && prod.rhs[0] === EPSILON);
      if (!atEnd) continue;

      if (prod.lhs === augG.startSymbol) {
        setAction(ACTION, conflicts, sid, EOF, 'acc');
        continue;
      }

      const orig = origProds.find(
        p => p.lhs === prod.lhs && p.rhs.join(' ') === prod.rhs.join(' ')
      );
      if (!orig) continue;

      const lookaheads = item.lookaheads || new Set([item.lookahead]);
      for (const la of lookaheads) {
        setAction(ACTION, conflicts, sid, la, `r${orig.id}`);
      }
    }
  }

  return { ACTION, GOTO, states: lalrStates, transitions: lalrTrans, augG, conflicts };
}

// ──────────────────────────────────────────────────────────
// HELPER
// ──────────────────────────────────────────────────────────

function setAction(ACTION, conflicts, sid, sym, entry) {
  const existing = ACTION[sid][sym];
  if (existing && existing !== entry) {
    const type = existing.startsWith('s') ? 'shift-reduce' : 'reduce-reduce';
    conflicts.push({ stateId: sid, symbol: sym, existing, new: entry, type });
    // keep existing (default conflict resolution)
  } else {
    ACTION[sid][sym] = entry;
  }
}

module.exports = { buildCLRTable, buildLALRTable };
