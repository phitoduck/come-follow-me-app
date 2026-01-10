from pydantic import BaseModel

from rs_backend.schemas.enums import Organization, YesNo


class SurveyResponse(BaseModel):
    """Request schema for submitting a survey response."""

    q_did_you_set_a_cfm_goal: YesNo
    q_did_you_make_progress_this_week: YesNo
    organization: Organization


class SurveyReport(BaseModel):
    """Response schema for survey reports."""

    total_responses: int
    organization_breakdown: dict[str, int]
    question_stats: dict[str, dict[str, int]]  # Overall stats: {"q_name": {"yes": count, "no": count}}
    question_stats_by_org: dict[str, dict[str, dict[str, int]]]  # By org: {"q_name": {"org": {"yes": count, "no": count}}}


class SurveyRecord(BaseModel):
    """Schema representing a stored survey record."""

    datetime_submitted: str  # Format: YYYY-MM-DD HH:MM:SS UTC
    q_did_you_set_a_cfm_goal: YesNo
    q_did_you_make_progress_this_week: YesNo
    organization: Organization

