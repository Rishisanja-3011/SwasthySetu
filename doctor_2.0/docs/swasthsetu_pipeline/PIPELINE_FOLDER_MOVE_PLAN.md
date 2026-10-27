# Pipeline Folder Move Plan — Final Classification

**Date:** 2026-10-03  
**Baseline tests:** 184 passed  
**Outcome:** Documentation-only organization. No source files moved.

---

## Classification (per file)

| File | Classification | Reason |
|------|---------------|--------|
| `extraction/pipeline.py` | **SHARED — KEEP IN PLACE** | Imported by `app.py`, `ui_uploads.py`, `vision/extractor.py`, 3 test files. Moving without shims would break all callers. |
| `extraction/parser.py` | **SHARED — KEEP IN PLACE** | `TEST_ALIASES` imported by `vision/layout_parser.py`. Moving breaks the vision OCR path. |
| `extraction/validator.py` | **SHARED — KEEP IN PLACE** | `apply_patient_corrections` and `validate_report` imported by `app.py`. Moving breaks active UI. |
| `extraction/plausibility.py` | **SHARED — KEEP IN PLACE** | Imported by `app.py` and `main.py`. Shared infrastructure. |
| `extraction/patient_parser.py` | **SHARED — KEEP IN PLACE** | Imported by `main.py`. |
| `extraction/coverage.py` | **SHARED — KEEP IN PLACE** | Imported by `main.py`. |
| `extraction/text_cleaner.py` | **SHARED — KEEP IN PLACE** | Imported by `main.py`. |
| `extraction/pdf_reader.py` | **SHARED — KEEP IN PLACE** | Imported by `main.py`. |
| `extraction/explainer.py` | **SwasthSetu-specific — KEEP IN PLACE** | Only imported by `extraction/pipeline.py` and tests. Could be moved safely in isolation, but since pipeline.py stays, co-locating here is logical. Clearly documented as SwasthSetu-specific in `extraction/README.md`. |
| `interpretation/reference_resolver.py` | **DO NOT MOVE** | Shared by `vision/extractor.py` and `extraction/pipeline.py`. Neutral location is correct. |
| `vision/` (entire dir) | **DO NOT MOVE** | Shared OCR and PDF classification infrastructure. |
| `knowledge_engine/` | **DO NOT MOVE** | Must remain completely disconnected from the VERIFY pipeline. |
| `medical_reference/` | **DO NOT MOVE** | Unused scaffolding. Not part of active pipeline. |

---

## Physical Organization Choices

### `extraction/swasthsetu_pipeline/` subdirectory

**Decision: NOT CREATED.**

Reason: All 9 active extraction modules have external callers. Creating the subdirectory and moving files would require 9 backward-compatibility shims (one per file), adding maintenance overhead and coupling risk with no behavioral benefit. The organizational goal is achieved through documentation (README, PIPELINE_FOLDER_STRUCTURE.md) rather than physical file moves.

### Test files

**Decision: NOT MOVED.**

All test files in `tests/extraction/` import via `extraction.X` paths. These paths remain stable. Moving test files adds rename-import risk with no benefit.

---

## Rollback Plan

No code was moved. No rollback required.

If a future team decides to physically move files into a `swasthsetu_pipeline/` subfolder, the correct approach is:

1. Create `extraction/swasthsetu_pipeline/` as a Python package
2. Copy (not move) each file in — verify tests
3. Replace original file with a one-line shim re-exporting from the new path
4. Verify 184+ tests pass at every step
5. Remove the originals only after full team sign-off

---

## Files That Could Be Safely Moved in a Future Refactor (Low Risk)

| File | Why Relatively Safe | Remaining Risk |
|------|--------------------|-|
| `extraction/explainer.py` | Only 2 callers: `pipeline.py` + test files | Shim needed; low risk |
| `extraction/plausibility.py` | `app.py` + `main.py` are callers; `main.py` is legacy CLI | Shim needed; medium risk |
| `extraction/coverage.py` | Only `main.py` + pipeline internals | Shim needed; low risk |

---

## Final Decision

**Zero files moved. Zero compatibility shims added. Zero behavior changes.**

The pipeline is documented (see `PIPELINE_FOLDER_STRUCTURE.md`, `extraction/README.md`), clearly identifiable, and fully tested at 184 passing tests.
