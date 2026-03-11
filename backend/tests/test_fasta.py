"""
tests/test_fasta.py
===================
Comprehensive tests for the FASTA parser:
  - Unit tests for parse_fasta() directly (valid, invalid, edge cases)
  - Integration tests via HTTP for /api/fasta/parse
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.fasta_parser import parse_fasta, FastaRecord


# ===========================================================================
# parse_fasta() — unit tests (valid input)
# ===========================================================================

class TestFastaParserValid:

    def test_single_record_basic(self):
        text = ">seq1\nACGT\n"
        records = parse_fasta(text)
        assert len(records) == 1
        r = records[0]
        assert r.id == "seq1"
        assert r.sequence == "ACGT"
        assert r.length == 4
        assert r.description == ""

    def test_single_record_with_description(self):
        text = ">seq1 Homo sapiens BRCA1 gene\nACGTACGT\n"
        records = parse_fasta(text)
        assert records[0].id == "seq1"
        assert records[0].description == "Homo sapiens BRCA1 gene"

    def test_multi_record(self):
        text = ">seq1\nACGT\n>seq2\nGGCC\n"
        records = parse_fasta(text)
        assert len(records) == 2
        assert records[0].id == "seq1"
        assert records[1].id == "seq2"

    def test_multiline_sequence_concatenated(self):
        text = ">seq1\nACGT\nACGT\nACGT\n"
        records = parse_fasta(text)
        assert records[0].sequence == "ACGTACGTACGT"
        assert records[0].length == 12

    def test_lowercase_sequence_normalised(self):
        text = ">seq1\nacgt\n"
        records = parse_fasta(text)
        assert records[0].sequence == "ACGT"

    def test_rna_sequence_valid(self):
        text = ">rna1\nACGU\n"
        records = parse_fasta(text)
        assert records[0].sequence == "ACGU"

    def test_blank_lines_within_sequence_ignored(self):
        text = ">seq1\nACGT\n\nACGT\n"
        records = parse_fasta(text)
        assert records[0].sequence == "ACGTACGT"

    def test_comment_lines_skipped(self):
        text = ">seq1\n; this is a comment\nACGT\n"
        records = parse_fasta(text)
        assert records[0].sequence == "ACGT"

    def test_length_field_set_correctly(self):
        text = ">seq1\nACGTACGT\n"
        records = parse_fasta(text)
        assert records[0].length == len(records[0].sequence)

    def test_mixed_rna_dna_across_records(self):
        text = ">dna\nACGT\n>rna\nACGU\n"
        records = parse_fasta(text)
        assert records[0].sequence == "ACGT"
        assert records[1].sequence == "ACGU"

    def test_returns_list_of_fasta_record(self):
        text = ">s1\nACGT\n"
        records = parse_fasta(text)
        assert all(isinstance(r, FastaRecord) for r in records)


# ===========================================================================
# parse_fasta() — edge cases / error paths
# ===========================================================================

class TestFastaParserErrors:

    def test_empty_string_raises(self):
        with pytest.raises(ValueError, match="empty"):
            parse_fasta("")

    def test_whitespace_only_raises(self):
        with pytest.raises(ValueError, match="empty"):
            parse_fasta("   \n  \t  ")

    def test_no_header_raises(self):
        with pytest.raises(ValueError, match="header"):
            parse_fasta("ACGTACGT\n")

    def test_header_with_no_id_raises(self):
        with pytest.raises(ValueError):
            parse_fasta(">\nACGT\n")

    def test_header_with_no_sequence_raises(self):
        with pytest.raises(ValueError, match="no sequence data"):
            parse_fasta(">seq1\n>seq2\nACGT\n")

    def test_invalid_nucleotide_raises(self):
        with pytest.raises(ValueError, match="invalid nucleotide"):
            parse_fasta(">seq1\nACGTX\n")

    def test_invalid_nucleotide_names_offending_char(self):
        try:
            parse_fasta(">seq1\nACGTZ\n")
        except ValueError as exc:
            assert "Z" in str(exc)

    def test_number_in_sequence_raises(self):
        with pytest.raises(ValueError):
            parse_fasta(">seq1\nACG1T\n")

    def test_space_in_sequence_stripped_ok(self):
        """Spaces within sequence lines should be stripped and not cause errors."""
        text = ">seq1\nACGT ACGT\n"
        records = parse_fasta(text)
        assert records[0].sequence == "ACGTACGT"

    def test_sequence_before_header_raises(self):
        with pytest.raises(ValueError):
            parse_fasta("ACGT\n>seq1\nACGT\n")

    def test_only_header_no_sequence_raises(self):
        with pytest.raises(ValueError):
            parse_fasta(">seq1\n")


# ===========================================================================
# Integration tests — /api/fasta/parse
# ===========================================================================

class TestFastaParseAPI:

    def test_single_record_success(self, client: TestClient):
        resp = client.post("/api/fasta/parse", json={
            "fasta_text": ">seq1 test\nACGTACGT\n"
        })
        assert resp.status_code == 200
        body = resp.json()
        assert body["record_count"] == 1
        record = body["records"][0]
        assert record["id"] == "seq1"
        assert record["description"] == "test"
        assert record["sequence"] == "ACGTACGT"
        assert record["length"] == 8

    def test_multi_record_success(self, client: TestClient):
        resp = client.post("/api/fasta/parse", json={
            "fasta_text": ">s1\nACGT\n>s2\nGGCC\n"
        })
        assert resp.status_code == 200
        assert resp.json()["record_count"] == 2

    def test_invalid_nucleotide_returns_400(self, client: TestClient):
        resp = client.post("/api/fasta/parse", json={
            "fasta_text": ">seq1\nACGTXXX\n"
        })
        assert resp.status_code == 400
        assert "invalid nucleotide" in resp.json()["detail"].lower()

    def test_empty_input_returns_400(self, client: TestClient):
        resp = client.post("/api/fasta/parse", json={"fasta_text": ""})
        assert resp.status_code == 400

    def test_no_header_returns_400(self, client: TestClient):
        resp = client.post("/api/fasta/parse", json={"fasta_text": "ACGT\n"})
        assert resp.status_code == 400

    def test_multiline_sequence_parsed_correctly(self, client: TestClient):
        resp = client.post("/api/fasta/parse", json={
            "fasta_text": ">seq1\nACGT\nACGT\n"
        })
        assert resp.status_code == 200
        assert resp.json()["records"][0]["length"] == 8

    def test_lowercase_normalised(self, client: TestClient):
        resp = client.post("/api/fasta/parse", json={
            "fasta_text": ">s1\nacgt\n"
        })
        assert resp.status_code == 200
        assert resp.json()["records"][0]["sequence"] == "ACGT"

    def test_response_schema(self, client: TestClient):
        resp = client.post("/api/fasta/parse", json={
            "fasta_text": ">seq1\nACGT\n"
        })
        assert resp.status_code == 200
        body = resp.json()
        assert "record_count" in body
        assert "records" in body
        for key in ("id", "description", "sequence", "length"):
            assert key in body["records"][0]
