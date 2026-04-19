from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from loguru import logger

import rs_backend.logger  # noqa: F401  # Import to configure logger
from rs_backend.schemas.enums import Organization
from rs_backend.schemas.survey import MinisteringReport
from rs_backend.schemas.story import Story
from rs_backend.services.base import SurveyDataService
from rs_backend.services.errors import (
    SheetsCredentialsError,
    SheetsPermissionError,
    SheetsServiceError,
    SheetsSpreadsheetNotFoundError,
)

# Worksheet names
MINISTERING_WORKSHEET = "ministering_events"
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

    def save_ministering_event(
        self,
        datetime_submitted: str,
        organization: Organization,
    ) -> None:
        """Save a ministering event to Google Sheets."""
        logger.info(
            "Saving ministering event",
            datetime_submitted=datetime_submitted,
            organization=organization.value,
        )

        values = [[datetime_submitted, organization.value]]
        body = {"values": values}

        try:
            (
                self.service.spreadsheets()
                .values()
                .append(
                    spreadsheetId=self.spreadsheet_id,
                    range=f"{MINISTERING_WORKSHEET}!A:A",
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
                raise SheetsServiceError(f"Failed to save ministering event: {e}") from e
        except Exception as e:
            raise SheetsServiceError(f"Failed to save ministering event: {e}") from e

    def get_ministering_reports(self) -> MinisteringReport:
        """Get ministering reports from Google Sheets."""
        try:
            result = (
                self.service.spreadsheets()
                .values()
                .get(spreadsheetId=self.spreadsheet_id, range=f"{MINISTERING_WORKSHEET}!A:B")
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
                raise SheetsServiceError(f"Failed to get ministering reports: {e}") from e
        except Exception as e:
            raise SheetsServiceError(f"Failed to get ministering reports: {e}") from e

        values = result.get("values", [])
        if not values:
            return MinisteringReport(total_events=0, counts_by_org={})

        # Skip header row
        data_rows = values[1:] if len(values) > 1 else []

        total_events = 0
        counts_by_org: dict[str, int] = {}

        for row in data_rows:
            if len(row) < 2:
                continue
            total_events += 1
            org = row[1].strip().lower()
            counts_by_org[org] = counts_by_org.get(org, 0) + 1

        return MinisteringReport(total_events=total_events, counts_by_org=counts_by_org)

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
                continue
            stories.append(
                Story(
                    datetime_submitted=row[0],
                    content=row[1],
                )
            )
        return stories
