"""Canonical list of 'Did you...' missionary-experience questions.

Single source of truth used by both backend (when persisting per-question rows)
and frontend (fetched via /missionary-experience/questions so the two stay
in lock-step). Question IDs are stable 1-based ordinals; the literal text is
what gets shown in the UI, while `sheet_text` is the trimmed form persisted
to Google Sheets.
"""

from pydantic import BaseModel


class Question(BaseModel):
    id: int
    text: str


# 1-14 are pre-defined "Did you..." prompts; 15 ("Other") accepts free-form
# text supplied by the user. IDs are append-only — once persisted to Sheets
# the (id → text) mapping must not change.
QUESTIONS: list[Question] = [
    Question(id=1, text="Did you have the missionaries over for dinner?"),
    Question(id=2, text="Did you give someone a ride?"),
    Question(id=3, text="Did you reach out to your ministering families?"),
    Question(id=4, text="Did you pray for a missionary experience?"),
    Question(id=5, text="Did you pray for the families to whom you minister?"),
    Question(id=6, text="Did you have your ministering interview?"),
    Question(id=7, text="Did you fill out a BINGO square?"),
    Question(id=8, text="Did you invite a friend or neighbor to an activity?"),
    Question(id=9, text="Did you take a friend with you to the temple?"),
    Question(id=10, text="Did you share a conference talk or scripture?"),
    Question(id=11, text="Did you answer someone's question about your church?"),
    Question(id=12, text="Did you make an invitation this week?"),
    Question(id=13, text="Did you join a lesson with the missionaries?"),
    Question(id=14, text="Did you sit by someone new at church?"),
    Question(id=15, text="Other"),
]

QUESTIONS_BY_ID: dict[int, Question] = {q.id: q for q in QUESTIONS}
OTHER_QUESTION_ID: int = 15

_DID_YOU_PREFIX = "Did you "


def to_sheet_text(question_text: str) -> str:
    """Trim the canonical "Did you ...?" form down to the bare verb phrase.

    "Did you have the missionaries over for dinner?" → "have the missionaries
    over for dinner". Text that doesn't start with "Did you " is returned
    with only its trailing "?" stripped.
    """
    text = question_text
    if text.startswith(_DID_YOU_PREFIX):
        text = text[len(_DID_YOU_PREFIX):]
    if text.endswith("?"):
        text = text[:-1]
    return text.strip()
