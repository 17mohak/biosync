"""
core/analytics.py
=================
GC Content & Sequence Analytics Engine

Provides comprehensive sequence analysis including:
  - Global statistics (length, GC%, base counts)
  - Thermodynamic calculations (melting temperature)
  - Sliding window GC analysis
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


# ---------------------------------------------------------------------------
# Data Classes for Structured Results
# ---------------------------------------------------------------------------

@dataclass
class GlobalStats:
    """Global sequence statistics."""
    length: int
    gc_content: float  # Percentage (0-100)
    count_a: int
    count_t: int
    count_g: int
    count_c: int
    count_other: int


@dataclass
class SlidingWindowResult:
    """GC content for a single sliding window position."""
    position: int  # End position of window (1-indexed for display)
    gc_percent: float  # GC percentage in this window


@dataclass
class SequenceStatsResult:
    """Complete sequence analysis result."""
    global_stats: GlobalStats
    melting_temperature: float
    sliding_window_gc: list[SlidingWindowResult]
    tm_formula_used: str  # "short" or "long"


# ---------------------------------------------------------------------------
# Core Analytics Functions
# ---------------------------------------------------------------------------

def calculate_sequence_stats(
    sequence: str,
    window_size: int = 20,
) -> SequenceStatsResult:
    """
    Calculate comprehensive statistics for a nucleotide sequence.
    
    Parameters
    ----------
    sequence : str
        DNA sequence (A, C, G, T characters, case-insensitive)
    window_size : int
        Size of sliding window for GC analysis (default: 20)
    
    Returns
    -------
    SequenceStatsResult
        Contains global stats, melting temperature, and sliding window GC array.
    
    Notes
    -----
    Melting Temperature (Tm) Calculation:
        For sequences < 14 bp:
            Tm = (wA + wT) * 2 + (wG + wC) * 4
            (Wallace rule - simple approximation for short oligos)
        
        For sequences >= 14 bp:
            Tm = 64.9 + 41 * (wG + wC - 16.4) / (wA + wT + wG + wC)
            (Marmur-Doty equation adjusted for salt concentration)
    """
    # Normalize sequence
    seq = sequence.upper().strip()
    
    # Count bases
    count_a = seq.count('A')
    count_t = seq.count('T') + seq.count('U')  # Treat U as T
    count_g = seq.count('G')
    count_c = seq.count('C')
    count_other = len(seq) - (count_a + count_t + count_g + count_c)
    
    total_length = len(seq)
    
    # Calculate GC content
    total_bases = count_a + count_t + count_g + count_c
    if total_bases > 0:
        gc_content = ((count_g + count_c) / total_bases) * 100
    else:
        gc_content = 0.0
    
    # Calculate melting temperature
    # Determine which formula to use based on sequence length
    if total_length < 14:
        # Wallace rule for short oligonucleotides (<14 bp)
        tm = (count_a + count_t) * 2 + (count_g + count_c) * 4
        tm_formula = "short"
    else:
        # Marmur-Doty equation for longer sequences (>=14 bp)
        if total_bases > 0:
            tm = 64.9 + 41 * (count_g + count_c - 16.4) / total_bases
        else:
            tm = 0.0
        tm_formula = "long"
    
    # Sliding window GC analysis
    sliding_window_results: list[SlidingWindowResult] = []
    
    if total_length >= window_size and window_size > 0:
        # Use non-overlapping windows for cleaner visualization
        # Window moves in steps of window_size for non-overlapping,
        # but we'll use smaller steps for smoother graphs
        step = max(1, window_size // 2)  # Half-window overlap for smoothness
        
        for i in range(0, total_length - window_size + 1, step):
            window = seq[i:i + window_size]
            
            # Count GC in window
            g_in_window = window.count('G')
            c_in_window = window.count('C')
            valid_bases = sum(1 for b in window if b in 'ACGTU')
            
            if valid_bases > 0:
                window_gc = ((g_in_window + c_in_window) / valid_bases) * 100
            else:
                window_gc = 0.0
            
            # Position marks the center of the window for visualization
            center_position = i + (window_size // 2) + 1  # 1-indexed
            
            sliding_window_results.append(
                SlidingWindowResult(
                    position=center_position,
                    gc_percent=round(window_gc, 2),
                )
            )
    
    # Build result
    global_stats = GlobalStats(
        length=total_length,
        gc_content=round(gc_content, 2),
        count_a=count_a,
        count_t=count_t,
        count_g=count_g,
        count_c=count_c,
        count_other=count_other,
    )
    
    return SequenceStatsResult(
        global_stats=global_stats,
        melting_temperature=round(tm, 2),
        sliding_window_gc=sliding_window_results,
        tm_formula_used=tm_formula,
    )


def calculate_molecular_weight(sequence: str, as_rna: bool = False) -> float:
    """
    Calculate approximate molecular weight of a nucleic acid sequence.
    
    Parameters
    ----------
    sequence : str
        DNA or RNA sequence
    as_rna : bool
        If True, calculate as RNA (adds ~16 Da for 2' OH per nucleotide)
    
    Returns
    -------
    float
        Molecular weight in Daltons (g/mol)
    
    Notes
    -----
    Average molecular weights (Daltons):
        dAMP: 331.2, dTMP: 322.2, dGMP: 347.2, dCMP: 307.2
        AMP: 347.2, UMP: 324.2, GMP: 363.2, CMP: 323.2
    """
    seq = sequence.upper()
    
    # Average MW for single-stranded DNA (simplified)
    avg_mw = 330.0  # Average nucleotide MW
    
    if as_rna:
        avg_mw += 16.0  # Additional mass for 2' OH
    
    # Subtract water for phosphodiester bonds
    water_weight = (len(seq) - 1) * 18.0 if len(seq) > 1 else 0
    
    return round(len(seq) * avg_mw - water_weight, 2)


def calculate_gc_ratio(sequence: str) -> dict[str, Any]:
    """
    Calculate GC-related ratios for sequence analysis.
    
    Returns
    -------
    dict
        Contains GC ratio, AT/GC ratio, and GC skew
    """
    seq = sequence.upper()
    
    count_a = seq.count('A')
    count_t = seq.count('T') + seq.count('U')
    count_g = seq.count('G')
    count_c = seq.count('C')
    
    total = count_a + count_t + count_g + count_c
    
    if total == 0:
        return {
            "gc_ratio": 0.0,
            "at_gc_ratio": 0.0,
            "gc_skew": 0.0,
            "at_skew": 0.0,
        }
    
    gc_count = count_g + count_c
    at_count = count_a + count_t
    
    # GC skew: (G - C) / (G + C) - indicates leading vs lagging strand
    gc_skew = (count_g - count_c) / gc_count if gc_count > 0 else 0.0
    
    # AT skew: (A - T) / (A + T)
    at_skew = (count_a - count_t) / at_count if at_count > 0 else 0.0
    
    return {
        "gc_ratio": round(gc_count / total, 4),
        "at_gc_ratio": round(at_count / gc_count, 4) if gc_count > 0 else float('inf'),
        "gc_skew": round(gc_skew, 4),
        "at_skew": round(at_skew, 4),
    }
