def classify_urgency(text: str, extracted: dict) -> dict:
    """
    Classify urgency from normalized patient input.

    This is a development stub. It must be replaced by
    validated AI classification before production/demo use.
    """

    if not text.strip():
        raise ValueError("Input cannot be empty.")

    return {
        "urgency": "moderate",
        "confidence": 0.0,
    }