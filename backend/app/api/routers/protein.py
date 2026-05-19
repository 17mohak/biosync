"""
api/routers/protein.py
======================
Router for protein-related operations:

  POST /api/protein/translate — DNA → Protein with molecular weight
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.translation import translate_dna_to_protein
from app.models.schemas import ProteinTranslateRequest, ProteinTranslateResponse

router = APIRouter(prefix="/api/protein", tags=["Protein"])


@router.post(
    "/translate",
    response_model=ProteinTranslateResponse,
    summary="DNA to Protein Translation",
    description=(
        "Accepts a DNA sequence (A, C, G, T only), translates it to an amino "
        "acid sequence using the standard genetic code, and calculates the "
        "estimated molecular weight of the resulting protein. "
        "Translation stops at the first stop codon encountered. "
        "Leftover bases (if sequence length is not a multiple of 3) are "
        "gracefully truncated."
    ),
)
def translate_to_protein(data: ProteinTranslateRequest) -> ProteinTranslateResponse:
    """
    Translate a DNA sequence into a protein sequence.

    This endpoint is designed for the 3D Protein Viewer feature.
    It returns the amino acid sequence along with the estimated
    molecular weight in kilodaltons (kDa).

    Parameters
    ----------
    data:
        ProteinTranslateRequest containing the DNA sequence.

    Returns
    -------
    ProteinTranslateResponse with:
        - amino_acid_sequence: The translated protein sequence
        - total_weight_kda: Estimated molecular weight in kDa
        - total_residues: Number of amino acid residues
        - stop_codon_found: Whether translation stopped at a stop codon
        - stop_codon: The stop codon that terminated translation, if any
        - leftover_bases: Number of truncated bases (non-multiple of 3)

    Raises
    ------
    HTTPException 400
        If the DNA sequence is invalid or empty.
    """
    try:
        result = translate_dna_to_protein(data.sequence)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return ProteinTranslateResponse(**result)
