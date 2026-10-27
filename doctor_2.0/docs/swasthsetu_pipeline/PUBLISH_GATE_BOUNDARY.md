# Publish Gate Boundary

**Chunk:** 2 — Analysis Only  
**Date:** 2026-10-03  
**Status:** PROPOSED — not yet implemented

---

## 1. The SwasthSetu Rule

> A report cannot be published while any observation remains NEEDS_REVIEW.

## 2. The Question

Should `publish_blocked` (or equivalent) be determined inside the report-processing engine, or in the future Lab Review / Publish platform layer?

---

## 3. Analysis: Option A — Inside the Report Engine

**Proposed mechanism:**
```python
publish_blocked = review_required  # True if any test.needs_review == True
```

The engine computes and exposes:
- `review_required: bool` — any test flagged
- `publish_blocking_reasons: list[str]` — human-readable list
- `publish_blocked: bool` — final boolean summary

**Pros:**
- The engine has all the information needed (test statuses, plausibility flags, validation issues)
- The platform layer receives a single actionable boolean — no need to re-evaluate
- Consistent with the principle that the engine determines facts; the platform layer acts on them
- Simpler platform integration (if `publish_blocked`, route to lab review queue; else allow publish)

**Cons:**
- The concept of "publishing" is a platform concern; naming it in the engine couples the engine to the platform workflow
- Future SwasthSetu versions may add publish conditions the engine cannot know about (e.g., lab QC sign-off, consent status, database uniqueness check)

---

## 4. Analysis: Option B — Only in the Platform Layer

The engine exposes only per-observation states:
- `test.needs_review: bool` per test
- `review_required: bool` at report level

The Lab Review / Publish layer evaluates `review_required` and applies its own publish conditions.

**Pros:**
- Clean separation: engine produces facts, platform makes workflow decisions
- Future publish conditions (QC sign-off, consent, etc.) don't require engine changes

**Cons:**
- Platform layer must re-derive a signal that the engine already has
- Risk of inconsistency if the platform evaluates it differently

---

## 5. Recommended Boundary

**Hybrid approach — preferred:**

| Signal | Where Computed | Reason |
|--------|---------------|--------|
| `test.needs_review` | Report engine | Observation-specific; engine has all facts |
| `review_required` | Report engine | Simple OR across observations; engine-computable |
| `publish_blocking_reasons` | Report engine | Engine-sourced reasons (extraction failures, plausibility violations) |
| `publish_blocked` | **Platform layer** | Final publish decision; may include non-engine conditions |
| Actual publish action | Platform layer | Database write, QR generation, lab dashboard — not engine concerns |

This means the engine **stops short of saying "publish this"** — it says only **"this report has unresolved review needs"** or **"this report has no unresolved review needs"**. The platform decides whether to publish.

---

## 6. What the Engine Exposes

```python
# In PipelineResult:
review_required: bool           # computed by engine; True if any test.needs_review
publish_blocking_reasons: list[str]   # engine-sourced reasons
# NOT in PipelineResult:
# publish_blocked — platform responsibility
# publish_action — platform responsibility
```

---

## 7. What the Platform Layer Handles

All of the following are outside the VERIFY engine:

| Platform Responsibility | Why Not Engine |
|------------------------|----------------|
| Lab QR scan | Not a parsing concern |
| Patient consent tracking | Not a parsing concern |
| Lab dashboard UI | Not a parsing concern |
| Lab reviewer sign-off | Platform workflow state |
| Actual report publish | Database + workflow action |
| Doctor access control | Auth/platform concern |
| Patient delivery | Platform/notification concern |

---

## 8. Conclusion

The VERIFY engine should:
1. Set `needs_review` per observation (engine responsibility)
2. Set `review_required = any(needs_review)` (engine responsibility)
3. Set `publish_blocking_reasons` (engine-sourced list)
4. NOT set `publish_blocked` (platform decision)
5. NOT implement any publish workflow (platform concern)

The future Lab Review + Publish layer reads `review_required` and applies its own gate:
```python
publish_blocked = result.review_required or not lab_review_complete or not consent_obtained
```
