import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Building2,
  Calendar,
  ShieldCheck,
  Download,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { patientApi } from '../services/patientApi';
import { StatusBadge } from '../components/StatusBadge';
import { OriginalPdfModal } from '../components/OriginalPdfModal';
import { ReportDetailSkeleton } from '../components/Skeleton';

export function ReportDetailScreen() {
  const { reportId } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOriginalModal, setShowOriginalModal] = useState(false);
  const [expandedExplanation, setExpandedExplanation] = useState(null);

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    setLoading(true);
    const start = Date.now();
    try {
      const data = await patientApi.getReportById(reportId);
      const elapsed = Date.now() - start;
      if (elapsed < 320) {
        await new Promise((resolve) => setTimeout(resolve, 320 - elapsed));
      }
      setReport(data);
    } catch (err) {
      console.warn('Error loading report:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ReportDetailSkeleton />;
  }

  if (!report) {
    return (
      <div className="v-card" style={{ padding: 30, textAlign: 'center' }}>
        <AlertCircle size={40} color="#dc2626" style={{ margin: '0 auto 12px auto' }} />
        <h3 style={{ fontSize: '1.2rem', marginBottom: 6 }}>Report Not Found</h3>
        <p style={{ fontSize: '0.86rem', color: 'var(--slate-600)', marginBottom: 16 }}>
          Could not locate report #{reportId}.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/reports')}>
          Back to Reports List
        </button>
      </div>
    );
  }

  return (
    <div className="skeleton-content-fade page-centered-container" style={{ maxWidth: 980, padding: '8px 0' }}>
      <button
        onClick={() => navigate('/reports')}
        className="btn btn-secondary"
        style={{ padding: '6px 12px', fontSize: '0.8rem', marginBottom: 16 }}
      >
        <ArrowLeft size={14} /> Back to Reports
      </button>

      {/* Report Header Card */}
      <div className="v-card" style={{ padding: 20, marginBottom: 20, border: '2px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h2 style={{ fontSize: '1.35rem', color: 'var(--main-text)', fontWeight: 800 }}>{report.test_type}</h2>
              <StatusBadge status={report.status} />
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--deep-indigo)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={15} color="var(--lavender)" />
              {report.laboratory_name} ({report.laboratory_code})
            </div>
          </div>

          <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--deep-indigo)', backgroundColor: 'var(--lavender-soft)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border-medium, #C0DCE4)' }}>
            {report.report_identifier}
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 10,
          padding: '12px 14px',
          backgroundColor: 'var(--lavender-soft)',
          borderRadius: 10,
          border: '1px solid var(--border-medium, #C0DCE4)',
          fontSize: '0.8rem',
          color: 'var(--main-text)',
          marginBottom: 16,
        }}>
          <div><strong>Patient:</strong> {report.patient_name}</div>
          <div><strong>Patient ID:</strong> {report.patient_identifier}</div>
          <div><strong>Ordering:</strong> {report.ordering_doctor}</div>
          <div><strong>Published:</strong> {new Date(report.published_at || report.created_at).toLocaleDateString()}</div>
        </div>

        {/* View Original Laboratory PDF Action */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => setShowOriginalModal(true)}
            style={{ fontSize: '0.84rem' }}
          >
            <FileText size={16} />
            View Preserved Original PDF
          </button>
        </div>
      </div>

      {/* Structured Observations Table (Section 30) */}
      <div className="v-card" style={{ padding: '20px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--main-text)', fontWeight: 800 }}>
            Structured CBC Results
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted-text)' }}>
            {(report.observations || []).length} Verified Parameters
          </span>
        </div>

        <div className="observations-grid">
          {(report.observations || []).map((obs, idx) => {
            const isExpanded = expandedExplanation === idx;
            return (
              <div
                key={idx}
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  backgroundColor: '#ffffff',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.94rem', color: 'var(--navy-900)', display: 'block' }}>
                      {obs.test_name_normalized}
                    </strong>
                    <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)' }}>
                      Ref: {obs.reference_low !== null ? `${obs.reference_low}–${obs.reference_high} ${obs.unit}` : 'Not Specified'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--navy-900)' }}>
                        {obs.value}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)', marginLeft: 4 }}>
                        {obs.unit}
                      </span>
                    </div>

                    <StatusBadge status={obs.flag} />

                    <button
                      type="button"
                      onClick={() => setExpandedExplanation(isExpanded ? null : idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--slate-400)',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Explain this value"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <HelpCircle size={16} />}
                    </button>
                  </div>
                </div>

                {/* Deterministic Explanation (Section 32) */}
                {isExpanded && (
                  <div style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: '1px dashed var(--border-subtle)',
                    fontSize: '0.8rem',
                    color: 'var(--slate-700)',
                    lineHeight: 1.5,
                    backgroundColor: 'var(--slate-50)',
                    padding: '8px 10px',
                    borderRadius: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--teal-700)', fontWeight: 700, marginBottom: 2 }}>
                      <CheckCircle2 size={14} /> Deterministic Educational Interpretation:
                    </div>
                    {obs.explanation || `Your ${obs.test_name_normalized} is ${obs.value} ${obs.unit} (Typical range: ${obs.reference_low}–${obs.reference_high} ${obs.unit}). This result is ${obs.flag}.`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Non-Diagnostic Clinical Safety Notice (Section 32) */}
      <div style={{
        padding: '14px 16px',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        border: '1px solid var(--border-subtle)',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--navy-900)', fontWeight: 700, fontSize: '0.84rem', marginBottom: 4 }}>
          <ShieldCheck size={16} color="var(--teal-600)" />
          Educational Health Record
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--slate-600)', margin: 0, lineHeight: 1.45 }}>
          Reference ranges and status flags are informational. SwasthSetu does not diagnose diseases or recommend treatments.
          When you revisit <strong>{report.ordering_doctor}</strong>, this verified report will be accessible during your consultation.
        </p>
      </div>

      {/* Preserved Original Document Modal */}
      <OriginalPdfModal
        report={report}
        isOpen={showOriginalModal}
        onClose={() => setShowOriginalModal(false)}
      />
    </div>
  );
}
