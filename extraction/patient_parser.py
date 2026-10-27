"""
extraction/patient_parser.py — Backward-compatibility shim.

The actual implementation has moved to:
    extraction.swasthsetu_pipeline.patient_parser
"""

from extraction.swasthsetu_pipeline.patient_parser import *  # noqa: F401, F403
from extraction.swasthsetu_pipeline.patient_parser import (
    extract_patient_context,
)