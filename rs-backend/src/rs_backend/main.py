from fastapi import FastAPI
from fastapi.responses import RedirectResponse

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

    # Redirect root to /docs
    @app.get("/", include_in_schema=False)
    async def root() -> RedirectResponse:
        """Redirect root path to /docs."""
        return RedirectResponse(url="/docs")

    # Include routers
    app.include_router(survey.router)
    app.include_router(stories.router)

    return app


app = create_app()
