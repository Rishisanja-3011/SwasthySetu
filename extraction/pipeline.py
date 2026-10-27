"""
extraction/pipeline.py — Backward-compatibility shim.

The actual implementation has moved to:
    extraction.swasthsetu_pipeline.pipeline
"""

from extraction.swasthsetu_pipeline.pipeline import *  # noqa: F401, F403
from extraction.swasthsetu_pipeline.pipeline import (
    InputType,
    SourceMeta,
    PipelineResult,
    process,
    _run_extraction,
    _process_text_pdf,
    _process_scanned_pdf,
    _process_image,
    _merge_plausibility_status,
    _enrich_reference_resolved,
    _classify_observation_status,
    _enrich_observation_status,
    _apply_needs_review,
    _enrich_needs_review,
    _compute_report_review,
)
