# SwasthSetu 2.0: Master Product Blueprint & Implementation Plan (`plan.md`)

---

## 1. Executive Summary & The Core "Why"

### 🌍 Real-World Problem in Rural & Community Healthcare
In village and semi-urban settings, healthcare access suffers from systemic, human-centric friction:
1. **The Language & Expression Barrier:** 
   - Rural patients speak local/regional dialects (Hindi, Gujarati, Marathi, Tamil, Telugu, Bengali, etc.). They find it intimidating and near-impossible to describe their complex symptoms on English forms or medical checklists.
   - When visiting a doctor, they struggle to articulate medical terminology, onset timelines, and secondary complaints clearly.
2. **Illiteracy & Tech Intimidation:**
   - Village residents cannot navigate complex app-store installations, password setups, multi-factor logins, or heavy UIs.
   - Any solution that demands prior digital literacy or English proficiency fails in rural clinics.
3. **Severe Network Drops & Low Bandwidth:**
   - Rural clinics frequently experience 2G/3G connectivity drops or dead zones.
   - If a patient records their symptoms or enters data and the connection drops, traditional apps lose the data, forcing frustrating restarts.
4. **Scattered, Perishable Physical Lab Reports:**
   - Patients visit disparate diagnostic labs (Lab A today, Lab B six months later). Each lab maintains its own isolated numbering system.
   - Patients carry fragile paper reports across long distances. Reports get torn, lost, or forgotten at home, leaving doctors blind to past diagnostic trends.
5. **The Privacy Dilemma:**
   - Patients deserve strong data privacy, but manual consent systems (toggles, revocation dashboards, scope pickers) are confusing and unused.
   - SwasthSetu resolves this through **Bounded Access**: access to patient data exists *only* while a consultation is open or until a lab report is published, self-expiring with **zero manual revoke steps**.

---

## 2. Patient Discovery & Access Journey (Zero-Friction Architecture)

### 📲 How Patients Reach & Use the System (No App Store Download)
1. **Lightweight Web App / PWA:** No heavy Android APK or iOS app download is required.
2. **Instant QR Scanning via Google Lens / Camera:**
   - Every doctor's clinic and diagnostic lab displays a clear, printed counter standee/poster with:
     1. A large **QR Code**.
     2. A human-readable 4-to-6 character **Fallback Code** (e.g., `DOC-409` or `LAB-102`) for low-resolution phone cameras or damaged posters.
   - Pointing any smartphone camera or Google Lens at the poster instantly opens the web page (`https://swasthsetu.health/scan/DOC-409` or `/scan/LAB-102`).
3. **Manual Code Entry on Home Page:**
   - Patients visiting the main URL (`swasthsetu.health`) have a prominent "Enter Clinic / Lab Code" input box as a zero-camera fallback.

### 👤 Patient Registration & Identity Resolution
* **New Patient (First Visit):**
  - Enters minimal basic info: **Full Name**, **Age/DOB**, **Gender**, and **Mobile Number**.
  - The system instantly generates a canonical, universal **Patient ID** (e.g., `PX123456`).
* **Returning Patient:**
  - Enters their mobile number (or browser remember-me token) to retrieve their unified health profile.

---

## 3. End-to-End User Workflows

```
                                  [ PATIENT SCANS QR / ENTERS CODE ]
                                                  │
                      ┌───────────────────────────┴───────────────────────────┐
                      ▼                                                       ▼
            [ DOCTOR CLINIC QR ]                                      [ LABORATORY QR ]
                      │                                                       │
         Confirm Doctor Identity                                  One-Tap Permission Popup
                      │                                        ("Allow Lab to read Name, Age,
         Choose Visit Type:                                        Gender, Phone for test?")
     ┌────────────────┴────────────────┐                                      │
     ▼                                 ▼                                      ▼
[ NEW VISIT ]                   [ REVISITING ]                   [ LabAccessGrant Created ]
(Voice Intake Mandatory)        (Voice Intake Optional)            (Status: ACTIVE, 48h limit)
     │                                 │                                      │
     └────────────────┬────────────────┘                         Lab Conducts Test & Uploads PDF
                      ▼                                                       │
        [ MULTILINGUAL VOICE INTAKE ]                           [ Extraction & AI Pipeline ]
     (Speak in Hindi/Guj/Tamil/etc.)                            (CBC Text/OCR -> Normalization
                      │                                           -> Mayo Reference Validation)
       Speech-to-Text & Language ID                                           │
                      │                                         [ Lab Reviews & Publishes ]
     Structured Clinical Extraction:                                          │
       • Chief Complaint                                        ┌─────────────┴─────────────┐
       • Duration                                               ▼                           ▼
       • Associated Symptoms                       [ Lab Access EXPIRES ]        [ Patient & Doctor ]
                      │                            (Self-expiring by design)      (View findings &
       [ Low-Bandwidth Queueing ]                                                 download original
       (Saved offline in IndexedDB;                                                    PDF)
       auto-syncs on reconnect)
                      │
           Patient Enters Doctor
               Waiting Queue
                      │
            [ DOCTOR COCKPIT ]
    (Encounter = OPEN -> Sees intake
     + Past notes + All lab reports)
                      │
             Doctor Consults,
            Notes, Orders Tests
                      │
        [ END CONSULTATION CLICKED ]
                      │
           Encounter = CLOSED:
       • Raw audio deleted forever
       • Structured intake kept
       • Doctor history access locks
```

---

### A. Patient–Doctor Encounter Flow
1. **Scan & Confirm:** Patient scans `DOC-409` -> App confirms *"Dr. Mehta's Clinic — Confirm?"*.
2. **Visit Type Choice:**
   - **New Consultation (नया परामर्श):** Fresh medical complaint; voice/text symptom intake is required.
   - **Revisiting (दोबारा परामर्श / फॉलो-अप):** Follow-up encounter; symptom intake is optional (e.g. if returning just to discuss recent blood work).
3. **Multilingual Voice Intake:**
   - The patient taps one large microphone button: *"अपनी भाषा में बोलें (Speak your problem in your language)"*.
   - Example speech: *"Mane tran divas thi khubaj kamjori lage chhe ane chakkar pan aave chhe"* (Gujarati).
   - Audio is transcribed with automatic language identification.
   - LLM structured extraction parses:
     - `Chief Complaint`: Weakness (कमजोरी / નબળાઈ)
     - `Duration`: 3 days (3 दिन)
     - `Associated Symptoms`: Dizziness (चक्कर / ચક્કર)
   - Visual summary card allows the patient to review and make simple corrections.
4. **Offline & Low-Bandwidth Resilience:**
   - If internet connectivity drops during recording or submission, the payload is cached locally in browser **IndexedDB**.
   - Clear visual reassurance is shown: *"नेटवर्क कम है - आपकी जानकारी सुरक्षित है और कनेक्ट होते ही डॉक्टर को भेज दी जाएगी (Saved offline — Auto-syncing when connected)"*.
   - A background sync mechanism submits the intake the moment connectivity resumes.
5. **Queue Assignment:** Patient is issued a digital token in Dr. Mehta's queue.

---

### B. Doctor Clinical Cockpit Flow
1. **Worklist Queue:** Dr. Mehta sees waiting patients tagged `NEW` or `REVISITING`.
2. **Open Consultation (Session-Bound Access):**
   - Dr. Mehta clicks on Rahul (`PX123456`) -> Encounter status becomes `OPEN`.
   - **What Dr. Mehta sees immediately:**
     - Today's structured intake (with a clickable source-link to the original regional transcript).
     - **If `REVISITING`:** All past consultation notes *Dr. Mehta personally authored* for Rahul + *All published lab reports* from any laboratory Rahul has visited.
     - **If `NEW`:** Strictly today's intake only.
3. **Consultation & Diagnostic Orders:**
   - Dr. Mehta records consultation notes.
   - Dr. Mehta can create a digital diagnostic order (e.g., `CBC Test`).
4. **End Consultation:**
   - Dr. Mehta clicks **"End Consultation"** -> Encounter status becomes `CLOSED`.
   - **Instant Server-Side Lock:** Dr. Mehta's screen clears Rahul's history; no cached patient data remains queryable.
   - **Privacy Cleanup:** Raw transient voice audio is deleted permanently; structured intake text and doctor notes are retained in the encounter archive.

---

### C. Patient–Laboratory Flow
1. **Scan & Minimal Identity Grant:**
   - Patient visits ABC Diagnostics and scans `LAB-102`.
   - One-tap popup appears: *"ABC Diagnostics requests your Name, Age, Gender, and Phone to generate your report. Allow?"*.
   - Patient taps **"Allow"** -> A `LabAccessGrant` (`ACTIVE`) is established.
2. **Test & Report Processing:**
   - Lab draws sample, performs the test, and uploads the standard PDF report (digital or scanned).
   - The platform's Clinical Pipeline parses test values, normalizes aliases (e.g., `Hb` / `Hgb` -> `hemoglobin`), and runs validation against Mayo reference intervals.
   - High-confidence values are flagged `NORMAL`, `HIGH`, or `LOW`. Implausible or ambiguous values are flagged `NEEDS_REVIEW`.
3. **Lab Sign-off & Publication:**
   - The lab operator reviews flagged values on their dashboard, corrects any discrepancies, and clicks **Publish**.
4. **Publish-Bound Access Expiry:**
   - The instant `DiagnosticReport.status = PUBLISHED`, the `LabAccessGrant` transitions to `EXPIRED`.
   - The lab loses access to the patient's identity fields immediately without any manual revocation step.
   - Patient is notified and can view simplified findings and download the original, unmodified lab PDF.

---

## 4. Technical Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js 14 / React)                       │
│                                                                             │
│  ┌─────────────────────────┐  ┌───────────────────────┐  ┌────────────────┐ │
│  │   Home & Scan Portal    │  │    Doctor Cockpit     │  │ Lab Dashboard  │ │
│  │ (Code Input / QR Scan)  │  │ (Live Queue, Cockpit) │  │ (Upload, Review│ │
│  └────────────┬────────────┘  └───────────────────────┘  └────────────────┘ │
│               │                                                             │
│    [ Offline Queue Engine: IndexedDB + Service Worker Background Sync ]     │
└───────────────┼─────────────────────────────────────────────────────────────┘
                │ HTTP REST / WebSockets / Multipart Form
┌───────────────▼─────────────────────────────────────────────────────────────┐
│                          BACKEND (FastAPI - Python)                         │
│                                                                             │
│  ┌────────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐ │
│  │   Auth & User Engine   │  │ Bounded Access Guard  │  │ Multilingual ASR│ │
│  │ (Doctor, Lab, Patient) │  │ (Session & Pub Bound) │  │  & LLM Extractor│ │
│  └────────────────────────┘  └───────────────────────┘  └─────────────────┘ │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │         Existing Clinical Extraction & Knowledge Reasoning Pipeline    │ │
│  │  (PDF Text/Vision OCR -> Parser -> Normalizer -> Reference -> Engine)  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │           Relational Database (SQLAlchemy + SQLite / PostgreSQL)       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Database Schema & Data Models

| Model | Key Fields | Purpose & Access Boundary |
|---|---|---|
| `users` | `id, role (patient, doctor, lab), phone, created_at` | Central identity management |
| `patients` | `id, user_id, patient_id (PX123456), name, dob, gender, phone` | Universal patient profile owned by the patient |
| `doctors` | `id, user_id, name, specialty, clinic_code, qr_code_url` | Doctor metadata & clinic identification code |
| `laboratories` | `id, name, lab_code, qr_code_url, approval_status` | Lab metadata & facility identification code |
| `encounters` | `id, patient_id, doctor_id, visit_type (NEW/REVISITING), status (OPEN/CLOSED)` | Enforces Doctor Session-Bound access |
| `symptom_intakes` | `id, encounter_id, input_mode (voice/text), transcript, structured_data (JSON)` | Retains clinical symptom extraction; audio deleted on close |
| `consultation_notes`| `id, encounter_id, doctor_id, patient_id, notes_text, created_at` | Visible **only** to authoring doctor on future revisiting visits |
| `diagnostic_orders`| `id, encounter_id, patient_id, doctor_id, test_type, status` | Doctor test requests (e.g., CBC) |
| `lab_access_grants`| `id, patient_id, lab_id, status (ACTIVE/EXPIRED), expires_at` | Layer B per-visit grant; expires automatically upon report publication |
| `diagnostic_reports`| `id, patient_id, lab_id, status (UPLOADED/NEEDS_REVIEW/PUBLISHED)` | Stores original PDF & overall publication status |
| `lab_observations` | `id, report_id, test_name_normalized, value, unit, flag (NORMAL/HIGH/LOW)` | Structured test results with Mayo reference validation |
| `audit_events` | `id, actor_type, actor_id, action, resource_id, patient_id, timestamp` | Full traceability for identity lookups, uploads, and views |

---

## 6. Implementation Milestones

### Phase 1: Backend Foundation & Access Model Enforcement
1. Initialize FastAPI backend structure with SQLite/PostgreSQL and SQLAlchemy models.
2. Implement **Bounded Access Middleware**:
   - Verify that doctor access is rejected server-side if `encounter.status != OPEN`.
   - Verify that lab identity queries are rejected once `lab_access_grant.status == EXPIRED`.
3. Build Authentication & QR Code / Fallback Code generation endpoints for Doctors and Labs.

### Phase 2: Multilingual Voice Intake & Offline Queue
1. Build speech-to-text integration with automatic language detection (Hindi, Gujarati, Tamil, etc.).
2. Implement JSON-schema constrained LLM extraction for symptoms, duration, and chief complaints.
3. Build browser-side IndexedDB offline queue and Service Worker sync for low-bandwidth environments.

### Phase 3: Lab Pipeline Integration & Review Screen
1. Connect existing `clinical_pipeline.py` (PDF extraction, OCR, Mayo references, pattern scoring) to `/api/lab/upload`.
2. Build Lab Review & Edit UI with high/low flags and `NEEDS_REVIEW` approval gates.
3. Implement one-click Publish endpoint with automatic grant expiry.

### Phase 4: Frontend UI Portals & Clinical Cockpit
1. **Home Page (`/`):** Code entry box, QR scanner trigger, and Doctor/Lab login portals.
2. **Doctor Portal (`/doctor`):** Printable QR standee generator, live waiting queue, and Clinical Cockpit.
3. **Lab Portal (`/lab`):** Printable QR standee generator, patient verification, PDF dropzone, and review table.
4. **Patient Portal (`/scan/[code]` & `/patient`):** Voice intake screen, offline sync banner, consent popup, and report viewer.

### Phase 5: End-to-End Testing & Verification
1. Test complete flow with sample regional voice inputs and CBC lab PDFs.
2. Verify offline recording simulation (`navigator.onLine = false`) and automatic reconnection sync.
3. Validate zero lingering data access after "End Consultation" and "Publish Report".
