# Template Explanation Plan

**Chunk:** 2 — Analysis Only  
**Date:** 2026-10-03  
**Status:** PROPOSED — not yet implemented

---

## 1. SwasthSetu Requirement

SwasthSetu 2.0 requires a **fixed/template patient explanation** — not AI-generated, not free-form medical interpretation. It must:

- Be deterministic (same input → same output)
- Be based only on structured observation fields
- Contain no diagnosis
- Contain no treatment recommendation
- Contain no medical reasoning or interpretation
- Be understandable by a non-clinical patient

---

## 2. Where Should This Module Live?

**Not inside the extraction modules.**

The extraction pipeline (`extraction/`) is responsible for converting a PDF into structured observations. It should not generate human-facing text — that is a presentation concern.

**Proposed location:**

```
extraction/
    pipeline.py      ← no change
    ...

explanation/          ← NEW package (Chunk 3)
    __init__.py
    template.py       ← template generation logic
```

Alternatively, as a single new file:

```
extraction/
    explainer.py      ← simpler: stays in extraction package
```

The simpler single-file approach is preferred for Chunk 3. Keep the package structure flat until complexity demands otherwise.

**Proposed:** `extraction/explainer.py`

---

## 3. What Input Should It Receive?

The template generator receives the enriched test list from the pipeline — specifically, tests that have passed validation and have the following fields populated:

```python
{
    "canonical_name": "hemoglobin",
    "raw_name": "Hemoglobin",
    "value": 15.9,
    "unit": "g/dl",
    "reference_low": 13.0,     # from reference_parsed or resolver
    "reference_high": 18.0,
    "reference_resolved": True,
    "status": "NORMAL",        # HIGH | LOW | NORMAL | UNKNOWN
    "needs_review": False
}
```

It does **not** need patient sex or age — the template is per-observation, not patient-contextual.

---

## 4. What Output Should It Produce?

A list of `dict` objects, one per observation, each containing:

```python
{
    "canonical_name": "hemoglobin",
    "text": "..."   # the template string
}
```

**Template variants:**

**Case A — NORMAL, range resolved:**
```
"Your {canonical_name} result is {value} {unit}.
The reference range from your report is {reference_low}–{reference_high} {unit}.
This result is within the normal range."
```

**Case B — HIGH or LOW, range resolved:**
```
"Your {canonical_name} result is {value} {unit}.
The reference range from your report is {reference_low}–{reference_high} {unit}.
This result is {status} compared to your report's reference range."
```

Note: Do NOT use language like "your result is abnormal" or "you may have a condition". `{status}` is strictly `HIGH` or `LOW`.

**Case C — needs_review = True or status = UNKNOWN:**
```
"Your {canonical_name} result could not be automatically classified.
Please discuss this result with your healthcare provider."
```

**Case D — reference range not resolved (but value present):**
```
"Your {canonical_name} result is {value} {unit}.
No reference range was available from your report for automatic classification."
```

---

## 5. Scope Constraints

| Must be | Must NOT be |
|---------|------------|
| Deterministic | AI-generated |
| Based on structured fields only | Clinical interpretation |
| Patient-readable plain language | Diagnosis |
| Per-observation (one line per test) | Treatment advice |
| Report-range-based | External reference database |
| Present only when status is known | Speculation |

---

## 6. Where Does It Sit in the Pipeline?

```
_run_extraction() produces tests + validation + plausibility
       ↓
[Chunk 3 additions]
classify_observations()    ← adds status + needs_review to each test
       ↓
generate_explanations()    ← adds template_explanation
       ↓
PipelineResult returned
```

The template generator is the **last step** and depends on `status` being set. It must not be called if classification did not run.

---

## 7. What the Module Must NOT Do

- Never use `knowledge_engine` pattern names
- Never produce strings like "You may have anemia" or "This suggests iron deficiency"
- Never reference diseases, conditions, or diagnoses
- Never recommend tests, medications, or follow-ups
- Never produce different text for the same input (no randomness, no AI sampling)

---

## 8. Does It Belong Inside the Report Engine or Above It?

**Partially inside, partially above.**

The template generation **logic** belongs inside the report engine (`extraction/explainer.py`) — it is a deterministic function of the structured observations.

The **rendering and display** belongs in the platform layer (patient UI, lab report viewer). The engine just produces the strings; it does not decide how or when to display them.

This is the same model as how validation produces issues → app.py renders them. The engine produces; the platform presents.

---

## 9. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Template produces quasi-diagnostic text accidentally | HIGH | Strict review: only use `status` values (HIGH/LOW/NORMAL); forbidden word list in tests |
| Template used before status is set | MEDIUM | Explainer must check that `status` field exists; raise if not |
| Canonical name not human-readable | LOW | Map canonical → display name (e.g., `hemoglobin` → `"Hemoglobin"`, `wbc` → `"White Blood Cell Count"`) |
| Unit missing when template needs it | LOW | Graceful fallback: omit unit clause if unit is None |
