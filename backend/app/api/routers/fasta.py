"""
api/routers/fasta.py
====================
Router for unstructured FASTA data parsing:

  POST /api/fasta/parse — parse raw FASTA text and validate nucleotides
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.fasta_parser import parse_fasta
from app.models.schemas import FastaRequest, FastaRecordOut, FastaResponse

router = APIRouter(prefix="/api/fasta", tags=["FASTA"])


@router.post(
    "/parse",
    response_model=FastaResponse,
    summary="Parse FASTA-Format Text",
    description=(
        "Accepts raw, unstructured FASTA text. Parses out record headers "
        "(sequence ID + optional description) and nucleotide sequences. "
        "Validates that every sequence contains only valid nucleic-acid "
        "characters (A, C, G, T, U). Returns a structured list of records "
        "with their IDs, descriptions, sequences, and lengths."
    ),
)
def parse_fasta_endpoint(data: FastaRequest) -> FastaResponse:
    try:
        records = parse_fasta(data.fasta_text)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FastaResponse(
        record_count=len(records),
        records=[
            FastaRecordOut(
                id=r.id,
                description=r.description,
                sequence=r.sequence,
                length=r.length,
            )
            for r in records
        ],
    )
