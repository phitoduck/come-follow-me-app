from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from loguru import logger

import rs_backend.logger  # noqa: F401  # Import to configure logger
from rs_backend.schemas.enums import Organization, YesNo
from rs_backend.schemas.survey import SurveyReport
from rs_backend.schemas.story import Story
from rs_backend.services.base import SurveyDataService
from rs_backend.services.errors import (
    SheetsCredentialsError,
    SheetsPermissionError,
    SheetsServiceError,
    SheetsSpreadsheetNotFoundError,
)

# Worksheet names
SURVEYS_WORKSHEET = "surveys"
STORIES_WORKSHEET = "stories"


class SheetsService(SurveyDataService):
    """Service for interacting with Google Sheets."""

    def __init__(
        self,
        credentials_path: str | None = None,
        spreadsheet_id: str | None = None,
    ) -> None:
        """Initialize SheetsService with Google Sheets credentials."""
        if credentials_path is None:
            raise SheetsCredentialsError("Credentials path is required")
        if spreadsheet_id is None:
            raise SheetsSpreadsheetNotFoundError("Spreadsheet ID is required")

        credentials_file = Path(credentials_path)
        if not credentials_file.exists():
            raise SheetsCredentialsError(f"Credentials file not found at path: {credentials_path}")

        try:
            self.credentials = service_account.Credentials.from_service_account_file(
                str(credentials_file),
                scopes=["https://www.googleapis.com/auth/spreadsheets"],
            )
        except Exception as e:
            raise SheetsCredentialsError(f"Failed to load credentials: {e}") from e

        try:
            self.service = build("sheets", "v4", credentials=self.credentials)
        except Exception as e:
            raise SheetsServiceError(f"Failed to create Sheets API client: {e}") from e

        self.spreadsheet_id = spreadsheet_id
        logger.info("SheetsService initialized", spreadsheet_id=spreadsheet_id)

    @classmethod
    def init(cls, credentials_path: str | None = None, spreadsheet_id: str | None = None) -> None:
        """Validate credentials and spreadsheet before creating instance."""
        if credentials_path is None:
            raise SheetsCredentialsError("Credentials path is required")
        if spreadsheet_id is None:
            raise SheetsSpreadsheetNotFoundError("Spreadsheet ID is required")

        credentials_file = Path(credentials_path)
        if not credentials_file.exists():
            raise SheetsCredentialsError(f"Credentials file not found at path: {credentials_path}")

        try:
            credentials = service_account.Credentials.from_service_account_file(
                str(credentials_file),
                scopes=["https://www.googleapis.com/auth/spreadsheets"],
            )
        except Exception as e:
            raise SheetsCredentialsError(f"Failed to load credentials: {e}") from e

        try:
            service = build("sheets", "v4", credentials=credentials)
        except Exception as e:
            raise SheetsServiceError(f"Failed to create Sheets API client: {e}") from e

        # Validate spreadsheet exists and is accessible
        try:
            service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        except HttpError as e:
            if e.resp.status == 403:
                raise SheetsPermissionError(
                    "Permission denied. The credentials do not have access to the spreadsheet."
                ) from e
            elif e.resp.status == 404:
                raise SheetsSpreadsheetNotFoundError(
                    f"Spreadsheet not found. Check that the spreadsheet ID is correct: {spreadsheet_id}"
                ) from e
            else:
                raise SheetsServiceError(f"Failed to access spreadsheet: {e}") from e
        except Exception as e:
            raise SheetsServiceError(f"Failed to validate spreadsheet: {e}") from e

        logger.info("SheetsService validation successful", spreadsheet_id=spreadsheet_id)

    def save_survey_response(
        self,
        datetime_submitted: str,
        q_did_you_set_a_cfm_goal: YesNo,
        q_did_you_make_progress_this_week: YesNo,
        organization: Organization,
    ) -> None:
        """Save a survey response to Google Sheets."""
        logger.info(
            "Saving survey response",
            datetime_submitted=datetime_submitted,
            q_did_you_set_a_cfm_goal=q_did_you_set_a_cfm_goal.value,
            q_did_you_make_progress_this_week=q_did_you_make_progress_this_week.value,
            organization=organization.value,
        )

        values = [
            [
                datetime_submitted,
                q_did_you_set_a_cfm_goal.value,
                q_did_you_make_progress_this_week.value,
                organization.value,
            ]
        ]
        body = {"values": values}

        try:
            (
                self.service.spreadsheets()
                .values()
                .append(
                    spreadsheetId=self.spreadsheet_id,
                    range=f"{SURVEYS_WORKSHEET}!A:A",
                    valueInputOption="RAW",
                    insertDataOption="INSERT_ROWS",
                    body=body,
                )
                .execute()
            )
        except HttpError as e:
            if e.resp.status == 403:
                raise SheetsPermissionError(
                    "Permission denied. Unable to write to the spreadsheet."
                ) from e
            elif e.resp.status == 404:
                raise SheetsSpreadsheetNotFoundError(
                    f"Spreadsheet not found: {self.spreadsheet_id}"
                ) from e
            else:
                raise SheetsServiceError(f"Failed to save survey response: {e}") from e
        except Exception as e:
            raise SheetsServiceError(f"Failed to save survey response: {e}") from e

    def get_survey_reports(self) -> SurveyReport:
        """Get survey reports from Google Sheets."""
        try:
            result = (
                self.service.spreadsheets()
                .values()
                .get(spreadsheetId=self.spreadsheet_id, range=f"{SURVEYS_WORKSHEET}!A:D")
                .execute()
            )
        except HttpError as e:
            if e.resp.status == 403:
                raise SheetsPermissionError(
                    "Permission denied. Unable to read from the spreadsheet."
                ) from e
            elif e.resp.status == 404:
                raise SheetsSpreadsheetNotFoundError(
                    f"Spreadsheet not found: {self.spreadsheet_id}"
                ) from e
            else:
                raise SheetsServiceError(f"Failed to get survey reports: {e}") from e
        except Exception as e:
            raise SheetsServiceError(f"Failed to get survey reports: {e}") from e

        values = result.get("values", [])
        if not values:
            return SurveyReport(
                total_responses=0,
                organization_breakdown={},
                question_stats={},
                question_stats_by_org={},
            )

        # Skip header row
        data_rows = values[1:] if len(values) > 1 else []

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

        for row in data_rows:
            if len(row) < 4:
                continue  # Skip incomplete rows

            total_responses += 1

            # Extract values
            org = row[3].strip().lower() if len(row) > 3 else ""
            cfm_goal = row[1].strip().lower() if len(row) > 1 else ""
            progress = row[2].strip().lower() if len(row) > 2 else ""

            # Count by organization
            organization_breakdown[org] = organization_breakdown.get(org, 0) + 1

            # Initialize org dicts if needed
            if org not in question_stats_by_org["q_did_you_set_a_cfm_goal"]:
                question_stats_by_org["q_did_you_set_a_cfm_goal"][org] = {"yes": 0, "no": 0}
            if org not in question_stats_by_org["q_did_you_make_progress_this_week"]:
                question_stats_by_org["q_did_you_make_progress_this_week"][org] = {"yes": 0, "no": 0}

            # Count by question (overall)
            if cfm_goal in ("yes", "no"):
                question_stats["q_did_you_set_a_cfm_goal"][cfm_goal] += 1
                question_stats_by_org["q_did_you_set_a_cfm_goal"][org][cfm_goal] += 1

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
        """Save a story to Google Sheets."""
        values = [[datetime_submitted, content]]
        body = {"values": values}

        try:
            (
                self.service.spreadsheets()
                .values()
                .append(
                    spreadsheetId=self.spreadsheet_id,
                    range=f"{STORIES_WORKSHEET}!A:A",
                    valueInputOption="RAW",
                    insertDataOption="INSERT_ROWS",
                    body=body,
                )
                .execute()
            )
        except HttpError as e:
            if e.resp.status == 403:
                raise SheetsPermissionError(
                    "Permission denied. Unable to write to the spreadsheet."
                ) from e
            elif e.resp.status == 404:
                raise SheetsSpreadsheetNotFoundError(
                    f"Spreadsheet not found: {self.spreadsheet_id}"
                ) from e
            else:
                raise SheetsServiceError(f"Failed to save story: {e}") from e
        except Exception as e:
            raise SheetsServiceError(f"Failed to save story: {e}") from e

    def get_stories(self) -> list[Story]:
        """Get all stories from Google Sheets."""
        try:
            result = (
                self.service.spreadsheets()
                .values()
                .get(spreadsheetId=self.spreadsheet_id, range=f"{STORIES_WORKSHEET}!A:B")
                .execute()
            )
        except HttpError as e:
            if e.resp.status == 403:
                raise SheetsPermissionError(
                    "Permission denied. Unable to read from the spreadsheet."
                ) from e
            elif e.resp.status == 404:
                raise SheetsSpreadsheetNotFoundError(
                    f"Spreadsheet not found: {self.spreadsheet_id}"
                ) from e
            else:
                raise SheetsServiceError(f"Failed to get stories: {e}") from e
        except Exception as e:
            raise SheetsServiceError(f"Failed to get stories: {e}") from e

        values = result.get("values", [])
        if not values:
            return []

        # Skip header row
        data_rows = values[1:] if len(values) > 1 else []

        stories: list[Story] = []
        for row in data_rows:
            if len(row) < 2:
                continue  # Skip incomplete rows
            stories.append(
                Story(
                    datetime_submitted=row[0],
                    content=row[1],
                )
            )
        return stories
