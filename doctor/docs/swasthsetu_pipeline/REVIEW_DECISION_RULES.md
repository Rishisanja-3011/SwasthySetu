# Review Decision Rules

**Chunk:** 2 — Analysis Only  
**Date:** 2026-10-03  
**Status:** PROPOSED — not yet implemented

---

## Purpose

Define the exact conditions that set `needs_review = True` per observation, and the conditions that set `review_required = True` at the report level.

This must be precise. Not every validation warning should trigger NEEDS_REVIEW. There are three distinct categories:

1. **BLOCKED REPORT** — report cannot proceed at all
2. **OBSERVATION NEEDS REVIEW** — specific test is flagged; report can proceed but that test must be reviewed before publish
3. **NORMAL WARNING** — informational; does not block analysis or publishing

---

## Current Sources of Flagging (Audit Evidence)

From code inspection:

| Source | Location | What it currently does |
|--------|----------|----------------------|
| `plausibility.status == "VERIFY"` | `extraction/plausibility.py` | Flags whole report with `requires_verification=True` |
| `validation issue: missing_reference_range` | `extraction/validator.py:401-405` | Part of invalid test; test dropped from validated_test_data |
| `validation issue: unparsable_reference_range` | `extraction/validator.py:415-419` | Part of invalid test; test dropped |
| `validation issue: missing_unit` | `extraction/validator.py:372-376` | Part of invalid test; test dropped |
| `validation issue: unrecognized_unit` | `extraction/validator.py:385-390` | Part of invalid test; test dropped |
| `validation issue: missing_value` | `extraction/validator.py:356-360` | Part of invalid test; test dropped |
| `coverage.status != COMPLETE` | `extraction/coverage.py` | Coverage warning; shown in UI |
| `validation.status == NEEDS_USER_INPUT` | `extraction/validator.py:844-848` | Patient info missing; blocks analysis |
| `validation.status == UNSAFE_TO_ANALYZE` | `extraction/validator.py:830-838` | No valid tests; blocks entirely |

---

## Proposed Decision Rules

### BLOCKED REPORT (report-level; no per-test review)

These conditions make the report unfeasible for analysis. The pipeline already handles them via `can_analyze=False`. No change needed to the blocking logic — just make the reasons explicit.

| Condition | Current Signal | Proposed Signal |
|-----------|---------------|-----------------|
| No supported CBC tests detected | `validation.status == UNSAFE_TO_ANALYZE` | `processing_status = BLOCKED`, `publish_blocking_reasons = ["No supported CBC observations"]` |
| Patient age or sex missing AND user did not correct | `validation.status == NEEDS_USER_INPUT` | `processing_status = BLOCKED`, `publish_blocking_reasons = ["Patient context required"]` |

These are NOT per-observation NEEDS_REVIEW. They are pre-analysis block conditions.

---

### OBSERVATION NEEDS_REVIEW (per-test flag)

Each observation independently receives `needs_review = True` or `False`.

**Rule 1 — Plausibility VERIFY**
```
IF plausibility_status == "VERIFY"
THEN needs_review = True
REASON: "Value outside extraction sanity bounds — verify against original report"
```
This is the most important rule. A value that failed the plausibility sanity check has a meaningful probability of being an OCR or parsing error.

**Rule 2 — Missing reference range**
```
IF reference_raw is None or reference_raw == ""
THEN needs_review = True
REASON: "Reference range missing from report — cannot classify result"
```
SwasthSetu requirement: never invent a missing reference range. If the range is absent, the observation cannot be classified HIGH/LOW/NORMAL, so it must be reviewed.

**Rule 3 — Unparsable reference range**
```
IF reference_raw is not None AND reference_resolved == False
THEN needs_review = True
REASON: "Reference range present but could not be parsed — cannot classify result"
```
The value is present in the report but the parser could not interpret it (e.g., complex format like "< 150" or "> 60"). Classification is impossible without parsing; review required.

**Rule 4 — Unrecognized unit**
```
IF unit is not None AND unit_valid == False
THEN needs_review = True
REASON: "Unit is not recognized for this test type — verify unit against original report"
```

**Rule 5 — Missing unit**
```
IF unit is None or unit == ""
THEN needs_review = True
REASON: "Unit is missing — cannot validate or classify result"
```

**Rule 6 — Missing value**
```
IF value is None
THEN needs_review = True
REASON: "Test value was not extracted"
```
Note: if value is missing, `status` must be `UNKNOWN`.

---

### NOT needs_review (Normal Warnings)

These are informational and do NOT trigger per-test NEEDS_REVIEW:

| Condition | Why it is NOT needs_review |
|-----------|---------------------------|
| `coverage.status = INCOMPLETE` (some markers absent) | Missing markers are not individual test failures; they are simply absent from the report or not yet in the parser |
| `coverage.duplicate_markers` | Duplicates are a coverage/parsing concern, not a per-observation validity concern |
| Patient age using non-years unit (months/weeks/days) | Valid patient context; age-unit affects reference resolution priority but not per-test review |
| OCR confidence below threshold | A warning on the source metadata; individual values still go through all review rules above |

---

## Report-Level review_required

```
review_required = any(test["needs_review"] == True for test in tests)
```

Simple OR across all observation-level flags.

---

## publish_blocking_reasons

This is a list of human-readable strings explaining why the report cannot be published. Populated by the engine; acted on by the future platform layer.

**Reasons that should be added:**

| Trigger | Reason String |
|---------|--------------|
| `processing_status == BLOCKED` | `"Report processing did not complete: {validation.status}"` |
| `review_required == True` | `"One or more observations require review before publishing"` |
| `coverage.duplicate_markers` | `"Duplicate CBC markers were detected and must be resolved"` |

**Reasons that should NOT be added (normal warnings):**
- Incomplete coverage alone (report may still be partially publishable in future; currently a warning)

---

## Summary Table

| Condition | needs_review | review_required | BLOCKED | Normal Warning |
|-----------|-------------|-----------------|---------|----------------|
| plausibility VERIFY | ✅ TEST | ✅ REPORT | — | — |
| missing reference range | ✅ TEST | ✅ REPORT | — | — |
| unparsable reference range | ✅ TEST | ✅ REPORT | — | — |
| unrecognized unit | ✅ TEST | ✅ REPORT | — | — |
| missing unit | ✅ TEST | ✅ REPORT | — | — |
| missing value | ✅ TEST | ✅ REPORT | — | — |
| validation UNSAFE_TO_ANALYZE | — | — | ✅ | — |
| validation NEEDS_USER_INPUT | — | — | ✅ | — |
| coverage INCOMPLETE | — | — | — | ✅ |
| coverage duplicate markers | — | ✅ REPORT | — | ✅ |
| OCR low confidence | — | — | — | ✅ |

---

## Important: Current Tests That Will Pass Through Unchanged

For `sample.pdf` (the known-good case):
- All 14 tests have values, valid units, parsable reference ranges, PLAUSIBLE plausibility
- All 14 would get `needs_review = False`
- `review_required = False`
- `publish_blocking_reasons = []`
- All 14 would get `status = HIGH | LOW | NORMAL` based on reference_parsed

The rules above, if implemented correctly, would produce zero regressions on the existing passing test case.
