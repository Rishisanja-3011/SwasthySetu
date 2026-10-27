"""Upload adapters for the Streamlit UI.

This module intentionally contains no OCR or extraction logic. It only
validates upload bytes, decodes image bytes into a NumPy array, and routes the
resulting source to the existing unified extraction pipeline.
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Callable, TypeVar

import cv2
import numpy as np

from extraction.pipeline import process


SUPPORTED_UPLOAD_SUFFIXES = frozenset({".pdf", ".jpg", ".jpeg", ".png"})
IMAGE_UPLOAD_SUFFIXES = frozenset({".jpg", ".jpeg", ".png"})

T = TypeVar("T")


class UploadValidationError(ValueError):
    """Raised when an uploaded file cannot be safely processed."""


def upload_suffix(filename: str) -> str:
    """Return a validated, lower-case upload suffix."""
    suffix = Path(filename).suffix.lower()
    if suffix not in SUPPORTED_UPLOAD_SUFFIXES:
        supported = ", ".join(sorted(SUPPORTED_UPLOAD_SUFFIXES))
        raise UploadValidationError(
            f"Unsupported file type {suffix or '(no extension)'}. "
            f"Supported types: {supported}."
        )
    return suffix


def is_image_upload(filename: str) -> bool:
    """Return whether a supported filename represents an image upload."""
    return upload_suffix(filename) in IMAGE_UPLOAD_SUFFIXES


def decode_image_upload(file_bytes: bytes, filename: str) -> np.ndarray:
    """Decode a JPG/JPEG/PNG upload into the array expected by Vision.

    OpenCV is used only to decode bytes. OCR, preprocessing and report
    extraction remain exclusively in ``extraction.pipeline.process``.
    """
    if upload_suffix(filename) not in IMAGE_UPLOAD_SUFFIXES:
        raise UploadValidationError(
            "Image decoding is only available for JPG, JPEG, and PNG files."
        )
    if not file_bytes:
        raise UploadValidationError("The uploaded image is empty.")

    encoded = np.frombuffer(file_bytes, dtype=np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    if image is None or image.size == 0:
        raise UploadValidationError(
            "The uploaded image is corrupted or is not a valid JPG, JPEG, or PNG file."
        )
    return image


def process_uploaded_file(
    file_bytes: bytes,
    filename: str,
    pipeline: Callable[[str | np.ndarray], T] = process,
) -> T:
    """Route an upload to the existing PDF or image pipeline.

    PDF bytes are temporarily materialised because that pipeline path accepts
    file paths. Images are passed as arrays, invoking the pre-existing image
    preprocessing and OCR path.
    """
    suffix = upload_suffix(filename)
    if not file_bytes:
        raise UploadValidationError("The uploaded file is empty.")

    if suffix in IMAGE_UPLOAD_SUFFIXES:
        return pipeline(decode_image_upload(file_bytes, filename))

    temp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as handle:
            handle.write(file_bytes)
            temp_path = handle.name
        return pipeline(temp_path)
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
