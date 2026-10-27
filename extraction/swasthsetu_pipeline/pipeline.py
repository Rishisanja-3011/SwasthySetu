"""
extraction/pipeline.py

Unified extraction pipeline for blood report analysis.

PURPOSE
-------
Accept any supported input (text PDF, scanned PDF, or
pre-rendered image array) and return a fully validated,
structured extraction result by routing through the
correct text-acquisition path and then the existing
extraction modules — unchanged.

TWO PATHS
---------

TEXT PDF
    pdf_reader (PyMuPDF embedded text)
        ↓
    text_cleaner → patient_parser → parser
        → coverage → validator → plausibility

SCANNED PDF / IMAGE
    vision.scanned_pdf_reader  (render → preprocess → OCR)
        ↓
    text_cleaner → patient_parser → parser
        → coverage → validator → plausibility

The downstream extraction modules are called identically
in both paths.  No logic is duplicated.

SOURCE METADATA
---------------
Every result carries a `source` dict:

    {
        "input_type":  "text_pdf" | "scanned_pdf" | "image",
        "path":        str | None,
        "page_count":  int | None,
        "ocr_pages":   int,          # 0 for text PDFs
        "ocr_confidence": float | None,
    }

SWASTHSETU 2.0 VERIFY ENRICHMENT (Chunk 3)
-----------------------------------------
After extraction, each observation is enriched with:
  - plausibility_status  : "PLAUSIBLE" | "VERIFY" | "NOT_CHECKED"
  - status               : "HIGH" | "LOW" | "NORMAL" | "UNKNOWN"
  - needs_review         : bool
  - review_reasons       : list[str]

The PipelineResult also carries:
  - review_required          : bool
  - publish_blocking_reasons : list[str]
  - template_explanation     : list[dict]

CONSTRAINTS
-----------
- Does NOT interpret medical values beyond range comparison.
- Does NOT invent reference ranges.
- Does NOT use external medical databases.
- Does NOT connect the Knowledge Engine.
- Does NOT duplicate any existing extraction function.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import List, Optional, Union

import numpy as np

logger = logging.getLogger(__name__)


# =========================================================
# INPUT TYPE
# =========================================================

class InputType(Enum):
    TEXT_PDF    = "text_pdf"
    SCANNED_PDF = "scanned_pdf"
    IMAGE       = "image"


# =========================================================
# SOURCE METADATA
# =========================================================

@dataclass
class SourceMeta:
    """
    Metadata about how the raw text was obtained.

    Attributes
    ----------
    input_type : InputType
    path : str | None
        File path if input was a file.
    page_count : int | None
        Total pages (PDFs only).
    ocr_pages : int
        Number of pages that went through OCR.
        Always 0 for text PDFs.
    ocr_confidence : float | None
        Mean OCR confidence across all OCR'd pages.
        None when no OCR was performed or confidence
        was not available.
    warnings : list[str]
        Non-fatal issues from the OCR / rendering layer.
    """
    input_type: InputType
    path: Optional[str] = None
    page_count: Optional[int] = None
    ocr_pages: int = 0
    ocr_confidence: Optional[float] = None
    warnings: List[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "input_type":     self.input_type.value,
            "path":           self.path,
            "page_count":     self.page_count,
            "ocr_pages":      self.ocr_pages,
            "ocr_confidence": self.ocr_confidence,
            "warnings":       list(self.warnings),
        }


# =========================================================
# PIPELINE RESULT
# =========================================================

@dataclass
class PipelineResult:
    """
    Complete output of the extraction pipeline.

    Attributes
    ----------
    source : SourceMeta
        How and where the text was obtained.
    raw_text : str
        Text as returned by the acquisition layer
        (before cleaning).
    cleaned_text : str
        Text after text_cleaner.clean_pdf_text().
    patient : dict
        Output of patient_parser.extract_patient_context().
    tests : list[dict]
        Output of parser.parse_cbc(), enriched with:
          - plausibility_status
          - status (HIGH/LOW/NORMAL/UNKNOWN)
          - needs_review
          - review_reasons
    coverage : dict
        Output of coverage.check_cbc_coverage().
    validation : dict
        Output of validator.validate_report().
    plausibility : dict | None
        Output of plausibility.check_report_plausibility().
        None when validation.can_analyze is False.

    SwasthSetu 2.0 VERIFY fields
    --------------------------
    review_required : bool
        True if any observation has needs_review=True.
    publish_blocking_reasons : list[str]
        Engine-sourced reasons the report cannot be
        published yet.  The platform layer may add its own.
    template_explanation : list[dict]
        Deterministic per-observation explanation strings.
        Empty when no observations passed validation.
    """
    source: SourceMeta
    raw_text: str
    cleaned_text: str
    patient: dict
    tests: List[dict]
    coverage: dict
    validation: dict
    plausibility: Optional[dict] = None

    # SwasthSetu 2.0 VERIFY fields (Chunk 3)
    review_required: bool = False
    publish_blocking_reasons: List[str] = field(default_factory=list)
    template_explanation: List[dict] = field(default_factory=list)

    def __repr__(self) -> str:
        return (
            f"PipelineResult("
            f"input={self.source.input_type.value}, "
            f"tests={len(self.tests)}, "
            f"status={self.validation.get('status')!r})"
        )


def _resolve_helper(name: str):
    """
    Resolve a pipeline helper function, checking if it has been patched
    on the backward-compatibility shim module (extraction.pipeline).
    """
    import sys
    shim = sys.modules.get("extraction.pipeline")
    if shim and hasattr(shim, name):
        val = getattr(shim, name)
        if val is not globals().get(name):
            return val
    return globals()[name]


# =========================================================
# INTERNAL: EXISTING EXTRACTION PIPELINE
# =========================================================

def _run_extraction(raw_text: str) -> tuple:
    """
    Run the existing extraction modules on raw text.

    Returns (cleaned_text, patient, tests, coverage,
             validation, plausibility).

    This function is the single place that calls every
    existing extraction module.  It must never be
    duplicated.
    """
    from extraction.swasthsetu_pipeline.text_cleaner   import clean_pdf_text
    from extraction.swasthsetu_pipeline.patient_parser import extract_patient_context
    from extraction.swasthsetu_pipeline.parser         import parse_cbc
    from extraction.swasthsetu_pipeline.coverage       import check_cbc_coverage
    from extraction.swasthsetu_pipeline.validator      import validate_report
    from extraction.swasthsetu_pipeline.plausibility   import check_report_plausibility

    cleaned   = clean_pdf_text(raw_text)
    patient   = extract_patient_context(cleaned)
    tests     = parse_cbc(cleaned)
    coverage  = check_cbc_coverage(tests)
    validation = validate_report(patient=patient, tests=tests)

    plausibility = None
    if validation["can_analyze"]:
        valid_tests  = validation.get("validated_test_data", [])
        plausibility = check_report_plausibility(valid_tests)

    return cleaned, patient, tests, coverage, validation, plausibility


# =========================================================
# INTERNAL: SWASTHSETU VERIFY ENRICHMENT — STEP 1
# Promote plausibility_status into each test dict
# =========================================================

def _merge_plausibility_status(
    tests: List[dict],
    plausibility: Optional[dict],
) -> None:
    """
    Merge plausibility status from the plausibility result
    into each test dict (in-place).

    Adds ``plausibility_status`` to every test:
      - "PLAUSIBLE"   — value passed sanity bounds
      - "VERIFY"      — value flagged for manual check
      - "NOT_CHECKED" — plausibility was not run (can_analyze=False)
                        or the test was not found in results

    The existing ``plausibility`` structure is untouched.
    """
    if plausibility is None:
        for test in tests:
            test.setdefault("plausibility_status", "NOT_CHECKED")
        return

    status_by_name: dict = {
        r["test"]: r["status"]
        for r in plausibility.get("results", [])
    }

    for test in tests:
        name = test.get("canonical_name", "")
        raw_status = status_by_name.get(name, "NOT_CHECKED")
        # Map plausibility module's "PLAUSIBLE" / "VERIFY" verbatim;
        # anything unexpected defaults to "NOT_CHECKED".
        if raw_status in ("PLAUSIBLE", "VERIFY"):
            test["plausibility_status"] = raw_status
        else:
            test["plausibility_status"] = "NOT_CHECKED"


# =========================================================
# INTERNAL: SWASTHSETU VERIFY ENRICHMENT — STEP 2
# HIGH / LOW / NORMAL / UNKNOWN classification
# =========================================================

def _classify_observation_status(test: dict) -> str:
    """
    Determine whether a single observation's value is
    HIGH, LOW, NORMAL, or UNKNOWN.

    Classification is based exclusively on the reference
    range extracted from the laboratory report
    (reference_parsed).  No external medical database is
    used.

    Rules
    -----
    - value is None                       → UNKNOWN
    - reference_parsed absent or unparsed → UNKNOWN
    - value < reference_parsed.min        → LOW
    - value > reference_parsed.max        → HIGH
    - value == reference_parsed.min       → NORMAL (boundary)
    - value == reference_parsed.max       → NORMAL (boundary)
    - otherwise                           → NORMAL
    """
    value = test.get("value")
    if value is None:
        return "UNKNOWN"

    ref = test.get("reference_parsed") or {}
    if not ref.get("parsed", False):
        return "UNKNOWN"

    low  = ref.get("min")
    high = ref.get("max")

    if low is None or high is None:
        return "UNKNOWN"

    if value < low:
        return "LOW"
    if value > high:
        return "HIGH"
    return "NORMAL"


def _enrich_observation_status(tests: List[dict]) -> None:
    """Add ``status`` to every test dict (in-place)."""
    for test in tests:
        test["status"] = _classify_observation_status(test)


# =========================================================
# INTERNAL: SWASTHSETU VERIFY ENRICHMENT — STEP 3
# needs_review + review_reasons per observation
# =========================================================

def _apply_needs_review(test: dict) -> tuple:
    """
    Determine whether an observation requires human review
    before the report can be published.

    Returns (needs_review: bool, review_reasons: list[str]).

    Reason codes
    ------------
    VALUE_MISSING              — value could not be extracted
    PLAUSIBILITY_VERIFY        — value outside extraction sanity bounds
    REFERENCE_RANGE_MISSING    — no reference range in report
    REFERENCE_RANGE_UNPARSABLE — range present but could not be parsed
    UNIT_MISSING               — unit not extracted
    UNIT_UNRECOGNIZED          — unit present but not recognised

    Important: HIGH or LOW classification alone does NOT
    trigger needs_review.  Classification describes the
    report's own reference range; needs_review is a
    data-quality / reliability flag.
    """
    reasons: List[str] = []

    # VALUE_MISSING
    if test.get("value") is None:
        reasons.append("VALUE_MISSING")

    # PLAUSIBILITY_VERIFY
    if test.get("plausibility_status") == "VERIFY":
        reasons.append("PLAUSIBILITY_VERIFY")

    # REFERENCE_RANGE_MISSING / REFERENCE_RANGE_UNPARSABLE
    ref_raw = test.get("reference_raw")
    ref     = test.get("reference_parsed") or {}
    if not ref_raw:
        reasons.append("REFERENCE_RANGE_MISSING")
    elif not ref.get("parsed", False):
        reasons.append("REFERENCE_RANGE_UNPARSABLE")

    # UNIT_MISSING / UNIT_UNRECOGNIZED
    unit = test.get("unit")
    if not unit:
        reasons.append("UNIT_MISSING")
    else:
        # unit_valid is set by the validator on validated tests;
        # fall back to checking validation_issues if present.
        unit_valid = test.get("unit_valid")
        if unit_valid is False:
            reasons.append("UNIT_UNRECOGNIZED")
        else:
            # Check validation_issues embedded in the test dict
            issues = test.get("validation_issues") or []
            issue_fields = {i.get("field") for i in issues}
            if "unrecognized_unit" in issue_fields:
                reasons.append("UNIT_UNRECOGNIZED")

    return bool(reasons), reasons


def _enrich_needs_review(tests: List[dict]) -> None:
    """Add ``needs_review`` and ``review_reasons`` to every test (in-place)."""
    for test in tests:
        nr, rr = _apply_needs_review(test)
        test["needs_review"]   = nr
        test["review_reasons"] = rr


# =========================================================
# INTERNAL: SWASTHSETU VERIFY ENRICHMENT — STEP 4
# Report-level review_required + publish_blocking_reasons
# =========================================================

def _compute_report_review(
    tests: List[dict],
    validation: dict,
    coverage: dict,
) -> tuple:
    """
    Compute report-level review signals.

    Returns (review_required: bool, publish_blocking_reasons: list[str]).

    The report engine does NOT make the final publish
    decision — that belongs to the platform layer.
    This function only surfaces the engine-sourced reasons.
    """
    reasons: List[str] = []

    # Processing-level block
    if not validation.get("can_analyze", True):
        status = validation.get("status", "UNKNOWN")
        reasons.append(
            f"Report processing blocked: {status}"
        )

    # Observation-level review
    obs_review = any(
        t.get("needs_review", False) for t in tests
    )
    if obs_review:
        reasons.append(
            "One or more observations require review before publishing"
        )

    # Duplicate markers block publish
    duplicates = coverage.get("duplicate_markers", [])
    if duplicates:
        reasons.append(
            f"Duplicate CBC markers detected and must be resolved: "
            f"{', '.join(duplicates)}"
        )

    review_required = obs_review
    return review_required, reasons


# =========================================================
# INTERNAL: TEXT PDF PATH
# =========================================================

def _process_text_pdf(path: Path) -> tuple:
    """
    Extract text from a text-based PDF using PyMuPDF.

    Returns (raw_text, source_meta).
    """
    import pymupdf

    doc = pymupdf.open(str(path))
    pages = []
    try:
        for i, page in enumerate(doc):
            text = page.get_text("text")
            pages.append(f"\n--- PAGE {i + 1} ---\n{text}")
    finally:
        doc.close()

    raw_text = "\n".join(pages)

    if not raw_text.strip():
        raise ValueError(
            "No embedded text detected. "
            "This may be a scanned/image-based PDF."
        )

    meta = SourceMeta(
        input_type=InputType.TEXT_PDF,
        path=str(path),
        page_count=len(pages),
        ocr_pages=0,
    )
    return raw_text, meta


# =========================================================
# INTERNAL: SCANNED / MIXED PDF PATH
# =========================================================

def _process_scanned_pdf(
    path: Path,
    ocr_engine=None,
    dpi: int = 300,
) -> tuple:
    """
    Render + preprocess + OCR a scanned (or mixed) PDF.

    Returns (raw_text, source_meta).
    """
    from vision.scanned_pdf_reader import read_pdf

    result = read_pdf(path, ocr_engine=ocr_engine, dpi=dpi)

    meta = SourceMeta(
        input_type=InputType.SCANNED_PDF,
        path=str(path),
        page_count=result.page_count,
        ocr_pages=result.ocr_page_count,
        warnings=list(result.warnings),
    )
    return result.text, meta


# =========================================================
# INTERNAL: IMAGE PATH
# =========================================================

def _process_image(
    image: np.ndarray,
    ocr_engine=None,
) -> tuple:
    """
    Preprocess + OCR a single image array.

    Returns (raw_text, source_meta).
    """
    from vision.preprocessor import preprocess_image
    from vision.ocr_result   import OCRResult

    if ocr_engine is None:
        from vision.ocr_paddle import PaddleOCREngine
        ocr_engine = PaddleOCREngine()

    prep   = preprocess_image(image)
    result: OCRResult = ocr_engine.extract(prep.image, page_number=0)

    # Wrap in page markers so text_cleaner works identically
    raw_text = f"\n--- PAGE 1 ---\n{result.text}"

    meta = SourceMeta(
        input_type=InputType.IMAGE,
        path=None,
        page_count=1,
        ocr_pages=1,
        ocr_confidence=result.confidence,
        warnings=list(result.warnings),
    )
    return raw_text, meta


# =========================================================
# INTERNAL: REFERENCE RESOLVER ENRICHMENT (Step 7)
# =========================================================

def _enrich_reference_resolved(
    tests: List[dict],
    patient: dict,
) -> None:
    """
    Optionally enrich each test with the full
    reference_resolver output as ``reference_resolved_data``.

    This is additive: the existing ``reference_parsed``
    field is preserved unchanged for backward compatibility.

    If the resolver is unavailable or raises unexpectedly,
    this step is silently skipped — it must not break the
    core pipeline.
    """
    try:
        from interpretation.reference_resolver import (
            resolve_reference_range,
        )
    except ImportError:
        logger.debug(
            "reference_resolver not available — "
            "skipping resolver enrichment"
        )
        return

    for test in tests:
        ref_raw = test.get("reference_raw")
        try:
            resolved = resolve_reference_range(
                ref_raw, patient
            )
            test["reference_resolved_data"] = resolved
        except Exception as exc:  # pragma: no cover
            logger.debug(
                "reference_resolver failed for %s: %s",
                test.get("canonical_name"),
                exc,
            )
            test["reference_resolved_data"] = None


# =========================================================
# PUBLIC API
# =========================================================

def process(
    source: Union[str, Path, np.ndarray],
    ocr_engine=None,
    dpi: int = 300,
    force_ocr: bool = False,
) -> PipelineResult:
    """
    Run the full extraction pipeline on any supported input.

    Parameters
    ----------
    source : str | Path | np.ndarray
        - str / Path ending in .pdf  → PDF (auto-detected)
        - np.ndarray                 → pre-rendered image
    ocr_engine : BaseOCREngine | None
        OCR engine for scanned pages / images.
        If None, PaddleOCREngine with defaults is used
        when OCR is needed.
    dpi : int
        Render resolution for scanned PDF pages. Default 300.
    force_ocr : bool
        If True, treat every PDF page as scanned regardless
        of embedded text.  Useful for testing.

    Returns
    -------
    PipelineResult

    Raises
    ------
    FileNotFoundError
        If a file path does not exist.
    ValueError
        If the input type cannot be determined or the file
        cannot be opened.
    TypeError
        If source is not a str, Path, or numpy array.
    """

    # --------------------------------------------------
    # IMAGE ARRAY
    # --------------------------------------------------
    if isinstance(source, np.ndarray):
        logger.info("pipeline: input=image shape=%s", source.shape)
        raw_text, meta = _resolve_helper("_process_image")(source, ocr_engine=ocr_engine)

    # --------------------------------------------------
    # FILE PATH
    # --------------------------------------------------
    elif isinstance(source, (str, Path)):
        path = Path(source)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")

        suffix = path.suffix.lower()

        if suffix in {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff", ".webp"}:
            from vision.preprocessor import load_image

            logger.info("pipeline: input=image path=%s", path.name)
            image = load_image(path)
            raw_text, meta = _resolve_helper("_process_image")(
                image,
                ocr_engine=ocr_engine,
            )
            meta.path = str(path)

        elif suffix == ".pdf":
            if force_ocr:
                logger.info("pipeline: input=scanned_pdf (forced) path=%s", path.name)
                raw_text, meta = _resolve_helper("_process_scanned_pdf")(
                    path, ocr_engine=ocr_engine, dpi=dpi
                )
            else:
                # Classify to choose the right path
                from vision.pdf_classifier import classify_pdf
                classification = classify_pdf(path)

                if classification.is_fully_text:
                    logger.info("pipeline: input=text_pdf path=%s", path.name)
                    raw_text, meta = _resolve_helper("_process_text_pdf")(path)
                else:
                    logger.info(
                        "pipeline: input=scanned_pdf path=%s "
                        "(scanned_pages=%d)",
                        path.name,
                        len(classification.scanned_pages()),
                    )
                    raw_text, meta = _resolve_helper("_process_scanned_pdf")(
                        path, ocr_engine=ocr_engine, dpi=dpi
                    )

        else:
            raise ValueError(
                f"Unsupported file type: {path.suffix!r}. "
                "Supported inputs are PDF files, image files, "
                "or numpy image arrays."
            )

    else:
        raise TypeError(
            f"source must be a file path (str/Path) or a numpy array. "
            f"Got {type(source).__name__!r}."
        )

    # --------------------------------------------------
    # EXISTING EXTRACTION PIPELINE (identical for all paths)
    # --------------------------------------------------
    (
        cleaned, patient, tests,
        coverage, validation, plausibility,
    ) = _resolve_helper("_run_extraction")(raw_text)

    # --------------------------------------------------
    # SWASTHSETU 2.0 VERIFY ENRICHMENT
    #
    # IMPORTANT: Enrichment runs on validated_test_data,
    # not on the raw parse_cbc output.
    #
    # raw tests (parse_cbc output) have:
    #   canonical_name, raw_name, value, unit, reference_raw
    #   but NO reference_parsed
    #
    # validated_test_data (validator output) have:
    #   all of the above PLUS reference_parsed {parsed, min, max}
    #   and unit/value confirmed present
    #
    # When can_analyze=True we enrich validated_test_data and
    # expose it as PipelineResult.tests.
    # When can_analyze=False there are no validated tests;
    # PipelineResult.tests is set to an empty list.
    # --------------------------------------------------

    can_analyze      = validation.get("can_analyze", False)
    enriched_tests   = list(validation.get("validated_test_data", [])) if can_analyze else []

    # Step 1: Promote plausibility status into each test
    _merge_plausibility_status(enriched_tests, plausibility)

    # Step 7: Reference resolver enrichment (additive, safe)
    _enrich_reference_resolved(enriched_tests, patient)

    # Step 2: HIGH / LOW / NORMAL / UNKNOWN classification
    _enrich_observation_status(enriched_tests)

    # Step 3: needs_review + review_reasons per observation
    _enrich_needs_review(enriched_tests)

    # Step 4: Report-level review signals
    review_required, blocking_reasons = _compute_report_review(
        enriched_tests, validation, coverage
    )

    # Step 5: Template explanation
    from extraction.swasthsetu_pipeline.explainer import generate_explanations
    template_explanation = generate_explanations(enriched_tests)

    logger.info(
        "pipeline: complete — input=%s tests=%d status=%s "
        "review_required=%s",
        meta.input_type.value,
        len(enriched_tests),
        validation.get("status"),
        review_required,
    )

    return PipelineResult(
        source=meta,
        raw_text=raw_text,
        cleaned_text=cleaned,
        patient=patient,
        tests=enriched_tests,
        coverage=coverage,
        validation=validation,
        plausibility=plausibility,
        review_required=review_required,
        publish_blocking_reasons=blocking_reasons,
        template_explanation=template_explanation,
    )

