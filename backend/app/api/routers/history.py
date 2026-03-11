"""
api/routers/history.py
======================
Endpoints for persisting and retrieving job history.

  POST /api/history/save       — store a completed job result
  GET  /api/history            — list all records (filterable, paginated)
  GET  /api/history/{job_id}   — fetch a single record by ID
"""

from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models import JobRecord
from app.models.schemas import (
    HistoryResponse,
    JobRecordOut,
    SaveJobRequest,
)

router = APIRouter(prefix="/api/history", tags=["History"])


# ---------------------------------------------------------------------------
# POST /api/history/save
# ---------------------------------------------------------------------------

@router.post(
    "/save",
    response_model=JobRecordOut,
    status_code=201,
    summary="Save a Job Result",
    description=(
        "Persist an alignment, translation, or FASTA parse result to the database. "
        "``input_data`` and ``result_data`` accept any JSON-serialisable dict."
    ),
)
def save_job(data: SaveJobRequest, db: Session = Depends(get_db)) -> JobRecordOut:
    record = JobRecord(
        job_type=data.job_type,
        input_data=json.dumps(data.input_data),
        result_data=json.dumps(data.result_data),
        notes=data.notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _to_out(record)


# ---------------------------------------------------------------------------
# GET /api/history
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=HistoryResponse,
    summary="List Job History",
    description=(
        "Retrieve previous job runs, newest first. "
        "Optionally filter by ``job_type`` and cap results with ``limit``."
    ),
)
def list_history(
    job_type: Optional[str] = Query(None, description="Filter by job type"),
    limit: int = Query(50, ge=1, le=500, description="Maximum records to return"),
    db: Session = Depends(get_db),
) -> HistoryResponse:
    q = db.query(JobRecord).order_by(JobRecord.created_at.desc())
    if job_type:
        q = q.filter(JobRecord.job_type == job_type)
    records = q.limit(limit).all()
    return HistoryResponse(
        total=len(records),
        records=[_to_out(r) for r in records],
    )


# ---------------------------------------------------------------------------
# GET /api/history/{job_id}
# ---------------------------------------------------------------------------

@router.get(
    "/{job_id}",
    response_model=JobRecordOut,
    summary="Get a Single Job Record",
)
def get_job(job_id: int, db: Session = Depends(get_db)) -> JobRecordOut:
    record = db.query(JobRecord).filter(JobRecord.id == job_id).first()
    if record is None:
        raise HTTPException(status_code=404, detail=f"Job #{job_id} not found.")
    return _to_out(record)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _to_out(record: JobRecord) -> JobRecordOut:
    return JobRecordOut(
        id=record.id,
        job_type=record.job_type,
        input_data=record.get_input(),
        result_data=record.get_result(),
        notes=record.notes,
        created_at=record.created_at,
    )
