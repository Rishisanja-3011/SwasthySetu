# Pipeline File Map

Audit Date: 2026-10-03

---

## A. ACTIVE PIPELINE FILES

| File | Role | Called By | Evidence |
|------|------|-----------|----------|
| `app.py` | Streamlit UI entry point | User run: `streamlit run app.py` | Imports pipeline, validator, plausibility, ui_uploads |
| `ui_uploads.py` | Upload routing adapter | `app.py::_run_pipeline()` | Imports `extraction.pipeline.process` |
| `extraction/pipeline.py` | Unified pipeline orchestrator | `ui_uploads.py::process_uploaded_file()` | `process()` is the main public API |
| `extraction/pdf_reader.py` | Legacy direct PDF reader | `main.py` only | Used by CLI runner; pipeline.py uses its own _process_text_pdf |
| `extraction/text_cleaner.py` | Text normalization | `extraction/pipeline.py::_run_extraction()` | Direct import in _run_extraction |
| `extraction/patient_parser.py` | Patient age/sex extraction | `extraction/pipeline.py::_run_extraction()` | Direct import in _run_extraction |
| `extraction/parser.py` | CBC field extraction (rules/regex) | `extraction/pipeline.py::_run_extraction()` | Direct import in _run_extraction |
| `extraction/coverage.py` | CBC panel coverage check | `extraction/pipeline.py::_run_extraction()` | Direct import in _run_extraction |
| `extraction/validator.py` | Structural + unit + reference validation | `extraction/pipeline.py::_run_extraction()` | Direct import in _run_extraction |
| `extraction/plausibility.py` | Extraction sanity bounds check | `extraction/pipeline.py::_run_extraction()` | Direct import in _run_extraction; ONLY if can_analyze==True |
| `vision/pdf_classifier.py` | Per-page TEXT/SCANNED classification | `extraction/pipeline.py::process()` | classify_pdf() called in process() |

## B. ACTIVE DEPENDENCIES (required by active pipeline)

| File | Role | Imported By |
|------|------|-------------|
| `vision/__init__.py` | vision package init | vision imports |
| `vision/ocr_result.py` | OCRResult dataclass | scanned_pdf_reader, ocr_base, pipeline |
| `vision/ocr_base.py` | Abstract OCR base class | ocr_paddle, scanned_pdf_reader |
| `vision/preprocessor.py` | Image preprocessing | scanned_pdf_reader, pipeline._process_image |
| `vision/pdf_renderer.py` | PDF page → image rendering | scanned_pdf_reader |
| `vision/scanned_pdf_reader.py` | Scanned PDF OCR orchestrator | extraction/pipeline._process_scanned_pdf |
| `vision/ocr_config.py` | OCR engine factory | vision/__init__.py |

## C. OPTIONAL / FALLBACK (conditionally executed)

| File | Role | Triggered By | Condition |
|------|------|--------------|-----------|
| `vision/ocr_paddle.py` | PaddleOCR concrete engine | `_process_scanned_pdf()`, `_process_image()` | Only when PDF has scanned pages or input is image |
| `extraction/pipeline.py::_process_scanned_pdf()` | Scanned PDF path | `process()` | classify_pdf returns not is_fully_text |
| `extraction/pipeline.py::_process_image()` | Image OCR path | `process()` | source is numpy.ndarray |

## D. IMPLEMENTED BUT NOT CONNECTED TO ACTIVE PIPELINE

| File | Role | Status | Evidence |
|------|------|--------|----------|
| `interpretation/reference_resolver.py` | Advanced reference range parser (age/sex/age+sex) | Implemented + tested, NOT called by pipeline | No import in pipeline.py or validator.py |
| `interpretation/age_boundary.py` | Age band comparison | Implemented + tested, NOT called by pipeline | No import in pipeline.py |

## E. LEGACY / EXTRA (existing Blood Report project infrastructure)

| File | Role | Notes |
|------|------|-------|
| `main.py` | Original CLI runner | Uses pdf_reader.py directly (not pipeline.py); not the UI path; legacy orchestration |
| `knowledge_engine/` (entire package) | Clinical pattern-matching engine | Schema-complete, has 21 tests, NOT connected to report pipeline; legacy from Blood Report project for future clinical reasoning |
| `knowledge_engine/services/engine.py` | KnowledgeEngine orchestrator | `evaluate(findings)` — not called by pipeline |
| `knowledge_engine/services/matcher.py` | Pattern matcher | Not called by pipeline |
| `knowledge_engine/services/scorer.py` | Match scorer | Not called by pipeline |
| `knowledge_engine/services/registry.py` | Pattern registry | Not called by pipeline |
| `knowledge_engine/services/generator.py` | Finding generator | Not called by pipeline |
| `knowledge_engine/models/*.py` | Domain models (Finding, Patient, etc.) | Not called by pipeline |
| `knowledge_engine/knowledge/` | Clinical knowledge patterns | Not called by pipeline |
| `medical_reference/provider.py` | Medical reference provider | Empty scaffold (0 bytes) |
| `medical_reference/models.py` | Medical reference models | Empty scaffold (0 bytes) |
| `medical_reference/mayo/` | Mayo-sourced CBC data | Not connected to pipeline |

## F. TEST ONLY

| File | Covers |
|------|--------|
| `tests/extraction/test_coverage.py` | coverage.py |
| `tests/extraction/test_patient_parser.py` | patient_parser.py |
| `tests/extraction/test_pipeline.py` | extraction/pipeline.py (ALL paths) |
| `tests/extraction/test_plausibility.py` | plausibility.py |
| `tests/extraction/test_validator.py` | validator.py |
| `tests/interpretation/test_reference_resolver.py` (inferred) | reference_resolver.py |
| `tests/knowledge_engine/test_engine.py` | KnowledgeEngine |
| `tests/knowledge_engine/test_matcher.py` | KnowledgeMatcher |
| `tests/knowledge_engine/test_scorer.py` | KnowledgeScorer |
| `tests/knowledge_engine/test_registry.py` | KnowledgeRegistry |
| `tests/knowledge_engine/test_generator.py` | KnowledgeGenerator |
| `tests/knowledge_engine/test_*.py` (21 total) | Full knowledge engine coverage |
| `tests/test_ui_uploads.py` | ui_uploads.py |
| `tests/test_ocr_model_setup.py` | OCR model config |
| `tests/vision/` (6 files) | vision/ modules |

## G. DOCUMENTATION ONLY

| File | Content |
|------|---------|
| `architecture.md` | System architecture overview (partially outdated — predates pipeline.py and vision/) |
| `database_schema_design.md` | Database schema for future SwasthSetu data layer |
| `docs/ocr_setup.md` | PaddleOCR model provisioning instructions |
| `requirements.txt` | Python dependencies |

---

## Audit Copies Index

Files copied into `audit_copies/` for reference inspection:

| Copy File | Original Path |
|-----------|---------------|
| `audit_copies/pipeline.py` | `extraction/pipeline.py` |
| `audit_copies/parser.py` | `extraction/parser.py` |
| `audit_copies/validator.py` | `extraction/validator.py` |
| `audit_copies/plausibility.py` | `extraction/plausibility.py` |
| `audit_copies/coverage.py` | `extraction/coverage.py` |
| `audit_copies/patient_parser.py` | `extraction/patient_parser.py` |
| `audit_copies/text_cleaner.py` | `extraction/text_cleaner.py` |
| `audit_copies/ui_uploads.py` | `ui_uploads.py` |
| `audit_copies/pdf_classifier.py` | `vision/pdf_classifier.py` |
| `audit_copies/reference_resolver.py` | `interpretation/reference_resolver.py` |
| `audit_copies/knowledge_engine_services_engine.py` | `knowledge_engine/services/engine.py` |
