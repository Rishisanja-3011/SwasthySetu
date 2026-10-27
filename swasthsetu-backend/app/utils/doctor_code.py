import secrets
import string


ALPHABET = string.ascii_uppercase + string.digits


def generate_doctor_code(length: int = 6) -> str:
    """Generate a random SwasthSetu doctor code."""

    code = "".join(
        secrets.choice(ALPHABET)
        for _ in range(length)
    )

    return f"VAN-{code}"