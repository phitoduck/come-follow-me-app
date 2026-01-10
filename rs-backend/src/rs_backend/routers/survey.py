from datetime import datetime, timezone

from fastapi import APIRouter, Request

from rs_backend.schemas.survey import SurveyResponse, SurveyReport
from rs_backend.services.base import SurveyDataService

router = APIRouter(prefix="/survey", tags=["survey"])


@router.post("/", response_model=dict[str, str])
async def submit_survey(response: SurveyResponse, request: Request) -> dict[str, str]:
    """Submit a survey response."""
    service: SurveyDataService = request.app.state.survey_data_service
    
    datetime_submitted = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    service.save_survey_response(
        datetime_submitted=datetime_submitted,
        q_did_you_set_a_cfm_goal=response.q_did_you_set_a_cfm_goal,
        q_did_you_make_progress_this_week=response.q_did_you_make_progress_this_week,
        organization=response.organization,
    )
    
    return {
        "message": "Survey submitted successfully",
        "status": "ok",
    }


@router.get("/reports", response_model=SurveyReport)
async def get_reports(request: Request) -> SurveyReport:
    """Get survey reports and statistics."""
    service: SurveyDataService = request.app.state.survey_data_service
    return service.get_survey_reports()
