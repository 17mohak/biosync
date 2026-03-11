"""
db/base.py
==========
SQLAlchemy engine, session factory, declarative base, and init helper.

Database URL defaults to SQLite.  Override by setting the environment variable
``DATABASE_URL`` to a valid SQLAlchemy connection string, e.g.:
    postgresql+psycopg2://user:pass@localhost/bioapi
"""

from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "sqlite:///./bioapi.db",
)

# SQLite-specific: allow the same connection to be used in multiple threads
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db() -> None:
    """Create all tables that don't already exist."""
    from app.db import models  # noqa: F401  — ensure models are imported before create_all
    Base.metadata.create_all(bind=engine)


def get_db():
    """
    FastAPI dependency that yields a database session and guarantees
    it is closed after the request, even if an exception occurs.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
