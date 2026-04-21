import React, { useState, useCallback } from 'react';
import InputPanel from './components/InputPanel';
import AnalysisDashboard from './components/AnalysisDashboard';
import Header from './components/Header';
import './App.css';
import { localAnalyze } from './localAnalyzer';

const DEFAULT_GRAMMAR = `E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id`;
const DEFAULT_SOURCE  = `id + id * id`;

export default function App() {
  const [grammar,   setGrammar]   = useState(DEFAULT_GRAMMAR);
  const [source,    setSource]    = useState(DEFAULT_SOURCE);
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [tableType, setTableType] = useState('SLR');

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = localAnalyze({ grammar, source, tableType });
      if (!data.success) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [grammar, source, tableType]);

  return (
    <div className="app-root">
      <Header />
      <div className="app-body">
        <InputPanel
          grammar={grammar}
          source={source}
          onGrammarChange={setGrammar}
          onSourceChange={setSource}
          onAnalyze={handleAnalyze}
          loading={loading}
          error={error}
          tableType={tableType}
          onTableTypeChange={setTableType}
        />
        <AnalysisDashboard result={result} loading={loading} tableType={tableType} />
      </div>
    </div>
  );
}
