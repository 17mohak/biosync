"""
tests/test_ml_stability.py
==========================
Test suite for the ML Stability Engine (probabilistic analysis model)
and the associated API endpoint.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.ml_engine import analyze_alignment_stability
from app import create_app

client = TestClient(create_app())

# ===========================================================================
# ML Engine Unit Tests
# ===========================================================================

class TestMLStabilityEngine:

    def test_perfect_alignment_confidence_100(self):
        res = analyze_alignment_stability("ACGT", "ACGT")
        assert res.confidence_score == 100.0
        assert res.raw_instability == 0.0
        assert res.match_count == 4
        assert res.mismatch_count == 0
        assert res.gap_count == 0

    def test_all_gaps_confidence_0(self):
        # 4 gaps = full instability. 1.0 mean instability
        res = analyze_alignment_stability("----", "ACGT")
        assert res.confidence_score == 0.0
        assert res.raw_instability == 1.0
        assert res.gap_count == 4

    def test_all_mismatches_confidence_40(self):
        # 4 mismatches (weight 0.6). Mean instability = 0.6
        # Confidence = 1 - 0.6 = 0.4 -> 40.0
        res = analyze_alignment_stability("AAAA", "TTTT")
        assert res.confidence_score == 40.0
        assert res.mismatch_count == 4

    def test_confidence_score_in_range(self):
        res = analyze_alignment_stability("ACG-T", "ACATT")
        assert 0.0 <= res.confidence_score <= 100.0
        assert 0.0 <= res.raw_instability <= 1.0

    def test_hotspots_empty_for_perfect_alignment(self):
        res = analyze_alignment_stability("ACGTACGT", "ACGTACGT")
        assert len(res.mutation_hotspots) == 0

    def test_hotspots_detected_for_clustered_mismatches(self):
        # ACGTTTACG
        # ACGAAACG  (middle 3 are mismatches)
        res = analyze_alignment_stability("ACGTTTACG", "ACGAAAACG")
        
        # Middle 3 indices (3, 4, 5) have weight 0.6 
        assert len(res.mutation_hotspots) >= 1
        hs = res.mutation_hotspots[0]
        assert hs.dominant_type == "MISMATCH"

    def test_gc_content_calculation(self):
        # 2 Gs, 1 C, 1 A out of 4 non-gaps = 3/4 = 0.75
        res = analyze_alignment_stability("GGCA-", "AAAAA")
        assert res.gc_content_seq1 == 0.75
        assert res.gc_content_seq2 == 0.0

    def test_position_breakdown_length(self):
        seq1, seq2 = "ACGT-", "ACGTA"
        res = analyze_alignment_stability(seq1, seq2)
        assert len(res.position_breakdown) == 5
        assert res.total_positions == 5

    def test_mismatched_lengths_raises_value_error(self):
        with pytest.raises(ValueError, match="same length"):
            analyze_alignment_stability("ACGT", "ACG")

    def test_empty_strings_raises_value_error(self):
        with pytest.raises(ValueError, match="empty"):
            analyze_alignment_stability("", "")


# ===========================================================================
# API Endpoint Tests
# ===========================================================================

class TestStabilityAPIEndpoint:

    def test_stability_api_endpoint_success(self):
        resp = client.post("/api/analyze/stability", json={
            "alignment_1": "ACGT",
            "alignment_2": "ACGT"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "confidence_score" in data
        assert data["confidence_score"] == 100.0
        assert "mutation_hotspots" in data
        assert "gc_content_seq1" in data
        assert "position_breakdown" in data

    def test_stability_api_mismatched_lengths_400(self):
        resp = client.post("/api/analyze/stability", json={
            "alignment_1": "ACGT",
            "alignment_2": "A"
        })
        assert resp.status_code == 400
        assert "same length" in resp.json()["detail"]
