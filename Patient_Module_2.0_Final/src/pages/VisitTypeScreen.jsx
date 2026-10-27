import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserPlus, UserCheck, ArrowLeft, ShieldCheck } from 'lucide-react';
import { patientApi, REGISTERED_DOCTORS } from '../services/patientApi';
import { VisitTypeSkeleton } from '../components/Skeleton';

export function VisitTypeScreen() {
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setLoading(true);
      const start = Date.now();
      try {
        let doc = location.state?.doctor || patientApi.getSessionDoctor();
        if (!doc) {
          doc = REGISTERED_DOCTORS[0];
        }
        patientApi.saveSessionDoctor(doc);

        const elapsed = Date.now() - start;
        if (elapsed < 300) {
          await new Promise((resolve) => setTimeout(resolve, 300 - elapsed));
        }

        if (isMounted) {
          setDoctor(doc);
          setLoading(false);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    };

    init();
    return () => {
      isMounted = false;
    };
  }, [location.state]);

  const handleSelectVisitType = (visitType) => {
    sessionStorage.setItem('swasthsetu_visit_type', visitType);
    if (visitType === 'REVISITING') {
      navigate('/doctor-access-permission', {
        state: { doctor, visitType: 'REVISITING' },
      });
    } else {
      sessionStorage.setItem('swasthsetu_access_granted', 'false');
      navigate('/intake', {
        state: {
          doctor,
          visitType: 'NEW',
          doctorAccessGranted: false,
        },
      });
    }
  };

  if (loading || !doctor) {
    return <VisitTypeSkeleton />;
  }

  return (
    <div className="skeleton-content-fade page-centered-container" style={{ maxWidth: 840, padding: '8px 0' }}>
      <button
        onClick={() => navigate('/doctor-confirm', { state: { doctor } })}
        className="btn btn-secondary"
        style={{ padding: '8px 16px', fontSize: '0.82rem', marginBottom: 18 }}
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--main-text)', marginBottom: 6, fontWeight: 800 }}>
          Why are you visiting today?
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted-text)' }}>
          Visiting <strong>{doctor.name}</strong> • Choose your consultation category
        </p>
      </div>

      <div className="visit-type-grid">
        {/* Choice 1: NEW CONSULTATION */}
        <div
          className="v-card v-card-clickable"
          onClick={() => handleSelectVisitType('NEW')}
          style={{
            padding: 24,
            border: '1.5px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            backgroundColor: '#FFFFFF',
            boxShadow: 'var(--shadow-sm)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--lavender)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-light-blue)',
              color: 'var(--hospital-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <UserPlus size={26} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--main-text)', fontWeight: 800 }}>
                  NEW CONSULTATION
                </h3>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--lavender-soft)',
                  color: 'var(--deep-indigo)',
                }}>
                  Intake Mandatory
                </span>
              </div>
              <p style={{ fontSize: '0.86rem', color: 'var(--muted-text)', marginBottom: 12, lineHeight: 1.5 }}>
                First time seeing this doctor or discussing an entirely new health symptom.
              </p>
              <div style={{
                fontSize: '0.78rem',
                color: 'var(--deep-indigo)',
                backgroundColor: 'var(--lavender-soft)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                lineHeight: 1.5,
              }}>
                ✓ Voice/text symptom description required
                <br />
                🔒 Prior records & notes remain locked from this doctor
              </div>
            </div>
          </div>
        </div>

        {/* Choice 2: REVISITING CONSULTATION */}
        <div
          className="v-card v-card-clickable"
          onClick={() => handleSelectVisitType('REVISITING')}
          style={{
            padding: 24,
            border: '1.5px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            backgroundColor: '#FFFFFF',
            boxShadow: 'var(--shadow-sm)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--lavender)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--lavender-soft)',
              color: 'var(--deep-indigo)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <UserCheck size={26} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--main-text)', fontWeight: 800 }}>
                  REVISITING CONSULTATION
                </h3>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--status-normal-bg)',
                  color: 'var(--status-normal-text)',
                }}>
                  Follow-up Visit
                </span>
              </div>
              <p style={{ fontSize: '0.86rem', color: 'var(--muted-text)', marginBottom: 12, lineHeight: 1.5 }}>
                Follow-up visit with Dr. Mehta for ongoing care or to review published laboratory reports.
              </p>
              <div style={{
                fontSize: '0.78rem',
                color: 'var(--deep-indigo)',
                backgroundColor: 'var(--lavender-soft)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                lineHeight: 1.5,
              }}>
                ✓ Optional quick symptom recording or skip
                <br />
                🔓 You can permit bounded access to prior notes & lab results
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
