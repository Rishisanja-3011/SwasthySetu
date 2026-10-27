# extraction/

This package contains the SwasthSetu VERIFY report-processing pipeline
and the shared extraction infrastructure it calls.

---

## SwasthSetu VERIFY Pipeline Entry Point

```python
from extraction.pipeline import process, PipelineResult
result = process("path/to/report.pdf")
```

---

## File Index

| File | Role | Shared Outside Package |
|------|------|----------------------|
| `pipeline.py` | **SwasthSetu VERIFY orchestrator** — entry point, enrichment engine, `PipelineResult` | Yes — `app.py`, `ui_uploads.py`, `vision/extractor.py` |
| `explainer.py` | **SwasthSetu-specific** — deterministic template explanation generator | No (pipeline + tests only) |
| `validator.py` | Structural validation, unit check, reference range parsing | Yes — `app.py`, `main.py` |
| `plausibility.py` | Sanity bound checks per observation | Yes — `app.py`, `main.py` |
| `parser.py` | CBC alias map, `parse_cbc()`, `TEST_ALIASES` | Yes — `vision/layout_parser.py` |
| `patient_parser.py` | Age and sex extraction | Yes — `main.py` |
| `coverage.py` | CBC marker coverage check | Yes — `main.py` |
| `text_cleaner.py` | Page-marker stripping, text normalization | Yes — `main.py` |
| `pdf_reader.py` | PyMuPDF embedded text extraction | Yes — `main.py` |

---

## Shared Infrastructure (imported by pipeline, not located here)

| Module | Location | Role |
|--------|----------|------|
| `vision.pdf_classifier` | `vision/` | TEXT vs SCANNED classification |
| `vision.scanned_pdf_reader` | `vision/` | OCR for scanned PDFs |
| `interpretation.reference_resolver` | `interpretation/` | Per-patient reference range resolution |

---

## Disconnected — Must NOT Be Wired

| Component | Reason |
|-----------|--------|
| `knowledge_engine/` | Clinical pattern names = diagnosis; prohibited by SwasthSetu 2.0 |
| `medical_reference/` | External reference ranges prohibited; ranges come from the report only |

---

## Why files are NOT in a `swasthsetu_pipeline/` subfolder

All 8 shared extraction modules (`validator.py`, `parser.py`, etc.) are imported by active
callers outside this package (`app.py`, `vision/layout_parser.py`, `main.py`).
Moving them would require backward-compatibility shims with no behavioral benefit.

The pipeline is organized through documentation (see `docs/swasthsetu_pipeline/`).
Only `explainer.py` is truly SwasthSetu-specific; it stays alongside `pipeline.py`
for co-location simplicity.
