import React from 'react';
import { Printer, Download, Sparkles, MapPin, CheckCircle, ShieldCheck, QrCode } from 'lucide-react';

export const PrintableQRStandee = ({ doctor }) => {
  const doctorName = doctor?.name || 'Dr. Ramesh Mehta';
  const doctorCode = doctor?.doctor_code || doctor?.qr_code_id || 'DOC-409';
  const clinicName = doctor?.clinic_name || 'Mehta Community Health Clinic';
  const specialty = doctor?.specialty || 'General Physician & Family Medicine';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Action Header */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--main-text)', margin: 0 }}>
            Clinic Reception / Desk Standee
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--muted-text)', margin: '4px 0 0 0' }}>
            Place this standee at your consultation desk or clinic reception. Patients scan this to join your queue.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="btn btn-hospital-blue"
          style={{ whiteSpace: 'nowrap', fontSize: '0.88rem' }}
        >
          <Printer size={16} />
          <span>Print Standee</span>
        </button>
      </div>

      {/* The Printable Standee Card */}
      <div
        id="printable-standee"
        className="v-card"
        style={{
          borderRadius: 'var(--radius-xl)',
          padding: 38,
          textAlign: 'center',
          border: '2px solid var(--border-subtle)',
          boxShadow: 'var(--neo-raised-lg)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top Decorative Border Accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: 'linear-gradient(90deg, #32B3C2 0%, #2292A0 50%, #16626C 100%)',
          }}
        />

        {/* Clinic & Product Header */}
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'var(--lavender-soft)',
              color: 'var(--deep-indigo)',
              padding: '5px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.76rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: 12,
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--neo-raised-sm)',
            }}
          >
            <Sparkles size={13} color="var(--hospital-blue)" />
            SwasthSetu Connected Clinic
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--main-text)', margin: '4px 0' }}>
            {doctorName}
          </h1>
          <p style={{ fontSize: '0.96rem', color: 'var(--hospital-blue)', fontWeight: 700, margin: 0 }}>
            {specialty}
          </p>
          <p style={{ fontSize: '0.86rem', color: 'var(--muted-text)', marginTop: 4 }}>
            {clinicName} • Cabin 2
          </p>
        </div>

        {/* QR Code Frame with ambient raised shadow */}
        <div
          style={{
            maxWidth: 240,
            margin: '0 auto 22px auto',
            padding: 16,
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--neo-raised-md)',
          }}
        >
          <svg viewBox="0 0 160 160" width="100%" height="100%" style={{ display: 'block' }}>
            <rect width="160" height="160" fill="#ffffff" />
            {/* Corner Markers */}
            <rect x="10" y="10" width="40" height="40" fill="#1A2D35" rx="6" />
            <rect x="16" y="16" width="28" height="28" fill="#ffffff" rx="3" />
            <rect x="22" y="22" width="16" height="16" fill="#2292A0" rx="3" />

            <rect x="110" y="10" width="40" height="40" fill="#1A2D35" rx="6" />
            <rect x="116" y="16" width="28" height="28" fill="#ffffff" rx="3" />
            <rect x="122" y="22" width="16" height="16" fill="#2292A0" rx="3" />

            <rect x="10" y="110" width="40" height="40" fill="#1A2D35" rx="6" />
            <rect x="16" y="116" width="28" height="28" fill="#ffffff" rx="3" />
            <rect x="22" y="122" width="16" height="16" fill="#2292A0" rx="3" />

            {/* Data matrix pattern */}
            <rect x="60" y="15" width="8" height="16" fill="#1A2D35" />
            <rect x="75" y="20" width="16" height="8" fill="#1A2D35" />
            <rect x="95" y="15" width="8" height="8" fill="#1A2D35" />

            <rect x="60" y="45" width="40" height="8" fill="#1A2D35" />
            <rect x="15" y="60" width="20" height="8" fill="#1A2D35" />
            <rect x="45" y="60" width="12" height="12" fill="#2292A0" />
            <rect x="65" y="60" width="30" height="30" fill="#1A2D35" rx="4" />
            <rect x="105" y="60" width="15" height="8" fill="#1A2D35" />
            <rect x="130" y="60" width="15" height="15" fill="#1A2D35" />

            <rect x="20" y="80" width="15" height="8" fill="#1A2D35" />
            <rect x="45" y="80" width="8" height="20" fill="#1A2D35" />
            <rect x="110" y="80" width="10" height="20" fill="#1A2D35" />
            <rect x="130" y="85" width="15" height="8" fill="#1A2D35" />

            <rect x="60" y="100" width="10" height="10" fill="#1A2D35" />
            <rect x="80" y="100" width="15" height="15" fill="#2292A0" />
            <rect x="105" y="105" width="20" height="8" fill="#1A2D35" />
            <rect x="135" y="105" width="10" height="15" fill="#1A2D35" />

            <rect x="60" y="125" width="20" height="8" fill="#1A2D35" />
            <rect x="90" y="125" width="15" height="15" fill="#1A2D35" />
            <rect x="115" y="125" width="10" height="8" fill="#1A2D35" />
            <rect x="135" y="130" width="12" height="12" fill="#1A2D35" />

            <rect x="60" y="140" width="10" height="10" fill="#1A2D35" />
            <rect x="75" y="140" width="8" height="10" fill="#1A2D35" />
            <rect x="115" y="140" width="25" height="8" fill="#2292A0" />

            {/* Center Doctor Tag Badge */}
            <circle cx="80" cy="80" r="16" fill="#ffffff" />
            <circle cx="80" cy="80" r="13" fill="#2292A0" />
            <text x="80" y="84" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">DOC</text>
          </svg>
        </div>

        {/* Scan Callout */}
        <div
          style={{
            backgroundColor: 'var(--surface-inset)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--neo-inset-sm)',
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: '0.86rem', color: 'var(--hospital-blue)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Scan to consult with {doctorName}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted-text)', marginTop: 3 }}>
            Opens your clinic queue token and AI voice symptom intake
          </div>
        </div>

        {/* Doctor Fallback Code */}
        <div
          style={{
            display: 'inline-block',
            backgroundColor: 'var(--surface-inset)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--neo-inset-md)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 28px',
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>
            Doctor Fallback Code
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--main-text)', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
            {doctorCode}
          </div>
        </div>

        {/* Instructions Footer */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: 16,
            fontSize: '0.78rem',
            color: 'var(--muted-text)',
            lineHeight: 1.5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700, color: 'var(--main-text)', marginBottom: 3 }}>
            <ShieldCheck size={15} color="var(--hospital-blue)" />
            <span>Doctor-Specific Queue • Bounded Privacy Protected</span>
          </div>
          Patients enter Dr. Mehta's queue exclusively. Consultation access expires automatically upon completion.
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-standee, #printable-standee * {
            visibility: visible;
          }
          #printable-standee {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 500px;
            box-shadow: none;
            border: 2px solid #000;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
