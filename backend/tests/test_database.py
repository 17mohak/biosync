"""
tests/test_database.py
======================
Test suite for SQLAlchemy DB operations and the History endpoints.
Uses an in-memory SQLite database isolated from the main DB.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import create_app
from app.db.base import Base, get_db
from app.db.models import JobRecord

# ── Isolated Test Database ──────────────────────────────────────────────────
engine = create_engine(
    "sqlite://",   # in-memory
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

test_app = create_app()
test_app.dependency_overrides[get_db] = override_get_db

client = TestClient(test_app)


@pytest.fixture(autouse=True)
def clean_db():
    """Wipe and recreate tables before every test execution."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


# ===========================================================================
# ORM / Model Tests
# ===========================================================================

class TestDatabaseModels:

    def test_create_job_record(self):
        db = TestingSessionLocal()
        record = JobRecord(job_type="global", notes="Test node")
        db.add(record)
        db.commit()
        db.refresh(record)

        assert record.id is not None
        assert record.job_type == "global"
        assert record.notes == "Test node"
        db.close()

    def test_job_type_field_stored(self):
        db = TestingSessionLocal()
        record = JobRecord(job_type="translate")
        db.add(record)
        db.commit()
        
        fetched = db.query(JobRecord).filter_by(job_type="translate").first()
        assert fetched is not None
        assert fetched.job_type == "translate"
        db.close()

    def test_input_data_json_roundtrip(self):
        db = TestingSessionLocal()
        payload = {"sequence": "ACGT", "params": {"gap": -2}}
        
        # Pass a raw dict; the validator handles serialisation
        record = JobRecord(job_type="fasta", input_data=payload)
        db.add(record)
        db.commit()
        db.refresh(record)

        assert isinstance(record.input_data, str)
        assert record.get_input() == payload
        db.close()

    def test_result_data_json_roundtrip(self):
        db = TestingSessionLocal()
        result_payload = {"optimal_score": 42, "alignment": "A-CGT"}
        
        record = JobRecord(job_type="global", result_data=result_payload)
        db.add(record)
        db.commit()

        assert record.get_result()["optimal_score"] == 42
        db.close()

    def test_created_at_auto_set(self):
        db = TestingSessionLocal()
        record = JobRecord(job_type="local")
        db.add(record)
        db.commit()
        
        assert record.created_at is not None
        db.close()


# ===========================================================================
# History API Endpoints
# ===========================================================================

class TestHistoryEndpoints:

    def _seed_db(self, n=5, jtype="global") -> list[int]:
        db = TestingSessionLocal()
        ids = []
        for i in range(n):
            record = JobRecord(job_type=jtype, result_data={"score": i})
            db.add(record)
            db.commit()
            ids.append(record.id)
        db.close()
        return ids

    def test_save_endpoint_returns_201(self):
        payload = {
            "job_type": "global",
            "input_data": {"seq": "A"},
            "result_data": {"score": 1},
            "notes": "Good run"
        }
        resp = client.post("/api/history/save", json=payload)
        assert resp.status_code == 201
        
        data = resp.json()
        assert "id" in data
        assert data["job_type"] == "global"
        assert data["notes"] == "Good run"
        assert data["input_data"] == {"seq": "A"}

    def test_save_endpoint_missing_fields_returns_422(self):
        # job_type is required
        resp = client.post("/api/history/save", json={"notes": "missing type"})
        assert resp.status_code == 422

    def test_history_endpoint_returns_list(self):
        self._seed_db(3, "global")
        resp = client.get("/api/history")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 3
        assert len(data["records"]) == 3

    def test_history_filter_by_job_type(self):
        self._seed_db(2, "global")
        self._seed_db(4, "translate")
        
        resp = client.get("/api/history?job_type=translate")
        assert resp.status_code == 200
        assert resp.json()["total"] == 4
        
        for rec in resp.json()["records"]:
            assert rec["job_type"] == "translate"

    def test_history_limit_param(self):
        self._seed_db(10, "global")
        resp = client.get("/api/history?limit=3")
        assert resp.status_code == 200
        assert len(resp.json()["records"]) == 3

    def test_history_single_record_endpoint(self):
        ids = self._seed_db(1, "fasta")
        target_id = ids[0]
        
        resp = client.get(f"/api/history/{target_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == target_id
        assert resp.json()["job_type"] == "fasta"

    def test_history_not_found_returns_404(self):
        resp = client.get("/api/history/999999")
        assert resp.status_code == 404
