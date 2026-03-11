import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Health-check
# ---------------------------------------------------------------------------

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "Bioinformatics Engine Active"
    assert body["version"] == "1.0"


# ---------------------------------------------------------------------------
# Successful alignment
# ---------------------------------------------------------------------------

def test_align_basic_dna():
    """A simple alignment where every position matches."""
    payload = {
        "sequence_1": "ACGT",
        "sequence_2": "ACGT",
        "match_score": 1,
        "mismatch_penalty": -1,
        "gap_penalty": -1,
    }
    response = client.post("/api/align", json=payload)
    assert response.status_code == 200
    body = response.json()

    assert "alignment_1" in body
    assert "alignment_2" in body
    assert "optimal_score" in body

    # Four identical bases → optimal score == 4 × match_score
    assert body["optimal_score"] == 4
    assert body["alignment_1"] == "ACGT"
    assert body["alignment_2"] == "ACGT"


def test_align_with_gap():
    """One sequence is shorter; the aligner must introduce a gap."""
    payload = {
        "sequence_1": "AACGT",
        "sequence_2": "ACGT",
        "match_score": 1,
        "mismatch_penalty": -1,
        "gap_penalty": -1,
    }
    response = client.post("/api/align", json=payload)
    assert response.status_code == 200
    body = response.json()

    # Both aligned strings must be the same length
    assert len(body["alignment_1"]) == len(body["alignment_2"])
    # One gap must appear somewhere
    assert "-" in body["alignment_1"] or "-" in body["alignment_2"]


def test_align_rna_sequences():
    """U is a valid base (RNA)."""
    payload = {
        "sequence_1": "ACGU",
        "sequence_2": "ACGU",
    }
    response = client.post("/api/align", json=payload)
    assert response.status_code == 200
    assert response.json()["optimal_score"] == 4


def test_align_uses_default_scores():
    """Omitting score parameters still works (defaults applied)."""
    payload = {"sequence_1": "GATTACA", "sequence_2": "GCATGCU"}
    response = client.post("/api/align", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert "optimal_score" in body


def test_align_lowercase_input():
    """Lowercase input must be accepted and treated identically to uppercase."""
    lower = client.post("/api/align", json={"sequence_1": "acgt", "sequence_2": "acgt"})
    upper = client.post("/api/align", json={"sequence_1": "ACGT", "sequence_2": "ACGT"})
    assert lower.status_code == 200
    assert lower.json()["optimal_score"] == upper.json()["optimal_score"]


# ---------------------------------------------------------------------------
# Invalid-character error handling  (expect HTTP 400)
# ---------------------------------------------------------------------------

def test_invalid_chars_in_sequence_1():
    payload = {"sequence_1": "ACGX", "sequence_2": "ACGT"}
    response = client.post("/api/align", json=payload)
    assert response.status_code == 400
    assert "sequence_1" in response.json()["detail"]


def test_invalid_chars_in_sequence_2():
    payload = {"sequence_1": "ACGT", "sequence_2": "1234"}
    response = client.post("/api/align", json=payload)
    assert response.status_code == 400
    assert "sequence_2" in response.json()["detail"]


def test_invalid_chars_special_characters():
    payload = {"sequence_1": "AC!GT", "sequence_2": "ACGT"}
    response = client.post("/api/align", json=payload)
    assert response.status_code == 400


def test_invalid_chars_spaces():
    payload = {"sequence_1": "AC GT", "sequence_2": "ACGT"}
    response = client.post("/api/align", json=payload)
    assert response.status_code == 400


def test_invalid_chars_both_sequences():
    """When both sequences are invalid, the first one's error is reported."""
    payload = {"sequence_1": "ACGZ", "sequence_2": "ACGZ"}
    response = client.post("/api/align", json=payload)
    assert response.status_code == 400
    assert "sequence_1" in response.json()["detail"]

