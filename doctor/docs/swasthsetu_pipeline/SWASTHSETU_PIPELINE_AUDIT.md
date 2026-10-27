# SwasthSetu 2.0 Pipeline Audit

**Audit Date:** 2026-10-03  
**Repository:** blood-report-analysis-ai  
**Auditor:** Automated code trace + real pipeline execution  
**Instruction:** AUDIT ONLY — no production code was modified  

---

## 1. Executive Summary

The blood-report-analysis-ai repository contains a **working CBC extraction pipeline** that is substantially aligned with the SwasthSetu 2.0 report-processing specification. The digital PDF path (the primary SwasthSetu path) runs end-to-end and correctly produces structured CBC observations from a real sample report.

**What works today:**
- Digital PDF extraction (PyMuPDF, zero OCR for text PDFs)
- CBC parsing for 14 markers via rules/regex only
- Test-name normalization via canonical alias map
- Reference range parsing (simple min-max from report)
- Structural validation (patient context + test completeness)
- Plausibility checking (broad extraction sanity bounds)
- Implicit confidence decision (can_analyze + requires_verification)
- Original PDF preservation (temp-file pattern, always deleted)
- Full error handling with user-facing messages
- 140 tests, all passing

**What is missing for full SwasthSetu 2.0 compliance:**
1. **HIGH / LOW / NORMAL** classification per test (most critical)
2. **Formal NEEDS_REVIEW enum** in output structure
3. **Publish blocking gate** (no report is publishable while any observation is NEEDS_REVIEW)
4. **Template patient-facing explanation**
5. **Reference resolver not wired** — `interpretation/reference_resolver.py` exists and is tested but is NOT called by the pipeline; only the simpler validator-internal parser is active

**Knowledge engine:** NOT connected to the report pipeline. Exists as legacy Blood Report project infrastructure. Does NOT affect the SwasthSetu 2.0 report flow.

**OCR:** Fully implemented and connected as an *optional/fallback* path. For digital PDFs it is never invoked. For scanned PDFs or image uploads it is triggered but requires locally provisioned PaddleOCR models. This is consistent with SwasthSetu 2.0 specifying digital PDF as the primary path.

**Bottom line:** The core extraction pipeline is ready. Three specific output fields (HIGH/LOW/NORMAL, NEEDS_REVIEW, template explanation) and one gate (publish blocking) must be implemented before the pipeline meets full SwasthSetu 2.0 requirements.

---

## 2. Repository Components Inspected

| Component | Files Inspected | Notes |
|-----------|-----------------|-------|
| `app.py` | 1 | Streamlit UI; active entry point |
| `main.py` | 1 | CLI runner; legacy path; not used by UI |
| `ui_uploads.py` | 1 | Upload routing adapter; active |
| `extraction/` | 8 files | All active pipeline files |
| `vision/` | 12 files | OCR infrastructure; conditionally active |
| `interpretation/` | 3 files | reference_resolver.py implemented but not connected |
| `knowledge_engine/` | 25 files | Fully scaffolded engine; NOT connected to pipeline |
| `medical_reference/` | 9 files | Empty scaffolds + mayo/ data; NOT connected |
| `tests/` | 38 files | 140 tests; all pass |
| `samples/reports/` | 2 PDFs | sample.pdf (success), sample2.pdf (no markers found) |
| `architecture.md` | 1 | Partially outdated; predates vision/ and pipeline.py |
| `database_schema_design.md` | 1 | Future data layer schema |
| `docs/ocr_setup.md` | 1 | PaddleOCR model provisioning guide |
| `requirements.txt` | 1 | streamlit, PyMuPDF, numpy, opencv, paddlepaddle, paddleocr, paddlex, PyYAML, pytest |

---

## 3. Actual Runtime Pipeline

Entry point (UI): `streamlit run app.py`

```
app.py::main()
  → ui_uploads.py::process_uploaded_file(file_bytes, filename)
      writes bytes to NamedTemporaryFile (PDF only)
  → extraction/pipeline.py::process(temp_path)
      → vision/pdf_classifier.py::classify_pdf(path)
          classifies per-page as TEXT or SCANNED (threshold: 50 embedded chars)
      [if is_fully_text — PRIMARY PATH]
      → extraction/pipeline.py::_process_text_pdf(path)
          PyMuPDF page-by-page text extraction, PAGE markers, ocr_pages=0
      [if not is_fully_text — FALLBACK PATH]
      → extraction/pipeline.py::_process_scanned_pdf(path)
          → vision/scanned_pdf_reader.py::read_pdf()
              → vision/pdf_renderer.py (render pages)
              → vision/preprocessor.py (image preprocessing)
              → vision/ocr_paddle.py::PaddleOCREngine.extract()
                  [requires provisioned PaddleOCR models]
      → extraction/pipeline.py::_run_extraction(raw_text)
          → extraction/text_cleaner.py::clean_pdf_text()
          → extraction/patient_parser.py::extract_patient_context()
          → extraction/parser.py::parse_cbc()
          → extraction/coverage.py::check_cbc_coverage()
          → extraction/validator.py::validate_report()
          → extraction/plausibility.py::check_report_plausibility()
              [ONLY if validation["can_analyze"] is True]
      returns PipelineResult(source, raw_text, cleaned_text, patient,
                             tests, coverage, validation, plausibility)
  → app.py::_show_results(result)
      renders metrics, test table, warnings, technical JSON
```

**Status of every step:**

| Step | File | Function | Status | Errors Handled |
|------|------|----------|--------|----------------|
| Upload routing | `ui_uploads.py` | `process_uploaded_file()` | ACTIVE | UploadValidationError for empty/bad files |
| PDF classify | `vision/pdf_classifier.py` | `classify_pdf()` | ACTIVE | FileNotFoundError, ValueError |
| Text PDF extraction | `extraction/pipeline.py` | `_process_text_pdf()` | ACTIVE | ValueError if no embedded text |
| Scanned PDF / OCR | `extraction/pipeline.py` | `_process_scanned_pdf()` | ACTIVE/OPTIONAL | OCRModelUnavailableError if models absent |
| Image OCR | `extraction/pipeline.py` | `_process_image()` | ACTIVE/OPTIONAL | Same |
| Text cleaning | `extraction/text_cleaner.py` | `clean_pdf_text()` | ACTIVE | None needed (pure transform) |
| Patient parsing | `extraction/patient_parser.py` | `extract_patient_context()` | ACTIVE | Returns empty dict if nothing found |
| CBC parsing | `extraction/parser.py` | `parse_cbc()` | ACTIVE | Returns empty list if no markers found |
| Coverage check | `extraction/coverage.py` | `check_cbc_coverage()` | ACTIVE | Handles empty test list |
| Validation | `extraction/validator.py` | `validate_report()` | ACTIVE | Produces issue list; does not throw |
| Plausibility | `extraction/plausibility.py` | `check_report_plausibility()` | ACTIVE | Conditional on can_analyze |

---

## 4. Pipeline Files

See `PIPELINE_FILE_MAP.md` for the full categorized table.

**Summary:**
- **A. Active pipeline:** 11 files
- **B. Active dependencies:** 7 files
- **C. Optional/fallback:** 3 functions (scanned PDF + image OCR paths)
- **D. Implemented but not connected:** 2 files (`reference_resolver.py`, `age_boundary.py`)
- **E. Legacy/extra:** `main.py` + entire `knowledge_engine/` + `medical_reference/`
- **F. Test only:** 38 test files
- **G. Documentation only:** 4 files

---

## 5. Sample Report Execution

### sample.pdf — SUCCESS (Ideal Case)

```
Input:        samples/reports/sample.pdf
Type:         text_pdf (digital PDF, 4 pages)
OCR pages:    0
Patient:      age=34 years, sex=male
Tests found:  14 / 14 (100% coverage)
Coverage:     COMPLETE
Validation:   VALID  |  can_analyze=true  |  valid_tests=14  |  issues=0
Plausibility: checked=14, requires_verification=false
All tests:    PLAUSIBLE

Extracted Observations:
  hemoglobin   | 15.9    | g/dl        | ref: [13.0-18.0] | parsed: 13.0–18.0
  rbc          | 5.41    | mill/cmm    | ref: [4.7-6.0]   | parsed: 4.7–6.0
  hematocrit   | 49.2    | %           | ref: [42-52]     | parsed: 42.0–52.0
  mcv          | 90.94   | femtolitre  | ref: [78-100]    | parsed: 78.0–100.0
  mch          | 29.39   | pg          | ref: [27-31]     | parsed: 27.0–31.0
  mchc         | 32.3    | g/dl        | ref: [32-36]     | parsed: 32.0–36.0
  rdw          | 14.3    | %           | ref: [11.5-14.0] | parsed: 11.5–14.0
  wbc          | 9300.0  | /ul         | ref: [4000-10000]| parsed: 4000–10000
  neutrophils  | 71.0    | %           | ref: [60-70]     | parsed: 60.0–70.0
  lymphocytes  | 22.0    | %           | ref: [20-40]     | parsed: 20.0–40.0
  eosinophils  | 2.0     | %           | ref: [1-4]       | parsed: 1.0–4.0
  monocytes    | 5.0     | %           | ref: [2-8]       | parsed: 2.0–8.0
  basophils    | 0.0     | %           | ref: [0-1]       | parsed: 0.0–1.0
  platelets    | 167000  | /ul         | ref: [150000-450000] | parsed: 150000–450000

System decision: All gates pass → ready for next stage
```

### sample2.pdf — BLOCKED (Failure Case)

```
Input:        samples/reports/sample2.pdf
Type:         text_pdf (digital PDF)
OCR pages:    0
Patient:      age=null, sex=null (not found in report)
Tests found:  0 / 14 (0% coverage)
Coverage:     NO_COVERAGE
Validation:   UNSAFE_TO_ANALYZE  |  can_analyze=false
  Issues:     missing_age, missing_sex, "No supported blood tests were detected"
Plausibility: SKIPPED (can_analyze=false)
System decision: BLOCKED — cannot proceed
```

This demonstrates the safety-first design: sample2.pdf either uses a different layout that the current parser aliases do not support, or the patient header format does not match any regex. The pipeline correctly blocks analysis rather than proceeding with incomplete data.

---

## 6. Actual Output Structure

See `OUTPUT_SPECIFICATION.md` for the full field-by-field specification.

**PipelineResult structure:**
```python
@dataclass
class PipelineResult:
    source: SourceMeta        # input_type, path, page_count, ocr_pages, warnings
    raw_text: str             # pre-cleaning text
    cleaned_text: str         # post-cleaning text
    patient: dict             # age, age_value, age_unit, sex
    tests: list[dict]         # raw_name, canonical_name, value, unit, reference_raw
    coverage: dict            # status, expected/detected/missing counts, markers
    validation: dict          # status, can_analyze, issues, user_questions, validated_test_data
    plausibility: dict|None   # checked_tests, requires_verification, verification_required, results
```

**What is NOT in the output (SwasthSetu gaps):**
- No `HIGH` / `LOW` / `NORMAL` per test
- No explicit `needs_review` boolean per test
- No `confidence_decision` enum
- No `publish_blocked` flag
- No `template_explanation`

---

## 7. SwasthSetu Compliance

See `SWASTHSETU_COMPLIANCE.md` for the full 25-requirement table.

**Summary:**

| Status | Count | Requirements |
|--------|-------|--------------|
| ✅ IMPLEMENTED | 14 | PDF preservation, digital extraction, CBC-only scope, 14 markers, normalization, validation, plausibility, no diagnosis, no treatment, no interpretation, error handling, duplicate detection, file integrity, test coverage |
| 🟡 PARTIAL | 6 | Reference resolution (simple only), confidence decision, NEEDS_REVIEW, structured observations, provenance, duplicate handling |
| ❌ MISSING | 3 | HIGH/LOW/NORMAL, publish blocking, template explanation |
| ⚠️ EXTRA | 1 | OCR (implemented and connected; optional/fallback; not the demo path) |

---

## 8. Knowledge Engine Assessment

### Is it called by the report pipeline?
**NO.** There is zero import of any `knowledge_engine.*` symbol in `app.py`, `ui_uploads.py`, or `extraction/pipeline.py`. The knowledge engine is completely isolated from the active report processing path.

### What does it contain?
A fully scaffolded clinical pattern-matching engine:
- `KnowledgeEngine` (orchestrator)
- `KnowledgeMatcher` (pattern matching against findings)
- `KnowledgeScorer` (scoring matched patterns)
- `KnowledgeRegistry` (pattern registration)
- `KnowledgeGenerator` (finding text generation)
- Domain models: `Finding`, `Pattern`, `MatchResult`, `Evidence`, `Interpretation`, `LabResult`, `Patient`, `Report`, `ReferenceInterval`

### What does it generate?
It would generate `MatchResult` objects — each containing a `Pattern` name, evidence, score, and matched flag. Patterns are clinical (e.g., "microcytic anemia", "iron deficiency"). It does **not** generate free-form text automatically; the `generator.py` service exists but its output format is determined by registered patterns.

### Does it conflict with SwasthSetu 2.0?
**Potentially, if connected.** SwasthSetu 2.0 mandates:
- Fixed/template explanation (not AI-generated or pattern-derived free-form interpretation)
- No diagnosis
- No disease-name output

The knowledge engine's pattern names (e.g., "microcytic anemia") would constitute diagnostic findings, which SwasthSetu 2.0 explicitly prohibits in the patient-facing output. If connected, it would need to be strictly gated behind the lab-review layer, and its output must NOT reach the patient-facing explanation.

### Is it legacy Blood Report infrastructure?
**Yes.** The engine predates the SwasthSetu 2.0 specification. It was designed for the original Blood Report Analysis AI project, which had a broader interpretation mandate.

### What should happen to it under SwasthSetu 2.0?
- **Do NOT delete.** It is implemented and tested infrastructure.
- **Keep isolated.** Its current non-connected state is correct for SwasthSetu 2.0.
- **Future use:** It could serve as the internal lab-review reasoning layer (post-publish, not patient-facing), if SwasthSetu expands in a future version to include clinician-facing pattern detection. Its output must NEVER pass directly to the patient explanation.

---

## 9. OCR / Vision Assessment

### Is OCR implemented?
**Yes, fully.** The `vision/` package contains:
- `pdf_classifier.py` — classifies pages as TEXT or SCANNED
- `preprocessor.py` — image preprocessing pipeline
- `ocr_base.py` — abstract `BaseOCREngine` interface
- `ocr_paddle.py` — `PaddleOCREngine` (PaddleOCR 3.x / PaddleX 3.x)
- `ocr_config.py` — engine factory with local model directory resolution
- `ocr_result.py` — `OCRResult` dataclass
- `pdf_renderer.py` — PDF page → numpy image rendering
- `scanned_pdf_reader.py` — orchestrator: per-page TEXT/OCR routing

### Is OCR tested?
**Yes.** `tests/vision/` contains 6 test files. Normal tests **mock** the OCR engine — they do not require PaddleOCR models. An optional real-model smoke test (`test_ocr_model_setup.py`) exists, gated by `RUN_PADDLE_OCR_INTEGRATION=1`.

### Is OCR connected to the main pipeline?
**Yes, as a conditional fallback.** `extraction/pipeline.py::process()` calls `vision/pdf_classifier.py::classify_pdf()` on every PDF. If any page is classified as SCANNED (< 50 embedded chars), the scanned PDF path is invoked — which uses OCR.

### Does digital PDF processing invoke OCR?
**No.** For `sample.pdf` (a fully text PDF): `classify_pdf()` returned `is_fully_text=True`, `_process_text_pdf()` was called, `ocr_pages=0` in the result. OCR is never invoked for clean digital PDFs.

### Can scanned PDFs currently be processed?
**Conditionally.** The code path is implemented and connected. However, it requires PaddleOCR models to be provisioned locally (`~/.paddlex/official_models/PP-OCRv5_server_det` and `en_PP-OCRv5_mobile_rec`). Without models, `OCRModelUnavailableError` is raised.

### SwasthSetu 2.0 alignment:
- SwasthSetu 2.0 specifies **digital PDF as the primary/demo path** — ✅ this is what the pipeline does by default
- OCR is **future extension** in SwasthSetu — ✅ OCR exists as optional fallback, not the demo path
- **Recommendation:** OCR should remain as-is. It is correct infrastructure. Do not remove it. Do not promote it to the primary path. It serves as the foundation for a future SwasthSetu scanned-report capability.

---

## 10. Tests

### Test Run Results
```
Command: python -m pytest tests/ -v
Result:  140 passed  |  0 failed  |  0 skipped  |  0 errors
Runtime: ~8 seconds
```

### Test Coverage by Category

| Category | Test Files | Test Count (approx.) | Status |
|----------|-----------|---------------------|--------|
| A. PDF extraction | `tests/extraction/test_pipeline.py` | ~22 | ✅ All pass |
| B. CBC parsing | `tests/extraction/test_pipeline.py` (indirectly) | ~5 | ✅ All pass |
| C. Normalization (patient) | `tests/extraction/test_patient_parser.py` | ~12 | ✅ All pass |
| D. Reference ranges | `tests/interpretation/` | ~15 | ✅ All pass |
| E. Validation | `tests/extraction/test_validator.py` | ~5 | ✅ All pass |
| F. Plausibility | `tests/extraction/test_plausibility.py` | ~10 | ✅ All pass |
| G. Confidence/review | `tests/extraction/test_pipeline.py` | ~5 | ✅ All pass |
| H. OCR/vision | `tests/vision/` (6 files), `tests/test_ocr_model_setup.py` | ~15 | ✅ All pass (mocked) |
| I. Knowledge engine | `tests/knowledge_engine/` (21 files) | ~51 | ✅ All pass |
| J. Integration/E2E | `tests/extraction/test_pipeline.py` | ~10 | ✅ All pass |
| K. UI upload | `tests/test_ui_uploads.py` | ~5 | ✅ All pass |

### Missing Test Coverage (SwasthSetu gaps)

| Missing Test | Reason |
|--------------|--------|
| HIGH/LOW/NORMAL per test | Feature not implemented |
| NEEDS_REVIEW enum in output | Feature not implemented |
| Publish blocking while NEEDS_REVIEW exists | Feature not implemented |
| Template explanation generation | Feature not implemented |
| reference_resolver.py wired into pipeline | Not connected |

---

## 11. Current vs Expected Pipeline Diagram

### Current Implementation (ACTUAL)

```
[USER UPLOADS PDF]
        ↓
[ACTIVE] app.py → ui_uploads.py → process_uploaded_file()
        ↓
[ACTIVE] extraction/pipeline.py::process()
        ↓
[ACTIVE] vision/pdf_classifier.py::classify_pdf()
     ┌──┴──────────────────────────────────────────────────┐
     │ is_fully_text                   │ has scanned pages │
     ▼                                 ▼                   │
[ACTIVE]                          [ACTIVE/OPTIONAL]        │
_process_text_pdf()               _process_scanned_pdf()   │
(PyMuPDF, ocr_pages=0)           (PaddleOCR — needs models)│
     └──────────────────────────────────────────────────────┘
        ↓
[ACTIVE] _run_extraction(raw_text)
        ↓
[ACTIVE] text_cleaner → patient_parser → parser → coverage → validator → plausibility
        ↓
[ACTIVE] PipelineResult returned (source, patient, tests, coverage, validation, plausibility)
        ↓
[ACTIVE] app.py renders metrics + test table (no HIGH/LOW/NORMAL)

[NOT CONNECTED] interpretation/reference_resolver.py
[NOT CONNECTED] knowledge_engine/ (entire package)
[NOT CONNECTED] medical_reference/
[LEGACY]        main.py (CLI path)
```

### SwasthSetu 2.0 Expected Flow

```
[Original PDF] → preserved unmodified
        ↓
[Digital PDF Text Extraction] → PyMuPDF
        ↓
[CBC Report Parser] → rules/regex, 14 markers
        ↓
[Test-name Normalization] → canonical alias map
        ↓
[Reference Range Resolution] → from report; never invented; age/sex-aware
        ↓
[Validation] → patient, tests, units, reference structure
        ↓
[Plausibility checks] → sanity bounds; implausible → NEEDS_REVIEW
        ↓
[Confidence Decision] → HIGH_CONFIDENCE | NEEDS_REVIEW
        ↓
[Publish Gate] → BLOCKED if any NEEDS_REVIEW observation
        ↓
[Lab Review] → human reviews NEEDS_REVIEW observations
        ↓
[Publish]
        ↓
[Structured Laboratory Observations] → with HIGH/LOW/NORMAL per test
        ↓
[Template Patient Explanation] → fixed text, no diagnosis, no treatment
```

---

## 12. Gaps

| Gap | Priority | File(s) Needed |
|-----|----------|----------------|
| HIGH/LOW/NORMAL per test | HIGH | New function comparing value vs reference_parsed; wire into pipeline.py |
| NEEDS_REVIEW formal flag per test | HIGH | Add to PipelineResult or per-test dict; combine plausibility VERIFY + missing coverage |
| Publish blocking gate | HIGH | New field `publish_blocked` in PipelineResult; set True if any NEEDS_REVIEW |
| Template patient explanation | HIGH | New module; fixed message; no diagnosis; no treatment; no AI generation |
| reference_resolver.py wired in | MEDIUM | Import in pipeline.py or validator.py; replace simple parse_simple_reference_range |
| Patient validation for non-year ages | LOW | validator.py currently checks `patient["age"]` (years only) |
| Lab review routing mechanism | MEDIUM | Future: queue/workflow; not a code-only concern |

---

## 13. Extra / Legacy Components

| Component | Current State | Recommendation |
|-----------|--------------|----------------|
| `knowledge_engine/` | Fully implemented, NOT connected to pipeline | Keep isolated; suitable for future clinician-facing layer only; never expose to patient-facing path |
| `medical_reference/` | Empty scaffolds (provider.py, models.py = 0 bytes); mayo/ exists | Keep as future foundation; wire when reference resolution needs curated ranges |
| `main.py` | Legacy CLI orchestrator; duplicates pipeline logic; not the UI path | Keep for CLI/testing; do not maintain separately from pipeline.py |
| OCR / vision | Implemented and conditionally connected; not the primary SwasthSetu path | Keep as-is; future scanned report capability |
| `interpretation/reference_resolver.py` | Fully implemented, tested, NOT connected | High-priority: connect to pipeline for age/sex-aware reference resolution |
| `raw_text` in PipelineResult | Captured and stored; not required by SwasthSetu | Optional: keep for debugging; exclude from patient-facing output |

---

## 14. Risks

| Risk | Severity | Detail |
|------|----------|--------|
| Parser is format-specific | HIGH | `parser.py` TEST_ALIASES assume a specific lab report layout; sample2.pdf produced 0 test detections. New report layouts will require alias expansion. |
| No HIGH/LOW/NORMAL | HIGH | Pipeline currently cannot determine if a test result is within or outside the reference range, despite having both the value and reference_parsed min/max available. |
| `patient["age"]` validation | MEDIUM | `validate_patient_context()` checks `patient["age"]` (years integer); for patients measured in months/weeks/days `age` is None → triggers USER_INPUT_REQUIRED even if age_value+age_unit are valid. |
| OCR requires model provisioning | MEDIUM | PaddleOCR models must be manually provisioned. Scanned PDFs fail with `OCRModelUnavailableError` without them. |
| knowledge_engine connection risk | MEDIUM | If knowledge_engine is wired to the pipeline without SwasthSetu-aware gating, its diagnostic pattern names would violate the no-diagnosis constraint. |
| reference_resolver not connected | MEDIUM | Sex-specific and age-banded reference ranges (e.g., "Male: 13-17, Female: 12-15") cannot be resolved — they fall back to NaN in the validator's simple parser. |

---

## 15. Recommended Next Steps (Chunk 2)

In priority order, for the next implementation chunk:

1. **Implement HIGH/LOW/NORMAL classification**
   - Add a function that compares `test.value` vs `test.reference_parsed.min/max`
   - Wire into `_run_extraction()` or as a post-processing step in `pipeline.py`
   - Output: `test.status = "HIGH" | "LOW" | "NORMAL" | "UNKNOWN"`

2. **Add formal NEEDS_REVIEW flag**
   - `test.needs_review = True` when plausibility is VERIFY, or reference is missing/unparsable, or unit is unrecognized
   - Add `report.needs_review = any(test.needs_review for test in tests)`

3. **Implement publish_blocked gate**
   - `PipelineResult.publish_blocked = True` when any test is NEEDS_REVIEW
   - Block report progression in `_status_message()` / decision layer

4. **Wire `interpretation/reference_resolver.py` into pipeline**
   - Replace `parse_simple_reference_range()` in `validator.py` with `resolve_reference()` from `reference_resolver.py`
   - This adds sex-specific and age-banded range support automatically

5. **Template patient explanation**
   - Small new module: fixed message tier based on coverage/confidence
   - Examples: "Your CBC results have been extracted. Please discuss them with your doctor."
   - No diagnosis, no treatment, no AI generation

6. **Fix patient age validation for non-year units**
   - Update `validate_patient_context()` to accept `age_value + age_unit` in addition to `age`
