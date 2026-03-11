"""
core/alignment.py
=================
Numpy-optimised implementations of:
  - Needleman-Wunsch  (global alignment)
  - Smith-Waterman    (local  alignment)

Both functions are pure (no FastAPI dependency) so they can be unit-tested
independently from the HTTP layer.
"""

from __future__ import annotations

import numpy as np


# ---------------------------------------------------------------------------
# Needleman-Wunsch — global alignment
# ---------------------------------------------------------------------------

def needleman_wunsch(
    seq1: str,
    seq2: str,
    match: int = 1,
    mismatch: int = -1,
    gap: int = -2,
) -> dict:
    """
    Align *seq1* and *seq2* globally using the Needleman-Wunsch algorithm.

    Returns
    -------
    dict with keys:
        alignment_1   – gapped version of seq1
        alignment_2   – gapped version of seq2
        optimal_score – integer score at matrix[n, m]
        score_matrix  – the full (n+1) × (m+1) numpy array (as nested lists)
        algorithm     – literal "needleman-wunsch"
    """
    n, m = len(seq1), len(seq2)

    # ── Build scoring matrix ────────────────────────────────────────────────
    score = np.zeros((n + 1, m + 1), dtype=np.int64)

    # Initialise first row and column with gap penalties
    score[:, 0] = np.arange(n + 1) * gap
    score[0, :] = np.arange(m + 1) * gap

    # Fill row-by-row
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            diag = score[i - 1, j - 1] + (match if seq1[i - 1] == seq2[j - 1] else mismatch)
            up   = score[i - 1, j] + gap
            left = score[i, j - 1] + gap
            score[i, j] = max(diag, up, left)

    # ── Traceback ───────────────────────────────────────────────────────────
    align1, align2 = [], []
    i, j = n, m

    while i > 0 and j > 0:
        s = score[i, j]
        diag_score = match if seq1[i - 1] == seq2[j - 1] else mismatch

        if s == score[i - 1, j - 1] + diag_score:
            align1.append(seq1[i - 1])
            align2.append(seq2[j - 1])
            i -= 1; j -= 1
        elif s == score[i - 1, j] + gap:
            align1.append(seq1[i - 1])
            align2.append("-")
            i -= 1
        else:
            align1.append("-")
            align2.append(seq2[j - 1])
            j -= 1

    # Consume any remaining bases
    while i > 0:
        align1.append(seq1[i - 1]); align2.append("-"); i -= 1
    while j > 0:
        align1.append("-"); align2.append(seq2[j - 1]); j -= 1

    return {
        "alignment_1":   "".join(reversed(align1)),
        "alignment_2":   "".join(reversed(align2)),
        "optimal_score": int(score[n, m]),
        "score_matrix":  score.tolist(),
        "algorithm":     "needleman-wunsch",
    }


# ---------------------------------------------------------------------------
# Smith-Waterman — local alignment
# ---------------------------------------------------------------------------

def smith_waterman(
    seq1: str,
    seq2: str,
    match: int = 1,
    mismatch: int = -1,
    gap: int = -2,
) -> dict:
    """
    Align *seq1* and *seq2* locally using the Smith-Waterman algorithm.

    The key difference from NW is:
      - All negative scores are clamped to 0.
      - Traceback begins at the cell with the maximum value and ends when a
        0 is reached (no forced extension to sequence ends).

    Returns
    -------
    dict with keys:
        local_alignment_1 – gapped local segment of seq1
        local_alignment_2 – gapped local segment of seq2
        local_score       – best local alignment score
        score_matrix      – the full (n+1) × (m+1) numpy array (as nested lists)
        algorithm         – literal "smith-waterman"
    """
    n, m = len(seq1), len(seq2)

    # ── Build scoring matrix (floor at 0) ───────────────────────────────────
    score = np.zeros((n + 1, m + 1), dtype=np.int64)

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            diag = score[i - 1, j - 1] + (match if seq1[i - 1] == seq2[j - 1] else mismatch)
            up   = score[i - 1, j] + gap
            left = score[i, j - 1] + gap
            score[i, j] = max(0, diag, up, left)

    # ── Traceback from the maximum cell ─────────────────────────────────────
    max_idx = np.unravel_index(np.argmax(score), score.shape)
    best_score = int(score[max_idx])

    align1, align2 = [], []
    i, j = int(max_idx[0]), int(max_idx[1])

    while i > 0 and j > 0 and score[i, j] != 0:
        s = score[i, j]
        diag_score = match if seq1[i - 1] == seq2[j - 1] else mismatch

        if s == score[i - 1, j - 1] + diag_score:
            align1.append(seq1[i - 1])
            align2.append(seq2[j - 1])
            i -= 1; j -= 1
        elif s == score[i - 1, j] + gap:
            align1.append(seq1[i - 1])
            align2.append("-")
            i -= 1
        else:
            align1.append("-")
            align2.append(seq2[j - 1])
            j -= 1

    return {
        "local_alignment_1": "".join(reversed(align1)),
        "local_alignment_2": "".join(reversed(align2)),
        "local_score":       best_score,
        "score_matrix":      score.tolist(),
        "algorithm":         "smith-waterman",
    }
