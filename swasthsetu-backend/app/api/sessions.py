import asyncio

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    BackgroundTasks,
    File,
    Form,
    UploadFile,
)

from pydantic import BaseModel, Field
from postgrest.exceptions import APIError

from app.core.auth import get_current_user
from app.core.supabase import supabase_admin

from app.services.session_service import (
    create_session,
    delete_session,
    get_doctor_sessions,
    get_session,
    get_session_input,
    get_session_intake,
    claim_session_for_processing,
    save_patient_input,
    update_session_status,
)
from app.services.language import normalize_language


def _auto_process_session(session_id: str, already_claimed: bool = False):
    """
    Background task to execute session AI intake processing
    automatically after receiving patient input.
    """

    try:
        if already_claimed:
            from app.api.processing import process_claimed_session

            asyncio.run(process_claimed_session(session_id))
        else:
            from app.api.processing import process_session

            asyncio.run(process_session(session_id))

    except Exception as exc:
        err_msg = (
            str(exc)
            .encode("ascii", "backslashreplace")
            .decode("ascii")
        )

        print(
            f"[BACKGROUND AI ERROR] "
            f"Session {session_id}: {err_msg}"
        )


def _restore_audio_session_to_waiting(session_id: str) -> None:
    try:
        session = get_session(session_id)
        if session and session["status"] == "processing":
            update_session_status(session_id, "waiting")
    except Exception as exc:
        print(f"[AUDIO SESSION RECOVERY ERROR] {session_id}: {exc}")


router = APIRouter(
    prefix="/sessions",
    tags=["Sessions"],
)


SUPPORTED_AUDIO_MIME_TYPES = {
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
}


# ============================================================
# REQUEST MODELS
# ============================================================

class JoinSessionRequest(BaseModel):
    doctor_code: str = Field(
        min_length=1,
        max_length=20,
    )


class PatientInputRequest(BaseModel):
    text: str = Field(
        min_length=1,
        max_length=8000,
    )

    language: str = Field(
        min_length=2,
        max_length=10,
    )


# ============================================================
# DOCTOR HELPERS
# ============================================================

def get_doctor_id(user) -> str:
    """
    Resolve authenticated Supabase user to the
    SwasthSetu doctor profile.
    """

    try:
        response = (
            supabase_admin
            .table("doctors")
            .select("id")
            .eq("auth_user_id", user.id)
            .limit(1)
            .execute()
        )

    except APIError as exc:
        print("================================")
        print("DOCTOR PROFILE API ERROR")
        print(type(exc).__name__)
        print(str(exc))
        print("================================")

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to access doctor profile.",
        ) from exc

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found.",
        )

    return response.data[0]["id"]


def require_session_owner(
    session_id: str,
    user,
) -> dict:
    """
    Return a session only if it belongs to the
    authenticated doctor.
    """

    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    doctor_id = get_doctor_id(user)

    if session["doctor_id"] != doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this session.",
        )

    return session


# ============================================================
# PATIENT FLOW
# ============================================================

@router.post(
    "/join",
    status_code=status.HTTP_201_CREATED,
)
async def join_consultation_session(
    request: JoinSessionRequest,
):
    """
    Patient joins a doctor's consultation using the
    doctor's unique QR/code.
    """

    doctor_code = (
        request.doctor_code
        .strip()
        .upper()
    )

    try:
        doctor_response = (
            supabase_admin
            .table("doctors")
            .select(
                "id, name, doctor_code"
            )
            .eq(
                "doctor_code",
                doctor_code,
            )
            .limit(1)
            .execute()
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to find doctor.",
        ) from exc

    if not doctor_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found.",
        )

    doctor = doctor_response.data[0]

    try:
        session = create_session(
            doctor["id"],
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to create consultation session.",
        ) from exc

    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return {
        "session_id": session["session_id"],
        "doctor_id": doctor["id"],
        "doctor_name": doctor["name"],
        "doctor_code": doctor["doctor_code"],
        "status": session["status"],
        "created_at": session["created_at"],
    }


# ============================================================
# PATIENT TEXT INPUT
# ============================================================

@router.post(
    "/{session_id}/input",
)
async def submit_patient_input(
    session_id: str,
    request: PatientInputRequest,
    background_tasks: BackgroundTasks,
):
    """
    Patient submits text symptoms.
    """

    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    if session["status"] != "waiting":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Symptoms have already been "
                "submitted for this session."
            ),
        )

    language = normalize_language(request.language, fallback=None)
    if language is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported patient language.",
        )

    try:
        saved_input = save_patient_input(
            session_id,
            {
                "type": "text",
                "text": request.text,
                "language": language,
            },
        )

        if saved_input is None:
            raise RuntimeError(
                "Failed to save patient input."
            )

    except APIError as exc:
        print("================================")
        print("SUPABASE TEXT INPUT SAVE ERROR")
        print("TYPE:", type(exc).__name__)
        print("ERROR:", str(exc))
        print("================================")

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"Unable to save patient input: {exc}"
            ),
        ) from exc

    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    background_tasks.add_task(
        _auto_process_session,
        session_id,
    )

    return {
        "session_id": session_id,
        "status": "received",
    }


# ============================================================
# PATIENT AUDIO INPUT
# ============================================================

@router.post(
    "/{session_id}/audio",
)
async def submit_patient_audio(
    session_id: str,
    background_tasks: BackgroundTasks,
    audio: UploadFile = File(...),
    language: str | None = Form(default=None),
    transcript: str | None = Form(default=None),
):
    """
    Receive patient voice recording.

    Pipeline:

        Browser microphone
            ↓
        MediaRecorder
            ↓
        multipart/form-data
            ↓
        Gemini transcription
            ↓
        save_patient_input()
            ↓
        background clinical extraction
    """

    print("")
    print("========================================")
    print("PATIENT AUDIO REQUEST")
    print("========================================")
    print("SESSION ID:", session_id)
    print("FILENAME:", audio.filename)
    print("CONTENT TYPE:", audio.content_type)

    # --------------------------------------------------------
    # SESSION
    # --------------------------------------------------------

    session = get_session(session_id)

    if session is None:
        print("SESSION NOT FOUND")

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    print(
        "SESSION STATUS:",
        session.get("status"),
    )

    if session["status"] in {"processing", "ready", "active"}:
        return {
            "session_id": session_id,
            "status": session["status"],
            "already_received": True,
        }

    if session["status"] != "waiting":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Symptoms have already been "
                "submitted for this session."
            ),
        )

    # --------------------------------------------------------
    # MIME TYPE
    # --------------------------------------------------------

    mime_type = (
        audio.content_type or ""
    ).lower().split(";")[0].strip()

    print(
        "NORMALIZED MIME TYPE:",
        mime_type,
    )

    if mime_type not in SUPPORTED_AUDIO_MIME_TYPES:
        print(
            "UNSUPPORTED AUDIO FORMAT:",
            mime_type,
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported audio format: "
                f"{mime_type}"
            ),
        )

    # --------------------------------------------------------
    # READ AUDIO
    # --------------------------------------------------------

    audio_bytes = await audio.read()

    print(
        "AUDIO SIZE:",
        len(audio_bytes),
        "bytes",
    )

    if not audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio recording is empty.",
        )

    claimed_session = claim_session_for_processing(session_id)
    if claimed_session is None:
        current_session = get_session(session_id)
        if current_session and current_session["status"] in {
            "processing", "ready", "active"
        }:
            return {
                "session_id": session_id,
                "status": current_session["status"],
                "already_received": True,
            }
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This session cannot accept another submission.",
        )

    # --------------------------------------------------------
    # GEMINI TRANSCRIPTION
    # --------------------------------------------------------

    try:
        from app.services.ai_service import (
            AIProcessingError,
            transcribe_patient_audio,
        )

        preferred_language = normalize_language(language, fallback=None)

        browser_transcript = (transcript or "").strip()
        if browser_transcript:
            # Browser recognition is the existing reviewed-transcript path.
            # Gemini remains the fallback when browser recognition is absent.
            transcript_data = {
                "transcript": browser_transcript,
                "language": preferred_language,
            }
        else:
            transcript_data = await asyncio.to_thread(
                transcribe_patient_audio,
                audio_bytes=audio_bytes,
                mime_type=mime_type,
                preferred_language=preferred_language,
            )

        print("GEMINI TRANSCRIPTION SUCCESS")
        print(
            "DETECTED LANGUAGE:",
            transcript_data.get(
                "language"
            ),
        )

    except AIProcessingError as exc:
        print("")
        print("========================================")
        print("GEMINI TRANSCRIPTION ERROR")
        print("TYPE:", type(exc).__name__)
        print("ERROR:", str(exc))
        print("========================================")

        _restore_audio_session_to_waiting(session_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        print("")
        print("========================================")
        print("UNEXPECTED TRANSCRIPTION ERROR")
        print("TYPE:", type(exc).__name__)
        print("ERROR:", str(exc))
        print("========================================")

        _restore_audio_session_to_waiting(session_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Unable to transcribe patient audio: "
                f"{exc}"
            ),
        ) from exc

    # --------------------------------------------------------
    # VALIDATE TRANSCRIPTION
    # --------------------------------------------------------

    transcript = (
        transcript_data
        .get("transcript", "")
        .strip()
    )

    detected_language = (
        transcript_data
        .get("language", "")
        .strip()
        .lower()
    )

    language = normalize_language(
        detected_language,
        fallback=normalize_language(language, fallback=None),
    )

    if not transcript:
        _restore_audio_session_to_waiting(session_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Gemini returned an empty "
                "patient transcript."
            ),
        )

    if not language:
        _restore_audio_session_to_waiting(session_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gemini did not return a supported patient language.",
        )

    # --------------------------------------------------------
    # SAVE PATIENT INPUT
    # --------------------------------------------------------

    try:
        print("")
        print(
            "SAVING TRANSCRIBED INPUT "
            "TO DATABASE..."
        )

        input_data = {
            "type": "audio",
            "text": transcript,
            "language": language,
            "audio_reference": (
                audio.filename
                or "patient-audio"
            ),
        }

        saved_input = save_patient_input(
            session_id,
            input_data,
        )

        if saved_input is None:
            raise RuntimeError(
                "save_patient_input() "
                "returned None."
            )

    except APIError as exc:
        print("")
        print("========================================")
        print("SUPABASE AUDIO SAVE ERROR")
        print("TYPE:", type(exc).__name__)
        print("ERROR:", str(exc))
        print("========================================")

        _restore_audio_session_to_waiting(session_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Unable to save patient audio input: "
                f"{exc}"
            ),
        ) from exc

    except RuntimeError as exc:
        print("")
        print("========================================")
        print("AUDIO SAVE RUNTIME ERROR")
        print("ERROR:", str(exc))
        print("========================================")

        _restore_audio_session_to_waiting(session_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        print("")
        print("========================================")
        print("UNEXPECTED AUDIO SAVE ERROR")
        print("TYPE:", type(exc).__name__)
        print("ERROR:", str(exc))
        print("========================================")

        _restore_audio_session_to_waiting(session_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Unable to save patient audio input: "
                f"{exc}"
            ),
        ) from exc

    # --------------------------------------------------------
    # BACKGROUND CLINICAL PROCESSING
    # --------------------------------------------------------

    print("")
    print(
        "STARTING BACKGROUND "
        "CLINICAL PROCESSING..."
    )

    background_tasks.add_task(
        _auto_process_session,
        session_id,
        True,
    )

    print("AUDIO REQUEST SUCCESS")
    print("========================================")
    print("")

    return {
        "session_id": session_id,
        "status": "processing",
        "language": language,
        "transcript": transcript,
    }


# ============================================================
# PATIENT STATUS
# ============================================================

@router.get(
    "/{session_id}/patient-status",
)
async def get_patient_session_status(
    session_id: str,
):
    """
    Patient-facing session status.
    """

    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    return {
        "session_id": session_id,
        "status": session["status"],
    }


# ============================================================
# PATIENT CANCEL
# ============================================================

@router.post(
    "/{session_id}/patient-cancel",
)
async def patient_cancel_session(
    session_id: str,
):
    """
    Patient cancels temporary consultation.
    """

    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    if session["status"] in {
        "completed",
        "cancelled",
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session is already closed.",
        )

    try:
        updated_session = update_session_status(
            session_id,
            "cancelled",
        )

        if updated_session is None:
            raise RuntimeError(
                "Unable to cancel consultation session."
            )

        deleted = delete_session(
            session_id,
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Unable to cancel consultation session."
            ),
        ) from exc

    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session could not be deleted.",
        )

    return {
        "session_id": session_id,
        "status": "cancelled",
        "data_deleted": True,
    }


# ============================================================
# DOCTOR SESSION CREATION
# ============================================================

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
async def create_consultation_session(
    user=Depends(get_current_user),
):
    """
    Doctor manually creates consultation session.
    """

    doctor_id = get_doctor_id(user)

    try:
        return create_session(
            doctor_id,
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Unable to create consultation session."
            ),
        ) from exc

    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


# ============================================================
# DOCTOR QUEUE
# ============================================================

@router.get(
    "/queue",
)
async def get_session_queue(
    user=Depends(get_current_user),
):
    """
    Return active consultation sessions
    belonging to authenticated doctor.
    """

    doctor_id = get_doctor_id(user)

    try:
        sessions = get_doctor_sessions(
            doctor_id,
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to load patient queue.",
        ) from exc

    patients = []

    for session in sessions:

        try:
            patient_input = get_session_input(
                session["session_id"],
            )

            intake = get_session_intake(
                session["session_id"],
            )

        except APIError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "Unable to load patient information."
                ),
            ) from exc

        patients.append(
            {
                "session_id": session["session_id"],
                "status": session["status"],
                "created_at": session["created_at"],
                "language": (
                    patient_input.get(
                        "language"
                    )
                    if patient_input
                    else None
                ),
                "complaint": (
                    intake.get(
                        "chief_complaint"
                    )
                    if intake
                    else None
                ),
                "urgency": (
                    intake.get(
                        "urgency"
                    )
                    if intake
                    else None
                ),
            }
        )

    return {
        "doctor_id": doctor_id,
        "patients": patients,
        "count": len(patients),
    }


# ============================================================
# DOCTOR QUEUE PATIENT
# ============================================================

@router.get(
    "/queue/{session_id}",
)
async def get_queue_patient(
    session_id: str,
    user=Depends(get_current_user),
):
    """
    Return complete temporary consultation information
    for authenticated doctor.
    """

    session = require_session_owner(
        session_id,
        user,
    )

    try:
        patient_input = get_session_input(
            session_id,
        )

        intake = get_session_intake(
            session_id,
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Unable to load patient information."
            ),
        ) from exc

    return {
        "session": session,
        "input": patient_input,
        "intake": intake,
    }


# ============================================================
# DOCTOR SESSION
# ============================================================

@router.get(
    "/{session_id}",
)
async def get_consultation_session(
    session_id: str,
    user=Depends(get_current_user),
):
    """
    Doctor views own consultation session.
    """

    session = require_session_owner(
        session_id,
        user,
    )

    try:
        patient_input = get_session_input(
            session_id,
        )

        intake = get_session_intake(
            session_id,
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Unable to load patient information."
            ),
        ) from exc

    return {
        "session": session,
        "input": patient_input,
        "intake": intake,
    }


# ============================================================
# DOCTOR STATUS
# ============================================================

@router.get(
    "/{session_id}/status",
)
async def get_session_status(
    session_id: str,
    user=Depends(get_current_user),
):
    """
    Doctor-only session status endpoint.
    """

    session = require_session_owner(
        session_id,
        user,
    )

    return {
        "session_id": session_id,
        "status": session["status"],
    }


# ============================================================
# DOCTOR START
# ============================================================

@router.post(
    "/{session_id}/start",
)
async def start_session(
    session_id: str,
    user=Depends(get_current_user),
):
    """
    Doctor starts consultation.
    """

    session = require_session_owner(
        session_id,
        user,
    )

    if session["status"] in {
        "completed",
        "cancelled",
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session is no longer active.",
        )

    try:
        updated_session = update_session_status(
            session_id,
            "active",
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Unable to start consultation session."
            ),
        ) from exc

    if updated_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    return {
        "session_id": session_id,
        "status": updated_session["status"],
    }


# ============================================================
# DOCTOR COMPLETE
# ============================================================

@router.post(
    "/{session_id}/complete",
)
async def complete_session(
    session_id: str,
    user=Depends(get_current_user),
):
    """
    Doctor completes consultation and deletes
    temporary session data.
    """

    session = require_session_owner(
        session_id,
        user,
    )

    if session["status"] in {
        "completed",
        "cancelled",
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session is already closed.",
        )

    try:
        updated_session = update_session_status(
            session_id,
            "completed",
        )

        if updated_session is None:
            raise RuntimeError(
                "Unable to complete consultation session."
            )

        deleted = delete_session(
            session_id,
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Unable to complete consultation session."
            ),
        ) from exc

    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session could not be deleted.",
        )

    return {
        "session_id": session_id,
        "status": "completed",
        "data_deleted": True,
    }


# ============================================================
# DOCTOR CANCEL
# ============================================================

@router.post(
    "/{session_id}/cancel",
)
async def cancel_session(
    session_id: str,
    user=Depends(get_current_user),
):
    """
    Doctor cancels consultation and deletes
    temporary session data.
    """

    session = require_session_owner(
        session_id,
        user,
    )

    if session["status"] in {
        "completed",
        "cancelled",
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session is already closed.",
        )

    try:
        updated_session = update_session_status(
            session_id,
            "cancelled",
        )

        if updated_session is None:
            raise RuntimeError(
                "Unable to cancel consultation session."
            )

        deleted = delete_session(
            session_id,
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Unable to cancel consultation session."
            ),
        ) from exc

    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session could not be deleted.",
        )

    return {
        "session_id": session_id,
        "status": "cancelled",
        "data_deleted": True,
    }
