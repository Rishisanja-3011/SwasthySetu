from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from postgrest.exceptions import APIError

from app.services.ai_service import (
    AIProcessingError,
    process_patient_text,
)

from app.services.session_service import (
    get_session,
    save_intake,
    update_session_status,
)

from app.core.supabase import supabase_admin


router = APIRouter(
    prefix="/processing",
    tags=["AI Processing"],
)


# ============================================================
# REQUEST / RESPONSE MODELS
# ============================================================

class ProcessTextRequest(BaseModel):
    text: str = Field(min_length=1)
    language: str = Field(min_length=2, max_length=10)


class EnglishIntake(BaseModel):
    chief_complaint: str
    symptoms: list[str]
    negative_symptoms: list[str]
    duration: str
    relevant_history: list[str]
    medications: list[str]
    allergies: list[str]


class ClinicalIntake(BaseModel):
    language: str
    english_intake: EnglishIntake
    possible_symptom_categories: list[str]
    urgency: str
    confidence: dict[str, float]


# ============================================================
# ERROR RECOVERY
# ============================================================

def restore_session_to_waiting(session_id: str) -> None:
    """
    Best-effort recovery if AI processing fails.

    The doctor has not started the consultation yet.
    Therefore the session must return to waiting so that
    processing can be retried.
    """

    try:
        update_session_status(
            session_id,
            "waiting",
        )
    except Exception as exc:
        print(
            f"Failed to restore session "
            f"{session_id} to waiting: {exc}"
        )


# ============================================================
# DIRECT TEXT PROCESSING
# ============================================================

@router.post(
    "/text",
    response_model=ClinicalIntake,
)
async def process_text(
    request: ProcessTextRequest,
):
    """
    Process text directly using the AI service.

    This endpoint is useful for testing the AI pipeline
    independently from session/database handling.
    """

    text = request.text.strip()
    language = request.language.strip().lower()

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Text cannot be empty.",
        )

    if not language:
        raise HTTPException(
            status_code=400,
            detail="Language cannot be empty.",
        )

    try:
        result = process_patient_text(
            text=text,
            language=language,
        )

        return ClinicalIntake(
            **result
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except AIProcessingError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"AI processing failed: {exc}",
        ) from exc


# ============================================================
# SESSION AI PROCESSING
# ============================================================

@router.post(
    "/session/{session_id}",
    response_model=ClinicalIntake,
)
async def process_session(session_id: str):
    return await _process_session(session_id)


async def process_claimed_session(session_id: str):
    """Process input for an audio request that already claimed its session."""
    return await _process_session(session_id, already_claimed=True)


async def _process_session(
    session_id: str,
    *,
    already_claimed: bool = False,
):
    """
    Process the latest patient input for a consultation session.

    Flow:

        waiting
            ↓
        processing
            ↓
        AI processing
            ↓
        temporary_intakes
            ↓
        ready

    If AI processing fails:

        processing
            ↓
        waiting

    This allows the session to be retried.
    """

    # --------------------------------------------------------
    # 1. GET SESSION
    # --------------------------------------------------------

    session = get_session(
        session_id
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Session not found.",
        )

    # --------------------------------------------------------
    # 2. CHECK SESSION STATUS
    # --------------------------------------------------------

    if session["status"] in {
        "completed",
        "cancelled",
    }:
        raise HTTPException(
            status_code=409,
            detail="Session is no longer active.",
        )

    # A completed intake is safe to return for an idempotent retry.
    if session["status"] in {"ready", "active", "processing"}:
        try:
            intake_res = (
                supabase_admin
                .table("temporary_intakes")
                .select("*")
                .eq("session_id", session_id)
                .limit(1)
                .execute()
            )
            if intake_res.data:
                existing = intake_res.data[0]
                return ClinicalIntake(
                    language=session.get("language") or "en",
                    english_intake=EnglishIntake(
                        chief_complaint=existing.get("chief_complaint") or "",
                        symptoms=existing.get("symptoms") or [],
                        negative_symptoms=existing.get("negative_symptoms") or [],
                        duration=existing.get("duration") or "",
                        relevant_history=existing.get("relevant_history") or [],
                        medications=existing.get("medications") or [],
                        allergies=existing.get("allergies") or [],
                    ),
                    possible_symptom_categories=existing.get("possible_symptom_categories") or [],
                    urgency=existing.get("urgency") or "moderate",
                    confidence=existing.get("confidence") or {"symptoms": 1.0, "category": 0.9, "urgency": 0.8},
                )
        except Exception:
            pass

        if session["status"] == "processing" and not already_claimed:
            raise HTTPException(
                status_code=409,
                detail="Clinical intake is already being prepared.",
            )

    # --------------------------------------------------------
    # 3. GET LATEST PATIENT INPUT
    # --------------------------------------------------------

    try:
        input_response = (
            supabase_admin
            .table("temporary_inputs")
            .select("*")
            .eq(
                "session_id",
                session_id,
            )
            .order(
                "created_at",
                desc=True,
            )
            .limit(1)
            .execute()
        )

    except APIError as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Unable to read patient input "
                "from the database."
            ),
        ) from exc

    if not input_response.data:
        raise HTTPException(
            status_code=404,
            detail=(
                "No patient input found "
                "for this session."
            ),
        )

    patient_input = input_response.data[0]

    # --------------------------------------------------------
    # 4. EXTRACT INPUT
    # --------------------------------------------------------

    text = patient_input.get(
        "text_content"
    )

    language = patient_input.get(
        "language"
    )

    if text is None:
        raise HTTPException(
            status_code=400,
            detail="Patient input text is missing.",
        )

    if not isinstance(text, str):
        text = str(text)

    text = text.strip()

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Patient input text is empty.",
        )

    if language is None:
        raise HTTPException(
            status_code=400,
            detail="Patient input language is missing.",
        )

    language = str(
        language
    ).strip().lower()

    if not language:
        raise HTTPException(
            status_code=400,
            detail="Patient input language is empty.",
        )

    # --------------------------------------------------------
    # 5. MARK PROCESSING
    # --------------------------------------------------------

    try:

        if session["status"] != "processing":
            processing_session = update_session_status(
                session_id,
                "processing",
            )

            if processing_session is None:
                raise RuntimeError(
                    "Failed to update session status to processing."
                )

        # ----------------------------------------------------
        # 6. RUN AI
        # ----------------------------------------------------

        result = process_patient_text(
            text=text,
            language=language,
        )

        # ----------------------------------------------------
        # 7. SAVE AI INTAKE
        # ----------------------------------------------------

        saved_intake = save_intake(
            session_id,
            result,
        )

        if saved_intake is None:
            raise RuntimeError(
                "Failed to save AI intake."
            )

        # ----------------------------------------------------
        # 8. MARK READY
        # ----------------------------------------------------

        ready_session = update_session_status(
            session_id,
            "ready",
        )

        if ready_session is None:
            raise RuntimeError(
                "Failed to update session status to ready."
            )

        # ----------------------------------------------------
        # 9. RETURN RESULT
        # ----------------------------------------------------

        return ClinicalIntake(
            **result
        )

    # --------------------------------------------------------
    # AI VALIDATION ERROR
    # --------------------------------------------------------

    except ValueError as exc:

        restore_session_to_waiting(
            session_id
        )

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    # --------------------------------------------------------
    # GEMINI / AI ERROR
    # --------------------------------------------------------

    except AIProcessingError as exc:

        restore_session_to_waiting(
            session_id
        )

        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    # --------------------------------------------------------
    # DATABASE ERROR
    # --------------------------------------------------------

    except APIError as exc:

        restore_session_to_waiting(
            session_id
        )

        raise HTTPException(
            status_code=503,
            detail=(
                "AI intake could not be saved "
                "to the database."
            ),
        ) from exc

    # --------------------------------------------------------
    # OTHER PROCESSING ERROR
    # --------------------------------------------------------

    except RuntimeError as exc:

        restore_session_to_waiting(
            session_id
        )

        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        restore_session_to_waiting(
            session_id
        )

        raise HTTPException(
            status_code=500,
            detail="Unexpected AI processing error.",
        ) from exc
