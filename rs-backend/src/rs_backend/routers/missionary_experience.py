from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

from rs_backend.questions import (
    OTHER_QUESTION_ID,
    QUESTIONS,
    QUESTIONS_BY_ID,
    Question,
    to_sheet_text,
)
from rs_backend.schemas.missionary_experience import (
    MissionaryExperienceReport,
    MissionaryExperienceRequest,
)
from rs_backend.services.base import SurveyDataService

router = APIRouter(prefix="/missionary-experience", tags=["missionary-experience"])


@router.get("/questions", response_model=list[Question])
async def list_questions() -> list[Question]:
    """Return the canonical list of 'Did you...' questions."""
    return QUESTIONS


@router.post("/", response_model=dict[str, int])
async def submit_missionary_experience(
    payload: MissionaryExperienceRequest, request: Request
) -> dict[str, int]:
    """Submit one or more 'Did you...' answers; writes one sheet row per answer."""
    service: SurveyDataService = request.app.state.survey_data_service

    if not payload.answers:
        raise HTTPException(
            status_code=400, detail="At least one answer must be selected."
        )

    datetime_submitted = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    saved = 0
    for answer in payload.answers:
        question = QUESTIONS_BY_ID.get(answer.question_id)
        if question is None:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown question_id: {answer.question_id}",
            )
        if question.id == OTHER_QUESTION_ID:
            # For "Other", persist the user's verbatim description rather
            # than the canonical "Other" label so the row is self-explanatory.
            question_text = (answer.other_text or "").strip() or question.text
        else:
            question_text = to_sheet_text(question.text)
        service.save_missionary_experience_answer(
            datetime_submitted=datetime_submitted,
            organization=payload.organization,
            question_id=question.id,
            question_text=question_text,
        )
        saved += 1

    return {"saved": saved}


@router.get("/reports", response_model=MissionaryExperienceReport)
async def get_report(request: Request) -> MissionaryExperienceReport:
    """COUNT(*) of answer rows GROUP BY organization."""
    service: SurveyDataService = request.app.state.survey_data_service
    return service.get_missionary_experience_report()
