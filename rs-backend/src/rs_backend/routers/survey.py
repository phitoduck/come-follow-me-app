from datetime import datetime, timezone

from fastapi import APIRouter, Request

from rs_backend.schemas.survey import MinisteringEventRequest, MinisteringReport
from rs_backend.services.base import SurveyDataService

router = APIRouter(prefix="/ministering", tags=["ministering"])


@router.post("/", response_model=dict[str, str])
async def submit_ministering_event(event: MinisteringEventRequest, request: Request) -> dict[str, str]:
    """Submit a ministering event."""
    service: SurveyDataService = request.app.state.survey_data_service

    datetime_submitted = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    service.save_ministering_event(
        datetime_submitted=datetime_submitted,
        organization=event.organization,
    )

    return {
        "message": "Ministering event recorded",
        "status": "ok",
    }


@router.get("/reports", response_model=MinisteringReport)
async def get_reports(request: Request) -> MinisteringReport:
    """Get ministering reports and statistics."""
    service: SurveyDataService = request.app.state.survey_data_service
    return service.get_ministering_reports()
