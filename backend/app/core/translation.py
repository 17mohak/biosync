"""
core/translation.py
===================
Biological sequence translation engine:
  DNA  ──transcribe──►  RNA  ──translate──►  Protein (amino-acid sequence)

The standard genetic code (codon table) covers all 64 sense/stop codons.
Stop codons (UAA, UAG, UGA) terminate translation; the stop symbol itself
is NOT appended to the protein string.

Raises ``ValueError`` with a descriptive message for:
  - Non-DNA characters in the input.
  - Sequence length that is not a multiple of 3 (before translation).
"""

from __future__ import annotations

import re

_VALID_DNA = re.compile(r"^[ACGT]+$")

# Full standard genetic code — 64 codons
CODON_TABLE: dict[str, str] = {
    # Phenylalanine
    "UUU": "F", "UUC": "F",
    # Leucine
    "UUA": "L", "UUG": "L",
    "CUU": "L", "CUC": "L", "CUA": "L", "CUG": "L",
    # Isoleucine
    "AUU": "I", "AUC": "I", "AUA": "I",
    # Methionine / Start
    "AUG": "M",
    # Valine
    "GUU": "V", "GUC": "V", "GUA": "V", "GUG": "V",
    # Serine
    "UCU": "S", "UCC": "S", "UCA": "S", "UCG": "S",
    "AGU": "S", "AGC": "S",
    # Proline
    "CCU": "P", "CCC": "P", "CCA": "P", "CCG": "P",
    # Threonine
    "ACU": "T", "ACC": "T", "ACA": "T", "ACG": "T",
    # Alanine
    "GCU": "A", "GCC": "A", "GCA": "A", "GCG": "A",
    # Tyrosine
    "UAU": "Y", "UAC": "Y",
    # Stop codons
    "UAA": "*", "UAG": "*", "UGA": "*",
    # Histidine
    "CAU": "H", "CAC": "H",
    # Glutamine
    "CAA": "Q", "CAG": "Q",
    # Asparagine
    "AAU": "N", "AAC": "N",
    # Lysine
    "AAA": "K", "AAG": "K",
    # Aspartate
    "GAU": "D", "GAC": "D",
    # Glutamate
    "GAA": "E", "GAG": "E",
    # Cysteine
    "UGU": "C", "UGC": "C",
    # Tryptophan
    "UGG": "W",
    # Arginine
    "CGU": "R", "CGC": "R", "CGA": "R", "CGG": "R",
    "AGA": "R", "AGG": "R",
    # Glycine
    "GGU": "G", "GGC": "G", "GGA": "G", "GGG": "G",
}

_STOP_CODONS = {"UAA", "UAG", "UGA"}


def transcribe(dna: str) -> str:
    """
    Transcribe a DNA sequence to RNA by replacing every ``T`` with ``U``.

    Parameters
    ----------
    dna:
        Uppercase DNA string (A, C, G, T only — already validated upstream).

    Returns
    -------
    Uppercase RNA string.
    """
    return dna.replace("T", "U")


def translate(rna: str) -> dict:
    """
    Translate an RNA string into an amino-acid sequence.

    Reads codons in non-overlapping triplets starting at position 0.
    Translation stops at the first stop codon (UAA, UAG, UGA); if no stop
    codon is found the entire ORF is translated.

    Parameters
    ----------
    rna:
        Uppercase RNA string whose length must be a multiple of 3.

    Returns
    -------
    dict with keys:
        protein           – one-letter amino-acid string (stop codon excluded)
        stop_codon_found  – True if a stop codon terminated the ORF
        stop_codon        – the stop codon string, or None
        codons_read       – number of codons consumed (including the stop)

    Raises
    ------
    ValueError
        If the RNA length is not a multiple of 3.
    """
    if len(rna) % 3 != 0:
        raise ValueError(
            f"RNA sequence length ({len(rna)}) is not a multiple of 3. "
            "Cannot form complete codons. Please provide a sequence whose "
            "length is divisible by 3."
        )

    protein_parts: list[str] = []
    stop_found = False
    stop_codon_str: str | None = None
    codons_read = 0

    for i in range(0, len(rna), 3):
        codon = rna[i : i + 3]
        codons_read += 1

        if codon in _STOP_CODONS:
            stop_found = True
            stop_codon_str = codon
            break

        amino = CODON_TABLE.get(codon)
        if amino is None:
            raise ValueError(f"Unknown codon '{codon}' encountered at position {i}.")

        protein_parts.append(amino)

    return {
        "protein":          "".join(protein_parts),
        "stop_codon_found": stop_found,
        "stop_codon":       stop_codon_str,
        "codons_read":      codons_read,
    }


def run_pipeline(dna: str) -> dict:
    """
    Full pipeline: validate DNA → transcribe → translate.

    Parameters
    ----------
    dna:
        Raw DNA string (case-insensitive). Any character outside ``[ACGT]``
        will raise a ``ValueError``.

    Returns
    -------
    dict with keys:
        dna               – normalised (uppercase) input
        rna               – transcribed RNA
        protein           – translated amino-acid sequence
        stop_codon_found  – bool
        stop_codon        – str or None
        codons_read       – int
    """
    dna = dna.upper().strip()

    if not dna:
        raise ValueError("DNA sequence cannot be empty.")

    if not _VALID_DNA.match(dna):
        invalid = next((ch for ch in dna if ch not in "ACGT"), "?")
        raise ValueError(
            f"Invalid character '{invalid}' in DNA sequence. "
            "Only A, C, G, T are permitted for translation."
        )

    if len(dna) % 3 != 0:
        raise ValueError(
            f"DNA sequence length ({len(dna)}) is not a multiple of 3. "
            "Cannot form complete codons."
        )

    rna = transcribe(dna)
    result = translate(rna)

    return {
        "dna":              dna,
        "rna":              rna,
        "protein":          result["protein"],
        "stop_codon_found": result["stop_codon_found"],
        "stop_codon":       result["stop_codon"],
        "codons_read":      result["codons_read"],
    }
