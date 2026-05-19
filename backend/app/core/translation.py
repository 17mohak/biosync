"""
core/translation.py
===================
Biological sequence translation engine:
  DNA  ──transcribe──►  RNA  ──translate──►  Protein (amino-acid sequence)

The standard genetic code (codon table) covers all 64 sense/stop codons.
Stop codons (UAA, UAG, UGA) terminate translation; the stop symbol itself
is NOT appended to the protein string.

Molecular Weight Calculation:
  Average molecular weight per amino acid residue: ~110 Daltons
  This is an approximation used for quick estimates; exact weights vary
  by amino acid type (Glycine: 75 Da, Tryptophan: 204 Da, etc.)

Raises ``ValueError`` with a descriptive message for:
  - Non-DNA characters in the input.
  - Sequence length that is not a multiple of 3 (before translation).
"""

from __future__ import annotations

import re
from typing import Literal

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

# Average molecular weight per amino acid residue (in Daltons)
# This is a commonly used approximation for quick protein mass estimates.
# Exact weights: Gly=75, Ala=89, Ser=105, Pro=115, Val=117, Thr=119,
#                Cys=121, Leu=131, Ile=131, Asn=132, Gln=146, Asp=133,
#                Glu=147, Lys=146, His=155, Phe=165, Arg=174, Tyr=181,
#                Trp=204, Met=149 (weights include water loss from peptide bond)
AVERAGE_AMINO_ACID_WEIGHT_DA = 110.0

# Exact molecular weights for each amino acid (in Daltons)
# These are monoisotopic residue masses (amino acid minus water)
AMINO_ACID_WEIGHTS: dict[str, float] = {
    "A": 89.09,   # Alanine
    "R": 174.20,  # Arginine
    "N": 132.12,  # Asparagine
    "D": 133.10,  # Aspartate
    "C": 121.16,  # Cysteine
    "E": 147.13,  # Glutamate
    "Q": 146.15,  # Glutamine
    "G": 75.07,   # Glycine
    "H": 155.16,  # Histidine
    "I": 131.18,  # Isoleucine
    "L": 131.18,  # Leucine
    "K": 146.19,  # Lysine
    "M": 149.21,  # Methionine
    "F": 165.19,  # Phenylalanine
    "P": 115.13,  # Proline
    "S": 105.09,  # Serine
    "T": 119.12,  # Threonine
    "W": 204.23,  # Tryptophan
    "Y": 181.19,  # Tyrosine
    "V": 117.15,  # Valine
    # Stop codon (*) is not a real amino acid - weight 0
    "*": 0.0,
}


def calculate_molecular_weight(
    protein_sequence: str,
    method: Literal["average", "exact"] = "average"
) -> float:
    """
    Calculate the molecular weight of a protein sequence.

    Parameters
    ----------
    protein_sequence:
        One-letter amino acid sequence (uppercase).
    method:
        'average' - uses 110 Da per residue (quick estimate)
        'exact' - uses exact weights per amino acid type

    Returns
    -------
    Molecular weight in Daltons.
    """
    if not protein_sequence:
        return 0.0

    residue_count = len(protein_sequence)

    if method == "average":
        return residue_count * AVERAGE_AMINO_ACID_WEIGHT_DA

    # Exact calculation
    total_weight = 0.0
    for aa in protein_sequence:
        weight = AMINO_ACID_WEIGHTS.get(aa)
        if weight is None:
            # Unknown amino acid - use average weight
            total_weight += AVERAGE_AMINO_ACID_WEIGHT_DA
        else:
            total_weight += weight

    return total_weight


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


def translate_dna_to_protein(dna: str) -> dict:
    """
    Translate DNA to protein with molecular weight calculation.

    This function is designed for the 3D Protein Viewer feature.
    It handles leftover bases gracefully by truncating to the last
    complete codon, and calculates the molecular weight of the
    resulting protein chain.

    Parameters
    ----------
    dna:
        Raw DNA string (case-insensitive). Any character outside ``[ACGT]``
        will raise a ``ValueError``.

    Returns
    -------
    dict with keys:
        amino_acid_sequence – one-letter amino-acid string
        total_residues      – length of the protein (number of amino acids)
        total_weight_kda    – molecular weight in kilodaltons (kDa)
        stop_codon_found    – bool, True if translation stopped at stop codon
        stop_codon          – str or None
        leftover_bases      – number of bases that didn't form complete codons
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

    # Handle leftover bases - truncate to last complete codon
    original_length = len(dna)
    leftover_bases = original_length % 3
    if leftover_bases > 0:
        dna = dna[:-leftover_bases]

    if len(dna) == 0:
        raise ValueError(
            f"DNA sequence too short ({original_length} bp). "
            "At least 3 bases are required for translation."
        )

    # Transcribe DNA to RNA
    rna = transcribe(dna)

    # Translate RNA to protein
    translation_result = translate(rna)
    protein = translation_result["protein"]

    # Calculate molecular weight (in Daltons, then convert to kDa)
    weight_da = calculate_molecular_weight(protein, method="average")
    weight_kda = weight_da / 1000.0

    return {
        "amino_acid_sequence": protein,
        "total_residues":      len(protein),
        "total_weight_kda":    round(weight_kda, 2),
        "stop_codon_found":    translation_result["stop_codon_found"],
        "stop_codon":          translation_result["stop_codon"],
        "leftover_bases":      leftover_bases,
    }
