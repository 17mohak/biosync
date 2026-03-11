"""
tests/test_translation.py
=========================
Comprehensive tests for the biological translation pipeline:
  - Unit tests for transcribe(), translate(), and run_pipeline()
  - Integration tests via HTTP for /api/biology/translate
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.translation import transcribe, translate, run_pipeline, CODON_TABLE


# ===========================================================================
# transcribe() — unit tests
# ===========================================================================

class TestTranscribe:

    def test_t_to_u(self):
        assert transcribe("ATCG") == "AUCG"

    def test_no_t_unchanged(self):
        assert transcribe("ACGCAGCG") == "ACGCAGCG"

    def test_all_t(self):
        assert transcribe("TTTT") == "UUUU"

    def test_empty_string(self):
        assert transcribe("") == ""

    def test_mixed_bases(self):
        assert transcribe("GATTACA") == "GAUUACA"


# ===========================================================================
# translate() — unit tests
# ===========================================================================

class TestTranslate:

    def test_methionine_start(self):
        """AUG → M"""
        result = translate("AUG")
        assert result["protein"] == "M"
        assert result["stop_codon_found"] is False

    def test_stop_codon_uaa(self):
        result = translate("AUGUAA")
        assert result["protein"] == "M"
        assert result["stop_codon_found"] is True
        assert result["stop_codon"] == "UAA"
        assert result["codons_read"] == 2

    def test_stop_codon_uag(self):
        result = translate("AUGUAG")
        assert result["stop_codon"] == "UAG"

    def test_stop_codon_uga(self):
        result = translate("AUGUGA")
        assert result["stop_codon"] == "UGA"

    def test_no_stop_codon(self):
        """Full ORF with no stop codon — translate everything."""
        result = translate("AUGCCA")  # M, P
        assert result["protein"] == "MP"
        assert result["stop_codon_found"] is False
        assert result["stop_codon"] is None

    def test_codons_read_count(self):
        result = translate("AUGCCAUAA")  # M P *
        assert result["codons_read"] == 3  # includes the stop codon

    def test_known_protein_sequence(self):
        # ATG GCC ATG GCG → M A M A (before stop or end)
        rna = "AUGGCCAUGGCG"
        result = translate(rna)
        assert result["protein"] == "MAMA"

    def test_length_not_multiple_of_3_raises(self):
        with pytest.raises(ValueError, match="multiple of 3"):
            translate("AUGC")

    def test_full_codon_table_coverage(self):
        """Every codon in CODON_TABLE must be translatable."""
        for codon, aa in CODON_TABLE.items():
            if aa != "*":
                result = translate(codon)
                assert result["protein"] == aa, f"Failed for codon {codon}"

    def test_stop_only_orf(self):
        """An ORF that is just a stop codon produces empty protein."""
        result = translate("UAA")
        assert result["protein"] == ""
        assert result["stop_codon_found"] is True


# ===========================================================================
# run_pipeline() — unit tests
# ===========================================================================

class TestRunPipeline:

    def test_basic_pipeline(self):
        result = run_pipeline("ATGGCC")   # M A
        assert result["dna"] == "ATGGCC"
        assert result["rna"] == "AUGGCC"
        assert result["protein"] == "MA"

    def test_returns_all_keys(self):
        result = run_pipeline("ATGTAA")
        for key in ("dna", "rna", "protein", "stop_codon_found", "stop_codon", "codons_read"):
            assert key in result

    def test_lowercase_dna_accepted(self):
        result = run_pipeline("atggcc")
        assert result["dna"] == "ATGGCC"
        assert result["protein"] == "MA"

    def test_invalid_dna_char_raises(self):
        with pytest.raises(ValueError, match="Invalid character"):
            run_pipeline("ATGX")

    def test_rna_base_u_rejected(self):
        """U is not a valid DNA base — must be rejected."""
        with pytest.raises(ValueError):
            run_pipeline("ATGUGCATG")

    def test_empty_dna_raises(self):
        with pytest.raises(ValueError, match="empty"):
            run_pipeline("")

    def test_length_not_multiple_of_3_raises(self):
        with pytest.raises(ValueError, match="multiple of 3"):
            run_pipeline("ATGC")

    def test_full_orf_with_stop(self):
        # ATG CCG TAA → M P stop
        result = run_pipeline("ATGCCGTAA")
        assert result["protein"] == "MP"
        assert result["stop_codon_found"] is True
        assert result["stop_codon"] == "UAA"


# ===========================================================================
# Integration tests — /api/biology/translate
# ===========================================================================

class TestTranslateAPI:

    def test_basic_success(self, client: TestClient):
        resp = client.post("/api/biology/translate", json={"dna_sequence": "ATGGCC"})
        assert resp.status_code == 200
        body = resp.json()
        assert body["dna"] == "ATGGCC"
        assert body["rna"] == "AUGGCC"
        assert body["protein"] == "MA"

    def test_lowercase_accepted(self, client: TestClient):
        resp = client.post("/api/biology/translate", json={"dna_sequence": "atggcc"})
        assert resp.status_code == 200
        assert resp.json()["protein"] == "MA"

    def test_stop_codon_detected(self, client: TestClient):
        resp = client.post("/api/biology/translate", json={"dna_sequence": "ATGTAA"})
        assert resp.status_code == 200
        body = resp.json()
        assert body["stop_codon_found"] is True
        assert body["stop_codon"] == "UAA"
        assert body["protein"] == "M"

    def test_invalid_char_returns_400(self, client: TestClient):
        resp = client.post("/api/biology/translate", json={"dna_sequence": "ATGXCC"})
        assert resp.status_code == 400
        assert "Invalid character" in resp.json()["detail"]

    def test_rna_u_base_rejected(self, client: TestClient):
        resp = client.post("/api/biology/translate", json={"dna_sequence": "ATGUCCTAA"})
        assert resp.status_code == 400

    def test_not_multiple_of_3_returns_400(self, client: TestClient):
        resp = client.post("/api/biology/translate", json={"dna_sequence": "ATGC"})
        assert resp.status_code == 400
        assert "multiple of 3" in resp.json()["detail"]

    def test_empty_sequence_returns_400(self, client: TestClient):
        resp = client.post("/api/biology/translate", json={"dna_sequence": ""})
        assert resp.status_code == 400

    def test_response_schema(self, client: TestClient):
        resp = client.post("/api/biology/translate", json={"dna_sequence": "ATGGCCTAA"})
        assert resp.status_code == 200
        body = resp.json()
        for key in ("dna", "rna", "protein", "stop_codon_found", "stop_codon", "codons_read"):
            assert key in body
