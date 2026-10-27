# SwasthSetu 2.0 — Master Source of Truth

**Status:** This document is the current, final design. Where anything in earlier drafts, chats, or the original 1,572-line blueprint conflicts with this document, **this document wins.**

**How to use this document:** Section 5 (The Access Model) is the single most important section — it is the core mechanism that makes the rest of the product safe and simple. Everything else exists to support it. If you're building and something is ambiguous, re-read Section 5 before inventing a new rule.

---

## 0. What Changed to Get Here (Decision Log)

This design went through three rounds before arriving here. Recorded so nobody re-litigates settled questions:

1. **Original blueprint (1,572 lines):** 5 roles, 9 AI services, multi-dimension consent scopes (date range / specific reports / future-toggle), manual revoke buttons, report versioning UI, Hospital Admin dashboard. **Rejected as over-scoped for a small team.**
2. **First redesign pass:** Cut to 3 roles, source-linking made consistent, deterministic validation separated from generative AI, consent simplified to a single grant/revoke flag. **Still had two independent, manually-managed consent systems (doctor + lab) — still real cognitive and build overhead.**
3. **Final design (this document):** Manual consent management removed entirely. Access is now **session-bound and self-expiring by construction** — a doctor's access exists only while a consultation is open, and a lab's access exists only until the report it was granted for is published. **There is no revoke button anywhere in the system, because nothing ever lingers long enough to need revoking.** This is the single biggest simplification in the whole project and should be treated as the product's core technical idea, not an implementation detail.

---

## 1. SwasthSetu 2.0 in One Sentence

> SwasthSetu is a healthcare workflow where a doctor's and a laboratory's access to a patient's data automatically exists only for as long as it's needed for the task at hand — and disappears on its own the moment that task ends, with no manual revoke step anywhere.

---

## 2. The Three Pillars

### 🎙️ 1. UNDERSTAND
Multilingual voice → structured patient intake, reviewed and corrected by the patient before the doctor ever sees it.

### 📄 2. VERIFY
Lab PDF → structured, confidence-scored observations, with the original PDF always preserved and never replaced.

### 🔒 3. BOUNDED ACCESS (not "consent management")
Access to a patient's data is granted implicitly by the shape of the workflow itself and expires automatically — a doctor's window closes when he ends the consultation, a lab's window closes the instant it publishes the report. **There is nothing to configure and nothing to revoke.**

---

## 3. Actors & Roles

| Role | Purpose | Gets access to |
|---|---|---|
| **Patient** | Owns their identity, initiates every encounter and every lab visit | Their own full record, always |
| **Doctor** | Runs a consultation | Only what Section 5 grants, only while a consultation is open |
| **Laboratory** | Runs a diagnostic test and publishes the result | Only the patient's identity-check fields, only until the report is published |

No Hospital Admin role, no Platform Admin role, and no fourth or fifth role of any kind in this build. Lab onboarding (approving a lab to operate on the platform at all) is a one-time backend/manual step, not a product feature with its own dashboard.

---

## 4. The Complete Story — Rahul

Rahul logs into SwasthSetu. His home screen has one primary action: **scan a QR / enter a code.**

**Visiting Dr. Mehta for the first time.**
Rahul scans Dr. Mehta's QR. The app confirms: *"Dr. Mehta — is this correct?"* Rahul confirms, then chooses **New Consultation** (this is his first visit, nothing to unlock). He speaks his complaint: *"Mane tran divas thi khubaj kamjori lage chhe ane chakkar pan aave chhe"* ("weakness and dizziness for three days"). SwasthSetu detects the language, transcribes it, and extracts: chief complaint = weakness, duration = 3 days, additional symptom = dizziness. Rahul reviews this on screen, corrects anything wrong, and submits. He's added to Dr. Mehta's queue.

Dr. Mehta opens his queue, clicks Rahul, and sees the structured intake immediately — no need to ask Rahul to repeat himself. He consults, writes his own notes, and decides a CBC is needed. He creates a diagnostic order. Rahul leaves. Dr. Mehta clicks **End Consultation.** At this instant: Rahul's raw voice recording is permanently deleted; the structured intake summary and Dr. Mehta's notes are kept, permanently, attached to this encounter, for the future; and Dr. Mehta's screen no longer shows anything about Rahul at all.

**Going to the lab.**
Rahul visits any registered lab. He scans that lab's QR. A popup appears: *"ABC Diagnostics wants your name, age, gender, and phone number to prepare your report — Allow?"* Rahul allows. The lab now has exactly those four fields, nothing more. The lab runs the CBC, uploads the resulting PDF. SwasthSetu's pipeline extracts the values, flags each one high/low/normal against the report's own reference range, and flags any low-confidence value for manual review. The lab reviews and publishes. **The instant it publishes, the lab's access to Rahul's information disappears on its own** — nobody clicks anything to revoke it. Rahul gets notified. He opens the report in-app to see the findings (which values are high/low), and can separately download the untouched original PDF.

**Twenty days later — a different problem.**
Rahul gets sick again and returns to Dr. Mehta. He scans the same QR, confirms Dr. Mehta, and this time chooses **Revisiting** instead of New Consultation. Because his new complaint is unrelated to the past one, he still gives a fresh voice input — Revisiting doesn't skip that, it's just optional now rather than mandatory, since some revisits are purely "I'm here to discuss my report," with nothing new to report. Because Rahul selected Revisiting, the moment Dr. Mehta opens this consultation he automatically sees: every past consultation note *he personally wrote* for Rahul (never another doctor's notes about Rahul), and *every* published lab report Rahul has, from any lab, ordered by any doctor. When Dr. Mehta clicks End Consultation, all of that disappears from his screen again — nothing was ever "granted" in a way that needed to be taken back.

**Seeing a different doctor Rahul has never selected Revisiting with before.**
For now, there is no automatic digital hand-off of Rahul's history to a doctor he hasn't built this Revisiting relationship with. Rahul simply shows that doctor the report on his own phone — a realistic, zero-engineering fallback, not a workaround.

---

## 5. THE ACCESS MODEL — Read This Before Building Anything Else

This is the core mechanism of the entire product. Two independent rules, each self-expiring, neither requiring a manual revoke action anywhere in the system.

### Rule A — Doctor Access (session-bound)

An `Encounter` has a `visit_type` (`NEW` or `REVISITING`, chosen by the patient at check-in, never auto-detected) and a `status` (`OPEN` or `CLOSED`).

**While an Encounter is `OPEN`:**
- The doctor always has access to *this* encounter's own intake data as it's being created.
- **If `visit_type = REVISITING`**, the doctor additionally gets:
  - Every `ConsultationNote` where `doctor_id = this doctor` AND `patient_id = this patient`, from any of that patient's previous `CLOSED` encounters. **Never** notes written by a different doctor.
  - Every `DiagnosticReport` for this patient with `status = PUBLISHED`, regardless of which lab produced it or which doctor (if any) ordered it. Lab reports are treated as the patient's own objective data, not doctor-relationship-specific, so they are not scoped to "this doctor only."
- **If `visit_type = NEW`**, none of the above is unlocked — the doctor sees only what the patient enters today.

**The instant the doctor clicks `End Consultation`, the Encounter becomes `CLOSED`,** and every piece of access granted above stops being queryable by that doctor. This is enforced server-side on every request — a doctor's app should never be relying on cached data from a closed encounter.

**What is permanently retained regardless of visit type:** the structured intake summary (chief complaint, duration, symptoms) and the doctor's own consultation notes for that encounter. Only the **raw voice audio recording** is deleted at consultation end — never the transcript text or the structured extraction, since both are needed for a future Revisiting encounter and for source-linking.

### Rule B — Laboratory Access (publish-bound)

A `LabAccessGrant` is created the moment a patient scans a lab's QR and approves the popup. It exposes exactly four fields to the lab: name, age/DOB, gender, phone.

**The grant is automatically set to `EXPIRED`, and the lab loses all access, at the earliest of:**
- The moment the associated `DiagnosticReport` reaches `status = PUBLISHED`, or
- A fixed safety-net timeout (recommend 48 hours) if no report is ever uploaded under that grant — this prevents an abandoned grant from lingering indefinitely if a patient scans but never actually completes a test.

**There is no manual revoke action for lab access, and none is needed** — the grant's entire purpose (letting this lab prepare this one report) is fulfilled the moment publish happens, so continued access has no legitimate use.

### Why there is no "revoke" button anywhere in this product

Every access grant in this system dies for a structural reason tied to the workflow itself, not because a person remembered to click something:
- Doctor access dies when the consultation ends.
- Lab access dies when the report is published.

This is a stronger privacy property than a system with standing grants and a revoke button, because there is no window of time where access exists *and could have been revoked but wasn't.*

### One open edge case, flagged deliberately (see Section 14)

Under Rule A as written, a doctor a patient is meeting for the very first time still receives **all** of that patient's published lab reports if the patient happens to select "Revisiting" (Revisiting is not gated on "have I met this specific doctor before" — it's a patient-chosen toggle). In current expected usage this scenario shouldn't come up (patients will naturally choose New for a doctor they've never selected Revisiting with), but the rule as specified does not technically prevent it. Flagged in Section 14 as something to explicitly decide before a wider rollout, not something silently patched here.

---

## 6. End-to-End Flow Diagrams

### 6.1 Patient–Doctor Loop

```text
PATIENT LOGS IN
      |
SCAN DOCTOR QR
      |
CONFIRM DOCTOR IDENTITY
      |
CHOOSE: NEW  or  REVISITING  (always a manual patient choice)
      |
      +-- NEW --------------------------> voice/text input MANDATORY
      |
      +-- REVISITING -------------------> voice/text input OPTIONAL
      |
STRUCTURED INTAKE EXTRACTED (if given)
      |
PATIENT REVIEWS / CORRECTS / CONFIRMS
      |
ENCOUNTER STATUS = OPEN, JOINS DOCTOR QUEUE
      |
DOCTOR OPENS QUEUE -> CLICKS PATIENT
      |
DOCTOR SEES:
   - today's structured intake (if given)
   - IF REVISITING: own past consultation notes with this patient
   - IF REVISITING: all published lab reports for this patient (any lab/doctor)
      |
DOCTOR CONSULTS, WRITES NOTES, OPTIONALLY CREATES DIAGNOSTIC ORDER
      |
DOCTOR CLICKS "END CONSULTATION"
      |
ENCOUNTER STATUS = CLOSED
      |
  - raw voice audio deleted
  - structured intake + doctor's notes retained permanently
  - all "unlocked" history access (Revisiting data) stops being queryable
```

### 6.2 Patient–Lab Loop

```text
PATIENT VISITS ANY REGISTERED LAB
      |
SCANS LAB QR
      |
POPUP: "<Lab Name> wants your name, age, gender, phone — Allow?"
      |
PATIENT ALLOWS -> LabAccessGrant created (status = ACTIVE)
      |
LAB SEES: name, age/DOB, gender, phone -- nothing else
      |
LAB PERFORMS TEST, UPLOADS ORIGINAL PDF
      |
DIGITAL PDF --> TEXT EXTRACTION --> REPORT PARSER
      |
NORMALIZATION (test-name lookup table)
      |
VALIDATION (reference range comparison, plausibility bounds)
      |
      +-- HIGH CONFIDENCE ----> ready for lab review
      +-- LOW CONFIDENCE -----> flagged "Needs Review"
      |
LAB REVIEWS FLAGGED VALUES, CONFIRMS OR CORRECTS
      |
LAB PUBLISHES REPORT  ->  DiagnosticReport.status = PUBLISHED
      |
   - LabAccessGrant automatically set to EXPIRED (no manual action)
   - Patient notified
   - Report now visible in Patient app (findings + downloadable original PDF)
   - Report now included in what ANY doctor sees on a future Revisiting encounter
```

---

## 7. Data Model

```text
users
- id, role, phone, auth_provider_id, created_at

patients
- id, user_id, name, date_of_birth, gender, phone, patient_identifier

doctors
- id, user_id, name, specialty, qr_code_id

laboratories
- id, name, qr_code_id, platform_approval_status

encounters
- id, patient_id, doctor_id
- visit_type            ENUM(NEW, REVISITING)     -- patient-chosen, never auto-detected
- status                ENUM(OPEN, CLOSED)
- started_at, ended_at

symptom_intakes
- id, encounter_id
- input_mode            ENUM(voice, text, skipped)
- transcript                                       -- retained permanently (text only)
- structured_data       JSON (chief_complaint, duration, symptoms[])
- confidence
- created_at
- NOTE: raw audio file is stored transiently during processing only, then deleted
  the moment the encounter is closed. Never persisted long-term.

consultation_notes
- id, encounter_id, doctor_id, patient_id
- notes_text
- created_at
- ACCESS RULE: visible to doctor_id only, on a future REVISITING encounter with the
  same patient_id. Never visible to a different doctor, ever.

diagnostic_orders
- id, encounter_id, patient_id, doctor_id
- test_type              (e.g. "CBC")
- status                 ENUM(ORDERED, COMPLETED)
- created_at

lab_access_grants
- id, patient_id, laboratory_id, diagnostic_order_id (nullable)
- granted_at
- status                 ENUM(ACTIVE, EXPIRED)
- expires_at             -- set to report.published_at once known, or granted_at + 48h
                            as a safety-net default if no report is ever uploaded

diagnostic_reports
- id, patient_id, laboratory_id, diagnostic_order_id (nullable)
- status                 ENUM(UPLOADED, PROCESSING, NEEDS_REVIEW, PUBLISHED)
- created_at, published_at

report_files
- id, report_id, original_file_path, uploaded_at
- NOTE: single version only in this build. No correction/versioning UI. If a report
  is wrong, it is re-uploaded as a new diagnostic_report. (See Section 12.)

lab_observations
- id, report_id
- test_name_original, test_name_normalized
- value, unit
- reference_low, reference_high
- flag                   ENUM(HIGH, LOW, NORMAL)
- extraction_confidence
- validation_status      ENUM(OK, NEEDS_REVIEW)

ai_artifacts
- id, encounter_id (nullable), report_id (nullable)
- artifact_type          (e.g. "templated_brief", "templated_explanation")
- content
- source_reference        -- points to the exact transcript or lab_observation it's built from
- created_at

audit_events
- id, actor_type, actor_id, action, resource_type, resource_id, patient_id
- timestamp, outcome
```

**Provenance rule, kept from earlier design work:** every piece of information distinguishes PATIENT_REPORTED (intake), DOCTOR_ENTERED (consultation notes), LAB_PUBLISHED (observations), and AI_GENERATED (templated briefs/explanations) — never let a generated artifact be presented with the same weight as its source.

---

## 8. AI Components

Exactly four AI/logic services. No others.

| Service | Input | Output | Type |
|---|---|---|---|
| Voice & Language | Audio | Detected language + transcript | Hosted API (speech-to-text + language ID) |
| Intake Extraction | Transcript | Structured fields (chief complaint, duration, symptoms), with confidence | Hosted LLM, JSON-schema-constrained output |
| Report Parsing | Extracted PDF text | Candidate lab observations (test name, value, unit) | Rules/regex first; LLM fallback only for ambiguous text blocks |
| Deterministic Validation | Candidate observation + reference range | Confidence + HIGH/LOW/NORMAL flag + review decision | Pure logic, no AI — a lookup and a range comparison |

**Explicitly not built:** a generative "Clinical Context" summarizer, a generative adaptive-question engine, or a translation service. Where a doctor-facing or patient-facing summary sentence is needed (e.g. "Patient reports weakness for 3 days"), it is **assembled from structured fields with a fixed sentence template**, never freely generated. This removes the single largest hallucination risk in the system for negligible loss of demo value — a templated sentence reads exactly as "smart" to an observer as a generated one, without the risk of it being wrong.

**Report explanation shown to the patient** follows the same rule: `"Your {test} was {value} {unit}. The typical range is {low}–{high} {unit}. This is {above/below/within} that range."` — never free interpretive text about what it might mean clinically.

---

## 9. Report Processing Pipeline

**Built now:** digital-PDF text extraction only, for CBC-format reports.

**Documented but not built in this version:** OCR for scanned/image reports. Mention it in the pitch as a designed extension point (the schema and pipeline stages already support routing a non-digital PDF to an OCR step before the same downstream parser), but do not attempt to build or demo a live OCR path unless it has been separately validated against your actual sample documents well in advance.

```text
Original PDF
     |
Digital text extraction   [BUILT]
     |                          \
     |                     (OCR path — designed, not built)
     v
Report Parser (regex/rules for CBC fields)
     |
Normalization (lookup table: "Hb"/"Hgb"/"Haemoglobin" -> canonical "hemoglobin")
     |
Validation (reference-range comparison + plausibility bounds)
     |
     +-- confident, in range -> HIGH/LOW/NORMAL flag set automatically
     +-- low confidence or implausible value -> flagged NEEDS_REVIEW
     |
Lab reviews flagged items, confirms or corrects
     |
Publish -> lab_observations locked, report_files original PDF preserved unmodified
```

**Report type scope for this build: CBC only** (hemoglobin, WBC, platelets, plus 2–3 more common fields). Do not generalize the parser to "any lab report" — this is the single easiest way to blow the build timeline for no additional demo value.

---

## 10. Confidence & Manual Review

- Confidence is binary for this build: **high-confidence** (auto-flagged, ready for lab sign-off) or **needs-review** (lab must look at it before it can be published).
- A value failing a plausibility bound (e.g., a hemoglobin reading outside any physiologically possible range) is always routed to needs-review, regardless of the extractor's own confidence score — never trust a confident-but-implausible extraction.
- If a reference range is missing from the original report, store it as null — never invent one.
- If a unit is ambiguous or missing, preserve the original value as-is and flag for review — never silently guess or convert units.
- A report cannot reach `PUBLISHED` status while any observation is still `NEEDS_REVIEW`.

---

## 11. Screens (Minimum Set)

| # | Screen | Role | Purpose |
|---|---|---|---|
| 1 | Login/OTP | All | Identify the user |
| 2 | Home / Scan | Patient | Single primary action: scan doctor or lab QR |
| 3 | Confirm Doctor + New/Revisiting | Patient | Confirm identity, choose visit type |
| 4 | Voice/Text Intake | Patient | Capture symptoms (mandatory if New, optional if Revisiting) |
| 5 | Intake Review | Patient | Confirm/correct AI-structured output before submit |
| 6 | Queue/Waiting | Patient | Status while waiting |
| 7 | Reports List + Detail | Patient | View findings, download original PDF |
| 8 | Health Timeline | Patient | Simple chronological list of consultations + reports |
| 9 | Lab Access Popup | Patient | One-tap approve for a scanned lab's data request |
| 10 | Doctor Queue | Doctor | Worklist of waiting patients, tagged New/Revisiting |
| 11 | Clinical Cockpit | Doctor | Today's intake + (if Revisiting) own past notes + all published reports, all source-linked, notes field, order-a-test action, End Consultation action |
| 12 | Lab Visit Verification | Lab | Confirm identity-check fields after grant |
| 13 | Lab Upload | Lab | Attach PDF |
| 14 | Extraction Review | Lab | Confirm/correct flagged values, publish |
| 15 | Lab Dashboard | Lab | Counts: pending / processing / needs-review / published |

**15 screens total.** No Access History screen, no Consent Manager screen, no Revoke screen, no Report Versioning screen — none of these exist because the access model in Section 5 makes them unnecessary.

---

## 12. Explicitly NOT Built (Do Not Reintroduce)

| Removed item | Why |
|---|---|
| Hospital Admin role/dashboard | No operational payoff identified, no connection to the core loop |
| Manual "revoke access" button (doctor or lab) | Access already self-expires per Section 5 — a revoke button would have nothing meaningful to do |
| Multi-dimension consent scope picker (date range / specific reports / future-toggle) | Replaced entirely by the session-bound and publish-bound rules in Section 5 |
| Generative "Clinical Context" AI summary | Highest hallucination risk in the system for marginal value over a templated sentence |
| Generative adaptive-question engine | Replaced by simply making voice input optional on Revisiting — no engine needed |
| Translation service | Not established as needed for the doctor persona; adds a second point of AI failure |
| OCR (as a live/demo path) | Documented as a future extension only; digital-PDF path is what gets built and demoed |
| Report correction/versioning UI | A wrong report is re-uploaded as a new report; no versioning UI needed for this build |
| Patient-uploaded historical reports | Out of scope — only lab-published reports exist in this system |
| Access History screen | Nothing to browse — access windows are short-lived and tied to visible, in-progress actions (an open consultation, an active lab visit), not a long list to audit after the fact |

If any of the above is reconsidered later, it should be re-added deliberately with its own design discussion — not quietly reintroduced because it "seems useful" mid-build.

---

## 13. Edge Cases & Failure Handling

| Scenario | Behavior |
|---|---|
| Microphone denied | Fall back to text input immediately |
| Poor/unclear speech | Show the (possibly imperfect) transcript, let patient retry or edit |
| AI service temporarily unavailable | Allow text intake to proceed; never block the encounter entirely on an AI call |
| PDF has no extractable text | Documented OCR extension point exists but is not live in this build — for the hackathon, use only report formats with a digital text layer |
| Low-confidence extracted value | Flag `NEEDS_REVIEW`; block publish until the lab confirms or corrects it |
| Implausible value (fails sanity bounds) | Always routed to review, regardless of stated confidence |
| Missing reference range on the source report | Store null, never invent one |
| Ambiguous or missing unit | Preserve original value as-is, flag for review, never silently convert |
| Patient identity mismatch at lab | Block publication entirely; require lab to correct patient selection or cancel |
| Duplicate report upload | Should be detected (e.g. by file hash) and flagged for lab confirmation before creating a second `diagnostic_report` |
| Lab visit grant never used (patient scans but no report ever uploaded) | Grant auto-expires after 48 hours (safety-net timeout in Section 5, Rule B) |
| Doctor's app loses connection mid-consultation | Encounter should remain `OPEN` server-side; doctor's client should reconnect and resume, not silently lose the in-progress note |

---

## 14. Open Questions — Decide Before Wider Rollout

These do not block building the hackathon version, but should not be silently resolved one way or the other without a deliberate decision:

1. **Revisiting with a brand-new doctor.** As specified in Section 5, selecting "Revisiting" unlocks *all* published lab reports regardless of whether the patient has ever met this specific doctor before (only consultation notes are doctor-scoped). Confirm whether this is intended long-term, or whether lab-report visibility should also require an established Revisiting relationship with that doctor.
2. **Referral scenario.** A specialist a patient is seeing for the first time currently gets nothing automatically (current fallback: patient shows their own phone). If real-world use shows this is too limiting, a lightweight one-time "share this one report with a new doctor" action could be added later — deliberately not built now.
3. **Default toggle position.** Optional UX polish, not required: if the backend already knows a patient has a prior encounter with this doctor's QR, the New/Revisiting toggle could default to "Revisiting" pre-selected (still fully overridable) to reduce the chance of an absent-minded wrong tap. Not implemented in this version.
4. **Lab grant safety-net timeout value.** 48 hours is a placeholder; confirm this matches realistic same-day/next-day test turnaround for your chosen demo lab scenario.

---

## 15. Demo Script

**Core beats, in order:**
1. Rahul scans Dr. Mehta's QR, selects New Consultation, speaks a symptom in a regional language → structured intake appears in seconds.
2. Dr. Mehta opens his queue, clicks Rahul, sees the structured summary with a source link back to the transcript.
3. Dr. Mehta orders a CBC, ends the consultation — narrate explicitly: *"and right now, this data has already disappeared from Dr. Mehta's screen — nobody clicked anything, it just expired."*
4. Cut to the lab: Rahul scans the lab's QR, approves the popup, lab uploads a PDF, extraction runs, one value is deliberately low-confidence and gets flagged `NEEDS_REVIEW` — the lab confirms it, publishes.
5. Narrate: *"the moment that publish happened, the lab's access to Rahul's data expired too — again, nobody revoked anything."*
6. Rahul opens the report in-app, shows the findings view, downloads the original PDF.
7. Cut forward: Rahul returns to Dr. Mehta weeks later, selects Revisiting this time — the new report and his past notes appear automatically, with zero extra setup.

**The one sentence to close on:** *"There is no revoke button in this entire product, because there is never anything left lying around that needs revoking."*

---

## 16. Team Division & Roadmap (unchanged from prior review, still applies)

- **Full-Stack 1:** auth, the Section 5 access-model middleware (this is the single most important piece of backend code in the project — it should be built and tested first), schema, audit logging.
- **Full-Stack 2:** patient app (scan/confirm/intake/review/reports/timeline) and the doctor Clinical Cockpit UI.
- **AI/ML 1:** speech-to-text, language detection, intake extraction, templated brief/explanation logic.
- **AI/ML 2:** PDF extraction, normalization lookup table, validation/plausibility rules, confidence scoring.

**Build order:** (1) schema + access-model middleware, tested in isolation before any UI exists — confirm a closed encounter genuinely can't be queried, and an expired lab grant genuinely can't either; (2) patient intake flow; (3) doctor Cockpit consuming real data; (4) lab upload → extraction → review → publish; (5) wire the full loop end to end; (6) rehearse the demo script above, including one deliberately staged failure (a low-confidence flag), until it runs clean three times in a row.

---

*This document supersedes all prior SwasthSetu drafts for the purposes of building. Sections 5 and 12 are the two sections most worth re-reading if a design question comes up mid-build that isn't already answered here.*
