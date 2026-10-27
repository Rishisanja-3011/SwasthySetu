import re


TEST_ALIASES = {
    "Hemoglobin": "hemoglobin",
    "Total RBC Count": "rbc",
    "P.C.V": "hematocrit",
    "M.C.V.": "mcv",
    "M.C.H.": "mch",
    "M.C.H.C.": "mchc",
    "R.D.W.": "rdw",
    "Total WBC Count": "wbc",
    "Neutrophils": "neutrophils",
    "Lymphocytes": "lymphocytes",
    "Eosinophils": "eosinophils",
    "Monocytes": "monocytes",
    "Basophils": "basophils",
    "Platelet Count": "platelets"
}


def parse_cbc(cleaned_text: str) -> list:
    lines = cleaned_text.splitlines()

    tests = []

    for index, line in enumerate(lines):

        cleaned_line = line.strip().rstrip(":").strip()

        if cleaned_line not in TEST_ALIASES:
            continue

        result = {
            "raw_name": cleaned_line,
            "canonical_name": TEST_ALIASES[cleaned_line],
            "value": None,
            "unit": None,
            "reference_raw": None
        }

        # Look at the next few lines only
        window = lines[index + 1:index + 5]

        if len(window) >= 1:
            try:
                result["value"] = float(window[0].strip())
            except ValueError:
                pass

        if len(window) >= 2:
            result["unit"] = window[1].strip()

        if len(window) >= 3:
            reference = window[2].strip()

            if (
                "[" in reference
                or re.search(r"\d+\s*(?:-|to)\s*\d+", reference)
            ):
                result["reference_raw"] = reference

        tests.append(result)

    return tests