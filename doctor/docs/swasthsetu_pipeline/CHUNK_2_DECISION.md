# Chunk 2 Decision

**Date:** 2026-10-03  
**Basis:** Chunk 1 audit evidence + code inspection + real pipeline execution  
**Mode:** ANALYSIS ONLY — no production code modified

---

## 1. Current Report Engine Status

The existing report engine is a **working, safety-first digital PDF → CBC extraction pipeline**.

Confirmed by evidence:

| Evidence | Result |
|----------|--------|
| `python -m pytest tests/ -v` | 140 passed, 0 failed, 0 skipped |
| `process("samples/reports/sample.pdf")` | 14/14 CBC markers, all PLAUSIBLE, VALID, can_analyze=True |
| `process("samples/reports/sample2.pdf")` | Correctly blocked: UNSAFE_TO_ANALYZE, 0 tests detected |
| Code trace: app.py → ui_uploads.py → pipeline.py → all extraction modules | All active and wired correctly |
| Code trace: knowledge_engine | Zero imports in any active pipeline file |
| Code trace: interpretation/reference_resolver.py | Zero imports in any active pipeline file |

The engine is structurally correct. The pipeline flow is complete. Safety gates work.

**The engine is not broken. It is incomplete relative to the SwasthSetu 2.0 VERIFY output contract.**

Three specific output fields are missing. Two pipeline enrichment steps are missing. One small validator fix is needed.

---

## 2. What Already Matches SwasthSetu

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Digital PDF extraction only (primary path) | ✅ | `_process_text_pdf()` via PyMuPDF; ocr_pages=0 for digital PDFs |
| Original PDF never modified | ✅ | `ui_uploads.py` NamedTemporaryFile + finally delete |
| CBC-only scope (14 markers) | ✅ | `extraction/parser.py` TEST_ALIASES |
| Test-name normalization | ✅ | Canonical alias map |
| Reference ranges from report only (never invented) | ✅ | validator + resolver both use only report text |
| Validation (patient + test + unit + reference struct) | ✅ | `extraction/validator.py` |
| Plausibility checking (sanity bounds) | ✅ | `extraction/plausibility.py` |
| Safety-first blocking (no partial analysis) | ✅ | `can_analyze=False` for NEEDS_USER_INPUT and UNSAFE_TO_ANALYZE |
| No diagnosis | ✅ | No diagnosis logic anywhere in active pipeline |
| No treatment recommendation | ✅ | No such logic anywhere |
| No free-form AI interpretation | ✅ | No LLM calls, no AI generation |
| Error handling | ✅ | FileNotFoundError, ValueError, OCRModelUnavailableError all handled |
| Test coverage | ✅ | 140 tests, all passing |

---

## 3. What Must Change

**Report engine changes only. 5 items total (2 MUST, 3 SHOULD).**

### MUST (required for SwasthSetu VERIFY compliance)

| # | Change | File | Impact |
|---|--------|------|--------|
| 1 | HIGH / LOW / NORMAL classification per observation | `extraction/pipeline.py` | New function `_classify_observation_status()` + per-test `status` field |
| 2 | `needs_review: bool` per observation + `review_required` at report level + `publish_blocking_reasons` | `extraction/pipeline.py` + `PipelineResult` dataclass | New function `_apply_needs_review()` + 3 new PipelineResult fields |

### SHOULD (correctness and completeness)

| # | Change | File | Impact |
|---|--------|------|--------|
| 3 | Promote `plausibility_status` into each test dict | `extraction/pipeline.py` | Enables clean classification logic; no external API change |
| 4 | Template explanation generator | `extraction/explainer.py` (NEW) | Deterministic per-observation text; no diagnosis |
| 5 | Fix patient age validation for non-year units | `extraction/validator.py` | One-condition change in `validate_patient_context()` |

### Reference resolver (Lower priority — Step 6 in Chunk 3)

| # | Change | File | Impact |
|---|--------|------|--------|
| 6 | Wire `reference_resolver.resolve_reference_range()` into pipeline | `extraction/pipeline.py` | Enables sex/age-banded reference resolution; output shape changes slightly |

---

## 4. What Does NOT Need To Change

| Component | Reason |
|-----------|--------|
| `extraction/parser.py` | CBC alias map and regex parsing are correct |
| `extraction/text_cleaner.py` | Text normalization is correct |
| `extraction/patient_parser.py` | Dual age model (age + age_value + age_unit) is correct; no change |
| `extraction/coverage.py` | Coverage check is correct |
| `extraction/plausibility.py` | Plausibility sanity bounds are correct |
| `extraction/validator.py` — structural validation | This is correct; only the patient age gate needs the small fix |
| `vision/` — entire OCR package | Digital PDFs never invoke OCR; keep as-is |
| `vision/pdf_classifier.py` | Text/scanned classification is correct |
| All 140 existing tests | All passing; do not touch |
| `PipelineResult` existing fields | Extend only; keep all existing fields unchanged |

---

## 5. What Belongs to Platform Layer

These are required by SwasthSetu 2.0 as a product but are NOT report engine concerns:

| Item | Layer |
|------|-------|
| `publish_blocked` boolean | Platform (reads `review_required` from engine; adds its own conditions: lab sign-off, consent, etc.) |
| Actual report publish action | Platform (database write) |
| Lab QR generation | Platform UI |
| Patient consent tracking | Platform auth/workflow |
| Lab reviewer dashboard | Platform UI |
| Lab reviewer sign-off | Platform workflow state |
| Doctor access portal | Platform auth |
| Patient-facing app | Platform delivery |
| Report deduplication across patients | Platform database |
| Database persistence | Platform data layer |
| Report scheduling or batching | Platform operations |

---

## 6. What Must Stay Disconnected

| Component | Decision | Reason |
|-----------|----------|--------|
| `knowledge_engine/` | **KEEP DISCONNECTED** | Produces clinical pattern names (disease patterns, condition names) — violates SwasthSetu no-diagnosis constraint. It's legacy Blood Report project infrastructure. If connected to the VERIFY engine output, its pattern names would constitute diagnosis. Preserve for possible future clinician-only internal layer, never patient-facing. |
| `medical_reference/` | **KEEP DISCONNECTED** | Empty scaffolds; SwasthSetu constraint is that reference ranges come from the report only — external reference databases are incompatible with this constraint |
| `main.py` (CLI runner) | **KEEP AS-IS** | Legacy CLI orchestrator; not the active UI path; useful for development; do not integrate or promote |

---

## 7. Exact Chunk 3 Changes

In implementation order (each step depends on the previous):

| Step | What | File | New/Modified |
|------|------|------|--------------|
| 1 | Merge `plausibility_status` into each test dict | `extraction/pipeline.py` | MODIFIED |
| 2 | `_classify_observation_status()` → adds `status` field per test | `extraction/pipeline.py` | MODIFIED |
| 3 | `_apply_needs_review()` → adds `needs_review` field per test | `extraction/pipeline.py` | MODIFIED |
| 4 | `review_required`, `publish_blocking_reasons`, `template_explanation` added to `PipelineResult` | `extraction/pipeline.py` | MODIFIED |
| 5 | `extraction/explainer.py` — `generate_explanations()` | `extraction/explainer.py` | NEW FILE |
| 6 | Fix patient age gate in `validate_patient_context()` | `extraction/validator.py` | SMALL FIX |
| 7 | Wire `reference_resolver` (if time allows; else Chunk 4) | `extraction/pipeline.py` | MODIFIED |
| 8 | Tests for Steps 1–6 | `tests/extraction/test_classification.py`, `tests/extraction/test_explainer.py` | NEW FILES |
| 9 | Verify sample.pdf → all NORMAL/HIGH/LOW, needs_review=False, review_required=False | Runtime verification | — |
| 10 | Verify sample2.pdf → BLOCKED, no tests, publish_blocking_reasons populated | Runtime verification | — |

**Total new/modified production files: 3 (pipeline.py, validator.py, explainer.py)**  
**Total new test files: 2**  
**Total files unchanged: all other production files**

---

## 8. Test Plan

### Existing Tests (must all still pass — zero regressions)
```
python -m pytest tests/ -v
Expected: 140 passed, 0 failed
```

### New Tests for Chunk 3 (to be written in Chunk 3)

| Test File | Cases |
|-----------|-------|
| `tests/extraction/test_classification.py` | NORMAL (in range); HIGH (above); LOW (below); UNKNOWN (no range); UNKNOWN (no value); boundary (value == low = NORMAL); boundary (value == high = NORMAL) |
| `tests/extraction/test_explainer.py` | NORMAL text; HIGH text; LOW text; UNKNOWN text; needs_review=True text; no disease words in any output; deterministic (same input → same output twice) |
| `tests/extraction/test_pipeline.py` (additions) | `plausibility_status` in each test dict; `review_required` in PipelineResult; `publish_blocking_reasons` in PipelineResult; `template_explanation` in PipelineResult |

### Integration Verification (sample PDFs)
```python
# sample.pdf — known good
result = process("samples/reports/sample.pdf")
assert all(t["status"] in ("HIGH","LOW","NORMAL","UNKNOWN") for t in result.tests)
assert all(t["needs_review"] == False for t in result.tests)  # all expected to pass
assert result.review_required == False
assert result.publish_blocking_reasons == []
assert len(result.template_explanation) == 14

# sample2.pdf — known blocked
result = process("samples/reports/sample2.pdf")
assert result.validation["can_analyze"] == False
assert result.tests == []
assert result.review_required == False
assert len(result.publish_blocking_reasons) > 0
assert result.template_explanation == []
```

---

## 9. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Regression in existing 140 tests | LOW | Steps 1-4 add fields only; no existing field is renamed or removed. `PipelineResult` gains new fields with default values. |
| Classification boundary behavior (value == range boundary) | LOW | Defined: `value < low → LOW`, `value > high → HIGH`, `else → NORMAL`. Value on boundary = NORMAL. Document in code. |
| reference_resolver output shape change | MEDIUM | Wire as separate `reference_resolved_data` field alongside existing `reference_parsed` in Chunk 3. Full migration to Chunk 4. Avoids breaking existing test assertions on `reference_parsed["parsed"]`. |
| Template explanation accidentally produces diagnostic text | MEDIUM | Keep template strings static. Test for forbidden words. Only use `status` (HIGH/LOW/NORMAL) — never pattern names or condition names. |
| `needs_review` false positive causing valid reports to be blocked | LOW | Rules are conservative: only trigger on actual data quality issues (VERIFY plausibility, missing/unparsable range, missing unit/value). sample.pdf should produce zero false positives. |
| Patient age fix breaks existing year-based tests | LOW | Condition is additive: `has_valid_age = (age is not None) OR (age_value + age_unit both not None)`. Existing year tests unaffected. |

---

## 10. Final Recommendation

**The report engine is fundamentally sound. Do not redesign it.**

The missing items are all additive enrichment steps — they operate on data the pipeline already produces. No structural change is needed. No new pipeline. No new packages. No new external dependencies.

**Recommended Chunk 3 sequence:**
1. Plausibility promotion (15 min — 5 lines)
2. Classification function (30 min — 20 lines)
3. needs_review function (30 min — 20 lines)
4. PipelineResult new fields (20 min — 10 lines + 3 field definitions)
5. Template explainer module (45 min — new file, ~80 lines)
6. Patient age validator fix (15 min — 3 lines)
7. Tests (60 min — 2 new test files)
8. Integration verification against both sample PDFs (10 min)

**Total estimated new code: ~150 lines of production code + ~100 lines of tests.**  
**No production code deleted. No existing tests modified. No packages added.**

The knowledge engine must remain disconnected. OCR must remain as-is. The platform layer (publish, QR, lab, patient, doctor) must not be built in Chunk 3.

After Chunk 3, the report engine will produce a VERIFY-compliant structured output that the future Lab Review + Publish platform layer can act on directly.
