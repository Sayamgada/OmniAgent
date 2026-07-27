from cryptography.fernet import Fernet
from app.core.config import settings

_fernet = Fernet(settings.FERNET_SECRET_KEY.encode())

def encrypt_value(plaintext: str) -> str:
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    return _fernet.decrypt(ciphertext.encode()).decode()