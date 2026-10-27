"""
tests/extraction/test_classification.py

Tests for SwasthSetu 2.0 VERIFY enrichment:

  - _classify_observation_status()   → HIGH / LOW / NORMAL / UNKNOWN
  - _enrich_observation_status()     → in-place for test list
  - _apply_needs_review()            → (needs_review, review_reasons)
  - _enrich_needs_review()           → in-place for test list
  - _merge_plausibility_status()     → in-place for test list
  - _compute_report_review()         → (review_required, blocking_reasons)
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from extraction.pipeline import (
    _classify_observation_status,
    _enrich_observation_status,
    _apply_needs_review,
    _enrich_needs_review,
    _merge_plausibility_status,
    _compute_report_review,
)


# =========================================================
# Helpers
# =========================================================

def _test(
    value=15.9,
    parsed=True,
    low=13.0,
    high=18.0,
    unit="g/dl",
    ref_raw="[13.0-18.0]",
    canonical="hemoglobin",
    plausibility_status="PLAUSIBLE",
):
    """Build a minimal test dict for unit testing."""
    return {
        "canonical_name": canonical,
        "value": value,
        "unit": unit,
        "reference_raw": ref_raw,
        "reference_parsed": {
            "parsed": parsed,
            "min": low if parsed else None,
            "max": high if parsed else None,
        },
        "plausibility_status": plausibility_status,
    }


# =========================================================
# _classify_observation_status
# =========================================================

print("\n=== _classify_observation_status ===")


def test_classify_normal():
    t = _test(value=15.9, low=13.0, high=18.0)
    assert _classify_observation_status(t) == "NORMAL"
    print("NORMAL: PASSED")

def test_classify_high():
    t = _test(value=19.0, low=13.0, high=18.0)
    assert _classify_observation_status(t) == "HIGH"
    print("HIGH: PASSED")

def test_classify_low():
    t = _test(value=10.0, low=13.0, high=18.0)
    assert _classify_observation_status(t) == "LOW"
    print("LOW: PASSED")

def test_classify_boundary_low():
    """Value exactly equal to lower boundary → NORMAL."""
    t = _test(value=13.0, low=13.0, high=18.0)
    assert _classify_observation_status(t) == "NORMAL"
    print("Boundary==LOW → NORMAL: PASSED")

def test_classify_boundary_high():
    """Value exactly equal to upper boundary → NORMAL."""
    t = _test(value=18.0, low=13.0, high=18.0)
    assert _classify_observation_status(t) == "NORMAL"
    print("Boundary==HIGH → NORMAL: PASSED")

def test_classify_missing_value():
    t = _test(value=None)
    assert _classify_observation_status(t) == "UNKNOWN"
    print("Missing value → UNKNOWN: PASSED")

def test_classify_missing_reference():
    t = _test(parsed=False, low=None, high=None, ref_raw="")
    assert _classify_observation_status(t) == "UNKNOWN"
    print("Missing reference → UNKNOWN: PASSED")

def test_classify_unparsed_reference():
    t = _test(parsed=False, low=None, high=None)
    assert _classify_observation_status(t) == "UNKNOWN"
    print("Unparsed reference → UNKNOWN: PASSED")

def test_classify_no_ref_key():
    """Test dict with no reference_parsed key at all."""
    t = {"canonical_name": "hemoglobin", "value": 15.9, "unit": "g/dl"}
    assert _classify_observation_status(t) == "UNKNOWN"
    print("No reference_parsed key → UNKNOWN: PASSED")

def test_classify_wbc_normal():
    """Different test with integer value in normal range."""
    t = _test(value=7200, low=4000, high=11000, canonical="wbc", unit="/cmm")
    assert _classify_observation_status(t) == "NORMAL"
    print("WBC NORMAL: PASSED")

def test_classify_wbc_high():
    t = _test(value=15000, low=4000, high=11000, canonical="wbc", unit="/cmm")
    assert _classify_observation_status(t) == "HIGH"
    print("WBC HIGH: PASSED")

def test_classify_wbc_low():
    t = _test(value=3000, low=4000, high=11000, canonical="wbc", unit="/cmm")
    assert _classify_observation_status(t) == "LOW"
    print("WBC LOW: PASSED")


test_classify_normal()
test_classify_high()
test_classify_low()
test_classify_boundary_low()
test_classify_boundary_high()
test_classify_missing_value()
test_classify_missing_reference()
test_classify_unparsed_reference()
test_classify_no_ref_key()
test_classify_wbc_normal()
test_classify_wbc_high()
test_classify_wbc_low()


# =========================================================
# _enrich_observation_status (in-place)
# =========================================================

print("\n=== _enrich_observation_status ===")

def test_enrich_status_modifies_in_place():
    tests = [
        _test(value=15.9, low=13.0, high=18.0),
        _test(value=19.0, low=13.0, high=18.0),
        _test(value=10.0, low=13.0, high=18.0),
    ]
    _enrich_observation_status(tests)
    assert tests[0]["status"] == "NORMAL"
    assert tests[1]["status"] == "HIGH"
    assert tests[2]["status"] == "LOW"
    print("Enrich in-place (NORMAL/HIGH/LOW): PASSED")

def test_enrich_status_empty_list():
    tests = []
    _enrich_observation_status(tests)
    assert tests == []
    print("Empty list: PASSED")

test_enrich_status_modifies_in_place()
test_enrich_status_empty_list()


# =========================================================
# _apply_needs_review
# =========================================================

print("\n=== _apply_needs_review ===")

def _enriched_test(**kw):
    """Build a test dict that already has plausibility_status."""
    t = _test(**kw)
    t["status"] = _classify_observation_status(t)
    return t

def test_no_review_needed():
    """Good test: PLAUSIBLE, parsed range, unit, value → no review."""
    t = _enriched_test(value=15.9, parsed=True, low=13.0, high=18.0,
                       unit="g/dl", ref_raw="[13.0-18.0]",
                       plausibility_status="PLAUSIBLE")
    nr, rr = _apply_needs_review(t)
    assert nr is False
    assert rr == []
    print("No review needed: PASSED")

def test_review_plausibility_verify():
    t = _enriched_test(plausibility_status="VERIFY")
    nr, rr = _apply_needs_review(t)
    assert nr is True
    assert "PLAUSIBILITY_VERIFY" in rr
    print("PLAUSIBILITY_VERIFY: PASSED")

def test_review_missing_ref_raw():
    t = _enriched_test(ref_raw=None, parsed=False, low=None, high=None)
    nr, rr = _apply_needs_review(t)
    assert nr is True
    assert "REFERENCE_RANGE_MISSING" in rr
    print("REFERENCE_RANGE_MISSING (ref_raw=None): PASSED")

def test_review_empty_ref_raw():
    t = _enriched_test(ref_raw="", parsed=False, low=None, high=None)
    nr, rr = _apply_needs_review(t)
    assert nr is True
    assert "REFERENCE_RANGE_MISSING" in rr
    print("REFERENCE_RANGE_MISSING (ref_raw=''): PASSED")

def test_review_unparsable_reference():
    t = _enriched_test(ref_raw="< 150", parsed=False, low=None, high=None)
    nr, rr = _apply_needs_review(t)
    assert nr is True
    assert "REFERENCE_RANGE_UNPARSABLE" in rr
    print("REFERENCE_RANGE_UNPARSABLE: PASSED")

def test_review_missing_unit():
    t = _enriched_test(unit=None)
    nr, rr = _apply_needs_review(t)
    assert nr is True
    assert "UNIT_MISSING" in rr
    print("UNIT_MISSING (unit=None): PASSED")

def test_review_empty_unit():
    t = _enriched_test(unit="")
    nr, rr = _apply_needs_review(t)
    assert nr is True
    assert "UNIT_MISSING" in rr
    print("UNIT_MISSING (unit=''): PASSED")

def test_review_missing_value():
    t = _enriched_test(value=None)
    nr, rr = _apply_needs_review(t)
    assert nr is True
    assert "VALUE_MISSING" in rr
    print("VALUE_MISSING: PASSED")

def test_review_high_no_review():
    """HIGH result with reliable data → needs_review MUST be False."""
    t = _enriched_test(value=19.0, low=13.0, high=18.0,
                       plausibility_status="PLAUSIBLE",
                       ref_raw="[13.0-18.0]", parsed=True, unit="g/dl")
    t["status"] = "HIGH"
    nr, rr = _apply_needs_review(t)
    assert nr is False, "HIGH alone must NOT trigger needs_review"
    assert rr == []
    print("HIGH + reliable data → needs_review=False: PASSED")

def test_review_low_no_review():
    """LOW result with reliable data → needs_review MUST be False."""
    t = _enriched_test(value=10.0, low=13.0, high=18.0,
                       plausibility_status="PLAUSIBLE",
                       ref_raw="[13.0-18.0]", parsed=True, unit="g/dl")
    t["status"] = "LOW"
    nr, rr = _apply_needs_review(t)
    assert nr is False, "LOW alone must NOT trigger needs_review"
    assert rr == []
    print("LOW + reliable data → needs_review=False: PASSED")

def test_review_multiple_reasons():
    """Multiple issues → all reasons collected."""
    t = _enriched_test(
        value=None,
        plausibility_status="VERIFY",
        ref_raw=None, parsed=False, low=None, high=None,
        unit=None
    )
    nr, rr = _apply_needs_review(t)
    assert nr is True
    assert "VALUE_MISSING" in rr
    assert "PLAUSIBILITY_VERIFY" in rr
    assert "REFERENCE_RANGE_MISSING" in rr
    assert "UNIT_MISSING" in rr
    print("Multiple reasons collected: PASSED")


test_no_review_needed()
test_review_plausibility_verify()
test_review_missing_ref_raw()
test_review_empty_ref_raw()
test_review_unparsable_reference()
test_review_missing_unit()
test_review_empty_unit()
test_review_missing_value()
test_review_high_no_review()
test_review_low_no_review()
test_review_multiple_reasons()


# =========================================================
# _merge_plausibility_status
# =========================================================

print("\n=== _merge_plausibility_status ===")

def test_merge_plausibility_with_results():
    tests = [
        {"canonical_name": "hemoglobin"},
        {"canonical_name": "wbc"},
    ]
    plausibility = {
        "results": [
            {"test": "hemoglobin", "status": "PLAUSIBLE"},
            {"test": "wbc",        "status": "VERIFY"},
        ]
    }
    _merge_plausibility_status(tests, plausibility)
    assert tests[0]["plausibility_status"] == "PLAUSIBLE"
    assert tests[1]["plausibility_status"] == "VERIFY"
    print("Merge from results: PASSED")

def test_merge_plausibility_none():
    tests = [{"canonical_name": "hemoglobin"}]
    _merge_plausibility_status(tests, None)
    assert tests[0]["plausibility_status"] == "NOT_CHECKED"
    print("Merge when plausibility=None: PASSED")

def test_merge_plausibility_test_not_in_results():
    tests = [{"canonical_name": "platelets"}]
    plausibility = {"results": [{"test": "hemoglobin", "status": "PLAUSIBLE"}]}
    _merge_plausibility_status(tests, plausibility)
    assert tests[0]["plausibility_status"] == "NOT_CHECKED"
    print("Test not in plausibility results → NOT_CHECKED: PASSED")

def test_merge_plausibility_empty_tests():
    _merge_plausibility_status([], {"results": []})
    print("Empty test list: PASSED")

test_merge_plausibility_with_results()
test_merge_plausibility_none()
test_merge_plausibility_test_not_in_results()
test_merge_plausibility_empty_tests()


# =========================================================
# _compute_report_review
# =========================================================

print("\n=== _compute_report_review ===")

def test_compute_no_review():
    tests = [{"needs_review": False}, {"needs_review": False}]
    validation = {"can_analyze": True, "status": "VALID"}
    coverage = {"duplicate_markers": []}
    rr, reasons = _compute_report_review(tests, validation, coverage)
    assert rr is False
    assert reasons == []
    print("No review required: PASSED")

def test_compute_obs_review():
    tests = [{"needs_review": True}, {"needs_review": False}]
    validation = {"can_analyze": True, "status": "VALID"}
    coverage = {"duplicate_markers": []}
    rr, reasons = _compute_report_review(tests, validation, coverage)
    assert rr is True
    assert any("observations require review" in r for r in reasons)
    print("Observation review → review_required=True: PASSED")

def test_compute_blocked():
    tests = []
    validation = {"can_analyze": False, "status": "UNSAFE_TO_ANALYZE"}
    coverage = {"duplicate_markers": []}
    rr, reasons = _compute_report_review(tests, validation, coverage)
    assert any("blocked" in r.lower() for r in reasons)
    print("Processing blocked → reason added: PASSED")

def test_compute_duplicate_markers():
    tests = [{"needs_review": False}]
    validation = {"can_analyze": True, "status": "VALID"}
    coverage = {"duplicate_markers": ["hemoglobin"]}
    rr, reasons = _compute_report_review(tests, validation, coverage)
    assert any("Duplicate" in r for r in reasons)
    print("Duplicate markers → reason added: PASSED")

test_compute_no_review()
test_compute_obs_review()
test_compute_blocked()
test_compute_duplicate_markers()


print("\n=== ALL CLASSIFICATION TESTS PASSED ===\n")
