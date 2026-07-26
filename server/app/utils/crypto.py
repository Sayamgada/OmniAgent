from cryptography.fernet import Fernet
from app.core.config import settings

# settings.FERNET_SECRET_KEY must be a urlsafe base64 32-byte key.
# Generate once with: Fernet.generate_key().decode()  -- store in .env, never commit it.
_fernet = Fernet(settings.FERNET_SECRET_KEY.encode())


def encrypt_value(plaintext: str) -> str:
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    return _fernet.decrypt(ciphertext.encode()).decode()