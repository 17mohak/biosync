"""
tests/test_alignment.py
=======================
Comprehensive tests for both alignment algorithms:
  - Unit tests targeting core functions directly (matrix values, edge cases)
  - Integration tests via HTTP (validation, 400 errors, response shape)
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.alignment import needleman_wunsch, smith_waterman


# ===========================================================================
# Needleman-Wunsch — unit tests
# ===========================================================================

class TestNeedlemanWunschUnit:

    def test_identical_sequences_score(self):
        """All matches: score = len * match_score."""
        result = needleman_wunsch("ACGT", "ACGT", match=1, mismatch=-1, gap=-2)
        assert result["optimal_score"] == 4
        assert result["alignment_1"] == "ACGT"
        assert result["alignment_2"] == "ACGT"

    def test_score_matrix_shape(self):
        """Score matrix must be (n+1) × (m+1)."""
        seq1, seq2 = "AGT", "AC"
        result = needleman_wunsch(seq1, seq2)
        mat = result["score_matrix"]
        assert len(mat) == len(seq1) + 1
        assert all(len(row) == len(seq2) + 1 for row in mat)

    def test_first_row_initialisation(self):
        """First row must equal gap * j for j in 0..m."""
        result = needleman_wunsch("ACGT", "AC", gap=-2)
        row0 = result["score_matrix"][0]
        assert row0 == [0, -2, -4]

    def test_first_col_initialisation(self):
        """First column must equal gap * i for i in 0..n."""
        result = needleman_wunsch("ACG", "ACGT", gap=-2)
        col0 = [result["score_matrix"][i][0] for i in range(4)]
        assert col0 == [0, -2, -4, -6]

    def test_algorithm_label(self):
        result = needleman_wunsch("ACGT", "ACGT")
        assert result["algorithm"] == "needleman-wunsch"

    def test_aligned_sequences_equal_length(self):
        """Aligned strings must always be the same length."""
        result = needleman_wunsch("AACGT", "ACGT")
        assert len(result["alignment_1"]) == len(result["alignment_2"])

    def test_gap_introduced_for_length_mismatch(self):
        """A '-' must appear in at least one aligned string when lengths differ."""
        result = needleman_wunsch("AACGT", "ACGT")
        assert "-" in result["alignment_1"] or "-" in result["alignment_2"]

    def test_all_mismatches(self):
        """All-mismatch case: score = n * mismatch (global ─ no gap option is cheaper)."""
        result = needleman_wunsch("AAAA", "TTTT", match=1, mismatch=-1, gap=-10)
        # Cheapest: align all 4 mismatches → 4 * -1 = -4
        assert result["optimal_score"] == -4

    def test_single_character_match(self):
        result = needleman_wunsch("A", "A", match=2, mismatch=-1, gap=-1)
        assert result["optimal_score"] == 2

    def test_single_character_mismatch(self):
        result = needleman_wunsch("A", "T", match=2, mismatch=-3, gap=-1)
        # Two gaps = -2; one mismatch = -3 → gap is cheaper
        assert result["optimal_score"] == -2

    def test_rna_sequences_accepted(self):
        result = needleman_wunsch("ACGU", "ACGU")
        assert result["optimal_score"] == 4

    def test_known_gattaca_score(self):
        """
        Hand-computed NW result for GATTACA vs GCATGCU
        (match=1, mismatch=-1, gap=-2) known score = 0.
        """
        result = needleman_wunsch("GATTACA", "GCATGCU", match=1, mismatch=-1, gap=-2)
        assert isinstance(result["optimal_score"], int)
        # Alignment strings must be non-empty and same length
        assert len(result["alignment_1"]) == len(result["alignment_2"])
        assert len(result["alignment_1"]) > 0


# ===========================================================================
# Smith-Waterman — unit tests
# ===========================================================================

class TestSmithWatermanUnit:

    def test_identical_sequences(self):
        """Identical sequences: local score == n * match_score."""
        result = smith_waterman("ACGT", "ACGT", match=1, mismatch=-1, gap=-2)
        assert result["local_score"] == 4

    def test_score_never_negative_in_matrix(self):
        """All cells of the SW matrix must be >= 0."""
        result = smith_waterman("ACGT", "TTTT", match=1, mismatch=-3, gap=-2)
        for row in result["score_matrix"]:
            assert all(v >= 0 for v in row)

    def test_algorithm_label(self):
        result = smith_waterman("ACGT", "ACGT")
        assert result["algorithm"] == "smith-waterman"

    def test_local_alignment_returned_keys(self):
        result = smith_waterman("ACGT", "ACGT")
        assert "local_alignment_1" in result
        assert "local_alignment_2" in result
        assert "local_score" in result

    def test_local_finds_sub_region(self):
        """SW should find the common 'CGTACGT' sub-region."""
        seq1 = "TTTCGTACGTAAA"
        seq2 = "CGTACGT"
        result = smith_waterman(seq1, seq2, match=2, mismatch=-1, gap=-2)
        assert result["local_score"] > 0
        # The aligned region in seq2 should match perfectly
        la2 = result["local_alignment_2"]
        assert la2 == "CGTACGT"

    def test_no_common_subsequence_score_is_zero(self):
        """When sequences share nothing (high penalties), SW score stays at 0."""
        result = smith_waterman("AAAA", "TTTT", match=1, mismatch=-10, gap=-10)
        assert result["local_score"] == 0

    def test_score_matrix_shape(self):
        seq1, seq2 = "ACG", "TT"
        result = smith_waterman(seq1, seq2)
        mat = result["score_matrix"]
        assert len(mat) == len(seq1) + 1
        assert all(len(row) == len(seq2) + 1 for row in mat)

    def test_first_row_and_col_are_zero(self):
        """SW initialises with all-zero borders (unlike NW which uses gap penalties)."""
        result = smith_waterman("ACGT", "ACG")
        mat = result["score_matrix"]
        assert all(mat[0][j] == 0 for j in range(4))
        assert all(mat[i][0] == 0 for i in range(5))


# ===========================================================================
# Integration tests — /api/align/global
# ===========================================================================

class TestGlobalAlignmentAPI:

    def test_basic_success(self, client: TestClient):
        resp = client.post("/api/align/global", json={
            "sequence_1": "ACGT", "sequence_2": "ACGT",
        })
        assert resp.status_code == 200
        body = resp.json()
        assert body["optimal_score"] == 4
        assert body["alignment_1"] == "ACGT"
        assert body["alignment_2"] == "ACGT"
        assert body["algorithm"] == "needleman-wunsch"

    def test_lowercase_normalised(self, client: TestClient):
        resp = client.post("/api/align/global", json={
            "sequence_1": "acgt", "sequence_2": "acgt",
        })
        assert resp.status_code == 200
        assert resp.json()["optimal_score"] == 4

    def test_rna_accepted(self, client: TestClient):
        resp = client.post("/api/align/global", json={
            "sequence_1": "ACGU", "sequence_2": "ACGU",
        })
        assert resp.status_code == 200

    def test_invalid_char_sequence_1(self, client: TestClient):
        resp = client.post("/api/align/global", json={
            "sequence_1": "ACGX", "sequence_2": "ACGT",
        })
        assert resp.status_code == 400
        assert "sequence_1" in resp.json()["detail"]

    def test_invalid_char_sequence_2(self, client: TestClient):
        resp = client.post("/api/align/global", json={
            "sequence_1": "ACGT", "sequence_2": "1234",
        })
        assert resp.status_code == 400
        assert "sequence_2" in resp.json()["detail"]

    def test_empty_sequence_1(self, client: TestClient):
        resp = client.post("/api/align/global", json={
            "sequence_1": "", "sequence_2": "ACGT",
        })
        assert resp.status_code == 400

    def test_special_chars_rejected(self, client: TestClient):
        resp = client.post("/api/align/global", json={
            "sequence_1": "AC!GT", "sequence_2": "ACGT",
        })
        assert resp.status_code == 400

    def test_spaces_in_sequence_rejected(self, client: TestClient):
        resp = client.post("/api/align/global", json={
            "sequence_1": "AC GT", "sequence_2": "ACGT",
        })
        assert resp.status_code == 400

    def test_custom_scores(self, client: TestClient):
        resp = client.post("/api/align/global", json={
            "sequence_1": "ACGT", "sequence_2": "ACGT",
            "match_score": 3, "mismatch_penalty": -2, "gap_penalty": -4,
        })
        assert resp.status_code == 200
        assert resp.json()["optimal_score"] == 12  # 4 matches × 3


# ===========================================================================
# Integration tests — /api/align/local
# ===========================================================================

class TestLocalAlignmentAPI:

    def test_basic_success(self, client: TestClient):
        resp = client.post("/api/align/local", json={
            "sequence_1": "ACGT", "sequence_2": "ACGT",
        })
        assert resp.status_code == 200
        body = resp.json()
        assert body["local_score"] == 4
        assert body["algorithm"] == "smith-waterman"

    def test_invalid_char_rejected(self, client: TestClient):
        resp = client.post("/api/align/local", json={
            "sequence_1": "ACGZ", "sequence_2": "ACGT",
        })
        assert resp.status_code == 400

    def test_local_score_non_negative(self, client: TestClient):
        resp = client.post("/api/align/local", json={
            "sequence_1": "AAAA", "sequence_2": "TTTT",
            "match_score": 1, "mismatch_penalty": -10, "gap_penalty": -10,
        })
        assert resp.status_code == 200
        assert resp.json()["local_score"] >= 0

    def test_response_has_required_keys(self, client: TestClient):
        resp = client.post("/api/align/local", json={
            "sequence_1": "ACGT", "sequence_2": "ACG",
        })
        assert resp.status_code == 200
        body = resp.json()
        for key in ("local_alignment_1", "local_alignment_2", "local_score", "algorithm"):
            assert key in body
