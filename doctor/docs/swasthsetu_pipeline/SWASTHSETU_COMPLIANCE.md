# SwasthSetu 2.0 Compliance Table

Audit Date: 2026-10-03  
Evidence: Code tracing + real pipeline execution on `samples/reports/sample.pdf`

---

| # | Requirement | Status | Evidence | Current Implementation | Gap |
|---|-------------|--------|----------|------------------------|-----|
| 1 | Original PDF preservation | ✅ IMPLEMENTED | `ui_uploads.py:90-96` writes to NamedTemporaryFile, deletes in `finally` | Original bytes never written back; temp deleted after processing | None |
| 2 | Digital PDF text extraction | ✅ IMPLEMENTED | `extraction/pipeline.py:207-238` `_process_text_pdf()` | PyMuPDF page-by-page text extraction; page markers added | None |
| 3 | CBC-only parsing scope | ✅ IMPLEMENTED | `extraction/parser.py:4-19` TEST_ALIASES (14 markers) | Only 14 CBC markers supported; no general lab parsing | None |
| 4 | CBC field coverage (14 markers) | ✅ IMPLEMENTED | `extraction/coverage.py:37-52` SUPPORTED_CBC_MARKERS | Hgb, RBC, Hct, MCV, MCH, MCHC, RDW, WBC, Neutrophils, Lymphocytes, Eosinophils, Monocytes, Basophils, Platelets | None |
| 5 | Test-name normalization | ✅ IMPLEMENTED | `extraction/parser.py:4-19` TEST_ALIASES dict | Raw → canonical via alias map ("Hemoglobin" → "hemoglobin") | Alias set is limited to one report format |
| 6 | Reference range resolution | 🟡 PARTIAL | `extraction/validator.py:171-285` `parse_simple_reference_range()` | Parses simple `[min-max]` from report only; never invents missing range | `interpretation/reference_resolver.py` (age/sex-aware) exists but NOT connected |
| 7 | Validation | ✅ IMPLEMENTED | `extraction/validator.py:612-967` `validate_report()` | Patient + test structural validation; issue list; validated_test_data produced | Partial: patient validation still requires age in years |
| 8 | Plausibility checking | ✅ IMPLEMENTED | `extraction/plausibility.py` `check_report_plausibility()` | Broad sanity bounds (not clinical ranges); PLAUSIBLE/VERIFY status per test | None |
| 9 | Confidence decision | 🟡 PARTIAL | `main.py:652-784` decision logic; `app.py:49-59` `_status_message()` | `can_analyze + requires_verification` flags serve as implicit confidence; "ready for next stage" message | No explicit HIGH_CONFIDENCE/NEEDS_REVIEW enum in output |
| 10 | NEEDS_REVIEW handling | 🟡 PARTIAL | `plausibility.py: status="VERIFY"` + `app.py:115-119` | Plausibility VERIFY flags tests for review; displayed in UI | No formal NEEDS_REVIEW field in PipelineResult output structure |
| 11 | Missing reference range behavior | ✅ IMPLEMENTED | `validator.py:401-405` | Missing reference added as `"missing_reference_range"` issue; never invented | Only simple ranges parsed; age/sex ranges not resolved |
| 12 | Missing/ambiguous unit behavior | ✅ IMPLEMENTED | `validator.py:372-390` | Missing unit → `"missing_unit"` issue; unrecognized → `"unrecognized_unit"`; preserved not guessed | No silent unit substitution |
| 13 | HIGH/LOW/NORMAL classification | ❌ MISSING | No such logic exists in any active pipeline file | Not generated anywhere in extraction/pipeline.py output | Need to compare value against reference_parsed min/max |
| 14 | Publish blocking for NEEDS_REVIEW | ❌ MISSING | No publish gate logic exists | Pipeline returns PipelineResult; no PUBLISH/BLOCK decision | Need formal publish gate |
| 15 | Structured observation output | 🟡 PARTIAL | PipelineResult.tests list | test dict has raw_name, canonical_name, value, unit, reference_raw, reference_parsed | Missing: HIGH/LOW/NORMAL, needs_review per test |
| 16 | Provenance / source tracking | ✅ IMPLEMENTED | `extraction/pipeline.py:79-116` SourceMeta | input_type, path, page_count, ocr_pages in every result; reference_resolver marks "laboratory_report" | None |
| 17 | Template-based patient explanation | ❌ MISSING | No template or explanation logic anywhere | Not implemented | Need template explanation module |
| 18 | No unrestricted medical interpretation | ✅ IMPLEMENTED | pipeline.py docstring line 46-48 | Pipeline explicitly states it does NOT interpret medical values | None |
| 19 | No diagnosis | ✅ IMPLEMENTED | No diagnosis code in any active pipeline file | plausibility.py docstring explicitly excludes diagnosis | None |
| 20 | No treatment recommendation | ✅ IMPLEMENTED | No treatment code exists | No such logic in active files | None |
| 21 | OCR status relative to SwasthSetu | ⚠️ EXTRA / OUT OF CURRENT SCOPE | vision/ package fully implemented; classify_pdf() called on every PDF | OCR is CONNECTED (scanned PDF path is active), but requires PaddleOCR models; SwasthSetu 2.0 specifies digital PDF as primary path | OCR exists as optional/fallback; does not affect digital PDF path |
| 22 | Error handling | ✅ IMPLEMENTED | pipeline.py raises FileNotFoundError, ValueError, TypeError; app.py catches all exceptions | Errors surfaced to user; pipeline does not swallow exceptions silently | None |
| 23 | Duplicate report handling | 🟡 PARTIAL | `coverage.py:106-123` `duplicate_markers` detection | Duplicate CBC markers detected and flagged; UI warns; main.py gates on duplicates | No duplicate PDF/report-level deduplication |
| 24 | Original file integrity | ✅ IMPLEMENTED | temp file used, deleted in finally; original not touched | `ui_uploads.py:88-96` NamedTemporaryFile + os.remove in finally | None |
| 25 | Tests covering the pipeline | ✅ IMPLEMENTED | `tests/extraction/test_pipeline.py` (22+ test cases) | Covers text PDF, image, scanned PDF, error cases, all extraction steps | OCR tests are mocked (no model required); HIGH/LOW/NORMAL not tested (not implemented) |

---

## Summary Counts

| Status | Count |
|--------|-------|
| ✅ IMPLEMENTED | 14 |
| 🟡 PARTIAL | 6 |
| ❌ MISSING | 3 |
| ⚠️ EXTRA / OUT OF CURRENT SCOPE | 1 |
| **Total** | **24** |

---

## Critical Missing Items for SwasthSetu Integration

1. **HIGH/LOW/NORMAL classification** — compare extracted value against parsed reference_parsed min/max
2. **Formal NEEDS_REVIEW enum** + **publish_blocked gate** — tests with VERIFY plausibility or MISSING fields should block publish
3. **Template patient explanation** — fixed text, not AI-generated; must not contain diagnosis or treatment

## Items Correctly Absent (SwasthSetu compliant)

- No LLM fallback is implemented (none needed for current scope)
- No free-form AI interpretation
- No diagnosis
- No treatment recommendation
- Reference ranges never invented (only parsed from report or flagged as missing)
