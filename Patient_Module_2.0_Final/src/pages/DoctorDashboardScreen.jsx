import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Stethoscope,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Mic,
  Sparkles,
  ChevronRight,
  UserCheck,
  ArrowRight,
  ShieldCheck,
  DoorOpen,
  Play,
  Check,
  RefreshCw,
  Search,
  Phone,
  Calendar,
  Lock,
  Tag,
  ArrowLeft,
} from 'lucide-react';
import { patientApi } from '../services/patientApi';
import { StatusBadge } from '../components/StatusBadge';
import {
  DoctorDashboardStatsSkeleton,
  DoctorQueueRowsSkeleton,
  DoctorPatientDetailSkeleton,
} from '../components/Skeleton';

export function DoctorDashboardScreen() {
  const [activeEncounter, setActiveEncounter] = useState(null);
  const [clinicQueue, setClinicQueue] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionFeedback, setActionFeedback] = useState(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [queueError, setQueueError] = useState(null);
  const [isActionPending, setIsActionPending] = useState(null);

  // Load doctor queue and active patient data
  const refreshData = (isInitial = false) => {
    try {
      const active = patientApi.getActiveEncounter();
      const queue = patientApi.getClinicQueue('DOC-409');
      setActiveEncounter(active);
      setClinicQueue(queue);
      setQueueError(null);

      // If active encounter exists, select it by default, else select first queue item
      if (active) {
        setSelectedPatientId((prev) => prev || active.id);
      } else if (queue.length > 0) {
        setSelectedPatientId((prev) => prev || queue[0].id);
      }
    } catch (err) {
      setQueueError(err.message || 'Failed to load clinic queue data.');
    } finally {
      if (!isInitial) {
        setIsLoadingQueue(false);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoadingQueue(true);
    refreshData(true);

    const timer = setTimeout(() => {
      if (isMounted) {
        setIsLoadingQueue(false);
      }
    }, 320);

    const interval = setInterval(() => refreshData(false), 3000);
    const handleStorage = () => refreshData(false);
    window.addEventListener('storage', handleStorage);
    return () => {
      isMounted = false;
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Compute full patient list (Active encounter patient + static clinic queue)
  const allPatients = useMemo(() => {
    const list = [];
    if (activeEncounter) {
      list.push({
        id: activeEncounter.id,
        isLiveSession: true,
        name: activeEncounter.patient_name || 'Active Patient',
        patient_identifier: activeEncounter.patient_identifier || 'PT-9942',
        visit_type: activeEncounter.visit_type || 'NEW',
        lifecycle_state: activeEncounter.lifecycle_state || 'WAITING',
        queue_number: activeEncounter.queue_number || 1,
        created_at: activeEncounter.created_at,
        intake: activeEncounter.intake,
        doctor_access_granted: activeEncounter.doctor_access_granted,
      });
    }

    clinicQueue.forEach((q, idx) => {
      list.push({
        id: q.id,
        isLiveSession: false,
        name: q.name,
        patient_identifier: `PT-202${idx + 3}`,
        visit_type: idx % 2 === 0 ? 'REVISITING' : 'NEW',
        lifecycle_state: 'WAITING',
        queue_number: (activeEncounter ? 2 : 1) + idx,
        created_at: q.arrived_at,
        intake: {
          input_mode: idx % 2 === 0 ? 'voice' : 'text',
          chief_complaint: idx % 2 === 0 ? 'Recurring hypertension headache and neck stiffness' : 'Mild throat irritation with seasonal dry cough',
          duration: idx % 2 === 0 ? '5 days' : '2 days',
          symptoms: idx % 2 === 0 ? ['Occipital headache', 'Neck tension', 'Mild dizziness'] : ['Throat tickle', 'Dry cough'],
          raw_transcript: idx % 2 === 0
            ? 'Sir, pichle char-panch dino se sar me peeche dard rehta hai aur gardan jakdi lagti hai BP ki dava chal rahi hai.'
            : 'Sir, gala sookh raha hai aur pichle do din se sookhi khansi aa rahi hai.',
          provenance: { raw: 'PATIENT_REPORTED', structured: 'AI_GENERATED' },
          confidence: 0.94,
        },
        doctor_access_granted: idx % 2 === 0,
      });
    });

    return list;
  }, [activeEncounter, clinicQueue]);

  // Filtered patient list
  const filteredPatients = useMemo(() => {
    return allPatients.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.patient_identifier.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'WAITING') return p.lifecycle_state === 'WAITING';
      if (statusFilter === 'REVIEW') return p.lifecycle_state === 'DOCTOR_REVIEWING';
      if (statusFilter === 'CONSULTATION') return p.lifecycle_state === 'CONSULTATION_STARTED' || p.lifecycle_state === 'PLEASE_COME_IN';
      if (statusFilter === 'COMPLETED') return p.lifecycle_state === 'CONSULTATION_COMPLETED';
      return true;
    });
  }, [allPatients, searchQuery, statusFilter]);

  // Selected patient details
  const selectedPatient = useMemo(() => {
    return allPatients.find((p) => p.id === selectedPatientId) || allPatients[0] || null;
  }, [allPatients, selectedPatientId]);

  // Consultation Lifecycle Actions
  const handleAdvanceStatus = async (nextState) => {
    if (isActionPending) return; // Prevent duplicate requests
    setIsActionPending(nextState);

    try {
      if (!activeEncounter) {
        setActionFeedback({
          type: 'info',
          message: 'Status updated for demonstration. Connect a live patient via Check-in for live waiting room sync.',
        });
        setTimeout(() => setActionFeedback(null), 4000);
        return;
      }

      const updated = patientApi.advanceEncounterState(activeEncounter.id, nextState);
      setActiveEncounter(updated);
      window.dispatchEvent(new Event('storage'));

      const labels = {
        DOCTOR_REVIEWING: 'Marked as "Reviewing Symptoms". Patient waiting screen updated.',
        PLEASE_COME_IN: 'Sent "Please Come In" call to patient screen.',
        CONSULTATION_STARTED: 'Consultation marked as started.',
        CONSULTATION_COMPLETED: 'Consultation ended. Bounded doctor access terminated and raw audio deleted.',
      };

      setActionFeedback({
        type: 'success',
        message: labels[nextState] || `Status updated to ${nextState}`,
      });
      setTimeout(() => setActionFeedback(null), 4000);
      refreshData();
    } catch (e) {
      setActionFeedback({
        type: 'error',
        message: 'Failed to update consultation state.',
      });
      setTimeout(() => setActionFeedback(null), 3000);
    } finally {
      setIsActionPending(null);
    }
  };

  // Helper stats
  const stats = useMemo(() => {
    const waitingCount = allPatients.filter((p) => p.lifecycle_state === 'WAITING').length;
    const reviewingCount = allPatients.filter((p) => p.lifecycle_state === 'DOCTOR_REVIEWING').length;
    const inConsultCount = allPatients.filter((p) => p.lifecycle_state === 'CONSULTATION_STARTED' || p.lifecycle_state === 'PLEASE_COME_IN').length;
    return {
      waiting: waitingCount,
      reviewing: reviewingCount,
      inConsult: inConsultCount,
      totalQueue: allPatients.length,
    };
  }, [allPatients]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-lavender-gray)', padding: '24px 16px 80px 16px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Doctor Header Banner */}
        <div
          style={{
            backgroundColor: 'var(--white)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px 28px',
            marginBottom: '24px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--lavender-soft)',
                color: 'var(--deep-indigo)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 800,
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Stethoscope size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--main-text)', margin: 0 }}>
                  Dr. Ramesh Mehta
                </h1>
                <span
                  style={{
                    backgroundColor: 'var(--status-normal-bg)',
                    color: 'var(--status-normal-text)',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--status-normal-border)',
                  }}
                >
                  Cabin 2 • Active Station
                </span>
                <span
                  style={{
                    backgroundColor: 'var(--lavender-soft)',
                    color: 'var(--deep-indigo)',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  DOC-409
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted-text)', margin: '4px 0 0 0' }}>
                SwasthSetu Consultation Suite • General Medicine & Diabetology • Live Patient Queue
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={refreshData}
              className="btn btn-secondary"
              style={{ fontSize: '13px', padding: '8px 14px', height: '40px' }}
              title="Refresh Queue"
            >
              <RefreshCw size={15} />
              <span>Refresh</span>
            </button>
            <Link
              to="/portal"
              className="btn btn-outline"
              style={{ fontSize: '13px', padding: '8px 14px', height: '40px' }}
            >
              <ArrowLeft size={15} />
              <span>Patient Portal</span>
            </Link>
          </div>
        </div>

        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              backgroundColor: actionFeedback.type === 'error' ? 'var(--status-danger-bg)' : actionFeedback.type === 'info' ? 'var(--bg-light-blue)' : 'var(--status-normal-bg)',
              color: actionFeedback.type === 'error' ? 'var(--status-danger-text)' : actionFeedback.type === 'info' ? 'var(--hospital-blue)' : 'var(--status-normal-text)',
              border: `1px solid ${actionFeedback.type === 'error' ? 'var(--status-danger-border)' : actionFeedback.type === 'info' ? 'var(--border-subtle)' : 'var(--status-normal-border)'}`,
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {actionFeedback.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{actionFeedback.message}</span>
          </div>
        )}

        {/* Doctor Stats Grid */}
        {isLoadingQueue ? (
          <DoctorDashboardStatsSkeleton />
        ) : (
          <div className="doctor-stats-grid skeleton-content-fade">
            <div className="stat-card">
              <div className="stat-card-icon" style={{ backgroundColor: 'var(--status-waiting-bg)', color: 'var(--status-waiting-text)' }}>
                <Clock size={20} />
              </div>
              <div>
                <div className="stat-card-val">{stats.waiting}</div>
                <div className="stat-card-lbl">Waiting in Queue</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-icon" style={{ backgroundColor: 'var(--lavender-soft)', color: 'var(--deep-indigo)' }}>
                <FileText size={20} />
              </div>
              <div>
                <div className="stat-card-val">{stats.reviewing}</div>
                <div className="stat-card-lbl">Under Review</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-icon" style={{ backgroundColor: 'var(--status-normal-bg)', color: 'var(--status-normal-text)' }}>
                <Stethoscope size={20} />
              </div>
              <div>
                <div className="stat-card-val">{stats.inConsult}</div>
                <div className="stat-card-lbl">In Consultation</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-icon" style={{ backgroundColor: 'var(--bg-light-blue)', color: 'var(--hospital-blue)' }}>
                <Users size={20} />
              </div>
              <div>
                <div className="stat-card-val">{stats.totalQueue}</div>
                <div className="stat-card-lbl">Total Patient Queue</div>
              </div>
            </div>
          </div>
        )}

        {/* Main Doctor Dashboard 2-Column Grid */}
        <div className="doctor-layout-grid">
          {/* Left Column: Patient Queue */}
          <div
            style={{
              backgroundColor: 'var(--white)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--main-text)', margin: 0 }}>
                  Queue Management
                </h2>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--lavender)', backgroundColor: 'var(--lavender-soft)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                  {filteredPatients.length} Active
                </span>
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-text)' }} />
                <input
                  type="text"
                  placeholder="Search patient name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    fontSize: '13px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    outline: 'none',
                    backgroundColor: 'var(--bg-lavender-gray)',
                  }}
                />
              </div>

              {/* Status Filters */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                {['ALL', 'WAITING', 'REVIEW', 'CONSULTATION'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: statusFilter === tab ? 'var(--deep-indigo)' : 'var(--lavender-soft)',
                      color: statusFilter === tab ? '#FFFFFF' : 'var(--deep-indigo)',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Queue List */}
            <div style={{ maxHeight: '620px', overflowY: 'auto', padding: '10px 12px' }}>
              {isLoadingQueue ? (
                <DoctorQueueRowsSkeleton count={4} />
              ) : queueError ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--status-danger-text)' }}>
                  <AlertCircle size={32} style={{ margin: '0 auto 8px auto' }} />
                  <p style={{ fontSize: '13px', margin: 0, fontWeight: 700 }}>{queueError}</p>
                  <button onClick={refreshData} className="btn btn-secondary" style={{ marginTop: '12px', fontSize: '12px', padding: '6px 12px' }}>
                    <RefreshCw size={12} /> Retry
                  </button>
                </div>
              ) : filteredPatients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted-text)' }}>
                  <Users size={36} style={{ margin: '0 auto 10px auto', opacity: 0.35 }} />
                  <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--main-text)' }}>No Patients In Queue</p>
                  <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>Patients will appear here automatically when they complete clinic check-in.</p>
                </div>
              ) : (
                filteredPatients.map((p) => {
                  const isSelected = selectedPatient?.id === p.id;
                  const isLive = p.isLiveSession;

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPatientId(p.id)}
                      className="v-card-clickable"
                      style={{
                        padding: '14px',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        border: isSelected ? '2px solid var(--lavender)' : '1px solid var(--border-subtle)',
                        backgroundColor: isSelected ? 'var(--lavender-soft)' : '#FFFFFF',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: isSelected ? '0 4px 14px rgba(126, 129, 242, 0.18)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: isSelected ? 'var(--deep-indigo)' : 'var(--lavender-subtle)',
                              color: isSelected ? '#FFFFFF' : 'var(--deep-indigo)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 800,
                            }}
                          >
                            #{p.queue_number}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--main-text)' }}>
                            {p.name}
                          </span>
                        </div>
                        {isLive && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              backgroundColor: 'var(--status-normal-bg)',
                              color: 'var(--status-normal-text)',
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-xs)',
                              border: '1px solid var(--status-normal-border)',
                            }}
                          >
                            LIVE APP
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--muted-text)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{p.patient_identifier}</span>
                        <StatusBadge
                          status={p.lifecycle_state}
                          label={
                            p.lifecycle_state === 'DOCTOR_REVIEWING'
                              ? 'Under Review'
                              : p.lifecycle_state === 'PLEASE_COME_IN'
                              ? 'Called In'
                              : p.lifecycle_state === 'CONSULTATION_STARTED'
                              ? 'In Consult'
                              : p.lifecycle_state === 'CONSULTATION_COMPLETED'
                              ? 'Completed'
                              : 'Waiting'
                          }
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Detailed Patient Review & Consultation Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {isLoadingQueue ? (
              <DoctorPatientDetailSkeleton />
            ) : selectedPatient ? (
              <>
                {/* Patient Summary Header Card */}
                <div
                  className="skeleton-content-fade"
                  style={{
                    backgroundColor: 'var(--white)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)',
                    padding: '24px',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--main-text)', margin: 0 }}>
                          {selectedPatient.name}
                        </h2>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: selectedPatient.visit_type === 'NEW' ? 'var(--bg-light-blue)' : 'var(--lavender-soft)',
                            color: selectedPatient.visit_type === 'NEW' ? 'var(--hospital-blue)' : 'var(--deep-indigo)',
                          }}
                        >
                          {selectedPatient.visit_type === 'NEW' ? 'New Consultation' : 'Revisiting Visit'}
                        </span>
                        {selectedPatient.doctor_access_granted && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: 'var(--status-normal-bg)',
                              color: 'var(--status-normal-text)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <ShieldCheck size={12} /> Bounded Access Granted
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '13px', color: 'var(--muted-text)', flexWrap: 'wrap' }}>
                        <span>ID: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--main-text)' }}>{selectedPatient.patient_identifier}</strong></span>
                        <span>Queue Position: <strong style={{ color: 'var(--main-text)' }}>#{selectedPatient.queue_number}</strong></span>
                        <span>Encounter State: <strong style={{ color: 'var(--deep-indigo)' }}>{selectedPatient.lifecycle_state}</strong></span>
                      </div>
                    </div>

                    {/* Consultation Lifecycle Workflow Controls */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {selectedPatient.lifecycle_state === 'WAITING' && (
                        <button
                          id="btn-doctor-review"
                          onClick={() => handleAdvanceStatus('DOCTOR_REVIEWING')}
                          disabled={Boolean(isActionPending)}
                          className="btn btn-primary"
                          style={{ fontSize: '13px', padding: '10px 16px', opacity: isActionPending ? 0.7 : 1 }}
                        >
                          {isActionPending === 'DOCTOR_REVIEWING' ? <RefreshCw size={16} className="spin" /> : <FileText size={16} />}
                          <span>{isActionPending === 'DOCTOR_REVIEWING' ? 'Updating...' : 'Review Symptoms'}</span>
                        </button>
                      )}

                      {(selectedPatient.lifecycle_state === 'WAITING' || selectedPatient.lifecycle_state === 'DOCTOR_REVIEWING') && (
                        <button
                          id="btn-doctor-call-in"
                          onClick={() => handleAdvanceStatus('PLEASE_COME_IN')}
                          disabled={Boolean(isActionPending)}
                          className="btn btn-primary"
                          style={{ fontSize: '13px', padding: '10px 16px', backgroundColor: 'var(--healthcare-teal)', opacity: isActionPending ? 0.7 : 1 }}
                        >
                          {isActionPending === 'PLEASE_COME_IN' ? <RefreshCw size={16} className="spin" /> : <DoorOpen size={16} />}
                          <span>{isActionPending === 'PLEASE_COME_IN' ? 'Calling In...' : 'Call In Patient'}</span>
                        </button>
                      )}

                      {(selectedPatient.lifecycle_state === 'PLEASE_COME_IN' || selectedPatient.lifecycle_state === 'DOCTOR_REVIEWING') && (
                        <button
                          id="btn-doctor-start-consult"
                          onClick={() => handleAdvanceStatus('CONSULTATION_STARTED')}
                          disabled={Boolean(isActionPending)}
                          className="btn btn-primary"
                          style={{ fontSize: '13px', padding: '10px 16px', opacity: isActionPending ? 0.7 : 1 }}
                        >
                          {isActionPending === 'CONSULTATION_STARTED' ? <RefreshCw size={16} className="spin" /> : <Play size={16} />}
                          <span>{isActionPending === 'CONSULTATION_STARTED' ? 'Starting...' : 'Start Consultation'}</span>
                        </button>
                      )}

                      {selectedPatient.lifecycle_state === 'CONSULTATION_STARTED' && (
                        <button
                          id="btn-doctor-end-consult"
                          onClick={() => handleAdvanceStatus('CONSULTATION_COMPLETED')}
                          disabled={Boolean(isActionPending)}
                          className="btn"
                          style={{ fontSize: '13px', padding: '10px 18px', backgroundColor: 'var(--main-text)', color: '#FFFFFF', opacity: isActionPending ? 0.7 : 1 }}
                        >
                          {isActionPending === 'CONSULTATION_COMPLETED' ? <RefreshCw size={16} className="spin" /> : <Check size={16} />}
                          <span>{isActionPending === 'CONSULTATION_COMPLETED' ? 'Ending...' : 'End Consultation'}</span>
                        </button>
                      )}

                      {selectedPatient.lifecycle_state === 'CONSULTATION_COMPLETED' && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--status-normal-text)',
                            backgroundColor: 'var(--status-normal-bg)',
                            padding: '8px 14px',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '13px',
                            fontWeight: 700,
                          }}
                        >
                          <CheckCircle2 size={16} />
                          <span>Consultation Completed</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Consultation Timeline Indicator */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '8px',
                      padding: '12px 14px',
                      backgroundColor: 'var(--bg-lavender-gray)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {[
                      { state: 'WAITING', label: '1. In Queue' },
                      { state: 'DOCTOR_REVIEWING', label: '2. Reviewing' },
                      { state: 'CONSULTATION_STARTED', label: '3. In Cabin' },
                      { state: 'CONSULTATION_COMPLETED', label: '4. Concluded' },
                    ].map((step, idx) => {
                      const isActive =
                        selectedPatient.lifecycle_state === step.state ||
                        (step.state === 'CONSULTATION_STARTED' && selectedPatient.lifecycle_state === 'PLEASE_COME_IN');
                      return (
                        <div
                          key={step.state}
                          style={{
                            textAlign: 'center',
                            padding: '6px',
                            borderRadius: 'var(--radius-xs)',
                            backgroundColor: isActive ? 'var(--white)' : 'transparent',
                            color: isActive ? 'var(--deep-indigo)' : 'var(--muted-text)',
                            fontWeight: isActive ? 800 : 600,
                            fontSize: '12px',
                            boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                          }}
                        >
                          {step.label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Symptom Intake Card (AI Structured + Raw Verbatim Speech) */}
                <div
                  style={{
                    backgroundColor: 'var(--white)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)',
                    padding: '24px',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--lavender-soft)',
                          color: 'var(--deep-indigo)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--main-text)', margin: 0 }}>
                          Submitted Symptom Intelligence
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--muted-text)', margin: '2px 0 0 0' }}>
                          Structured intake submitted before consultation
                        </p>
                      </div>
                    </div>

                    {selectedPatient.intake && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: selectedPatient.intake.input_mode === 'voice' ? 'rgba(0, 155, 125, 0.1)' : 'var(--bg-light-blue)',
                            color: selectedPatient.intake.input_mode === 'voice' ? 'var(--healthcare-teal)' : 'var(--hospital-blue)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {selectedPatient.intake.input_mode === 'voice' ? <Mic size={13} /> : <FileText size={13} />}
                          <span>{selectedPatient.intake.input_mode === 'voice' ? 'Voice Intake' : 'Text Intake'}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedPatient.intake ? (
                    <div>
                      {/* Structured Findings Panel */}
                      <div
                        style={{
                          padding: '18px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--lavender-soft)',
                          border: '1px solid var(--border-subtle)',
                          marginBottom: '20px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--deep-indigo)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                            Structured Clinical Summary
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted-text)', backgroundColor: '#FFFFFF', padding: '2px 8px', borderRadius: 'var(--radius-xs)' }}>
                            PROVENANCE: AI_GENERATED (Confidence 94%)
                          </span>
                        </div>

                        <div style={{ marginBottom: '14px' }}>
                          <div style={{ fontSize: '12px', color: 'var(--muted-text)', marginBottom: '4px' }}>Chief Complaint:</div>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--main-text)' }}>
                            {selectedPatient.intake.chief_complaint}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                          <div>
                            <div style={{ fontSize: '12px', color: 'var(--muted-text)', marginBottom: '4px' }}>Reported Duration:</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--main-text)' }}>
                              {selectedPatient.intake.duration || 'Not specified'}
                            </div>
                          </div>
                        </div>

                        {selectedPatient.intake.symptoms && selectedPatient.intake.symptoms.length > 0 && (
                          <div>
                            <div style={{ fontSize: '12px', color: 'var(--muted-text)', marginBottom: '8px' }}>Individual Key Symptoms:</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {selectedPatient.intake.symptoms.map((symptom, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    backgroundColor: '#FFFFFF',
                                    color: 'var(--deep-indigo)',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    padding: '5px 12px',
                                    borderRadius: 'var(--radius-full)',
                                    border: '1px solid var(--border-subtle)',
                                  }}
                                >
                                  {symptom}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Original Verbatim Transcript */}
                      <div
                        style={{
                          padding: '18px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--main-text)', textTransform: 'uppercase' }}>
                              Original Verbatim Transcript
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--healthcare-teal)', backgroundColor: 'rgba(0, 155, 125, 0.1)', padding: '2px 8px', borderRadius: 'var(--radius-xs)' }}>
                            PROVENANCE: PATIENT_REPORTED
                          </span>
                        </div>

                        <p
                          style={{
                            fontSize: '14px',
                            color: 'var(--main-text)',
                            lineHeight: 1.6,
                            fontStyle: 'italic',
                            backgroundColor: 'var(--bg-lavender-gray)',
                            padding: '14px 16px',
                            borderRadius: 'var(--radius-sm)',
                            margin: '0 0 12px 0',
                          }}
                        >
                          "{selectedPatient.intake.raw_transcript || 'No verbal transcript recorded. Patient submitted structured criteria directly.'}"
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--muted-text)' }}>
                          <ShieldCheck size={14} style={{ color: 'var(--healthcare-teal)' }} />
                          <span>Strict Sovereignty: Raw audio recordings permanently deleted upon consultation completion.</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--muted-text)' }}>
                      <FileText size={32} style={{ margin: '0 auto 10px auto', opacity: 0.3 }} />
                      <p style={{ fontSize: '14px', margin: 0 }}>This patient checked in at reception without submitting structured symptoms.</p>
                      <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>Conduct standard direct oral intake during consultation.</p>
                    </div>
                  )}
                </div>

                {/* Patient Bounded Records Card (if revisiting and authorized) */}
                {selectedPatient.visit_type === 'REVISITING' && (
                  <div
                    style={{
                      backgroundColor: 'var(--white)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-subtle)',
                      padding: '24px',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--bg-light-blue)',
                            color: 'var(--hospital-blue)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <FileText size={18} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--main-text)', margin: 0 }}>
                            Authorized Bounded Records
                          </h3>
                          <p style={{ fontSize: '12px', color: 'var(--muted-text)', margin: '2px 0 0 0' }}>
                            Patient granted temporary access to prior clinical notes & published lab results
                          </p>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--status-normal-text)', fontWeight: 700 }}>
                        Active Session Access
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                      <div
                        style={{
                          padding: '14px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                          backgroundColor: 'var(--bg-lavender-gray)',
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--main-text)', marginBottom: '4px' }}>
                          Prior Consultation Note (14 Days Ago)
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted-text)', lineHeight: 1.5 }}>
                          Dr. Ramesh Mehta: Essential hypertension follow-up. Prescribed Amlodipine 5mg OD. Advised CBC + Serum Creatinine if headache persists.
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '14px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                          backgroundColor: 'var(--bg-lavender-gray)',
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--main-text)', marginBottom: '4px' }}>
                          Published Laboratory Report
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted-text)', lineHeight: 1.5 }}>
                          Apex Path Labs: Complete Blood Count & Renal Profile. Verified & cryptographically signed by Pathologist.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  backgroundColor: 'var(--white)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  padding: '60px 24px',
                  textAlign: 'center',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <Stethoscope size={48} style={{ color: 'var(--lavender)', margin: '0 auto 16px auto', opacity: 0.6 }} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--main-text)', marginBottom: '8px' }}>
                  No Patient Selected
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--muted-text)', maxWidth: '420px', margin: '0 auto' }}>
                  Select a patient from the queue on the left to inspect their structured intake symptoms, verbatim audio transcript, and start consultation.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
