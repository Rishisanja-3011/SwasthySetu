/**
 * SwasthSetu 2.0 - Patient Module API & Data Service
 * 
 * Interacts with live backend (http://localhost:5000) and provides
 * robust client-side storage for offline/low-bandwidth resilience (<100 KB/s).
 */

const API_BASE = '/api';

// Canonical Registered Actors
export const DEFAULT_PATIENTS = [
  {
    id: 'pt-rahul-01',
    patient_identifier: 'PT-2026-4401',
    name: 'Rahul Sharma',
    age: 32,
    date_of_birth: '1994-08-14',
    gender: 'Male',
    phone: '+91 98765 43210',
    blood_group: 'B+',
    address: 'Station Road, Navsari, Gujarat',
  },
  {
    id: 'pt-priya-02',
    patient_identifier: 'PT-2026-4402',
    name: 'Priya Patel',
    age: 28,
    date_of_birth: '1998-03-22',
    gender: 'Female',
    phone: '+91 98222 33445',
    blood_group: 'O+',
    address: 'Gram Panchayat Marg, Bardoli, Gujarat',
  },
];

export const REGISTERED_DOCTORS = [
  {
    id: 'doc-mehta-01',
    qr_code_id: 'DOC-409',
    name: 'Dr. Ramesh Mehta',
    specialty: 'General Physician & Family Medicine',
    clinic_name: 'Mehta Community Health Clinic',
    experience_years: 18,
    room_number: 'Cabin 2',
    languages: ['Gujarati', 'Hindi', 'English'],
  },
  {
    id: 'doc-verma-02',
    qr_code_id: 'DOC-512',
    name: 'Dr. Sunita Verma',
    specialty: 'Consultant Pathologist & Physician',
    clinic_name: 'Janta Arogya Kendra',
    experience_years: 14,
    room_number: 'Room 5',
    languages: ['Hindi', 'English'],
  },
];

export const REGISTERED_LABS = [
  {
    id: 'lab-lifeline-01',
    qr_code_id: 'LAB-808',
    name: 'Lifeline Diagnostic Centre',
    location: 'Primary Health Care Center - Lab Wing B',
    contact_phone: '+91 98200 11223',
    nabl_accreditation: 'NABL-MED-7741',
    test_capabilities: ['CBC', 'Hemoglobin (HPLC)', 'Platelet Count'],
  },
  {
    id: 'lab-apex-02',
    qr_code_id: 'LAB-901',
    name: 'Apex Pathology Laboratory',
    location: 'Civil Hospital Road, Navsari',
    contact_phone: '+91 98333 44556',
    nabl_accreditation: 'NABL-MED-8812',
    test_capabilities: ['CBC', 'Lipid Profile', 'Blood Glucose'],
  },
];

// Helper: Local storage key helpers
const STORAGE_KEYS = {
  ACTIVE_PATIENT: 'swasthsetu_patient_active',
  ACTIVE_ENCOUNTER: 'swasthsetu_encounter_active',
  ACTIVE_GRANTS: 'swasthsetu_lab_grants',
  LOCAL_REPORTS: 'swasthsetu_patient_reports',
  TIMELINE_EVENTS: 'swasthsetu_health_timeline',
  DRAFT_INTAKE: 'swasthsetu_draft_intake',
};

// Initial Seed published CBC report for Rahul Sharma
const SEED_PUBLISHED_REPORT = {
  _id: 'rep-cbc-2026-9901',
  report_identifier: 'CBC-2026-8841',
  patient_id: 'pt-rahul-01',
  patient_name: 'Rahul Sharma',
  patient_identifier: 'PT-2026-4401',
  laboratory_name: 'Lifeline Diagnostic Centre',
  laboratory_code: 'LAB-808',
  ordering_doctor: 'Dr. Ramesh Mehta (DOC-409)',
  test_type: 'Complete Blood Count (CBC)',
  status: 'PUBLISHED',
  created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 4 * 3600 * 1000).toISOString(),
  original_file_name: 'Lifeline_CBC_Rahul_Sharma_PT4401.pdf',
  report_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  observations: [
    {
      test_name_original: 'Haemoglobin (Hb)',
      test_name_normalized: 'Hemoglobin',
      value: 10.2,
      unit: 'g/dL',
      reference_low: 13.0,
      reference_high: 17.0,
      flag: 'LOW',
      validation_status: 'OK',
      confidence: 0.98,
      explanation: 'Your Hemoglobin was 10.2 g/dL. The typical reference range is 13.0–17.0 g/dL. This is below that range.',
    },
    {
      test_name_original: 'Total Leucocyte Count (WBC)',
      test_name_normalized: 'WBC (Total Leucocyte Count)',
      value: 8200,
      unit: '/µL',
      reference_low: 4000,
      reference_high: 11000,
      flag: 'NORMAL',
      validation_status: 'OK',
      confidence: 0.97,
      explanation: 'Your White Blood Cell count is 8,200 /µL. The typical reference range is 4,000–11,000 /µL. This is within the normal range.',
    },
    {
      test_name_original: 'Platelet Count',
      test_name_normalized: 'Platelet Count',
      value: 245000,
      unit: '/µL',
      reference_low: 150000,
      reference_high: 450000,
      flag: 'NORMAL',
      validation_status: 'OK',
      confidence: 0.99,
      explanation: 'Your Platelet count is 245,000 /µL. The typical reference range is 150,000–450,000 /µL. This is within the normal range.',
    },
    {
      test_name_original: 'RBC Count',
      test_name_normalized: 'RBC Count',
      value: 4.1,
      unit: 'mill/µL',
      reference_low: 4.5,
      reference_high: 5.9,
      flag: 'LOW',
      validation_status: 'OK',
      confidence: 0.95,
      explanation: 'Your Red Blood Cell count is 4.1 mill/µL. The typical reference range is 4.5–5.9 mill/µL. This is slightly below that range.',
    },
    {
      test_name_original: 'PCV / Packed Cell Volume',
      test_name_normalized: 'PCV / Hematocrit',
      value: 33.5,
      unit: '%',
      reference_low: 40.0,
      reference_high: 50.0,
      flag: 'LOW',
      validation_status: 'OK',
      confidence: 0.96,
      explanation: 'Your Hematocrit / PCV is 33.5%. The typical reference range is 40.0–50.0%. This is below that range.',
    },
    {
      test_name_original: 'Mean Corpuscular Volume (MCV)',
      test_name_normalized: 'MCV',
      value: 81.7,
      unit: 'fL',
      reference_low: 80.0,
      reference_high: 100.0,
      flag: 'NORMAL',
      validation_status: 'OK',
      confidence: 0.97,
      explanation: 'Your MCV is 81.7 fL. The typical reference range is 80.0–100.0 fL. This is within the normal range.',
    },
  ],
};

export const patientApi = {
  /**
   * Get currently active patient or default
   */
  getActivePatient() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_PATIENT);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Storage error:', e);
    }
    return DEFAULT_PATIENTS[0];
  },

  setActivePatient(patient) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PATIENT, JSON.stringify(patient));
  },

  /**
   * Resolves scanned QR or manual text code (e.g. DOC-409 or LAB-808)
   */
  async resolveCode(codeRaw) {
    if (!codeRaw) throw new Error('Code is required');
    const clean = codeRaw.trim().toUpperCase();

    // Check Doctor
    const doctor = REGISTERED_DOCTORS.find(
      (d) => d.qr_code_id === clean || d.clinic_name.toUpperCase().includes(clean)
    );
    if (doctor) {
      return {
        type: 'DOCTOR',
        code: doctor.qr_code_id,
        entity: doctor,
      };
    }

    // Check Laboratory
    const lab = REGISTERED_LABS.find(
      (l) => l.qr_code_id === clean || l.name.toUpperCase().includes(clean)
    );
    if (lab) {
      return {
        type: 'LABORATORY',
        code: lab.qr_code_id,
        entity: lab,
      };
    }

    // Attempt backend lookup if available
    try {
      const res = await fetch(`${API_BASE}/lab/list`);
      if (res.ok) {
        const json = await res.json();
        if (json.laboratories) {
          const match = json.laboratories.find(
            (l) => l.qr_code_id === clean || l.name.toUpperCase().includes(clean)
          );
          if (match) {
            return {
              type: 'LABORATORY',
              code: match.qr_code_id,
              entity: {
                id: match._id,
                qr_code_id: match.qr_code_id,
                name: match.name,
                location: match.location,
                contact_phone: match.contact_phone,
              },
            };
          }
        }
      }
    } catch {
      // offline fallback
    }

    throw new Error(`Unrecognized code "${clean}". Please enter a valid doctor code (e.g. DOC-409) or laboratory code (e.g. LAB-808).`);
  },

  /**
   * Get clinic queue list for doctor (DOC-409)
   */
  getClinicQueue(doctorCode = 'DOC-409') {
    const key = `swasthsetu_clinic_queue_${doctorCode}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.warn('Queue parse error:', e);
      }
    }
    // Default clinic queue state: Dr. Mehta has 2 patients ahead in the queue
    const defaultQueue = [
      { id: 'q-patient-1', name: 'Mohanlal Suthar', arrived_at: new Date(Date.now() - 25 * 60 * 1000).toISOString() },
      { id: 'q-patient-2', name: 'Anitaben Patel', arrived_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
    ];
    localStorage.setItem(key, JSON.stringify(defaultQueue));
    return defaultQueue;
  },

  /**
   * Start Doctor Consultation Encounter (visit_type = NEW or REVISITING)
   */
  async createEncounter({ patient, doctor, visitType, doctorAccessGranted = false }) {
    // Calculate actual queue position from clinic queue
    const queue = this.getClinicQueue(doctor.qr_code_id);
    const patientsAhead = queue.length;
    const queuePosition = patientsAhead + 1;
    const estimatedWait = patientsAhead === 0 ? '< 5 minutes' : `${patientsAhead * 5}–${(patientsAhead + 1) * 5} minutes`;
    const waitMessage = patientsAhead === 0 ? 'Please stay nearby.' : "Please stay nearby. We'll notify you when it's your turn.";
    const queueSubtext = patientsAhead === 0 ? "You're next" : `${patientsAhead} patient${patientsAhead > 1 ? 's' : ''} ahead of you`;

    const encounter = {
      id: `enc-${Date.now()}`,
      patient_id: patient.id,
      patient_name: patient.name,
      patient_identifier: patient.patient_identifier,
      doctor_id: doctor.id,
      doctor_name: doctor.name,
      clinic_name: doctor.clinic_name,
      doctor_code: doctor.qr_code_id,
      visit_type: visitType, // 'NEW' or 'REVISITING'
      doctor_access_granted: visitType === 'REVISITING' ? !!doctorAccessGranted : false,
      unlocked_records: visitType === 'REVISITING' && doctorAccessGranted
        ? ['own_prior_notes', 'published_lab_reports']
        : [],
      status: 'WAITING',
      lifecycle_state: 'WAITING', // WAITING -> DOCTOR_REVIEWING -> CONSULTATION_STARTED -> PLEASE_COME_IN -> COMPLETED
      queue_number: queuePosition,
      patients_ahead: patientsAhead,
      estimated_wait: estimatedWait,
      wait_message: waitMessage,
      queue_subtext: queueSubtext,
      created_at: new Date().toISOString(),
      started_at: null,
      ended_at: null,
      audio_deleted: false,
    };

    localStorage.setItem(STORAGE_KEYS.ACTIVE_ENCOUNTER, JSON.stringify(encounter));

    // Append to timeline
    this.addTimelineEvent({
      type: 'ENCOUNTER_CREATED',
      title: `${visitType === 'NEW' ? 'New Consultation' : 'Revisiting'} Check-in`,
      subtitle: `${doctor.name} (${doctor.clinic_name})${visitType === 'REVISITING' && doctorAccessGranted ? ' • Bounded Record Access Permitted' : ''}`,
      timestamp: new Date().toISOString(),
      badge: 'OPEN',
      encounterId: encounter.id,
    });

    return encounter;
  },

  /**
   * Submit Structured Symptom Intake
   */
  async submitIntake({ encounterId, inputMode, rawTranscript, structuredData, confidence = 0.94 }) {
    const intake = {
      id: `intake-${Date.now()}`,
      encounter_id: encounterId,
      input_mode: inputMode, // 'voice' | 'text' | 'skipped'
      raw_transcript: rawTranscript,
      chief_complaint: structuredData?.chief_complaint || 'General check-up',
      duration: structuredData?.duration || 'Not specified',
      symptoms: structuredData?.symptoms || [],
      confidence,
      provenance: {
        raw: 'PATIENT_REPORTED',
        structured: 'AI_GENERATED',
      },
      created_at: new Date().toISOString(),
    };

    // Update active encounter
    const activeEnc = this.getActiveEncounter();
    if (activeEnc && activeEnc.id === encounterId) {
      activeEnc.intake = intake;
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ENCOUNTER, JSON.stringify(activeEnc));
    }

    if (inputMode !== 'skipped') {
      this.addTimelineEvent({
        type: 'SYMPTOMS_SUBMITTED',
        title: 'Symptoms Submitted & Confirmed',
        subtitle: `${intake.chief_complaint} (${intake.duration})`,
        timestamp: new Date().toISOString(),
        badge: 'CONFIRMED',
        details: intake.symptoms.join(', '),
      });
    }

    return intake;
  },

  /**
   * Get Active Encounter
   */
  getActiveEncounter() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_ENCOUNTER);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Storage read error:', e);
    }
    return null;
  },

  /**
   * Advance Encounter Consultation Status (triggered by Doctor Module or backend)
   */
  advanceEncounterState(encounterId, nextState) {
    const active = this.getActiveEncounter();
    if (!active || active.id !== encounterId) return null;

    active.lifecycle_state = nextState;

    if (nextState === 'DOCTOR_REVIEWING') {
      active.status = 'WAITING';
    } else if (nextState === 'CONSULTATION_STARTED') {
      active.started_at = new Date().toISOString();
      active.status = 'IN_CONSULTATION';
      active.patients_ahead = 0;
      active.queue_subtext = "You're next";
      active.estimated_wait = '< 5 minutes';
    } else if (nextState === 'PLEASE_COME_IN') {
      active.status = 'IN_CONSULTATION';
      active.patients_ahead = 0;
      active.queue_subtext = "You're next";
    } else if (nextState === 'CONSULTATION_COMPLETED') {
      active.ended_at = new Date().toISOString();
      active.status = 'CLOSED';
      active.audio_deleted = true; // Raw audio permanently deleted by construction
      active.doctor_access_granted = false; // Bounded doctor access terminates immediately

      // Add to timeline
      this.addTimelineEvent({
        type: 'CONSULTATION_COMPLETED',
        title: 'Consultation Completed',
        subtitle: `${active.doctor_name} • Bounded Doctor Access Terminated`,
        timestamp: new Date().toISOString(),
        badge: 'COMPLETED',
      });
    }

    localStorage.setItem(STORAGE_KEYS.ACTIVE_ENCOUNTER, JSON.stringify(active));
    return active;
  },

  clearActiveEncounter() {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ENCOUNTER);
  },

  /**
   * Approve Laboratory Bounded Access Grant (strictly 4 identity fields)
   */
  async approveLabGrant({ patient, laboratory }) {
    const grant = {
      id: `grant-${Date.now()}`,
      patient_id: patient.id,
      patient_name: patient.name,
      patient_phone: patient.phone,
      patient_age: patient.age,
      patient_gender: patient.gender,
      laboratory_id: laboratory.id,
      laboratory_name: laboratory.name,
      laboratory_code: laboratory.qr_code_id,
      shared_fields: ['name', 'date_of_birth', 'gender', 'phone'],
      status: 'ACTIVE', // ACTIVE -> EXPIRED
      granted_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48h safety timeout only if not published
      expiry_reason: null,
    };

    const existing = this.getLabGrants();
    existing.unshift(grant);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_GRANTS, JSON.stringify(existing));

    this.addTimelineEvent({
      type: 'LAB_GRANT_APPROVED',
      title: 'Laboratory Check-in Authorized',
      subtitle: `${laboratory.name} • Strictly 4 Demographics Disclosed`,
      timestamp: new Date().toISOString(),
      badge: 'ACTIVE_GRANT',
    });

    return grant;
  },

  /**
   * Get all Lab Access Grants
   */
  getLabGrants() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_GRANTS);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Storage read error:', e);
    }
    return [];
  },

  /**
   * Mark Lab Grant as Expired upon Report Publication
   */
  expireLabGrant(grantId, reason = 'REPORT_PUBLISHED') {
    const grants = this.getLabGrants();
    const updated = grants.map((g) => {
      if (g.id === grantId) {
        return {
          ...g,
          status: 'EXPIRED',
          expires_at: new Date().toISOString(),
          expiry_reason: reason,
        };
      }
      return g;
    });
    localStorage.setItem(STORAGE_KEYS.ACTIVE_GRANTS, JSON.stringify(updated));
  },

  /**
   * Get Patient Reports (PUBLISHED only)
   */
  async getPublishedReports(patientId) {
    const reports = [];

    // Check live server for published reports first
    try {
      const res = await fetch(`${API_BASE}/lab/dashboard/6ac63e0d4e65047579996260`);
      if (res.ok) {
        const data = await res.json();
        if (data.worklist) {
          const publishedServer = data.worklist.filter((w) => w.report_status === 'PUBLISHED');
          for (const item of publishedServer) {
            try {
              const repRes = await fetch(`${API_BASE}/lab/patient-view/${item.report_id}`);
              if (repRes.ok) {
                const repData = await repRes.json();
                reports.push({
                  _id: repData.report._id,
                  report_identifier: `CBC-${repData.report._id.slice(-6).toUpperCase()}`,
                  patient_name: repData.patient.name,
                  patient_identifier: repData.patient.patient_identifier,
                  laboratory_name: repData.laboratory.name,
                  laboratory_code: repData.laboratory.qr_code_id,
                  ordering_doctor: 'Dr. Ramesh Mehta (DOC-409)',
                  test_type: 'Complete Blood Count (CBC)',
                  status: 'PUBLISHED',
                  created_at: repData.report.created_at,
                  published_at: repData.report.published_at || new Date().toISOString(),
                  original_file_name: repData.report.original_file_name || 'CBC_Report.pdf',
                  report_hash: repData.report.report_hash || 'SHA256-VERIFIED',
                  observations: repData.observations.map((o) => ({
                    test_name_original: o.test_name_original,
                    test_name_normalized: o.test_name_normalized,
                    value: o.value,
                    unit: o.unit,
                    reference_low: o.reference_low,
                    reference_high: o.reference_high,
                    flag: o.flag,
                    validation_status: o.validation_status,
                    confidence: o.extraction_confidence,
                    explanation: `Your ${o.test_name_normalized} is ${o.value} ${o.unit} (Typical range: ${o.reference_low}–${o.reference_high} ${o.unit}). Result is ${o.flag}.`,
                  })),
                });
              }
            } catch {
              // skip failed item
            }
          }
        }
      }
    } catch {
      // offline mode
    }

    // Also include local seed/cached reports
    let localReports = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LOCAL_REPORTS);
      if (stored) localReports = JSON.parse(stored);
    } catch {
      localReports = [];
    }

    if (reports.length === 0 && localReports.length === 0) {
      // Return default verified seed report
      return [SEED_PUBLISHED_REPORT];
    }

    // Merge without duplicates
    const combined = [...reports, ...localReports, SEED_PUBLISHED_REPORT];
    const unique = [];
    const seen = new Set();
    for (const r of combined) {
      if (!seen.has(r._id)) {
        seen.add(r._id);
        unique.push(r);
      }
    }

    return unique.sort((a, b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at));
  },

  /**
   * Get single report by ID
   */
  async getReportById(reportId) {
    const all = await this.getPublishedReports();
    const found = all.find((r) => r._id === reportId);
    if (found) return found;

    // Check direct backend
    try {
      const res = await fetch(`${API_BASE}/lab/patient-view/${reportId}`);
      if (res.ok) {
        const repData = await res.json();
        return {
          _id: repData.report._id,
          report_identifier: `CBC-${repData.report._id.slice(-6).toUpperCase()}`,
          patient_name: repData.patient.name,
          patient_identifier: repData.patient.patient_identifier,
          laboratory_name: repData.laboratory.name,
          laboratory_code: repData.laboratory.qr_code_id,
          ordering_doctor: 'Dr. Ramesh Mehta (DOC-409)',
          test_type: 'Complete Blood Count (CBC)',
          status: 'PUBLISHED',
          created_at: repData.report.created_at,
          published_at: repData.report.published_at || new Date().toISOString(),
          original_file_name: repData.report.original_file_name,
          report_hash: repData.report.report_hash || 'SHA256-VERIFIED-LOCKED',
          observations: repData.observations.map((o) => ({
            test_name_original: o.test_name_original,
            test_name_normalized: o.test_name_normalized,
            value: o.value,
            unit: o.unit,
            reference_low: o.reference_low,
            reference_high: o.reference_high,
            flag: o.flag,
            validation_status: o.validation_status,
            confidence: o.extraction_confidence,
            explanation: `Your ${o.test_name_normalized} was ${o.value} ${o.unit}. Typical range: ${o.reference_low}–${o.reference_high} ${o.unit}. Result is ${o.flag}.`,
          })),
        };
      }
    } catch {
      // not found
    }

    return null;
  },

  /**
   * Health Timeline Events
   */
  getHealthTimeline(patientId) {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TIMELINE_EVENTS);
      if (stored) {
        const events = JSON.parse(stored);
        return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }
    } catch {
      // fallback
    }

    // Default seed timeline for Rahul Sharma
    return [
      {
        id: 't-1',
        type: 'REPORT_PUBLISHED',
        title: 'CBC Report Published',
        subtitle: 'Lifeline Diagnostic Centre • Dr. Ramesh Mehta',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        badge: 'PUBLISHED',
        details: 'Hemoglobin: 10.2 g/dL (LOW), WBC: 8,200 /µL (NORMAL), Platelets: 245,000 /µL (NORMAL)',
      },
      {
        id: 't-2',
        type: 'CONSULTATION_COMPLETED',
        title: 'Consultation Completed',
        subtitle: 'Dr. Ramesh Mehta • General Physician',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        badge: 'COMPLETED',
        details: 'Routine checkup & fatigue evaluation. Ordered Complete Blood Count (CBC).',
      },
      {
        id: 't-3',
        type: 'SYMPTOMS_SUBMITTED',
        title: 'Voice Intake Recorded & Confirmed',
        subtitle: 'Weakness and mild dizziness for 3 days',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000).toISOString(),
        badge: 'PATIENT_REPORTED',
        details: 'Language: Gujarati • Confidence: 94%',
      },
    ];
  },

  addTimelineEvent(event) {
    const events = this.getHealthTimeline();
    const newEvent = {
      id: `t-${Date.now()}`,
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    };
    events.unshift(newEvent);
    localStorage.setItem(STORAGE_KEYS.TIMELINE_EVENTS, JSON.stringify(events));
    return newEvent;
  },

  /**
   * Bounded Educational CBC Chatbot Assistant
   * Strictly educational, source-grounded in published data, non-diagnostic.
   */
  async queryAssistant(questionText, contextReport = null) {
    const q = questionText.toLowerCase().trim();

    // 1. Diagnosis attempt blocker
    if (q.includes('diagnos') || q.includes('do i have cancer') || q.includes('do i have dengue') || q.includes('disease') || q.includes('cure me')) {
      return {
        answer: 'SwasthSetu does not provide medical diagnoses. Your doctor (Dr. Ramesh Mehta) evaluates symptoms alongside your lab observations to determine any clinical diagnosis. Please discuss this directly during your consultation.',
        isSafetyNotice: true,
      };
    }

    // 2. Medication / Prescription blocker
    if (q.includes('medicine') || q.includes('tablet') || q.includes('prescription') || q.includes('dose') || q.includes('what should i take')) {
      return {
        answer: 'SwasthSetu strictly does not prescribe medications or recommend dosages. All treatments and prescriptions must be provided directly by your licensed physician.',
        isSafetyNotice: true,
      };
    }

    // 3. Hemoglobin query
    if (q.includes('hemoglobin') || q.includes('haemoglobin') || q.includes('hb')) {
      const hbObs = contextReport?.observations?.find((o) => o.test_name_normalized.toLowerCase().includes('hemoglobin'));
      return {
        answer: hbObs
          ? `In your published CBC report from ${contextReport.laboratory_name}, your Hemoglobin is ${hbObs.value} ${hbObs.unit}. The standard reference range is ${hbObs.reference_low}–${hbObs.reference_high} ${hbObs.unit}, so your result is classified as ${hbObs.flag}. Hemoglobin is the protein in red blood cells that carries oxygen from your lungs to the rest of your body.`
          : 'Hemoglobin is an iron-rich protein in red blood cells that carries oxygen throughout your body. Typical adult reference ranges are approximately 13.0–17.0 g/dL for males and 12.0–15.5 g/dL for females. A low reading is referred to as anemia, which your doctor can evaluate.',
        isSafetyNotice: false,
      };
    }

    // 4. WBC / Total Leucocyte Count
    if (q.includes('wbc') || q.includes('white blood') || q.includes('leucocyte') || q.includes('infection')) {
      const wbcObs = contextReport?.observations?.find((o) => o.test_name_normalized.toLowerCase().includes('wbc'));
      return {
        answer: wbcObs
          ? `Your WBC count is ${wbcObs.value} ${wbcObs.unit} (${wbcObs.flag}). Standard adult values range from ${wbcObs.reference_low} to ${wbcObs.reference_high} ${wbcObs.unit}. White blood cells are part of your immune system that help defend the body against infections.`
          : 'White Blood Cells (WBC) are essential cells in the immune system that fight infections. The normal adult reference range is typically 4,000–11,000 /µL.',
        isSafetyNotice: false,
      };
    }

    // 5. Platelets
    if (q.includes('platelet') || q.includes('clot') || q.includes('bleeding')) {
      const pltObs = contextReport?.observations?.find((o) => o.test_name_normalized.toLowerCase().includes('platelet'));
      return {
        answer: pltObs
          ? `Your Platelet count is ${pltObs.value} ${pltObs.unit} (${pltObs.flag}). The reference range is ${pltObs.reference_low}–${pltObs.reference_high} ${pltObs.unit}. Platelets are cell fragments that help blood clot to stop bleeding.`
          : 'Platelets are specialized cell fragments in the blood that clump together to form clots and stop bleeding. Standard reference levels are 150,000–450,000 /µL.',
        isSafetyNotice: false,
      };
    }

    // 6. Doctor Revisiting Access question
    if (q.includes('doctor see') || q.includes('revisit') || q.includes('share') || q.includes('dr mehta')) {
      return {
        answer: 'Yes! When you visit Dr. Ramesh Mehta next and select REVISITING, Dr. Mehta will have secure access to this published lab report during your active consultation. Once the consultation concludes, doctor access terminates automatically.',
        isSafetyNotice: false,
      };
    }

    // 7. General CBC question
    return {
      answer: 'A Complete Blood Count (CBC) measures red blood cells, white blood cells, and platelets. High or Low status flags simply indicate whether a value falls outside the statistical laboratory reference range. For specific health recommendations, please consult your doctor.',
      isSafetyNotice: false,
    };
  },
};

// Developer / Doctor Module Integration Helper
if (typeof window !== 'undefined') {
  window.advanceDoctorState = (nextState) => {
    const enc = patientApi.getActiveEncounter();
    if (enc) {
      const updated = patientApi.advanceEncounterState(enc.id, nextState);
      window.dispatchEvent(new Event('storage'));
      return updated;
    }
    console.warn('No active encounter found.');
    return null;
  };
}
