import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  ArrowLeft,
  Stethoscope,
  Lock,
} from 'lucide-react';
import { usePatient } from '../context/PatientContext';
import { patientApi, REGISTERED_DOCTORS } from '../services/patientApi';
import { DoctorPermissionSkeleton } from '../components/Skeleton';

export function DoctorAccessPermissionScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { patient } = usePatient();

  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setLoading(true);
      const start = Date.now();
      try {
        let doc = location.state?.doctor || patientApi.getSessionDoctor();
        if (!doc) doc = REGISTERED_DOCTORS[0];
        patientApi.saveSessionDoctor(doc);
        const elapsed = Date.now() - start;
        if (elapsed < 300) {
          await new Promise((r) => setTimeout(r, 300 - elapsed));
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

  if (loading || !doctor) {
    return <DoctorPermissionSkeleton />;
  }

  const handleAllowAccess = () => {
    sessionStorage.setItem('swasthsetu_access_granted', 'true');
    navigate('/intake', {
      state: {
        doctor,
        visitType: 'REVISITING',
        doctorAccessGranted: true,
      },
    });
  };

  const handleDenyAccess = () => {
    sessionStorage.setItem('swasthsetu_access_granted', 'false');
    navigate('/intake', {
      state: {
        doctor,
        visitType: 'REVISITING',
        doctorAccessGranted: false,
      },
    });
  };

  const handleCancel = () => {
    navigate('/visit-type', { state: { doctor } });
  };

  return (
    <div className="skeleton-content-fade page-centered-container" style={{ maxWidth: 680, padding: '8px 0' }}>
      <button
        onClick={handleCancel}
        className="btn btn-secondary"
        style={{ padding: '8px 16px', fontSize: '0.82rem', marginBottom: 18 }}
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <span style={{
          fontSize: '0.76rem',
          fontWeight: 700,
          color: 'var(--deep-indigo)',
          backgroundColor: 'var(--lavender-soft)',
          padding: '4px 14px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--lavender-200)',
          display: 'inline-block',
          marginBottom: 10,
        }}>
          Revisiting Consultation • Bounded Record Access
        </span>
        <h2 style={{ fontSize: '1.45rem', color: 'var(--main-text)', marginBottom: 6, fontWeight: 800 }}>
          Allow {doctor.name} to access your previous records?
        </h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--muted-text)' }}>
          To assist with your follow-up checkup, this doctor requests temporary bounded access to your prior notes and published lab results.
        </p>
      </div>

      {/* Allowed Records Information Card */}
      <div className="v-card" style={{
        padding: '24px 22px',
        border: '1.5px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 24,
        backgroundColor: '#FFFFFF',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--lavender-soft)',
            color: 'var(--deep-indigo)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid var(--lavender-200)',
          }}>
            <Stethoscope size={24} />
          </div>
          <div>
            <h4 style={{ fontSize: '1.08rem', color: 'var(--main-text)', fontWeight: 800, margin: 0 }}>
              {doctor.name}
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted-text)', margin: '2px 0 0 0' }}>
              {doctor.specialty} • {doctor.clinic_name}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--lavender-soft)',
            border: '1px solid var(--lavender-200)',
          }}>
            <FileText size={18} color="var(--deep-indigo)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--deep-indigo)' }}>
                1. Doctor's Own Prior Consultation Notes
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted-text)', marginTop: 2, lineHeight: 1.4 }}>
                Clinical notes written by Dr. Mehta from your previous visits at this clinic.
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--lavender-soft)',
            border: '1px solid var(--lavender-200)',
          }}>
            <ShieldCheck size={18} color="var(--deep-indigo)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--deep-indigo)' }}>
                2. Published Diagnostic CBC Lab Reports
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted-text)', marginTop: 2, lineHeight: 1.4 }}>
                Completed, verified CBC blood tests published by partner diagnostic centers.
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-subtle)',
          }}>
            <Clock size={18} color="var(--healthcare-teal)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--main-text)' }}>
                Strict Sovereignty Guarantee
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted-text)', marginTop: 2, lineHeight: 1.4 }}>
                Access is temporary and terminates immediately the moment Dr. Mehta ends your consultation.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          className="btn btn-primary btn-block btn-lg"
          onClick={handleAllowAccess}
        >
          <CheckCircle2 size={20} />
          <span>Allow Bounded Access & Continue</span>
        </button>

        <button
          className="btn btn-secondary btn-block"
          onClick={handleDenyAccess}
        >
          <XCircle size={18} />
          <span>Decline Access (Proceed Without Sharing)</span>
        </button>
      </div>
    </div>
  );
}
