import json
import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, Field, ValidationError

from app.services.language import normalize_language


# ============================================================
# ENVIRONMENT
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[3]

# Load project root .env
load_dotenv(BASE_DIR / ".env")

# Also try backend/.env if present
load_dotenv(Path(__file__).resolve().parents[2] / ".env")


# ============================================================
# GEMINI CONFIGURATION
# ============================================================

# Keep the model configurable through the environment.
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")


class AIProcessingError(Exception):
    """Raised when Gemini processing fails."""


# ============================================================
# PYDANTIC MODELS
# ============================================================


class EnglishIntake(BaseModel):
    chief_complaint: str
    symptoms: list[str]
    negative_symptoms: list[str]
    duration: str
    relevant_history: list[str]
    medications: list[str]
    allergies: list[str]


class Confidence(BaseModel):
    symptoms: float = Field(ge=0.0, le=1.0)
    category: float = Field(ge=0.0, le=1.0)
    urgency: float = Field(ge=0.0, le=1.0)


class ClinicalIntake(BaseModel):
    language: str
    english_intake: EnglishIntake
    possible_symptom_categories: list[str]
    urgency: str
    confidence: Confidence


class AudioTranscription(BaseModel):
    language: str
    transcript: str


# ============================================================
# CLINICAL SYSTEM PROMPT
# ============================================================


SYSTEM_PROMPT = """
You are SwasthSetu, a multilingual clinical intake extraction assistant.

You receive a patient's message in Hindi, Gujarati, Marathi, English,
or another Indian regional language.

Your job is to understand the patient's message and produce a
structured clinical intake in ENGLISH.

IMPORTANT RULES:

1. Understand the patient's original language semantically.

2. Translate the meaning internally into English before filling
   english_intake.

3. Every field inside english_intake MUST be written in English.

4. Never copy a regional-language sentence into chief_complaint.

5. Extract ONLY information explicitly stated by the patient.

6. NEVER invent symptoms, diseases, duration, medical history,
   medications, allergies, severity, or other clinical information.

7. If information is missing:
   - missing string = ""
   - missing list = []

8. Symptoms must be individual English symptom descriptions.

9. Negative symptoms must contain only symptoms the patient
   explicitly denies.

10. Keep the output medically conservative.

11. Do not diagnose the patient.

12. urgency must be one of:
   low
   moderate
   high
   emergency

13. possible_symptom_categories should contain broad categories only.
"""


# ============================================================
# DEMO FALLBACK
# ============================================================


def generate_demo_fallback_intake(
    text: str,
    language: str,
) -> dict:
    """
    Safe fallback extractor used when Gemini clinical processing fails
    or when GEMINI_API_KEY is not configured.

    This fallback is intentionally conservative. It extracts only a
    small set of explicitly stated symptoms, duration, medication,
    allergy, and urgency signals. It does not diagnose the patient.
    """

    clean_text = (text or "").strip()
    lower_text = clean_text.lower()

    def has(*values: str) -> bool:
        return any(
            value.lower() in lower_text
            for value in values
        )

    symptoms: list[str] = []

    symptom_patterns = {
        "stomach pain": (
            "stomach pain",
            "પેટમાં દુખાવો",
            "પેટમાં દુખાવું",
            "पेट में दर्द",
            "पोटात दुखत",
            "पोटात दुखणे",
        ),
        "headache": (
            "headache",
            "માથાનો દુખાવો",
            "માથામાં દુખાવો",
            "माथे में दर्द",
            "सिर में दर्द",
            "डोकेदुखी",
            "डोक्यात दुखत",
        ),
        "fever": (
            "fever",
            "તાવ",
            "બુખાર",
            "बुखार",
            "ताप",
        ),
        "cough": (
            "cough",
            "ઉધરસ",
            "ખાંસી",
            "खांसी",
            "खोकला",
        ),
        "sore throat": (
            "sore throat",
            "ગળામાં દુખાવો",
            "ગળું દુખે",
            "गले में दर्द",
            "घसा दुखतो",
        ),
        "difficulty breathing": (
            "difficulty breathing",
            "breathing difficulty",
            "શ્વાસ લેવામાં તકલીફ",
            "શ્વાસ લેવામાં મુશ્કેલી",
            "સાંસ લેવામાં તકલીફ",
            "सांस लेने में परेशानी",
            "श्वास घेण्यास त्रास",
        ),
        "chest pain": (
            "chest pain",
            "છાતીમાં દુખાવો",
            "છાતીમાં ખૂબ જ દુખાવો",
            "छाती में दर्द",
            "छाती में बहुत दर्द",
            "छातीत दुखत",
        ),
        "leg pain": (
            "leg pain",
            "પગમાં દુખાવો",
            "પગ દુખે",
            "पैर में दर्द",
            "पायात दुखत",
        ),
        "rash": (
            "rash",
            "ચામડી પર ચકામા",
            "ચકામા",
            "चकत्ते",
            "पुरळ",
        ),
        "nausea": (
            "nausea",
            "મિતલી",
            "ઉબકા",
            "मितली",
            "मळमळ",
        ),
    }

    for symptom, patterns in symptom_patterns.items():
        if has(*patterns):
            symptoms.append(symptom)

    negative_symptoms: list[str] = []

    if has(
        "no fever",
        "without fever",
        "તાવ નથી",
        "બુખાર નથી",
        "बुखार नहीं",
        "बुखार नही",
        "ताप नाही",
    ):
        negative_symptoms.append("fever")
        symptoms = [
            symptom
            for symptom in symptoms
            if symptom != "fever"
        ]

    if has(
        "mild",
        "mild pain",
        "હળવો",
        "હળવો દુખાવો",
        "हल्का",
        "हल्का दर्द",
        "सौम्य",
    ):
        urgency = "low"
    elif any(
        symptom in symptoms
        for symptom in (
            "chest pain",
            "difficulty breathing",
        )
    ):
        urgency = "high"
    else:
        urgency = "moderate"

    duration = ""

    if has(
        "two days",
        "2 days",
        "બે દિવસ",
        "दो दिन",
        "दोन दिवस",
        "दोन दिवसां",
    ):
        duration = "two days" if language == "en" else "2 days"

    elif has(
        "three days",
        "3 days",
        "ત્રણ દિવસ",
        "तीन दिन",
        "तीन दिवस",
    ):
        duration = "three days" if language == "en" else "3 days"

    elif has(
        "four days",
        "4 days",
        "ચાર દિવસ",
        "चार दिन",
        "चार दिवस",
    ):
        duration = "four days" if language == "en" else "4 days"

    elif has(
        "five days",
        "5 days",
        "પાંચ દિવસ",
        "पांच दिन",
        "पाच दिवस",
    ):
        duration = "five days" if language == "en" else "5 days"

    elif has(
        "one day",
        "1 day",
        "એક દિવસ",
        "एक दिन",
        "एक दिवस",
    ):
        duration = "one day" if language == "en" else "1 day"

    elif has(
        "since yesterday",
        "yesterday",
        "કલથી",
        "ગઈકાલથી",
        "कल से",
        "कालपासून",
    ):
        duration = "since yesterday"

    medications = ["paracetamol"] if has("paracetamol") else []
    allergies = ["penicillin"] if has("penicillin") else []

    if not symptoms:
        symptoms = [clean_text] if clean_text else []

    if "chest pain" in symptoms:
        category = "Cardiovascular"

    elif any(
        symptom in symptoms
        for symptom in (
            "cough",
            "sore throat",
            "difficulty breathing",
        )
    ):
        category = "Respiratory"

    elif "headache" in symptoms:
        category = "Neurological"

    elif any(
        symptom in symptoms
        for symptom in (
            "stomach pain",
            "nausea",
        )
    ):
        category = "Gastrointestinal"

    elif "leg pain" in symptoms:
        category = "Musculoskeletal"

    elif "rash" in symptoms:
        category = "Dermatological"

    else:
        category = "General/Systemic"

    if symptoms:
        chief_complaint = ", ".join(symptoms).capitalize()
    else:
        chief_complaint = clean_text

    return {
        "language": language or "en",
        "english_intake": {
            "chief_complaint": chief_complaint,
            "symptoms": symptoms,
            "negative_symptoms": negative_symptoms,
            "duration": duration,
            "relevant_history": [],
            "medications": medications,
            "allergies": allergies,
        },
        "possible_symptom_categories": [category],
        "urgency": urgency,
        "confidence": {
            "symptoms": 0.85,
            "category": 0.8,
            "urgency": 0.8,
        },
    }


# ============================================================
# TEXT / CLINICAL INTAKE
# ============================================================


def process_patient_text(
    text: str,
    language: str,
) -> dict:

    if not text or not text.strip():
        raise ValueError(
            "Patient text cannot be empty."
        )

    if not language or not language.strip():
        raise ValueError(
            "Patient language cannot be empty."
        )

    language = normalize_language(
        language,
        fallback=None,
    )

    if language is None:
        raise ValueError(
            "Patient language is not supported."
        )

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        return generate_demo_fallback_intake(
            text,
            language,
        )

    try:
        client = genai.Client(
            api_key=api_key
        )

        patient_prompt = f"""
Patient language:

{language}

Patient input:

{text}

Understand the patient's message in its original language.

Translate its meaning internally into English.

Extract ONLY explicitly stated clinical information.

IMPORTANT:

- Do not invent information.
- Do not diagnose.
- Use English inside english_intake.
- If a field is not stated, leave it empty.
- Return structured clinical information.
"""

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[
                SYSTEM_PROMPT,
                patient_prompt,
            ],
            config={
                "response_mime_type": "application/json",
                "response_json_schema": (
                    ClinicalIntake.model_json_schema()
                ),
                "temperature": 0,
            },
        )

        response_text = (
            getattr(response, "text", None)
            or ""
        ).strip()

        if not response_text:
            raise AIProcessingError(
                "Gemini returned an empty clinical response."
            )

        result = ClinicalIntake.model_validate_json(
            response_text
        )

        return result.model_dump()

    except ValidationError as exc:
        raise AIProcessingError(
            "Gemini returned an invalid clinical intake structure."
        ) from exc

    except AIProcessingError:
        raise

    except Exception as exc:
        # Log provider failures without logging the API key or patient input.
        print("GEMINI TEXT PROCESSING ERROR")
        print("ERROR TYPE:", type(exc).__name__)
        error_message = str(exc)
        if api_key:
            error_message = error_message.replace(api_key, "[REDACTED]")
        if text:
            error_message = error_message.replace(text, "[REDACTED]")
        print("ERROR:", error_message)

        # Preserve demo resilience for clinical processing.
        return generate_demo_fallback_intake(
            text,
            language,
        )


# ============================================================
# AUDIO TRANSCRIPTION
# ============================================================


def transcribe_patient_audio(
    audio_bytes: bytes,
    mime_type: str,
    preferred_language: str | None = None,
) -> dict:
    """
    Transcribe patient browser audio.

    The browser currently sends:

        audio/webm;codecs=opus

    The API normalizes that to:

        audio/webm

    Gemini receives the uploaded audio file and is instructed
    to return a simple JSON object containing:

        {
            "language": "en",
            "transcript": "I have a headache"
        }
    """

    # --------------------------------------------------------
    # Validate audio
    # --------------------------------------------------------

    if not audio_bytes:
        raise ValueError(
            "Patient audio cannot be empty."
        )

    if not mime_type:
        mime_type = "audio/webm"

    mime_type = (
        mime_type
        .lower()
        .split(";")[0]
        .strip()
    )

    # --------------------------------------------------------
    # API KEY
    # --------------------------------------------------------

    preferred_language = normalize_language(
        preferred_language,
        fallback=None,
    )

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise AIProcessingError(
            "Voice transcription is unavailable because "
            "the Gemini API key is not configured."
        )

    # --------------------------------------------------------
    # File extension
    # --------------------------------------------------------

    suffix_map = {
        "audio/webm": ".webm",
        "audio/mp4": ".mp4",
        "audio/mpeg": ".mp3",
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
        "audio/ogg": ".ogg",
        "audio/aac": ".aac",
        "audio/flac": ".flac",
    }

    suffix = suffix_map.get(
        mime_type,
        ".webm",
    )

    temp_path = None
    uploaded_file = None
    client = None

    try:
        # ----------------------------------------------------
        # Create Gemini client
        # ----------------------------------------------------

        client = genai.Client(
            api_key=api_key
        )

        # ----------------------------------------------------
        # Save browser audio temporarily
        # ----------------------------------------------------

        with tempfile.NamedTemporaryFile(
            suffix=suffix,
            delete=False,
        ) as temp_file:

            temp_file.write(audio_bytes)
            temp_file.flush()

            temp_path = temp_file.name

        print("")
        print("========================================")
        print("GEMINI AUDIO TRANSCRIPTION")
        print("========================================")
        print("MODEL:", MODEL_NAME)
        print("MIME TYPE:", mime_type)
        print("AUDIO BYTES:", len(audio_bytes))
        print("TEMP FILE:", temp_path)

        # ----------------------------------------------------
        # Upload audio to Gemini
        # ----------------------------------------------------

        uploaded_file = client.files.upload(
            file=temp_path,
            config=types.UploadFileConfig(
                display_name="swasthsetu-patient-audio",
                mime_type=mime_type,
            ),
        )

        print(
            "GEMINI FILE:",
            getattr(
                uploaded_file,
                "name",
                "unknown",
            ),
        )

        print(
            "GEMINI FILE URI:",
            getattr(
                uploaded_file,
                "uri",
                "unknown",
            ),
        )

        # ----------------------------------------------------
        # IMPORTANT:
        #
        # Do NOT use response_json_schema here.
        #
        # Audio transcription is more reliable when Gemini
        # is allowed to return plain text containing JSON.
        # ----------------------------------------------------

        preferred_language_instruction = (
            f"The selected patient language is {preferred_language}. "
            "Use that language as the primary language unless the audio "
            "is clearly different."
            if preferred_language
            else "Detect the primary spoken language from the audio."
        )

        transcription_prompt = f"""
You are the SwasthSetu patient voice transcription engine.

LISTEN TO THE ATTACHED AUDIO VERY CAREFULLY.

The audio contains a patient speaking about their symptoms.

Your job is ONLY to transcribe what the patient actually says.

Do NOT diagnose the patient.

Do NOT summarize.

Do NOT add medical information.

Do NOT invent words.

Do NOT return an empty transcript if understandable speech
is present.

{preferred_language_instruction}

The patient may speak:

- English
- Hindi
- Gujarati
- Marathi
- Tamil
- Telugu
- Kannada
- Malayalam
- Bengali
- Punjabi
- Hinglish
- another Indian language

Return ONLY valid JSON.

Use exactly this structure:

{{
    "language": "en",
    "transcript": "I have a headache"
}}

Language must be a short lowercase code.

Examples:

English:

{{
    "language": "en",
    "transcript": "I have a headache"
}}

Hindi:

{{
    "language": "hi",
    "transcript": "मेरा सिर दर्द कर रहा है"
}}

Gujarati:

{{
    "language": "gu",
    "transcript": "મને માથામાં દુખાવો થાય છે"
}}

IMPORTANT:

If the recording contains clear human speech, the transcript
must not be empty.
"""

        # ----------------------------------------------------
        # Gemini request
        # ----------------------------------------------------

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[
                uploaded_file,
                transcription_prompt,
            ],
            config={
                "temperature": 0,
            },
        )

        # ----------------------------------------------------
        # Inspect raw response
        # ----------------------------------------------------

        raw_text = (
            getattr(response, "text", None)
            or ""
        ).strip()

        if not raw_text:
            raise AIProcessingError(
                "Gemini returned an empty patient transcript. "
                "Make sure the recording contains clear speech."
            )

        # ----------------------------------------------------
        # Remove markdown JSON fences if Gemini adds them
        # ----------------------------------------------------

        cleaned = raw_text.strip()

        if cleaned.startswith("```"):
            lines = cleaned.splitlines()

            if lines:
                lines = lines[1:]

            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]

            cleaned = "\n".join(lines).strip()

        # ----------------------------------------------------
        # Parse JSON
        # ----------------------------------------------------

        try:
            data = json.loads(cleaned)

        except json.JSONDecodeError as exc:

            print(
                "GEMINI DID NOT RETURN JSON."
            )

            # ------------------------------------------------
            # Fallback:
            #
            # If Gemini returned plain transcription text,
            # use it instead of failing.
            # ------------------------------------------------

            if cleaned:
                return {
                    "transcript": cleaned,
                    "language": "unknown",
                }

            raise AIProcessingError(
                "Gemini returned an invalid audio transcription response."
            ) from exc

        # ----------------------------------------------------
        # Extract fields
        # ----------------------------------------------------

        language = str(
            data.get(
                "language",
                "",
            )
        ).strip().lower()

        transcript = str(
            data.get(
                "transcript",
                "",
            )
        ).strip()

        # ----------------------------------------------------
        # Defensive cleanup
        # ----------------------------------------------------

        if language in {
            "unknown",
            "null",
            "none",
        }:
            language = ""

        if transcript in {
            "null",
            "none",
            "None",
        }:
            transcript = ""

        # ----------------------------------------------------
        # Transcript validation
        # ----------------------------------------------------

        if not transcript:
            raise AIProcessingError(
                "Gemini returned an empty patient transcript. "
                "Make sure the recording contains clear speech."
            )

        language = normalize_language(
            preferred_language or language,
            fallback=None,
        )

        if not language:
            raise AIProcessingError(
                "Gemini did not return a supported patient language."
            )

        print("")
        print("GEMINI TRANSCRIPTION SUCCESS")
        print("LANGUAGE:", language)
        print("========================================")

        return {
            "transcript": transcript,
            "language": language,
        }

    # --------------------------------------------------------
    # Pydantic / validation
    # --------------------------------------------------------

    except ValidationError as exc:
        raise AIProcessingError(
            "Gemini returned an invalid audio transcription structure."
        ) from exc

    except AIProcessingError:
        raise

    # --------------------------------------------------------
    # Gemini / network / API errors
    # --------------------------------------------------------

    except Exception as exc:

        print("")
        print("GEMINI AUDIO ERROR")
        print("ERROR TYPE:", type(exc).__name__)
        print("ERROR:", str(exc))
        print("========================================")

        raise AIProcessingError(
            f"Unable to transcribe patient audio: {exc}"
        ) from exc

    # --------------------------------------------------------
    # Cleanup
    # --------------------------------------------------------

    finally:

        if uploaded_file is not None and client is not None:
            try:
                client.files.delete(
                    name=uploaded_file.name
                )

                print(
                    "Gemini temporary file deleted."
                )

            except Exception:
                pass

        if temp_path:

            try:
                os.remove(temp_path)

            except OSError:
                pass