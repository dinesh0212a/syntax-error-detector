import React from 'react';
import './EmptyState.css';

export default function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">∑</div>
      <div className="empty-title">Syntax Error Detector</div>
      <p className="empty-desc">
        Enter a context-free grammar and source input on the left, then click <strong>Analyze Grammar</strong> to run the full LR parser pipeline.
      </p>

    </div>
  );
}
