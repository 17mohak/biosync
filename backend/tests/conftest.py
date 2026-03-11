"""
tests/conftest.py
=================
Shared pytest fixtures.
"""

import pytest
from fastapi.testclient import TestClient

from app import create_app


@pytest.fixture(scope="session")
def client() -> TestClient:
    """A single TestClient shared across the entire test session."""
    return TestClient(create_app())
