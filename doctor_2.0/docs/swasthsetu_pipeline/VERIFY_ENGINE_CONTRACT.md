# VERIFY Engine Contract

**Chunk:** 2 — Analysis Only  
**Date:** 2026-10-03  
**Status:** PROPOSED — not yet implemented

---

## Purpose

This document defines the data contract that the SwasthSetu 2.0 VERIFY engine must produce.

The engine's job is to reliably convert a CBC PDF into a structured, machine-readable set of laboratory observations that the future Lab Review + Publish layer can act on.

The engine does **not** publish the report. It does **not** present a UI. It does **not** store data. It hands a structured result to the platform layer.

---

## Current PipelineResult vs Required Contract

The current `PipelineResult` already carries most required fields but is missing three: `status` per observation (HIGH/LOW/NORMAL), `needs_review` per observation, and `review_required` at report level.

---

## A. Report-Level Fields

| Field | Type | Required | Current State | Notes |
|-------|------|----------|---------------|-------|
| `source.input_type` | enum | ✅ | `text_pdf \| scanned_pdf \| image` | Provenance: how text was obtained |
| `source.path` | str \| None | ✅ | Present | Original file reference |
| `source.page_count` | int \| None | ✅ | Present | PDF metadata |
| `source.ocr_pages` | int | ✅ | Present (0 for digital PDFs) | Always 0 for digital-PDF path |
| `source.ocr_confidence` | float \| None | ✅ | Present | None when no OCR |
| `source.warnings` | list[str] | ✅ | Present | Non-fatal acquisition warnings |
| `processing_status` | enum | ✅ | Implicit via validation.status | Must become explicit: `VALID \| PARTIAL \| UNSAFE_TO_ANALYZE \| NEEDS_USER_INPUT` |
| `coverage.status` | enum | ✅ | Present: `COMPLETE \| INCOMPLETE \| NO_COVERAGE` | Parser completeness |
| `coverage.coverage_percent` | float | ✅ | Present | |
| `coverage.missing_markers` | list[str] | ✅ | Present | |
| `coverage.duplicate_markers` | list[str] | ✅ | Present | |
| `review_required` | bool | ❌ **MISSING** | Not present | True if any observation is needs_review=True |
| `publish_blocking_reasons` | list[str] | ❌ **MISSING** | Not present | Reasons the report cannot be published yet |
| `warnings` | list[str] | ✅ | Present via source.warnings + validation.issues | Should be unified at report level |
| `errors` | list[dict] | ✅ | Present via validation.issues | |

---

## B. Patient Fields

| Field | Type | Required | Current State | Notes |
|-------|------|----------|---------------|-------|
| `patient.age_value` | int \| None | ✅ | Present | Numeric age value |
| `patient.age_unit` | str \| None | ✅ | Present: `years \| months \| weeks \| days` | Preserved in original unit |
| `patient.sex` | str \| None | ✅ | Present: `male \| female` | Normalized |
| `patient.age` | int \| None | 🟡 backward-compat | Present | Legacy years-only field; keep for now |

---

## C. Per-Observation Fields

Each entry in `tests` must carry these fields after the VERIFY engine contract is implemented:

| Field | Type | Required | Current State | Notes |
|-------|------|----------|---------------|-------|
| `raw_name` | str | ✅ | Present | Test name exactly as it appeared in report |
| `canonical_name` | str | ✅ | Present | Normalized identifier (e.g., `hemoglobin`) |
| `value` | float \| None | ✅ | Present | Extracted numeric value |
| `unit` | str \| None | ✅ | Present | Preserved from report; never substituted |
| `reference_raw` | str \| None | ✅ | Present | Raw reference text from report |
| `reference_low` | float \| None | ✅ | Present via `reference_parsed.min` | Rename for clarity |
| `reference_high` | float \| None | ✅ | Present via `reference_parsed.max` | Rename for clarity |
| `reference_source` | str | ✅ | `"laboratory_report"` in resolver; not in pipeline output | Always `"laboratory_report"` — never external default |
| `reference_resolved` | bool | ✅ | Present via `reference_parsed.parsed` | True if min/max were successfully parsed |
| `status` | enum | ❌ **MISSING** | Not generated | `HIGH \| LOW \| NORMAL \| UNKNOWN` |
| `needs_review` | bool | ❌ **MISSING** | Not present | True when observation requires human verification |
| `plausibility_status` | str | ✅ | Present inside `plausibility.results` | `PLAUSIBLE \| VERIFY \| NOT_CHECKED` — should be promoted to per-test field |
| `validation_issues` | list[str] | ✅ | Present as invalid tests in `validation.issues` | Issue codes per test |
| `unit_valid` | bool \| None | ✅ | Implicit in validator; not surfaced per test | Should be explicit |

---

## D. What the Engine Must NOT Output

The following must never appear in the VERIFY engine output:

| Prohibited | Reason |
|-----------|--------|
| Disease names or diagnoses | SwasthSetu constraint; no diagnosis |
| Treatment recommendations | SwasthSetu constraint |
| Free-form AI interpretation | SwasthSetu constraint |
| Knowledge engine pattern names | SwasthSetu constraint; knowledge_engine disconnected and must stay so |
| Invented reference ranges | SwasthSetu constraint; if range missing → reference_resolved=False |
| Silent unit substitution | SwasthSetu constraint; unrecognized unit → flagged, not guessed |

---

## E. Template Explanation Contract

The VERIFY engine may optionally produce a `template_explanation` list — one entry per observation that passed validation. Each entry must be:

- Deterministic (same input → same output always)
- Based solely on the structured fields above
- Free of diagnosis, treatment, or medical reasoning
- Short enough to be displayed to a non-clinical patient

Proposed per-observation template:

```
"Your {canonical_name} result is {value} {unit}. 
The reference range from your report is {reference_low}–{reference_high} {unit}. 
This result is {status}."
```

When `status = UNKNOWN` or `needs_review = True`:

```
"Your {canonical_name} result could not be automatically classified. 
Please discuss this result with your healthcare provider."
```

The `template_explanation` field belongs in the VERIFY engine output as a list, positioned **after** the structured observations — not as a replacement for them.

---

## F. Proposed Updated PipelineResult Shape

```python
@dataclass
class PipelineResult:
    # --- Unchanged ---
    source: SourceMeta
    raw_text: str
    cleaned_text: str
    patient: dict
    coverage: dict
    validation: dict
    plausibility: dict | None

    # --- Currently present, needs promotion ---
    tests: list[dict]
    # Each test dict must add:
    #   status: "HIGH" | "LOW" | "NORMAL" | "UNKNOWN"
    #   needs_review: bool
    #   plausibility_status: "PLAUSIBLE" | "VERIFY" | "NOT_CHECKED"
    #   reference_low: float | None
    #   reference_high: float | None
    #   reference_source: str
    #   reference_resolved: bool

    # --- NEW fields ---
    review_required: bool          # any(t["needs_review"] for t in tests)
    publish_blocking_reasons: list[str]   # list of human-readable reasons for blocking
    template_explanation: list[dict] | None  # per-test template strings
```
