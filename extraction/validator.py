"""
extraction/validator.py — Backward-compatibility shim.

The actual implementation has moved to:
    extraction.swasthsetu_pipeline.validator
"""

from extraction.swasthsetu_pipeline.validator import *  # noqa: F401, F403
from extraction.swasthsetu_pipeline.validator import (
    validate_report,
    validate_tests,
    validate_patient_context,
    apply_patient_corrections,
)