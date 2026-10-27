import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  ChevronDown,
  QrCode,
  FileText,
  Clock,
  MessageSquareHeart,
} from 'lucide-react';
import { usePatient } from '../context/PatientContext';
import { useMediBotIntro } from '../context/MediBotIntroContext';
import { PatientSwitcherModal } from './PatientSwitcherModal';
import './Navbar.css';

export function Navbar() {
  const { patient } = usePatient();
  const { triggerMediBotIntro } = useMediBotIntro();
  const location = useLocation();
  const [showSwitcher, setShowSwitcher] = useState(false);

  return (
    <>
      <header className="patient-navbar">
        <div className="navbar-inner">
          {/* Brand Logo & Title */}
          <Link to="/" className="brand-section">
            <div className="brand-icon-box">
              <Activity size={22} />
            </div>
            <div className="brand-title-wrap">
              <div className="brand-name">
                SwasthSetu
                <span className="brand-version">Portal</span>
              </div>
              <div className="brand-subtitle">
                Patient Healthcare Portal
              </div>
            </div>
          </Link>

          {/* Desktop & Tablet Navigation */}
          <nav className="navbar-desktop-nav" aria-label="Portal Navigation">
            <NavLink
              to="/"
              className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
              end
            >
              <QrCode size={16} />
              <span>Patient Home</span>
            </NavLink>

            <NavLink
              to="/reports"
              className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
            >
              <FileText size={16} />
              <span>My Reports</span>
            </NavLink>

            <NavLink
              to="/timeline"
              className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
            >
              <Clock size={16} />
              <span>Timeline</span>
            </NavLink>

            <NavLink
              to="/assistant"
              className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
              onClick={(e) => {
                if (location.pathname !== '/assistant') {
                  e.preventDefault();
                  e.stopPropagation();
                  triggerMediBotIntro();
                }
              }}
            >
              <MessageSquareHeart size={16} />
              <span>Assistant</span>
            </NavLink>
          </nav>

          {/* Right Area: Patient Switcher */}
          <div className="navbar-right">
            <button
              className="patient-badge-btn"
              onClick={() => setShowSwitcher(true)}
              title="Switch Patient Profile"
            >
              <div className="patient-avatar">
                {patient?.name ? patient.name.charAt(0) : 'P'}
              </div>
              <div className="patient-info-min">
                <span className="patient-name-min">{patient?.name || 'Patient'}</span>
                <span className="patient-id-min">{patient?.patient_identifier || 'PT-ID'}</span>
              </div>
              <ChevronDown size={14} color="var(--muted-text)" />
            </button>
          </div>
        </div>
      </header>

      {showSwitcher && (
        <PatientSwitcherModal onClose={() => setShowSwitcher(false)} />
      )}
    </>
  );
}
