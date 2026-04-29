"""
crypto.py — Cifrado/descifrado AES-256-GCM para credenciales FV.

La clave maestra viene de la variable de entorno FV_ENCRYPTION_KEY (base64, 32 bytes).
Nunca se guarda en disco ni en la BD.

Uso:
    from crypto import encrypt_password, decrypt_password

    enc = encrypt_password("mipassword", os.environ["FV_ENCRYPTION_KEY"])
    plain = decrypt_password(enc, os.environ["FV_ENCRYPTION_KEY"])
"""

import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _load_key(b64_key: str) -> bytes:
    """Decodifica la clave desde base64. Debe ser exactamente 32 bytes (256 bits)."""
    key = base64.b64decode(b64_key)
    if len(key) != 32:
        raise ValueError(f"La clave FV_ENCRYPTION_KEY debe ser 32 bytes; recibidos: {len(key)}")
    return key


def encrypt_password(plaintext: str, b64_key: str) -> str:
    """
    Cifra un string con AES-256-GCM.
    Devuelve '<nonce_b64>:<ciphertext_b64>' — el nonce es aleatorio (12 bytes).
    """
    key = _load_key(b64_key)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ct = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.b64encode(nonce).decode() + ":" + base64.b64encode(ct).decode()


def decrypt_password(enc_blob: str, b64_key: str) -> str:
    """
    Descifra un blob '<nonce_b64>:<ciphertext_b64>' producido por encrypt_password.
    """
    key = _load_key(b64_key)
    parts = enc_blob.split(":", 1)
    if len(parts) != 2:
        raise ValueError("Formato de blob cifrado inválido; esperado 'nonce:ciphertext'")
    nonce = base64.b64decode(parts[0])
    ct = base64.b64decode(parts[1])
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ct, None).decode("utf-8")


def generate_key_b64() -> str:
    """Genera una nueva clave AES-256 aleatoria en base64. Usar UNA sola vez al configurar."""
    return base64.b64encode(os.urandom(32)).decode()


if __name__ == "__main__":
    # Utilidad: python crypto.py generate  →  imprime una clave nueva
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "generate":
        print("Nueva FV_ENCRYPTION_KEY:", generate_key_b64())
    else:
        print("Uso: python crypto.py generate")
