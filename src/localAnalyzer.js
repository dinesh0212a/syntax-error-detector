import { parseGrammar } from './algorithms/grammarParser';
import { computeSets, formatSetsForAPI } from './algorithms/firstFollowSets';
import { buildSLRTable } from './algorithms/slrTable';
import { buildCLRTable, buildLALRTable } from './algorithms/clrLalrTable';
import { parse } from './algorithms/flightRecorder';
import { analyzeGrammar } from './algorithms/grammarChecks';

function serializeTable(ACTION, GOTO, grammar) {
  const allTerminals    = [...grammar.terminals].sort();
  const allNonTerminals = [...grammar.nonTerminals].sort();
  const rows = ACTION.map((actionRow, stateId) => {
    const row = { state: stateId };
    for (const t  of allTerminals)    row[t]  = actionRow[t]  || '';
    for (const nt of allNonTerminals) row[nt] = (GOTO[stateId] && GOTO[stateId][nt] !== undefined) ? `${GOTO[stateId][nt]}` : '';
    return row;
  });
  return { headers: { terminals: allTerminals, nonTerminals: allNonTerminals }, rows };
}

export function localAnalyze({ grammar: rawGrammar, source, tableType = 'SLR' }) {
  if (!rawGrammar) throw new Error('Grammar is required.');
  try {
    const grammar = parseGrammar(rawGrammar);
    const { firstSets, followSets } = computeSets(grammar);
    const { first, follow } = formatSetsForAPI(firstSets, followSets);
    const grammarAnalysis = analyzeGrammar(grammar);

    let tableResult;
    if (tableType === 'CLR')       tableResult = buildCLRTable(grammar);
    else if (tableType === 'LALR') tableResult = buildLALRTable(grammar);
    else                           tableResult = buildSLRTable(grammar);

    const { ACTION, GOTO, conflicts } = tableResult;
    const tableData = serializeTable(ACTION, GOTO, grammar);

    let parserResult = null;
    if (source && source.trim()) parserResult = parse(grammar, source);

    return {
      success: true,
      grammar: {
        startSymbol  : grammar.startSymbol,
        nonTerminals : [...grammar.nonTerminals],
        terminals    : [...grammar.terminals].filter(t => t !== '$'),
        productions  : grammar.productions.map(p => ({ id: p.id, lhs: p.lhs, rhs: p.rhs.join(' ') }))
      },
      sets: { first, follow },
      table: { ...tableData, conflicts },
      tableType,
      grammarAnalysis,
      parserResult
    };
  } catch (err) {
    throw new Error(err.message);
  }
}
