from abc import ABC, abstractmethod

from rs_backend.schemas.enums import Organization
from rs_backend.schemas.missionary_experience import MissionaryExperienceReport
from rs_backend.schemas.survey import MinisteringReport
from rs_backend.schemas.story import Story


class SurveyDataService(ABC):
    """Abstract base class for data persistence services."""

    @abstractmethod
    def save_ministering_event(
        self,
        datetime_submitted: str,
        organization: Organization,
    ) -> None:
        """Save a ministering event to storage."""
        pass

    @abstractmethod
    def get_ministering_reports(self) -> MinisteringReport:
        """Get ministering reports and statistics."""
        pass

    @abstractmethod
    def save_missionary_experience_answer(
        self,
        datetime_submitted: str,
        organization: Organization,
        question_id: int,
        question_text: str,
    ) -> None:
        """Save a single 'Did you...' missionary-experience answer."""
        pass

    @abstractmethod
    def get_missionary_experience_report(self) -> MissionaryExperienceReport:
        """Aggregate missionary-experience answers grouped by organization."""
        pass

    @abstractmethod
    def save_story(self, datetime_submitted: str, content: str) -> None:
        """Save a story to storage."""
        pass

    @abstractmethod
    def get_stories(self) -> list[Story]:
        """Get all stories."""
        pass
