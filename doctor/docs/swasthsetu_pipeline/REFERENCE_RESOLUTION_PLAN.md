# Reference Resolution Plan

**Chunk:** 2 — Analysis Only  
**Date:** 2026-10-03  
**Status:** PROPOSED — not yet implemented

---

## 1. What is `interpretation/reference_resolver.py`?

`reference_resolver.py` is a fully implemented, tested module in the `interpretation/` package. It resolves laboratory reference ranges printed in a report into a structured `{resolved, min, max, matched_by, matched_age, matched_sex, source, reason}` dict.

It was present in the repository during Chunk 1 audit but is **NOT imported or called** by `extraction/pipeline.py`, `extraction/validator.py`, or any active pipeline file.

---

## 2. What Input Does It Expect?

**Main entry point:**
```python
def resolve_reference_range(reference_raw, patient: dict) -> dict
```

- `reference_raw`: the raw reference range string from the report (e.g., `"[13.0-18.0]"`, `"Male: 13-17\nFemale: 11-15"`, `"1-6 months: 10-15\n7-12 months: 11-16"`)
- `patient`: the same patient dict the pipeline already produces: `{age, age_value, age_unit, sex}`

These inputs are **already available** in the pipeline at the point where `validate_single_test()` is called.

---

## 3. What Output Does It Produce?

Two possible result shapes:

**Resolved:**
```python
{
    "resolved": True,
    "min": 13.0,
    "max": 18.0,
    "matched_by": "report_direct",   # "report_direct" | "sex" | "age" | "age_and_sex"
    "matched_age": 34,               # legacy years
    "matched_age_value": 34,
    "matched_age_unit": "years",
    "matched_sex": "male",
    "source": "laboratory_report",
    "reason": None
}
```

**Unresolved:**
```python
{
    "resolved": False,
    "min": None,
    "max": None,
    "matched_by": None,
    "matched_age": None, "matched_age_value": None, "matched_age_unit": None,
    "matched_sex": None,
    "source": "laboratory_report",
    "reason": "Reference interval is missing from the laboratory report."
}
```

**Key provenance field:** `"source": "laboratory_report"` is always set. The resolver never draws from an external database or invents a range. **This directly satisfies the SwasthSetu constraint.**

---

## 4. What Range Formats Does It Support?

| Format Type | Example | Supported | Function |
|-------------|---------|-----------|---------- |
| Simple min-max | `13-18` or `[13.0-18.0]` | ✅ | `resolve_direct_range()` |
| "to" notation | `13 to 18` | ✅ | `resolve_direct_range()` |
| Sex-specific | `Male: 13-18` / `Female: 11-15` | ✅ | `resolve_sex_specific_range()` |
| Age-band only | `1-6 months: 10-15` / `7-12 months: 11-16` | ✅ | `resolve_age_specific_range()` |
| Age + sex combined | `Male:\n18-60 years: 13-17\nFemale:\n18-60 years: 12-15` | ✅ | `resolve_age_and_sex_range()` |
| Upper bound only (`< 150`) | — | ❌ | Not implemented |
| Lower bound only (`> 60`) | — | ❌ | Not implemented |
| Missing range | None or `""` | ✅ | Returns `resolved=False` with reason |

Resolution priority (waterfall): `age+sex → sex → age → direct`

---

## 5. Is It Better Than `validator.parse_simple_reference_range()`?

**Yes, strictly.** The current validator uses an internal `parse_simple_reference_range()` that **only handles simple min-max**. No sex-specific, no age-banded resolution.

| Capability | `validator.parse_simple_reference_range()` | `reference_resolver.resolve_reference_range()` |
|-----------|-------------------------------------------|-------------------------------------------------|
| Simple `[13-18]` | ✅ | ✅ |
| Sex-specific ranges | ❌ | ✅ |
| Age-band ranges | ❌ | ✅ |
| Age + sex combined | ❌ | ✅ |
| `resolved=False` with reason | ❌ (just returns `parsed=False`) | ✅ |
| Source provenance field | ❌ | ✅ `"laboratory_report"` |
| Refuses to invent ranges | ✅ (returns None) | ✅ (returns unresolved dict) |
| Output format | `{parsed, min, max}` | `{resolved, min, max, matched_by, source, reason}` |

---

## 6. Integration Risks

| Risk | Severity | Detail |
|------|----------|--------|
| Output shape change | MEDIUM | `reference_parsed` currently uses `{parsed, min, max}`; resolver produces `{resolved, min, max, matched_by, source, reason}`. Any code that reads `reference_parsed["parsed"]` must be updated to read `["resolved"]`. Affects: `validator.py` internal logic, `app.py` display, test assertions. |
| Patient validation for non-year ages | MEDIUM | `validate_patient_context()` checks `patient["age"]` (years int). For infants (age_unit = months/weeks/days), `patient["age"] = None` → validator triggers USER_INPUT_REQUIRED. The resolver uses `age_value + age_unit` correctly, but the validator gate may block before the resolver is reached. |
| Sex-specific range needs patient.sex | LOW | If patient sex is unknown and report has sex-specific ranges, resolver returns `unresolved`. This is correct SwasthSetu behavior — do not guess. |
| Age-band cross-unit conversion refused | LOW | Resolver intentionally refuses cross-unit age matching (e.g., patient in months vs. range in years). This is the correct safe behavior. |
| Tests need updating | MEDIUM | Existing tests for `validate_single_test()` assert `reference_parsed["parsed"]`. New integration tests needed for the resolver path. |

---

## 7. What Exact Function Should Eventually Call It?

The cleanest integration point is `validate_single_test()` in `extraction/validator.py`:

```python
# Current (line ~409):
reference_parsed = parse_simple_reference_range(reference_raw)

# Proposed replacement (Chunk 3):
from interpretation.reference_resolver import resolve_reference_range
reference_parsed = resolve_reference_range(reference_raw, patient)
# rename: reference_parsed["parsed"] → reference_parsed["resolved"]
```

`validate_single_test()` already receives the test dict (has `reference_raw`). It would need to also receive `patient` — currently it does NOT have it. `validate_report()` has patient; it calls `validate_tests()` → `validate_single_test()`. The patient would need to be threaded through.

**Alternatively:** The resolver call could live in `_run_extraction()` inside `pipeline.py` as a post-validation enrichment step, avoiding any change to the internal validator function signatures. This is the lower-risk integration path.

---

## 8. Tests Required for Integration

| Test | What It Verifies |
|------|-----------------|
| Simple range resolves correctly | `[13.0-18.0]` → `resolved=True, min=13.0, max=18.0` |
| Sex-specific range with patient.sex=male | `"Male: 13-17"` → resolves to male range |
| Sex-specific range with patient.sex=None | Returns `resolved=False` with reason |
| Age-band range matches patient age | `"1-6 months: 10-15"` with 3-month patient → resolves |
| Age-band range misses patient age unit | patient is in years, range in months → `resolved=False` |
| Missing reference returns resolved=False | `reference_raw=None` → `resolved=False` |
| Sample.pdf integration test | All 14 tests resolve via direct path correctly |

---

## 9. Recommendation for Chunk 3

**Wire `reference_resolver.resolve_reference_range()` into the pipeline as a post-validation enrichment step in `pipeline.py::_run_extraction()`.**

- Do NOT change `validate_single_test()` signatures in Chunk 3 (lower risk)
- After `validation` is produced, loop through `validated_test_data` and enrich each test with `resolve_reference_range(test["reference_raw"], patient)`
- Store result as `test["reference_resolved_data"]` alongside existing `test["reference_parsed"]` (backward compat)
- In Chunk 4, migrate fully to the resolver and deprecate `reference_parsed`

This staged approach avoids breaking existing tests while enabling richer resolution.
