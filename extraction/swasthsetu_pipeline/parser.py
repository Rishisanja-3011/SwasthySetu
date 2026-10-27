"""
extraction/swasthsetu_pipeline/parser.py

Universal blood report parser.

STRATEGY
--------
Three complementary passes over the cleaned text, from most
specific to most flexible:

  Pass 1 — INLINE  (one-line format)
    "Hemoglobin : 15.9  g/dl  [13.0-18.0]"
    Catches reports where all fields sit on the same line.

  Pass 2 — BLOCK  (multi-line block format)
    Test name found on a line → scan next N lines for value,
    unit, reference range.  Works for the "stacked" format
    used by sample.pdf AND the "name → unit → ref → value"
    order used by sample2.pdf.

  Pass 3 — VALUE-FIRST  (result before name, reversed layout)
    Some labs print the numeric result on the same line as the
    test name after a colon:
    "TSH ultra - Thyroid Stimulating Hormone : 1.482"

All three passes use the universal test_registry so any
recognised test name from any lab is captured.

DEDUPLICATION
-------------
If the same canonical test is matched by more than one pass,
the entry with the most complete data (value + unit + ref) wins.
"""

from __future__ import annotations

import re
from typing import List, Optional

from extraction.swasthsetu_pipeline.test_registry import get_canonical_name

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Matches a standalone numeric value (int or decimal, optionally negative).
_NUM_RE = re.compile(r"^-?\d+(?:\.\d+)?$")

# Matches a reference range anywhere in a string:
#   [13.0-18.0]   4.00 - 6.79   0.55 to 4.78   70 to 140
_REF_RE = re.compile(
    r"\[?\s*(-?\d+(?:\.\d+)?)\s*(?:-|to)\s*(-?\d+(?:\.\d+)?)\s*\]?",
    re.IGNORECASE,
)

# Matches a plausible unit token.
# Starts with a letter, %, µ, or / (for /cmm, /ul, /mm3 etc.)
_UNIT_RE = re.compile(
    r"^[a-zA-Zµμ%/][a-zA-Z0-9µμ%/\.\^\-]*$"
)

# Lines that are clearly noise / headers / footers.
_NOISE_RE = re.compile(
    r"(?:"
    r"page\s+\d+\s+of\s+\d+"
    r"|parameter|result|unit[s]?|biological\s+ref"
    r"|method\s*:"
    r"|instrument\s*:"
    r"|clinical\s+signif"
    r"|end\s+of\s+report"
    r"|electronically\s+auth"
    r"|m\.d\.\s*pathology"
    r"|dr\.\s+\w+"                    # "Dr. Rushita Makadia" etc.
    r"|refer(?:red|ence)\s+by"
    r"|report\s+on"
    r"|reg(?:\.|istered)?\s+(?:no|on)"
    r"|reciv?ed\s*\."
    r"|location"
    r"|lab\s+id"
    r"|pid\b"
    r"|pts\.\s*name"
    r"|hemogram"
    r"|biochemical\s+test"
    r"|lipid\s+profile"
    r"|differential\s+wbc"
    r"|blood\s+indices"
    r"|fertility\s+hormone"
    r"|thyroid\s+stimulating\s+hormone.*during"
    r"|trimester"
    r"|increased\s+in"
    r"|decreased\s+in"
    r"|interfere"
    r"|clinical\s+significance"
    r")",
    re.IGNORECASE,
)

# Lines that are purely a colon or punctuation separator.
_SEPARATOR_RE = re.compile(r"^[\s:;|—\-]+$")


def _is_noise(line: str) -> bool:
    s = line.strip()
    if not s:
        return True
    if _SEPARATOR_RE.match(s):
        return True
    if _NOISE_RE.search(s):
        return True
    return False


def _extract_reference(text: str) -> Optional[str]:
    """Return the first range string found in *text*, or None."""
    m = _REF_RE.search(text)
    if m:
        return m.group(0).strip()
    return None


def _is_unit(token: str) -> bool:
    return bool(_UNIT_RE.match(token.strip()))


def _is_number(token: str) -> bool:
    return bool(_NUM_RE.match(token.strip()))


def _parse_value(token: str) -> Optional[float]:
    try:
        return float(token.strip())
    except (ValueError, TypeError):
        return None


def _completeness(rec: dict) -> int:
    """Score a parsed record: higher = more complete."""
    return (
        (1 if rec["value"] is not None else 0)
        + (1 if rec["unit"] else 0)
        + (1 if rec["reference_raw"] else 0)
    )


# ---------------------------------------------------------------------------
# Pass 1 — INLINE  (all fields on one line)
# ---------------------------------------------------------------------------
# Patterns handled:
#   "Hemoglobin : 15.9  g/dl  [13.0-18.0]"
#   "Hemoglobin: 15.9 g/dl"
#   "Total Cholesterol   180   mg/dl   [<200]"
#   "TSH : 1.482  uIU/ml  0.55 to 4.78"

_INLINE_RE = re.compile(
    r"^"
    r"(.+?)"                                        # group 1: test name
    r"\s*:?\s*"
    r"(-?\d+(?:\.\d+)?)"                            # group 2: numeric value
    r"\s+"
    r"([a-zA-Zµμ%/][a-zA-Z0-9µμ%/\.\^\-]*)"       # group 3: unit (/ allowed first)
    r"(?:\s+(.+))?$",                               # group 4: optional trailing
    re.IGNORECASE,
)


def _pass1_inline(lines: List[str]) -> List[dict]:
    results = []
    for line in lines:
        if _is_noise(line):
            continue
        m = _INLINE_RE.match(line.strip())
        if not m:
            continue
        raw_name = m.group(1).strip().rstrip(":")
        canonical = get_canonical_name(raw_name)
        if not canonical:
            continue
        value = _parse_value(m.group(2))
        unit = m.group(3)
        trailing = m.group(4) or ""
        ref = _extract_reference(trailing) or _extract_reference(line)
        results.append({
            "raw_name":       raw_name,
            "canonical_name": canonical,
            "value":          value,
            "unit":           unit,
            "reference_raw":  ref,
        })
    return results


# ---------------------------------------------------------------------------
# Pass 2 — BLOCK  (test name on one line, fields on next few lines)
# ---------------------------------------------------------------------------
# Handles both orderings:
#   ORDER A (sample.pdf):  name → value → unit → ref
#   ORDER B (sample2.pdf): name → unit  → ref  → value (scattered)
#
# Strategy: once a known test name is found on a line, collect the
# next WINDOW lines and extract value / unit / ref from them.

_WINDOW = 15  # max lines to scan after the test name line

# Lines that look like long clinical description sentences (not data)
_LONG_PROSE_RE = re.compile(r".{60,}")  # >60 chars = probably a description line

# Lines with age-range prefixes like "Adult Female", "2-3 years -", "Non Pregnant :"
# These contain sub-group reference ranges — we want the simple adult/default one.
_SUBGROUP_REF_RE = re.compile(
    r"^\s*(?:\d+[-–]\d+\s*(?:years?|months?|weeks?|days?)"
    r"|adult|non\s*pregnant|pregnant|post\s*meno"
    r"|first\s*trimester|second\s*trimester|third\s*trimester"
    r"|male|female"
    r")\s*:?\s*",
    re.IGNORECASE,
)


def _extract_from_window(window: List[str]) -> dict:
    """
    Given a window of lines following a recognised test name line,
    extract value, unit, and reference range.

    Logic:
    - Stops early if a NEW recognised test name is encountered.
    - Skips long prose / description lines.
    - Skips age-group sub-reference lines (e.g. "Adult Female 2.8-29.2").
    - Picks the FIRST simple numeric reference range found.
    - Picks the FIRST standalone numeric value found.
    - Picks the FIRST valid unit token found.
    """
    value: Optional[float] = None
    unit: Optional[str] = None
    ref: Optional[str] = None

    for wline in window:
        s = wline.strip()
        if not s or _is_noise(s):
            continue

        # Stop if this line is the start of a new test block
        candidate_name = s.rstrip(":").strip()
        if get_canonical_name(candidate_name):
            break

        # Skip long prose lines (clinical descriptions)
        if _LONG_PROSE_RE.match(s):
            continue

        # Skip sub-group reference lines
        if _SUBGROUP_REF_RE.match(s):
            continue

        # Reference range (simple min-max only; skip if subgroup prefix)
        if ref is None:
            candidate_ref = _extract_reference(s)
            if candidate_ref:
                ref = candidate_ref
                continue

        # Pure numeric → value (whole line is just a number)
        if value is None and _is_number(s):
            value = _parse_value(s)
            continue

        # Unit token: no spaces after collapsing, starts with letter/% /
        collapsed = s.replace(" ", "")
        if unit is None and len(s) <= 20 and _is_unit(collapsed):
            unit = collapsed
            continue

    return {"value": value, "unit": unit, "reference_raw": ref}


def _pass2_block(lines: List[str]) -> List[dict]:
    results = []
    n = len(lines)
    i = 0
    while i < n:
        line = lines[i].strip()
        if _is_noise(line):
            i += 1
            continue

        # Strip trailing colon / punctuation for name matching
        raw_name = line.rstrip(":").strip()
        canonical = get_canonical_name(raw_name)

        if canonical:
            window = []
            for j in range(i + 1, min(i + 1 + _WINDOW, n)):
                window.append(lines[j])
            extracted = _extract_from_window(window)
            results.append({
                "raw_name":       raw_name,
                "canonical_name": canonical,
                "value":          extracted["value"],
                "unit":           extracted["unit"],
                "reference_raw":  extracted["reference_raw"],
            })
            i += 1
            continue

        i += 1
    return results


# ---------------------------------------------------------------------------
# Pass 3 — VALUE-AFTER-COLON  (inline name: value, no unit on same line)
# ---------------------------------------------------------------------------
# Handles:
#   "TSH ultra - Thyroid Stimulating Hormone : 1.482"
#   "Prolactin : 16.25"
#   "Random Blood Sugar : 112.0"
# The unit and reference may appear on subsequent lines.

_COLON_VALUE_RE = re.compile(
    r"^(.+?)\s*:\s*(-?\d+(?:\.\d+)?)\s*$"
)


def _pass3_colon_value(lines: List[str]) -> List[dict]:
    results = []
    n = len(lines)
    for i, line in enumerate(lines):
        if _is_noise(line):
            continue
        m = _COLON_VALUE_RE.match(line.strip())
        if not m:
            continue
        raw_name = m.group(1).strip()
        canonical = get_canonical_name(raw_name)
        if not canonical:
            continue
        value = _parse_value(m.group(2))
        # Look at the next few lines for unit and ref
        window = [lines[j] for j in range(i + 1, min(i + 1 + _WINDOW, n))]
        extracted = _extract_from_window(window)
        # If we got a standalone unit on the very next non-noise line, use it
        unit = extracted["unit"]
        ref = extracted["reference_raw"]
        results.append({
            "raw_name":       raw_name,
            "canonical_name": canonical,
            "value":          value,
            "unit":           unit,
            "reference_raw":  ref,
        })
    return results


# ---------------------------------------------------------------------------
# PUBLIC API
# ---------------------------------------------------------------------------

def parse_cbc(cleaned_text: str) -> List[dict]:
    """
    Parse blood test results from cleaned PDF text.

    Accepts any lab format — inline, block (value-after-name),
    block (value-before-name / scattered), or colon-separated.

    Returns a list of dicts, one per detected test:
        {
            "raw_name":       str,
            "canonical_name": str,
            "value":          float | None,
            "unit":           str  | None,
            "reference_raw":  str  | None,
        }

    Backward-compatible: the function is still named parse_cbc
    but now handles ALL blood test types, not just CBC.
    """
    if not cleaned_text:
        return []

    lines = cleaned_text.splitlines()

    # Run all three passes
    p1 = _pass1_inline(lines)
    p2 = _pass2_block(lines)
    p3 = _pass3_colon_value(lines)

    # Merge: per canonical name keep the record with highest completeness.
    # Ties: first occurrence wins (p1 inline is most reliable, checked last
    # so it can upgrade p2/p3 results when it has more data).
    merged: dict[str, dict] = {}

    for record in (p2 + p3 + p1):   # p1 last → can only upgrade, not downgrade
        canon = record["canonical_name"]
        score = _completeness(record)
        if canon not in merged:
            merged[canon] = record
        else:
            if score > _completeness(merged[canon]):
                merged[canon] = record
            # Equal score: keep existing (first/earlier hit is more reliable)

    return list(merged.values())
