"""
extraction/coverage.py — Backward-compatibility shim.

The actual implementation has moved to:
    extraction.swasthsetu_pipeline.coverage
"""

from extraction.swasthsetu_pipeline.coverage import *  # noqa: F401, F403
from extraction.swasthsetu_pipeline.coverage import (
    check_cbc_coverage,
    SUPPORTED_CBC_MARKERS,
) 