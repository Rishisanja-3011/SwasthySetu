# SwasthSetu 2.0
## Final Product Workflow and System Specification

**Status:** Final source of truth for the current product scope  
**Document type:** Standalone product and workflow specification  
**Audience:** Product, design, frontend, backend, AI/ML, and demonstration teams

> This file is self-contained. The product workflow, access rules, login process, laboratory flow, doctor flow, and current scope are defined here.

---

## 1. Product definition

SwasthSetu is a patient-centered healthcare platform that connects patients, doctors, and diagnostic laboratories through one central patient record.

The patient receives one platform identity, such as `PX123456`. Published blood reports from different laboratories are connected to this patient identity. Doctors can view the patient's published reports during a consultation, while laboratories can access only the identity information required to prepare and publish a report.

The platform has two main capabilities:

1. **Patient symptom intake:** The patient can speak or type their symptoms/health complaint. The platform converts the input into a structured summary that the patient reviews before submitting it to the doctor.
2. **Blood-report processing:** A laboratory uploads a digital CBC PDF. The platform extracts and validates the values, the laboratory reviews the result, and the published report becomes available to the patient and doctor.

The main privacy principle is:

> The patient keeps the health record, but doctors and laboratories receive only the access required for their current workflow.

---

## 2. Problems the platform solves

| Problem | Platform solution |
|---|---|
| Patients may struggle to explain health problems in English or formal medical forms | Patients can speak or type in their own language and review the structured result |
| Patients carry paper reports between different laboratories and doctors | Published reports are connected to one patient record |
| Patients may not be comfortable with complicated registration | QR scanning, mobile OTP login, and simple patient workflows |
| A laboratory should not see a patient's complete medical history | A laboratory receives only four identity fields required for the visit |
| Doctors need reports without making the patient collect and send every file | All published reports are available to the doctor during the patient's doctor workflow |
| Extracted PDF values can be incorrect | Values are checked and flagged for laboratory review before publication |
| Access can remain open after a task is complete | Doctor access ends when the consultation ends; lab access ends when the report is published |

---

## 3. Product principles

### 3.1 One patient, one platform identity

Each patient has one platform Patient ID. The Patient ID belongs to the platform record, not to a specific laboratory.

Example:

```text
Patient ID: PX123456
Name: Rahul Sharma
Date of birth: 12-05-1995
Gender: Male
Phone: verified mobile number
```

Laboratories may have their own internal patient IDs, but the platform uses the platform Patient ID to connect published reports to the same patient.

### 3.2 QR codes identify providers

A QR code identifies a doctor or laboratory. A QR code does not authenticate the patient and does not provide access to patient history by itself.

Patient identity is confirmed through mobile OTP login and the patient's active authenticated session.

### 3.3 Patients do not select individual reports

The patient does not need to choose, upload, forward, or manually send individual reports to a doctor.

After the patient completes the required login and doctor workflow, all published reports belonging to that patient are available to the doctor.

### 3.4 Published reports only

Reports that are still uploading, processing, or waiting for laboratory review are not shared as completed reports. Only reports with `PUBLISHED` status are included in the patient's published report history and doctor view.

### 3.5 Original reports are preserved

The original laboratory PDF is stored without modification. Structured values and explanations are additional platform information; they do not replace the laboratory's official PDF.

---

## 4. Roles and responsibilities

There are three product roles.

| Role | Responsibilities | Access |
|---|---|---|
| **Patient** | Creates or opens their account, starts visits, provides symptoms/health complaint, gives laboratory permission, and views their record | Full access to their own patient record |
| **Doctor** | Opens a patient consultation, views permitted information, writes notes, and optionally orders a test | Patient's current consultation information and all published reports available during the active doctor workflow |
| **Laboratory** | Verifies the patient identity fields, performs a test, uploads the original PDF, reviews extracted values, and publishes the report | Only the four identity fields approved for the current laboratory visit and the laboratory's own report workflow |

Laboratory onboarding is a backend/platform operation. A laboratory must be registered as an approved platform laboratory before its QR and operator workflow can be used.

The patient, doctor, and laboratory dashboards are separate role-based areas. A patient never logs into the doctor dashboard or laboratory operator dashboard.

---

## 5. Patient authentication and login workflow

### 5.1 Authentication method

The patient logs in with:

```text
Verified mobile number → One-Time Password (OTP) → Patient session
```

The OTP verifies that the person using the phone is connected to that patient account.

The QR code identifies the provider, while the OTP identifies the patient.

### 5.2 Patient opens the website without scanning a QR

```text
Patient opens the website
        ↓
Is the patient session active?
        ├── Yes → Open Patient Home
        └── No  → Open Patient Login
```

After OTP verification:

```text
Does the verified mobile number match an existing patient?
        ├── Yes → Open that patient's existing account and history
        └── No  → Complete patient registration and create a new Patient ID
```

The patient home page provides:

- Scan Doctor/Laboratory QR
- Enter Doctor/Laboratory code
- View published reports
- Open report details
- Download original PDFs
- View the health timeline

### 5.3 New patient registration

A new patient provides the information required to create the central patient record:

- Full name
- Date of birth or age
- Gender
- Verified mobile number

The platform creates one Patient ID and associates it with the verified patient account.

### 5.4 Patient scans a QR before login

If a logged-out patient scans a QR, the system must preserve the QR destination while login is completed.

```text
Patient scans provider QR
        ↓
System identifies the QR as Doctor or Laboratory
        ↓
System temporarily stores the pending provider visit
        ↓
Patient is sent to mobile OTP login
        ↓
Existing patient is loaded or new patient registration is completed
        ↓
System resumes the saved provider workflow
```

The patient must not scan the QR a second time after login.

Example:

```text
Scan DOC-409
        ↓
OTP login
        ↓
Return to Dr. Mehta's confirmation screen
```

### 5.5 Patient scans a QR while already logged in

If the patient has an active session:

```text
Patient scans QR
        ↓
System verifies the active patient session
        ↓
No new OTP is required
        ↓
The correct provider workflow opens immediately
```

If the session has expired, the patient must complete OTP login again. The QR destination must remain saved during that login.

### 5.6 Authentication security rules

- A QR code alone must never reveal patient history.
- A Patient ID alone must never be treated as an access credential.
- Patient history must be loaded only after successful authentication.
- The pending QR destination must be short-lived and tied to the current login attempt.
- A QR destination must be validated as a registered doctor or laboratory before the workflow begins.
- A patient must not be able to use a patient session to access doctor or laboratory operator screens.

---

## 6. Provider QR routing

After authentication, the system checks the QR type.

| QR type | Patient destination |
|---|---|
| Doctor QR | Doctor confirmation and consultation workflow |
| Laboratory QR | Laboratory identity-permission workflow |
| Invalid or unknown QR | Error message and retry option |
| No QR | Patient Home with scan/code-entry option |

The patient is routed to a provider-specific patient workflow, not to the provider's operator dashboard.

### Example provider routes

```text
/scan/doctor/DOC-409
/scan/lab/LAB-102
```

The route identifies the provider. The authenticated patient session identifies the patient.

---

## 7. Complete patient–doctor workflow

### 7.1 Doctor QR scan

```text
Patient scans doctor QR
        ↓
System verifies patient session
        ↓
System verifies doctor QR
        ↓
Patient sees doctor name and clinic information
        ↓
Patient confirms the doctor
        ↓
Patient selects New Consultation or Revisiting
```

The patient's OTP login, doctor confirmation, and selected visit type together authorize the doctor workflow. There is no additional doctor consent popup.

### 7.2 Visit type selection

The patient must manually select one of:

- **New Consultation**
- **Revisiting**

The system does not automatically select Revisiting. Automatic preselection is not part of the current version.

### 7.3 New Consultation

```text
Patient selects New Consultation
        ↓
Patient enters symptoms/health complaint
        ↓
Voice or text is processed
        ↓
Patient reviews and confirms the structured intake
        ↓
Encounter becomes OPEN
        ↓
Patient joins the doctor's queue
```

During a New Consultation, the doctor can see:

- The current patient-confirmed symptoms/health complaint
- All published reports belonging to the patient

During a New Consultation, the doctor cannot see previous consultation notes.

The patient does not need to select which reports to share. All published reports are supplied automatically as part of the doctor workflow.

### 7.4 Revisiting

```text
Patient selects Revisiting
        ↓
Patient may enter a new symptoms/health complaint
        ↓
Patient may skip intake if the visit is only to discuss reports
        ↓
Patient confirms the doctor workflow
        ↓
Encounter becomes OPEN
        ↓
Patient joins the doctor's queue
```

During Revisiting, the doctor can see:

- All published reports belonging to the patient
- The current patient's symptoms/health complaint, if provided
- Previous consultation notes according to the doctor relationship rules below

#### Revisiting with a doctor the patient has already seen

The doctor can see:

- All published reports from every laboratory used by the patient
- The doctor's own previous consultation notes for this patient
- The current encounter's confirmed intake, if supplied

The doctor cannot see consultation notes written by another doctor.

#### Revisiting with a new doctor

If the patient chooses Revisiting with a doctor they have never seen before:

- The new doctor can see all published reports belonging to the patient.
- The new doctor cannot see previous consultation notes because there were no previous consultations with that doctor.
- The consultation count for that doctor is shown as `0`.
- The patient does not need to select or forward individual reports.

This allows a new doctor to understand the patient's published laboratory history without requiring the patient to carry or send every report.

### 7.5 Doctor queue

The doctor dashboard shows patients waiting for consultation.

Each queue entry includes:

- Patient name or permitted patient identifier
- Patient ID as required by the doctor workflow
- Visit type: New Consultation or Revisiting
- Queue status

The doctor selects a patient to open the active encounter.

### 7.6 Clinical cockpit

When the doctor opens the patient encounter, the Clinical Cockpit contains:

- Patient identity information required for the consultation
- Current symptoms/health complaint
- Structured intake fields
- Source link to the transcript when voice was used
- All published laboratory reports
- Report details and structured observations
- Original PDF access
- Doctor notes field
- Diagnostic order action
- End Consultation action

The doctor must not receive another doctor's consultation notes.

### 7.7 Doctor consultation notes

The doctor can write consultation notes for the current encounter.

The notes are stored with:

- Encounter ID
- Patient ID
- Doctor ID
- Note text
- Creation time

The doctor's notes are retained for the patient record, but future doctor visibility follows the doctor relationship rules above.

### 7.8 Diagnostic order

The doctor may create a diagnostic order, for example:

```text
Test type: CBC
Status: ORDERED
```

The order is associated with:

- Patient
- Doctor
- Current encounter
- Requested test type

The laboratory may use the relevant order when the patient visits a laboratory and approves the laboratory workflow.

### 7.9 End Consultation

When the doctor clicks **End Consultation**:

```text
Encounter OPEN
        ↓
Doctor clicks End Consultation
        ↓
Encounter CLOSED
        ↓
Doctor access through this encounter ends immediately
```

After closure:

- The doctor cannot query the reports or history through the closed encounter.
- The patient still retains access to their own record.
- The structured symptoms/health complaint remains stored.
- The transcript text remains stored.
- The doctor's notes remain stored.
- Raw voice audio is permanently deleted.

The backend must reject requests made through a closed encounter. The frontend must not rely only on clearing cached screen data.

---

## 8. Voice and text intake workflow

### 8.1 Input options

The patient can provide a symptoms/health complaint through:

- Voice input
- Text input

The patient may speak in their preferred supported regional language.

### 8.2 Voice processing

```text
Patient speaks
        ↓
Language detection
        ↓
Speech-to-text transcription
        ↓
Structured intake extraction
        ↓
Patient reviews the result
        ↓
Patient edits or confirms
        ↓
Confirmed intake is sent to the doctor queue
```

The system extracts structured fields such as:

- Chief complaint
- Duration
- Additional symptoms

Example:

```text
Patient input:
"I have felt very weak and dizzy for three days."

Structured intake:
- Chief complaint: Weakness
- Duration: 3 days
- Additional symptom: Dizziness
```

### 8.3 Patient review requirement

The system must show the extracted information to the patient before it is submitted to the doctor.

The patient can:

- Correct the text
- Correct structured fields
- Retry voice input
- Change from voice to text
- Confirm the intake

### 8.4 Input rules by visit type

| Visit type | Symptoms/health complaint input |
|---|---|
| New Consultation | Required |
| Revisiting | Optional; the patient may skip it when only discussing reports |

### 8.5 Failure handling

| Situation | Behavior |
|---|---|
| Microphone permission denied | Immediately offer text input |
| Speech unclear | Show the result and allow retry or editing |
| Voice service unavailable | Allow the patient to continue with text |
| Network connection drops | Keep the in-progress workflow safe and synchronize when connection returns |
| Patient closes consultation before finishing | Keep the server-side encounter state consistent and do not expose incomplete data as confirmed intake |

---

## 9. Complete patient–laboratory workflow

### 9.1 Laboratory QR scan

```text
Patient scans laboratory QR
        ↓
System verifies patient session
        ↓
System verifies registered laboratory QR
        ↓
Patient sees laboratory name
        ↓
Permission popup is displayed
```

### 9.2 Laboratory permission popup

The popup clearly states that the laboratory wants the following four fields:

- Name
- Age or date of birth
- Gender
- Phone number

The patient selects:

- Allow
- Do not allow

If the patient does not allow access, the laboratory cannot use the patient identity for this report workflow.

The laboratory does not receive:

- Previous laboratory reports
- Doctor consultation notes
- Symptoms/health complaint
- Patient timeline
- Reports from other laboratories

### 9.3 Lab access grant

After the patient selects Allow:

```text
LabAccessGrant status = ACTIVE
```

The grant connects:

- Patient
- Laboratory
- Current laboratory visit
- Optional diagnostic order

The grant gives the laboratory access only to the four approved identity fields and the report-upload workflow.

### 9.4 Laboratory operator workflow

The laboratory operator separately logs into the laboratory dashboard.

The operator can:

1. Open the active patient visit.
2. Verify the four identity fields.
3. Perform the test through the normal laboratory process.
4. Upload the original digital CBC PDF.
5. Review extracted values.
6. Correct or confirm values flagged for review.
7. Publish the report.

The laboratory operator cannot browse the patient's previous reports or doctor notes.

### 9.5 Laboratory access revocation

When the laboratory publishes the report:

```text
DiagnosticReport status = PUBLISHED
LabAccessGrant status = EXPIRED
```

The laboratory's patient-data access is revoked immediately after publication.

There is no time-based expiry, no unused-grant timestamp, and no separate timeout mechanism for this access rule. Publication is the event that revokes laboratory access.

The patient can still view the published report. The laboratory cannot continue using the patient identity access after publication.

---

## 10. Blood-report processing workflow

### 10.1 Current report scope

The current build processes **digital CBC PDF reports**.

The supported scope includes common CBC fields such as:

- Hemoglobin
- White blood cell count
- Platelets
- Red blood cell count
- Hematocrit
- Other selected common CBC fields required for the demonstration

The report must contain an extractable digital text layer for the current workflow.

### 10.2 Processing pipeline

```text
Original digital CBC PDF
        ↓
Text extraction
        ↓
CBC report parser
        ↓
Test-name normalization
        ↓
Value and unit extraction
        ↓
Reference-range comparison
        ↓
Plausibility validation
        ↓
Confidence decision
        ↓
Laboratory review
        ↓
Publish
```

### 10.3 Parsing and normalization

Rules and regular expressions are used first for predictable CBC report formats.

An ambiguous text block may use a structured fallback extraction service, but the final observation must still pass validation and laboratory review.

Examples of name normalization:

```text
Hb / Hgb / Haemoglobin → hemoglobin
WBC / White Blood Cells → white_blood_cell_count
Platelet Count / PLT → platelets
```

The normalization table must not change the original value or original unit.

### 10.4 Validation rules

| Condition | Result |
|---|---|
| Value is extracted clearly and is plausible | Mark high-confidence and calculate its flag |
| Value is unclear or extraction confidence is low | Mark `NEEDS_REVIEW` |
| Value fails a plausibility check | Always mark `NEEDS_REVIEW` |
| Source report has a reference range | Store and use that range |
| Source report has no reference range | Store null; never invent a range |
| Unit is missing or ambiguous | Preserve the original value and mark `NEEDS_REVIEW` |
| Value is outside the source range | Mark `HIGH` or `LOW` |
| Value is within the source range | Mark `NORMAL` |
| Any observation remains `NEEDS_REVIEW` | Block report publication |

The system must never silently guess a unit, invent a reference range, or convert an ambiguous value.

### 10.5 Confidence levels

The current workflow uses two review states:

- **High-confidence:** ready for laboratory confirmation and sign-off.
- **Needs-review:** laboratory must inspect and confirm or correct the value.

### 10.6 Laboratory review

The review screen shows:

- Original extracted test name
- Normalized test name
- Extracted value
- Unit
- Reference low and high values
- HIGH/LOW/NORMAL flag
- Extraction confidence
- Review status

The laboratory can confirm or correct a flagged observation. The report cannot be published until every observation is resolved.

### 10.7 Publication

The report status moves through the workflow:

```text
UPLOADED → PROCESSING → NEEDS_REVIEW → PUBLISHED
```

If no observation needs review, the report can move from processing to laboratory sign-off and publication.

When published:

- The report becomes part of the patient's published history.
- The patient can view the structured results.
- The patient can view findings based on the report values.
- The patient can download the original PDF.
- The report becomes available to the doctor during the doctor workflow.
- Laboratory access is revoked immediately.

### 10.8 Patient-facing explanation

Patient explanations use fixed templates based on extracted and validated values.

Example format:

```text
Your hemoglobin was {value} {unit}.
The typical range is {reference_low}–{reference_high} {unit}.
This is {above/below/within} that range.
```

The platform does not present a free-form generated diagnosis as if it were a laboratory result or doctor's conclusion.

---

## 11. Report visibility and ownership

### 11.1 Patient visibility

The patient can view their own published reports from every registered laboratory.

The patient can see:

- Laboratory name
- Report date and status
- Structured observations
- HIGH/LOW/NORMAL flags
- Fixed-template explanations
- Original PDF download

### 11.2 Doctor visibility

After the patient completes the doctor workflow, the doctor can view all published reports belonging to that patient.

The patient does not need to:

- Select a report
- Upload a report
- Send a report manually
- Forward a PDF
- Choose which laboratory report to share

The doctor can view:

- Structured observations
- Reference ranges
- Flags
- Fixed-template explanations
- Original laboratory PDF

### 11.3 Laboratory visibility

Each laboratory can work only with:

- The four identity fields approved for the current visit
- Its own uploaded report
- Its own extraction review and publication workflow

A laboratory cannot view another laboratory's report or modify another laboratory's data.

### 11.4 Report ownership

Every report stores its originating laboratory.

The backend must enforce ownership:

```text
Is this report owned by the requesting laboratory?
        ├── Yes → Allow the laboratory's permitted report action
        └── No  → Reject the request
```

The interface must not rely only on hiding buttons. Authorization must be enforced by the backend.

---

## 12. Data retention and deletion

| Data | Rule |
|---|---|
| Raw voice audio | Stored temporarily during processing and permanently deleted when the consultation ends |
| Transcript text | Retained for source-linking and future patient/doctor workflows |
| Structured symptoms/health complaint | Retained with the encounter |
| Doctor consultation notes | Retained with the encounter and restricted by doctor relationship rules |
| Original laboratory PDF | Retained unchanged |
| Structured laboratory observations | Retained with the published report |
| Patient profile | Retained as the central patient identity |
| Published report | Retained in the patient's record |
| Audit events | Retained for workflow and access traceability |
| Laboratory access grant | Changes from ACTIVE to EXPIRED immediately after report publication |

Ending access does not delete the patient's report or health record. It prevents the provider from continuing to query the protected data through the completed workflow.

### 12.1 Provenance labels

Every important piece of information must identify its source:

| Provenance | Meaning |
|---|---|
| `PATIENT_REPORTED` | Information supplied and confirmed by the patient |
| `DOCTOR_ENTERED` | Notes entered by a doctor |
| `LAB_PUBLISHED` | Results confirmed and published by a laboratory |
| `AI_GENERATED` | Structured or templated content generated from source information |

AI-generated information must not be presented with the same authority as the patient, doctor, or laboratory source.

---

## 13. Access-control rules

### 13.1 Patient rules

- A patient can always access their own patient record after authentication.
- A patient can start a provider workflow by scanning a valid doctor or laboratory QR.
- A patient must authenticate with OTP before personal history is loaded.
- A patient does not need to choose individual reports for a doctor.

### 13.2 Doctor rules

- A doctor can work only through an authenticated doctor account.
- A doctor can see the current patient's confirmed intake while the encounter is open.
- A doctor can see all published reports for the patient during both New Consultation and Revisiting.
- A doctor can see their own previous notes during Revisiting when previous notes exist for that doctor and patient.
- A new doctor has no previous notes for the patient and the consultation count is `0`.
- A doctor cannot see another doctor's consultation notes.
- A doctor cannot query the encounter after it is closed.

### 13.3 Laboratory rules

- A laboratory can work only if it is registered and approved to use the platform.
- A laboratory can see only the four fields approved by the patient for the current visit.
- A laboratory cannot view the patient's previous reports or doctor notes.
- A laboratory can upload only its own report.
- A laboratory can review and publish only its own report.
- Laboratory patient-data access is revoked immediately when the report is published.

### 13.4 Backend enforcement

Every protected endpoint must verify:

- Authenticated user identity
- User role
- Patient relationship
- Provider relationship
- Encounter status when doctor access is requested
- Lab access grant status when laboratory access is requested
- Report ownership when a laboratory modifies a report
- Report publication status when a report is requested as a published result

---

## 14. Data model

### 14.1 Users

```text
users
- id
- role: PATIENT | DOCTOR | LABORATORY
- phone or authentication identifier
- created_at
```

### 14.2 Patients

```text
patients
- id
- user_id
- patient_identifier
- name
- date_of_birth or age
- gender
- phone
```

### 14.3 Doctors

```text
doctors
- id
- user_id
- name
- specialty
- qr_code_id
```

### 14.4 Laboratories

```text
laboratories
- id
- name
- qr_code_id
- platform_approval_status
```

### 14.5 Encounters

```text
encounters
- id
- patient_id
- doctor_id
- visit_type: NEW | REVISITING
- status: OPEN | CLOSED
- started_at
- ended_at
```

### 14.6 Symptom intakes

```text
symptom_intakes
- id
- encounter_id
- input_mode: VOICE | TEXT | SKIPPED
- transcript
- structured_data
- confidence
- created_at
```

The raw audio file is temporary and is not retained as a long-term patient record.

### 14.7 Consultation notes

```text
consultation_notes
- id
- encounter_id
- doctor_id
- patient_id
- notes_text
- created_at
```

The backend uses `doctor_id` and `patient_id` to ensure that one doctor cannot read another doctor's consultation notes.

### 14.8 Diagnostic orders

```text
diagnostic_orders
- id
- encounter_id
- patient_id
- doctor_id
- test_type
- status: ORDERED | COMPLETED
- created_at
```

### 14.9 Laboratory access grants

```text
lab_access_grants
- id
- patient_id
- laboratory_id
- diagnostic_order_id (optional)
- status: ACTIVE | EXPIRED
```

The current access rule does not use a grant timestamp, time-based expiry field, or unused-grant timeout. The status changes to `EXPIRED` immediately when the associated report is published.

### 14.10 Diagnostic reports

```text
diagnostic_reports
- id
- patient_id
- laboratory_id
- diagnostic_order_id (optional)
- status: UPLOADED | PROCESSING | NEEDS_REVIEW | PUBLISHED
- created_at
```

### 14.11 Report files

```text
report_files
- id
- report_id
- original_file_path
- uploaded_at
```

The uploaded original PDF is preserved unchanged.

### 14.12 Laboratory observations

```text
lab_observations
- id
- report_id
- test_name_original
- test_name_normalized
- value
- unit
- reference_low
- reference_high
- flag: HIGH | LOW | NORMAL
- extraction_confidence
- validation_status: OK | NEEDS_REVIEW
```

### 14.13 AI artifacts

```text
ai_artifacts
- id
- encounter_id (optional)
- report_id (optional)
- artifact_type
- content
- source_reference
- created_at
```

Every artifact must identify the source transcript or observation from which it was created.

### 14.14 Audit events

```text
audit_events
- id
- actor_type
- actor_id
- action
- resource_type
- resource_id
- patient_id
- timestamp
- outcome
```

Important authentication, identity lookup, report upload, report view, publication, and access-denial events must be traceable.

---

## 15. Required screens

### 15.1 Patient screens

1. Patient Login/OTP
2. New Patient Registration
3. Patient Home/Scan
4. Doctor Confirmation
5. New Consultation or Revisiting Selection
6. Voice/Text Symptoms and Health Complaint
7. Intake Review and Confirmation
8. Doctor Queue/Waiting Status
9. Laboratory Permission Popup
10. Reports List
11. Report Details
12. Original PDF Viewer/Download
13. Health Timeline

### 15.2 Doctor screens

1. Doctor Login
2. Doctor Queue
3. Clinical Cockpit
4. Consultation Notes
5. Diagnostic Order
6. End Consultation confirmation/state

### 15.3 Laboratory screens

1. Laboratory Login
2. Laboratory Dashboard
3. Patient Visit Verification
4. Report PDF Upload
5. Processing Status
6. Extraction Review
7. Publish Report

The patient, doctor, and laboratory screens must remain separated by role-based authentication and backend authorization.

---

## 16. AI and logic services

The current product uses four processing services.

| Service | Input | Output |
|---|---|---|
| Voice and Language | Patient audio | Detected language and transcript |
| Intake Extraction | Confirmed transcript | Structured symptoms/health complaint with confidence |
| Report Parsing | Extracted CBC PDF text | Candidate test names, values, and units |
| Deterministic Validation | Candidate observation and source range | Validation status and HIGH/LOW/NORMAL flag |

### Fixed-template content

The system uses fixed templates for summaries and explanations. It does not freely generate medical conclusions that could be mistaken for a doctor's diagnosis.

Example:

```text
Patient reports {chief_complaint} for {duration}.
```

---

## 17. Current version boundaries

The current product workflow is limited to:

- Digital PDFs with extractable text
- CBC-format reports
- Patient-confirmed symptom/health complaint intake
- Published laboratory reports
- All published report sharing during the doctor workflow
- Fixed-template explanations
- Server-enforced access rules

The following are not required for the current version:

- Live OCR for scanned image-only reports
- Patient selection of individual reports
- Manual doctor consent popup
- Report selection or forwarding by the patient
- Time-based laboratory access expiry
- Automatic Revisiting preselection
- Doctor access to another doctor's consultation notes
- Laboratory access to previous patient history
- Patient access to doctor or laboratory operator dashboards

---

## 18. Failure and edge-case behavior

| Scenario | Required behavior |
|---|---|
| Patient opens website without a session | Send to mobile OTP login |
| Patient scans QR while logged out | Save provider destination, complete OTP, resume provider workflow |
| Patient scans QR with active session | Open provider workflow without another OTP |
| Invalid QR | Show an invalid provider message and allow retry |
| Existing patient logs in | Load the existing patient record; do not create a duplicate account |
| New patient logs in | Complete registration and create one Patient ID |
| Microphone denied | Provide text input immediately |
| Voice service unavailable | Allow text input |
| Patient skips Revisiting intake | Continue the report-review workflow without new symptoms/health complaint |
| Doctor selects New Consultation | Show current intake plus all published reports; hide previous consultation notes |
| New doctor selects Revisiting | Show all published reports, no previous notes, and consultation count 0 |
| Existing doctor selects Revisiting | Show all published reports and that doctor's own previous notes |
| Doctor ends consultation | Close encounter and reject later doctor queries through it |
| Laboratory permission denied | Do not create an active lab access grant for that visit |
| Patient identity mismatch at laboratory | Block report publication until corrected |
| Low-confidence observation | Mark `NEEDS_REVIEW` and block publication until resolved |
| Missing reference range | Store null and do not invent one |
| Ambiguous unit | Preserve original value and require review |
| Laboratory publishes report | Make report available and revoke lab access immediately |
| Laboratory attempts to access patient after publication | Reject the request because the grant is `EXPIRED` |
| Laboratory attempts to modify another laboratory's report | Reject the request through backend ownership authorization |

---

## 19. End-to-end workflow summary

### 19.1 Patient and doctor

```text
Patient opens website or scans doctor QR
        ↓
OTP login if there is no active patient session
        ↓
Existing patient loaded or new patient registered
        ↓
Doctor QR verified
        ↓
Patient confirms doctor
        ↓
Patient chooses New Consultation or Revisiting
        ↓
New Consultation: symptoms/health complaint required
Revisiting: symptoms/health complaint optional
        ↓
Patient reviews and confirms intake when provided
        ↓
Encounter OPEN
        ↓
Patient enters doctor queue
        ↓
Doctor opens Clinical Cockpit
        ↓
Doctor sees current intake and all published reports
        ↓
Previous notes shown only when permitted for that doctor during Revisiting
        ↓
Doctor writes notes and may order CBC
        ↓
Doctor clicks End Consultation
        ↓
Encounter CLOSED
        ↓
Doctor access ends; raw audio is deleted; record is retained
```

### 19.2 Patient and laboratory

```text
Patient opens website or scans laboratory QR
        ↓
OTP login if there is no active patient session
        ↓
Existing patient loaded or new patient registered
        ↓
Laboratory QR verified
        ↓
Patient approves sharing of name, age/DOB, gender, and phone
        ↓
LabAccessGrant ACTIVE
        ↓
Laboratory verifies identity fields
        ↓
Laboratory performs CBC test
        ↓
Laboratory uploads original digital PDF
        ↓
Platform extracts and validates observations
        ↓
Laboratory reviews flagged values
        ↓
Laboratory publishes report
        ↓
Report becomes visible to patient and doctor workflow
        ↓
LabAccessGrant EXPIRED immediately
        ↓
Laboratory can no longer access patient data for that visit
```

---

## 20. Implementation order

### Phase 1 — Identity, roles, and access enforcement

1. Create patient, doctor, laboratory, and user records.
2. Implement mobile OTP authentication for patients.
3. Implement role-based doctor and laboratory authentication.
4. Implement QR validation and provider identification.
5. Implement saved pending-QR flow for logged-out patients.
6. Implement backend access checks.

### Phase 2 — Patient doctor workflow

1. Patient Home/Scan.
2. Doctor QR confirmation.
3. New Consultation/Revisiting selection.
4. Voice/text symptoms and health complaint.
5. Patient review and confirmation.
6. Doctor queue.
7. Doctor Clinical Cockpit.
8. Published report display.
9. Consultation notes.
10. Diagnostic order.
11. End Consultation and server-side closure.

### Phase 3 — Laboratory workflow

1. Laboratory QR validation.
2. Four-field patient permission popup.
3. Active laboratory access grant.
4. Laboratory patient verification.
5. Digital CBC PDF upload.
6. Text extraction and parsing.
7. Normalization and deterministic validation.
8. Extraction Review screen.
9. Publish gate.
10. Immediate laboratory access revocation after publication.

### Phase 4 — End-to-end verification

1. Test a new patient login.
2. Test a returning patient with existing history.
3. Test scanning a doctor QR before login.
4. Test scanning a doctor QR with an active session.
5. Test New Consultation with all published reports and no previous notes.
6. Test Revisiting with a previously seen doctor.
7. Test Revisiting with a new doctor and consultation count 0.
8. Test the complete laboratory upload, review, and publish flow.
9. Verify that laboratory access is rejected immediately after publication.
10. Verify that doctor access is rejected immediately after End Consultation.

---

## 21. Acceptance criteria

The product is working according to this specification when all of the following are true:

### Patient authentication

- A patient without an active session is redirected to OTP login.
- A patient scanning a QR before login returns to the correct provider workflow after OTP.
- A patient with an active session can scan a QR and continue without another OTP.
- An existing patient's history is loaded after successful OTP verification.
- A new patient receives one new Patient ID.

### Doctor workflow

- The patient must confirm the doctor and manually choose New Consultation or Revisiting.
- New Consultation requires symptoms/health complaint input.
- Revisiting allows the patient to skip new input.
- Both visit types show all published reports.
- New Consultation hides previous consultation notes.
- Revisiting with an existing doctor shows that doctor's previous notes.
- Revisiting with a new doctor shows no previous notes and shows consultation count `0`.
- The patient never needs to select or forward individual reports.
- Closing the encounter immediately prevents later doctor queries through that encounter.

### Laboratory workflow

- The patient must approve sharing the four identity fields.
- The laboratory cannot see previous medical history.
- The laboratory can upload and modify only its own report.
- A report with unresolved `NEEDS_REVIEW` observations cannot be published.
- The original PDF remains downloadable and unchanged.
- Publishing the report immediately changes the lab grant from `ACTIVE` to `EXPIRED`.
- A laboratory request after publication is rejected.

### Report processing

- The platform processes the agreed digital CBC PDF format.
- Values are normalized without changing source values.
- Source reference ranges are used when available.
- Missing ranges are not invented.
- Ambiguous units require review.
- Implausible values require review.
- Published observations show HIGH, LOW, or NORMAL flags where a valid range exists.

---

## Final product statement

> **SwasthSetu is a patient-centered healthcare platform where a patient logs in through mobile OTP, scans a doctor or laboratory QR, provides a symptoms/health complaint when needed, and receives a connected record of published CBC reports. All published reports are automatically available during the doctor workflow without requiring the patient to select or send them. Laboratories receive only four approved identity fields, and their access is revoked immediately after publishing the report. Doctor access ends when the consultation ends.**

**The patient owns the record. The patient does not carry the burden of moving reports. The workflow controls access automatically.**
