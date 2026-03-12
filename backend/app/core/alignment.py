"""
core/alignment.py
=================
Numpy-optimised implementations of:
  - Needleman-Wunsch  (global alignment)
  - Smith-Waterman    (local  alignment)

Both functions are pure (no FastAPI dependency) so they can be unit-tested
independently from the HTTP layer.

Matrix Downsampling:
  For sequences > 100bp, the score matrix is downsampled using max pooling
  to a maximum of 100x100 cells. This preserves visual patterns while
  preventing frontend DOM overflow.
"""

from __future__ import annotations

import numpy as np
from functools import lru_cache


# ---------------------------------------------------------------------------
# Matrix Downsampling (Max Pooling)
# ---------------------------------------------------------------------------

MAX_MATRIX_DIM = 100  # Maximum dimension for compressed matrix


def _downsample_matrix(matrix: np.ndarray, max_dim: int = MAX_MATRIX_DIM) -> np.ndarray:
    """
    Downsample a 2D matrix using max pooling to fit within max_dim x max_dim.
    
    This preserves the visual structure of the alignment matrix while reducing
    the number of cells for efficient frontend rendering.
    
    Parameters
    ----------
    matrix : np.ndarray
        The original score matrix (n+1) × (m+1)
    max_dim : int
        Maximum allowed dimension (default 100)
    
    Returns
    -------
    np.ndarray
        Downsampled matrix with dimensions ≤ max_dim × max_dim
    """
    n_rows, n_cols = matrix.shape
    
    # If already within limits, return as-is
    if n_rows <= max_dim and n_cols <= max_dim:
        return matrix
    
    # Calculate pool sizes for each dimension
    row_pool = max(1, int(np.ceil(n_rows / max_dim)))
    col_pool = max(1, int(np.ceil(n_cols / max_dim)))
    
    # Calculate output dimensions
    out_rows = int(np.ceil(n_rows / row_pool))
    out_cols = int(np.ceil(n_cols / col_pool))
    
    # Create output matrix
    downsampled = np.zeros((out_rows, out_cols), dtype=matrix.dtype)
    
    # Max pooling
    for i in range(out_rows):
        for j in range(out_cols):
            row_start = i * row_pool
            row_end = min((i + 1) * row_pool, n_rows)
            col_start = j * col_pool
            col_end = min((j + 1) * col_pool, n_cols)
            
            # Extract pool region and take maximum
            pool_region = matrix[row_start:row_end, col_start:col_end]
            downsampled[i, j] = np.max(pool_region)
    
    return downsampled


# ---------------------------------------------------------------------------
# Needleman-Wunsch — global alignment
# ---------------------------------------------------------------------------

@lru_cache(maxsize=128)
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
        alignment_1       – gapped version of seq1
        alignment_2       – gapped version of seq2
        optimal_score     – integer score at matrix[n, m]
        score_matrix      – the scoring matrix (downsampled if large)
        matrix_compressed – True if matrix was downsampled
        algorithm         – literal "needleman-wunsch"
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

    # ── Matrix Compression ──────────────────────────────────────────────────
    # For sequences > 100bp, downsample matrix to max 100x100 using max pooling
    if len(seq1) > 100 or len(seq2) > 100:
        compressed_matrix = _downsample_matrix(score)
        score_matrix_out = compressed_matrix.tolist()
        matrix_compressed = True
    else:
        score_matrix_out = score.tolist()
        matrix_compressed = False

    return {
        "alignment_1":       "".join(reversed(align1)),
        "alignment_2":       "".join(reversed(align2)),
        "optimal_score":     int(score[n, m]),
        "score_matrix":      score_matrix_out,
        "matrix_compressed": matrix_compressed,
        "algorithm":         "needleman-wunsch",
    }


# ---------------------------------------------------------------------------
# Smith-Waterman — local alignment
# ---------------------------------------------------------------------------

@lru_cache(maxsize=128)
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
        local_alignment_1  – gapped local segment of seq1
        local_alignment_2  – gapped local segment of seq2
        local_score        – best local alignment score
        score_matrix       – the scoring matrix (downsampled if large)
        matrix_compressed  – True if matrix was downsampled
        algorithm          – literal "smith-waterman"
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

    # ── Matrix Compression ──────────────────────────────────────────────────
    # For sequences > 100bp, downsample matrix to max 100x100 using max pooling
    if len(seq1) > 100 or len(seq2) > 100:
        compressed_matrix = _downsample_matrix(score)
        score_matrix_out = compressed_matrix.tolist()
        matrix_compressed = True
    else:
        score_matrix_out = score.tolist()
        matrix_compressed = False

    return {
        "local_alignment_1": "".join(reversed(align1)),
        "local_alignment_2": "".join(reversed(align2)),
        "local_score":       best_score,
        "score_matrix":      score_matrix_out,
        "matrix_compressed": matrix_compressed,
        "algorithm":         "smith-waterman",
    }
