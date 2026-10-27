# SwasthSetu VERIFY Pipeline — Current Folder Structure

**Date:** 2026-10-03  
**Organization approach:** Documentation-based. Physical file structure unchanged.

---

## Active Pipeline

The SwasthSetu VERIFY pipeline is invoked via:

```python
from extraction.pipeline import process
result = process("report.pdf")  # returns PipelineResult
```

---

## File Map

### `extraction/` — Core Extraction Package

| File | SwasthSetu Role | Shared By |
|------|--------------|-----------|
| `pipeline.py` | 🟢 **VERIFY Orchestrator** — the main entry point | `app.py`, `ui_uploads.py`, `vision/extractor.py` |
| `parser.py` | 🟢 **CBC Parser** — test-name normalization, TEST_ALIASES | `vision/layout_parser.py` |
| `text_cleaner.py` | 🟢 **Text Cleaner** — strips page markers, normalizes text | `main.py` |
| `patient_parser.py` | 🟢 **Patient Parser** — age, sex extraction | `main.py` |
| `pdf_reader.py` | 🟢 **PDF Text Reader** — PyMuPDF embedded text | `main.py` |
| `coverage.py` | 🟢 **CBC Coverage** — checks which markers are present | `main.py` |
| `validator.py` | 🟢 **Validator** — structural validation, unit check, reference parsing | `app.py`, `main.py` |
| `plausibility.py` | 🟢 **Plausibility** — sanity bounds check per observation | `app.py`, `main.py` |
| `explainer.py` | 🟡 **Template Explainer** — SwasthSetu-specific only | `pipeline.py`, tests |

> 🟢 = SwasthSetu pipeline module that is also shared infrastructure  
> 🟡 = SwasthSetu-specific module (no active callers outside the pipeline)

---

## Shared Infrastructure (not part of extraction package)

| Package | SwasthSetu Use | Also Used By |
|---------|-------------|--------------|
| `vision/pdf_classifier.py` | PDF text vs. scanned classification | `vision/extractor.py` |
| `vision/scanned_pdf_reader.py` | OCR for scanned PDFs | `vision/extractor.py` |
| `interpretation/reference_resolver.py` | Per-patient reference range resolution | `vision/extractor.py` |

---

## Disconnected Components (must NOT be wired)

| Component | Reason Disconnected |
|-----------|-------------------|
| `knowledge_engine/` | Clinical pattern names = diagnosis; prohibited by SwasthSetu 2.0 |
| `medical_reference/` | Ranges must come from the report only; external DB prohibited |

---

## Runtime Flow

```
Input PDF
    ↓
extraction.pipeline.process()
    │
    ├── vision.pdf_classifier.classify_pdf()      # text or scanned?
    │
    ├── [text path]  extraction.pdf_reader         # PyMuPDF
    │   [scan path]  vision.scanned_pdf_reader    # OCR
    │
    ├── extraction.text_cleaner.clean_pdf_text()
    ├── extraction.patient_parser.extract_patient_context()
    ├── extraction.parser.parse_cbc()
    ├── extraction.coverage.check_cbc_coverage()
    ├── extraction.validator.validate_report()
    ├── extraction.plausibility.check_report_plausibility()
    │
    ├── [VERIFY enrichment — Chunk 3]
    │   ├── _merge_plausibility_status()           # promotes plaus per test
    │   ├── _enrich_reference_resolved()           # interpretation.reference_resolver
    │   ├── _enrich_observation_status()           # HIGH/LOW/NORMAL/UNKNOWN
    │   ├── _enrich_needs_review()                 # needs_review + review_reasons
    │   ├── _compute_report_review()               # review_required + blocking
    │   └── extraction.explainer.generate_explanations()
    │
    └── PipelineResult (structured VERIFY output)
```

---

## Test Locations

| Test File | What It Tests |
|-----------|--------------|
| `tests/extraction/test_pipeline.py` | Pipeline orchestration + Chunk 3 enrichment (C1–C8) |
| `tests/extraction/test_classification.py` | `_classify_observation_status`, `_apply_needs_review`, `_merge_plausibility_status`, `_compute_report_review` |
| `tests/extraction/test_explainer.py` | `generate_explanations`, all variants, determinism, forbidden-word check |
| `tests/extraction/test_validator.py` | `validate_tests` |
| `tests/extraction/test_plausibility.py` | `check_report_plausibility` |
| `tests/extraction/test_coverage.py` | `check_cbc_coverage` |
| `tests/extraction/test_patient_parser.py` | `extract_patient_context` |

---

## How to Run the Full Pipeline Test Suite

```bash
python -m pytest tests/ -v
# Expected: 184+ passed, 0 failed
```

---

## Invoking the Pipeline

### From code:
```python
from extraction.pipeline import process, PipelineResult

result: PipelineResult = process("path/to/report.pdf")

# Key fields
result.tests               # list of enriched CBC observations
result.review_required     # bool — any observation needs_review?
result.publish_blocking_reasons  # list[str] — engine-sourced reasons
result.template_explanation      # list[dict] — patient-facing text
```

### Each observation in `result.tests`:
```python
{
    "canonical_name":        "hemoglobin",
    "value":                 15.9,
    "unit":                  "g/dl",
    "reference_raw":         "[13.0-18.0]",
    "reference_parsed":      {"parsed": True, "min": 13.0, "max": 18.0},
    "reference_resolved_data": {...},   # from interpretation.reference_resolver
    "plausibility_status":   "PLAUSIBLE",
    "status":                "NORMAL",   # HIGH | LOW | NORMAL | UNKNOWN
    "needs_review":          False,
    "review_reasons":        []
}
```

---

## Import Boundaries

```
extraction.pipeline        ← public API entry point
extraction.explainer       ← SwasthSetu-specific (no outside imports)
interpretation.reference_resolver  ← shared; never moved or duplicated
vision.*                   ← imaging infrastructure; stays separate
knowledge_engine.*         ← stays disconnected always
```
