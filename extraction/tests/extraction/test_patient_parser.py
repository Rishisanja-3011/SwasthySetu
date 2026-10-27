from extraction.patient_parser import (
    extract_patient_context
)


def show_result(
    test_name,
    result
):

    print("\n========================================")
    print(test_name)
    print("========================================")

    print(
        "Age:",
        result["age"]
    )

    print(
        "Age value:",
        result["age_value"]
    )

    print(
        "Age unit:",
        result["age_unit"]
    )

    print(
        "Sex:",
        result["sex"]
    )


# =========================================================
# TEST 1 — CURRENT REPORT
# =========================================================

text = """
Patient's Name: Test Patient
Patient ID: PXTEST001
Age / Gender : 34 Years/Male
"""

result = extract_patient_context(
    text
)

show_result(
    "TEST 1 — ADULT YEARS",
    result
)

assert result["age"] == 34
assert result["age_value"] == 34
assert result["age_unit"] == "years"
assert result["sex"] == "male"
assert result["name"] == "Test Patient"
assert result["patient_identifier"] == "PXTEST001"

print("✓ PASSED")


# =========================================================
# TEST 1B — MULTI-LINE REPORT IDENTITY
# =========================================================

identity_text = """
Patient Name :
Demo Kabir Shah
Patient ID :
PXDEMO005
Age / Sex :
56 Years/Male
"""

identity_result = extract_patient_context(identity_text)
assert identity_result["name"] == "Demo Kabir Shah"
assert identity_result["patient_identifier"] == "PXDEMO005"
assert identity_result["age"] == 56
assert identity_result["sex"] == "male"

print("✓ Multi-line report identity labels parsed")


# =========================================================
# TEST 2 — MONTHS
# =========================================================

text = """
Patient Name: Baby Test
Age/Gender: 6 Months/Female
"""

result = extract_patient_context(
    text
)

show_result(
    "TEST 2 — INFANT MONTHS",
    result
)

assert result["age"] is None
assert result["age_value"] == 6
assert result["age_unit"] == "months"
assert result["sex"] == "female"

print("✓ PASSED")

print(
    "✓ 6 months was NOT converted to 0 years"
)


# =========================================================
# TEST 3 — DAYS
# =========================================================

text = """
Age / Sex : 15 Days / Male
"""

result = extract_patient_context(
    text
)

show_result(
    "TEST 3 — NEWBORN DAYS",
    result
)

assert result["age"] is None
assert result["age_value"] == 15
assert result["age_unit"] == "days"
assert result["sex"] == "male"

print("✓ PASSED")


# =========================================================
# TEST 4 — WEEKS
# =========================================================

text = """
Age/Sex: 3 Weeks/Female
"""

result = extract_patient_context(
    text
)

show_result(
    "TEST 4 — AGE IN WEEKS",
    result
)

assert result["age"] is None
assert result["age_value"] == 3
assert result["age_unit"] == "weeks"
assert result["sex"] == "female"

print("✓ PASSED")


# =========================================================
# TEST 5 — ABBREVIATED YEARS
# =========================================================

text = """
Age / Gender: 17 Yrs/F
"""

result = extract_patient_context(
    text
)

show_result(
    "TEST 5 — ABBREVIATED YEARS",
    result
)

assert result["age"] == 17
assert result["age_value"] == 17
assert result["age_unit"] == "years"
assert result["sex"] == "female"

print("✓ PASSED")


# =========================================================
# TEST 6 — ABBREVIATED MONTHS
# =========================================================

text = """
Age/Gender: 11 Mons/M
"""

result = extract_patient_context(
    text
)

show_result(
    "TEST 6 — ABBREVIATED MONTHS",
    result
)

assert result["age"] is None
assert result["age_value"] == 11
assert result["age_unit"] == "months"
assert result["sex"] == "male"

print("✓ PASSED")


# =========================================================
# TEST 7 — SEPARATE AGE + SEX
# =========================================================

text = """
Patient Name: Test Patient
Age: 45 Years
Sex: Female
"""

result = extract_patient_context(
    text
)

show_result(
    "TEST 7 — SEPARATE FIELDS",
    result
)

assert result["age"] == 45
assert result["age_value"] == 45
assert result["age_unit"] == "years"
assert result["sex"] == "female"

print("✓ PASSED")


# =========================================================
# TEST 8 — MISSING AGE
# =========================================================

text = """
Patient Name: Test Patient
Sex: Male
"""

result = extract_patient_context(
    text
)

show_result(
    "TEST 8 — MISSING AGE",
    result
)

assert result["age"] is None
assert result["age_value"] is None
assert result["age_unit"] is None
assert result["sex"] == "male"

print("✓ PASSED")


# =========================================================
# TEST 9 — MISSING SEX
# =========================================================

text = """
Patient Name: Test Patient
Age: 22 Years
"""

result = extract_patient_context(
    text
)

show_result(
    "TEST 9 — MISSING SEX",
    result
)

assert result["age"] == 22
assert result["age_value"] == 22
assert result["age_unit"] == "years"
assert result["sex"] is None

print("✓ PASSED")


# =========================================================
# TEST 10 — NOTHING FOUND
# =========================================================

text = """
CBC REPORT

Hemoglobin: 15.0 g/dl
"""

result = extract_patient_context(
    text
)

show_result(
    "TEST 10 — NOTHING FOUND",
    result
)

assert result["age"] is None
assert result["age_value"] is None
assert result["age_unit"] is None
assert result["sex"] is None

print("✓ PASSED")


# =========================================================
# TEST 11 — ZERO-DAY NEWBORN
# =========================================================

text = """
Age / Gender: 0 Days/Male
"""

result = extract_patient_context(
    text
)

show_result(
    "TEST 11 — ZERO DAYS",
    result
)

assert result["age"] is None
assert result["age_value"] == 0
assert result["age_unit"] == "days"
assert result["sex"] == "male"

print("✓ PASSED")

print(
    "✓ Newborn age 0 days was preserved"
)


# =========================================================
# FINAL
# =========================================================

print("\n========================================")
print("     ALL PATIENT PARSER TESTS PASSED")
print("========================================")
