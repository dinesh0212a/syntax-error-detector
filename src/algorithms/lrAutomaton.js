/**
 * lrAutomaton.js — LR(0) Item Set Construction
 * Builds the canonical collection of LR(0) items via closure() and goto()
 * which form the states of the SLR(1) parser automaton.
 */
'use strict';

const { EPSILON } = require('./grammarParser');

/**
 * An LR(0) item: A → α • β  (dot position within a production)
 */
function makeItem(prodId, dot) {
  return { prodId, dot };
}

function itemKey(item) {
  return `${item.prodId}:${item.dot}`;
}

/**
 * closure(items, grammar)
 * For each item A → α • B β, add all B → • γ items.
 */
function closure(items, grammar) {
  const { productions, productionMap, nonTerminals } = grammar;
  const closed = new Map();
  const queue  = [...items];

  for (const it of items) closed.set(itemKey(it), it);

  while (queue.length > 0) {
    const item = queue.shift();
    const prod = productions[item.prodId];
    const rhs  = prod.rhs;

    // Symbol after the dot
    if (item.dot >= rhs.length) continue;
    const nextSym = rhs[item.dot];
    if (nextSym === EPSILON) continue;
    if (!nonTerminals.has(nextSym)) continue;

    // Add all productions for nextSym with dot at position 0
    const alts = productionMap.get(nextSym) || [];
    for (const p of productions) {
      if (p.lhs !== nextSym) continue;
      const newItem = makeItem(p.id, 0);
      const key = itemKey(newItem);
      if (!closed.has(key)) {
        closed.set(key, newItem);
        queue.push(newItem);
      }
    }
  }

  return [...closed.values()];
}

/**
 * goto(items, symbol, grammar)
 * Move the dot past `symbol` and take closure.
 */
function gotoSet(items, symbol, grammar) {
  const { productions } = grammar;
  const moved = [];

  for (const item of items) {
    const prod = productions[item.prodId];
    const rhs  = prod.rhs;
    if (item.dot < rhs.length && rhs[item.dot] === symbol) {
      moved.push(makeItem(item.prodId, item.dot + 1));
    }
  }

  if (moved.length === 0) return null;
  return closure(moved, grammar);
}

/**
 * Canonical set key for deduplication
 */
function stateKey(items) {
  return items.map(itemKey).sort().join('|');
}

/**
 * buildAutomaton(grammar)
 * Returns { states, transitions }
 * states[i] = array of LR(0) items
 * transitions = Map<stateId, Map<symbol, stateId>>
 */
function buildAutomaton(grammar) {
  // Augment: S' → S
  const { startSymbol, productions, nonTerminals, terminals } = grammar;
  const augStart = `${startSymbol}'`;
  const augProd  = { id: productions.length, lhs: augStart, rhs: [startSymbol] };

  // We work with a local copy that includes the augmented production
  const allProds = [augProd, ...productions.map(p => ({ ...p, id: p.id + 1 }))];
  const augGrammar = {
    ...grammar,
    productions: allProds,
    productionMap: new Map([
      [augStart, [[startSymbol]]],
      ...grammar.productionMap
    ]),
    nonTerminals: new Set([augStart, ...grammar.nonTerminals]),
    startSymbol: augStart,
    augProd
  };

  const allSymbols = [...terminals, ...augGrammar.nonTerminals].filter(s => s !== grammar.EOF);

  const states      = [];
  const stateIndex  = new Map(); // key → id
  const transitions = new Map(); // stateId → Map<sym, stateId>
  const queue       = [];

  // Initial state: closure of { S' → • S }
  const init = closure([makeItem(0, 0)], augGrammar);
  const initKey = stateKey(init);
  states.push(init);
  stateIndex.set(initKey, 0);
  transitions.set(0, new Map());
  queue.push(0);

  while (queue.length > 0) {
    const stateId = queue.shift();
    const items   = states[stateId];
    const trans   = transitions.get(stateId);

    for (const sym of allSymbols) {
      const nextItems = gotoSet(items, sym, augGrammar);
      if (!nextItems || nextItems.length === 0) continue;

      const key = stateKey(nextItems);
      let nextId;
      if (!stateIndex.has(key)) {
        nextId = states.length;
        states.push(nextItems);
        stateIndex.set(key, nextId);
        transitions.set(nextId, new Map());
        queue.push(nextId);
      } else {
        nextId = stateIndex.get(key);
      }

      trans.set(sym, nextId);
    }
  }

  return { states, transitions, augGrammar };
}

module.exports = { buildAutomaton, closure, gotoSet };
