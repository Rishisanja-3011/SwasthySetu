"""
extraction/swasthsetu_pipeline/test_registry.py

Universal Blood Test Registry.

PURPOSE
-------
Maps every known name variant / abbreviation / alias for a blood test
to a single canonical name.  Also holds the expected unit set and
plausibility (sanity) bounds for every canonical test.

PANELS COVERED
--------------
  CBC      — Complete Blood Count (14 markers)
  LFT      — Liver Function Tests (12 markers)
  KFT/RFT  — Kidney / Renal Function Tests (8 markers)
  LIPID    — Lipid Profile (7 markers)
  THYROID  — Thyroid Panel: TSH, T3, T4, FT3, FT4 (5 markers)
  DIABETES — Blood Sugar Panel: FBS, PPBS, HbA1c, Insulin (4 markers)
  HORMONES — AMH, Prolactin, LH, FSH, Testosterone, Estradiol (6 markers)
  IRON     — Iron studies: Serum Iron, TIBC, Ferritin, Transferrin (4 markers)
  VITAMINS — Vit B12, Vit D, Folate (3 markers)
  GENERAL  — CRP, ESR, Uric Acid, Electrolytes, HbsAg, HIV (10 markers)

USAGE
-----
    from extraction.swasthsetu_pipeline.test_registry import (
        get_canonical_name,
        get_panel,
        get_expected_units,
        get_plausibility_bounds,
    )

    canonical = get_canonical_name("Serum Creatinine")  # -> "creatinine"
    panel     = get_panel("creatinine")                   # -> "KFT"
"""

from __future__ import annotations
from typing import Optional, Set


# =========================================================
# CANONICAL → PANEL MAPPING
# =========================================================

CANONICAL_PANEL: dict[str, str] = {
    # ---- CBC ----
    "hemoglobin":   "CBC",
    "rbc":          "CBC",
    "hematocrit":   "CBC",
    "mcv":          "CBC",
    "mch":          "CBC",
    "mchc":         "CBC",
    "rdw":          "CBC",
    "wbc":          "CBC",
    "neutrophils":  "CBC",
    "lymphocytes":  "CBC",
    "eosinophils":  "CBC",
    "monocytes":    "CBC",
    "basophils":    "CBC",
    "platelets":    "CBC",
    # ---- LFT ----
    "bilirubin_total":     "LFT",
    "bilirubin_direct":    "LFT",
    "bilirubin_indirect":  "LFT",
    "sgot":                "LFT",
    "sgpt":                "LFT",
    "alkaline_phosphatase": "LFT",
    "total_protein":       "LFT",
    "albumin":             "LFT",
    "globulin":            "LFT",
    "ag_ratio":            "LFT",
    "ggtp":                "LFT",
    "ldh":                 "LFT",
    # ---- KFT ----
    "blood_urea":          "KFT",
    "blood_urea_nitrogen": "KFT",
    "creatinine":          "KFT",
    "uric_acid":           "KFT",
    "sodium":              "KFT",
    "potassium":           "KFT",
    "chloride":            "KFT",
    "bicarbonate":         "KFT",
    # ---- LIPID ----
    "cholesterol_total":   "LIPID",
    "hdl":                 "LIPID",
    "ldl":                 "LIPID",
    "vldl":                "LIPID",
    "triglycerides":       "LIPID",
    "cholesterol_ratio":   "LIPID",
    "non_hdl":             "LIPID",
    # ---- THYROID ----
    "tsh":  "THYROID",
    "t3":   "THYROID",
    "t4":   "THYROID",
    "ft3":  "THYROID",
    "ft4":  "THYROID",
    # ---- DIABETES ----
    "glucose_fasting":  "DIABETES",
    "glucose_random":   "DIABETES",
    "glucose_pp":       "DIABETES",
    "hba1c":            "DIABETES",
    # ---- HORMONES ----
    "amh":          "HORMONES",
    "prolactin":    "HORMONES",
    "lh":           "HORMONES",
    "fsh":          "HORMONES",
    "testosterone": "HORMONES",
    "estradiol":    "HORMONES",
    # ---- IRON ----
    "serum_iron":   "IRON",
    "tibc":         "IRON",
    "ferritin":     "IRON",
    "transferrin":  "IRON",
    # ---- VITAMINS ----
    "vitamin_b12":  "VITAMINS",
    "vitamin_d":    "VITAMINS",
    "folate":       "VITAMINS",
    # ---- GENERAL ----
    "crp":              "GENERAL",
    "esr":              "GENERAL",
    "hbsag":            "GENERAL",
    "hiv":              "GENERAL",
    "calcium":          "GENERAL",
    "phosphorus":       "GENERAL",
    "magnesium":        "GENERAL",
    "fibrinogen":       "GENERAL",
    "inr":              "GENERAL",
    "d_dimer":          "GENERAL",
}


# =========================================================
# ALIAS → CANONICAL MAPPING
# All strings are matched case-insensitively after
# stripping punctuation.
# =========================================================

_RAW_ALIASES: list[tuple[str, str]] = [

    # ---- CBC ----
    ("hemoglobin",                  "hemoglobin"),
    ("hb",                          "hemoglobin"),
    ("hgb",                         "hemoglobin"),
    ("haemoglobin",                 "hemoglobin"),

    ("total rbc count",             "rbc"),
    ("rbc count",                   "rbc"),
    ("red blood cell count",        "rbc"),
    ("red blood cells",             "rbc"),
    ("erythrocytes",                "rbc"),
    ("rbc",                         "rbc"),

    ("pcv",                         "hematocrit"),
    ("p.c.v",                       "hematocrit"),
    ("hematocrit",                  "hematocrit"),
    ("haematocrit",                 "hematocrit"),
    ("packed cell volume",          "hematocrit"),

    ("mcv",                         "mcv"),
    ("m.c.v",                       "mcv"),
    ("m.c.v.",                      "mcv"),
    ("mean corpuscular volume",     "mcv"),
    ("mean cell volume",            "mcv"),

    ("mch",                         "mch"),
    ("m.c.h",                       "mch"),
    ("m.c.h.",                      "mch"),
    ("mean corpuscular hemoglobin", "mch"),
    ("mean cell hemoglobin",        "mch"),

    ("mchc",                        "mchc"),
    ("m.c.h.c",                     "mchc"),
    ("m.c.h.c.",                    "mchc"),
    ("mean corpuscular hemoglobin concentration", "mchc"),
    ("mean cell hemoglobin concentration",        "mchc"),

    ("rdw",                         "rdw"),
    ("r.d.w",                       "rdw"),
    ("r.d.w.",                      "rdw"),
    ("red cell distribution width", "rdw"),
    ("red blood cell distribution width", "rdw"),
    ("rdw-cv",                      "rdw"),
    ("rdw cv",                      "rdw"),

    ("total wbc count",             "wbc"),
    ("wbc count",                   "wbc"),
    ("white blood cell count",      "wbc"),
    ("white blood cells",           "wbc"),
    ("leucocytes",                  "wbc"),
    ("leukocytes",                  "wbc"),
    ("tlc",                         "wbc"),
    ("total leucocyte count",       "wbc"),
    ("total leukocyte count",       "wbc"),
    ("wbc",                         "wbc"),

    ("neutrophils",                 "neutrophils"),
    ("neutrophil",                  "neutrophils"),
    ("polymorphonuclear cells",     "neutrophils"),
    ("pmn",                         "neutrophils"),
    ("segs",                        "neutrophils"),
    ("segmented neutrophils",       "neutrophils"),

    ("lymphocytes",                 "lymphocytes"),
    ("lymphocyte",                  "lymphocytes"),
    ("lymphs",                      "lymphocytes"),

    ("eosinophils",                 "eosinophils"),
    ("eosinophil",                  "eosinophils"),
    ("eos",                         "eosinophils"),

    ("monocytes",                   "monocytes"),
    ("monocyte",                    "monocytes"),
    ("mono",                        "monocytes"),

    ("basophils",                   "basophils"),
    ("basophil",                    "basophils"),
    ("baso",                        "basophils"),

    ("platelet count",              "platelets"),
    ("platelets",                   "platelets"),
    ("thrombocytes",                "platelets"),
    ("plt",                         "platelets"),
    ("platelet",                    "platelets"),

    # ---- LFT ----
    ("bilirubin total",             "bilirubin_total"),
    ("total bilirubin",             "bilirubin_total"),
    ("serum bilirubin total",       "bilirubin_total"),
    ("s.bilirubin total",           "bilirubin_total"),
    ("s. bilirubin",                "bilirubin_total"),
    ("t.bilirubin",                 "bilirubin_total"),

    ("bilirubin direct",            "bilirubin_direct"),
    ("direct bilirubin",            "bilirubin_direct"),
    ("conjugated bilirubin",        "bilirubin_direct"),
    ("s.bilirubin direct",          "bilirubin_direct"),

    ("bilirubin indirect",          "bilirubin_indirect"),
    ("indirect bilirubin",          "bilirubin_indirect"),
    ("unconjugated bilirubin",      "bilirubin_indirect"),

    ("sgot",                        "sgot"),
    ("ast",                         "sgot"),
    ("aspartate aminotransferase",  "sgot"),
    ("aspartate transaminase",      "sgot"),
    ("serum glutamic oxaloacetic transaminase", "sgot"),

    ("sgpt",                        "sgpt"),
    ("alt",                         "sgpt"),
    ("alanine aminotransferase",    "sgpt"),
    ("alanine transaminase",        "sgpt"),
    ("serum glutamic pyruvate transaminase", "sgpt"),

    ("alkaline phosphatase",        "alkaline_phosphatase"),
    ("alp",                         "alkaline_phosphatase"),
    ("alk phos",                    "alkaline_phosphatase"),
    ("alk. phos.",                  "alkaline_phosphatase"),

    ("total protein",               "total_protein"),
    ("serum total protein",         "total_protein"),
    ("protein total",               "total_protein"),

    ("albumin",                     "albumin"),
    ("serum albumin",               "albumin"),

    ("globulin",                    "globulin"),
    ("serum globulin",              "globulin"),

    ("a/g ratio",                   "ag_ratio"),
    ("ag ratio",                    "ag_ratio"),
    ("albumin globulin ratio",      "ag_ratio"),

    ("ggtp",                        "ggtp"),
    ("ggt",                         "ggtp"),
    ("gamma gt",                    "ggtp"),
    ("gamma glutamyl transferase",  "ggtp"),
    ("gamma glutamyl transpeptidase", "ggtp"),

    ("ldh",                         "ldh"),
    ("lactate dehydrogenase",       "ldh"),
    ("lactic dehydrogenase",        "ldh"),

    # ---- KFT ----
    ("blood urea",                  "blood_urea"),
    ("serum urea",                  "blood_urea"),
    ("urea",                        "blood_urea"),

    ("blood urea nitrogen",         "blood_urea_nitrogen"),
    ("bun",                         "blood_urea_nitrogen"),
    ("urea nitrogen",               "blood_urea_nitrogen"),

    ("creatinine",                  "creatinine"),
    ("serum creatinine",            "creatinine"),
    ("s. creatinine",               "creatinine"),
    ("s.creatinine",                "creatinine"),

    ("uric acid",                   "uric_acid"),
    ("serum uric acid",             "uric_acid"),
    ("s.uric acid",                 "uric_acid"),

    ("sodium",                      "sodium"),
    ("serum sodium",                "sodium"),
    ("na+",                         "sodium"),
    ("na",                          "sodium"),

    ("potassium",                   "potassium"),
    ("serum potassium",             "potassium"),
    ("k+",                          "potassium"),

    ("chloride",                    "chloride"),
    ("serum chloride",              "chloride"),
    ("cl-",                         "chloride"),

    ("bicarbonate",                 "bicarbonate"),
    ("serum bicarbonate",           "bicarbonate"),
    ("hco3",                        "bicarbonate"),
    ("co2",                         "bicarbonate"),

    # ---- LIPID ----
    ("total cholesterol",           "cholesterol_total"),
    ("cholesterol total",           "cholesterol_total"),
    ("cholesterol",                 "cholesterol_total"),
    ("serum cholesterol",           "cholesterol_total"),

    ("hdl cholesterol",             "hdl"),
    ("hdl",                         "hdl"),
    ("hdl-c",                       "hdl"),
    ("high density lipoprotein",    "hdl"),

    ("ldl cholesterol",             "ldl"),
    ("ldl",                         "ldl"),
    ("ldl-c",                       "ldl"),
    ("low density lipoprotein",     "ldl"),

    ("vldl cholesterol",            "vldl"),
    ("vldl",                        "vldl"),
    ("very low density lipoprotein", "vldl"),

    ("triglycerides",               "triglycerides"),
    ("triglyceride",                "triglycerides"),
    ("tg",                          "triglycerides"),
    ("triacylglycerol",             "triglycerides"),

    ("cholesterol/hdl ratio",       "cholesterol_ratio"),
    ("total cholesterol/hdl",       "cholesterol_ratio"),
    ("risk ratio",                  "cholesterol_ratio"),

    ("non hdl cholesterol",         "non_hdl"),
    ("non-hdl cholesterol",         "non_hdl"),
    ("non hdl",                     "non_hdl"),

    # ---- THYROID ----
    ("tsh",                         "tsh"),
    ("thyroid stimulating hormone", "tsh"),
    ("thyrotropin",                 "tsh"),
    ("tsh ultra",                   "tsh"),
    ("tsh ultra - thyroid stimulating hormone", "tsh"),
    ("tsh - thyroid stimulating hormone", "tsh"),

    ("t3",                          "t3"),
    ("total t3",                    "t3"),
    ("triiodothyronine",            "t3"),
    ("serum t3",                    "t3"),

    ("t4",                          "t4"),
    ("total t4",                    "t4"),
    ("thyroxine",                   "t4"),
    ("serum t4",                    "t4"),

    ("ft3",                         "ft3"),
    ("free t3",                     "ft3"),
    ("free triiodothyronine",       "ft3"),

    ("ft4",                         "ft4"),
    ("free t4",                     "ft4"),
    ("free thyroxine",              "ft4"),

    # ---- DIABETES ----
    ("fasting blood sugar",         "glucose_fasting"),
    ("fbs",                         "glucose_fasting"),
    ("fasting glucose",             "glucose_fasting"),
    ("glucose fasting",             "glucose_fasting"),
    ("blood sugar fasting",         "glucose_fasting"),

    ("random blood sugar",          "glucose_random"),
    ("rbs",                         "glucose_random"),
    ("random glucose",              "glucose_random"),
    ("glucose random",              "glucose_random"),
    ("blood sugar random",          "glucose_random"),

    ("postprandial blood sugar",    "glucose_pp"),
    ("pp blood sugar",              "glucose_pp"),
    ("ppbs",                        "glucose_pp"),
    ("post prandial glucose",       "glucose_pp"),
    ("2 hour ppbs",                 "glucose_pp"),

    ("hba1c",                       "hba1c"),
    ("hb a1c",                      "hba1c"),
    ("glycated hemoglobin",         "hba1c"),
    ("glycosylated hemoglobin",     "hba1c"),
    ("hemoglobin a1c",              "hba1c"),
    ("a1c",                         "hba1c"),

    # ---- HORMONES ----
    ("amh",                         "amh"),
    ("anti mullerian hormone",      "amh"),
    ("anti-mullerian hormone",      "amh"),

    ("prolactin",                   "prolactin"),
    ("prl",                         "prolactin"),

    ("lh",                          "lh"),
    ("luteinizing hormone",         "lh"),
    ("luteinising hormone",         "lh"),

    ("fsh",                         "fsh"),
    ("follicle stimulating hormone", "fsh"),
    ("follicle-stimulating hormone", "fsh"),

    ("testosterone",                "testosterone"),
    ("serum testosterone",          "testosterone"),
    ("total testosterone",          "testosterone"),

    ("estradiol",                   "estradiol"),
    ("e2",                          "estradiol"),
    ("oestradiol",                  "estradiol"),

    # ---- IRON ----
    ("serum iron",                  "serum_iron"),
    ("iron",                        "serum_iron"),
    ("s. iron",                     "serum_iron"),

    ("tibc",                        "tibc"),
    ("total iron binding capacity", "tibc"),

    ("ferritin",                    "ferritin"),
    ("serum ferritin",              "ferritin"),

    ("transferrin",                 "transferrin"),
    ("serum transferrin",           "transferrin"),

    # ---- VITAMINS ----
    ("vitamin b12",                 "vitamin_b12"),
    ("vit b12",                     "vitamin_b12"),
    ("b12",                         "vitamin_b12"),
    ("cyanocobalamin",              "vitamin_b12"),
    ("cobalamin",                   "vitamin_b12"),

    ("vitamin d",                   "vitamin_d"),
    ("vit d",                       "vitamin_d"),
    ("25-oh vitamin d",             "vitamin_d"),
    ("25 oh vitamin d",             "vitamin_d"),
    ("25-hydroxyvitamin d",         "vitamin_d"),
    ("calcifediol",                 "vitamin_d"),

    ("folate",                      "folate"),
    ("folic acid",                  "folate"),
    ("serum folate",                "folate"),

    # ---- GENERAL ----
    ("crp",                         "crp"),
    ("c reactive protein",          "crp"),
    ("c-reactive protein",          "crp"),

    ("esr",                         "esr"),
    ("erythrocyte sedimentation rate", "esr"),
    ("sedimentation rate",          "esr"),
    ("westergren",                  "esr"),

    ("hbsag",                       "hbsag"),
    ("hbs ag",                      "hbsag"),
    ("hepatitis b surface antigen", "hbsag"),

    ("hiv",                         "hiv"),
    ("hiv 1/2",                     "hiv"),
    ("anti hiv",                    "hiv"),

    ("calcium",                     "calcium"),
    ("serum calcium",               "calcium"),
    ("total calcium",               "calcium"),

    ("phosphorus",                  "phosphorus"),
    ("serum phosphorus",            "phosphorus"),
    ("phosphate",                   "phosphorus"),

    ("magnesium",                   "magnesium"),
    ("serum magnesium",             "magnesium"),
    ("mg",                          "magnesium"),

    ("fibrinogen",                  "fibrinogen"),
    ("plasma fibrinogen",           "fibrinogen"),

    ("inr",                         "inr"),
    ("international normalised ratio", "inr"),
    ("prothrombin time inr",        "inr"),
    ("pt inr",                      "inr"),

    ("d dimer",                     "d_dimer"),
    ("d-dimer",                     "d_dimer"),
]


# =========================================================
# BUILD LOOKUP TABLE  (normalised alias -> canonical)
# =========================================================

def _normalise_alias(text: str) -> str:
    """Lowercase, strip dots and extra spaces."""
    import re
    text = text.lower().strip()
    text = re.sub(r"[.\-]", " ", text)     # dots/hyphens → space
    text = re.sub(r"\s+", " ", text).strip()
    return text


_LOOKUP: dict[str, str] = {
    _normalise_alias(alias): canonical
    for alias, canonical in _RAW_ALIASES
}


# =========================================================
# EXPECTED UNITS
# =========================================================

EXPECTED_UNITS: dict[str, set] = {
    # CBC
    "hemoglobin":   {"g/dl", "g/l"},
    "rbc":          {"mill/cmm", "million/cmm", "million/ul", "mill/ul", "10^6/ul", "10^6/µl"},
    "hematocrit":   {"%"},
    "mcv":          {"fl", "femtolitre", "femtoliter"},
    "mch":          {"pg"},
    "mchc":         {"g/dl"},
    "rdw":          {"%"},
    "wbc":          {"/cmm", "/ul", "cells/cmm", "cells/ul", "10^3/ul", "thousand/ul"},
    "neutrophils":  {"%"},
    "lymphocytes":  {"%"},
    "eosinophils":  {"%"},
    "monocytes":    {"%"},
    "basophils":    {"%"},
    "platelets":    {"/ul", "/cmm", "lakh/ul", "10^3/ul", "thousand/ul"},
    # LFT
    "bilirubin_total":      {"mg/dl"},
    "bilirubin_direct":     {"mg/dl"},
    "bilirubin_indirect":   {"mg/dl"},
    "sgot":                 {"u/l", "iu/l", "units/l"},
    "sgpt":                 {"u/l", "iu/l", "units/l"},
    "alkaline_phosphatase": {"u/l", "iu/l", "units/l"},
    "total_protein":        {"g/dl"},
    "albumin":              {"g/dl"},
    "globulin":             {"g/dl"},
    "ag_ratio":             {"ratio", ""},
    "ggtp":                 {"u/l", "iu/l", "units/l"},
    "ldh":                  {"u/l", "iu/l", "units/l"},
    # KFT
    "blood_urea":           {"mg/dl"},
    "blood_urea_nitrogen":  {"mg/dl"},
    "creatinine":           {"mg/dl"},
    "uric_acid":            {"mg/dl"},
    "sodium":               {"meq/l", "mmol/l"},
    "potassium":            {"meq/l", "mmol/l"},
    "chloride":             {"meq/l", "mmol/l"},
    "bicarbonate":          {"meq/l", "mmol/l"},
    # LIPID
    "cholesterol_total":    {"mg/dl"},
    "hdl":                  {"mg/dl"},
    "ldl":                  {"mg/dl"},
    "vldl":                 {"mg/dl"},
    "triglycerides":        {"mg/dl"},
    "cholesterol_ratio":    {"ratio", ""},
    "non_hdl":              {"mg/dl"},
    # THYROID
    "tsh":  {"uiu/ml", "miu/l", "miu/ml", "µiu/ml"},
    "t3":   {"ng/dl", "nmol/l", "ng/ml"},
    "t4":   {"ug/dl", "nmol/l", "µg/dl"},
    "ft3":  {"pg/ml", "pmol/l"},
    "ft4":  {"ng/dl", "pmol/l"},
    # DIABETES
    "glucose_fasting":  {"mg/dl"},
    "glucose_random":   {"mg/dl"},
    "glucose_pp":       {"mg/dl"},
    "hba1c":            {"%"},
    # HORMONES
    "amh":          {"ng/ml", "pmol/l"},
    "prolactin":    {"ng/ml", "ng/dl", "miu/l"},
    "lh":           {"miu/ml", "iu/l"},
    "fsh":          {"miu/ml", "iu/l"},
    "testosterone": {"ng/dl", "nmol/l"},
    "estradiol":    {"pg/ml", "pmol/l"},
    # IRON
    "serum_iron":   {"ug/dl", "µg/dl", "umol/l"},
    "tibc":         {"ug/dl", "µg/dl", "umol/l"},
    "ferritin":     {"ng/ml", "ug/l", "µg/l"},
    "transferrin":  {"mg/dl", "g/l"},
    # VITAMINS
    "vitamin_b12":  {"pg/ml", "pmol/l", "ng/l"},
    "vitamin_d":    {"ng/ml", "nmol/l"},
    "folate":       {"ng/ml", "nmol/l"},
    # GENERAL
    "crp":          {"mg/l", "mg/dl"},
    "esr":          {"mm/hr", "mm/1sthr", "mm"},
    "hbsag":        {""},
    "hiv":          {""},
    "calcium":      {"mg/dl"},
    "phosphorus":   {"mg/dl"},
    "magnesium":    {"mg/dl", "meq/l"},
    "fibrinogen":   {"mg/dl"},
    "inr":          {"ratio", ""},
    "d_dimer":      {"ng/ml", "ug/ml", "mg/l"},
}


# =========================================================
# PLAUSIBILITY (SANITY) BOUNDS
# =========================================================

PLAUSIBILITY_BOUNDS: dict[str, dict] = {
    # CBC
    "hemoglobin":   {"min": 1.0,   "max": 30.0},
    "rbc":          {"min": 0.1,   "max": 15.0},
    "hematocrit":   {"min": 1.0,   "max": 80.0},
    "mcv":          {"min": 30.0,  "max": 160.0},
    "mch":          {"min": 5.0,   "max": 60.0},
    "mchc":         {"min": 10.0,  "max": 60.0},
    "rdw":          {"min": 5.0,   "max": 50.0},
    "wbc":          {"min": 100.0, "max": 500_000.0},
    "neutrophils":  {"min": 0.0,   "max": 100.0},
    "lymphocytes":  {"min": 0.0,   "max": 100.0},
    "eosinophils":  {"min": 0.0,   "max": 100.0},
    "monocytes":    {"min": 0.0,   "max": 100.0},
    "basophils":    {"min": 0.0,   "max": 100.0},
    "platelets":    {"min": 1_000, "max": 3_000_000},
    # LFT
    "bilirubin_total":      {"min": 0.0,  "max": 50.0},
    "bilirubin_direct":     {"min": 0.0,  "max": 30.0},
    "bilirubin_indirect":   {"min": 0.0,  "max": 30.0},
    "sgot":                 {"min": 0.0,  "max": 5000.0},
    "sgpt":                 {"min": 0.0,  "max": 5000.0},
    "alkaline_phosphatase": {"min": 0.0,  "max": 5000.0},
    "total_protein":        {"min": 0.0,  "max": 20.0},
    "albumin":              {"min": 0.0,  "max": 10.0},
    "globulin":             {"min": 0.0,  "max": 15.0},
    "ag_ratio":             {"min": 0.1,  "max": 10.0},
    "ggtp":                 {"min": 0.0,  "max": 3000.0},
    "ldh":                  {"min": 0.0,  "max": 10000.0},
    # KFT
    "blood_urea":           {"min": 1.0,  "max": 500.0},
    "blood_urea_nitrogen":  {"min": 1.0,  "max": 250.0},
    "creatinine":           {"min": 0.1,  "max": 30.0},
    "uric_acid":            {"min": 0.5,  "max": 30.0},
    "sodium":               {"min": 100.0,"max": 200.0},
    "potassium":            {"min": 1.0,  "max": 10.0},
    "chloride":             {"min": 70.0, "max": 150.0},
    "bicarbonate":          {"min": 5.0,  "max": 50.0},
    # LIPID
    "cholesterol_total":    {"min": 50.0,  "max": 600.0},
    "hdl":                  {"min": 10.0,  "max": 200.0},
    "ldl":                  {"min": 10.0,  "max": 500.0},
    "vldl":                 {"min": 1.0,   "max": 200.0},
    "triglycerides":        {"min": 10.0,  "max": 3000.0},
    "cholesterol_ratio":    {"min": 0.5,   "max": 20.0},
    "non_hdl":              {"min": 10.0,  "max": 500.0},
    # THYROID
    "tsh":  {"min": 0.001, "max": 100.0},
    "t3":   {"min": 0.1,   "max": 500.0},
    "t4":   {"min": 0.1,   "max": 30.0},
    "ft3":  {"min": 0.5,   "max": 30.0},
    "ft4":  {"min": 0.1,   "max": 10.0},
    # DIABETES
    "glucose_fasting":  {"min": 20.0,  "max": 700.0},
    "glucose_random":   {"min": 20.0,  "max": 700.0},
    "glucose_pp":       {"min": 20.0,  "max": 700.0},
    "hba1c":            {"min": 3.0,   "max": 20.0},
    # HORMONES
    "amh":          {"min": 0.0,   "max": 30.0},
    "prolactin":    {"min": 0.0,   "max": 10000.0},
    "lh":           {"min": 0.0,   "max": 200.0},
    "fsh":          {"min": 0.0,   "max": 200.0},
    "testosterone": {"min": 0.0,   "max": 3000.0},
    "estradiol":    {"min": 0.0,   "max": 10000.0},
    # IRON
    "serum_iron":   {"min": 1.0,   "max": 500.0},
    "tibc":         {"min": 100.0, "max": 800.0},
    "ferritin":     {"min": 0.1,   "max": 10000.0},
    "transferrin":  {"min": 50.0,  "max": 600.0},
    # VITAMINS
    "vitamin_b12":  {"min": 10.0,  "max": 3000.0},
    "vitamin_d":    {"min": 1.0,   "max": 200.0},
    "folate":       {"min": 0.5,   "max": 100.0},
    # GENERAL
    "crp":          {"min": 0.0,   "max": 500.0},
    "esr":          {"min": 0.0,   "max": 200.0},
    "calcium":      {"min": 3.0,   "max": 20.0},
    "phosphorus":   {"min": 0.5,   "max": 20.0},
    "magnesium":    {"min": 0.3,   "max": 10.0},
    "fibrinogen":   {"min": 50.0,  "max": 2000.0},
    "inr":          {"min": 0.5,   "max": 15.0},
    "d_dimer":      {"min": 0.0,   "max": 50000.0},
}


# =========================================================
# PUBLIC API
# =========================================================

def get_canonical_name(raw_name: str) -> Optional[str]:
    """
    Return the canonical test name for a raw extracted string.
    Returns None if the name is not recognised.

    Matching strategy (in order):
    1. Exact normalised match against the full alias list.
    2. Partial prefix match: check if the normalised string STARTS
       with a known alias (e.g. "TSH ultra - Thyroid Stimulating…"
       starts with alias "tsh ultra").
    3. Partial suffix match: the normalised string ENDS with a known
       alias (e.g. "Serum Creatinine (S.Cr.)" ends with "creatinine").

    Example
    -------
    >>> get_canonical_name("TSH ultra - Thyroid Stimulating Hormone")
    'tsh'
    >>> get_canonical_name("Serum Creatinine")
    'creatinine'
    >>> get_canonical_name("Anti Mullerian Hormone")
    'amh'
    """
    norm = _normalise_alias(raw_name)

    # 1. Exact match
    if norm in _LOOKUP:
        return _LOOKUP[norm]

    # 2. Prefix match — find the longest alias that is a prefix of norm
    best_prefix: Optional[str] = None
    best_len = 0
    for alias, canonical in _LOOKUP.items():
        if norm.startswith(alias) and len(alias) > best_len:
            best_prefix = canonical
            best_len = len(alias)
    if best_prefix:
        return best_prefix

    # 3. Suffix match — find the longest alias that is a suffix of norm
    best_suffix: Optional[str] = None
    best_len = 0
    for alias, canonical in _LOOKUP.items():
        if norm.endswith(alias) and len(alias) > best_len:
            best_suffix = canonical
            best_len = len(alias)
    if best_suffix:
        return best_suffix

    return None


def get_panel(canonical_name: str) -> Optional[str]:
    """Return the panel name for a canonical test name."""
    return CANONICAL_PANEL.get(canonical_name)


def get_expected_units(canonical_name: str) -> Set[str]:
    """Return the set of acceptable units for a canonical test."""
    return EXPECTED_UNITS.get(canonical_name, set())


def get_plausibility_bounds(canonical_name: str) -> Optional[dict]:
    """
    Return {"min": float, "max": float} or None if not configured.
    """
    return PLAUSIBILITY_BOUNDS.get(canonical_name)


def list_all_canonical() -> list[str]:
    """Return sorted list of all canonical test names."""
    return sorted(CANONICAL_PANEL.keys())
