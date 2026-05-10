"""
test_cookie_auth.py — Verifica que StorageStateClient funciona con el storage state guardado.

Ejecutar LOCALMENTE (desde tu máquina, con el .env configurado):
    cd valere-v2/scripts/fv-sync
    python test_cookie_auth.py

Salidas posibles:
  AUTH_REDIRECT        → la sesión ha expirado o FusionSolar la cerró. Re-ejecutar extract_cookies.py.
  NON_JSON_RESPONSE    → FusionSolar devuelve HTML (sin autenticar). Lo mismo.
  SUPABASE_ERROR       → no se pudo conectar a Supabase o faltan credenciales.
  OK                   → sesión válida, el sync debería funcionar.

Si funciona aquí pero NO en CI → revisar que CI tiene los secrets correctos.
Si no funciona aquí → las cookies están expiradas → re-ejecutar extract_cookies.py.
"""

import json
import logging
import os
import sys

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("test_storage_state")

from supabase import create_client
from crypto import decrypt_password
from fusionsolar_client import StorageStateClient, FusionSolarAuthError, FusionSolarResponseError


def main():
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
    enc_key      = os.environ.get("FV_ENCRYPTION_KEY")

    if not all([supabase_url, supabase_key, enc_key]):
        logger.error(
            "SUPABASE_ERROR — Faltan variables de entorno: "
            "SUPABASE_URL, SUPABASE_SERVICE_KEY, FV_ENCRYPTION_KEY"
        )
        sys.exit(1)

    try:
        sb = create_client(supabase_url, supabase_key)
        credenciales = sb.table("fv_credenciales").select("*").eq("activo", "true").execute().data
    except Exception as e:
        logger.error("SUPABASE_ERROR — no se pudo conectar: %s", e)
        sys.exit(1)

    if not credenciales:
        logger.error("SUPABASE_ERROR — No hay credenciales activas en fv_credenciales")
        sys.exit(1)

    cred = credenciales[0]
    session_state_enc = cred.get("session_cookies")
    if not session_state_enc:
        logger.error(
            "COOKIES_MISSING — No hay storage state guardado para cred=%s. "
            "Ejecuta extract_cookies.py primero.",
            cred["id"],
        )
        sys.exit(1)

    # ── Descifrar storage state ──────────────────────────────────
    try:
        state_json    = decrypt_password(session_state_enc, enc_key)
        storage_state = json.loads(state_json)
    except Exception as e:
        logger.error("SUPABASE_ERROR — no se pudo descifrar el storage state: %s", e)
        sys.exit(1)

    # Soporte formato legacy (lista plana de cookies) → convertir a dict
    if isinstance(storage_state, list):
        logger.warning(
            "Formato legacy detectado (lista de %d cookies). "
            "Se recomienda re-ejecutar extract_cookies.py para el formato nuevo (storage state completo).",
            len(storage_state),
        )
        storage_state = {"cookies": storage_state, "origins": []}

    n_cookies = len(storage_state.get("cookies",