import React, { useState } from 'react';
import Timeline from './Timeline';
import SetsPanel from './SetsPanel';
import ParsingTablePanel from './ParsingTablePanel';
import GrammarChecksPanel from './GrammarChecksPanel';
import EmptyState from './EmptyState';
import './AnalysisDashboard.css';

export default function AnalysisDashboard({ result, loading, tableType }) {
  const [activeTab, setActiveTab] = useState('timeline');

  const checks = result?.grammarAnalysis;
  const hasLRWarning = checks?.leftRecursion?.detected || checks?.leftFactoring?.detected;

  const TABS = [
    { id: 'timeline', label: 'Parse Trace',   icon: '⏱' },
    { id: 'sets',     label: 'FIRST / FOLLOW',icon: '∑'  },
    { id: 'table',    label: `${tableType || 'SLR'}(1) Table`, icon: '⊞' },
    { id: 'checks',   label: 'Grammar Checks', icon: '⚙' },
  ];

  return (
    <div className="dashboard">
      <div className="tab-bar">
        {TABS.map(tab => {
          let badge = null;
          if (tab.id === 'timeline' && result?.parserResult) {
            badge = <span className={`tab-badge ${result.parserResult.success ? 'ok' : 'err'}`}>{result.parserResult.steps.length}</span>;
          }
          if (tab.id === 'checks' && result && hasLRWarning) {
            badge = <span className="tab-badge warn">⚠</span>;
          }
          return (
            <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
              {badge}
            </button>
          );
        })}

        {result && (
          <div className="tab-status">
            {result.parserResult?.success
              ? <span className="status-ok">✓ ACCEPTED</span>
              : result.parserResult
                ? <span className="status-err">✗ SYNTAX ERROR</span>
                : <span className="status-info">Grammar OK</span>}
          </div>
        )}
      </div>

      <div className="tab-content" style={{overflowY: activeTab !== 'timeline' ? 'auto' : 'hidden'}}>
        {loading && (
          <div className="loading-overlay">
            <div className="loading-core">
              <div className="loading-ring" />
              <span>Building LR automaton…</span>
            </div>
          </div>
        )}

        {!loading && !result && <EmptyState />}

        {!loading && result && activeTab === 'timeline' && <Timeline parserResult={result.parserResult} />}
        {!loading && result && activeTab === 'sets'     && <SetsPanel sets={result.sets} grammar={result.grammar} />}
        {!loading && result && activeTab === 'table'    && <ParsingTablePanel table={result.table} grammar={result.grammar} tableType={tableType} />}
        {!loading && result && activeTab === 'checks'   && <GrammarChecksPanel grammarAnalysis={result.grammarAnalysis} />}
        {!loading && !result && activeTab === 'checks'  && <GrammarChecksPanel grammarAnalysis={null} />}
      </div>
    </div>
  );
}
