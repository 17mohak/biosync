"""
db/models.py
============
SQLAlchemy ORM models for the Bioinformatics Research Platform.

Single ``JobRecord`` table tracks all job types via a ``job_type`` discriminator.
Input and result payloads are stored as JSON strings — no schema migration needed
when new endpoint types are added.
"""

from __future__ import annotations

import json
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.orm import validates

from app.db.base import Base


class JobRecord(Base):
    """Persisted record of a single API job (alignment, translation, FASTA, etc.)."""

    __tablename__ = "job_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # discriminator: "global" | "local" | "translate" | "fasta" | "stability"
    job_type = Column(String(32), nullable=False, index=True)

    # JSON-serialised dicts – stored as TEXT for maximum SQLite/Postgres portability
    input_data  = Column(Text, nullable=False, default="{}")
    result_data = Column(Text, nullable=False, default="{}")

    # Free-text annotation from the researcher
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # ── helpers ──────────────────────────────────────────────────────────────

    def get_input(self) -> dict:
        """Deserialise ``input_data`` to a Python dict."""
        return json.loads(self.input_data or "{}")

    def get_result(self) -> dict:
        """Deserialise ``result_data`` to a Python dict."""
        return json.loads(self.result_data or "{}")

    @validates("input_data", "result_data")
    def _coerce_to_str(self, key: str, value) -> str:
        """Accept a dict or a str; always persist as a JSON string."""
        if isinstance(value, dict):
            return json.dumps(value)
        return value or "{}"

    def __repr__(self) -> str:
        return f"<JobRecord id={self.id} type={self.job_type} at={self.created_at}>"
