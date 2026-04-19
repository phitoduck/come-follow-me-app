from datetime import datetime, timezone

from fastapi import APIRouter, Request

from rs_backend.schemas.story import Story, StoryCreate
from rs_backend.services.base import SurveyDataService

router = APIRouter(prefix="/stories", tags=["stories"])


@router.post("/", response_model=Story)
async def post_story(story: StoryCreate, request: Request) -> Story:
    """Post an anonymous story."""
    service: SurveyDataService = request.app.state.survey_data_service
    
    datetime_submitted = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    service.save_story(
        datetime_submitted=datetime_submitted,
        content=story.content,
    )
    
    return Story(
        datetime_submitted=datetime_submitted,
        content=story.content,
    )


@router.get("/", response_model=list[Story])
async def get_stories(request: Request) -> list[Story]:
    """Get all stories."""
    service: SurveyDataService = request.app.state.survey_data_service
    return service.get_stories()
