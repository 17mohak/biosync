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
    score_matrix: list[list[int]] = Field(default_factory=list, description="Scoring matrix (downsampled if large sequences)")
    matrix_compressed: bool = Field(False, description="True if score_matrix was downsampled to fit 100x100 max")
    window_truncated: bool = Field(False, description="True if sequences were truncated to 1500bp for real-time performance")
    original_length_seq1: Optional[int] = Field(None, description="Original length of sequence_1 before truncation")
    original_length_seq2: Optional[int] = Field(None, description="Original length of sequence_2 before truncation")


class LocalAlignmentResponse(BaseModel):
    local_alignment_1: str
    local_alignment_2: str
    local_score: int
    algorithm: str = "smith-waterman"
    score_matrix: list[list[int]] = Field(default_factory=list, description="Scoring matrix (downsampled if large sequences)")
    matrix_compressed: bool = Field(False, description="True if score_matrix was downsampled to fit 100x100 max")
    window_truncated: bool = Field(False, description="True if sequences were truncated to 1500bp for real-time performance")
    original_length_seq1: Optional[int] = Field(None, description="Original length of sequence_1 before truncation")
    original_length_seq2: Optional[int] = Field(None, description="Original length of sequence_2 before truncation")


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
    window_truncated: bool = Field(
        False,
        description="True if sequences were truncated before alignment (from alignment response)",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [{"alignment_1": "ACG-TACGT", "alignment_2": "ACGTTAC-T", "window_truncated": False}]
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
    breakdown_truncated: bool = Field(False, description="True if position_breakdown was omitted due to size")
    clinical_translation: str = Field(..., description="Layman-friendly summary of the analysis results")


# ---------------------------------------------------------------------------
# Analytics / GC Content schemas
# ---------------------------------------------------------------------------

class AnalyticsProfileRequest(BaseModel):
    sequence: str = Field(
        ...,
        description="DNA sequence to analyze (A, C, G, T characters)",
    )
    window_size: int = Field(
        20,
        ge=5,
        le=1000,
        description="Sliding window size for GC analysis (default: 20)",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "sequence": "ATGCGATCGATCGATCGATCGATCGATCGATCG",
                "window_size": 20
            }]
        }
    }


class GlobalStatsResponse(BaseModel):
    """Global sequence statistics."""
    length: int = Field(..., description="Total sequence length")
    gc_content: float = Field(..., description="GC content percentage (0-100)")
    count_a: int = Field(..., description="Count of Adenine bases")
    count_t: int = Field(..., description="Count of Thymine bases")
    count_g: int = Field(..., description="Count of Guanine bases")
    count_c: int = Field(..., description="Count of Cytosine bases")
    count_other: int = Field(..., description="Count of non-standard characters")


class SlidingWindowGC(BaseModel):
    """GC content for a single sliding window position."""
    position: int = Field(..., description="Position in sequence (center of window)")
    gc_percent: float = Field(..., description="GC percentage in this window")


class AnalyticsProfileResponse(BaseModel):
    """Complete sequence analytics response."""
    global_stats: GlobalStatsResponse = Field(..., description="Global sequence statistics")
    melting_temperature: float = Field(..., description="Estimated melting temperature (Tm) in Celsius")
    tm_formula_used: str = Field(..., description="Tm formula used: 'short' (<14bp) or 'long' (>=14bp)")
    sliding_window_gc: list[SlidingWindowGC] = Field(
        default_factory=list,
        description="GC content across sliding windows"
    )
