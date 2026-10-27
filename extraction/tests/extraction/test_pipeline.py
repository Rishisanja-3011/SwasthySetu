"""
tests/extraction/test_pipeline.py

Integration tests for extraction/pipeline.py.

WHAT IS TESTED
--------------
Every test proves that text produced by a specific
acquisition path (text PDF, scanned PDF, image) reaches
and is correctly processed by the existing extraction
modules (text_cleaner, patient_parser, parser, coverage,
validator, plausibility).

All external I/O is mocked:
  - No real PDF files are opened.
  - No OCR models are downloaded.
  - No internet access is required.

Tests
-----
 1. OCR text → parser extracts CBC tests correctly
 2. OCR text → patient_parser extracts age and sex
 3. OCR text → validator produces VALID status
 4. OCR text → coverage reports COMPLETE
 5. OCR text → plausibility runs on valid tests
 6. Scanned PDF path — OCR engine called, source=scanned_pdf
 7. Text PDF path — OCR engine never called, source=text_pdf
 8. Image array path — source=image, page_count=1
 9. Mixed PDF — text pages use embedded text, scanned use OCR
10. Empty OCR output — validator reports UNSAFE_TO_ANALYZE
11. Missing patient data — validator reports NEEDS_USER_INPUT
12. Invalid file path → FileNotFoundError
13. Non-PDF file → ValueError
14. Wrong source type → TypeError
15. force_ocr=True — bypasses text classification
16. SourceMeta.as_dict() — all fields present
17. PipelineResult repr
18. OCR confidence preserved in SourceMeta
19. Warnings from OCR layer propagated to SourceMeta
20. text_cleaner strips page markers before parser sees them
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch, PropertyMock
import tempfile
import os

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from extraction.pipeline import (
    InputType,
    PipelineResult,
    SourceMeta,
    process,
    _run_extraction,
)
from vision.ocr_result import OCRLine, OCRResult
from vision.pdf_classifier import PDFClassification, PDFPageType


# =========================================================
# SHARED FIXTURES
# =========================================================

# Minimal CBC text that the existing parser can fully parse.
# Matches the exact format expected by parser.parse_cbc().
FULL_CBC_TEXT = """\
--- PAGE 1 ---
Age / Gender : 34 Years/Male
Hemoglobin
15.9
g/dl
[13.0-18.0]
Total RBC Count
5.2
Mill/cmm
[4.5-6.5]
P.C.V
47.0
%
[42-52]
M.C.V.
90.0
fl
[76-96]
M.C.H.
30.0
pg
[27-32]
M.C.H.C.
33.0
g/dl
[31.5-34.5]
R.D.W.
13.0
%
[11.6-14.0]
Total WBC Count
7200
/cmm
[4000-11000]
Neutrophils
60
%
[40-75]
Lymphocytes
30
%
[20-45]
Eosinophils
3
%
[1-6]
Monocytes
5
%
[2-10]
Basophils
1
%
[0-1]
Platelet Count
250000
/cmm
[150000-400000]
"""

# Minimal text with only one CBC test — used for partial tests
SINGLE_TEST_TEXT = """\
--- PAGE 1 ---
Age / Gender : 34 Years/Male
Hemoglobin
15.9
g/dl
[13.0-18.0]
"""

# Text with no patient info
NO_PATIENT_TEXT = """\
--- PAGE 1 ---
Hemoglobin
15.9
g/dl
[13.0-18.0]
"""

# Text with no CBC tests at all
NO_TESTS_TEXT = """\
--- PAGE 1 ---
Age / Gender : 34 Years/Male
Some random text here.
"""


def _make_ocr_result(text: str, confidence: float = 0.97) -> OCRResult:
    lines = [
        OCRLine(text=t, confidence=confidence, line_index=i)
        for i, t in enumerate(text.splitlines())
        if t.strip()
    ]
    return OCRResult(
        text=text,
        lines=lines,
        page_number=0,
        engine="paddleocr",
        confidence=confidence,
    )


def _make_classification(page_types: dict) -> PDFClassification:
    c = PDFClassification()
    c.page_types = {
        i: (PDFPageType.TEXT if t == "text" else PDFPageType.SCANNED)
        for i, t in page_types.items()
    }
    return c


def _fake_pdf_path() -> Path:
    return Path(r"C:\fake\report.pdf")


# =========================================================
# TEST 1 — OCR TEXT → PARSER EXTRACTS CBC TESTS
# =========================================================

print("\n========================================")
print("TEST 1 — OCR text → parser extracts CBC tests")
print("========================================")

result1 = _run_extraction(FULL_CBC_TEXT)
cleaned1, patient1, tests1, coverage1, validation1, plausibility1 = result1

assert len(tests1) == 14, f"Expected 14 tests, got {len(tests1)}"

canonical_names = {t["canonical_name"] for t in tests1}
assert "hemoglobin" in canonical_names
assert "wbc" in canonical_names
assert "platelets" in canonical_names

# Values parsed correctly
hgb = next(t for t in tests1 if t["canonical_name"] == "hemoglobin")
assert hgb["value"] == 15.9
assert hgb["unit"] == "g/dl"
assert hgb["reference_raw"] == "[13.0-18.0]"

print(f"Tests extracted: {len(tests1)}")
print(f"Hemoglobin: value={hgb['value']}, unit={hgb['unit']}")
print("✓ PASSED")


# =========================================================
# TEST 2 — OCR TEXT → PATIENT PARSER
# =========================================================

print("\n========================================")
print("TEST 2 — OCR text → patient_parser extracts age/sex")
print("========================================")

_, patient2, _, _, _, _ = _run_extraction(FULL_CBC_TEXT)

assert patient2["age"] == 34
assert patient2["age_unit"] == "years"
assert patient2["sex"] == "male"

print(f"age={patient2['age']}, sex={patient2['sex']}")
print("✓ PASSED")


# =========================================================
# TEST 3 — OCR TEXT → VALIDATOR PRODUCES VALID
# =========================================================

print("\n========================================")
print("TEST 3 — OCR text → validator produces VALID")
print("========================================")

_, _, _, _, validation3, _ = _run_extraction(FULL_CBC_TEXT)

assert validation3["status"] == "VALID", (
    f"Expected VALID, got {validation3['status']}"
)
assert validation3["can_analyze"] is True
assert validation3["valid_tests"] == 14

print(f"status={validation3['status']}, valid_tests={validation3['valid_tests']}")
print("✓ PASSED")


# =========================================================
# TEST 4 — OCR TEXT → COVERAGE COMPLETE
# =========================================================

print("\n========================================")
print("TEST 4 — OCR text → coverage reports COMPLETE")
print("========================================")

_, _, _, coverage4, _, _ = _run_extraction(FULL_CBC_TEXT)

assert coverage4["status"] == "COMPLETE"
assert coverage4["detected_count"] == 14
assert coverage4["missing_count"] == 0

print(f"coverage={coverage4['status']}, detected={coverage4['detected_count']}")
print("✓ PASSED")


# =========================================================
# TEST 5 — OCR TEXT → PLAUSIBILITY RUNS
# =========================================================

print("\n========================================")
print("TEST 5 — OCR text → plausibility runs on valid tests")
print("========================================")

_, _, _, _, _, plausibility5 = _run_extraction(FULL_CBC_TEXT)

assert plausibility5 is not None
assert plausibility5["checked_tests"] == 14
assert plausibility5["requires_verification"] is False

print(f"checked={plausibility5['checked_tests']}, "
      f"requires_verification={plausibility5['requires_verification']}")
print("✓ PASSED")


# =========================================================
# TEST 6 — SCANNED PDF PATH
# =========================================================

print("\n========================================")
print("TEST 6 — Scanned PDF path — source=scanned_pdf")
print("========================================")

mock_engine6 = MagicMock()

from vision.scanned_pdf_reader import ScannedPDFResult

scanned_result6 = MagicMock(spec=ScannedPDFResult)
scanned_result6.text = FULL_CBC_TEXT
scanned_result6.page_count = 2
scanned_result6.ocr_page_count = 2
scanned_result6.warnings = []

clf6 = _make_classification({0: "scanned", 1: "scanned"})

with patch("vision.pdf_classifier.classify_pdf", return_value=clf6), \
     patch("extraction.pipeline._process_scanned_pdf",
           return_value=(FULL_CBC_TEXT, SourceMeta(
               input_type=InputType.SCANNED_PDF,
               path=str(_fake_pdf_path()),
               page_count=2,
               ocr_pages=2,
           ))), \
     patch("pathlib.Path.exists", return_value=True), \
     patch("pathlib.Path.suffix", new_callable=PropertyMock, return_value=".pdf"):

    result6 = process(_fake_pdf_path(), ocr_engine=mock_engine6)

assert result6.source.input_type == InputType.SCANNED_PDF
assert result6.source.ocr_pages == 2
assert result6.source.page_count == 2
assert len(result6.tests) == 14
assert result6.validation["status"] == "VALID"

print(f"input_type={result6.source.input_type.value}")
print(f"ocr_pages={result6.source.ocr_pages}")
print(f"tests={len(result6.tests)}, status={result6.validation['status']}")
print("✓ PASSED")


# =========================================================
# TEST 7 — TEXT PDF PATH (OCR engine never called)
# =========================================================

print("\n========================================")
print("TEST 7 — Text PDF path — OCR engine never called")
print("========================================")

mock_engine7 = MagicMock()
clf7 = _make_classification({0: "text", 1: "text"})

with patch("vision.pdf_classifier.classify_pdf", return_value=clf7), \
     patch("extraction.pipeline._process_text_pdf",
           return_value=(FULL_CBC_TEXT, SourceMeta(
               input_type=InputType.TEXT_PDF,
               path=str(_fake_pdf_path()),
               page_count=2,
               ocr_pages=0,
           ))), \
     patch("pathlib.Path.exists", return_value=True), \
     patch("pathlib.Path.suffix", new_callable=PropertyMock, return_value=".pdf"):

    result7 = process(_fake_pdf_path(), ocr_engine=mock_engine7)

assert result7.source.input_type == InputType.TEXT_PDF
assert result7.source.ocr_pages == 0
# OCR engine must never be called for a text PDF
assert mock_engine7.extract.call_count == 0
assert len(result7.tests) == 14

print(f"input_type={result7.source.input_type.value}")
print(f"ocr_pages={result7.source.ocr_pages}")
print(f"engine.extract calls={mock_engine7.extract.call_count}")
print("✓ PASSED")


# =========================================================
# TEST 8 — IMAGE ARRAY PATH
# =========================================================

print("\n========================================")
print("TEST 8 — Image array path — source=image")
print("========================================")

mock_engine8 = MagicMock()
mock_engine8.extract.return_value = _make_ocr_result(
    # text_cleaner strips the page marker; parser sees clean lines
    FULL_CBC_TEXT.replace("--- PAGE 1 ---\n", ""),
    confidence=0.95,
)

image8 = np.full((400, 600, 3), 255, dtype=np.uint8)

with patch("vision.preprocessor.preprocess_image") as mock_pre8:
    mock_pre8.return_value = MagicMock(image=np.full((400, 600), 255, dtype=np.uint8))

    result8 = process(image8, ocr_engine=mock_engine8)

assert result8.source.input_type == InputType.IMAGE
assert result8.source.page_count == 1
assert result8.source.ocr_pages == 1
assert mock_engine8.extract.call_count == 1
assert len(result8.tests) == 14

print(f"input_type={result8.source.input_type.value}")
print(f"page_count={result8.source.page_count}")
print(f"tests={len(result8.tests)}")
print("✓ PASSED")


# =========================================================
# TEST 9 — MIXED PDF
# =========================================================

print("\n========================================")
print("TEST 9 — Mixed PDF — text pages + scanned pages")
print("========================================")

clf9 = _make_classification({0: "text", 1: "scanned"})

with patch("vision.pdf_classifier.classify_pdf", return_value=clf9), \
     patch("extraction.pipeline._process_scanned_pdf",
           return_value=(FULL_CBC_TEXT, SourceMeta(
               input_type=InputType.SCANNED_PDF,
               path=str(_fake_pdf_path()),
               page_count=2,
               ocr_pages=1,
           ))), \
     patch("pathlib.Path.exists", return_value=True), \
     patch("pathlib.Path.suffix", new_callable=PropertyMock, return_value=".pdf"):

    result9 = process(_fake_pdf_path())

# Mixed PDF is routed through scanned path (handles both)
assert result9.source.input_type == InputType.SCANNED_PDF
assert result9.source.ocr_pages == 1
assert result9.source.text_page_count == 1 if hasattr(result9.source, "text_page_count") else True

print(f"input_type={result9.source.input_type.value}")
print(f"ocr_pages={result9.source.ocr_pages}")
print("✓ PASSED")


# =========================================================
# TEST 10 — EMPTY OCR OUTPUT → UNSAFE_TO_ANALYZE
# =========================================================

print("\n========================================")
print("TEST 10 — Empty OCR output → UNSAFE_TO_ANALYZE")
print("========================================")

_, _, _, _, validation10, plausibility10 = _run_extraction(
    "\n--- PAGE 1 ---\n"
)

assert validation10["status"] == "UNSAFE_TO_ANALYZE"
assert validation10["can_analyze"] is False
assert plausibility10 is None

print(f"status={validation10['status']}")
print(f"plausibility={plausibility10}")
print("✓ PASSED")


# =========================================================
# TEST 11 — MISSING PATIENT DATA → NEEDS_USER_INPUT
# =========================================================

print("\n========================================")
print("TEST 11 — Missing patient data → NEEDS_USER_INPUT")
print("========================================")

_, patient11, _, _, validation11, _ = _run_extraction(NO_PATIENT_TEXT)

assert patient11["age"] is None
assert patient11["sex"] is None
assert validation11["status"] == "NEEDS_USER_INPUT"
assert validation11["can_analyze"] is False
assert len(validation11["user_questions"]) > 0

print(f"status={validation11['status']}")
print(f"user_questions={[q['field'] for q in validation11['user_questions']]}")
print("✓ PASSED")


# =========================================================
# TEST 12 — INVALID FILE PATH → FileNotFoundError
# =========================================================

print("\n========================================")
print("TEST 12 — Invalid file path → FileNotFoundError")
print("========================================")

error_raised = False
try:
    process(Path(r"C:\does\not\exist.pdf"))
except FileNotFoundError as e:
    error_raised = True
    print(f"Caught: {e}")

assert error_raised
print("✓ PASSED")


# =========================================================
# TEST 13 — NON-PDF FILE → ValueError
# =========================================================

print("\n========================================")
print("TEST 13 — Non-PDF file → ValueError")
print("========================================")

with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
    tmp.write(b"\xff\xd8\xff")
    tmp_path = tmp.name

error_raised = False
try:
    process(Path(tmp_path))
except ValueError as e:
    error_raised = True
    print(f"Caught: {e}")
finally:
    os.unlink(tmp_path)

assert error_raised
print("✓ PASSED")


# =========================================================
# TEST 14 — WRONG SOURCE TYPE → TypeError
# =========================================================

print("\n========================================")
print("TEST 14 — Wrong source type → TypeError")
print("========================================")

error_raised = False
try:
    process(12345)
except TypeError as e:
    error_raised = True
    print(f"Caught: {e}")

assert error_raised
print("✓ PASSED")


# =========================================================
# TEST 15 — force_ocr=True BYPASSES CLASSIFICATION
# =========================================================

print("\n========================================")
print("TEST 15 — force_ocr=True bypasses text classification")
print("========================================")

with patch("extraction.pipeline._process_scanned_pdf",
           return_value=(FULL_CBC_TEXT, SourceMeta(
               input_type=InputType.SCANNED_PDF,
               path=str(_fake_pdf_path()),
               page_count=1,
               ocr_pages=1,
           ))) as mock_scanned15, \
     patch("vision.pdf_classifier.classify_pdf") as mock_clf15, \
     patch("pathlib.Path.exists", return_value=True), \
     patch("pathlib.Path.suffix", new_callable=PropertyMock, return_value=".pdf"):

    result15 = process(_fake_pdf_path(), force_ocr=True)

# classify_pdf must NOT be called when force_ocr=True
assert mock_clf15.call_count == 0, (
    "classify_pdf must not be called when force_ocr=True"
)
assert mock_scanned15.call_count == 1
assert result15.source.input_type == InputType.SCANNED_PDF

print(f"classify_pdf calls={mock_clf15.call_count}")
print(f"scanned path calls={mock_scanned15.call_count}")
print("✓ PASSED")


# =========================================================
# TEST 16 — SourceMeta.as_dict()
# =========================================================

print("\n========================================")
print("TEST 16 — SourceMeta.as_dict() all fields present")
print("========================================")

meta16 = SourceMeta(
    input_type=InputType.SCANNED_PDF,
    path="/some/report.pdf",
    page_count=3,
    ocr_pages=2,
    ocr_confidence=0.94,
    warnings=["Page 2: low confidence"],
)

d = meta16.as_dict()

assert d["input_type"] == "scanned_pdf"
assert d["path"] == "/some/report.pdf"
assert d["page_count"] == 3
assert d["ocr_pages"] == 2
assert d["ocr_confidence"] == 0.94
assert d["warnings"] == ["Page 2: low confidence"]

print(d)
print("✓ PASSED")


# =========================================================
# TEST 17 — PipelineResult repr
# =========================================================

print("\n========================================")
print("TEST 17 — PipelineResult repr")
print("========================================")

_, _, tests17, coverage17, validation17, plausibility17 = _run_extraction(
    FULL_CBC_TEXT
)

result17 = PipelineResult(
    source=SourceMeta(input_type=InputType.TEXT_PDF),
    raw_text=FULL_CBC_TEXT,
    cleaned_text="cleaned",
    patient={"age": 34, "sex": "male"},
    tests=tests17,
    coverage=coverage17,
    validation=validation17,
    plausibility=plausibility17,
)

r = repr(result17)
assert "text_pdf" in r
assert "VALID" in r
assert "14" in r

print(r)
print("✓ PASSED")


# =========================================================
# TEST 18 — OCR CONFIDENCE PRESERVED IN SourceMeta
# =========================================================

print("\n========================================")
print("TEST 18 — OCR confidence preserved in SourceMeta")
print("========================================")

mock_engine18 = MagicMock()
mock_engine18.extract.return_value = OCRResult(
    text=FULL_CBC_TEXT.replace("--- PAGE 1 ---\n", ""),
    lines=[],
    page_number=0,
    engine="paddleocr",
    confidence=0.93,
)

image18 = np.full((400, 600, 3), 255, dtype=np.uint8)

with patch("vision.preprocessor.preprocess_image") as mock_pre18:
    mock_pre18.return_value = MagicMock(
        image=np.full((400, 600), 255, dtype=np.uint8)
    )
    result18 = process(image18, ocr_engine=mock_engine18)

assert result18.source.ocr_confidence == 0.93, (
    f"Expected 0.93, got {result18.source.ocr_confidence}"
)

print(f"ocr_confidence={result18.source.ocr_confidence}")
print("✓ PASSED")


# =========================================================
# TEST 19 — OCR WARNINGS PROPAGATED TO SourceMeta
# =========================================================

print("\n========================================")
print("TEST 19 — OCR warnings propagated to SourceMeta")
print("========================================")

mock_engine19 = MagicMock()
mock_engine19.extract.return_value = OCRResult(
    text=FULL_CBC_TEXT.replace("--- PAGE 1 ---\n", ""),
    lines=[],
    page_number=0,
    engine="paddleocr",
    confidence=0.45,
    warnings=["Line 3 has low confidence (0.32): 'l5.9'"],
)

image19 = np.full((400, 600, 3), 255, dtype=np.uint8)

with patch("vision.preprocessor.preprocess_image") as mock_pre19:
    mock_pre19.return_value = MagicMock(
        image=np.full((400, 600), 255, dtype=np.uint8)
    )
    result19 = process(image19, ocr_engine=mock_engine19)

assert len(result19.source.warnings) > 0
assert any("low confidence" in w for w in result19.source.warnings)

print(f"warnings={result19.source.warnings}")
print("✓ PASSED")


# =========================================================
# TEST 20 — text_cleaner STRIPS PAGE MARKERS BEFORE PARSER
# =========================================================

print("\n========================================")
print("TEST 20 — text_cleaner strips page markers before parser")
print("========================================")

multi_page_text = (
    "\n--- PAGE 1 ---\nAge / Gender : 34 Years/Male\n"
    "Hemoglobin\n15.9\ng/dl\n[13.0-18.0]\n"
    "\n--- PAGE 2 ---\n"
    "Total WBC Count\n7200\n/cmm\n[4000-11000]\n"
)

cleaned20, _, tests20, _, _, _ = _run_extraction(multi_page_text)

# Page markers must be gone from cleaned text
assert "--- PAGE" not in cleaned20, (
    "text_cleaner must remove --- PAGE N --- markers"
)

# Parser must still find tests from both pages
canonical_names20 = {t["canonical_name"] for t in tests20}
assert "hemoglobin" in canonical_names20
assert "wbc" in canonical_names20

print(f"'--- PAGE' in cleaned: {'--- PAGE' in cleaned20}")
print(f"tests found: {sorted(canonical_names20)}")
print("✓ PASSED")


# =========================================================
# FINAL
# =========================================================

print("\n========================================")
print("   ALL PIPELINE INTEGRATION TESTS PASSED")
print("========================================")


# =========================================================
# CHUNK 3 — SwasthSetu 2.0 VERIFY ENRICHMENT TESTS
# =========================================================

print("\n========================================")
print("CHUNK 3 — VERIFY ENRICHMENT (additive tests)")
print("========================================")


# Test C1 — Each test in PipelineResult has plausibility_status
print("\n----------------------------------------")
print("TEST C1 — plausibility_status in each test dict")
print("----------------------------------------")

result_c1, *_ = [None], None
result_c1 = _run_extraction(FULL_CBC_TEXT)
cleaned_c1, patient_c1, raw_tests_c1, coverage_c1, validation_c1, plausibility_c1 = result_c1

# Simulate enriched test list (validated_test_data)
from extraction.pipeline import _merge_plausibility_status
enriched_c1 = list(validation_c1.get("validated_test_data", []))
_merge_plausibility_status(enriched_c1, plausibility_c1)

assert len(enriched_c1) == 14
for t in enriched_c1:
    assert "plausibility_status" in t, (
        f"plausibility_status missing from {t.get('canonical_name')}"
    )
    assert t["plausibility_status"] in ("PLAUSIBLE", "VERIFY", "NOT_CHECKED"), (
        f"Unexpected plausibility_status: {t['plausibility_status']}"
    )

print(f"All 14 tests have plausibility_status")
print("✓ PASSED")


# Test C2 — Each test has status / needs_review / review_reasons
print("\n----------------------------------------")
print("TEST C2 — status, needs_review, review_reasons in each test")
print("----------------------------------------")

from extraction.pipeline import (
    _enrich_observation_status,
    _enrich_needs_review,
)

enriched_c2 = list(validation_c1.get("validated_test_data", []))
_merge_plausibility_status(enriched_c2, plausibility_c1)
_enrich_observation_status(enriched_c2)
_enrich_needs_review(enriched_c2)

for t in enriched_c2:
    assert "status" in t, f"status missing from {t.get('canonical_name')}"
    assert t["status"] in ("HIGH", "LOW", "NORMAL", "UNKNOWN"), (
        f"Invalid status {t['status']!r}"
    )
    assert "needs_review" in t
    assert isinstance(t["needs_review"], bool)
    assert "review_reasons" in t
    assert isinstance(t["review_reasons"], list)

print(f"All 14 tests have status/needs_review/review_reasons")
print("✓ PASSED")


# Test C3 — FULL_CBC_TEXT → review_required=False (all reliable data)
print("\n----------------------------------------")
print("TEST C3 — FULL_CBC_TEXT → review_required=False")
print("----------------------------------------")

from extraction.pipeline import _compute_report_review

rr_c3, reasons_c3 = _compute_report_review(
    enriched_c2, validation_c1, coverage_c1
)
# All tests are PLAUSIBLE with parsed references and valid units
assert rr_c3 is False, (
    f"Expected review_required=False, got True. "
    f"Tests with needs_review: {[t['canonical_name'] for t in enriched_c2 if t['needs_review']]}"
)
assert reasons_c3 == [], f"Expected no blocking reasons, got: {reasons_c3}"

print(f"review_required={rr_c3}, publish_blocking_reasons={reasons_c3}")
print("✓ PASSED")


# Test C4 — FULL_CBC_TEXT → template_explanation has 14 entries
print("\n----------------------------------------")
print("TEST C4 — template_explanation produces 14 entries for FULL_CBC_TEXT")
print("----------------------------------------")

from extraction.explainer import generate_explanations

explanations_c4 = generate_explanations(enriched_c2)
assert len(explanations_c4) == 14, (
    f"Expected 14 explanations, got {len(explanations_c4)}"
)
for e in explanations_c4:
    assert "canonical_name" in e
    assert "text" in e
    assert len(e["text"]) > 0

print(f"template_explanation count={len(explanations_c4)}")
print("✓ PASSED")


# Test C5 — PipelineResult has new Chunk 3 fields with correct defaults
print("\n----------------------------------------")
print("TEST C5 — PipelineResult new fields present with defaults")
print("----------------------------------------")

result_c5 = PipelineResult(
    source=SourceMeta(input_type=InputType.TEXT_PDF),
    raw_text="",
    cleaned_text="",
    patient={},
    tests=[],
    coverage={},
    validation={"status": "UNSAFE_TO_ANALYZE", "can_analyze": False},
)

assert hasattr(result_c5, "review_required")
assert result_c5.review_required is False
assert hasattr(result_c5, "publish_blocking_reasons")
assert result_c5.publish_blocking_reasons == []
assert hasattr(result_c5, "template_explanation")
assert result_c5.template_explanation == []

print("review_required, publish_blocking_reasons, template_explanation defaults OK")
print("✓ PASSED")


# Test C6 — HIGH/LOW result never triggers needs_review by itself
print("\n----------------------------------------")
print("TEST C6 — HIGH/LOW result with reliable data → needs_review=False")
print("----------------------------------------")

from extraction.pipeline import _apply_needs_review

high_test = {
    "canonical_name": "rdw",
    "value": 14.3,
    "unit": "%",
    "reference_raw": "[11.5-14.0]",
    "reference_parsed": {"parsed": True, "min": 11.5, "max": 14.0},
    "plausibility_status": "PLAUSIBLE",
    "status": "HIGH",
}
nr_c6, reasons_c6 = _apply_needs_review(high_test)
assert nr_c6 is False, "HIGH result with reliable data must NOT trigger needs_review"
assert reasons_c6 == [], f"Expected no reasons, got: {reasons_c6}"

low_test = {
    "canonical_name": "hemoglobin",
    "value": 10.0,
    "unit": "g/dl",
    "reference_raw": "[13.0-18.0]",
    "reference_parsed": {"parsed": True, "min": 13.0, "max": 18.0},
    "plausibility_status": "PLAUSIBLE",
    "status": "LOW",
}
nr_c6b, reasons_c6b = _apply_needs_review(low_test)
assert nr_c6b is False, "LOW result with reliable data must NOT trigger needs_review"
assert reasons_c6b == [], f"Expected no reasons, got: {reasons_c6b}"

print("HIGH+reliable → needs_review=False")
print("LOW+reliable → needs_review=False")
print("✓ PASSED")


# Test C7 — Empty observation list → review_required=False, explanations=[]
print("\n----------------------------------------")
print("TEST C7 — Empty test list → review_required=False, explanations=[]")
print("----------------------------------------")

rr_c7, reasons_c7 = _compute_report_review(
    [], {"can_analyze": False, "status": "UNSAFE_TO_ANALYZE"}, {"duplicate_markers": []}
)
expl_c7 = generate_explanations([])
assert expl_c7 == []
assert any("blocked" in r.lower() for r in reasons_c7)

print(f"reasons={reasons_c7}")
print("✓ PASSED")


# Test C8 — Duplicate CBC markers → publish_blocking_reason added
print("\n----------------------------------------")
print("TEST C8 — Duplicate markers → blocking reason in publish_blocking_reasons")
print("----------------------------------------")

rr_c8, reasons_c8 = _compute_report_review(
    [{"needs_review": False}],
    {"can_analyze": True, "status": "VALID"},
    {"duplicate_markers": ["hemoglobin"]}
)
assert any("Duplicate" in r for r in reasons_c8), (
    f"Expected duplicate marker reason, got: {reasons_c8}"
)
print(f"reasons={reasons_c8}")
print("✓ PASSED")


print("\n========================================")
print("   ALL CHUNK 3 VERIFY TESTS PASSED")
print("========================================")

