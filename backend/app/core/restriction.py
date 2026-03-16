"""
core/restriction.py
===================
Enzyme restriction mapping engine.

Scans a DNA sequence for recognition sites of selected restriction enzymes
and returns cut positions along with resulting fragment sizes.
"""

from __future__ import annotations


# ---------------------------------------------------------------------------
# Enzyme dictionary: name -> recognition sequence (5' -> 3')
# ---------------------------------------------------------------------------

RESTRICTION_ENZYMES: dict[str, str] = {
    "EcoRI":   "GAATTC",
    "BamHI":   "GGATCC",
    "HindIII": "AAGCTT",
    "TaqI":    "TCGA",
    "NotI":    "GCGGCCGC",
}


def find_cut_sites(
    sequence: str,
    selected_enzymes: list[str],
) -> dict:
    """
    Scan *sequence* for recognition sites of the *selected_enzymes*.

    Parameters
    ----------
    sequence : str
        Raw DNA string (A, C, G, T).  Converted to uppercase internally.
    selected_enzymes : list[str]
        Names of enzymes to scan for (must exist in ``RESTRICTION_ENZYMES``).

    Returns
    -------
    dict
        ``cut_sites``  – list of dicts with ``enzyme_name``,
        ``recognition_sequence``, and ``cut_position`` (0-based index).
        ``fragment_sizes`` – list of ints representing the lengths of DNA
        fragments produced by all cuts combined.
    """
    sequence = sequence.upper().strip()

    cut_sites: list[dict] = []

    for enzyme_name in selected_enzymes:
        # Normalise the lookup key (case-insensitive comparison)
        matched_key = _resolve_enzyme_name(enzyme_name)
        if matched_key is None:
            continue  # silently skip unknown enzymes

        recognition_seq = RESTRICTION_ENZYMES[matched_key]
        start = 0
        while True:
            idx = sequence.find(recognition_seq, start)
            if idx == -1:
                break
            cut_sites.append(
                {
                    "enzyme_name": matched_key,
                    "recognition_sequence": recognition_seq,
                    "cut_position": idx,
                }
            )
            start = idx + 1  # allow overlapping matches

    # Sort by position so fragment calculation is straightforward
    cut_sites.sort(key=lambda c: c["cut_position"])

    # --- Fragment sizes ---------------------------------------------------
    fragment_sizes = _compute_fragment_sizes(len(sequence), cut_sites)

    return {
        "cut_sites": cut_sites,
        "fragment_sizes": fragment_sizes,
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _resolve_enzyme_name(name: str) -> str | None:
    """Return the canonical key from ``RESTRICTION_ENZYMES`` or None."""
    # Exact match first
    if name in RESTRICTION_ENZYMES:
        return name
    # Case-insensitive fallback
    lower = name.lower()
    for key in RESTRICTION_ENZYMES:
        if key.lower() == lower:
            return key
    return None


def _compute_fragment_sizes(
    seq_length: int,
    sorted_cut_sites: list[dict],
) -> list[int]:
    """
    Compute fragment sizes from sorted cut positions.

    The first fragment spans from position 0 to the first cut, and the
    last fragment spans from the last cut to the end of the sequence.
    """
    if not sorted_cut_sites:
        return [seq_length] if seq_length > 0 else []

    positions = [c["cut_position"] for c in sorted_cut_sites]
    # Deduplicate while preserving order
    seen: set[int] = set()
    unique_positions: list[int] = []
    for p in positions:
        if p not in seen:
            seen.add(p)
            unique_positions.append(p)

    fragments: list[int] = []
    prev = 0
    for pos in unique_positions:
        fragments.append(pos - prev)
        prev = pos
    fragments.append(seq_length - prev)

    return fragments
