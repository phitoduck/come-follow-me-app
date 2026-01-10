import csv
from pathlib import Path

from loguru import logger

import rs_backend.logger  # noqa: F401  # Import to configure logger
from rs_backend.schemas.enums import Organization, YesNo
from rs_backend.schemas.survey import SurveyReport
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
        logger.info(
            "Saving survey response",
            datetime_submitted=datetime_submitted,
            q_did_you_set_a_cfm_goal=q_did_you_set_a_cfm_goal.value,
            q_did_you_make_progress_this_week=q_did_you_make_progress_this_week.value,
            organization=organization.value,
        )
        with open(self.surveys_file, "a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([datetime_submitted, q_did_you_set_a_cfm_goal.value, q_did_you_make_progress_this_week.value, organization.value])

    def get_survey_reports(self) -> SurveyReport:
        """Get survey reports from CSV file."""
        if not self.surveys_file.exists():
            return SurveyReport(
                total_responses=0,
                organization_breakdown={},
                question_stats={},
                question_stats_by_org={},
            )

        total_responses = 0
        organization_breakdown: dict[str, int] = {}
        question_stats: dict[str, dict[str, int]] = {
            "q_did_you_set_a_cfm_goal": {"yes": 0, "no": 0},
            "q_did_you_make_progress_this_week": {"yes": 0, "no": 0},
        }
        question_stats_by_org: dict[str, dict[str, dict[str, int]]] = {
            "q_did_you_set_a_cfm_goal": {},
            "q_did_you_make_progress_this_week": {},
        }

        with open(self.surveys_file, "r", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                total_responses += 1

                # Count by organization
                org = row["organization"]
                organization_breakdown[org] = organization_breakdown.get(org, 0) + 1

                # Initialize org dicts if needed
                if org not in question_stats_by_org["q_did_you_set_a_cfm_goal"]:
                    question_stats_by_org["q_did_you_set_a_cfm_goal"][org] = {"yes": 0, "no": 0}
                if org not in question_stats_by_org["q_did_you_make_progress_this_week"]:
                    question_stats_by_org["q_did_you_make_progress_this_week"][org] = {"yes": 0, "no": 0}

                # Count by question (overall)
                cfm_goal = row["q_did_you_set_a_cfm_goal"].lower()
                if cfm_goal in ("yes", "no"):
                    question_stats["q_did_you_set_a_cfm_goal"][cfm_goal] += 1
                    question_stats_by_org["q_did_you_set_a_cfm_goal"][org][cfm_goal] += 1

                progress = row["q_did_you_make_progress_this_week"].lower()
                if progress in ("yes", "no"):
                    question_stats["q_did_you_make_progress_this_week"][progress] += 1
                    question_stats_by_org["q_did_you_make_progress_this_week"][org][progress] += 1

        return SurveyReport(
            total_responses=total_responses,
            organization_breakdown=organization_breakdown,
            question_stats=question_stats,
            question_stats_by_org=question_stats_by_org,
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
