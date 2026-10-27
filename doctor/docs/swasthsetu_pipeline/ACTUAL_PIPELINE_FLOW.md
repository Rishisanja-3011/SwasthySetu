# Actual Pipeline Flow

Audit Date: 2026-10-03
Evidence: Code tracing + real sample PDF execution.

---

## ACTUAL RUNTIME FLOW (Digital PDF path — PRIMARY)

```
USER UPLOADS PDF
   │
   ▼
[ACTIVE] app.py::main()
   File: app.py
   Input: Streamlit file_uploader bytes + filename
   Output: routes to process_uploaded_file()
   │
   ▼
[ACTIVE] ui_uploads.py::process_uploaded_file()
   File: ui_uploads.py
   Input: file_bytes (bytes), filename (str)
   Output: PipelineResult
   Behavior: writes PDF bytes to NamedTemporaryFile, calls pipeline(temp_path)
             deletes temp file in finally block — ORIGINAL NOT MODIFIED
   │
   ▼
[ACTIVE] extraction/pipeline.py::process()
   File: extraction/pipeline.py
   Input: path (str/Path)
   Output: PipelineResult
   Behavior: detects numpy array vs file path; for PDF, calls classify_pdf()
   │
   ▼
[ACTIVE] vision/pdf_classifier.py::classify_pdf()
   File: vision/pdf_classifier.py
   Input: pdf_path (Path)
   Output: PDFClassification (per-page TEXT/SCANNED type)
   Behavior: uses PyMuPDF to count embedded chars per page; >= 50 chars = TEXT
   │
   ├── if is_fully_text: ─────────────────────────────────────────────────────┐
   │                                                                           │
   ▼                                                                           │
[ACTIVE] extraction/pipeline.py::_process_text_pdf()                          │
   File: extraction/pipeline.py                                                │
   Input: path (Path)                                                          │
   Output: (raw_text: str, SourceMeta)                                        │
   Behavior: PyMuPDF page-by-page text extraction with PAGE markers           │
   ocr_pages=0 in SourceMeta                                                  │
   │                                                                           │
   │    if NOT is_fully_text: ─────────────────────────────────────────────── │ ──┐
   │                                                                               │
   │                                                                               ▼
   │                                                             [ACTIVE] extraction/pipeline.py::_process_scanned_pdf()
   │                                                                File: extraction/pipeline.py
   │                                                                Calls: vision.scanned_pdf_reader.read_pdf()
   │                                                                Calls: vision.preprocessor.preprocess_image()
   │                                                                Calls: vision.ocr_paddle.PaddleOCREngine (OCR)
   │                                                                Status: ACTIVE but requires PaddleOCR models
   │                                                                        → OCRModelUnavailableError if models absent
   │                                                                        → NOT the demo/primary path
   │                                                                        ←──────────────────────────────┘
   │
   ▼ (both paths join here)
[ACTIVE] extraction/pipeline.py::_run_extraction(raw_text)
   File: extraction/pipeline.py
   Input: raw_text (str)
   Output: (cleaned, patient, tests, coverage, validation, plausibility)
   │
   ├──▶ [ACTIVE] extraction/text_cleaner.py::clean_pdf_text()
   │        Input: raw_text (str)
   │        Output: cleaned_text (str)
   │        Behavior: strips PAGE markers, separator chars, normalizes whitespace
   │
   ├──▶ [ACTIVE] extraction/patient_parser.py::extract_patient_context()
   │        Input: cleaned_text (str)
   │        Output: patient dict {age, age_value, age_unit, sex}
   │        Behavior: regex patterns for "Age/Gender: 34 Years/Male" etc.
   │
   ├──▶ [ACTIVE] extraction/parser.py::parse_cbc()
   │        Input: cleaned_text (str)
   │        Output: list of test dicts [{raw_name, canonical_name, value, unit, reference_raw}]
   │        Behavior: TEST_ALIASES dict (14 markers), line-window pattern matching
   │        Strategy: RULES/REGEX ONLY — no LLM, no ML
   │
   ├──▶ [ACTIVE] extraction/coverage.py::check_cbc_coverage()
   │        Input: tests list
   │        Output: coverage dict {status, expected_count, detected_count, ...}
   │        Behavior: compares detected canonical names to SUPPORTED_CBC_MARKERS (14)
   │
   ├──▶ [ACTIVE] extraction/validator.py::validate_report()
   │        Input: patient dict, tests list
   │        Output: validation dict {status, can_analyze, issues, user_questions, validated_test_data}
   │        Behavior: validates patient age/sex, validates each test (value/unit/reference),
   │                  parses reference ranges, produces USER_INPUT_REQUIRED or EXTRACTION_ERROR issues
   │
   └──▶ [ACTIVE — conditional] extraction/plausibility.py::check_report_plausibility()
            Input: validated_test_data list (from validation)
            Output: plausibility dict {checked_tests, verification_required_count, requires_verification, verification_required, results}
            Called ONLY IF: validation["can_analyze"] is True
            Behavior: broad extraction sanity bounds per marker (not clinical ranges)
   │
   ▼
[ACTIVE] extraction/pipeline.py → PipelineResult returned
   Fields: source, raw_text, cleaned_text, patient, tests, coverage, validation, plausibility
   │
   ▼
[ACTIVE] app.py::_show_results() / main.py display functions
   Behavior: renders metrics, patient details, test table with plausibility flags,
             warnings expander, technical details JSON expander
   HIGH/LOW/NORMAL: ❌ NOT GENERATED by current pipeline
   Publish decision: ⚠️ PARTIAL — "ready for next analysis stage" message, but no
                     formal PUBLISH/BLOCK mechanism
```

---

## OPTIONAL / FALLBACK PATH (Image / OCR)

```
USER UPLOADS IMAGE (JPG/PNG)
   │
   ▼
[ACTIVE] ui_uploads.py::decode_image_upload()
   Decodes bytes → numpy array via OpenCV
   │
   ▼
[ACTIVE] ui_uploads.py::process_uploaded_file()
   Calls pipeline(numpy_array)
   │
   ▼
[ACTIVE] extraction/pipeline.py::process(numpy array)
   Calls _process_image()
   │
   ▼
[ACTIVE but MODEL-DEPENDENT] extraction/pipeline.py::_process_image()
   Calls: vision.preprocessor.preprocess_image()
          vision.ocr_paddle.PaddleOCREngine().extract()
   Requires: PaddleOCR + PaddleX models locally provisioned
   If models missing: raises OCRModelUnavailableError
   │
   ▼
   Same _run_extraction() path as above
```

---

## NOT CONNECTED TO PIPELINE

```
[NOT CONNECTED] interpretation/reference_resolver.py
   Status: IMPLEMENTED, has tests, but NOT called by extraction/pipeline.py
   Would resolve reference ranges from report text into structured intervals
   Currently: parsing only happens inside validator.py (simpler parse_simple_reference_range)

[NOT CONNECTED] interpretation/age_boundary.py
   Status: IMPLEMENTED, tested, NOT called by any pipeline function

[NOT CONNECTED] knowledge_engine/ (entire package)
   Status: IMPLEMENTED (engine, matcher, scorer, registry, generator, models)
           Has 21 tests (all pass)
           NOT imported or called by extraction/pipeline.py, app.py, or ui_uploads.py
   Function: pattern-matching clinical findings engine
   Input it would need: structured findings from validated tests
   Output it would produce: MatchResult objects with pattern names and scores

[NOT CONNECTED] medical_reference/ (entire package)
   Status: provider.py, models.py are empty scaffolds (0 bytes)
           mayo/ subpackage unknown content
   NOT called by any active pipeline code

[LEGACY/EXTRA] main.py (CLI runner)
   Status: IMPLEMENTED individually, NOT the UI entry point
   The UI uses app.py → ui_uploads.py → extraction/pipeline.py
   main.py uses a different, simpler flow (extraction/pdf_reader.py directly, no pipeline.py)
```

---

## SWASTHSETU 2.0 EXPECTED FLOW vs ACTUAL

```
SWASTHSETU EXPECTED                    ACTUAL STATUS
─────────────────                    ─────────────
Original PDF                         ✅ Preserved (temp file, deleted after)
   ↓
Digital PDF text extraction          ✅ extraction/pipeline.py → _process_text_pdf()
   ↓
CBC Report Parser                    ✅ extraction/parser.py (14 markers, regex/rules)
   ↓
Test-name normalization              ✅ TEST_ALIASES canonical names in parser.py
   ↓
Reference range resolution           🟡 PARTIAL — validator.py parses simple min-max only;
                                         reference_resolver.py (age/sex-aware) NOT connected
   ↓
Validation                           ✅ extraction/validator.py — structural validation
   ↓
Plausibility checks                  ✅ extraction/plausibility.py — broad sanity bounds
   ↓
Confidence decision                  🟡 PARTIAL — can_analyze + requires_verification flags exist,
                                         no explicit HIGH_CONFIDENCE/NEEDS_REVIEW enum output
   ↓
HIGH CONFIDENCE / NEEDS_REVIEW       🟡 PARTIAL — inferred from validation + plausibility only
   ↓
Lab review if required               ❌ MISSING — no lab review routing mechanism
   ↓
Publish                              ❌ MISSING — no formal PUBLISH gate
   ↓
Structured laboratory observations   🟡 PARTIAL — test list produced but no HIGH/LOW/NORMAL
   ↓
Template patient explanation         ❌ MISSING — no template explanation generated
```

---

## GAPS SUMMARY

| Gap | Severity |
|-----|----------|
| No HIGH/LOW/NORMAL classification per test | High |
| No formal PUBLISH/BLOCK mechanism | High |
| No template patient-facing explanation | High |
| reference_resolver.py not connected | Medium |
| No explicit NEEDS_REVIEW enum in output | Medium |
| knowledge_engine not connected (by design for current scope) | Low |
| Lab review routing not implemented | Medium |
