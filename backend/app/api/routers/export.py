"""
api/routers/export.py
=====================
PDF export endpoint:

  GET /api/export/{job_id} — stream a professional PDF report for a saved job
"""

from __future__ import annotations

import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.pdf_export import generate_job_pdf
from app.db.base import get_db
from app.db.models import JobRecord

router = APIRouter(prefix="/api/export", tags=["Export"])


@router.get(
    "/{job_id}",
    summary="Export Job as PDF",
    description=(
        "Generates and streams a professional PDF report for the saved job "
        "identified by ``job_id``. Returns 404 if the job is not found."
    ),
    response_class=StreamingResponse,
    responses={
        200: {"content": {"application/pdf": {}}, "description": "PDF report"},
        404: {"description": "Job not found"},
    },
)
def export_pdf(job_id: int, db: Session = Depends(get_db)) -> StreamingResponse:
    record = db.query(JobRecord).filter(JobRecord.id == job_id).first()
    if record is None:
        raise HTTPException(status_code=404, detail=f"Job #{job_id} not found.")

    try:
        pdf_bytes = generate_job_pdf(record)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(
            status_code=500,
            detail=f"PDF generation failed: {exc}",
        ) from exc

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="job_{job_id}.pdf"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )
