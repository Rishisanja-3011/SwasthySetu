import React, { useState, useEffect } from 'react';
import {
  Heart,
  Bot,
  FileText,
  User,
  Stethoscope,
  X,
  MessageSquare,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export default function PatientPortalPreviewModal({
  isOpen,
  onClose,
  reportId,
  onViewPreservedRaw,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeChatIndex, setActiveChatIndex] = useState(0);

  useEffect(() => {
    if (isOpen && reportId) {
      setLoading(true);
      fetch(`/api/lab/patient-view/${reportId}`)
        .then((res) => res.json())
        .then((resData) => {
          if (resData.success) {
            setData(resData);
          }
        })
        .catch((err) => console.error('Failed to load patient view:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, reportId]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
              <Heart size={22} color="#10b981" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>SwasthSetu Patient Portal View</h3>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                End-to-End Verification: How Rahul Sharma views the published CBC findings
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
              <div className="skeleton-line" style={{ width: '60%', margin: '0 auto 1rem' }} />
              <div className="skeleton-line" style={{ width: '80%', margin: '0 auto 1rem' }} />
              <p>Connecting to SwasthSetu Patient Record...</p>
            </div>
          ) : !data ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>
              Failed to load patient report view.
            </div>
          ) : (
            <div>
              {/* Patient Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15), rgba(16, 185, 129, 0.1))',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 700 }}>
                    Patient Health Record
                  </div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>
                    {data.patient?.name || 'Rahul Sharma'}
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    {data.patient?.patient_identifier} · {data.patient?.gender}, {data.patient?.age} yrs
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-normal" style={{ fontSize: '0.75rem' }}>
                    Report Published & Locked
                  </span>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                    {data.laboratory?.name || 'Laboratory'}
                  </div>
                </div>
              </div>

              {/* Educational Clinical Summary (Section 9: Non-diagnostic Guidance) */}
              <div className="banner info" style={{ marginBottom: '1.25rem' }}>
                <Sparkles size={20} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Educational Health Summary (Non-Diagnostic):</strong>
                  <p style={{ marginTop: '0.2rem', fontSize: '0.84rem' }}>{data.healthSummary}</p>
                </div>
              </div>

              {/* Key CBC Observations Grid */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.75rem' }}>
                  Complete Blood Count (CBC) Parameters
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  {data.observations.map((obs) => {
                    const isLow = obs.flag === 'LOW';
                    const isHigh = obs.flag === 'HIGH';
                    const isNormal = obs.flag === 'NORMAL';

                    return (
                      <div
                        key={obs._id}
                        style={{
                          background: 'var(--bg-secondary)',
                          border: isNormal ? '1px solid var(--border-subtle)' : isLow ? '1px solid rgba(14, 165, 233, 0.4)' : '1px solid rgba(249, 115, 22, 0.4)',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.85rem 1rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
                            {obs.test_name_normalized}
                          </span>
                          {isLow && <span className="badge badge-low" style={{ fontSize: '0.62rem' }}>LOW</span>}
                          {isHigh && <span className="badge badge-high" style={{ fontSize: '0.62rem' }}>HIGH</span>}
                          {isNormal && <span className="badge badge-normal" style={{ fontSize: '0.62rem' }}>NORMAL</span>}
                        </div>

                        <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', margin: '0.35rem 0' }}>
                          {obs.value} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{obs.unit}</span>
                        </div>

                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                          Ref: {obs.reference_low} - {obs.reference_high} {obs.unit}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SwasthSetu Basic Health & Blood Report Chatbot Preview */}
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                  <div style={{ background: 'rgba(2, 132, 199, 0.2)', padding: '0.45rem', borderRadius: 'var(--radius-md)' }}>
                    <Bot size={20} color="#38bdf8" />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: '#f8fafc' }}>
                      SwasthSetu Blood-Report Health Chatbot (Educational AI)
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Grounded in Rahul's published lab report · Never prescribes or provides medical diagnosis
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  {data.chatbotQuestions?.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveChatIndex(idx)}
                      className={`btn ${activeChatIndex === idx ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                    >
                      <HelpCircle size={13} />
                      <span>{item.question}</span>
                    </button>
                  ))}
                </div>

                {data.chatbotQuestions && data.chatbotQuestions[activeChatIndex] && (
                  <div className="chatbot-card">
                    <div className="chatbot-q">
                      <MessageSquare size={16} />
                      <span>{data.chatbotQuestions[activeChatIndex].question}</span>
                    </div>
                    <div className="chatbot-a">
                      {data.chatbotQuestions[activeChatIndex].answer}
                    </div>
                  </div>
                )}
              </div>

              {/* Doctor Revisit Readiness Callout */}
              <div
                style={{
                  background: 'rgba(139, 92, 246, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                }}
              >
                <Stethoscope size={22} color="#c084fc" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.82rem', color: '#e9d5ff' }}>
                  <strong>Doctor Revisiting Workflow:</strong> When Rahul visits Dr. Ramesh Mehta next and selects{' '}
                  <code>REVISITING</code>, this published report will automatically be available in Dr. Mehta's clinical cockpit
                  while the encounter remains OPEN. Once consultation ends, historical access closes automatically.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button className="btn btn-outline" onClick={onViewPreservedRaw}>
            <FileText size={15} />
            <span>Inspect Preserved Instrument Output</span>
          </button>

          <button className="btn btn-primary" onClick={onClose}>
            Back to Laboratory Module
          </button>
        </div>
      </div>
    </div>
  );
}
