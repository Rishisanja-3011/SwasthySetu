# Required Changes

**Chunk:** 2 — Analysis Only  
**Date:** 2026-10-03  
**Status:** PROPOSED — not yet implemented

---

# A. MUST IMPLEMENT IN REPORT ENGINE

These are the changes required for the VERIFY engine to meet SwasthSetu 2.0.

---

## 1. HIGH / LOW / NORMAL Classification Per Observation

**Current state:** Not implemented anywhere. `PipelineResult.tests` contains `value`, `reference_parsed.min`, `reference_parsed.max` — but no comparison is ever made.

**Desired state:** Each observation in `tests` gains a `status` field: `HIGH | LOW | NORMAL | UNKNOWN`.

**Logic:**
```
IF reference_resolved == False OR reference_low is None OR reference_high is None:
    status = UNKNOWN
ELIF value < reference_low:
    status = LOW
ELIF value > reference_high:
    status = HIGH
ELSE:
    status = NORMAL
```

**File:** `extraction/pipeline.py`  
**Function/class:** New helper `_classify_observations(tests, patient)` called from `_run_extraction()`  
**Why:** Core SwasthSetu requirement; needed before needs_review and template_explanation can work  
**Risk:** LOW — pure comparison logic; no side effects on existing fields  
**Test required:** Yes — for each status variant; edge cases: value == boundary (NORMAL), UNKNOWN when range missing

---

## 2. `needs_review` Per Observation

**Current state:** `plausibility.requires_verification` is a report-level boolean. No per-test `needs_review` flag exists.

**Desired state:** Each observation in `tests` gains `needs_review: bool`. Logic defined in `REVIEW_DECISION_RULES.md`.

**Conditions triggering needs_review = True:**
- `plausibility_status == "VERIFY"`
- `reference_resolved == False` (missing or unparsable reference)
- `unit_valid == False` or `unit is None`
- `value is None`

**File:** `extraction/pipeline.py`  
**Function/class:** Same new helper as above, or separate `_apply_review_flags(tests)`  
**Why:** Required VERIFY output field; enables report-level `review_required`  
**Risk:** LOW — additive field; no existing fields changed  
**Test required:** Yes — each condition independently; combined conditions; zero-flag case (sample.pdf)

---

## 3. Report-Level `review_required` + `publish_blocking_reasons`

**Current state:** `plausibility.requires_verification` exists but is not in PipelineResult as a named field.

**Desired state:**
- `PipelineResult.review_required: bool = any(t["needs_review"] for t in tests)`
- `PipelineResult.publish_blocking_reasons: list[str]` — populated when review_required or processing_status is BLOCKED

**File:** `extraction/pipeline.py` — modify `PipelineResult` dataclass + `process()` return  
**Function/class:** `PipelineResult` dataclass + `process()`  
**Why:** Required VERIFY contract fields (see VERIFY_ENGINE_CONTRACT.md)  
**Risk:** LOW — additive fields; backward compatible  
**Test required:** Yes — report with no flags = review_required=False; report with one flagged test = True

---

## 4. `plausibility_status` Promoted to Per-Test Field

**Current state:** `plausibility.results` is a separate list keyed by `test` name. Not merged into the main test dict.

**Desired state:** Each test dict in the output includes `plausibility_status: "PLAUSIBLE" | "VERIFY" | "NOT_CHECKED"` inline.

**File:** `extraction/pipeline.py`  
**Function/class:** `_run_extraction()` — merge plausibility results into test dicts after plausibility check  
**Why:** Enables the classification and needs_review logic to operate on a single test dict without cross-reference lookups  
**Risk:** LOW — additive field; plausibility.results still returned unchanged  
**Test required:** Yes — check merged test output contains `plausibility_status`

---

## 5. `extraction/explainer.py` — Template Explanation

**Current state:** No patient-facing explanation is generated anywhere.

**Desired state:** New module `extraction/explainer.py` with function `generate_explanations(tests) -> list[dict]`. Each test that has `status` set gets a template string. See `TEMPLATE_EXPLANATION_PLAN.md`.

**File:** `extraction/explainer.py` (NEW)  
**Function/class:** `generate_explanations(tests: list[dict]) -> list[dict]`  
**Why:** SwasthSetu requirement for patient-facing output; deterministic; no diagnosis  
**Risk:** LOW — new file, no changes to existing modules  
**Test required:** Yes — NORMAL/HIGH/LOW/UNKNOWN/needs_review=True cases; no disease language; deterministic

---

# B. SHOULD IMPLEMENT

Useful for correctness but not strictly required for the VERIFY engine to function.

---

## 6. Wire `reference_resolver.resolve_reference_range()` Into Pipeline

**Current state:** `interpretation/reference_resolver.py` is implemented and tested but not called by the pipeline. `validator.py` uses a simpler internal parser for simple min-max only.

**Desired state:** Pipeline enriches each validated test's reference range using `resolve_reference_range()` (supports sex/age-banded ranges). See `REFERENCE_RESOLUTION_PLAN.md`.

**File:** `extraction/pipeline.py`  
**Function/class:** `_run_extraction()` — post-validation enrichment loop  
**Why:** Allows sex/age-specific ranges to resolve correctly; emits `source: "laboratory_report"` provenance  
**Risk:** MEDIUM — output shape changes (`reference_parsed["parsed"]` → `reference_parsed["resolved"]`); existing tests need updating  
**Test required:** Yes — all resolver variant cases; integration test with sample.pdf

---

## 7. Fix Patient Age Validation for Non-Year Units

**Current state:** `validate_patient_context()` checks `patient["age"]` (integer years). For patients where age_unit is months/weeks/days, `patient["age"]` is `None` → triggers `USER_INPUT_REQUIRED` even if `age_value + age_unit` are valid.

**Desired state:** `validate_patient_context()` accepts `age_value + age_unit` as a valid patient context.

**File:** `extraction/validator.py`  
**Function/class:** `validate_patient_context()`  
**Why:** Correctness for non-adult patients; affects CBC reference resolution accuracy  
**Risk:** LOW — localised change; existing year-based age tests unaffected  
**Test required:** Yes — 3-month-old patient passes validation; 34-year-old still passes

---

# C. PLATFORM LAYER — NOT REPORT ENGINE

These items are required by SwasthSetu 2.0 overall, but must NOT be implemented in the current report-processing engine.

| Item | Why Not Engine |
|------|---------------|
| Lab QR code generation | Platform UI concern |
| Patient consent tracking | Platform workflow/auth concern |
| Lab review dashboard | Platform UI concern |
| Lab reviewer sign-off | Platform workflow state |
| Report publish action | Database write; platform concern |
| Doctor access portal | Auth + platform concern |
| Patient app/delivery | Platform notification concern |
| Report deduplication across patients | Database concern |
| Database persistence | Platform concern |
| Report scheduling | Platform concern |
| `publish_blocked` boolean | Platform decision (uses `review_required` as input, but adds its own conditions) |

---

# D. KEEP AS-IS

These are existing implementations that are already correct and do not require changes.

| Component | Reason |
|-----------|--------|
| `extraction/pdf_reader.py` | Digital PDF text extraction works correctly |
| `vision/pdf_classifier.py` | TEXT/SCANNED classification works correctly |
| `extraction/text_cleaner.py` | Text normalization works correctly |
| `extraction/patient_parser.py` | Patient age/sex extraction works correctly (dual representation is good) |
| `extraction/parser.py` | CBC alias map works correctly for current report format |
| `extraction/coverage.py` | Coverage check works correctly |
| `extraction/plausibility.py` | Sanity bound checks work correctly |
| `extraction/validator.py` — structural validation | Test structure validation is correct |
| `extraction/validator.py` — unit validation | Unit validation and issue generation are correct |
| `extraction/pipeline.py` — scanned/image paths | Optional fallback paths work correctly |
| OCR infrastructure (`vision/`) | Correctly optional; do not remove |
| `tests/` — all 140 tests | All passing; do not modify |
| `PipelineResult` dataclass | Extend it; do not replace it |

---

# E. KEEP DISCONNECTED

These must NOT be wired into the VERIFY engine under SwasthSetu 2.0 scope.

| Component | Reason |
|-----------|--------|
| `knowledge_engine/` (entire package) | Generates clinical pattern names (e.g., disease patterns) which constitute diagnosis — prohibited by SwasthSetu 2.0. Keep isolated. |
| `medical_reference/` (empty scaffolds) | Not needed; ranges come from the report itself per SwasthSetu constraint |
| `main.py` CLI path | Legacy CLI runner; not the active pipeline path; keep for development convenience only |

---

# Patient Age Issue — Full Analysis

**Formats supported by `patient_parser.py`:**
- Years: ✅ (`34 Years`, `34 Yrs`, `34 Y`) → `age=34, age_value=34, age_unit="years"`
- Months: ✅ (`6 Months`) → `age=None, age_value=6, age_unit="months"` (age intentionally None)
- Weeks: ✅ (`3 Weeks`) → `age=None, age_value=3, age_unit="weeks"`
- Days: ✅ (`10 Days`) → `age=None, age_value=10, age_unit="days"`

**Current validator behavior:**
- `validate_patient_context()` checks `patient["age"]` (years integer, line ~614 in validator.py)
- If `age is None` (e.g., 6-month-old patient) → triggers `USER_INPUT_REQUIRED`
- Even though `age_value=6, age_unit="months"` is fully populated and valid

**Is this relevant for current SwasthSetu CBC scope?**
SwasthSetu 2.0 does not explicitly restrict to adults. A 6-month-old CBC has different reference ranges, and the reference_resolver already supports age-band matching. Therefore the validator gap is real and affects correctness for pediatric patients.

**Fix now or defer?**
Fix in Chunk 3 (SHOULD IMPLEMENT). It is a one-line logic change and prevents incorrect `USER_INPUT_REQUIRED` blocks for valid pediatric patients.
