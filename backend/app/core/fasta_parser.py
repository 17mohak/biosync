"""
core/fasta_parser.py
====================
Pure-Python FASTA parser that handles:
  - Single and multi-record FASTA text
  - Multi-line sequences
  - Inline description fields after the sequence ID
  - Strict nucleic-acid validation (A C G T U only)

Raises ``ValueError`` with a descriptive message on any structural or
character-level problem, so callers can map it cleanly to an HTTP 400.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

# Valid nucleic-acid alphabet (DNA + RNA)
_VALID_NUCLEOTIDE = re.compile(r"^[ACGTU]+$")


@dataclass
class FastaRecord:
    """A single parsed FASTA record."""
    id: str
    description: str            # everything after the first space on the header line
    sequence: str               # concatenated, uppercase, whitespace-stripped
    length: int = field(init=False)

    def __post_init__(self) -> None:
        self.length = len(self.sequence)


def parse_fasta(text: str) -> list[FastaRecord]:
    """
    Parse *text* as FASTA and return a list of :class:`FastaRecord` objects.

    Parameters
    ----------
    text:
        Raw FASTA string. Must contain at least one ``>`` header line.

    Raises
    ------
    ValueError
        - If the text is empty / whitespace-only.
        - If no ``>`` header is found.
        - If a record has an empty sequence body.
        - If a sequence contains characters outside ``[ACGTU]``.

    Examples
    --------
    >>> records = parse_fasta(">seq1 Human gene\\nACGTACGT\\n")
    >>> records[0].id
    'seq1'
    >>> records[0].length
    8
    """
    if not text or not text.strip():
        raise ValueError("Input is empty. Please provide valid FASTA text.")

    # Split on header lines; keep the delimiter so we can reconstruct records
    lines = text.strip().splitlines()

    if not any(line.startswith(">") for line in lines):
        raise ValueError(
            "No FASTA header line found. Each record must begin with '>'."
        )

    records: list[FastaRecord] = []
    current_id: str | None = None
    current_desc: str = ""
    seq_lines: list[str] = []

    def _flush() -> None:
        """Finalise the current record and append it to *records*."""
        if current_id is None:
            return

        raw_seq = "".join(seq_lines).upper().replace(" ", "").replace("\t", "")

        if not raw_seq:
            raise ValueError(
                f"Record '{current_id}' has no sequence data."
            )

        if not _VALID_NUCLEOTIDE.match(raw_seq):
            # Find the first offending character for a helpful error message
            invalid = next(
                (ch for ch in raw_seq if ch not in "ACGTU"), "?"
            )
            raise ValueError(
                f"Record '{current_id}' contains invalid nucleotide character "
                f"'{invalid}'. Only A, C, G, T, U are permitted."
            )

        records.append(
            FastaRecord(
                id=current_id,
                description=current_desc,
                sequence=raw_seq,
            )
        )

    for line in lines:
        line = line.rstrip()

        if line.startswith(">"):
            # Save the previous record before starting a new one
            _flush()
            seq_lines = []

            header = line[1:].strip()   # strip the leading '>'
            if not header:
                raise ValueError(
                    "Found a '>' header line with no sequence identifier."
                )

            # Split ID from optional description
            parts = header.split(None, 1)
            current_id   = parts[0]
            current_desc = parts[1] if len(parts) > 1 else ""

        elif line.startswith(";"):
            # FASTA comment line — skip silently
            continue

        else:
            if current_id is None:
                raise ValueError(
                    "Sequence data found before any '>' header line."
                )
            if line:  # ignore blank lines within a record
                seq_lines.append(line)

    # Flush the last record
    _flush()

    if not records:
        raise ValueError("No valid FASTA records could be parsed from the input.")

    return records
