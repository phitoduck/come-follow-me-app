from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from loguru import logger

import rs_backend.logger  # noqa: F401  # Import to configure logger
from rs_backend.routers import survey, stories
from rs_backend.settings import Settings
from rs_backend.services.base import SurveyDataService
from rs_backend.services.csv_service import CSVService
from rs_backend.services.sheets_service import SheetsService


async def log_request_middleware(request: Request, call_next):
    """Middleware to log all incoming requests."""
    from uuid import uuid4

    request_id = str(uuid4())
    with logger.contextualize(
        request_id=request_id,
        method=request.method,
        path=request.url.path,
    ):
        logger.info(f"Request {request.method} {request.url.path}")
        response = await call_next(request)
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    settings: Settings = app.state.settings

    # Startup: Log settings (secrets will be automatically masked by SecretStr)
    logger.info("Application settings", settings=settings.model_dump())

    # Startup: Create and store the data service instance
    if settings.use_csv_service:
        CSVService.init(data_dir=settings.csv_data_dir)
        service: SurveyDataService = CSVService(data_dir=settings.csv_data_dir)
        logger.info("Using CSVService for data storage")
    else:
        credentials_path_str = (
            settings.google_sheets_credentials_path.get_secret_value()
            if settings.google_sheets_credentials_path is not None
            else None
        )
        # Validate credentials and spreadsheet before creating instance
        SheetsService.init(
            credentials_path=credentials_path_str,
            spreadsheet_id=settings.google_sheets_spreadsheet_id,
        )
        service = SheetsService(
            credentials_path=credentials_path_str,
            spreadsheet_id=settings.google_sheets_spreadsheet_id,
        )
        logger.info("Using SheetsService for data storage")

    # Store service in app.state for access in routes
    app.state.survey_data_service = service

    logger.info("Application initialized successfully")

    yield

    # Shutdown: Cleanup code would go here if needed
    # For now, we don't need any cleanup


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = Settings()

    app = FastAPI(
        title=settings.app_name,
        description="Backend API for RS survey and stories",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Store settings in app.state for access in routes and lifespan
    app.state.settings = settings

    # Register request logging middleware
    app.middleware("http")(log_request_middleware)

    # Include routers first (so API routes and /docs work)
    app.include_router(survey.router)
    app.include_router(stories.router)

    # Serve static files - use catch-all route for SPA
    @app.get("/{path:path}", include_in_schema=False)
    async def serve_static(path: str, request: Request):
        """Serve static files and SPA index.html for non-API routes."""
        settings: Settings = app.state.settings

        # Skip API routes and docs
        if (
            path.startswith("api/")
            or path.startswith("docs")
            or path.startswith("openapi.json")
            or path.startswith("redoc")
            or path.startswith("survey")
            or path.startswith("stories")
        ):
            from fastapi import HTTPException
            raise HTTPException(status_code=404)

        # For root path (empty string), serve index.html
        if path == "":
            index_path = settings.static_dir / "index.html"
            if index_path.exists():
                return FileResponse(str(index_path))
            from fastapi import HTTPException
            raise HTTPException(status_code=404)

        # Try to serve the requested file
        file_path = settings.static_dir / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))

        # For SPA routing, serve index.html for any path that doesn't match a file
        index_path = settings.static_dir / "index.html"
        if index_path.exists():
            return FileResponse(str(index_path))

        from fastapi import HTTPException
        raise HTTPException(status_code=404)

    return app


app = create_app()
