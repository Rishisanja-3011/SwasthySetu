# SwasthSetu VERIFY Pipeline Dependency Mapping

## Package Import Relationships

```mermaid
graph TD
    App[app.py / main.py / ui_uploads.py] -->|Imports| Shims[extraction/*.py Shims]
    Vision[vision/extractor.py] -->|Imports| Shims
    Shims -->|Re-exports| Pipeline[extraction/swasthsetu_pipeline/pipeline.py]
    
    Pipeline -->|Uses| Clean[text_cleaner.py]
    Pipeline -->|Uses| Patient[patient_parser.py]
    Pipeline -->|Uses| Parser[parser.py]
    Pipeline -->|Uses| Coverage[coverage.py]
    Pipeline -->|Uses| Val[validator.py]
    Pipeline -->|Uses| Plaus[plausibility.py]
    Pipeline -->|Uses| Explain[explainer.py]
    
    Pipeline -->|Additive Call| RefRes[interpretation/reference_resolver.py]
```

## Shared Infrastructure Audit
- `vision/extractor.py` imports `extraction.pipeline`
- `vision/layout_parser.py` imports `extraction.parser`
- `app.py` / `ui_uploads.py` / `main.py` import `extraction.pipeline`

All imports remain 100% functional via backward-compatibility shims.
