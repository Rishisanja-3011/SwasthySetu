def translate_and_normalize(text: str, language: str) -> str:
    """
    Translate and normalize regional-language patient input
    into English for downstream clinical processing.

    Provider/model integration will be added after the
    AI provider decision is finalized.
    """
    if not text.strip():
        raise ValueError("Patient input cannot be empty.")

    # Temporary development implementation.
    # This intentionally does NOT claim to translate languages.
    return text.strip()