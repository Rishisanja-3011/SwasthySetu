"""
extraction/pdf_reader.py — Backward-compatibility shim.

The actual implementation has moved to:
    extraction.swasthsetu_pipeline.pdf_reader
"""

from extraction.swasthsetu_pipeline.pdf_reader import *  # noqa: F401, F403
from extraction.swasthsetu_pipeline.pdf_reader import (
    extract_pdf_text,
)