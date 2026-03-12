"""
models/schemas.py
=================
All Pydantic v2 request and response models for the Bioinformatics API.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Alignment schemas
# ---------------------------------------------------------------------------

class AlignmentRequest(BaseModel):
    sequence_1: str = Field(..., description="First nucleic-acid sequence (A, C, G, T, U)")
    sequence_2: str = Field(..., description="Second nucleic-acid sequence (A, C, G, T, U)")
    match_score: int = Field(1, description="Score awarded for a matching base pair")
    mismatch_penalty: int = Field(-1, description="Penalty for a mismatched base pair")
    gap_penalty: int = Field(-2, description="Penalty per gap character introduced")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "sequence_1": "GATTACA",
                    "sequence_2": "GCATGCU",
                    "match_score": 1,
                    "mismatch_penalty": -1,
                    "gap_penalty": -2,
                }
            ]
        }
    }


class GlobalAlignmentResponse(BaseModel):
    alignment_1: str
    alignment_2: str
    optimal_score: int
    algorithm: str = "needleman-wunsch"
    score_matrix: list[list[int]] = Field(default_factory=list, description="Full scoring matrix for visualization")
    matrix_truncated: bool = Field(False, description="True if score_matrix was omitted due to size")


class LocalAlignmentResponse(BaseModel):
    local_alignment_1: str
    local_alignment_2: str
    local_score: int
    algorithm: str = "smith-waterman"
    score_matrix: list[list[int]] = Field(default_factory=list, description="Full scoring matrix for visualization")
    matrix_truncated: bool = Field(False, description="True if score_matrix was omitted due to size")


# ---------------------------------------------------------------------------
# Translation schemas
# ---------------------------------------------------------------------------

class TranslationRequest(BaseModel):
    dna_sequence: str = Field(
        ...,
        description="DNA sequence to transcribe and translate (A, C, G, T only). "
                    "Length must be a multiple of 3.",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [{"dna_sequence": "ATGGCCATGGCGCCCAGAACTGAGATCAATAGTACCC"}]
        }
    }


class TranslationResponse(BaseModel):
    dna: str
    rna: str
    protein: str
    stop_codon_found: bool
    stop_codon: Optional[str]
    codons_read: int


# ---------------------------------------------------------------------------
# FASTA schemas
# ---------------------------------------------------------------------------

class FastaRequest(BaseModel):
    fasta_text: str = Field(
        ...,
        description="Raw FASTA-format text containing one or more sequence records.",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "fasta_text": (
                        ">seq1 Homo sapiens BRCA1\n"
                        "ATCGATCGATCG\n"
                        ">seq2 Mus musculus\n"
                        "GCTAGCTAGCTA"
                    )
                }
            ]
        }
    }


class FastaRecordOut(BaseModel):
    id: str
    description: str
    sequence: str
    length: int


class FastaResponse(BaseModel):
    record_count: int
    records: list[FastaRecordOut]


# ---------------------------------------------------------------------------
# NCBI schemas
# ---------------------------------------------------------------------------

class NCBIFetchResponse(BaseModel):
    accession_id: str
    fasta_text: str


# ---------------------------------------------------------------------------
# History / persistence schemas
# ---------------------------------------------------------------------------

VALID_JOB_TYPES = {"global", "local", "translate", "fasta", "stability"}


class SaveJobRequest(BaseModel):
    job_type: str = Field(
        ...,
        description="Job type: 'global', 'local', 'translate', 'fasta', or 'stability'",
    )
    input_data: dict[str, Any] = Field(default_factory=dict)
    result_data: dict[str, Any] = Field(default_factory=dict)
    notes: Optional[str] = Field(None, description="Free-text researcher annotation")

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "job_type": "global",
                "input_data": {"sequence_1": "ACGT", "sequence_2": "ACGT"},
                "result_data": {"optimal_score": 4},
                "notes": "Control alignment for paper figure 3",
            }]
        }
    }


class JobRecordOut(BaseModel):
    id: int
    job_type: str
    input_data: dict[str, Any]
    result_data: dict[str, Any]
    notes: Optional[str]
    created_at: datetime


class HistoryResponse(BaseModel):
    total: int
    records: list[JobRecordOut]


# ---------------------------------------------------------------------------
# Stability / ML analysis schemas
# ---------------------------------------------------------------------------

class StabilityRequest(BaseModel):
    alignment_1: str = Field(
        ...,
        description="Gapped aligned string 1 (output of NW or SW)",
    )
    alignment_2: str = Field(
        ...,
        description="Gapped aligned string 2, same length as alignment_1",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [{"alignment_1": "ACG-TACGT", "alignment_2": "ACGTTAC-T"}]
        }
    }


class StabilityResponse(BaseModel):
    confidence_score: float
    raw_instability: float
    mutation_hotspots: list[dict[str, Any]]
    gc_content_seq1: float
    gc_content_seq2: float
    total_positions: int
    match_count: int
    mismatch_count: int
    gap_count: int
    position_breakdown: list[dict[str, Any]]
