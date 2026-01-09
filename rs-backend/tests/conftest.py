import pytest
from fastapi.testclient import TestClient

from rs_backend.main import create_app


@pytest.fixture
def client() -> TestClient:
    """Create a test client for the FastAPI application."""
    app = create_app()
    return TestClient(app=app)
