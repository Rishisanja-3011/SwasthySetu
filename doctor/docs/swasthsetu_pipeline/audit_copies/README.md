# Audit Copies — Read Only

**IMPORTANT:**  
These are COPIES of original source files created during the SwasthSetu 2.0 pipeline audit (2026-10-03).

- The **original files remain unchanged** in their original locations.
- These copies are **NOT imported or executed** by the application.
- Do **not** modify these copies and expect changes to take effect in the app.
- Do **not** add these to any Python import path.

## File Index

| Copy | Original Path |
|------|---------------|
| `pipeline.py` | `extraction/pipeline.py` |
| `parser.py` | `extraction/parser.py` |
| `validator.py` | `extraction/validator.py` |
| `plausibility.py` | `extraction/plausibility.py` |
| `coverage.py` | `extraction/coverage.py` |
| `patient_parser.py` | `extraction/patient_parser.py` |
| `text_cleaner.py` | `extraction/text_cleaner.py` |
| `pdf_reader.py` | `extraction/pdf_reader.py` |
| `ui_uploads.py` | `ui_uploads.py` |
| `pdf_classifier.py` | `vision/pdf_classifier.py` |
| `reference_resolver.py` | `interpretation/reference_resolver.py` |
| `knowledge_engine_services_engine.py` | `knowledge_engine/services/engine.py` |

## Purpose

These copies were created to:
1. Provide a snapshot of the active pipeline at audit time
2. Support cross-referencing without navigating the full source tree
3. Serve as a reference if files are later refactored in the next implementation chunk
