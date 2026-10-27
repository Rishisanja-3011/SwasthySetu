import React, { useState } from 'react';
import { Cpu, ArrowRight, CheckCircle, RefreshCw, FileText, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function ReportProcessingView({
  patient,
  onGenerateReport,
  isProcessing,
  lastReport,
  onProceedToReview,
}) {
  const [selectedCase, setSelectedCase] = useState('standard');

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-title">
          <Cpu size={22} color="#38bdf8" />
          <span>Report Generation & CBC Digital Extraction Engine</span>
        </div>
        <span className="badge badge-low">Lab Screen #13</span>
      </div>

      {/* Critical Architecture Callout */}
      <div className="banner info">
        <ShieldCheck size={20} style={{ flexShrink: 0 }} />
        <div>
          <strong>Architecture Principle:</strong> SwasthSetu is NOT a generic PDF-upload application. 
          The laboratory environment generates the digital blood report and runs the digital text extraction & 
          deterministic validation pipeline right here at the lab side.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
        {/* Left Column: Instrument Run Setup */}
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#f8fafc' }}>
            1. Lab Hematology Analyzer Simulation
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
            Select test parameters to execute on the digital analyzer for <strong>{patient?.name || 'Rahul Sharma'}</strong>:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: selectedCase === 'standard' ? 'rgba(2, 132, 199, 0.15)' : 'var(--bg-surface)',
                border: selectedCase === 'standard' ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="scenario"
                checked={selectedCase === 'standard'}
                onChange={() => setSelectedCase('standard')}
                style={{ marginTop: '3px' }}
              />
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>Standard Case (Rahul's Visit)</strong>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  Complete automated CBC run: Hb 10.2 g/dL (LOW), WBC 8000 /µL (NORMAL), Platelets 250,000 /µL (NORMAL).
                  All values pass deterministic validation with High Confidence.
                </p>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: selectedCase === 'needs_review_demo' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-surface)',
                border: selectedCase === 'needs_review_demo' ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="scenario"
                checked={selectedCase === 'needs_review_demo'}
                onChange={() => setSelectedCase('needs_review_demo')}
                style={{ marginTop: '3px' }}
              />
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#fca5a5' }}>
                  Demo Script Step 34: Deliberate Low-Confidence / Implausible Value
                </strong>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  Platelets extracted as 15 /µL with low confidence (62%). Triggers <code>NEEDS_REVIEW</code> and 
                  proves that publication is deterministically blocked until pathologist review.
                </p>
              </div>
            </label>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <button
              className="btn btn-primary"
              disabled={isProcessing}
              onClick={() => onGenerateReport(selectedCase)}
              style={{ width: '100%', padding: '0.85rem' }}
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Processing CBC Extraction Pipeline...</span>
                </>
              ) : (
                <>
                  <Cpu size={18} />
                  <span>Execute CBC Extraction & Validation Pipeline</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Digital Pipeline Visualization */}
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#f8fafc' }}>
            2. Digital Extraction Pipeline Output
          </h4>

          {lastReport ? (
            <div>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Status:</span>
                  {lastReport.status === 'NEEDS_REVIEW' ? (
                    <span className="badge badge-review">NEEDS_REVIEW</span>
                  ) : (
                    <span className="badge badge-normal">READY FOR REVIEW</span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Digital Source:</span>
                  <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                    {lastReport.report_source_type}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Integrity Hash:</span>
                  <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                    {lastReport.report_hash ? lastReport.report_hash.slice(0, 24) + '...' : 'Generated'}
                  </span>
                </div>
              </div>

              {/* Raw Digital Instrument Log */}
              <div className="raw-report-box">
                {lastReport.raw_text_content || 'No text extracted.'}
              </div>

              <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-success" onClick={onProceedToReview}>
                  <span>Proceed to Extraction Review</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px dashed var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                padding: '3rem 1.5rem',
                textAlign: 'center',
                color: '#94a3b8',
              }}
            >
              <FileText size={36} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>No report generated yet.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                Click "Execute CBC Extraction & Validation Pipeline" on the left to initiate the automated instrument run.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
