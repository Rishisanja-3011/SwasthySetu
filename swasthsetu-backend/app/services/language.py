LANGUAGE_ALIASES = {
    "en": "en", "en-us": "en", "en-in": "en", "english": "en",
    "english (us)": "en",
    "gu": "gu", "gu-in": "gu", "gujarati": "gu", "ગુજરાતી": "gu",
    "hi": "hi", "hi-in": "hi", "hindi": "hi", "हिन्दी": "hi", "हिंदी": "hi",
    "mr": "mr", "mr-in": "mr", "marathi": "mr", "मराठी": "mr",
    "ta": "ta", "ta-in": "ta", "tamil": "ta", "தமிழ்": "ta",
    "te": "te", "te-in": "te", "telugu": "te", "తెలుగు": "te",
    "kn": "kn", "kn-in": "kn", "kannada": "kn", "ಕನ್ನಡ": "kn",
    "ml": "ml", "ml-in": "ml", "malayalam": "ml", "മലയാളം": "ml",
    "bn": "bn", "bn-in": "bn", "bengali": "bn", "বাংলা": "bn",
    "pa": "pa", "pa-in": "pa", "punjabi": "pa", "ਪੰਜਾਬੀ": "pa",
}


def normalize_language(value: str | None, fallback: str | None = "en") -> str | None:
    """Return one canonical code for UI, speech, and AI language values."""
    if not isinstance(value, str):
        return fallback

    normalized = value.strip().lower().replace("_", "-")
    if not normalized:
        return fallback

    return LANGUAGE_ALIASES.get(normalized) or LANGUAGE_ALIASES.get(
        normalized.split("-", 1)[0]
    ) or fallback

