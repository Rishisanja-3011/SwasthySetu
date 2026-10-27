def extract_symptoms(text: str) -> dict:
    """
    Extract structured clinical information from normalized text.

    This is a development stub. Real AI extraction will replace
    this implementation.
    """

    if not text.strip():
        raise ValueError("Input cannot be empty.")

    return {
        "chief_complaint": text.strip(),
        "symptoms": [text.strip()],
        "duration": "",
        "relevant_history": [],
        "medications": [],
        "allergies": [],
        "possible_symptom_categories": [],
        "confidence": 0.0,
    }