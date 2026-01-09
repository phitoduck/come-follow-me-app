from pydantic import BaseModel


class StoryCreate(BaseModel):
    """Request schema for creating a story."""

    content: str


class Story(BaseModel):
    """Response schema for a story."""

    datetime_submitted: str  # Format: YYYY-MM-DD HH:MM:SS UTC
    content: str

