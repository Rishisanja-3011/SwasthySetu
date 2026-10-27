import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, QrCode, Stethoscope, Clock, ShieldCheck, MapPin } from 'lucide-react';
import { useDoctorAuth } from '../context/DoctorAuthContext';

export const DoctorSidebar = () => {
  const { doctor, queue } = useDoctorAuth();
  const waitingCount = (queue || []).filter(q => q.status === 'OPEN' || q.status === 'WAITING').length;

  return (
    <aside
      style={{
        width: 260,
        backgroundColor: 'var(--surface-raised)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 16px',
        boxShadow: 'var(--neo-raised-sm)',
      }}
    >
      <div>
        {/* Navigation Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <NavLink
            to="/"
            end
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '11px 16px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              color: isActive ? 'var(--hospital-blue)' : 'var(--muted-text)',
              backgroundColor: isActive ? 'var(--white)' : 'transparent',
              border: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
              boxShadow: isActive ? 'var(--neo-raised-sm)' : 'none',
              transition: 'all 0.16s ease',
            })}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Users size={18} />
              <span>Today's Queue</span>
            </div>
            {waitingCount > 0 && (
              <span
                style={{
                  backgroundColor: 'var(--hospital-blue)',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {waitingCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/qr"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '11px 16px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              color: isActive ? 'var(--hospital-blue)' : 'var(--muted-text)',
              backgroundColor: isActive ? 'var(--white)' : 'transparent',
              border: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
              boxShadow: isActive ? 'var(--neo-raised-sm)' : 'none',
              transition: 'all 0.16s ease',
            })}
          >
            <QrCode size={18} />
            <span>Doctor QR Standee</span>
          </NavLink>
        </div>

        {/* Doctor Summary Card */}
        {doctor && (
          <div
            style={{
              marginTop: 28,
              padding: 16,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--surface-inset)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--neo-inset-sm)',
            }}
          >
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: 'var(--muted-text)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 6,
              }}
            >
              Clinic Desk Profile
            </div>
            <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--main-text)' }}>
              {doctor.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--hospital-blue)', fontWeight: 650, marginTop: 2 }}>
              {doctor.specialty || 'General Physician'}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.78rem',
                color: 'var(--muted-text)',
                marginTop: 10,
              }}
            >
              <MapPin size={14} color="var(--hospital-blue)" />
              <span>Cabin 2 • Desk Standee Live</span>
            </div>
          </div>
        )}
      </div>

      {/* Security & Access Notice */}
      <div
        style={{
          padding: 14,
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--surface-inset)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.74rem',
          color: 'var(--muted-text)',
          boxShadow: 'var(--neo-inset-sm)',
          lineHeight: 1.45,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--main-text)', marginBottom: 4 }}>
          <ShieldCheck size={14} color="var(--hospital-blue)" />
          <span>SwasthSetu 2.0 Security</span>
        </div>
        Doctor queries locked automatically upon consultation closure. Raw voice audio destroyed.
      </div>
    </aside>
  );
};
