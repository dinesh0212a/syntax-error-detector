import React from 'react';
import './Timeline.css';

export default function Timeline({ parserResult }) {
  if (!parserResult) return (
    <div className="timeline-panel">
      <p style={{color:'var(--text-2)',fontSize:'12px'}}>Enter source input and run analysis to see the step-by-step parse trace.</p>
    </div>
  );

  const { steps, success, diagnostic, expectedTokens = [] } = parserResult;

  return (
    <div className="timeline-panel animate-in">
      <div className="timeline-summary">
        <span className={`verdict ${success ? 'ok' : 'err'}`}>
          {success ? '✓ Input Accepted' : '✗ Syntax Error'}
        </span>
        <span className="step-count">{steps.length} steps</span>
      </div>

      {!success && diagnostic && (
        <div className="diagnostic-box">
          <strong>Syntax Error Diagnosis</strong>
          {diagnostic}
          {expectedTokens.length > 0 && (
            <div className="expected-tokens">
              <span style={{fontSize:'10.5px', color:'var(--text-3)', marginRight:4}}>Expected:</span>
              {expectedTokens.map(t => <span key={t} className="expected-chip">{t}</span>)}
            </div>
          )}
        </div>
      )}

      <div className="timeline-scroll">
        <div className="timeline-header-row">
          <div className="th-num">#</div>
          <div className="th-act">Action</div>
          <div className="th-stk">Stack</div>
          <div className="th-inp">Input</div>
          <div className="th-dtl">Detail</div>
        </div>
        {steps.map(step => (
          <div key={step.step} className="step-row">
            <div className="step-num">{step.step}</div>
            <div className="step-action">
              <span className={`action-badge ${step.action}`}>{step.action}</span>
            </div>
            <div className="step-stack" title={step.stackDisplay}>{step.stackDisplay}</div>
            <div className="step-input" title={step.inputBuffer}>{step.inputBuffer}</div>
            <div className="step-detail">{step.actionDetail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
