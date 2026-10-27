import io

import qrcode


def generate_qr_png(join_url: str) -> bytes:
    """Generate a QR code PNG for a doctor join URL."""

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )

    qr.add_data(join_url)
    qr.make(fit=True)

    image = qr.make_image()

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")

    return buffer.getvalue()