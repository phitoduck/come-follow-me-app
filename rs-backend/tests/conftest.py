import tempfile
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from rs_backend.main import create_app
from rs_backend.services.csv_service import CSVService
from rs_backend.services.base import SurveyDataService


@pytest.fixture
def temp_data_dir() -> Path:
    """Create a temporary directory for test data."""
    tmpdir = Path(tempfile.mkdtemp())
    yield tmpdir
    # Cleanup after test
    shutil.rmtree(tmpdir, ignore_errors=True)


@pytest.fixture
def client(temp_data_dir: Path) -> TestClient:
    """Create a test client for the FastAPI application with temporary data directory."""
    # Create app
    app = create_app()
    
    # Override the service to use temp directory
    CSVService.init(data_dir=temp_data_dir)
    service: SurveyDataService = CSVService(data_dir=temp_data_dir)
    app.state.survey_data_service = service
    
    return TestClient(app=app)
