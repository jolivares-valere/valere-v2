"""
test_cookie_auth.py — Verifica que CookieAuthClient funciona con las cookies guardadas.

Ejecutar LOCALMENTE (desde tu máquina, con el .env configurado):
    cd C:\Users\joliv\valere-v2\scripts\fv-sync
    python test_cookie_auth.py

Si funciona aquí pero NO en CI → FusionSolar vincula sesiones a IP.
En ese caso hay que montar un runner local o un cron local en vez de GitHub Actions.

Si NO funciona aquí → las cookies están mal formateadas o expiradas.
En ese caso volver a ejecutar extract_cookies.py.
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
    level=logging.DEBUG,   # DEBUG para ver qué cookies se envían
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("test_cookie_auth")

from supabase import create_client
from crypto import decrypt_password
from fusionsolar_client import CookieAuthClient


def main():
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
    enc_key      = os.environ.get("FV_ENCRYPTION_KEY")

    if not all([supabase_url, supabase_key, enc_key]):
        logger.error("Faltan variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_KEY, FV_ENCRYPTION_KEY")
        sys.exit(1)

    sb = create_client(supabase_url, supabase_key)
    credenciales = sb.table("fv_credenciales").select("*").eq("activo", "true").execute().data

    if not credenciales:
        logger.error("No hay credenciales activas en fv_credenciales")
        sys.exit(1)

    cred = credenciales[0]
    session_cookies_enc = cred.get("session_cookies")
    if not session_cookies_enc:
        logger.error("No hay cookies guardadas. Ejecuta extract_cookies.py primero.")
        sys.exit(1)

    cookies_json = decrypt_password(session_cookies_enc, enc_key)
    cookies = json.loads(cookies_json)

    logger.info("Cookies cargadas: %d", len(cookies))
    logger.info("Nombres: %s", [c["name"] for c in cookies])
    logger.info("Dominios: %s", list({c.get("domain","") for c in cookies}))

    base_url = cred.get("region_url") or "https://uni003eu5.fusionsolar.huawei.com"
    logger.info("Probando CookieAuthClient → %s", base_url)

    client = CookieAuthClient(base_url, cookies)
    client.login()

    try:
        stations = client.get_station_list()
        logger.info("✅ ÉXITO — %d plantas encontradas", len(stations))
        for s in stations:
            name = s.get("stationName") or s.get("plantName") or "(sin nombre)"
            code = s.get("stationCode") or s.get("stationDn") or "?"
            logger.info("  🏭 %s — %s", name, code)
    except Exception as e:
        logger.error("❌ FALLO al obtener plantas: %s", e)
        logger.error(
            "\n"
            "Si ves '302 redirect' → FusionSolar rechaza las cookies.\n"
            "Diagnóstico:\n"
            "  - Si esto falla AQUÍ (tu máquina) → cookies mal formateadas o expiradas → re-ejecutar extract_cookies.py\n"
            "  - Si esto funciona AQUÍ pero no en CI → IP binding → necesitas runner local"
        )
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    main()
