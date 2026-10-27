import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Eye,
  DoorOpen,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  Save,
  Shield,
  ShieldAlert,
  Clock,
  User,
  Stethoscope,
  Lock,
  Play,
  Check,
  RefreshCw,
  FileText,
  Activity,
  Calendar,
} from 'lucide-react';
import { doctorApi } from '../services/doctorApi';
import { StatusBadge } from '../components/StatusBadge';
import { DualSymptomIntakeCard } from '../components/DualSymptomIntakeCard';
import { RevisitingHistorySection } from '../components/RevisitingHistorySection';
import { DiagnosticOrderModal } from '../components/DiagnosticOrderModal';
import { useDoctorAuth } from '../context/DoctorAuthContext';

export const ClinicalCockpitScreen = () => {
  const { encounterId } = useParams();
  const { doctor, refreshQueue } = useDoctorAuth();
  const navigate = useNavigate();

  const [cockpitData, setCockpitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessExpired, setAccessExpired] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Consultation state
  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [startingConsultation, setStartingConsultation] = useState(false);
  const [endingConsultation, setEndingConsultation] = useState(false);
  const [consultationEnded, setConsultationEnded] = useState(false);

  // Fetch Cockpit Data on Mount
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setAccessExpired(false);
      setErrorMessage(null);

      try {
        // Automatically mark as DOCTOR_REVIEWING if still in WAITING state
        try {
          await doctorApi.reviewSymptoms(encounterId);
        } catch (e) {
          // If already in review or calling, continue
        }

        const data = await doctorApi.getCockpitData(encounterId);
        if (isMounted) {
          setCockpitData(data);
          setNotesText(data.current_note || '');
        }
      } catch (err) {
        if (!isMounted) return;
        if (err.code === 'BOUNDED_ACCESS_EXPIRED' || err.status === 403) {
          setAccessExpired(true);
        } else {
          setErrorMessage(err.message || 'Failed to load clinical cockpit');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [encounterId]);

  // Handle: Start Consultation (Doctor calls patient in)
  const handleStartConsultation = async () => {
    setStartingConsultation(true);
    try {
      const updated = await doctorApi.startConsultation(encounterId);
      setCockpitData((prev) => ({
        ...prev,
        encounter: {
          ...prev.encounter,
          status: 'IN_CONSULTATION',
          queue_status: updated.queue_status,
          lifecycle_state: updated.lifecycle_state,
          started_at: updated.started_at,
        },
      }));
      await refreshQueue();
    } catch (err) {
      alert(err.message || 'Error starting consultation');
    } finally {
      setStartingConsultation(false);
    }
  };

  // Handle: Save Notes
  const handleSaveNotes = async () => {
    setSavingNotes(true);
    setNotesSavedSuccess(false);
    try {
      await doctorApi.saveConsultationNotes(encounterId, notesText);
      setNotesSavedSuccess(true);
      setTimeout(() => setNotesSavedSuccess(false), 2500);
    } catch (err) {
      alert(err.message || 'Error saving notes');
    } finally {
      setSavingNotes(false);
    }
  };

  // Handle: End Consultation (Closure & Access Lock)
  const handleEndConsultation = async () => {
    const confirmClose = window.confirm(
      'Are you ready to complete this consultation? Active doctor query access will terminate and raw voice audio will be permanently destroyed.'
    );
    if (!confirmClose) return;

    setEndingConsultation(true);
    try {
      await doctorApi.endConsultation(encounterId);
      setConsultationEnded(true);
      await refreshQueue();
    } catch (err) {
      alert(err.message || 'Error ending consultation');
    } finally {
      setEndingConsultation(false);
    }
  };

  // 1. BOUNDED ACCESS EXPIRED / SEALED VIEW
  if (accessExpired) {
    return (
      <div className="fade-in" style={{ maxWidth: 640, margin: '60px auto', textAlign: 'center', padding: '0 16px' }}>
        <div className="v-card" style={{ padding: 40 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: 'var(--status-danger-bg)',
              color: 'var(--status-danger-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px auto',
              boxShadow: 'var(--neo-raised-sm)',
            }}
          >
            <Lock size={32} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--main-text)', marginBottom: 8 }}>
            Consultation Encounter is Sealed
          </h2>

          <p style={{ fontSize: '0.9rem', color: 'var(--muted-text)', lineHeight: 1.6, maxWidth: 480, margin: '0 auto 24px auto' }}>
            Under the SwasthSetu 2.0 Bounded Access model, active physician query access terminates automatically once the consultation ends.
          </p>

          <div
            style={{
              padding: 16,
              backgroundColor: 'var(--surface-inset)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.82rem',
              color: 'var(--muted-text)',
              textAlign: 'left',
              marginBottom: 24,
              boxShadow: 'var(--neo-inset-sm)',
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 800, color: 'var(--main-text)', marginBottom: 6 }}>
              Data Retention Status:
            </div>
            <div>• Doctor chart active query access: <strong style={{ color: 'var(--status-danger-text)' }}>TERMINATED</strong></div>
            <div>• Raw voice audio: <strong style={{ color: 'var(--status-normal-text)' }}>PERMANENTLY DESTROYED</strong></div>
            <div>• Retained records: <strong>Transcript, structured intake & consultation notes safely archived</strong></div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="btn btn-hospital-blue btn-lg btn-block"
          >
            <span>Return to Today's Patient Queue</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. LOADING STATE
  if (loading) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--muted-text)' }}>
        <div className="v-card fade-in" style={{ maxWidth: 400, margin: '0 auto', padding: '36px 32px' }}>
          <div className="stat-card-icon spin" style={{ margin: '0 auto 16px auto', width: 44, height: 44 }}>
            <Activity size={22} />
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--main-text)' }}>
            Loading Clinical Cockpit...
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--muted-text)', marginTop: 4 }}>
            Validating encounter credentials & bounded access rules
          </div>
        </div>
      </div>
    );
  }

  // 3. CONSULTATION ENDED BANNER
  if (consultationEnded) {
    return (
      <div className="fade-in" style={{ maxWidth: 620, margin: '60px auto', textAlign: 'center', padding: '0 16px' }}>
        <div className="v-card" style={{ padding: 40 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: 'var(--status-normal-bg)',
              color: 'var(--status-normal-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px auto',
              boxShadow: 'var(--neo-raised-sm)',
            }}
          >
            <CheckCircle2 size={36} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--main-text)', marginBottom: 8 }}>
            Consultation Completed Successfully
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted-text)', marginBottom: 24, lineHeight: 1.5 }}>
            Encounter is now sealed. Doctor query access has expired and the patient has been concluded from your active queue.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn btn-hospital-blue btn-lg btn-block"
          >
            <span>Proceed to Next Patient in Queue</span>
          </button>
        </div>
      </div>
    );
  }

  const encounter = cockpitData?.encounter;
  const patient = cockpitData?.patient;
  const intake = cockpitData?.intake;
  const priorNotes = cockpitData?.prior_notes || [];
  const priorIntakes = cockpitData?.prior_intakes || [];
  const publishedReports = cockpitData?.published_reports || [];
  const currentOrders = cockpitData?.current_orders || [];

  const isConsultationActive =
    encounter?.queue_status === 'CALLED' ||
    encounter?.queue_status === 'IN_CONSULTATION' ||
    encounter?.lifecycle_state === 'PLEASE_COME_IN' ||
    encounter?.lifecycle_state === 'CONSULTATION_STARTED';
  const isNewVisit = encounter?.visit_type === 'NEW';
  const isRevisiting = encounter?.visit_type === 'REVISITING';

  // Compute active timeline step
  const currentState = encounter?.lifecycle_state || 'WAITING';

  return (
    <div className="fade-in">
      {/* Back to Queue Navigation Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <button
          onClick={() => navigate('/')}
          className="btn btn-secondary"
          style={{ fontSize: '0.84rem', padding: '7px 14px' }}
        >
          <ArrowLeft size={15} />
          <span>Back to Today's Queue</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: '0.78rem',
              color: 'var(--muted-text)',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              backgroundColor: 'var(--surface-inset)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            Encounter: {encounter?.id ? encounter.id.slice(-6).toUpperCase() : 'ENC-LIVE'}
          </span>
          <StatusBadge type={encounter?.lifecycle_state || encounter?.status} />
        </div>
      </div>

      {/* Patient Header Banner Card */}
      <div
        className="v-card"
        style={{
          borderLeft: '5px solid var(--hospital-blue)',
          marginBottom: 22,
          padding: '24px 28px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--lavender-soft)',
                color: 'var(--deep-indigo)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--neo-raised-sm)',
                border: '1px solid var(--border-subtle)',
                fontSize: '1.25rem',
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {patient?.name ? patient.name.charAt(0) : 'P'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--main-text)', margin: 0 }}>
                  {patient?.name || 'Rahul Sharma'}
                </h1>
                <StatusBadge type={encounter?.visit_type} />
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--status-normal-bg)',
                    color: 'var(--status-normal-text)',
                    border: '1px solid var(--status-normal-border)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <ShieldCheck size={12} /> Bounded Access Active
                </span>
              </div>
              <div style={{ fontSize: '0.86rem', color: 'var(--muted-text)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span>ID: <strong style={{ color: 'var(--main-text)', fontFamily: 'var(--font-mono)' }}>{patient?.patient_identifier || 'PT-2026-4401'}</strong></span>
                <span>•</span>
                <span>Age: <strong style={{ color: 'var(--main-text)' }}>{patient?.age ? `${patient.age}y` : '32y'}</strong></span>
                <span>•</span>
                <span>Gender: <strong style={{ color: 'var(--main-text)' }}>{patient?.gender || 'Male'}</strong></span>
                <span>•</span>
                <span>Phone: <strong style={{ color: 'var(--main-text)' }}>{patient?.phone || '+91 98765 43210'}</strong></span>
              </div>
            </div>
          </div>

          {/* Action CTAs: Call In / Consultation Active */}
          <div>
            {!isConsultationActive ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <button
                  onClick={handleStartConsultation}
                  className="btn btn-hospital-blue btn-lg"
                  disabled={startingConsultation}
                >
                  <DoorOpen size={18} />
                  <span>{startingConsultation ? 'Calling Patient...' : 'Call In Patient & Start Consultation'}</span>
                </button>
                <span style={{ fontSize: '0.74rem', color: 'var(--muted-text)' }}>
                  Sends live alert to patient waiting screen: "Please come in"
                </span>
              </div>
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: 'var(--status-normal-bg)',
                  color: 'var(--status-normal-text)',
                  border: '1px solid var(--status-normal-border)',
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  boxShadow: 'var(--neo-raised-sm)',
                }}
              >
                <DoorOpen size={20} color="var(--status-normal-text)" />
                <span>Patient Called In • Consultation In Progress</span>
              </div>
            )}
          </div>
        </div>

        {/* 4-Step Consultation Progress Indicator */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            marginTop: 20,
            padding: '10px 12px',
            backgroundColor: 'var(--surface-inset)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--neo-inset-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {[
            { state: 'WAITING', label: '1. In Queue' },
            { state: 'DOCTOR_REVIEWING', label: '2. Reviewing' },
            { state: 'CONSULTATION_STARTED', label: '3. In Cabin' },
            { state: 'CONSULTATION_COMPLETED', label: '4. Concluded' },
          ].map((step) => {
            const isActive =
              currentState === step.state ||
              (step.state === 'CONSULTATION_STARTED' && (currentState === 'PLEASE_COME_IN' || currentState === 'IN_CONSULTATION'));
            return (
              <div
                key={step.state}
                style={{
                  textAlign: 'center',
                  padding: '8px 4px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isActive ? 'var(--white)' : 'transparent',
                  color: isActive ? 'var(--hospital-blue)' : 'var(--muted-text)',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.8rem',
                  boxShadow: isActive ? 'var(--neo-raised-sm)' : 'none',
                  transition: 'all 0.18s ease',
                }}
              >
                {step.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* 1. DUAL SYMPTOM VIEW (Verbatim statement vs Structured AI intake) */}
      <DualSymptomIntakeCard intake={intake} />

      {/* 2. BOUNDED ACCESS CONDITIONAL SECTIONS */}
      {/* CASE A: REVISITING -> Shows prior notes by this doctor + all published reports */}
      {isRevisiting && (
        <RevisitingHistorySection
          priorNotes={priorNotes}
          priorIntakes={priorIntakes}
          publishedReports={publishedReports}
          doctorName={doctor?.name || 'Dr. Ramesh Mehta'}
        />
      )}

      {/* CASE B: NEW -> Reassurance that historical records are sealed */}
      {isNewVisit && (
        <div
          className="v-card"
          style={{
            backgroundColor: 'var(--surface-inset)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: 'var(--neo-inset-sm)',
          }}
        >
          <Shield size={22} color="var(--hospital-blue)" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.84rem', color: 'var(--muted-text)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--main-text)' }}>NEW Consultation Access Scope:</strong> You are consulting this patient for a fresh clinical episode. Previous historical consultation notes and third-party laboratory reports remain sealed under SwasthSetu bounded privacy rules.
          </div>
        </div>
      )}

      {/* 3. CLINICAL CONSULTATION WORKSPACE (Notes & Diagnostic Orders) */}
      <div className="v-card" style={{ marginBottom: 24, padding: 26 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Stethoscope size={20} color="var(--hospital-blue)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--main-text)', margin: 0 }}>
              Physician Consultation Notes & Assessment
            </h3>
          </div>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: 'var(--deep-indigo)',
              backgroundColor: 'var(--lavender-soft)',
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            DOCTOR_ENTERED
          </span>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.84rem',
              fontWeight: 700,
              color: 'var(--main-text)',
              marginBottom: 8,
            }}
          >
            Clinical Assessment, Observations & Treatment Advice
          </label>
          <textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            rows={5}
            placeholder="Record clinical impressions, observations, advice, or next steps here..."
            style={{
              width: '100%',
              padding: '14px 16px',
              fontSize: '0.94rem',
              lineHeight: 1.6,
              resize: 'vertical',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleSaveNotes}
              className="btn btn-secondary"
              style={{ fontSize: '0.86rem' }}
              disabled={savingNotes}
            >
              <Save size={15} />
              <span>{savingNotes ? 'Saving Notes...' : 'Save Consultation Notes'}</span>
            </button>
            {notesSavedSuccess && (
              <span style={{ fontSize: '0.82rem', color: '#0D9488', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={15} /> Notes saved to encounter
              </span>
            )}
          </div>

          {/* Diagnostic Order CTA */}
          <button
            onClick={() => setIsOrderModalOpen(true)}
            className="btn btn-hospital-blue"
            style={{ fontSize: '0.86rem' }}
          >
            <FlaskConical size={16} />
            <span>+ Order CBC Diagnostic Test</span>
          </button>
        </div>

        {/* Existing Diagnostic Orders list */}
        {currentOrders.length > 0 && (
          <div
            style={{
              marginTop: 20,
              paddingTop: 14,
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: 'var(--muted-text)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 10,
              }}
            >
              Active Diagnostic Orders for this Encounter:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {currentOrders.map((ord, idx) => (
                <div
                  key={ord._id || idx}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--surface-inset)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.84rem',
                    color: 'var(--main-text)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: 'var(--neo-inset-sm)',
                  }}
                >
                  <FlaskConical size={15} color="var(--hospital-blue)" />
                  <span>
                    <strong>{ord.test_type}</strong> ({ord.status})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. END CONSULTATION FOOTER ACTION */}
      <div
        className="v-card"
        style={{
          borderLeft: '5px solid #EF4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          padding: '24px 28px',
        }}
      >
        <div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--main-text)', margin: 0 }}>
            Complete Consultation & Lock Encounter
          </h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--muted-text)', maxWidth: 560, marginTop: 4, lineHeight: 1.45 }}>
            Finalize this visit. The patient will immediately see "Consultation completed", raw voice audio will be permanently destroyed, and active doctor query access will terminate.
          </p>
        </div>

        <button
          onClick={handleEndConsultation}
          className="btn btn-danger btn-lg"
          disabled={endingConsultation}
        >
          <span>{endingConsultation ? 'Closing Encounter...' : 'Complete & Seal Consultation'}</span>
        </button>
      </div>

      {/* Diagnostic Order Modal */}
      <DiagnosticOrderModal
        encounterId={encounterId}
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onOrderCreated={(newOrder) => {
          setCockpitData((prev) => ({
            ...prev,
            current_orders: [...(prev.current_orders || []), newOrder],
          }));
        }}
      />
    </div>
  );
};
