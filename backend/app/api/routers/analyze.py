"""
api/routers/analyze.py
======================
Stability analysis endpoint:

  POST /api/analyze/stability — ML mutation risk engine on an alignment result
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.ml_engine import analyze_alignment_stability
from app.models.schemas import StabilityRequest, StabilityResponse

router = APIRouter(prefix="/api/analyze", tags=["Analysis"])


@router.post(
    "/stability",
    response_model=StabilityResponse,
    summary="Alignment Stability & Mutation Risk Analysis",
    description=(
        "Accepts the two gapped aligned strings from any alignment result "
        "(NW or SW) and runs the probabilistic mutation stability engine. "
        "Returns a Confidence Score (0–100), Mutation Hotspots (clustered "
        "instability windows), GC content per sequence, a full "
        "per-position breakdown, and a clinical translation summary. "
        "Note: position_breakdown is truncated for alignments > 100bp to prevent DOM overflow."
    ),
)
def stability_analysis(data: StabilityRequest) -> StabilityResponse:
    try:
        result = analyze_alignment_stability(data.alignment_1, data.alignment_2)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return StabilityResponse(
        confidence_score=result.confidence_score,
        raw_instability=result.raw_instability,
        mutation_hotspots=[
            {
                "start":              hs.start,
                "end":                hs.end,
                "window_instability": hs.window_instability,
                "dominant_type":      hs.dominant_type,
            }
            for hs in result.mutation_hotspots
        ],
        gc_content_seq1=result.gc_content_seq1,
        gc_content_seq2=result.gc_content_seq2,
        total_positions=result.total_positions,
        match_count=result.match_count,
        mismatch_count=result.mismatch_count,
        gap_count=result.gap_count,
        position_breakdown=[
            {
                "position":      p.position,
                "base_1":        p.base_1,
                "base_2":        p.base_2,
                "position_type": p.position_type,
                "instability":   p.instability,
            }
            for p in result.position_breakdown
        ],
        breakdown_truncated=result.breakdown_truncated,
        clinical_translation=result.clinical_translation,
    )
