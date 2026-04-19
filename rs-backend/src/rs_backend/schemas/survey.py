from pydantic import BaseModel

from rs_backend.schemas.enums import Organization


class MinisteringEventRequest(BaseModel):
    """Request schema for submitting a ministering event."""

    organization: Organization


class MinisteringReport(BaseModel):
    """Response schema for ministering reports."""

    total_events: int
    counts_by_org: dict[str, int]
