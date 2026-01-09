from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Get the directory where this file is located
THIS_DIR = Path(__file__).parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_name: str = "RS Backend"
    use_csv_service: bool = True  # Use CSVService for local dev, False for SheetsService

    # CSV service settings
    csv_data_dir: Path = Field(
        default_factory=lambda: THIS_DIR / "data",
        description="Directory for CSV data files",
    )

    # Google Sheets settings (optional, only needed if use_csv_service=False)
    google_sheets_credentials_path: str | None = None
    google_sheets_spreadsheet_id: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="RS_SURVEY__",
        extra="ignore",
    )
