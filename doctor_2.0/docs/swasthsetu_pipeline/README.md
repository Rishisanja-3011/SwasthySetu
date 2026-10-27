# SwasthSetu VERIFY Pipeline Architecture & Layout

## Package Location
`extraction/swasthsetu_pipeline/`

## Core Responsibilities
The SwasthSetu VERIFY pipeline orchestrates PDF text extraction, document text cleaning, patient metadata parsing, CBC laboratory observation parsing, coverage checking, safety validation, range plausibility verification, observation classification (HIGH/LOW/NORMAL/UNKNOWN), review gating (`needs_review`), and deterministic template explanation.

## Module Map

| Module | Location | Primary Responsibility |
|---|---|---|
| Pipeline Entry | `extraction/swasthsetu_pipeline/pipeline.py` | Orchestrates flow & VERIFY enrichment |
| Explainer | `extraction/swasthsetu_pipeline/explainer.py` | Deterministic template explanations |
| CBC Parser | `extraction/swasthsetu_pipeline/parser.py` | Regex-based CBC value & unit extraction |
| PDF Reader | `extraction/swasthsetu_pipeline/pdf_reader.py` | PyMuPDF text extraction from text PDFs |
| Text Cleaner | `extraction/swasthsetu_pipeline/text_cleaner.py` | Normalizes text and strips header/footer noise |
| Patient Parser | `extraction/swasthsetu_pipeline/patient_parser.py` | Regex parsing of age, sex, patient context |
| Coverage | `extraction/swasthsetu_pipeline/coverage.py` | CBC marker count and panel completeness checks |
| Validator | `extraction/swasthsetu_pipeline/validator.py` | Patient context & test validity checking |
| Plausibility | `extraction/swasthsetu_pipeline/plausibility.py` | Broad sanity bound checks for extracted values |

## Backward Compatibility Layer
To ensure zero breaking changes for external callers (`app.py`, `ui_uploads.py`, `main.py`, `vision/`), compatibility shims exist at the original paths:
- `extraction/pipeline.py`
- `extraction/explainer.py`
- `extraction/parser.py`
- `extraction/pdf_reader.py`
- `extraction/text_cleaner.py`
- `extraction/patient_parser.py`
- `extraction/coverage.py`
- `extraction/validator.py`
- `extraction/plausibility.py`
