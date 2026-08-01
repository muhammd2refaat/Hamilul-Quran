"""
core/crypto.py
==============
Symmetric encryption for secrets that must be stored at rest and read back —
specifically Google OAuth refresh tokens in the `google_credentials` table.

Uses Fernet (AES-128-CBC + HMAC) with a key from settings.token_encryption_key.
Generate a key with:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""
from functools import lru_cache

from cryptography.fernet import Fernet

from app.config.settings import settings


@lru_cache
def _fernet() -> Fernet:
    return Fernet(settings.token_encryption_key.encode())


def encrypt_secret(plaintext: str) -> str:
    """Encrypt a secret for storage. Returns an opaque token string."""
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt_secret(ciphertext: str) -> str:
    """Decrypt a value previously produced by encrypt_secret."""
    return _fernet().decrypt(ciphertext.encode()).decode()
