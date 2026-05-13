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
    Descifra un blob AES-256-GCM. Soporta dos formatos:

    Formato A (Python legacy, producido por encrypt_password):
        '<nonce_b64>:<ciphertext_b64>'

    Formato B (Edge Function fv-create-credential):
        'AES256GCM:v1:<iv_b64>:<ciphertext_b64>'

    Ambos formatos usan la misma clave FV_ENCRYPTION_KEY y son
    compatibles porque la primitiva subyacente es idéntica (AESGCM, nonce 12 bytes, tag 128 bits).
    """
    key = _load_key(b64_key)
    if enc_blob.startswith("AES256GCM:v1:"):
        # Formato Edge Function: "AES256GCM:v1:<iv_b64>:<ct_b64>"
        parts = enc_blob.split(":", 3)
        if len(parts) != 4:
            raise ValueError("Formato AES256GCM:v1 inválido; esperado 'AES256GCM:v1:iv:ct'")
        nonce = base64.b64decode(parts[2])
        ct    = base64.b64decode(parts[3])
    else:
        # Formato Python: "<nonce_b64>:<ct_b64>"
        parts = enc_blob.split(":", 1)
        if len(parts) != 2:
            raise ValueError("Formato de blob cifrado inválido; esperado 'nonce:ciphertext'")
        nonce = base64.b64decode(parts[0])
        ct    = base64.b64decode(parts[1])
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
