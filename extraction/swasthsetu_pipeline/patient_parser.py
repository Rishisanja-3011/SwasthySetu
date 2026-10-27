"""
extraction/swasthsetu_pipeline/patient_parser.py

Patient context extraction — name, platform identifier, age, and sex.

FORMATS HANDLED
---------------
All patterns are case-insensitive.

Combined (label before values):
  Age / Gender : 34 Years/Male
  Age/Sex: 6 Months/Female
  Age / Gender : 45 Years / Female        ← space around slash

Combined (values before label — reversed PDF layout):
  34 Years/Male  (then "Age/Gender" on next line)
  45 Years / Female  (then "Age/Gender" on next line)

Inline single-token:
  Age: 34 Years
  Gender: Female
  Sex: M

Shorthand:
  34Y/M   34Y/F   6M/M   15D/F

Separator variants:
  34 Yrs Male   (space separator, no slash)
  Age 34 Sex Male
"""

from __future__ import annotations

import re
from typing import Optional


# =========================================================
# CONSTANTS
# =========================================================

_AGE_UNIT_PATTERN = r"(Years?|Yrs?|Months?|Mons?|Weeks?|Wks?|Days?|Y|M|D|W)"
_SEX_PATTERN      = r"(Male|Female|M|F)"

# =========================================================
# NORMALISATION HELPERS
# =========================================================

def normalize_age_unit(unit: Optional[str]) -> Optional[str]:
    if unit is None:
        return None
    u = str(unit).strip().lower()
    table = {
        "year": "years", "years": "years", "yr": "years", "yrs": "years", "y": "years",
        "month": "months", "months": "months", "mon": "months", "mons": "months", "m": "months",
        "week": "weeks", "weeks": "weeks", "wk": "weeks", "wks": "weeks", "w": "weeks",
        "day": "days", "days": "days", "d": "days",
    }
    return table.get(u)


def normalize_sex(sex: Optional[str]) -> Optional[str]:
    if sex is None:
        return None
    s = str(sex).strip().lower()
    table = {
        "m": "male", "male": "male",
        "f": "female", "female": "female",
    }
    return table.get(s)


# =========================================================
# AGE VALIDATION
# =========================================================

def is_reasonable_age(age_value: Optional[int], age_unit: Optional[str]) -> bool:
    if age_value is None or age_unit is None:
        return False
    if age_value < 0:
        return False
    limits = {"days": 36600, "weeks": 5220, "months": 1440, "years": 120}
    maximum = limits.get(age_unit)
    if maximum is None:
        return False
    return age_value <= maximum


# =========================================================
# PATIENT RESULT BUILDER
# =========================================================

def build_patient_result(
    age_value=None,
    age_unit=None,
    sex=None,
) -> dict:
    patient = {"age": None, "age_value": None, "age_unit": None, "sex": None}

    norm_unit = normalize_age_unit(age_unit)
    norm_sex  = normalize_sex(sex)

    if age_value is not None and norm_unit is not None:
        try:
            age_value = int(age_value)
        except (TypeError, ValueError):
            age_value = None

    if age_value is not None and is_reasonable_age(age_value, norm_unit):
        patient["age_value"] = age_value
        patient["age_unit"]  = norm_unit
        if norm_unit == "years":
            patient["age"] = age_value

    patient["sex"] = norm_sex
    return patient


# =========================================================
# PATTERN HELPERS
# =========================================================

def _flatten(text: str) -> str:
    """Collapse whitespace and normalise for regex matching."""
    return re.sub(r"\s+", " ", text).strip()


def _search(pattern: str, text: str):
    return re.search(pattern, text, re.IGNORECASE)


# ---- Report identity labels ----
# These labels are deliberately narrow.  A report's Patient ID is useful for
# detecting a wrong document, but a sample/accession ID is not a platform
# patient identity and must not be compared as one.
_NAME_LABEL = re.compile(
    r"^\s*(?:Patient(?:['’]s)?\s+Name|Patient|Name)\s*:\s*(.*?)\s*$",
    re.IGNORECASE,
)
_IDENTIFIER_LABEL = re.compile(
    r"^\s*(?:Patient\s+(?:ID|Identifier|No\.?|Number)|UHID|MRN)\s*:?\s*(.*?)\s*$",
    re.IGNORECASE,
)
def _clean_identity_value(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = re.sub(r"\s+", " ", str(value)).strip().strip("|")
    return cleaned or None


def _looks_like_label(value: str) -> bool:
    # Keep a following metadata label from being captured as the value of an
    # empty "Patient Name:" line in multi-line PDF extraction output.
    return bool(re.match(r"^[A-Za-z][A-Za-z /_-]{0,40}\s*:", value.strip()))


def _value_for_label(lines: list[str], pattern: re.Pattern) -> Optional[str]:
    for index, line in enumerate(lines):
        match = pattern.match(line)
        if not match:
            continue
        value = _clean_identity_value(match.group(1))
        if value:
            return value
        for candidate in lines[index + 1:]:
            candidate = candidate.strip()
            if not candidate:
                continue
            if _looks_like_label(candidate):
                break
            return _clean_identity_value(candidate)
    return None


def extract_report_identity(cleaned_text: str) -> tuple[Optional[str], Optional[str]]:
    """Extract only explicit report identity labels needed by the platform.

    Missing identity labels are allowed because many legacy laboratory PDFs do
    not print a platform Patient ID.  The platform layer compares any fields
    that are present and blocks publication when they disagree with the active
    visit.
    """
    lines = cleaned_text.splitlines() if cleaned_text else []
    return _value_for_label(lines, _NAME_LABEL), _value_for_label(lines, _IDENTIFIER_LABEL)


def _attach_identity(patient: dict, name: Optional[str], patient_identifier: Optional[str]) -> dict:
    patient["name"] = _clean_identity_value(name)
    patient["patient_identifier"] = _clean_identity_value(patient_identifier)
    return patient


# =========================================================
# INDIVIDUAL EXTRACTION STRATEGIES
# (each returns (age_value, age_unit, sex) or None)
# =========================================================

# ---- Strategy 1: label first, combined ----
# "Age / Gender : 34 Years/Male"
# "Age/Sex: 45 Years / Female"
_S1 = re.compile(
    r"\bAge\s*/\s*(?:Gender|Sex)\s*:?\s*"
    r"(\d+)\s*" + _AGE_UNIT_PATTERN + r"\s*/\s*" + _SEX_PATTERN,
    re.IGNORECASE,
)

# ---- Strategy 2: values first, label after (reversed PDF layout) ----
# We look for "NN Unit / Sex" on a line that is FOLLOWED by "Age/Gender"
# We do this over the multi-line text rather than flattened.
_S2_VALUE = re.compile(
    r"^(\d+)\s*" + _AGE_UNIT_PATTERN + r"\s*/\s*" + _SEX_PATTERN + r"\s*$",
    re.IGNORECASE,
)
_S2_LABEL = re.compile(
    r"\bAge\s*/?\s*(?:Gender|Sex)\b",
    re.IGNORECASE,
)

# ---- Strategy 3: age and sex with space separator (no slash) ----
# "34 Years Male"
_S3 = re.compile(
    r"\b(\d+)\s*" + _AGE_UNIT_PATTERN + r"\s+" + _SEX_PATTERN + r"\b",
    re.IGNORECASE,
)

# ---- Strategy 4: shorthand  34Y/M  6M/F  ----
_S4 = re.compile(
    r"\b(\d+)\s*(Y|M|D|W)\s*/\s*(M|F)\b",
    re.IGNORECASE,
)

# ---- Strategy 5: separate age and sex labels ----
_AGE_LABEL = re.compile(
    r"\bAge\b\s*:?\s*(\d+)\s*" + _AGE_UNIT_PATTERN + r"\b",
    re.IGNORECASE,
)
_SEX_LABEL = re.compile(
    r"\b(?:Sex|Gender)\b\s*:?\s*" + _SEX_PATTERN + r"\b",
    re.IGNORECASE,
)

# ---- Strategy 6: "Patient: Name  Age: 34  Sex: M" on one line ----
_S6_AGE = re.compile(
    r"\bAge\s*:?\s*(\d+)\b",
    re.IGNORECASE,
)
_S6_SEX = re.compile(
    r"\b(?:Sex|Gender)\s*:?\s*" + _SEX_PATTERN + r"\b",
    re.IGNORECASE,
)


# =========================================================
# MAIN EXTRACTOR
# =========================================================

def extract_patient_context(cleaned_text: str) -> dict:
    """
    Extract explicit report identity, age, and sex from cleaned report text.

    Tries multiple strategies in priority order.
    Returns the first successful result.

    Return structure:
        {
            "name":       str  | None,
            "patient_identifier": str | None,
            "age":       int  | None,   # years only (backward compat)
            "age_value": int  | None,
            "age_unit":  str  | None,
            "sex":       str  | None,
        }
    """
    empty = build_patient_result()

    if not cleaned_text:
        return _attach_identity(empty, None, None)

    flat = _flatten(cleaned_text)
    lines = cleaned_text.splitlines()
    report_name, patient_identifier = extract_report_identity(cleaned_text)

    def finish(result: dict) -> dict:
        return _attach_identity(result, report_name, patient_identifier)

    # --------------------------------------------------
    # Strategy 1: "Age/Gender : 34 Years/Male"  (label first, combined)
    # --------------------------------------------------
    m = _S1.search(flat)
    if m:
        return finish(build_patient_result(m.group(1), m.group(2), m.group(3)))

    # --------------------------------------------------
    # Strategy 2: "45 Years / Female" value-first reversed layout
    # Check each line; if it matches the value pattern and the
    # NEXT non-empty line (or a nearby line) has "Age/Gender", accept it.
    # Also accept it standalone if no label is found anywhere nearby
    # but the label appears anywhere in the whole doc.
    # --------------------------------------------------
    label_present = bool(_S2_LABEL.search(flat))
    for idx, line in enumerate(lines):
        m2 = _S2_VALUE.match(line.strip())
        if m2:
            # Confirm by checking nearby lines (±4) or anywhere in doc
            nearby = lines[max(0, idx - 4): idx + 5]
            nearby_flat = " ".join(nearby)
            if label_present or _S2_LABEL.search(nearby_flat):
                return finish(build_patient_result(m2.group(1), m2.group(2), m2.group(3)))

    # --------------------------------------------------
    # Strategy 3: "34 Years Male" (space-separated, no slash)
    # --------------------------------------------------
    m = _S3.search(flat)
    if m:
        return finish(build_patient_result(m.group(1), m.group(2), m.group(3)))

    # --------------------------------------------------
    # Strategy 4: shorthand "34Y/M"
    # --------------------------------------------------
    m = _S4.search(flat)
    if m:
        return finish(build_patient_result(m.group(1), m.group(2), m.group(3)))

    # --------------------------------------------------
    # Strategy 5: separate "Age: 34 Years" + "Gender: Female"
    # --------------------------------------------------
    age_v = age_u = sex_v = None
    ma = _AGE_LABEL.search(flat)
    ms = _SEX_LABEL.search(flat)
    if ma:
        age_v = ma.group(1)
        age_u = ma.group(2)
    if ms:
        sex_v = ms.group(1)
    if age_v or sex_v:
        return finish(build_patient_result(age_v, age_u, sex_v))

    # --------------------------------------------------
    # Strategy 6: inline "Age: 34  Sex: M" on any line
    # --------------------------------------------------
    for line in lines:
        ma6 = _S6_AGE.search(line)
        ms6 = _S6_SEX.search(line)
        if ma6 and ms6:
            return finish(build_patient_result(ma6.group(1), "years", ms6.group(1)))

    # --------------------------------------------------
    # Strategy 7: age anywhere + sex anywhere (last resort)
    # --------------------------------------------------
    ma7 = _AGE_LABEL.search(flat)
    ms7 = _SEX_LABEL.search(flat)
    if ma7 and ms7:
        return finish(build_patient_result(ma7.group(1), ma7.group(2), ms7.group(1)))

    return finish(empty)


# =========================================================
# APPLY CORRECTIONS  (unchanged API)
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
