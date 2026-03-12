"""
core/ml_engine.py
==================
Probabilistic Mutation Stability Engine with Clinical Translation.

Analyses a pairwise sequence alignment (the output of NW or SW) and produces:
  - A Confidence Score  (0–100):  100 = perfect alignment, 0 = all gaps/mismatches.
  - Mutation Hotspots:  sliding-window regions where instability is concentrated.
  - GC Content per sequence.
  - Per-position breakdown (MATCH / MISMATCH / GAP).
  - Clinical Translation: A layman-friendly summary of the findings.

No external ML framework required — the model is numpy-only, deterministic,
and fully unit-testable.

Instability weights (biologically motivated):
  MATCH    → 0.0  (no evidence of mutation)
  MISMATCH → 0.6  (point mutation; moderate instability)
  GAP      → 1.0  (insertion/deletion; maximum instability)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

import numpy as np

# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

PositionType = Literal["MATCH", "MISMATCH", "GAP"]

INSTABILITY_WEIGHTS: dict[PositionType, float] = {
    "MATCH":    0.0,
    "MISMATCH": 0.6,
    "GAP":      1.0,
}

HOTSPOT_WINDOW:    int   = 3
HOTSPOT_THRESHOLD: float = 0.5   # mean instability over the window


@dataclass
class PositionBreakdown:
    position: int
    base_1: str
    base_2: str
    position_type: PositionType
    instability: float


@dataclass
class MutationHotspot:
    start: int
    end: int
    window_instability: float
    dominant_type: PositionType


@dataclass
class StabilityResult:
    confidence_score: float                       # 0–100
    raw_instability:  float                       # 0–1
    mutation_hotspots: list[MutationHotspot]      # clustered instability windows
    gc_content_seq1: float                        # 0–1
    gc_content_seq2: float                        # 0–1
    total_positions: int
    match_count:    int
    mismatch_count: int
    gap_count:      int
    position_breakdown: list[PositionBreakdown]
    breakdown_truncated: bool = False             # True if position_breakdown was omitted
    clinical_translation: str = ""                # Layman-friendly summary


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _classify_position(b1: str, b2: str) -> PositionType:
    """Return MATCH, MISMATCH, or GAP for a single aligned position."""
    if b1 == "-" or b2 == "-":
        return "GAP"
    if b1 == b2:
        return "MATCH"
    return "MISMATCH"


def _gc_content(seq: str) -> float:
    """Fraction of G/C bases in *seq* (gaps excluded)."""
    bases = [b for b in seq.upper() if b in "ACGTU"]
    if not bases:
        return 0.0
    gc = sum(1 for b in bases if b in "GC")
    return round(gc / len(bases), 4)


def _find_hotspots(
    instability_arr: np.ndarray,
    breakdown: list[PositionBreakdown],
) -> list[MutationHotspot]:
    """
    Slide a window of size ``HOTSPOT_WINDOW`` across *instability_arr*.
    Any window whose mean instability ≥ ``HOTSPOT_THRESHOLD`` is reported as
    a hotspot.  Overlapping windows are merged.
    """
    n = len(instability_arr)
    if n < HOTSPOT_WINDOW:
        return []

    hotspots: list[MutationHotspot] = []
    in_hotspot = False
    hs_start = 0

    for i in range(n - HOTSPOT_WINDOW + 1):
        window = instability_arr[i : i + HOTSPOT_WINDOW]
        mean_instab = float(np.mean(window))

        if mean_instab >= HOTSPOT_THRESHOLD:
            if not in_hotspot:
                hs_start = i
                in_hotspot = True
        else:
            if in_hotspot:
                end = i + HOTSPOT_WINDOW - 1
                # Dominant type in this window
                types = [breakdown[k].position_type for k in range(hs_start, end)]
                dominant = max(set(types), key=types.count)
                hotspots.append(
                    MutationHotspot(
                        start=hs_start,
                        end=end - 1,
                        window_instability=round(
                            float(np.mean(instability_arr[hs_start:end])), 4
                        ),
                        dominant_type=dominant,
                    )
                )
                in_hotspot = False

    # Close any open hotspot at end of sequence
    if in_hotspot:
        end = n
        types = [breakdown[k].position_type for k in range(hs_start, end)]
        dominant = max(set(types), key=types.count)
        hotspots.append(
            MutationHotspot(
                start=hs_start,
                end=end - 1,
                window_instability=round(
                    float(np.mean(instability_arr[hs_start:end])), 4
                ),
                dominant_type=dominant,
            )
        )

    return hotspots


# ---------------------------------------------------------------------------
# Clinical Translation Engine
# ---------------------------------------------------------------------------

def _generate_clinical_translation(
    confidence_score: float,
    hotspots: list[MutationHotspot],
    mismatch_count: int,
    gap_count: int,
    total_positions: int,
    window_truncated: bool = False,
) -> str:
    """
    Generate a layman-friendly clinical translation of the stability analysis.
    
    This function produces a 2-3 sentence summary that explains the results
    in plain language, suitable for non-technical users.
    
    Parameters
    ----------
    confidence_score : float
        The stability confidence score (0-100)
    hotspots : list
        Detected mutation hotspots
    mismatch_count : int
        Number of mismatches in alignment
    gap_count : int
        Number of gaps in alignment
    total_positions : int
        Total alignment length
    window_truncated : bool
        If True, sequences were truncated before alignment (targeted window analysis)
    
    Returns
    -------
    str
        A 2-3 sentence layman summary with optional warning prepend
    """
    # Build the warning prepend if window was truncated
    warning_prepend = ""
    if window_truncated:
        warning_prepend = (
            "⚠️ TARGETED WINDOW ANALYSIS: Sequence exceeds computational limits for "
            "real-time dynamic programming. Analysis has been targeted to the first "
            "1,500 base pairs, simulating a focused examination of a critical genomic region "
            "(analogous to analyzing the Spike Protein region of a viral genome). "
            "Results reflect this targeted window only. "
        )
    
    # Determine overall stability category
    if confidence_score >= 90:
        stability_level = "excellent"
        stability_desc = "highly stable with minimal variation"
    elif confidence_score >= 75:
        stability_level = "good"
        stability_desc = "stable with some minor variations"
    elif confidence_score >= 50:
        stability_level = "moderate"
        stability_desc = "moderately stable with notable differences"
    elif confidence_score >= 25:
        stability_level = "low"
        stability_desc = "significant structural differences detected"
    else:
        stability_level = "poor"
        stability_desc = "substantial divergence between sequences"
    
    # Build the translation
    sentences = []
    
    # Sentence 1: Overall stability
    sentences.append(
        f"BioSync analysis indicates a {confidence_score:.1f}% stability match, "
        f"indicating {stability_desc}."
    )
    
    # Sentence 2: Mutation details or stability confirmation
    if hotspots:
        hotspot_count = len(hotspots)
        if hotspot_count == 1:
            hs = hotspots[0]
            position_info = f"position {hs.start}"
            if hs.end > hs.start:
                position_info = f"positions {hs.start}-{hs.end}"
            
            mutation_type = hs.dominant_type.lower()
            if mutation_type == "mismatch":
                mutation_desc = "a base substitution (one nucleotide replaced by another)"
            elif mutation_type == "gap":
                mutation_desc = "an insertion or deletion event"
            else:
                mutation_desc = "a structural variation"
            
            sentences.append(
                f"A critical mutation hotspot was detected at {position_info}, "
                f"characterized by {mutation_desc}."
            )
        else:
            # Multiple hotspots
            positions = []
            for hs in hotspots[:3]:  # Limit to first 3 for brevity
                if hs.end > hs.start:
                    positions.append(f"{hs.start}-{hs.end}")
                else:
                    positions.append(str(hs.start))
            
            pos_str = ", ".join(positions)
            if len(hotspots) > 3:
                pos_str += f", and {len(hotspots) - 3} more"
            
            sentences.append(
                f"{hotspot_count} mutation hotspots were identified at positions {pos_str}, "
                f"which may indicate regions of evolutionary or clinical significance."
            )
        
        # Sentence 3: Clinical context
        if confidence_score >= 75:
            sentences.append(
                "In a clinical context, these variations are likely benign, "
                "though further investigation may be warranted for specific variants."
            )
        elif confidence_score >= 50:
            sentences.append(
                "These structural anomalies could potentially affect protein function, "
                "similar to patterns observed in known genetic variants."
            )
        else:
            sentences.append(
                "The detected variations suggest significant divergence that may impact "
                "biological function, resembling patterns seen in pathogenic variants or different species."
            )
    else:
        # No hotspots - highly stable
        if confidence_score >= 90:
            sentences.append(
                "No structural anomalies or mutations were detected. "
                "The sequence appears healthy and well-conserved."
            )
        elif confidence_score >= 75:
            sentences.append(
                "While some minor variations exist, no significant mutation hotspots were identified."
            )
        else:
            sentences.append(
                f"Although the overall stability is {stability_level}, "
                f"no concentrated mutation hotspots were detected."
            )
    
    return warning_prepend + " ".join(sentences)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def analyze_alignment_stability(
    alignment_1: str,
    alignment_2: str,
    window_truncated: bool = False,
) -> StabilityResult:
    """
    Compute a stability / mutation-risk analysis for a pairwise alignment.

    Parameters
    ----------
    alignment_1, alignment_2:
        Gapped aligned strings of equal length (output of NW or SW).
    window_truncated:
        If True, indicates the alignment was performed on truncated sequences
        (targeted window analysis mode).

    Raises
    ------
    ValueError
        If the two strings have different lengths or are empty.
    """
    a1 = alignment_1.upper()
    a2 = alignment_2.upper()

    if not a1 or not a2:
        raise ValueError("Alignment strings must not be empty.")
    if len(a1) != len(a2):
        raise ValueError(
            f"Alignment strings must be the same length "
            f"(got {len(a1)} and {len(a2)})."
        )

    # ── Per-position classification ─────────────────────────────────────────
    breakdown: list[PositionBreakdown] = []
    match_count = mismatch_count = gap_count = 0

    for idx, (b1, b2) in enumerate(zip(a1, a2)):
        ptype = _classify_position(b1, b2)
        instab = INSTABILITY_WEIGHTS[ptype]

        if ptype == "MATCH":
            match_count += 1
        elif ptype == "MISMATCH":
            mismatch_count += 1
        else:
            gap_count += 1

        breakdown.append(
            PositionBreakdown(
                position=idx,
                base_1=b1,
                base_2=b2,
                position_type=ptype,
                instability=instab,
            )
        )

    instability_arr = np.array([p.instability for p in breakdown], dtype=np.float64)

    raw_instability = float(np.mean(instability_arr))
    confidence_score = round((1.0 - raw_instability) * 100.0, 2)

    # ── Hotspot detection ───────────────────────────────────────────────────
    hotspots = _find_hotspots(instability_arr, breakdown)

    # DOM SAFEGUARD: Truncate position_breakdown for alignments > 100bp
    # to prevent catastrophic frontend memory issues with viral genomes
    if len(a1) > 100:
        breakdown_out = []
        breakdown_truncated = True
    else:
        breakdown_out = breakdown
        breakdown_truncated = False

    # ── Clinical Translation ────────────────────────────────────────────────
    clinical_translation = _generate_clinical_translation(
        confidence_score=confidence_score,
        hotspots=hotspots,
        mismatch_count=mismatch_count,
        gap_count=gap_count,
        total_positions=len(breakdown),
        window_truncated=window_truncated,
    )

    return StabilityResult(
        confidence_score=confidence_score,
        raw_instability=round(raw_instability, 4),
        mutation_hotspots=hotspots,
        gc_content_seq1=_gc_content(a1),
        gc_content_seq2=_gc_content(a2),
        total_positions=len(breakdown),
        match_count=match_count,
        mismatch_count=mismatch_count,
        gap_count=gap_count,
        position_breakdown=breakdown_out,
        breakdown_truncated=breakdown_truncated,
        clinical_translation=clinical_translation,
    )
