"""
tests/test_ncbi.py
==================
Tests for the NCBI E-utilities integration.
"""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.__init__ import create_app
from app.core.ncbi_client import fetch_fasta_from_ncbi

app = create_app()


@pytest.fixture(autouse=True)
def bypass_alru_cache():
    """
    Bypass the alru_cache decorator during testing.
    This prevents 'RuntimeError: alru_cache is not safe to use across event loops'.
    
    We patch both the source module (where the function is defined) and the 
    router module (where it's imported and used) to ensure the unwrapped 
    function is always called.
    """
    # Clear any existing cache to avoid cross-test contamination
    fetch_fasta_from_ncbi.cache_clear()
    
    # Patch at both locations to ensure the cache is bypassed
    # 1. Patch at the source (app.core.ncbi_client) - where @alru_cache is applied
    # 2. Patch at the router (app.api.routers.ncbi) - where it's imported
    with patch('app.core.ncbi_client.fetch_fasta_from_ncbi', fetch_fasta_from_ncbi.__wrapped__):
        with patch('app.api.routers.ncbi.fetch_fasta_from_ncbi', fetch_fasta_from_ncbi.__wrapped__):
            yield
    
    # Clear cache after test to prevent issues with subsequent tests
    fetch_fasta_from_ncbi.cache_clear()


@pytest.mark.asyncio
async def test_fetch_fasta_from_ncbi_success():
    """Test the core client function with a known small accession ID."""
    accession_id = "NM_001302135.1"
    # Call the unwrapped function directly for the async test
    fasta_text = await fetch_fasta_from_ncbi.__wrapped__(accession_id)
    
    # Verify it looks like a FASTA file
    assert fasta_text.startswith(">")
    assert accession_id in fasta_text
    assert len(fasta_text) > 50


def test_fetch_ncbi_sequence_endpoint():
    """Test the API endpoint for NCBI fetching."""
    accession_id = "NM_001302135.1"
    with TestClient(app) as client:
        response = client.get(f"/api/ncbi/fetch/{accession_id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["accession_id"] == accession_id
    assert "fasta_text" in data
    assert data["fasta_text"].startswith(">")


def test_fetch_ncbi_sequence_invalid():
    """Test the API endpoint with an invalid ID to ensure proper error handling."""
    accession_id = "INVALID_ID_12345"
    with TestClient(app) as client:
        response = client.get(f"/api/ncbi/fetch/{accession_id}")
    
    # Should realistically return a 404 or 502 depending on NCBI's response
    assert response.status_code in (404, 502)
