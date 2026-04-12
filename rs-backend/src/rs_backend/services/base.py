from abc import ABC, abstractmethod

from rs_backend.schemas.enums import Organization
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
    def save_story(self, datetime_submitted: str, content: str) -> None:
        """Save a story to storage."""
        pass

    @abstractmethod
    def get_stories(self) -> list[Story]:
        """Get all stories."""
        pass
