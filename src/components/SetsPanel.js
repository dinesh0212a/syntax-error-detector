import React from 'react';
import './SetsPanel.css';

function SetCell({ symbols }) {
  if (!symbols || symbols.length === 0) {
    return (
      <td className="td-set">
        <div className="set-contents">
          <span className="set-brace">&#123;</span>
          <span className="set-brace">&#125;</span>
        </div>
      </td>
    );
  }
  return (
    <td className="td-set">
      <div className="set-contents">
        <span className="set-brace">&#123;</span>
        {symbols.map((s, i) => (
          <React.Fragment key={s}>
            <span className={`sym-chip ${s === 'ε' ? 'epsilon' : s === '$' ? 'eof' : ''}`}>{s}</span>
            {i < symbols.length - 1 && <span className="sym-comma">,</span>}
          </React.Fragment>
        ))}
        <span className="set-brace">&#125;</span>
      </div>
    </td>
  );
}

export default function SetsPanel({ sets, grammar }) {
  if (!sets) return null;
  const nts = grammar?.nonTerminals || Object.keys(sets.first);

  return (
    <div className="sets-panel animate-in">

      {/* Unified FIRST / FOLLOW table */}
      <div className="sets-unified-table">
        <table className="sets-table">
          <thead>
            <tr>
              <th className="col-nt">Non-Terminal</th>
              <th className="col-first">FIRST Set</th>
              <th className="col-follow">FOLLOW Set</th>
            </tr>
          </thead>
          <tbody>
            {nts.map(nt => (
              <tr key={nt}>
                <td className="td-nt">{nt}</td>
                <SetCell symbols={sets.first[nt]} />
                <SetCell symbols={sets.follow[nt]} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Productions */}
      {grammar?.productions && (
        <div className="productions-table">
          <div className="prod-table-header">Productions</div>
          <table className="prod-table">
            <tbody>
              {grammar.productions.map(p => (
                <tr key={p.id}>
                  <td className="prod-num">#{p.id}</td>
                  <td className="prod-lhs">{p.lhs}</td>
                  <td className="prod-arrow-cell">→</td>
                  <td className="prod-rhs">{p.rhs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
