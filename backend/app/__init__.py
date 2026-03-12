"""
app/__init__.py
===============
Application factory.  Import ``create_app`` and call it to get a fully
configured FastAPI instance with CORS and all routers registered.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import alignment, analyze, biology, export, fasta, history, ncbi
from app.db.base import init_db


def create_app() -> FastAPI:
    """
    Construct and return the FastAPI application.

    Separating construction from the module-level ``app`` variable lets us
    instantiate fresh application objects inside tests without side-effects.
    """
    application = FastAPI(
        title="Bioinformatics Research Platform",
        description=(
            "A high-performance API for nucleic-acid sequence alignment, "
            "biological translation (DNA → RNA → Protein), FASTA parsing, "
            "ML-based mutation stability analysis, persistent job history, "
            "and professional PDF export."
        ),
        version="3.0.0",
        contact={
            "name": "Bioinformatics Engine",
        },
        license_info={
            "name": "MIT",
        },
    )

    @application.on_event("startup")
    def on_startup() -> None:
        init_db()

    # ── CORS ────────────────────────────────────────────────────────────────
    # Permit the Next.js frontend running on port 3000.
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ─────────────────────────────────────────────────────────────
    application.include_router(alignment.router)
    application.include_router(biology.router)
    application.include_router(fasta.router)
    application.include_router(history.router)
    application.include_router(analyze.router)
    application.include_router(export.router)
    application.include_router(ncbi.router)

    # ── Root health-check ───────────────────────────────────────────────────
    @application.get("/", tags=["Health"])
    def health_check() -> dict:
        return {
            "status": "Bioinformatics Research Platform Active",
            "version": "3.0.0",
            "endpoints": [
                "/api/align/global",
                "/api/align/local",
                "/api/biology/translate",
                "/api/fasta/parse",
                "/api/history/save",
                "/api/history",
                "/api/analyze/stability",
                "/api/export/{job_id}",
                "/api/ncbi/fetch/{accession_id}",
            ],
        }

    return application
