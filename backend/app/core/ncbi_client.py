"""
app/core/ncbi_client.py
=======================
Client for interacting with the NCBI E-utilities API.
"""

from __future__ import annotations

import httpx
from fastapi import HTTPException
from async_lru import alru_cache


@alru_cache(maxsize=128)
async def fetch_fasta_from_ncbi(accession_id: str) -> str:
    """
    Fetch a nucleotide sequence in FASTA format from the NCBI E-utilities API.

    Parameters
    ----------
    accession_id : str
        The NCBI accession ID (e.g., "NM_001302135.1") to fetch.

    Returns
    -------
    str
        The raw FASTA text for the requested record.

    Raises
    ------
    HTTPException
        If the sequence is not found or the NCBI API times out/fails.
    """
    url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
    params = {
        "db": "nuccore",
        "id": accession_id,
        "rettype": "fasta",
        "retmode": "text",
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10.0)
            
            # NCBI efetch returns 400 for bad requests (e.g., invalid ID format)
            # or 200 with an empty/error body sometimes. We check if the body
            # looks like a valid FASTA starting with '>'.
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail=f"NCBI API responded with status {response.status_code}")
                
            text = response.text.strip()
            
            if not text or "Error" in text or not text.startswith(">"):
                raise HTTPException(status_code=404, detail=f"Sequence '{accession_id}' not found at NCBI.")
                
            return text
            
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Error communicating with NCBI: {str(exc)}")
