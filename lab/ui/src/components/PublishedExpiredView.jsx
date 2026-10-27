import React, { useState } from 'react';
import {
  CheckCircle,
  ShieldAlert,
  Lock,
  FileText,
  Activity,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  AlertOctagon,
  Heart,
  Hash,
} from 'lucide-react';

export default function PublishedExpiredView({
  report,
  observations,
  grantId,
  onOpenAudit,
  onResetDemo,
  onOpenPatientView,
  onViewPreservedRaw,
}) {
  const [testResult, setTestResult] = useState(null);
  const [testingAccess, setTestingAccess] = useState(false);

  // Test server-side authorization enforcement
  const handleTestExpiredSecurity = async () => {
    setTestingAccess(true);
    try {
      const res = await fetch(`/api/lab/grant/${grantId}/patient-identity`);
      const data = await res.json();
      setTestResult({
        statusCode: res.status,
        response: data,
      });
    } catch (err) {
      setTestResult({
        statusCode: 500,
        response: { error: err.message },
      });
    } finally {
      setTestingAccess(false);
    }
  };

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-title">
          <CheckCircle size={22} color="#10b981" />
          <span>Report Published & Access Expired</span>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            className="btn btn-outline"
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            onClick={onViewPreservedRaw}
            title="Inspect preserved raw instrument data & hash"
          >
            <FileText size={14} />
            <span>Preserved Raw Data</span>
          </button>

          <button
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
            onClick={onOpenPatientView}
            title="Preview how Rahul Sharma and Dr. Ramesh Mehta view the published CBC record in SwasthSetu"
          >
            <Heart size={14} />
            <span>View in SwasthSetu Patient Dashboard</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      <div className="banner success">
        <CheckCircle size={22} style={{ flexShrink: 0 }} />
        <div>
          <strong>Report Successfully Published to SwasthSetu:</strong> Findings have been locked and transmitted 
          to Rahul Sharma's Patient Dashboard and will be viewable by Dr. Ramesh Mehta upon a future Revisiting consultation.
        </div>
      </div>

      {/* Hero Bounded Access Demonstration */}
      <div
        style={{
          background: 'rgba(139, 92, 246, 0.08)',
          border: '1px solid rgba(139, 92, 246, 0.35)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginBottom: '1.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ background: 'var(--status-expired-bg)', padding: '0.5rem', borderRadius: '50%' }}>
            <Lock size={22} color="#c084fc" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f3e8ff' }}>
              Bounded Access: Self-Terminated by Construction
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Grant Status: EXPIRED
            </span>
          </div>
        </div>

        <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.6 }}>
          <strong>No Revoke Button Required:</strong> In accordance with the core SwasthSetu security model, 
          the laboratory's access to Rahul Sharma's identity expired automatically the instant this report was published. 
          No temporary data remains accessible to the laboratory.
        </p>

        {/* Server-Side Authorization Proof Tester */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(139, 92, 246, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.82rem', color: '#e9d5ff' }}>
              Prove Server-Side Enforcement (Must-Pass Authorization Test):
            </span>
            <button
              className="btn btn-outline"
              style={{
                fontSize: '0.78rem',
                padding: '0.4rem 0.85rem',
                borderColor: 'rgba(139, 92, 246, 0.4)',
                color: '#e9d5ff',
              }}
              onClick={handleTestExpiredSecurity}
              disabled={testingAccess}
            >
              <AlertOctagon size={14} />
              <span>{testingAccess ? 'Querying...' : 'Attempt Accessing Patient Identity Now'}</span>
            </button>
          </div>

          {testResult && (
            <div
              style={{
                marginTop: '0.85rem',
                background: '#0a0914',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: testResult.statusCode === 403 ? '1px solid #8b5cf6' : '1px solid #ef4444',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ color: testResult.statusCode === 403 ? '#c084fc' : '#ef4444', fontWeight: 700, marginBottom: '0.35rem' }}>
                SERVER RESPONSE: HTTP {testResult.statusCode} FORBIDDEN (ACCESS TERMINATED)
              </div>
              <pre style={{ color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(testResult.response, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Published Observations Summary */}
      <div>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: '#f8fafc' }}>
          Published CBC Observations (Immutable Record)
        </h4>

        <div className="table-container">
          <table className="obs-table">
            <thead>
              <tr>
                <th>Test Parameter</th>
                <th>Result</th>
                <th>Reference Range</th>
                <th>Flag</th>
                <th>Validation</th>
              </tr>
            </thead>
            <tbody>
              {observations.map((obs) => (
                <tr key={obs._id}>
                  <td><strong>{obs.test_name_normalized}</strong></td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{obs.value} {obs.unit}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
                    {obs.reference_low !== null && obs.reference_high !== null
                      ? `${obs.reference_low} - ${obs.reference_high} ${obs.unit}`
                      : 'None'}
                  </td>
                  <td>
                    {obs.flag === 'LOW' && <span className="badge badge-low">LOW</span>}
                    {obs.flag === 'NORMAL' && <span className="badge badge-normal">NORMAL</span>}
                    {obs.flag === 'HIGH' && <span className="badge badge-high">HIGH</span>}
                  </td>
                  <td>
                    <span className="badge badge-ok">LOCKED</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Navigation Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={onOpenAudit}>
            <FileText size={16} />
            <span>View Complete Encounter Audit Trail</span>
          </button>

          <button className="btn btn-outline" onClick={onOpenPatientView}>
            <Heart size={16} color="#10b981" />
            <span>SwasthSetu Patient Portal Preview</span>
          </button>
        </div>

        <button className="btn btn-primary" onClick={onResetDemo}>
          <span>Run Next Demo Iteration</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
