"""Custom exception classes for SheetsService."""


class SheetsServiceError(Exception):
    """Base exception class for all SheetsService errors."""

    pass


class SheetsCredentialsError(SheetsServiceError):
    """Raised when credentials file is missing or invalid."""

    pass


class SheetsSpreadsheetNotFoundError(SheetsServiceError):
    """Raised when spreadsheet ID doesn't exist or is invalid."""

    pass


class SheetsPermissionError(SheetsServiceError):
    """Raised when service account lacks permission to access spreadsheet."""

    pass

