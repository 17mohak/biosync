"""
api/routers/biology.py
======================
Router for biological sequence operations:

  POST /api/biology/translate — DNA → RNA → Protein
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.translation import run_pipeline
from app.models.schemas import TranslationRequest, TranslationResponse

router = APIRouter(prefix="/api/biology", tags=["Biology"])


@router.post(
    "/translate",
    response_model=TranslationResponse,
    summary="DNA Transcription & Translation",
    description=(
        "Accepts a DNA sequence (A, C, G, T only), transcribes it to RNA "
        "(T → U), then translates it codon-by-codon using the standard genetic "
        "code. Translation halts at the first stop codon (UAA, UAG, UGA). "
        "The sequence length must be a multiple of 3."
    ),
)
def translate_sequence(data: TranslationRequest) -> TranslationResponse:
    try:
        result = run_pipeline(data.dna_sequence)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return TranslationResponse(**result)
