# Future Patient Intake Pipeline Specification

## Scope

This document is the implementation prompt for the later multilingual patient
voice/text intake work. **Do not implement this pipeline as part of the current
UI/layout change.** Until this work is started, the doctor dashboard must show
blank placeholders for fields that are not available.

The canonical application remains:

- Patient UI: `patient/ui/`
- Node/Mongoose application API: `lab/server/`
- Doctor UI: `doctor/ui/`

The legacy Python code under `swasthsetu-backend/` is a read-only reference. Reuse
or adapt its proven concepts into the canonical services when useful; do not
connect the deployed workflow to the legacy Supabase/session implementation and
do not modify the legacy folder.

## Implementation prompt

> Build a production-quality multilingual patient clinical-intake pipeline for
> the canonical SwasthSetu/SwasthSetu application. Support both typed text and
> browser-recorded voice. Preserve the patient's original statement and input
> language, detect the spoken language for voice, transcribe voice without
> summarizing, normalize the clinical meaning into English, and produce a
> conservative structured clinical intake. The patient must review and confirm
> the generated structure before it is submitted to the doctor's queue. Never
> diagnose, infer unstated facts, or silently convert uncertainty into a
> medical claim. Store provenance for every generated field and retain the
> transcript while deleting raw audio when the encounter closes.

## Reference implementation to inspect first

Use these legacy files as reference material before writing new logic:

- `swasthsetu-backend/app/services/ai_service.py`
  - `ClinicalIntake`, `EnglishIntake`, and `Confidence` Pydantic contracts
  - `process_patient_text()` language validation and structured extraction
  - `transcribe_patient_audio()` audio upload, preferred-language hint, and
    detected-language fallback
  - conservative fallback extraction behavior
- `swasthsetu-backend/app/services/language.py`
  - canonical language aliases and normalization
- `swasthsetu-backend/app/api/sessions.py`
  - text submission validation
  - multipart voice submission
  - browser transcript preference with server transcription fallback
  - background processing and session state transitions
- `swasthsetu-backend/app/services/session_service.py`
  - session ownership/state concepts only; translate them to Mongoose models
- `swasthsetu-backend/app/services/symptom_extraction.py`
  - field naming reference only; it is explicitly a stub and must not be copied
  as the final extractor

The canonical implementation must use the existing MongoDB models and
authenticated encounter ownership in `lab/server/`, not Supabase tables or
legacy session IDs.

## Input contract

### Text input

```json
{
  "input_mode": "TEXT",
  "language": "gu",
  "text": "patient's original typed statement"
}
```

Requirements:

- Accept supported language code or alias.
- Preserve the exact original text.
- Reject empty text.
- Do not restrict the patient to English.
- Use the selected language as metadata and extraction hint, not as a reason
  to reject understandable multilingual text.

### Voice input

The browser may send:

- the selected/preferred language;
- the browser transcript, when Web Speech API succeeded;
- the original audio bytes, when MediaRecorder is available.

The server must:

1. Validate MIME type and size.
2. Prefer a non-empty browser transcript as the patient transcript, while
   marking its source as browser transcription.
3. Use server transcription when the browser transcript is absent or explicitly
   unreliable.
4. Pass the selected language as a preferred-language hint.
5. Detect the actual spoken language when possible.
6. Preserve both selected language and detected language.
7. Never claim that browser recognition is guaranteed to stay within the
   selected language. A patient may speak code-mixed or different language.
8. Delete raw audio after encounter closure; retain transcript and structured
   output.

The selected language should guide recognition, but the pipeline should support
this result:

```json
{
  "selected_language": "gu",
  "detected_language": "hi",
  "language_match": false,
  "language_confidence": 0.82
}
```

## Required structured output

Store this under `SymptomIntake.structured_data` and expose normalized fields
in the doctor cockpit. Missing values must be empty strings or empty arrays;
never invent placeholders that look like extracted clinical facts.

```json
{
  "schema_version": "clinical-intake-v1",
  "selected_language": "gu",
  "detected_language": "gu",
  "language_match": true,
  "language_confidence": 0.96,
  "transcript": {
    "text": "exact patient transcript",
    "source": "BROWSER_TRANSCRIPT | SERVER_TRANSCRIPTION | PATIENT_TYPED",
    "created_at": "ISO-8601 timestamp"
  },
  "clinical_intake": {
    "chief_complaint": "weakness",
    "duration": "3 days",
    "symptoms": ["dizziness", "fatigue"],
    "negative_symptoms": [],
    "possible_symptom_categories": ["GENERAL_SYSTEMIC"],
    "relevant_history": [],
    "medications": [],
    "allergies": [],
    "allergy_status": "REPORTED | NONE_REPORTED | UNKNOWN",
    "urgency": "LOW | MODERATE | HIGH | EMERGENCY"
  },
  "confidence": {
    "transcription": 0.94,
    "language": 0.96,
    "chief_complaint": 0.88,
    "symptoms": 0.86,
    "duration": 0.91,
    "category": 0.82,
    "allergies": 0.90,
    "urgency": 0.80,
    "overall": 0.87
  },
  "provenance": {
    "original_text": "PATIENT_TYPED | PATIENT_SPOKEN_TRANSCRIPT",
    "detected_language": "AI_DETECTED | USER_SELECTED | UNKNOWN",
    "structured_fields": "AI_EXTRACTED | DETERMINISTIC_FALLBACK | PATIENT_EDITED"
  },
  "patient_confirmed": false,
  "patient_confirmed_at": null
}
```

## Extraction rules

- Extract only explicitly stated information.
- Translate meaning to English for normalized clinical fields.
- Keep the original language transcript unchanged.
- Keep symptom values as individual items, not a paragraph.
- Extract duration only when stated or safely normalized from an explicit date
  expression.
- Extract allergies separately from medications.
- Support explicit allergy negatives such as “no known allergies.”
- Preserve negative symptoms separately; do not turn a denied symptom into a
  positive symptom.
- Use broad categories only, for example:
  `GENERAL_SYSTEMIC`, `RESPIRATORY`, `GASTROINTESTINAL`, `NEUROLOGICAL`,
  `MUSCULOSKELETAL`, `DERMATOLOGICAL`, `CARDIOVASCULAR`.
- Do not map symptoms to a diagnosis.
- Do not infer a disease from a category.
- Flag emergency language for clinician attention without diagnosing.
- Mark uncertain or missing values instead of guessing.

## Patient review and confirmation

The patient review screen must show:

1. Original transcript/text and language metadata.
2. Every normalized structured field.
3. Allergies and allergy status.
4. Possible symptom categories.
5. Confidence/provenance indicators.
6. Editable structured fields.
7. A clear confirmation action.

Only confirmed structured intake may be stored as the doctor's confirmed
encounter intake. A failed extraction must not silently submit demo data.

## Canonical persistence changes for the future implementation

When this pipeline is implemented, add or migrate fields in the canonical
Mongoose model as needed, preferably keeping backward compatibility:

- `SymptomIntake.language`
- `SymptomIntake.detected_language`
- `SymptomIntake.language_confidence`
- `SymptomIntake.possible_symptom_categories`
- `SymptomIntake.negative_symptoms`
- `SymptomIntake.relevant_history`
- `SymptomIntake.medications`
- `SymptomIntake.allergies`
- `SymptomIntake.allergy_status`
- `SymptomIntake.transcription_source`
- `SymptomIntake.transcription_confidence`
- `SymptomIntake.patient_confirmed`
- `SymptomIntake.patient_confirmed_at`
- `SymptomIntake.pipeline_version`

The current UI intentionally displays these fields as blank when they are not
stored yet.

## API and security requirements

- Patient requests must use the authenticated patient session.
- Intake writes must verify the encounter belongs to the patient.
- Doctor reads must verify the encounter belongs to the authenticated doctor.
- Closed encounters must reject doctor reads and writes.
- Raw audio must never be returned to the patient or doctor after closure.
- Do not log API keys, raw audio, or unnecessary patient text.
- Add audit events for extraction, patient confirmation, correction, and
  extraction failure.
- Keep the original transcript and structured output separately identifiable.

## Acceptance criteria

- Gujarati, Hindi, Marathi, English, and code-mixed speech/text are handled
  without crashing.
- Selected language is honored as a hint, while detected language is stored
  independently.
- Browser transcript and server transcription paths produce the same output
  schema.
- Empty/failed extraction produces a visible error or review state, never fake
  symptoms.
- Patient can edit and confirm the structure.
- Doctor sees original intake, structured intake, language, categories,
  allergies, confidence, provenance, previous same-doctor intake, notes, and
  published reports during Revisiting.
- Other doctors' notes and intake remain sealed.
- Existing patient queue/waiting-room and bounded-access rules continue to
  work.
