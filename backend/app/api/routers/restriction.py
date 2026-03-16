"""
api/routers/restriction.py
==========================
Router for restriction enzyme mapping:

  POST /api/restriction/map  — find cut sites & fragment sizes
"""

from __future__ import annotations

import re
from fastapi import APIRouter, HTTPException

from app.core.restriction import RESTRICTION_ENZYMES, find_cut_sites
from app.models.schemas import RestrictionMapRequest, RestrictionMapResponse

router = APIRouter(prefix="/api/restriction", tags=["Restriction Mapping"])

_VALID_BASES = re.compile(r"^[ACGTU]+$")


@router.post(
    "/map",
    response_model=RestrictionMapResponse,
    summary="Restriction Enzyme Map",
    description=(
        "Scan a DNA sequence for recognition sites of the selected restriction "
        "enzymes and return every cut position together with the resulting "
        "fragment sizes."
    ),
)
def restriction_map(data: RestrictionMapRequest) -> RestrictionMapResponse:
    seq = data.sequence.upper().strip()

    # --- input validation ---------------------------------------------------
    if not seq:
        raise HTTPException(status_code=400, detail="'sequence' must not be empty.")

    if not _VALID_BASES.match(seq):
        invalid = next((ch for ch in seq if ch not in "ACGTU"), "?")
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid character '{invalid}' in sequence. "
                "Only nucleotide bases A, C, G, T, U are permitted."
            ),
        )

    if not data.enzymes:
        raise HTTPException(
            status_code=400,
            detail="At least one enzyme must be selected.",
        )

    # Validate that every requested enzyme is known
    known = {k.lower() for k in RESTRICTION_ENZYMES}
    unknown = [e for e in data.enzymes if e.lower() not in known]
    if unknown:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown enzyme(s): {', '.join(unknown)}. "
            f"Available: {', '.join(sorted(RESTRICTION_ENZYMES))}.",
        )

    # --- core logic ---------------------------------------------------------
    result = find_cut_sites(seq, data.enzymes)

    return RestrictionMapResponse(
        cut_sites=result["cut_sites"],
        fragment_sizes=result["fragment_sizes"],
        total_cuts=len(result["cut_sites"]),
        sequence_length=len(seq),
    )
