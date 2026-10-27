"""
extraction/explainer.py — Backward-compatibility shim.

The actual implementation has moved to:
    extraction.swasthsetu_pipeline.explainer
"""

from extraction.swasthsetu_pipeline.explainer import *  # noqa: F401, F403
from extraction.swasthsetu_pipeline.explainer import (
    generate_explanations,
    _DISPLAY_NAMES,
    _build_explanation,
    _display_name,
)
#     