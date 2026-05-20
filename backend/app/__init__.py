"""
app/__init__.py
===============
Application factory.  Import ``create_app`` and call it to get a fully
configured FastAPI instance with CORS and all routers registered.
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.api.routers import alignment, analyze, analytics, auth, biology, export, fasta, history, ncbi, protein, restriction
from app.db.base import init_db


def _seed_default_user() -> None:
    """Create default admin user if no users exist."""
    from app.db.base import SessionLocal
    from app.db.models import User
    import hashlib
    
    db = SessionLocal()
    try:
        # Check if any users exist
        existing = db.query(User).first()
        if not existing:
            # Create default user
            default_user = User(
                email="admin@atlasuniversity.edu.in",
                hashed_password=hashlib.sha256("password".encode()).hexdigest(),
                is_active=True
            )
            db.add(default_user)
            db.commit()
            print(f"✅ Default user created: admin@atlasuniversity.edu.in / password")
    except Exception as e:
        print(f"⚠️  Could not seed default user: {e}")
        db.rollback()
    finally:
        db.close()


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
        # Seed default user if no users exist
        _seed_default_user()

    # ── CORS ────────────────────────────────────────────────────────────────
    # Permit the Next.js frontend running on port 3000.
    # MUST be first middleware to handle OPTIONS preflight before auth
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "https://*.vercel.app",  # Matches all preview deployments
        ],
        allow_origin_regex="https://biosync-.*\\.vercel\\.app", # Hardens specific project namespaces
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Fallback OPTIONS handler ────────────────────────────────────────────
    # Ensures ALL routes respond to OPTIONS for CORS preflight
    @application.options("/{full_path:path}")
    async def options_handler(request: Request):
        return Response(status_code=200)

    # ── Routers ─────────────────────────────────────────────────────────────
    application.include_router(auth.router)
    application.include_router(alignment.router)
    application.include_router(biology.router)
    application.include_router(fasta.router)
    application.include_router(history.router)
    application.include_router(analyze.router)
    application.include_router(analytics.router)
    application.include_router(export.router)
    application.include_router(ncbi.router)
    application.include_router(protein.router)
    application.include_router(restriction.router)

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
                "/api/protein/translate",
                "/api/fasta/parse",
                "/api/history/save",
                "/api/history",
                "/api/analyze/stability",
                "/api/analytics/profile",
                "/api/export/{job_id}",
                "/api/ncbi/fetch/{accession_id}",
                "/api/restriction/map",
            ],
        }

    # ── Explicit health endpoint for CORS testing ───────────────────────────
    @application.get("/health", tags=["Health"])
    def health_endpoint() -> dict:
        return {"status": "ok"}

    return application
