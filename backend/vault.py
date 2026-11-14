from cryptography.fernet import Fernet
import os


def get_fernet():
    key = os.environ.get('ENCRYPTION_KEY', '')
    if not key:
        return None
    return Fernet(key.encode())


def encrypt_password(password: str) -> str:
    f = get_fernet()
    if not f or not password:
        return ""
    return f.encrypt(password.encode()).decode()


def decrypt_password(encrypted: str) -> str:
    f = get_fernet()
    if not f or not encrypted:
        return ""
    try:
        return f.decrypt(encrypted.encode()).decode()
    except Exception:
        return ""
