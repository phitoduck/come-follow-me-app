from abc import ABC, abstractmethod

from rs_backend.schemas.enums import Organization, YesNo
from rs_backend.schemas.survey import SurveyReport
from rs_backend.schemas.story import Story


class BaseService(ABC):
    """Abstract base class for data persistence services."""

    @abstractmethod
    def save_survey_response(
        self,
        datetime_submitted: str,
        q_did_you_set_a_cfm_goal: YesNo,
        q_did_you_make_progress_this_week: YesNo,
        organization: Organization,
    ) -> None:
        """Save a survey response to storage."""
        pass

    @abstractmethod
    def get_survey_reports(self) -> SurveyReport:
        """Get survey reports and statistics."""
        pass

    @abstractmethod
    def save_story(self, datetime_submitted: str, content: str) -> None:
        """Save a story to storage."""
        pass

    @abstractmethod
    def get_stories(self) -> list[Story]:
        """Get all stories."""
        pass
