# SwasthSetu 2.0 Pipeline Audit — Top-Level Index

> **Audit Date:** 2026-10-03  
> **Status:** AUDIT COMPLETE — No production code modified

This file is an entry-point redirect. The full audit is in:

```
docs/swasthsetu_pipeline/SWASTHSETU_PIPELINE_AUDIT.md
```

## Quick Navigation

| Document | Location | Description |
|----------|----------|-------------|
| **Main Audit Report** | [`docs/swasthsetu_pipeline/SWASTHSETU_PIPELINE_AUDIT.md`](swasthsetu_pipeline/SWASTHSETU_PIPELINE_AUDIT.md) | Full audit: pipeline trace, test results, sample PDF output, compliance table, recommendations |
| Actual Pipeline Flow | [`docs/swasthsetu_pipeline/ACTUAL_PIPELINE_FLOW.md`](swasthsetu_pipeline/ACTUAL_PIPELINE_FLOW.md) | Traced runtime execution path (code-level) |
| File Map | [`docs/swasthsetu_pipeline/PIPELINE_FILE_MAP.md`](swasthsetu_pipeline/PIPELINE_FILE_MAP.md) | Every file: role, status (ACTIVE / NOT CONNECTED / LEGACY) |
| Output Specification | [`docs/swasthsetu_pipeline/OUTPUT_SPECIFICATION.md`](swasthsetu_pipeline/OUTPUT_SPECIFICATION.md) | Current vs SwasthSetu expected output, field comparison |
| Compliance Table | [`docs/swasthsetu_pipeline/SWASTHSETU_COMPLIANCE.md`](swasthsetu_pipeline/SWASTHSETU_COMPLIANCE.md) | 25-requirement SwasthSetu 2.0 compliance check |
| Audit Copies | [`docs/swasthsetu_pipeline/audit_copies/`](swasthsetu_pipeline/audit_copies/) | Read-only copies of active pipeline files (do not import) |

---

## Concise Findings

### Pipeline Status
```
PDF → classify → text extract → clean → patient parse
    → CBC parse → coverage → validate → plausibility
    → PipelineResult
```
✅ This full chain works. Proven on `samples/reports/sample.pdf`.

### Tests
- **140 passed / 0 failed / 0 skipped** (`python -m pytest tests/ -v`)

### SwasthSetu Compliance
- ✅ 14 requirements IMPLEMENTED
- 🟡 6 requirements PARTIAL
- ❌ 3 requirements MISSING: HIGH/LOW/NORMAL, publish blocking, template explanation
- ⚠️ 1 EXTRA/OUT-OF-SCOPE: OCR (optional fallback, not demo path)

### Knowledge Engine
- **INACTIVE** — not connected to report pipeline
- Legacy Blood Report project infrastructure
- Must NOT reach patient-facing output if ever connected

### OCR
- **IMPLEMENTED but OPTIONAL** — never invoked for digital PDFs
- Triggered for scanned PDFs/images if PaddleOCR models provisioned
- Consistent with SwasthSetu 2.0 (digital PDF = primary path)

### Original files
- **Not modified.** All original source files remain exactly as they were.
