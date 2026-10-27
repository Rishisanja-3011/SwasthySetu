import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Stethoscope, LogOut, ShieldCheck, ChevronDown, Bell, Users, QrCode } from 'lucide-react';
import { useDoctorAuth } from '../context/DoctorAuthContext';
import { DoctorProfileDropdown } from './DoctorProfileDropdown';
import { NotificationDropdown } from './NotificationDropdown';
import './DoctorNavbar.css';

export const DoctorNavbar = () => {
  const { doctor, logout, unreadCount, queue } = useDoctorAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initial = doctor?.name?.replace('Dr. ', '').charAt(0) || 'D';

  return (
    <header className="doctor-navbar">
      <div className="doctor-navbar-inner">
        {/* Brand & Clinic Info (Left) */}
        <Link to="/" className="brand-section">
          <div className="brand-icon-box">
            <Stethoscope size={22} />
          </div>
          <div className="brand-title-wrap">
            <div className="brand-name">
              SwasthSetu
              <span className="brand-version">Doctor</span>
            </div>
            <div className="brand-subtitle">
              {doctor?.clinic_name || 'Mehta Community Health Clinic'}
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Inset Pill Bar */}
        <nav className="navbar-desktop-nav" aria-label="Doctor Navigation">
          <NavLink
            to="/"
            className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
            end
          >
            <Users size={16} />
            <span>Today's Queue</span>
            {queue?.length > 0 && (
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  backgroundColor: 'var(--hospital-blue)',
                  color: '#ffffff',
                  padding: '1px 6px',
                  borderRadius: 10,
                  marginLeft: 2,
                }}
              >
                {queue.length}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/qr"
            className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
          >
            <QrCode size={16} />
            <span>Clinic Standee QR</span>
          </NavLink>
        </nav>

        {/* Controls & Interactive Doctor Profile (Right) */}
        <div className="navbar-right">
          {/* Bounded Access Assurance Indicator */}
          <div className="bounded-shield-pill" title="Hardware/Server enforced bounded consultation privacy">
            <ShieldCheck size={14} color="var(--hospital-blue)" />
            <span>Bounded Access Active</span>
          </div>

          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setIsNotificationOpen(!isNotificationOpen);
                setIsProfileOpen(false);
              }}
              className="icon-btn-neomorphic"
              title={`${unreadCount} notifications`}
              aria-label="View notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="icon-btn-badge">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            <NotificationDropdown
              isOpen={isNotificationOpen}
              onClose={() => setIsNotificationOpen(false)}
            />
          </div>

          {/* Clickable Doctor Identity Pill */}
          {doctor && (
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => {
                  setIsProfileOpen(!isProfileOpen);
                  setIsNotificationOpen(false);
                }}
                role="button"
                tabIndex={0}
                className="doctor-badge-btn"
                title="Click to view Doctor Profile, QR code & Doctor Code"
              >
                <div className="doctor-avatar">
                  {initial}
                  <span className="doctor-online-dot" />
                </div>

                <div className="doctor-info-min">
                  <span className="doctor-name-min">{doctor.name}</span>
                  <span className="doctor-code-min">{doctor.doctor_code || doctor.qr_code_id || 'DOC-409'}</span>
                </div>

                <ChevronDown
                  size={14}
                  color="var(--muted-text)"
                  style={{
                    transform: isProfileOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
                    marginLeft: 2,
                  }}
                />
              </div>

              {/* Doctor Profile Popup Panel */}
              <DoctorProfileDropdown
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
              />
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="logout-btn-neomorphic"
            title="Sign Out / Switch Doctor"
            aria-label="Sign out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </header>
  );
};
