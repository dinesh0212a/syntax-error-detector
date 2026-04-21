import React from 'react';
import './GrammarChecksPanel.css';

export default function GrammarChecksPanel({ grammarAnalysis }) {
  if (!grammarAnalysis) return (
    <div className="checks-panel">
      <p className="checks-intro">Run analysis to see left-recursion and left-factoring checks.</p>
    </div>
  );

  const { leftRecursion: lr, leftFactoring: lf } = grammarAnalysis;

  return (
    <div className="checks-panel animate-in">
      {/* Left Recursion */}
      <div className="check-card">
        <div className="check-header">
          <span className="check-title">Left Recursion</span>
          <span className={`status-badge ${lr.detected ? 'warn' : 'ok'}`}>
            {lr.detected ? '⚠ Detected' : '✓ None'}
          </span>
        </div>

        {!lr.detected && (
          <div className="check-ok">✓ No left recursion found. Grammar is safe for top-down parsing.</div>
        )}

        {lr.detected && (
          <div className="check-body">
            {lr.direct.map((issue, i) => (
              <div key={i} className="lr-issue">
                <div className="lr-issue-type">Direct Left Recursion</div>
                <div className="lr-nt">Non-terminal: <strong>{issue.nonTerminal}</strong></div>
                <div className="prod-list">
                  {issue.recursiveProductions.map((p, j) => (
                    <div key={j} className="prod-item bad">↺ {p}</div>
                  ))}
                  {issue.nonRecursiveProductions.map((p, j) => (
                    <div key={j} className="prod-item">{p}</div>
                  ))}
                </div>
              </div>
            ))}

            {lr.indirect.map((issue, i) => (
              <div key={i} className="lr-issue">
                <div className="lr-issue-type">Indirect Left Recursion</div>
                <div className="cycle-path">
                  {issue.cycle.map((nt, j) => (
                    <React.Fragment key={j}>
                      <span>{nt}</span>
                      {j < issue.cycle.length - 1 && <span className="cycle-arrow">→</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}

            {lr.eliminatedGrammar && (
              <div className="transformed-grammar">
                <div className="transformed-title">✦ Eliminated Grammar</div>
                <div className="transformed-code">{lr.eliminatedGrammar}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Left Factoring */}
      <div className="check-card">
        <div className="check-header">
          <span className="check-title">Left Factoring</span>
          <span className={`status-badge ${lf.detected ? 'warn' : 'ok'}`}>
            {lf.detected ? '⚠ Required' : '✓ None'}
          </span>
        </div>

        {!lf.detected && (
          <div className="check-ok">✓ No left factoring needed. Grammar has no common prefixes.</div>
        )}

        {lf.detected && (
          <div className="check-body">
            {lf.issues.map((issue, i) => (
              <div key={i} className="lf-issue">
                <div className="lf-prefix">Common prefix: <strong>"{issue.commonPrefix}"</strong> in <strong>{issue.nonTerminal}</strong></div>
                <div className="prod-list">
                  {issue.conflictingProductions.map((p, j) => (
                    <div key={j} className="prod-item bad">{p}</div>
                  ))}
                </div>
              </div>
            ))}

            {lf.transformedGrammar && (
              <div className="transformed-grammar">
                <div className="transformed-title">✦ Factored Grammar</div>
                <div className="transformed-code">{lf.transformedGrammar}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Explanation */}
      <div style={{fontSize:'11.5px', color:'var(--text-2)', lineHeight:'1.7', padding:'0 2px'}}>
        <strong>Left Recursion</strong> — A grammar is left recursive if <em>A →* Aα</em>. This causes infinite loops in top-down (LL) parsers. LR parsers handle it natively.
        <br/><br/>
        <strong>Left Factoring</strong> — When two productions share a common prefix, LL parsers cannot decide which to choose. Factor out the common prefix into a new non-terminal.
      </div>
    </div>
  );
}
