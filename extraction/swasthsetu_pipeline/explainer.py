"""
extraction/explainer.py

SwasthSetu 2.0 — Deterministic per-observation template explanation.

PURPOSE
-------
Generate fixed, template-based patient-facing text for each
CBC observation that has been classified by the pipeline.

CONSTRAINTS
-----------
- Completely deterministic: same input always produces the same output.
- No LLM, no generative AI, no external API.
- No diagnosis, no disease names, no treatment recommendations.
- No medical interpretation beyond stating whether the extracted
  value is within, above, or below the report's own reference range.
- All text is based solely on structured fields in the test dict.
"""

from __future__ import annotations

from typing import List

# =========================================================
# DISPLAY NAMES
# Maps canonical CBC test names to human-readable labels.
# =========================================================

_DISPLAY_NAMES: dict = {
    "hemoglobin":   "Hemoglobin",
    "rbc":          "Red Blood Cell Count",
    "hematocrit":   "Hematocrit",
    "mcv":          "Mean Corpuscular Volume",
    "mch":          "Mean Corpuscular Hemoglobin",
    "mchc":         "MCH Concentration",
    "rdw":          "Red Cell Distribution Width",
    "wbc":          "White Blood Cell Count",
    "neutrophils":  "Neutrophils",
    "lymphocytes":  "Lymphocytes",
    "eosinophils":  "Eosinophils",
    "monocytes":    "Monocytes",
    "basophils":    "Basophils",
    "platelets":    "Platelets",
}


def _display_name(canonical: str) -> str:
    """Return a human-readable label for a canonical test name."""
    return _DISPLAY_NAMES.get(canonical, canonical.replace("_", " ").title())


# =========================================================
# TEMPLATE BUILDER
# =========================================================

def _build_explanation(test: dict) -> str:
    """
    Build a single deterministic explanation string for one observation.

    Template variants
    -----------------
    A — needs_review=True:
        Always renders the review notice, regardless of status.
        The observation has a data quality issue that must be
        resolved before presenting a classification to the patient.

    B — UNKNOWN:
        Reference range could not be determined; classification
        is impossible.

    C — NORMAL:
        Value is within the report's reference range.

    D — HIGH or LOW:
        Value is above or below the report's reference range.
    """
    label  = _display_name(test.get("canonical_name", ""))
    status = test.get("status", "UNKNOWN")

    # Variant A — needs_review
    if test.get("needs_review", False):
        return (
            f"{label}: This result needs review against the original "
            f"report before it can be published."
        )

    # Variant B — UNKNOWN (no reliable reference range)
    if status == "UNKNOWN":
        return (
            f"{label}: This result could not be classified because "
            f"the reference range could not be determined from this report."
        )

    # For C and D we can include value and unit where available
    value = test.get("value")
    unit  = test.get("unit") or ""
    ref   = test.get("reference_parsed") or {}
    low   = ref.get("min")
    high  = ref.get("max")

    value_str = str(value) if value is not None else "—"
    unit_str  = f" {unit}" if unit else ""

    if low is not None and high is not None:
        range_str = f"{low}-{high}{unit_str}"
    else:
        range_str = "not available"

    # Variant C — NORMAL
    if status == "NORMAL":
        return (
            f"{label}: Result is {value_str}{unit_str}. "
            f"Reference range from this report: {range_str}. "
            f"{label} is within the reference range shown on this report."
        )

    # Variant D — HIGH or LOW
    direction = "above" if status == "HIGH" else "below"
    return (
        f"{label}: Result is {value_str}{unit_str}. "
        f"Reference range from this report: {range_str}. "
        f"{label} is {direction} the reference range shown on this report."
    )


# =========================================================
# PUBLIC API
# =========================================================

def generate_explanations(tests: List[dict]) -> List[dict]:
    """
    Generate deterministic template explanations for a list
    of CBC observations.

    Parameters
    ----------
    tests : list[dict]
        The enriched test list from the pipeline.  Each
        dict must carry at least ``canonical_name`` and
        ``status``.  Tests without a ``status`` field are
        skipped.

    Returns
    -------
    list[dict]
        One entry per test that has a ``status`` field:
        {
            "canonical_name": str,
            "text": str
        }

    The function is deterministic: calling it twice with
    identical input always produces identical output.
    """
    explanations: List[dict] = []

    for test in tests:
        # Only explain observations that reached classification
        if "status" not in test:
            continue

        explanations.append({
            "canonical_name": test.get("canonical_name", ""),
            "text": _build_explanation(test),
        })

    return explanations
