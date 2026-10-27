# Output Specification

Audit Date: 2026-10-03
Based on: real pipeline execution against `samples/reports/sample.pdf`

---

## A. Current Actual Output (PipelineResult)

The pipeline returns a `PipelineResult` dataclass with these fields:

### 1. Source / Document Information

```json
"source": {
    "input_type": "text_pdf",
    "path": "samples/reports/sample.pdf",
    "page_count": 4,
    "ocr_pages": 0,
    "ocr_confidence": null,
    "warnings": []
}
```

- `input_type`: `"text_pdf"` | `"scanned_pdf"` | `"image"`
- `ocr_pages`: always 0 for digital PDFs

### 2. Patient Information

```json
"patient": {
    "age": 34,
    "age_value": 34,
    "age_unit": "years",
    "sex": "male"
}
```

- Dual representation for backward compatibility
- `age` is None for non-year units (months/weeks/days)

### 3. CBC Observations (`tests` list)

```json
"tests": [
    {
        "raw_name": "Hemoglobin",
        "canonical_name": "hemoglobin",
        "value": 15.9,
        "unit": "g/dl",
        "reference_raw": "[13.0-18.0]"
    },
    {
        "raw_name": "Total RBC Count",
        "canonical_name": "rbc",
        "value": 5.41,
        "unit": "mill/cmm",
        "reference_raw": "[4.7-6.0]"
    },
    ...
]
```

14 tests detected for sample.pdf (all supported CBC markers).

### 4. Coverage

```json
"coverage": {
    "status": "COMPLETE",
    "expected_count": 14,
    "detected_count": 14,
    "missing_count": 0,
    "coverage_percent": 100.0,
    "detected_markers": ["basophils", "eosinophils", "hematocrit", ...],
    "missing_markers": [],
    "duplicate_markers": [],
    "unknown_markers": []
}
```

### 5. Validation

```json
"validation": {
    "status": "VALID",
    "can_analyze": true,
    "tests_detected": 14,
    "valid_tests": 14,
    "issues": [],
    "user_questions": [],
    "validated_test_data": [ ... ]
}
```

Validation also adds `reference_parsed` to each validated test:

```json
{
    "canonical_name": "hemoglobin",
    "value": 15.9,
    "unit": "g/dl",
    "reference_raw": "[13.0-18.0]",
    "reference_parsed": { "parsed": true, "min": 13.0, "max": 18.0 }
}
```

### 6. Plausibility

```json
"plausibility": {
    "checked_tests": 14,
    "verification_required_count": 0,
    "requires_verification": false,
    "verification_required": [],
    "results": [
        {"status": "PLAUSIBLE", "test": "hemoglobin", "value": 15.9},
        ...
    ]
}
```

### 7. Raw/Cleaned Text

- `raw_text`: raw PyMuPDF output with PAGE markers
- `cleaned_text`: cleaned version after text_cleaner

---

## B. SwasthSetu 2.0 Expected Output Fields

| Field | SwasthSetu Requirement |
|-------|---------------------|
| source.input_type | Document provenance |
| source.pdf_path | Original PDF reference (unmodified) |
| source.page_count | Document metadata |
| patient.age_value + age_unit | Patient context |
| patient.sex | Patient context |
| test.raw_name | Test name as it appeared in report |
| test.canonical_name | Normalized test name |
| test.value | Extracted numeric value |
| test.unit | Extracted unit (preserved even if ambiguous) |
| test.reference_raw | Reference range from report (never invented) |
| test.reference_parsed | Structured min/max from report range |
| test.status | HIGH / LOW / NORMAL classification |
| test.needs_review | Boolean NEEDS_REVIEW flag per test |
| validation.can_analyze | Structural gate |
| plausibility.requires_verification | Plausibility gate |
| confidence_decision | HIGH_CONFIDENCE / NEEDS_REVIEW explicit enum |
| publish_blocked | Boolean: cannot publish while any NEEDS_REVIEW exists |
| template_explanation | Fixed patient-facing explanation |
| provenance.source | "laboratory_report" for ranges from report |

---

## C. Field-by-Field Comparison

| Field | Current Output | SwasthSetu Required | Status |
|-------|---------------|-------------------|--------|
| source.input_type | ✅ text_pdf / scanned_pdf / image | Provenance | ✅ PRESENT |
| source.path | ✅ original path stored | File reference | ✅ PRESENT |
| source.ocr_pages | ✅ always 0 for digital PDFs | OCR tracking | ✅ PRESENT |
| patient.age_value | ✅ numeric age | Patient context | ✅ PRESENT |
| patient.age_unit | ✅ years/months/weeks/days | Patient context | ✅ PRESENT |
| patient.sex | ✅ male/female | Patient context | ✅ PRESENT |
| test.raw_name | ✅ as-seen in report | Provenance | ✅ PRESENT |
| test.canonical_name | ✅ normalized (14 aliases) | Normalization | ✅ PRESENT |
| test.value | ✅ float | Observation | ✅ PRESENT |
| test.unit | ✅ preserved from report | Unit | ✅ PRESENT |
| test.reference_raw | ✅ from report only | Reference (no invention) | ✅ PRESENT |
| test.reference_parsed.min/max | ✅ simple min-max | Reference resolution | 🟡 PARTIAL (simple only) |
| test.status (HIGH/LOW/NORMAL) | ❌ not generated | Classification | ❌ MISSING |
| test.needs_review | ❌ no per-test flag | NEEDS_REVIEW | ❌ MISSING |
| plausibility per test | ✅ PLAUSIBLE/VERIFY | Plausibility | ✅ PRESENT |
| confidence_decision enum | ❌ not explicit | HIGH_CONFIDENCE/NEEDS_REVIEW | ❌ MISSING |
| publish_blocked | ❌ not implemented | Blocking gate | ❌ MISSING |
| template_explanation | ❌ not generated | Patient explanation | ❌ MISSING |
| provenance.source | 🟡 "laboratory_report" in resolver | Provenance | 🟡 EXISTS but not connected |

---

## D. Missing Fields (required by SwasthSetu, not currently generated)

1. **`test.status`** — HIGH / LOW / NORMAL per observation
2. **`test.needs_review`** — boolean per test
3. **`confidence_decision`** — explicit HIGH_CONFIDENCE / NEEDS_REVIEW report-level enum
4. **`publish_blocked`** — boolean gate preventing publish while any NEEDS_REVIEW
5. **`template_explanation`** — fixed/template patient-facing text
6. **`lab_review_required`** — routing flag for human review queue

---

## E. Extra Fields (currently generated, not specifically required by SwasthSetu 2.0)

1. **`raw_text`** — full raw PyMuPDF text (useful for debugging; not a SwasthSetu output requirement)
2. **`cleaned_text`** — intermediate text (useful for debugging)
3. **`coverage.unknown_markers`** — parser artifact
4. **`coverage.duplicate_markers`** — parser artifact

---

## F. Fields That Should NOT Be Generated Under SwasthSetu

1. AI-generated free-form medical interpretation → ❌ NOT generated (correct)
2. Disease diagnosis → ❌ NOT generated (correct)
3. Treatment recommendations → ❌ NOT generated (correct)
4. Generative clinical context → ❌ NOT generated (correct)

Note: The knowledge_engine can generate findings/patterns but is NOT connected to the pipeline. If connected, its output could conflict with SwasthSetu's constrained explanation model.

---

## Sample Report 1 — sample.pdf (Full Result)

```
PDF: sample.pdf | Type: text_pdf | Pages: 4 | OCR pages: 0
Patient: age=34 years, sex=male
Tests: 14/14 CBC markers detected (100% coverage)
Coverage: COMPLETE
Validation: VALID | can_analyze: true | valid_tests: 14 | issues: 0
Plausibility: checked=14, requires_verification=false
Final decision: all gates pass → ready for next stage

Extracted Tests:
  hemoglobin    | 15.9  | g/dl     | [13.0-18.0] | PLAUSIBLE
  rbc           | 5.41  | mill/cmm | [4.7-6.0]   | PLAUSIBLE
  hematocrit    | 49.2  | %        | [42-52]     | PLAUSIBLE
  mcv           | 90.94 | femtolitre | [78-100]  | PLAUSIBLE
  mch           | 29.39 | pg       | [27-31]     | PLAUSIBLE
  mchc          | 32.3  | g/dl     | [32-36]     | PLAUSIBLE
  rdw           | 14.3  | %        | [11.5-14.0] | PLAUSIBLE
  wbc           | 9300  | /ul      | [4000-10000]| PLAUSIBLE
  neutrophils   | 71.0  | %        | [60 - 70]   | PLAUSIBLE
  lymphocytes   | 22.0  | %        | [20 - 40]   | PLAUSIBLE
  eosinophils   | 2.0   | %        | [1 - 4]     | PLAUSIBLE
  monocytes     | 5.0   | %        | [2 - 8]     | PLAUSIBLE
  basophils     | 0.0   | %        | [0 - 1]     | PLAUSIBLE
  platelets     | 167000| /ul      | [150000-450000] | PLAUSIBLE
```

## Sample Report 2 — sample2.pdf (Full Result)

```
PDF: sample2.pdf | Type: text_pdf | Pages: ? | OCR pages: 0
Patient: age=null, sex=null (not found in report)
Tests: 0 detected (NO CBC markers in recognizable format)
Coverage: NO_COVERAGE (0%)
Validation: UNSAFE_TO_ANALYZE | can_analyze: false
  Issues: missing_age, missing_sex, "No supported blood tests were detected"
Plausibility: skipped (can_analyze=false)
Final decision: BLOCKED — patient info missing, no tests detected
```
