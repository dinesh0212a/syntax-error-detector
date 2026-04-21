import React from 'react';
import './ParsingTablePanel.css';

function cellClass(val) {
  if (!val) return 'cell-empty';
  if (val === 'acc') return 'cell-accept';
  if (val.startsWith('s')) return 'cell-shift';
  if (val.startsWith('r')) return 'cell-reduce';
  if (/^\d+$/.test(val)) return 'cell-goto';
  return '';
}

function cellDisplay(val) {
  if (!val) return '–';
  if (val === 'acc') return 'acc';
  return val;
}

export default function ParsingTablePanel({ table, grammar, tableType = 'SLR' }) {
  if (!table) return null;
  const { headers, rows, conflicts = [] } = table;
  const tagClass = tableType === 'LALR' ? 'lalr' : tableType === 'CLR' ? 'clr' : 'slr';

  return (
    <div className="table-panel animate-in">
      <div className="table-meta">
        <span className={`table-type-tag ${tagClass}`}>{tableType}(1) Table</span>
        <span className="table-stats">
          <strong>{rows.length}</strong> states ·{' '}
          <strong>{headers.terminals.length}</strong> terminals ·{' '}
          <strong>{headers.nonTerminals.length}</strong> non-terminals
          {conflicts.length > 0 && <> · <strong style={{color:'var(--error)'}}>{conflicts.length} conflict(s)</strong></>}
        </span>
      </div>

      {conflicts.length > 0 && (
        <div className="conflict-box">
          <strong>⚠ {conflicts.length} conflict(s) detected:</strong>{' '}
          {conflicts.slice(0, 3).map((c, i) => (
            <span key={i}>State {c.stateId} on "{c.symbol}" ({c.type || 'conflict'}){i < Math.min(conflicts.length,3)-1 ? ', ' : ''}</span>
          ))}
          {conflicts.length > 3 && ` +${conflicts.length - 3} more`}
        </div>
      )}

      <div className="table-scroll">
        <table className="parsing-table">
          <thead>
            <tr>
              <th className="state-col" rowSpan={2}>State</th>
              <th className="section-header action-section" colSpan={headers.terminals.length}>ACTION</th>
              <th className="section-header goto-section" colSpan={headers.nonTerminals.length}>GOTO</th>
            </tr>
            <tr>
              {headers.terminals.map(t => <th key={t}>{t}</th>)}
              {headers.nonTerminals.map(nt => <th key={nt}>{nt}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.state}>
                <td className="state-cell">{row.state}</td>
                {headers.terminals.map(t => (
                  <td key={t} className={cellClass(row[t])}>{cellDisplay(row[t])}</td>
                ))}
                {headers.nonTerminals.map(nt => (
                  <td key={nt} className={row[nt] ? 'cell-goto' : 'cell-empty'}>{row[nt] || '–'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
