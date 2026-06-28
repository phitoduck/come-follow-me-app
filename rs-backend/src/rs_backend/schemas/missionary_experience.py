from pydantic import BaseModel, Field

from rs_backend.schemas.enums import Organization


class MissionaryExperienceAnswer(BaseModel):
    """A single 'Did you...' answer selected by the user."""

    question_id: int
    other_text: str | None = None


class MissionaryExperienceRequest(BaseModel):
    """Submission of one or more missionary-experience answers."""

    organization: Organization
    answers: list[MissionaryExperienceAnswer] = Field(default_factory=list)


class MissionaryExperienceReport(BaseModel):
    """Counts of recorded missionary-experience answers grouped by organization."""

    total_answers: int
    counts_by_org: dict[str, int]
