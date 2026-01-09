from datetime import datetime, timezone

from fastapi import APIRouter

from rs_backend.schemas.story import Story, StoryCreate

router = APIRouter(prefix="/stories", tags=["stories"])


@router.post("/", response_model=Story)
async def post_story(story: StoryCreate) -> Story:
    """Post an anonymous story."""
    # TODO: Implement actual story posting logic
    now: datetime = datetime.now(timezone.utc)
    return Story(
        datetime_submitted=now.strftime("%Y-%m-%d %H:%M:%S"),
        content=story.content,
    )


@router.get("/", response_model=list[Story])
async def get_stories() -> list[Story]:
    """Get all stories."""
    # TODO: Implement actual story retrieval logic
    return [
        Story(
            datetime_submitted="2024-01-15 10:30:00",
            content="This is a sample story for testing purposes.",
        ),
        Story(
            datetime_submitted="2024-01-16 14:45:00",
            content="Another sample story to demonstrate the API.",
        ),
    ]
