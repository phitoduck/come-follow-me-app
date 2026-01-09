"""Enums for string literals used in schemas."""

from enum import Enum


class YesNo(str, Enum):
    """Enum for yes/no responses."""

    YES = "yes"
    NO = "no"


class Organization(str, Enum):
    """Enum for organization types."""

    RELIEF_SOCIETY = "relief society"
    ELDERS_QUORUM = "elders quorum"
    YOUNG_MENS = "young mens"
    YOUNG_WOMENS = "young womens"

