import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Phone,
  Building,
  KeyRound,
  User,
  Activity,
  Lock,
} from 'lucide-react';
import { useDoctorAuth } from '../context/DoctorAuthContext';

export const DoctorLoginScreen = () => {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [doctorCode, setDoctorCode] = useState('');
  const [phone, setPhone] = useState('');

  // Registration state
  const [name, setName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [specialty, setSpecialty] = useState('General Physician');
  const [clinicName, setClinicName] = useState('');

  const { login, register, loading, error } = useDoctorAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login({ doctor_code: doctorCode, phone });
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await register({
        name,
        phone: regPhone,
        specialty,
        clinic_name: clinicName,
      });
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  // Quick fill helper for demo convenience
  const handleQuickFill = () => {
    setDoctorCode('DOC-409');
    setPhone('+91 98111 22334');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div
        className="v-card fade-in"
        style={{
          maxWidth: 500,
          width: '100%',
          padding: '36px 32px',
          boxShadow: 'var(--neo-raised-lg)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #32B3C2 0%, #2292A0 50%, #1A7986 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: 'var(--neo-btn-primary)',
              border: '1.5px solid rgba(255, 255, 255, 0.4)',
            }}
          >
            <Stethoscope size={30} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--main-text)', letterSpacing: '-0.025em' }}>
            SwasthSetu <span style={{ color: 'var(--hospital-blue)' }}>Doctor Portal</span>
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--muted-text)', marginTop: 6, lineHeight: 1.4 }}>
            Doctor-Specific Queue • Dual Clinical Intake • Bounded Access
          </p>
        </div>

        {/* Tab Switcher (Recessed Inset Well) */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--surface-inset)',
            borderRadius: 'var(--radius-full)',
            padding: '4px 6px',
            marginBottom: 24,
            boxShadow: 'var(--neo-inset-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('login')}
            style={{
              flex: 1,
              padding: '9px 0',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: activeTab === 'login' ? 'var(--white)' : 'transparent',
              color: activeTab === 'login' ? 'var(--hospital-blue)' : 'var(--muted-text)',
              boxShadow: activeTab === 'login' ? 'var(--neo-raised-sm)' : 'none',
              transition: 'all 0.18s ease',
            }}
          >
            Doctor Login
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            style={{
              flex: 1,
              padding: '9px 0',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: activeTab === 'register' ? 'var(--white)' : 'transparent',
              color: activeTab === 'register' ? 'var(--hospital-blue)' : 'var(--muted-text)',
              boxShadow: activeTab === 'register' ? 'var(--neo-raised-sm)' : 'none',
              transition: 'all 0.18s ease',
            }}
          >
            Register Clinic
          </button>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div
            className="slide-up"
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--status-danger-bg)',
              color: 'var(--status-danger-text)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.86rem',
              fontWeight: 600,
              marginBottom: 20,
              boxShadow: 'var(--neo-raised-sm)',
            }}
          >
            {error}
          </div>
        )}

        {/* LOGIN FORM */}
        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--main-text)',
                  marginBottom: 8,
                }}
              >
                Doctor Identification Code
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound
                  size={17}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--muted-text)',
                  }}
                />
                <input
                  type="text"
                  required
                  placeholder="e.g. DOC-409"
                  value={doctorCode}
                  onChange={(e) => setDoctorCode(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    fontSize: '0.94rem',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                  }}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--main-text)',
                  marginBottom: 8,
                }}
              >
                Registered Mobile Number
              </label>
              <div style={{ position: 'relative' }}>
                <Phone
                  size={17}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--muted-text)',
                  }}
                />
                <input
                  type="tel"
                  required
                  placeholder="+91 98111 22334"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    fontSize: '0.94rem',
                  }}
                />
              </div>
            </div>

            {/* Quick Demo Fill Helper */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-inset)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--neo-inset-sm)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: 'var(--muted-text)' }}>
                Demo Doctor: <strong>Dr. Ramesh Mehta</strong> (DOC-409)
              </div>
              <button
                type="button"
                onClick={handleQuickFill}
                style={{
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: 'var(--hospital-blue)',
                  cursor: 'pointer',
                  boxShadow: 'var(--neo-raised-sm)',
                  transition: 'all 0.15s ease',
                }}
              >
                Quick Fill
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-hospital-blue btn-lg btn-block"
              style={{ marginTop: 6 }}
            >
              <span>{loading ? 'Authenticating Doctor Session...' : 'Enter Doctor Cockpit'}</span>
              <ArrowRight size={18} className="icon-shift-hover" />
            </button>
          </form>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--main-text)', marginBottom: 6 }}>
                Doctor Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-text)' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Priya Patel"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px 11px 42px', fontSize: '0.92rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--main-text)', marginBottom: 6 }}>
                Registered Phone
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-text)' }} />
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 00000"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px 11px 42px', fontSize: '0.92rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--main-text)', marginBottom: 6 }}>
                Medical Specialty
              </label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', fontSize: '0.92rem' }}
              >
                <option value="General Physician">General Physician</option>
                <option value="Diabetologist">Diabetologist</option>
                <option value="Pediatrician">Pediatrician</option>
                <option value="Cardiologist">Cardiologist</option>
                <option value="Gynecologist">Gynecologist</option>
                <option value="Pulmonologist">Pulmonologist</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--main-text)', marginBottom: 6 }}>
                Clinic or Hospital Name
              </label>
              <div style={{ position: 'relative' }}>
                <Building size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-text)' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Apollo Community Clinic"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px 11px 42px', fontSize: '0.92rem' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-hospital-blue btn-lg btn-block"
              style={{ marginTop: 8 }}
            >
              <span>{loading ? 'Creating Doctor Account...' : 'Register & Generate QR'}</span>
              <ArrowRight size={18} className="icon-shift-hover" />
            </button>
          </form>
        )}

        {/* Security & Verification Badges Footer */}
        <div
          style={{
            marginTop: 28,
            paddingTop: 20,
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: 'var(--muted-text)', fontWeight: 600 }}>
            <ShieldCheck size={14} color="var(--hospital-blue)" />
            <span>Bounded Privacy Guard</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: 'var(--muted-text)', fontWeight: 600 }}>
            <CheckCircle2 size={14} color="var(--hospital-blue)" />
            <span>Audit-Logged Access</span>
          </div>
        </div>
      </div>
    </div>
  );
};
