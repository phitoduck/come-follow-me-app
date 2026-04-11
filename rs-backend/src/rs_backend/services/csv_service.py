import csv
from pathlib import Path

from loguru import logger

import rs_backend.logger  # noqa: F401  # Import to configure logger
from rs_backend.schemas.enums import Organization
from rs_backend.schemas.survey import MinisteringReport
from rs_backend.schemas.story import Story
from rs_backend.services.base import SurveyDataService


class CSVService(SurveyDataService):
    """Service for interacting with local CSV files."""

    def __init__(self, data_dir: Path | None = None) -> None:
        """Initialize CSVService with data directory."""
        if data_dir is None:
            data_dir = Path("data")
        self.data_dir: Path = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.ministering_file: Path = self.data_dir / "ministering_events.csv"
        self.stories_file: Path = self.data_dir / "stories.csv"
        self._ensure_csv_files_exist()

    @classmethod
    def init(cls, data_dir: Path) -> None:
        """Initialize CSV files at the given directory if they don't exist."""
        data_dir_path = Path(data_dir)
        data_dir_path.mkdir(parents=True, exist_ok=True)
        ministering_file = data_dir_path / "ministering_events.csv"
        stories_file = data_dir_path / "stories.csv"

        if not ministering_file.exists():
            with open(ministering_file, "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["datetime_submitted", "organization"])

        if not stories_file.exists():
            with open(stories_file, "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["datetime_submitted", "content"])

    def _ensure_csv_files_exist(self) -> None:
        """Create CSV files with headers if they don't exist."""
        if not self.ministering_file.exists():
            with open(self.ministering_file, "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["datetime_submitted", "organization"])

        if not self.stories_file.exists():
            with open(self.stories_file, "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["datetime_submitted", "content"])

    def save_ministering_event(
        self,
        datetime_submitted: str,
        organization: Organization,
    ) -> None:
        """Save a ministering event to CSV file."""
        logger.info(
            "Saving ministering event",
            datetime_submitted=datetime_submitted,
            organization=organization.value,
        )
        with open(self.ministering_file, "a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([datetime_submitted, organization.value])

    def get_ministering_reports(self) -> MinisteringReport:
        """Get ministering reports from CSV file."""
        if not self.ministering_file.exists():
            return MinisteringReport(total_events=0, counts_by_org={})

        total_events = 0
        counts_by_org: dict[str, int] = {}

        with open(self.ministering_file, "r", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                total_events += 1
                org = row["organization"]
                counts_by_org[org] = counts_by_org.get(org, 0) + 1

        return MinisteringReport(total_events=total_events, counts_by_org=counts_by_org)

    def save_story(self, datetime_submitted: str, content: str) -> None:
        """Save a story to CSV file."""
        with open(self.stories_file, "a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([datetime_submitted, content])

    def get_stories(self) -> list[Story]:
        """Get all stories from CSV file."""
        stories: list[Story] = []
        if not self.stories_file.exists():
            return stories

        with open(self.stories_file, "r", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                stories.append(
                    Story(
                        datetime_submitted=row["datetime_submitted"],
                        content=row["content"],
                    )
                )
        return stories
