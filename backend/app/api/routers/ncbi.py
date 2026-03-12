"""
api/routers/ncbi.py
===================
Router for NCBI E-utilities integration:

  GET /api/ncbi/fetch/{accession_id} — Fetch FASTA sequence by ID
"""

from __future__ import annotations

from fastapi import APIRouter

from app.core.ncbi_client import fetch_fasta_from_ncbi
from app.models.schemas import NCBIFetchResponse

router = APIRouter(prefix="/api/ncbi", tags=["NCBI Integration"])

@router.get(
    "/fetch/{accession_id}",
    response_model=NCBIFetchResponse,
    summary="Fetch from NCBI",
    description="Fetch a raw nucleotide sequence in FASTA format from the NCBI E-utilities API using its accession ID.",
)
async def fetch_ncbi_sequence(accession_id: str) -> NCBIFetchResponse:
    fasta_text = await fetch_fasta_from_ncbi(accession_id)
    return NCBIFetchResponse(
        accession_id=accession_id,
        fasta_text=fasta_text,
    )
