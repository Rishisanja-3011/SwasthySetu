# Chunk 3 Implementation Plan

**Chunk:** 2 — Analysis Only  
**Date:** 2026-10-03  
**Status:** PLAN ONLY — do not implement until Chunk 3 is started

---

## Scope

Chunk 3 implements ONLY what is required to make the existing report-processing engine produce a VERIFY-compliant output. No platform layer. No doctor/patient/lab UI. No database. No QR.

All changes extend existing modules. No duplicate pipeline. No new DSL.

---

## Implementation Order

The order is determined by dependency:
- Classification needs reference ranges resolved (Step 1 → Step 2)
- `needs_review` needs classification (Step 2 → Step 3)
- `review_required` needs per-test `needs_review` (Step 3 → Step 4)
- Template explanation needs `status` (Step 2 → Step 5)
- Tests can be written after each step

---

## Step 1 — Promote `plausibility_status` Into Each Test Dict

**Why first:** Classification and needs_review both depend on plausibility status being available in the test dict. Currently it lives in a separate `plausibility.results` list, not inline.

**File:** `extraction/pipeline.py`  
**Change:** In `_run_extraction()`, after `check_report_plausibility()` returns, merge plausibility result status into each corresponding test dict.

```python
# After plausibility check:
plausibility_by_name = {r["test"]: r["status"] for r in plausibility["results"]}
for test in validated_tests:
    test["plausibility_status"] = plausibility_by_name.get(
        test["canonical_name"], "NOT_CHECKED"
    )
```

**Test:** `tests/extraction/test_pipeline.py` — assert each test dict has `plausibility_status` field.

---

## Step 2 — HIGH / LOW / NORMAL Classification

**File:** `extraction/pipeline.py`  
**Change:** New function `_classify_observation_status(test: dict) -> str`.

```python
def _classify_observation_status(test: dict) -> str:
    value = test.get("value")
    ref = test.get("reference_parsed") or {}
    low = ref.get("min")
    high = ref.get("max")
    parsed = ref.get("parsed", False)

    if value is None or not parsed or low is None or high is None:
        return "UNKNOWN"
    if value < low:
        return "LOW"
    if value > high:
        return "HIGH"
    return "NORMAL"
```

Call this for each validated test in `_run_extraction()` after validation:
```python
for test in validated_tests:
    test["status"] = _classify_observation_status(test)
```

**Test:** 5 cases — NORMAL (value within), HIGH (above), LOW (below), UNKNOWN (no range), UNKNOWN (no value).

---

## Step 3 — `needs_review` Per Observation

**File:** `extraction/pipeline.py`  
**Change:** New function `_apply_needs_review(test: dict) -> bool`.

```python
def _apply_needs_review(test: dict) -> bool:
    if test.get("value") is None:
        return True
    if test.get("plausibility_status") == "VERIFY":
        return True
    ref = test.get("reference_parsed") or {}
    if not ref.get("parsed", False):
        return True
    if test.get("unit") is None or test.get("unit") == "":
        return True
    # unit_valid from validator issues
    if any(
        i.get("field") in ("missing_unit", "unrecognized_unit")
        for i in test.get("validation_issues", [])
    ):
        return True
    return False
```

Call after Step 2 in `_run_extraction()`:
```python
for test in validated_tests:
    test["needs_review"] = _apply_needs_review(test)
```

**Test:** Each condition independently + combined + zero-flag (sample.pdf all False).

---

## Step 4 — Report-Level `review_required` + `publish_blocking_reasons` + `PipelineResult` Update

**File:** `extraction/pipeline.py`  
**Change:** Extend `PipelineResult` dataclass with two new fields:

```python
@dataclass
class PipelineResult:
    # ... existing fields unchanged ...
    review_required: bool = False
    publish_blocking_reasons: list = field(default_factory=list)
    template_explanation: list = field(default_factory=list)
```

In `process()`, after `_run_extraction()` returns, compute:

```python
review_required = any(t.get("needs_review", False) for t in result_tests)
blocking = []
if review_required:
    blocking.append("One or more observations require review before publishing")
if not validation.get("can_analyze", True):
    blocking.append(f"Report processing blocked: {validation.get('status')}")
```

**Test:** Sample.pdf → `review_required=False`, `publish_blocking_reasons=[]`. Mocked flagged test → `review_required=True`.

---

## Step 5 — Template Explanation Module

**File:** `extraction/explainer.py` (NEW)  
**Change:** Implement `generate_explanations(tests: list[dict]) -> list[dict]`.

Display name map:
```python
DISPLAY_NAMES = {
    "hemoglobin": "Hemoglobin",
    "rbc": "Red Blood Cell Count",
    "hematocrit": "Hematocrit",
    "mcv": "Mean Corpuscular Volume",
    "mch": "Mean Corpuscular Hemoglobin",
    "mchc": "MCH Concentration",
    "rdw": "Red Cell Distribution Width",
    "wbc": "White Blood Cell Count",
    "neutrophils": "Neutrophils",
    "lymphocytes": "Lymphocytes",
    "eosinophils": "Eosinophils",
    "monocytes": "Monocytes",
    "basophils": "Basophils",
    "platelets": "Platelets",
}
```

Template logic (four branches as defined in `TEMPLATE_EXPLANATION_PLAN.md`).

Call from `process()` after Step 4:
```python
from extraction.explainer import generate_explanations
template_explanation = generate_explanations(result_tests)
```

**Test:** NORMAL case; HIGH case; LOW case; UNKNOWN case; needs_review=True case; no disease/diagnosis words in any output.

---

## Step 6 — Wire reference_resolver (Lower Priority)

See `REFERENCE_RESOLUTION_PLAN.md`. Implement as post-validation enrichment in `_run_extraction()`.

**Risk:** MEDIUM (output shape change). Do this step last in Chunk 3, or move to Chunk 4 if Step 1-5 are the priority.

If deferred to Chunk 4:
- Steps 1-5 use the existing `reference_parsed["parsed"]` / `reference_parsed["min"]` / `reference_parsed["max"]` fields
- Step 6 would rename these to `reference_resolved / reference_low / reference_high`
- Document the rename as a Chunk 4 breaking change

---

## Step 7 — Fix Patient Age Validation for Non-Year Units

**File:** `extraction/validator.py`  
**Function:** `validate_patient_context()`  
**Change:** Accept `age_value + age_unit` as a valid alternative to `age` (years integer).

```python
# Current:
if not patient.get("age"):    # fails for months/weeks/days patients

# Proposed:
has_valid_age = (
    patient.get("age") is not None
    or (patient.get("age_value") is not None and patient.get("age_unit") is not None)
)
if not has_valid_age:
    ...
```

**Test:** 6-month-old patient passes validation. 34-year-old still passes. None age + None age_value → still blocked.

---

## Verification Against Sample PDFs

After Steps 1-5, verify:

**sample.pdf (VALID case):**
```
Expected:
  All 14 tests: status=NORMAL|HIGH|LOW (not UNKNOWN — all have parsed references)
  All 14 tests: needs_review=False (all PLAUSIBLE, all have ranges, all have units)
  review_required = False
  publish_blocking_reasons = []
  template_explanation = [14 entries, no disease language]
```

**sample2.pdf (BLOCKED case):**
```
Expected:
  validation.can_analyze = False (unchanged — still blocked)
  validation.status = UNSAFE_TO_ANALYZE (unchanged)
  tests = [] (no tests detected)
  review_required = False (no tests to flag)
  publish_blocking_reasons = ["Report processing blocked: UNSAFE_TO_ANALYZE"]
  template_explanation = [] (no observations to explain)
```

---

## New Files

| File | Type | Purpose |
|------|------|---------|
| `extraction/explainer.py` | NEW | Template explanation generator |
| `tests/extraction/test_explainer.py` | NEW | Tests for template explanation |
| `tests/extraction/test_classification.py` | NEW | Tests for HIGH/LOW/NORMAL logic |

## Modified Files

| File | Change Type | What Changes |
|------|------------|--------------|
| `extraction/pipeline.py` | EXTEND | Add `_classify_observation_status()`, `_apply_needs_review()`, plausibility merge, `review_required`, `publish_blocking_reasons`, `template_explanation` |
| `extraction/pipeline.py` | EXTEND | `PipelineResult` gets 3 new fields (backward compatible, default values) |
| `extraction/validator.py` | SMALL FIX | `validate_patient_context()` accepts `age_value + age_unit` |

## Files NOT Modified in Chunk 3

ALL other production files remain untouched, including:
- `extraction/parser.py` — no changes
- `extraction/text_cleaner.py` — no changes
- `extraction/coverage.py` — no changes
- `extraction/plausibility.py` — no changes
- `extraction/patient_parser.py` — no changes
- `extraction/pdf_reader.py` — no changes
- `vision/` — no changes
- `interpretation/reference_resolver.py` — no changes (wired in Chunk 3 Step 6 or deferred)
- `knowledge_engine/` — no changes (stays disconnected)
- `app.py` — no changes
- `ui_uploads.py` — no changes
- `tests/` existing tests — no changes (new tests only)
