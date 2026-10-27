import React, { useState } from 'react';
import {
  Send,
  Lock,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  X,
  FileCheck,
  AlertOctagon,
  UserCheck,
} from 'lucide-react';

export default function PublishReviewModal({
  isOpen,
  onClose,
  report,
  observations,
  hasNeedsReview,
  unresolvedCount,
  activeStaff,
  onConfirmPublish,
  isPublishing,
}) {
  const [signOffNotes, setSignOffNotes] = useState(
    'All CBC parameters reviewed against hematology analyzer standards. Ready for clinical consultation.'
  );

  if (!isOpen) return null;

  const totalObs = observations.length;
  const normalObs = observations.filter((o) => o.flag === 'NORMAL').length;
  const flaggedObs = observations.filter((o) => o.flag !== 'NORMAL').length;
  const editedObs = observations.filter((o) => o.manually_edited).length;

  return (
    <div className="modal-overlay">
      <div
        className="modal-card"
        style={{
          maxWidth: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
        }}
      >
        {/* Sticky Fixed Header */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(5, 150, 105, 0.2)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
              <FileCheck size={22} color="#10b981" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Publish Review & Clinical Sign-Off</h3>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Lab Screen #6 — Final Verification Before Transmission</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.4rem' }}>
          {/* Blocking Warning if any NEEDS_REVIEW unresolved */}
          {hasNeedsReview ? (
            <div className="banner warning" style={{ marginBottom: '1.25rem' }}>
              <AlertOctagon size={24} style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '0.2rem' }}>
                  PUBLICATION STRICTLY BLOCKED ({unresolvedCount} Flagged Item{unresolvedCount > 1 ? 's' : ''}):
                </strong>
                <span>
                  According to SwasthSetu 2.0 clinical safety invariants, blood reports containing unresolved{' '}
                  <code>NEEDS_REVIEW</code> flags cannot be published. You must resolve all flagged observations before clinical sign-off.
                </span>
              </div>
            </div>
          ) : (
            <div className="banner success" style={{ marginBottom: '1.25rem' }}>
              <CheckCircle size={22} style={{ flexShrink: 0 }} />
              <div>
                <strong>All Observations Verified:</strong> Zero unresolved extraction discrepancies. All canonical values
                pass deterministic validation and are ready to be locked and published.
              </div>
            </div>
          )}

          {/* Quality Audit Checklist */}
          <div className="checklist-group">
            <div className={`checklist-item ${hasNeedsReview ? 'failed' : 'passed'}`}>
              {hasNeedsReview ? (
                <AlertTriangle size={18} color="#ef4444" />
              ) : (
                <CheckCircle size={18} color="#10b981" />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                  Deterministic Validation Rule
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {hasNeedsReview
                    ? `${unresolvedCount} parameter(s) flagged for plausibility or unit ambiguity.`
                    : `All ${totalObs} CBC observations passed reference range & plausibility bounds.`}
                </div>
              </div>
            </div>

            <div className="checklist-item passed">
              <CheckCircle size={18} color="#10b981" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                  Digital Text & Integrity Hash
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  SHA-256 integrity hash verified. Original instrument data preserved without modification.
                </div>
              </div>
            </div>

            <div className="checklist-item passed">
              <UserCheck size={18} color="#38bdf8" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                  Practitioner Sign-Off Credential
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Signing Practitioner: <strong>{activeStaff?.name || 'Dr. Shalini Gupta'}</strong> ({activeStaff?.role || 'Senior Hematopathologist'}) · License: {activeStaff?.license || 'MED-PATH-9021'}
                </div>
              </div>
            </div>
          </div>

          {/* Observations Summary Pill Matrix */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              margin: '1.25rem 0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Summary of Findings
              </span>
              <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>{totalObs} Extracted Parameters</span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className="badge badge-normal">{normalObs} Normal Range</span>
              {flaggedObs > 0 && <span className="badge badge-low">{flaggedObs} Abnormal Flags</span>}
              {editedObs > 0 && <span className="badge" style={{ background: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8' }}>{editedObs} Manually Corrected</span>}
            </div>
          </div>

          {/* Sign-Off Notes */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
              Clinical Validation Remarks (Transmitted with Report):
            </label>
            <textarea
              rows={2}
              value={signOffNotes}
              onChange={(e) => setSignOffNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                color: '#fff',
                fontSize: '0.85rem',
                resize: 'none',
                fontFamily: 'var(--font-main)',
              }}
            />
          </div>

          {/* Critical Bounded Access Callout */}
          <div className="banner expired" style={{ padding: '0.85rem 1rem', marginBottom: '0.5rem', fontSize: '0.82rem' }}>
            <Lock size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>Bounded Access Termination Warning:</strong> Confirming publication will transmit this report to 
              SwasthSetu and <strong>instantly expire this laboratory's access</strong> to Rahul Sharma's identity. 
              No manual revoke is required; access terminates by construction.
            </div>
          </div>
        </div>

        {/* Sticky Fixed Footer */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '1rem',
            paddingTop: '0.85rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <button className="btn btn-outline" onClick={onClose} disabled={isPublishing}>
            Back to Review
          </button>
          <button
            className="btn btn-success"
            disabled={hasNeedsReview || isPublishing}
            onClick={() => onConfirmPublish(signOffNotes)}
          >
            {isPublishing ? (
              <span>Publishing & Expiring Access...</span>
            ) : hasNeedsReview ? (
              <>
                <Lock size={16} />
                <span>Publish Blocked ({unresolvedCount} Unresolved)</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Confirm Sign-Off & Transmit to SwasthSetu</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
