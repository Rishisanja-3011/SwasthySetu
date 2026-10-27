import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  QrCode,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  Building2,
  FileText,
  Clock,
  Sparkles,
  Mic,
  Users,
  CheckCircle2,
  DoorOpen,
  Globe,
  HeartPulse,
  Activity,
  AlertCircle,
  ChevronRight,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { usePatient } from '../context/PatientContext';
import { patientApi, REGISTERED_DOCTORS } from '../services/patientApi';
import { QRScannerModal } from '../components/QRScannerModal';
import FloatingMediBot from '../components/FloatingMediBot';
import { LandingLiveStatusSkeleton } from '../components/Skeleton';
import { useMediBotIntro } from '../context/MediBotIntroContext';

const CORE_FEATURES = [
  {
    id: 'feature-multilingual',
    icon: Mic,
    iconBg: 'var(--bg-light-blue)',
    iconColor: 'var(--hospital-blue)',
    title: 'Multilingual Speech & Text Intake',
    description: 'Patients can speak in Gujarati, Hindi, Marathi, or English. Audio is converted to text and permanently deleted after consultation for zero voice retention.',
  },
  {
    id: 'feature-ai-structuring',
    icon: Sparkles,
    iconBg: 'var(--lavender-soft)',
    iconColor: 'var(--deep-indigo)',
    title: 'AI-Assisted Symptom Structuring',
    description: 'Conversational patient narratives are structured into chief complaint, duration, and symptom tags, allowing patients to verify and correct details before submission.',
  },
  {
    id: 'feature-live-queue',
    icon: Users,
    iconBg: '#ECFDF5',
    iconColor: '#059669',
    title: 'Live Queue & Door Call Alerts',
    description: 'Patients observe real-time queue position (#3), estimated waiting times, and doctor review status with instant door call notifications ("It\'s your turn — please come in").',
  },
  {
    id: 'feature-bounded-access',
    icon: ShieldCheck,
    iconBg: 'var(--lavender-soft)',
    iconColor: 'var(--deep-indigo)',
    title: 'Bounded Clinical Record Access',
    description: 'Patients retain self-owned sovereignty. Visiting physicians only receive temporary record access while the consultation is open, with automatic termination upon completion.',
  },
];

const WORKFLOW_STEPS = [
  {
    step: 1,
    color: 'var(--hospital-blue)',
    title: 'Connect to Physician',
    description: "Scan the doctor's QR code at clinic reception or enter doctor code (e.g. DOC-409) to confirm physician identity.",
  },
  {
    step: 2,
    color: 'var(--secondary-lavender)',
    title: 'Share Symptoms',
    description: 'Speak in your regional language or type your complaints. SwasthSetu accurately records patient voice in real time.',
  },
  {
    step: 3,
    color: 'var(--deep-indigo)',
    title: 'Review & Join Queue',
    description: 'Verify the AI-structured complaint and duration, correct any details, and confirm to enter the live clinic queue.',
  },
  {
    step: 4,
    color: '#059669',
    title: 'Consultation & Review',
    description: 'Doctor reviews your symptoms, calls you in, and completes the consultation. Raw voice audio is permanently destroyed.',
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { patient, activeEncounter } = usePatient();
  const { triggerMediBotIntro } = useMediBotIntro();

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualError, setManualError] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [clinicLiveStatus, setClinicLiveStatus] = useState(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);

  // Load real-time clinic status from patientApi
  const loadClinicStatus = async (isInitial = false) => {
    const start = Date.now();
    try {
      const status = await patientApi.getLiveClinicStatus('DOC-409');
      if (isInitial) {
        const elapsed = Date.now() - start;
        if (elapsed < 320) {
          await new Promise((resolve) => setTimeout(resolve, 320 - elapsed));
        }
      }
      setClinicLiveStatus(status);
    } catch (err) {
      console.warn('Could not load live clinic status:', err);
    } finally {
      setIsStatusLoading(false);
    }
  };

  useEffect(() => {
    loadClinicStatus(true);
    const interval = setInterval(() => loadClinicStatus(false), 4000);
    const handleStorage = () => loadClinicStatus(false);
    window.addEventListener('storage', handleStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleCodeResolved = (resolved) => {
    if (resolved.type === 'DOCTOR') {
      patientApi.saveSessionDoctor(resolved.entity);
      navigate('/doctor-confirm', { state: { doctor: resolved.entity } });
    } else if (resolved.type === 'LABORATORY') {
      navigate('/reports');
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualCode.trim() || isResolving) return;
    setManualError(null);
    setIsResolving(true);
    try {
      const resolved = await patientApi.resolveCode(manualCode.trim());
      handleCodeResolved(resolved);
    } catch (err) {
      setManualError(err.message || 'Invalid clinic code. Please enter DOC-409.');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="landing-page-wrap fade-in">
      {/* =========================================================================
          HERO SECTION (Dribbble Medical Health Service Inspiration)
          ========================================================================= */}
      <section className="landing-hero">
        <div className="landing-section-inner">
          <div className="landing-hero-grid">
            {/* Left Column: Headline, Description, Dual CTAs, Trust Points */}
            <div>
              {/* Trust Badge Pill */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#FFFFFF',
                color: 'var(--hospital-blue)',
                padding: '6px 16px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: '1px solid var(--border-medium)',
                boxShadow: 'var(--shadow-sm)',
                marginBottom: 20,
              }}>
                <HeartPulse size={16} color="var(--hospital-blue)" />
                <span>Hospital-Grade Patient Communication Platform</span>
              </div>

              {/* Active Consultation Banner (if in waiting room) */}
              {activeEncounter && activeEncounter.status !== 'CLOSED' && (
                <div style={{
                  marginBottom: 18,
                  backgroundColor: 'var(--lavender-soft)',
                  border: '1.5px solid var(--secondary-lavender)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  cursor: 'pointer',
                }} onClick={() => navigate('/waiting')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', color: 'var(--deep-indigo)', fontWeight: 600 }}>
                    <Activity size={16} />
                    <span>Active Visit: {activeEncounter.doctor_name} (Queue #{activeEncounter.queue_number})</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--deep-indigo)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                    Open Waiting Room <ChevronRight size={14} />
                  </span>
                </div>
              )}

              {/* Suggested Headline */}
              <h1 style={{
                fontSize: 'clamp(2rem, 3.8vw, 3rem)',
                color: 'var(--main-text)',
                fontWeight: 800,
                lineHeight: 1.18,
                marginBottom: 16,
                letterSpacing: '-0.03em',
              }}>
                Better Communication. <br />
                <span style={{ color: 'var(--hospital-blue)' }}>More Connected Care.</span>
              </h1>

              {/* Suggested Supporting Text */}
              <p style={{
                fontSize: '1.05rem',
                color: 'var(--muted-text)',
                lineHeight: 1.6,
                marginBottom: 28,
                maxWidth: 540,
              }}>
                SwasthSetu helps patients share their symptoms through voice or text in their native language and helps doctors review structured clinical information before consultation.
              </p>

              {/* Dual Primary CTAs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 32 }}>
                <button
                  type="button"
                  className="btn btn-hospital-blue btn-lg"
                  onClick={() => setIsScannerOpen(true)}
                  style={{ gap: 10 }}
                >
                  <QrCode size={20} />
                  <span>Start Patient Check-in</span>
                </button>

                <Link
                  to="/doctor"
                  className="btn btn-secondary btn-lg"
                  style={{ gap: 10, color: 'var(--deep-indigo)' }}
                >
                  <Stethoscope size={18} color="var(--deep-indigo)" />
                  <span>Doctor Workspace</span>
                </Link>
              </div>

              {/* Trust Indicators Row */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 24,
                paddingTop: 20,
                borderTop: '1px solid var(--border-medium)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', color: 'var(--main-text)', fontWeight: 600 }}>
                  <CheckCircle2 size={16} color="var(--hospital-blue)" />
                  <span>4 Languages (GU, HI, MR, EN)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', color: 'var(--main-text)', fontWeight: 600 }}>
                  <CheckCircle2 size={16} color="var(--hospital-blue)" />
                  <span>Real-time Queue Updates</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', color: 'var(--main-text)', fontWeight: 600 }}>
                  <CheckCircle2 size={16} color="var(--hospital-blue)" />
                  <span>Patient-Owned Privacy</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hospital Healthcare Visual Card (Dribbble Layout) */}
            <div>
              <div style={{
                background: '#FFFFFF',
                borderRadius: 'var(--radius-xl)',
                border: '1.5px solid var(--border-medium)',
                padding: '28px',
                boxShadow: 'var(--shadow-lg)',
                position: 'relative',
              }}>
                {/* Visual Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 16,
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: 20,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-light-blue)',
                      color: 'var(--hospital-blue)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Building2 size={24} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--main-text)' }}>
                        Mehta Community Clinic
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted-text)' }}>
                        Outpatient Consultation Desk • Cabin 2
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid #A7F3D0',
                  }}>
                    ● Clinic Active
                  </span>
                </div>

                {/* Simulated Patient-Doctor Interaction Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Step A: Live Queue Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, var(--bg-light-blue) 0%, #FFFFFF 100%)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    border: '1px solid var(--border-medium)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    {isStatusLoading ? (
                      <LandingLiveStatusSkeleton />
                    ) : (
                      <div className="skeleton-content-fade" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          backgroundColor: 'var(--hospital-blue)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.86rem',
                        }}>
                          {clinicLiveStatus ? `#${clinicLiveStatus.activeQueueCount + 1}` : '#1'}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--main-text)' }}>
                            Live Clinic Queue Status
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--muted-text)' }}>
                            {clinicLiveStatus ? (
                              <span>
                                {clinicLiveStatus.activeQueueCount} patient{clinicLiveStatus.activeQueueCount === 1 ? '' : 's'} waiting • Approx. {clinicLiveStatus.estimatedWaitMins} mins wait
                              </span>
                            ) : (
                              <span>Queue open • Estimated 5-10 mins wait</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    <span style={{
                      fontSize: '0.72rem',
                      color: 'var(--hospital-blue)',
                      fontWeight: 700,
                      backgroundColor: '#FFFFFF',
                      padding: '2px 8px',
                      borderRadius: 12,
                      border: '1px solid var(--border-medium)',
                    }}>
                      Door Call Ready
                    </span>
                  </div>

                  {/* Step B: Multilingual Speech Intake Box */}
                  <div style={{
                    backgroundColor: 'var(--lavender-soft)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    border: '1px solid var(--lavender-200)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: 'var(--deep-indigo)' }}>
                        <Mic size={14} color="var(--healthcare-teal)" />
                        <span>Regional Voice Input</span>
                      </div>
                      <span className="provenance-tag patient" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        PATIENT_REPORTED
                      </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--main-text)', fontStyle: 'italic', margin: 0 }}>
                      "મને ત્રણ દિવસથી ખૂબ જ કમજોરી લાગે છે અને ચક્કર પણ આવે છે."
                    </p>
                  </div>

                  {/* Step C: Structured Clinical Representation */}
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: 'var(--shadow-sm)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: 'var(--main-text)' }}>
                        <Sparkles size={14} color="var(--deep-indigo)" />
                        <span>AI Clinical Structuring</span>
                      </div>
                      <span className="provenance-tag ai" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        STRUCTURED (94%)
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)', display: 'flex', gap: 14 }}>
                      <span>Complaint: <strong>Weakness</strong></span>
                      <span>Duration: <strong>3 days</strong></span>
                      <span>Symptoms: <strong>Dizziness</strong></span>
                    </div>
                  </div>
                </div>

                {/* Bottom Quick Doctor Info */}
                <div style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.78rem',
                  color: 'var(--muted-text)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Stethoscope size={14} color="var(--hospital-blue)" />
                    <span>Physician: <strong>Dr. Ramesh Mehta</strong></span>
                  </div>
                  <span>CODE: DOC-409</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FAST CLINIC CHECK-IN BAR
          ========================================================================= */}
      <section style={{
        padding: '0 24px',
        marginTop: -32,
        position: 'relative',
        zIndex: 10,
      }}>
        <div className="landing-section-inner">
          <div style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--border-subtle)',
            padding: '20px 24px',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <QrCode size={20} color="var(--hospital-blue)" />
                <h3 style={{ fontSize: '1.1rem', color: 'var(--main-text)', margin: 0 }}>
                  Visiting Clinic or Pathology Lab Now?
                </h3>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--muted-text)', margin: 0, marginTop: 2 }}>
                Scan the QR code at reception or enter clinic code directly to join Dr. Mehta's queue.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-hospital-blue"
                onClick={() => setIsScannerOpen(true)}
              >
                <QrCode size={16} />
                <span>Scan Reception QR</span>
              </button>

              <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 6 }}>
                <input
                  id="input-clinic-code"
                  type="text"
                  placeholder="Code (e.g. DOC-409)"
                  value={manualCode}
                  disabled={isResolving}
                  onChange={(e) => setManualCode(e.target.value)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--border-medium)',
                    fontSize: '0.86rem',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    width: 170,
                    outlineColor: 'var(--hospital-blue)',
                    opacity: isResolving ? 0.7 : 1,
                  }}
                />
                <button
                  id="btn-clinic-code-submit"
                  type="submit"
                  disabled={isResolving || !manualCode.trim()}
                  className="btn btn-secondary"
                  style={{ padding: '9px 14px', opacity: isResolving || !manualCode.trim() ? 0.7 : 1 }}
                >
                  {isResolving ? <RefreshCw size={15} className="spin" /> : <ArrowRight size={15} />}
                </button>
              </form>
            </div>

            {manualError && (
              <div
                style={{
                  width: '100%',
                  fontSize: '0.82rem',
                  color: 'var(--rose-600)',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <AlertCircle size={15} />
                <span>{manualError}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          FEATURES SECTION
          ========================================================================= */}
      <section className="landing-section" id="features">
        <div className="landing-section-inner">
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              color: 'var(--hospital-blue)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'block',
              marginBottom: 8,
            }}>
              Core Capabilities
            </span>
            <h2 style={{ fontSize: '2rem', color: 'var(--main-text)', marginBottom: 8, fontWeight: 800 }}>
              Designed for Clinical Clarity & Patient Ease
            </h2>
            <p style={{ fontSize: '0.96rem', color: 'var(--muted-text)', maxWidth: 620, margin: '0 auto' }}>
              Built specifically to support actual consultation workflows without artificial friction or diagnostic overreach.
            </p>
          </div>

          <div className="landing-features-grid">
            {CORE_FEATURES.map((feat) => {
              const IconComp = feat.icon;
              return (
                <div key={feat.id} id={feat.id} className="v-card interactive-card" style={{ padding: 24 }}>
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: feat.iconBg,
                    color: feat.iconColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 18,
                    transition: 'transform 0.2s ease',
                  }}>
                    <IconComp size={26} />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--main-text)', marginBottom: 8 }}>
                    {feat.title}
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: 'var(--muted-text)', lineHeight: 1.55 }}>
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          HOW IT WORKS SECTION
          ========================================================================= */}
      <section className="landing-section" id="how-it-works" style={{ backgroundColor: 'var(--bg-light-blue)' }}>
        <div className="landing-section-inner">
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              color: 'var(--hospital-blue)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'block',
              marginBottom: 8,
            }}>
              Workflow
            </span>
            <h2 style={{ fontSize: '2rem', color: 'var(--main-text)', marginBottom: 8, fontWeight: 800 }}>
              Simple 4-Step Connected Care Journey
            </h2>
            <p style={{ fontSize: '0.96rem', color: 'var(--muted-text)', maxWidth: 580, margin: '0 auto' }}>
              How SwasthSetu streamlines patient intake from waiting room to consultation cabin.
            </p>
          </div>

          <div className="landing-steps-grid">
            {WORKFLOW_STEPS.map((s) => (
              <div key={s.step} id={`workflow-step-${s.step}`} className="v-card interactive-card" style={{ padding: 24, position: 'relative' }}>
                <span style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: s.color,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  marginBottom: 14,
                }}>
                  {s.step}
                </span>
                <h4 style={{ fontSize: '1.05rem', color: 'var(--main-text)', marginBottom: 6 }}>
                  {s.title}
                </h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--muted-text)', margin: 0, lineHeight: 1.5 }}>
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          DOCTOR WORKSPACE SPOTLIGHT SECTION
          ========================================================================= */}
      <section className="landing-section">
        <div className="landing-section-inner">
          <div style={{
            background: 'linear-gradient(135deg, var(--deep-indigo) 0%, #104E57 100%)',
            borderRadius: 'var(--radius-xl)',
            padding: '40px 36px',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 24,
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ maxWidth: 640 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Stethoscope size={20} color="var(--secondary-lavender)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#BFE7EE', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  For Licensed Physicians
                </span>
              </div>
              <h2 style={{ fontSize: '1.8rem', color: '#FFFFFF', marginBottom: 10, fontWeight: 800 }}>
                Doctor Consultation Workspace
              </h2>
              <p style={{ fontSize: '0.94rem', color: '#E2F1F5', lineHeight: 1.55, margin: 0 }}>
                Access Dr. Ramesh Mehta's live queue dashboard, review structured complaints with original spoken words, and advance patient consultation lifecycles in real time.
              </p>
            </div>

            <Link
              to="/doctor"
              className="btn btn-lg"
              style={{
                backgroundColor: '#FFFFFF',
                color: 'var(--deep-indigo)',
                fontWeight: 700,
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                textDecoration: 'none',
              }}
            >
              <span>Open Doctor Portal</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FOOTER
          ========================================================================= */}
      <footer style={{
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid var(--border-subtle)',
        padding: '48px 24px 32px 24px',
      }}>
        <div className="landing-section-inner">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 32,
            paddingBottom: 36,
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: 24,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'var(--hospital-blue)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Activity size={18} />
                </div>
                <strong style={{ fontSize: '1.15rem', color: 'var(--main-text)' }}>SwasthSetu</strong>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--muted-text)', lineHeight: 1.5 }}>
                Hospital-grade patient-doctor communication & queue coordination platform.
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '0.88rem', color: 'var(--main-text)', marginBottom: 12 }}>Patient Workflows</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.84rem' }}>
                <li><Link to="/portal" style={{ color: 'var(--muted-text)', textDecoration: 'none' }}>Patient Portal</Link></li>
                <li><Link to="/reports" style={{ color: 'var(--muted-text)', textDecoration: 'none' }}>Diagnostic Reports</Link></li>
                <li><Link to="/timeline" style={{ color: 'var(--muted-text)', textDecoration: 'none' }}>Health Timeline</Link></li>
                <li>
                  <Link
                    to="/assistant"
                    style={{ color: 'var(--muted-text)', textDecoration: 'none' }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      triggerMediBotIntro();
                    }}
                  >
                    MediBot Assistant
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize: '0.88rem', color: 'var(--main-text)', marginBottom: 12 }}>Physician Workspace</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.84rem' }}>
                <li><Link to="/doctor" style={{ color: 'var(--muted-text)', textDecoration: 'none' }}>Doctor Dashboard</Link></li>
                <li><span style={{ color: 'var(--muted-text)' }}>Dr. Ramesh Mehta (DOC-409)</span></li>
                <li><span style={{ color: 'var(--muted-text)' }}>Cabin 2 Consultation Desk</span></li>
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize: '0.88rem', color: 'var(--main-text)', marginBottom: 12 }}>Data Privacy Notice</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted-text)', lineHeight: 1.5, margin: 0 }}>
                SwasthSetu facilitates structured communication. It does not provide medical diagnoses or replace licensed physicians. All voice audio is automatically deleted upon consultation closure.
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: '0.8rem',
            color: 'var(--muted-text)',
          }}>
            <span>© 2026 SwasthSetu Healthcare Platform. All rights reserved.</span>
            <span>Built with Patient Sovereignty & Bounded Clinical Access.</span>
          </div>
        </div>
      </footer>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onCodeResolved={handleCodeResolved}
      />

      <FloatingMediBot />
    </div>
  );
}
