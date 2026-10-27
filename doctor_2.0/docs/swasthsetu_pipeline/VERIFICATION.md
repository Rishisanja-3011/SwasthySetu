# SwasthSetu VERIFY Pipeline Verification Results

## Test Suite Execution
- **Command**: `python -m pytest tests/ -q`
- **Results**: `184 passed in 0.78s`
- **Regressions**: 0

## Smoke Test Verification
- `from extraction.swasthsetu_pipeline.pipeline import process, PipelineResult` -> OK
- `from extraction.pipeline import process, PipelineResult` -> OK (Shim)
- `from extraction.validator import validate_report` -> OK (Shim)
- `from extraction.parser import TEST_ALIASES` -> OK (Shim)
- `from extraction.explainer import generate_explanations` -> OK (Shim)

## Real PDF Verification
- **`sample.pdf`**:
  - Tests extracted: 14/14
  - Validation status: `VALID`
  - `can_analyze`: `True`
  - `review_required`: `False`
  - `publish_blocking_reasons`: `[]`
  - Template explanations generated: 14/14
- **`sample2.pdf`**:
  - Validation status: `UNSAFE_TO_ANALYZE`
  - `can_analyze`: `False`
  - `publish_blocking_reasons`: `["Report processing blocked: UNSAFE_TO_ANALYZE"]`
