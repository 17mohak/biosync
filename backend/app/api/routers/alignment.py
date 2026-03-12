"""
api/routers/alignment.py
========================
Router for sequence alignment endpoints:

  POST /api/align/global   — Needleman-Wunsch (global)
  POST /api/align/local    — Smith-Waterman   (local)
"""

from __future__ import annotations

import re
from fastapi import APIRouter, HTTPException

from app.core.alignment import needleman_wunsch, smith_waterman
from app.models.schemas import (
    AlignmentRequest,
    GlobalAlignmentResponse,
    LocalAlignmentResponse,
)

router = APIRouter(prefix="/api/align", tags=["Alignment"])

_VALID_BASES = re.compile(r"^[ACGTU]+$")


def _validate_sequence(seq: str, field_name: str) -> str:
    """Uppercase and validate a sequence; raise HTTP 400 on bad characters."""
    seq = seq.upper().strip()
    if not seq:
        raise HTTPException(
            status_code=400,
            detail=f"'{field_name}' must not be empty.",
        )
    if not _VALID_BASES.match(seq):
        invalid = next((ch for ch in seq if ch not in "ACGTU"), "?")
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid character '{invalid}' in {field_name}. "
                "Only nucleotide bases A, C, G, T, U are permitted."
            ),
        )
    return seq


@router.post(
    "/global",
    response_model=GlobalAlignmentResponse,
    summary="Global Sequence Alignment (Needleman-Wunsch)",
    description=(
        "Align two nucleic-acid sequences end-to-end using the Needleman-Wunsch "
        "dynamic programming algorithm. Returns the optimal global alignment and score. "
        "Note: score_matrix is truncated for sequences > 100bp to prevent DOM overflow."
    ),
)
def global_alignment(data: AlignmentRequest) -> GlobalAlignmentResponse:
    seq1 = _validate_sequence(data.sequence_1, "sequence_1")
    seq2 = _validate_sequence(data.sequence_2, "sequence_2")

    result = needleman_wunsch(
        seq1, seq2,
        match=data.match_score,
        mismatch=data.mismatch_penalty,
        gap=data.gap_penalty,
    )

    return GlobalAlignmentResponse(
        alignment_1=result["alignment_1"],
        alignment_2=result["alignment_2"],
        optimal_score=result["optimal_score"],
        score_matrix=result["score_matrix"],
        matrix_truncated=result["matrix_truncated"],
    )


@router.post(
    "/local",
    response_model=LocalAlignmentResponse,
    summary="Local Sequence Alignment (Smith-Waterman)",
    description=(
        "Find the best-scoring local alignment between two nucleic-acid sequences "
        "using the Smith-Waterman algorithm. Scores are floored at 0, so only "
        "similar sub-regions are reported. "
        "Note: score_matrix is truncated for sequences > 100bp to prevent DOM overflow."
    ),
)
def local_alignment(data: AlignmentRequest) -> LocalAlignmentResponse:
    seq1 = _validate_sequence(data.sequence_1, "sequence_1")
    seq2 = _validate_sequence(data.sequence_2, "sequence_2")

    result = smith_waterman(
        seq1, seq2,
        match=data.match_score,
        mismatch=data.mismatch_penalty,
        gap=data.gap_penalty,
    )

    return LocalAlignmentResponse(
        local_alignment_1=result["local_alignment_1"],
        local_alignment_2=result["local_alignment_2"],
        local_score=result["local_score"],
        score_matrix=result["score_matrix"],
        matrix_truncated=result["matrix_truncated"],
    )
