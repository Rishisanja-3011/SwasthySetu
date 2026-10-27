import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FlaskConical, X, AlertCircle, ShieldCheck } from 'lucide-react';
import { doctorApi } from '../services/doctorApi';

export const DiagnosticOrderModal = ({ encounterId, isOpen, onClose, onOrderCreated }) => {
  const [testType, setTestType] = useState('CBC');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  const submittingRef = useRef(false);
  closeRef.current = onClose;
  submittingRef.current = submitting;

  useEffect(() => {
    if (!isOpen) return undefined;
    setError(null);
    setClinicalNotes('');
    setTestType('CBC');
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const handleKey = (event) => {
      if (event.key === 'Escape' && !submittingRef.current) closeRef.current();
      if (event.key !== 'Tab') return;
      const controls = dialogRef.current?.querySelectorAll('button:not(:disabled), select, textarea');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const order = await doctorApi.orderDiagnostic(encounterId, {
        test_type: testType,
        clinical_notes: clinicalNotes,
      });
      if (onOrderCreated) onOrderCreated(order);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create diagnostic order');
    } finally {
      setSubmitting(false);
    }
  };

  const modal = (
    <div
      role="presentation"
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="diagnostic-order-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="modal-content"
        style={{ maxWidth: 520, padding: 28 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #32B3C2 0%, #2292A0 50%, #1A7986 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--neo-btn-primary)',
              }}
            >
              <FlaskConical size={22} />
            </div>
            <div>
              <h3 id="diagnostic-order-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--main-text)', margin: 0 }}>
                Order Diagnostic Investigation
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted-text)', marginTop: 2 }}>
                Electronic prescription for authorized laboratory processing
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close dialog"
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: submitting ? 'not-allowed' : 'pointer',
              color: 'var(--muted-text)',
              boxShadow: 'var(--neo-raised-sm)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: 12,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--status-danger-bg)',
              color: 'var(--status-danger-text)',
              fontSize: '0.86rem',
              fontWeight: 600,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid var(--border-subtle)',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label
              htmlFor="diagnostic-test-type"
              style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--main-text)', marginBottom: 8 }}
            >
              Laboratory Test Panel
            </label>
            <select
              id="diagnostic-test-type"
              value={testType}
              onChange={(event) => setTestType(event.target.value)}
              style={{ width: '100%', padding: '12px 14px', fontSize: '0.92rem', fontWeight: 650 }}
            >
              <option value="CBC">Complete Blood Count (CBC) - Standard Panel</option>
              <option value="HEMOGLOBIN_HPLC">Hemoglobin (HPLC) / Thalassemia Evaluation</option>
              <option value="PLATELET_COUNT">Platelet Count - Focused Platelet Panel</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="diagnostic-clinical-notes"
              style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--main-text)', marginBottom: 8 }}
            >
              Physician Clinical Indications & Instructions
            </label>
            <textarea
              id="diagnostic-clinical-notes"
              value={clinicalNotes}
              onChange={(event) => setClinicalNotes(event.target.value)}
              rows={3}
              style={{ width: '100%', padding: '12px 14px', fontSize: '0.9rem', lineHeight: 1.5, resize: 'vertical' }}
              placeholder="e.g. Evaluate evening fever, fatigue and borderline pallor. Check TLC and Platelets."
            />
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--surface-inset)',
              boxShadow: 'var(--neo-inset-sm)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.78rem',
              color: 'var(--muted-text)',
              lineHeight: 1.45,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--main-text)', marginBottom: 3 }}>
              <ShieldCheck size={14} color="var(--hospital-blue)" />
              <span>Diagnostic Bounded Workflow:</span>
            </div>
            The patient receives this diagnostic order on their SwasthSetu portal. When they visit a lab and scan the lab's QR, bounded access allows the lab to upload results directly to this encounter.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={submitting}
              style={{ fontSize: '0.88rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-hospital-blue"
              disabled={submitting}
              style={{ fontSize: '0.88rem' }}
            >
              <FlaskConical size={16} />
              <span>{submitting ? 'Creating Order...' : 'Authorize Diagnostic Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};
