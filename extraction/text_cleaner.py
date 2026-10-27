"""
extraction/text_cleaner.py — Backward-compatibility shim.

The actual implementation has moved to:
    extraction.swasthsetu_pipeline.text_cleaner
"""

from extraction.swasthsetu_pipeline.text_cleaner import *  # noqa: F401, F403
from extraction.swasthsetu_pipeline.text_cleaner import (
    clean_pdf_text,
)