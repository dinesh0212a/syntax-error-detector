import React, { useState } from 'react';
import './InputPanel.css';

const SAMPLE_GRAMMARS = {
  'Arithmetic (LR)':  `E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id`,
  'LL(1) style':      `E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id`,
  'Left Recursive':   `S -> S a | b`,
  'Left Factoring':   `A -> a b | a c | d`,
  'Simple':           `S -> a S b | ε`,
  'Assignment':       `S -> L = R | R\nL -> * R | id\nR -> L`,
};

const SAMPLE_SOURCES = {
  'Valid expr':    'id + id * id',
  'Parenthesized':'( id + id ) * id',
  'Syntax error':  'id + + id',
  'Missing op':    'id *',
};

export default function InputPanel({ grammar, source, onGrammarChange, onSourceChange, onAnalyze, loading, error, tableType, onTableTypeChange }) {
  return (
    <div className="input-panel">
      {/* Grammar */}
      <div className="panel-section">
        <div className="section-label">
          <span className="dot dot-blue" />
          Context-Free Grammar
        </div>

        <textarea
          value={grammar}
          onChange={e => onGrammarChange(e.target.value)}
          rows={7}
          placeholder={`E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id`}
          spellCheck={false}
        />
        <div className="hint">
          Use <code>-{'>'}</code> or <code>::=</code> · Alternatives with <code>|</code> · Epsilon: <code>ε</code> or <code>#</code>
        </div>
      </div>

      <hr className="section-divider" />

      {/* Source */}
      <div className="panel-section">
        <div className="section-label">
          <span className="dot dot-purple" />
          Source Input
        </div>

        <textarea
          value={source}
          onChange={e => onSourceChange(e.target.value)}
          rows={2}
          placeholder="id + id * id"
          spellCheck={false}
        />
      </div>

      <hr className="section-divider" />

      {/* Table type */}
      <div className="panel-section">
        <div className="section-label">Parsing Method</div>
        <div className="table-type-selector">
          {['SLR', 'LALR', 'CLR'].map(t => (
            <button key={t} className={`table-type-btn ${tableType === t ? 'active' : ''}`} onClick={() => onTableTypeChange(t)}>
              {t}{t === 'LALR' ? '(1)' : t === 'CLR' ? '(1)' : '(1)'}
            </button>
          ))}
        </div>
      </div>

      <button className={`analyze-btn ${loading ? 'loading' : ''}`} onClick={onAnalyze} disabled={loading}>
        {loading ? (<><span className="spinner" />Computing…</>) : (<>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M1.5 6.5h10M7.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Analyze Grammar
        </>)}
      </button>

      {error && (
        <div className="error-box animate-in">
          <span>⚠</span><span>{error}</span>
        </div>
      )}

      <hr className="section-divider" />
      <div>
        <div className="legend-title">Action Legend</div>
        <div className="legend-items">
          <span className="legend-item shift">SHIFT</span>
          <span className="legend-item reduce">REDUCE</span>
          <span className="legend-item accept">ACCEPT</span>
          <span className="legend-item error">ERROR</span>
        </div>
      </div>
    </div>
  );
}
