import csv
from pathlib import Path

from rs_backend.schemas.enums import Organization, YesNo
from rs_backend.schemas.survey import SurveyReport
from rs_backend.schemas.story import Story
from rs_backend.services.base import BaseService


class CSVService(BaseService):
    """Service for interacting with local CSV files."""

    def __init__(self, data_dir: Path | None = None) -> None:
        """Initialize CSVService with data directory."""
        if data_dir is None:
            data_dir = Path("data")
        self.data_dir: Path = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.surveys_file: Path = self.data_dir / "surveys.csv"
        self.stories_file: Path = self.data_dir / "stories.csv"
        self._ensure_csv_files_exist()

    @classmethod
    def init(cls, data_dir: Path) -> None:
        """Initialize CSV files at the given directory if they don't exist."""
        data_dir_path = Path(data_dir)
        data_dir_path.mkdir(parents=True, exist_ok=True)
        surveys_file = data_dir_path / "surveys.csv"
        stories_file = data_dir_path / "stories.csv"

        # Create surveys CSV if it doesn't exist
        if not surveys_file.exists():
            with open(surveys_file, "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(
                    ["datetime_submitted", "q_did_you_set_a_cfm_goal", "q_did_you_make_progress_this_week", "organization"]
                )

        # Create stories CSV if it doesn't exist
        if not stories_file.exists():
            with open(stories_file, "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["datetime_submitted", "content"])

    def _ensure_csv_files_exist(self) -> None:
        """Create CSV files with headers if they don't exist."""
        # Surveys CSV
        if not self.surveys_file.exists():
            with open(self.surveys_file, "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(
                    ["datetime_submitted", "q_did_you_set_a_cfm_goal", "q_did_you_make_progress_this_week", "organization"]
                )

        # Stories CSV
        if not self.stories_file.exists():
            with open(self.stories_file, "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["datetime_submitted", "content"])

    def save_survey_response(
        self,
        datetime_submitted: str,
        q_did_you_set_a_cfm_goal: YesNo,
        q_did_you_make_progress_this_week: YesNo,
        organization: Organization,
    ) -> None:
        """Save a survey response to CSV file."""
        with open(self.surveys_file, "a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([datetime_submitted, q_did_you_set_a_cfm_goal.value, q_did_you_make_progress_this_week.value, organization.value])

    def get_survey_reports(self) -> SurveyReport:
        """Get survey reports from CSV file."""
        # TODO: Implement report generation from CSV data
        return SurveyReport(
            total_responses=0,
            organization_breakdown={},
            question_stats={},
        )

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
