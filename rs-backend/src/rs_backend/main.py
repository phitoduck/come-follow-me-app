from fastapi import FastAPI, Request
from fastapi.responses import FileResponse

from rs_backend.routers import survey, stories
from rs_backend.settings import Settings
from rs_backend.services.csv_service import CSVService


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = Settings()

    app = FastAPI(
        title=settings.app_name,
        description="Backend API for RS survey and stories",
        version="0.1.0",
    )

    # Initialize CSV files if using CSV service
    if settings.use_csv_service:
        CSVService.init(data_dir=settings.csv_data_dir)

    # Include routers first (so API routes and /docs work)
    app.include_router(survey.router)
    app.include_router(stories.router)

    # Serve static files - use catch-all route for SPA
    @app.get("/{path:path}", include_in_schema=False)
    async def serve_static(path: str, request: Request):
        """Serve static files and SPA index.html for non-API routes."""
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
