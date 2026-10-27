"""
extraction/swasthsetu_pipeline/coverage.py

Dynamic CBC / panel coverage checking.

CHANGE FROM ORIGINAL
--------------------
The original module hard-coded 14 CBC markers and always
reported coverage against that fixed set.

This version is DYNAMIC:
  - It groups detected tests by panel (CBC, LFT, KFT, etc.)
    using the test_registry.
  - It reports per-panel coverage so a thyroid report gets a
    "THYROID" coverage block, not a "CBC" block showing 0/14.
  - The top-level `status` field is computed across ALL
    panels that have at least one test detected.
  - Backward compatibility: the old flat fields
    (detected_markers, missing_markers, duplicate_markers,
    unknown_markers, coverage_percent) are still present and
    describe the PRIMARY panel (the one with most detections).
"""

from __future__ import annotations

from collections import Counter
from typing import Dict, List, Set

from extraction.swasthsetu_pipeline.test_registry import (
    get_panel,
    CANONICAL_PANEL,
)


# =========================================================
# PANEL DEFINITIONS
# How many markers are expected per panel (for % coverage).
# =========================================================

_PANEL_SIZES: Dict[str, int] = {}

for _canon, _panel in CANONICAL_PANEL.items():
    _PANEL_SIZES[_panel] = _PANEL_SIZES.get(_panel, 0) + 1


# =========================================================
# HELPERS
# =========================================================

def _panel_status(detected: int, expected: int) -> str:
    if detected == 0:
        return "NO_COVERAGE"
    if detected == expected:
        return "COMPLETE"
    return "INCOMPLETE"


# =========================================================
# PUBLIC API
# =========================================================

def check_cbc_coverage(tests: list) -> dict:
    """
    Analyse extraction coverage across all detected panels.

    Parameters
    ----------
    tests : list[dict]
        Output of parser.parse_cbc() — each dict must have
        ``canonical_name``.

    Returns
    -------
    dict with keys:

    status : str
        Overall status: "COMPLETE" | "INCOMPLETE" | "NO_COVERAGE"

    panels : dict[str, dict]
        Per-panel breakdown:
            detected_count : int
            expected_count : int
            coverage_percent : float
            status : str
            detected_markers : list[str]
            missing_markers  : list[str]
            duplicate_markers: list[str]

    primary_panel : str | None
        The panel with the most detections.

    # --- Backward-compat flat fields (from primary panel) ---
    expected_count    : int
    detected_count    : int
    missing_count     : int
    coverage_percent  : float
    detected_markers  : list[str]
    missing_markers   : list[str]
    duplicate_markers : list[str]
    unknown_markers   : list[str]
    """

    # Collect canonical names
    all_canonical: List[str] = []
    unknown_markers: List[str] = []

    for test in tests:
        canon = test.get("canonical_name")
        if not canon:
            continue
        if get_panel(canon):
            all_canonical.append(canon)
        else:
            unknown_markers.append(canon)

    # Count occurrences for duplicate detection
    counts = Counter(all_canonical)

    # Build per-panel data
    panel_detected: Dict[str, Set[str]] = {}
    panel_duplicates: Dict[str, List[str]] = {}

    for canon, count in counts.items():
        panel = get_panel(canon) or "UNKNOWN"
        panel_detected.setdefault(panel, set()).add(canon)
        if count > 1:
            panel_duplicates.setdefault(panel, []).append(canon)

    # Build panel summaries
    panels: Dict[str, dict] = {}

    for panel, detected_set in panel_detected.items():
        expected_count = _PANEL_SIZES.get(panel, len(detected_set))

        # All canonical names belonging to this panel
        all_in_panel: Set[str] = {
            c for c, p in CANONICAL_PANEL.items() if p == panel
        }
        missing = sorted(all_in_panel - detected_set)
        detected_count = len(detected_set)

        panels[panel] = {
            "detected_count":   detected_count,
            "expected_count":   expected_count,
            "coverage_percent": round(detected_count / expected_count * 100, 2)
                                if expected_count else 0.0,
            "status":           _panel_status(detected_count, expected_count),
            "detected_markers": sorted(detected_set),
            "missing_markers":  missing,
            "duplicate_markers": sorted(panel_duplicates.get(panel, [])),
        }

    # Primary panel = most detections
    primary_panel: str | None = None
    if panels:
        primary_panel = max(panels, key=lambda p: panels[p]["detected_count"])

    # Overall status
    if not panels:
        overall_status = "NO_COVERAGE"
    elif all(v["status"] == "COMPLETE" for v in panels.values()):
        overall_status = "COMPLETE"
    elif all(v["status"] == "NO_COVERAGE" for v in panels.values()):
        overall_status = "NO_COVERAGE"
    else:
        overall_status = "INCOMPLETE"

    # Backward-compat flat fields from primary panel
    if primary_panel and primary_panel in panels:
        pp = panels[primary_panel]
        bc_expected    = pp["expected_count"]
        bc_detected    = pp["detected_count"]
        bc_missing     = pp["missing_markers"]
        bc_detected_mk = pp["detected_markers"]
        bc_duplicates  = pp["duplicate_markers"]
        bc_pct         = pp["coverage_percent"]
    else:
        bc_expected = bc_detected = 0
        bc_missing = bc_detected_mk = bc_duplicates = []
        bc_pct = 0.0

    return {
        "status":           overall_status,
        "panels":           panels,
        "primary_panel":    primary_panel,
        # backward-compat
        "expected_count":   bc_expected,
        "detected_count":   bc_detected,
        "missing_count":    len(bc_missing),
        "coverage_percent": bc_pct,
        "detected_markers": bc_detected_mk,
        "missing_markers":  bc_missing,
        "duplicate_markers": bc_duplicates,
        "unknown_markers":  sorted(set(unknown_markers)),
    }
