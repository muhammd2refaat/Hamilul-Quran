"""
features/auth/totp.py
=====================
Thin pyotp wrapper for TOTP (RFC 6238) 2FA.

- Secrets are generated here but stored *encrypted* by the caller (via
  app.core.crypto) so this module never touches raw DB writes.
- `verify_totp` accepts one preceding time window (valid_window=1) to
  account for slight clock drift between the user's device and the server.
"""
import pyotp

APP_NAME = "Hamilul-Quran"


def generate_secret() -> str:
    """Return a new random base32 TOTP secret."""
    return pyotp.random_base32()


def get_provisioning_uri(secret: str, email: str) -> str:
    """Return the otpauth:// URI suitable for encoding as a QR code.

    The client can render this with a QR library (e.g. `qrcode` or a
    frontend library) so the user can scan it with Google Authenticator,
    Authy, etc.
    """
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=APP_NAME)


def verify_totp(secret: str, code: str) -> bool:
    """Verify a 6-digit TOTP code against the given base32 secret.

    `valid_window=1` allows one adjacent 30-second window (±30 s) to
    compensate for minor device clock drift without materially weakening
    security.
    """
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)
