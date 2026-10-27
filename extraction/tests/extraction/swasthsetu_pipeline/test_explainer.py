"""
tests/extraction/test_explainer.py

Tests for extraction/explainer.py:

  - generate_explanations()
  - _build_explanation()  (indirectly)
  - _display_name()       (indirectly)

Coverage
--------
  - NORMAL result
  - HIGH result
  - LOW result
  - UNKNOWN (no reference range)
  - needs_review=True (always renders review notice)
  - Determinism (identical input → identical output on two calls)
  - No diagnosis / disease language in any output
  - Test without 'status' key is skipped
  - Empty test list returns empty list
  - All 14 canonical CBC names have a display name
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from extraction.explainer import generate_explanations, _DISPLAY_NAMES

# Words that must never appear in any explanation
_FORBIDDEN = {
    "anaemia", "anemia", "anemic", "anaemic",
    "deficiency", "disease", "disorder",
    "diagnosis", "diagnose", "condition",
    "treatment", "medication", "medicine", "drug",
    "therapy", "consult", "recommend",
    "infection", "cancer", "malignant", "benign",
    "diabetes", "hypertension", "thalassemia",
    "iron", "b12", "folate",
}


def _has_forbidden(text: str) -> list:
    """Return any forbidden words found in text (lowercase comparison)."""
    low = text.lower()
    return [w for w in _FORBIDDEN if w in low]


def _make_test(
    canonical="hemoglobin",
    status="NORMAL",
    needs_review=False,
    value=15.9,
    unit="g/dl",
    low=13.0,
    high=18.0,
    parsed=True,
):
    return {
        "canonical_name": canonical,
        "status": status,
        "needs_review": needs_review,
        "value": value,
        "unit": unit,
        "reference_parsed": {
            "parsed": parsed,
            "min": low if parsed else None,
            "max": high if parsed else None,
        },
    }


# =========================================================
# Tests
# =========================================================

print("\n=== generate_explanations ===")


def test_empty_list():
    result = generate_explanations([])
    assert result == []
    print("Empty list → []: PASSED")


def test_normal():
    tests = [_make_test(status="NORMAL")]
    result = generate_explanations(tests)
    assert len(result) == 1
    text = result[0]["text"]
    assert result[0]["canonical_name"] == "hemoglobin"
    assert "within" in text.lower()
    assert "Hemoglobin" in text
    forbidden = _has_forbidden(text)
    assert not forbidden, f"Forbidden words found: {forbidden}"
    assert "reference range" in text.lower()
    print(f"NORMAL text: {text!r}")
    print("NORMAL: PASSED")


def test_high():
    tests = [_make_test(status="HIGH", value=20.0)]
    result = generate_explanations(tests)
    text = result[0]["text"]
    assert "above" in text.lower()
    assert "Hemoglobin" in text
    forbidden = _has_forbidden(text)
    assert not forbidden, f"Forbidden words found: {forbidden}"
    print(f"HIGH text: {text!r}")
    print("HIGH: PASSED")


def test_low():
    tests = [_make_test(status="LOW", value=10.0)]
    result = generate_explanations(tests)
    text = result[0]["text"]
    assert "below" in text.lower()
    forbidden = _has_forbidden(text)
    assert not forbidden, f"Forbidden words found: {forbidden}"
    print(f"LOW text: {text!r}")
    print("LOW: PASSED")


def test_unknown():
    tests = [_make_test(status="UNKNOWN", parsed=False)]
    result = generate_explanations(tests)
    text = result[0]["text"]
    assert "could not be classified" in text.lower() or "not be determined" in text.lower()
    forbidden = _has_forbidden(text)
    assert not forbidden, f"Forbidden words found: {forbidden}"
    print(f"UNKNOWN text: {text!r}")
    print("UNKNOWN: PASSED")


def test_needs_review_overrides_status():
    """needs_review=True should always render the review notice."""
    for status in ("NORMAL", "HIGH", "LOW", "UNKNOWN"):
        tests = [_make_test(status=status, needs_review=True)]
        result = generate_explanations(tests)
        text = result[0]["text"]
        assert "needs review" in text.lower() or "review" in text.lower(), (
            f"Expected review message for status={status}, got: {text!r}"
        )
        forbidden = _has_forbidden(text)
        assert not forbidden, f"Forbidden words for status={status}: {forbidden}"
    print("needs_review=True overrides status: PASSED")


def test_no_status_key_skipped():
    """Test dict without 'status' key must be skipped."""
    tests = [{"canonical_name": "hemoglobin", "value": 15.9}]
    result = generate_explanations(tests)
    assert result == []
    print("No 'status' key → skipped: PASSED")


def test_deterministic():
    """Same input must produce identical output on two calls."""
    tests = [
        _make_test(status="NORMAL"),
        _make_test(canonical="wbc", status="HIGH", value=15000, low=4000, high=11000),
        _make_test(canonical="rbc", status="LOW", value=3.0, low=4.5, high=6.5),
    ]
    result_1 = generate_explanations(tests)
    result_2 = generate_explanations(tests)
    assert result_1 == result_2
    print("Deterministic (two calls identical): PASSED")


def test_all_14_cbc_display_names():
    """All 14 canonical CBC names must have a display name entry."""
    expected = {
        "hemoglobin", "rbc", "hematocrit", "mcv", "mch", "mchc",
        "rdw", "wbc", "neutrophils", "lymphocytes", "eosinophils",
        "monocytes", "basophils", "platelets",
    }
    missing = expected - set(_DISPLAY_NAMES.keys())
    assert not missing, f"Missing display names for: {missing}"
    print("All 14 CBC display names present: PASSED")


def test_value_and_range_in_normal_text():
    """NORMAL explanation must include value, unit, and range."""
    tests = [_make_test(status="NORMAL", value=15.9, unit="g/dl", low=13.0, high=18.0)]
    result = generate_explanations(tests)
    text = result[0]["text"]
    assert "15.9" in text
    assert "g/dl" in text
    assert "13.0" in text
    assert "18.0" in text
    print("Value/unit/range in NORMAL text: PASSED")


def test_multiple_observations():
    """generate_explanations returns one entry per test with status."""
    tests = [
        _make_test(canonical="hemoglobin", status="NORMAL"),
        _make_test(canonical="wbc",        status="HIGH",  value=15000, low=4000, high=11000),
        _make_test(canonical="rbc",        status="LOW",   value=3.0,   low=4.5,  high=6.5),
        {"canonical_name": "platelets"},    # no status → skipped
    ]
    result = generate_explanations(tests)
    assert len(result) == 3
    names = [e["canonical_name"] for e in result]
    assert "hemoglobin" in names
    assert "wbc" in names
    assert "rbc" in names
    assert "platelets" not in names
    print("Multiple observations, skip missing status: PASSED")


# Run all tests
test_empty_list()
test_normal()
test_high()
test_low()
test_unknown()
test_needs_review_overrides_status()
test_no_status_key_skipped()
test_deterministic()
test_all_14_cbc_display_names()
test_value_and_range_in_normal_text()
test_multiple_observations()

print("\n=== ALL EXPLAINER TESTS PASSED ===\n")
