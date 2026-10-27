"""
extraction/swasthsetu_pipeline/validator.py

Structural validation for extracted blood test results.

CHANGE FROM ORIGINAL
--------------------
Unit expectations and reference-range parsing are now pulled
from test_registry so every panel (not just CBC) is covered.
All public function signatures are unchanged for backward
compatibility.
"""

from __future__ import annotations

import re
from typing import Optional

from extraction.swasthsetu_pipeline.test_registry import (
    get_expected_units,
)


# =========================================================
# UNIT NORMALISATION
# =========================================================

def normalize_unit(unit) -> Optional[str]:
    if unit is None:
        return None
    normalized = str(unit).strip().lower()
    normalized = normalized.replace("µ", "u").replace("μ", "u")
    normalized = re.sub(r"\s+", "", normalized)
    return normalized


# =========================================================
# UNIT VALIDATION
# =========================================================

def validate_unit(canonical_name: str, unit: str) -> Optional[bool]:
    """
    Returns True  — unit recognised for this test.
    Returns False — unit present but NOT recognised.
    Returns None  — no unit rules configured (treat as unknown, not error).
    """
    if not canonical_name or not unit:
        return False

    expected = get_expected_units(canonical_name)

    # No rules configured → don't fail the test
    if not expected:
        return None

    # Empty-string in expected set means "unitless" tests (HBsAg, ratios)
    norm = normalize_unit(unit)

    norm_expected = {normalize_unit(e) for e in expected}

    # Allow empty / ratio / unitless
    if "" in norm_expected and norm in ("", "ratio", None):
        return True

    return norm in norm_expected


# =========================================================
# REFERENCE RANGE PARSER
# =========================================================

def parse_simple_reference_range(reference_raw) -> dict:
    """
    Parse simple min–max reference ranges.

    Handles:
        [13.0-18.0]   42-52   60 - 70   0.55 to 4.78
        [150000-450000]   2.8 to 29.2

    Returns:
        {"parsed": True,  "min": float, "max": float}
        {"parsed": False, "min": None,  "max": None}
    """
    result = {"parsed": False, "min": None, "max": None}

    if not reference_raw:
        return result

    reference = str(reference_raw).strip()
    reference = reference.replace("[", "").replace("]", "")
    reference = re.sub(r"\bto\b", "-", reference, flags=re.IGNORECASE)

    # Strip leading qualifiers like "Adult Female" / "Non Pregnant :"
    # so we only match the actual numeric range
    # Remove anything before the first digit group
    reference = re.sub(r"^[^0-9\-]*", "", reference).strip()

    pattern = re.compile(
        r"^\s*(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\s*$"
    )
    match = pattern.match(reference)
    if not match:
        return result

    try:
        minimum = float(match.group(1))
        maximum = float(match.group(2))
    except ValueError:
        return result

    if minimum >= maximum:
        return result

    result["parsed"] = True
    result["min"] = minimum
    result["max"] = maximum
    return result


# =========================================================
# VALUE VALIDATION
# =========================================================

def validate_numeric_value(value) -> bool:
    if value is None:
        return False
    if isinstance(value, bool):
        return False
    return isinstance(value, (int, float))


# =========================================================
# SINGLE TEST VALIDATION
# =========================================================

def validate_single_test(test: dict) -> dict:
    issues = []

    canonical_name = test.get("canonical_name")
    value          = test.get("value")
    unit           = test.get("unit")
    reference_raw  = test.get("reference_raw")

    # Name
    if not canonical_name:
        issues.append("missing_test_name")

    # Value
    if value is None:
        issues.append("missing_value")
    elif not validate_numeric_value(value):
        issues.append("invalid_numeric_value")

    # Unit
    if not unit:
        issues.append("missing_unit")
    elif canonical_name:
        unit_result = validate_unit(canonical_name, unit)
        if unit_result is False:
            issues.append("unrecognized_unit")
        # unit_result is None → no rules, do NOT add issue

    # Reference range
    reference_parsed = {"parsed": False, "min": None, "max": None}

    if not reference_raw:
        issues.append("missing_reference_range")
    else:
        reference_parsed = parse_simple_reference_range(reference_raw)
        if not reference_parsed["parsed"]:
            issues.append("unparsable_reference_range")
        else:
            if reference_parsed["min"] >= reference_parsed["max"]:
                issues.append("invalid_reference_range")

    return {
        "valid":     len(issues) == 0,
        "issues":    issues,
        "reference": reference_parsed,
    }


# =========================================================
# ALL TESTS VALIDATION
# =========================================================

def validate_tests(tests: list) -> dict:
    issues     = []
    valid_tests = []

    if not tests:
        return {
            "status":          "UNSAFE_TO_ANALYZE",
            "total_tests":     0,
            "valid_test_count": 0,
            "valid_tests":     [],
            "issues":          ["No supported blood tests were detected."],
        }

    for test in tests:
        result = validate_single_test(test)

        if result["valid"]:
            validated = test.copy()
            validated["reference_parsed"] = result["reference"]
            valid_tests.append(validated)
        else:
            issues.append({
                "test":     test.get("canonical_name"),
                "raw_name": test.get("raw_name"),
                "issues":   result["issues"],
            })

    if len(valid_tests) == 0:
        status = "UNSAFE_TO_ANALYZE"
    elif len(issues) > 0:
        status = "PARTIAL"
    else:
        status = "VALID"

    return {
        "status":           status,
        "total_tests":      len(tests),
        "valid_test_count": len(valid_tests),
        "valid_tests":      valid_tests,
        "issues":           issues,
    }


# =========================================================
# PATIENT VALIDATION
# =========================================================

def validate_patient_context(patient: dict) -> dict:
    issues = []

    age       = patient.get("age")
    sex       = patient.get("sex")
    age_value = patient.get("age_value")
    age_unit  = patient.get("age_unit")

    has_year_age = isinstance(age, int) and 1 <= age <= 120

    has_precise_age = (
        age_value is not None
        and age_unit is not None
        and str(age_unit).strip().lower() in ("years", "months", "weeks", "days")
    )

    if not has_year_age and not has_precise_age:
        if age is None and age_value is None:
            issues.append("missing_age")
        else:
            issues.append("invalid_age")

    if sex is None:
        issues.append("missing_sex")
    elif sex not in ("male", "female"):
        issues.append("invalid_sex")

    return {"valid": len(issues) == 0, "issues": issues}


# =========================================================
# REPORT VALIDATION
# =========================================================

def validate_report(patient: dict, tests: list) -> dict:
    patient_result = validate_patient_context(patient)
    test_result    = validate_tests(tests)

    issues         = []
    user_questions = []

    # Patient issues
    _PATIENT_MESSAGES = {
        "missing_age":   ("We couldn't find your age in the report.",     "Please enter your age:"),
        "invalid_age":   ("The age extracted from the report appears invalid.", "Please confirm your age:"),
        "missing_sex":   ("We couldn't find your sex in the report.",     "Please enter sex (male/female):"),
        "invalid_sex":   ("The sex extracted from the report could not be recognized.", "Please confirm sex (male/female):"),
    }

    for issue in patient_result["issues"]:
        msg, q = _PATIENT_MESSAGES.get(issue, (issue, issue))
        field = "age" if "age" in issue else "sex"
        issues.append({"type": "USER_INPUT_REQUIRED", "field": field, "message": msg})
        user_questions.append({"field": field, "question": q})

    # Test issues
    _TEST_MESSAGES = {
        "missing_test_name":          "test name is missing",
        "missing_value":              "result value is missing",
        "invalid_numeric_value":      "result value is not numeric",
        "missing_unit":               "unit is missing",
        "unrecognized_unit":          "unit could not be recognized",
        "missing_reference_range":    "reference range is missing",
        "unparsable_reference_range": "reference range could not be parsed",
        "invalid_reference_range":    "reference range appears invalid",
    }

    for issue in test_result["issues"]:
        if isinstance(issue, str):
            issues.append({"type": "EXTRACTION_ERROR", "field": "blood_tests", "message": issue})
            continue

        test_name = issue.get("raw_name") or issue.get("test") or "Unknown test"
        for problem in issue.get("issues", []):
            readable = _TEST_MESSAGES.get(problem, problem.replace("_", " "))
            issues.append({
                "type":    "TEST_DATA_INVALID",
                "test":    issue.get("test"),
                "field":   problem,
                "message": f"{test_name}: {readable}.",
            })

    # Final status
    if test_result["status"] == "UNSAFE_TO_ANALYZE":
        status      = "UNSAFE_TO_ANALYZE"
        can_analyze = False
    elif not patient_result["valid"]:
        status      = "NEEDS_USER_INPUT"
        can_analyze = False
    elif test_result["status"] == "PARTIAL":
        status      = "PARTIAL"
        can_analyze = True
    else:
        status      = "VALID"
        can_analyze = True

    return {
        "status":             status,
        "can_analyze":        can_analyze,
        "patient":            patient,
        "tests_detected":     test_result["total_tests"],
        "valid_tests":        test_result["valid_test_count"],
        "validated_test_data": test_result["valid_tests"],
        "issues":             issues,
        "user_questions":     user_questions,
    }


# =========================================================
# USER CORRECTIONS
# =========================================================

def apply_patient_corrections(patient: dict, corrections: dict) -> dict:
    updated = patient.copy()

    if "age" in corrections:
        try:
            age = int(corrections["age"])
            if 0 < age <= 120:
                updated["age"] = age
        except (TypeError, ValueError):
            pass

    if "sex" in corrections:
        sex = str(corrections["sex"]).strip().lower()
        aliases = {"m": "male", "male": "male", "f": "female", "female": "female"}
        if sex in aliases:
            updated["sex"] = aliases[sex]

    return updated
