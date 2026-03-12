"""
api/routers/analytics.py
========================
Router for GC Content & Sequence Analytics endpoints:

  POST /api/analytics/profile — Comprehensive sequence profiling
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.analytics import calculate_sequence_stats
from app.models.schemas import (
    AnalyticsProfileRequest,
    AnalyticsProfileResponse,
    GlobalStatsResponse,
    SlidingWindowGC,
)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.post(
    "/profile",
    response_model=AnalyticsProfileResponse,
    summary="Sequence GC Analytics & Thermodynamics",
    description=(
        "Comprehensive sequence analysis including global statistics, "
        "melting temperature (Tm) calculation, and sliding window GC content. "
        "Tm is calculated using the Wallace rule for sequences <14bp, "
        "or the Marmur-Doty equation for longer sequences."
    ),
)
def profile_sequence(data: AnalyticsProfileRequest) -> AnalyticsProfileResponse:
    """
    Analyze a nucleotide sequence for GC content and thermodynamic properties.
    
    Parameters
    ----------
    data : AnalyticsProfileRequest
        Contains sequence and optional window_size for sliding analysis
    
    Returns
    -------
    AnalyticsProfileResponse
        Global stats, melting temperature, and sliding window GC array
    
    Raises
    ------
    HTTPException
        400: If sequence is empty or invalid
    """
    sequence = data.sequence.upper().strip()
    
    # Validate sequence
    if not sequence:
        raise HTTPException(
            status_code=400,
            detail="Sequence must not be empty.",
        )
    
    # Run analytics
    result = calculate_sequence_stats(sequence, data.window_size)
    
    # Build response
    global_stats = GlobalStatsResponse(
        length=result.global_stats.length,
        gc_content=result.global_stats.gc_content,
        count_a=result.global_stats.count_a,
        count_t=result.global_stats.count_t,
        count_g=result.global_stats.count_g,
        count_c=result.global_stats.count_c,
        count_other=result.global_stats.count_other,
    )
    
    sliding_window_gc = [
        SlidingWindowGC(
            position=window.position,
            gc_percent=window.gc_percent,
        )
        for window in result.sliding_window_gc
    ]
    
    return AnalyticsProfileResponse(
        global_stats=global_stats,
        melting_temperature=result.melting_temperature,
        tm_formula_used=result.tm_formula_used,
        sliding_window_gc=sliding_window_gc,
    )
