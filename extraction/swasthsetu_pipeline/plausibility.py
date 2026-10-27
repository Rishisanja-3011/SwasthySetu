"""
extraction/swasthsetu_pipeline/plausibility.py

Plausibility (sanity-bounds) checking for extracted blood values.

CHANGE FROM ORIGINAL
--------------------
Bounds are now loaded from test_registry so all panels
(CBC, LFT, KFT, Thyroid, Lipid, Diabetes, Hormones, Iron,
Vitamins, General) are covered.

PURPOSE
-------
Flag values that are so extreme they are more likely to be
an extraction or OCR error than a real patient result.

IMPORTANT
---------
A VERIFY flag means: "check the original report".
It does NOT mean the value is clinically impossible.
"""

from __future__ import annotations

from extraction.swasthsetu_pipeline.test_registry import get_plausibility_bounds


# =========================================================
# SINGLE TEST
# =========================================================

def check_test_plausibility(test: dict) -> dict:
    canonical_name = test.get("canonical_name")
    value          = test.get("value")

    bounds = get_plausibility_bounds(canonical_name)

    # No rule for this test
    if bounds is None:
        return {
            "status": "NOT_CHECKED",
            "test":   canonical_name,
            "value":  value,
            "reason": "No plausibility rule is currently configured for this test.",
        }

    # Value must be numeric
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return {
            "status": "VERIFY",
            "test":   canonical_name,
            "value":  value,
            "reason": "The extracted result is not numeric.",
        }

    minimum = bounds["min"]
    maximum = bounds["max"]

    if value < minimum or value > maximum:
        return {
            "status":                  "VERIFY",
            "test":                    canonical_name,
            "value":                   value,
            "expected_extraction_min": minimum,
            "expected_extraction_max": maximum,
            "reason": (
                "The extracted value is outside the configured extraction "
                "sanity bounds. Verify it against the original report."
            ),
        }

    return {"status": "PLAUSIBLE", "test": canonical_name, "value": value}


# =========================================================
# COMPLETE REPORT
# =========================================================

def check_report_plausibility(tests: list) -> dict:
    results               = []
    verification_required = []

    for test in tests:
        result = check_test_plausibility(test)
        results.append(result)
        if result["status"] == "VERIFY":
            verification_required.append(result)

    return {
        "checked_tests":               len(tests),
        "verification_required_count": len(verification_required),
        "requires_verification":       len(verification_required) > 0,
        "verification_required":       verification_required,
        "results":                     results,
    }
