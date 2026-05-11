"""
extract_cookies.py — Extrae cookies de sesión de FusionSolar y las guarda en Supabase.

EJECUTAR LOCALMENTE (no en CI). Abre un browser VISIBLE donde puedes:
  - Ver si FusionSolar pide CAPTCHA y resolverlo manualmente
  - Completar cualquier verificación adicional de Huawei SSO

Las cookies extraídas se cifran con AES-256-GCM y se guardan en fv_credenciales_secret.
El job de CI las usa directamente con Playwright headless (sin necesidad de login en CI).

Uso:
    python extract_cookies.py                    # Todas las credenciales activas
    python extract_cookies.py --cred <uuid>      # Solo una credencial
    python extract_cookies.py --headless         # Sin UI (solo si no hay CAPTCHA)

Requisitos de entorno:
    SUPABASE_URL, SUPABASE_SERVICE_KEY, FV_ENCRYPTION_KEY
    (pueden estar en un archivo .env en el directorio actual)

CAMBIO COORDINADO (2026-05-10):
    - Lee password_enc desde fv_credenciales_secret (no de fv_credenciales).
    - Escribe session_cookies/cookies_expires_at en fv_credenciales_secret.
    - Mantiene ultimo_error en fv_credenciales (campo operativo, no secreto).
    Este cambio DEBE desplegarse junto con la migración SQL
    20260510_fv_alta_manual_credenciales.sql. No ejecutar contra producción
    hasta que la migración esté aplicada.
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime, timezone, timedelta

# Cargar .env si existe
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from supabase import create_client
from crypto import encrypt_password, decrypt_password

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("extract_cookies")


def _load_credentials_with_secrets(sb, cred_id_filter: str | None = None) -> list[dict]:
    """
    Carga credenciales activas de fv_credenciales con JOIN a fv_credenciales_secret.

    Retorna lista de dicts con clave '_secret' (None si sin fila en la tabla secreta).
    SEGURIDAD: usa service_role. No loguear el contenido de '_secret'.
    """
    q = (
        sb.table("fv_credenciales")
        .select(
            "id, plataforma, nombre, username, region_url, activo, "
            "fv_credenciales_secret(password_enc, session_cookies, cookies_expires_at)"
        )
        .eq("activo", True)
    )
    if cred_id_filter:
        q = q.eq("id", cred_id_filter)

    rows = q.execute().data or []

    result = []
    for row in rows:
        secret = row.pop("fv_credenciales_secret", None)
        row["_secret"] = secret
        result.append(row)

    return result


def _extract_cookies_for_cred(cred: dict, enc_key: str, headless: bool) -> dict:
    """
    Abre un browser Playwright, navega a FusionSolar y hace login.
    Devuelve el storage state completo (cookies + localStorage) del contexto
    tras el login exitoso.

    Si headless=False (por defecto), el usuario VE el browser y puede
    resolver CAPTCHAs o verificaciones extra de Huawei SSO.

    Lee la contraseña desde cred['_secret']['password_enc'] (fv_credenciales_secret).
    SEGURIDAD: nunca loguear la contraseña descifrada ni el password_enc.
    """
    from playwright.sync_api import sync_playwright

    # ── Leer password desde tabla secreta ───────────────
    secret = cred.get("_secret")
    if secret is None:
        raise ValueError(
            f"Sin fila en fv_credenciales_secret para cred={cred['id']}. "
            "Registra la credencial desde el CRM antes de extraer cookies."
        )
    password_enc = secret.get("password_enc")
    if not password_enc:
        raise ValueError(
            f"password_enc vacío en fv_credenciales_secret para cred={cred['id']}."
        )

    base_url     = cred.get("region_url") or "https://uni003eu5.fusionsolar.huawei.com"
    username     = cred["username"]
    password_raw = decrypt_password(password_enc, enc_key)
    # SEGURIDAD: no loguear password_raw ni password_enc

    logger.info(
        "Abriendo browser para %s @ %s (headless=%s)",
        username, base_url, headless,
    )
    if not headless:
        logger.info(
            "👁️  Browser VISIBLE — si aparece CAPTCHA, resuélvelo manualmente. "
            "El script espera hasta 3 minutos."
        )

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=headless,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
            ],
        )
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        page = context.new_page()

        # Navegar al portal
        page.goto(base_url + "/", wait_until="domcontentloaded", timeout=30_000)
        logger.info("Página cargada: %s", page.url)

        # Esperar que aparezca el formulario de login
        page.wait_for_selector('input[type="password"]', timeout=20_000)
        page.wait_for_timeout(1_500)

        # Pre-rellenar credenciales via JS (el usuario puede corregirlas si hace falta)
        page.evaluate(
            """([user, pwd]) => {
                function fillInput(el, value) {
                    if (!el) return;
                    try {
                        const setter = Object.getOwnPropertyDescriptor(
                            window.HTMLInputElement.prototype, 'value'
                        ).set;
                        setter.call(el, value);
                    } catch(e) { el.value = value; }
                    el.dispatchEvent(new Event('input',  {bubbles: true}));
                    el.dispatchEvent(new Event('change', {bubbles: true}));
                }
                fillInput(document.querySelector('input[type="text"]'),     user);
                fillInput(document.querySelector('input[type="password"]'), pwd);
            }""",
            [username, password_raw],
        )
        logger.info("Credenciales pre-rellenadas. Intentando submit...")
        # Limpiar referencia a password_raw lo antes posible
        del password_raw

        # Submit: focus + Enter
        page.evaluate("document.querySelector('input[type=\"password\"]').focus()")
        page.keyboard.press("Enter")

        # Esperar redirección al portal — timeout largo para dar tiempo a CAPTCHAs manuales
        timeout_ms = 60_000 if headless else 180_000
        logger.info(
            "Esperando navegación a /uniportal/ (timeout=%ds)...",
            timeout_ms // 1000,
        )
        page.wait_for_url("**/uniportal/**", timeout=timeout_ms)

        logger.info("✅ Login OK. URL: %s", page.url)

        # Extraer storage state completo: cookies + localStorage
        # context.storage_state() es un superconjunto de context.cookies().
        # El SPA de FusionSolar puede guardar tokens adicionales en localStorage
        # que son necesarios para que las llamadas API funcionen.
        # Además, al cargar storage_state en CI podemos usar Playwright headless
        # sin login (evita CAPTCHA) manteniendo el fingerprint TLS de Chrome
        # (httpx tiene fingerprint diferente → el WAF CloudWAF de FusionSolar lo rechaza).
        storage_state = context.storage_state()
        n_cookies = len(storage_state.get("cookies", []))
        n_origins = len(storage_state.get("origins", []))
        logger.info("  %d cookies + %d orígenes localStorage extraídos", n_cookies, n_origins)

        browser.close()
        return storage_state


def _store_cookies(sb, cred_id: str, storage_state: dict, enc_key: str) -> None:
    """
    Cifra el storage state y lo guarda en fv_credenciales_secret.

    CAMBIO 2026-05-10: escribe en fv_credenciales_secret (no en fv_credenciales).
    Los campos session_cookies, cookies_expires_at y cookies_updated_at
    pertenecen a la tabla secreta desde la migración 20260510_*.

    El campo ultimo_error (operativo) se limpia en fv_credenciales.
    SEGURIDAD: no loguear el storage_state ni el state_enc.
    """
    state_json = json.dumps(storage_state)
    state_enc  = encrypt_password(state_json, enc_key)
    del state_json

    expires_at = (__import__('datetime').datetime.now(__import__('datetime').timezone.utc) + __import__('datetime').timedelta(days=7)).isoformat()
    now_iso    = __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()

    sb.table("fv_credenciales_secret").upsert({
        "credencial_id":      cred_id,
        "session_cookies":    state_enc,
        "cookies_expires_at": expires_at,
        "cookies_updated_at": now_iso,
    }).execute()

    sb.table("fv_credenciales").update({
        "ultimo_error": None,
    }).eq("id", cred_id).execute()

    logger.info(
        "Storage state guardado en fv_credenciales_secret para cred=%s (expira ~%s)",
        cred_id, expires_at[:10],
    )


def main():
    parser = argparse.ArgumentParser(description="Extrae storage state de sesion de FusionSolar")
    parser.add_argument("--cred",     help="UUID de la credencial (vacio = todas las activas)")
    parser.add_argument("--headless", action="store_true", help="Lanzar browser sin UI")
    args = parser.parse_args()

    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
    enc_key      = os.environ.get("FV_ENCRYPTION_KEY")

    if not all([supabase_url, supabase_key, enc_key]):
        logger.error("Faltan variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_KEY, FV_ENCRYPTION_KEY")
        sys.exit(1)

    sb = create_client(supabase_url, supabase_key)

    credenciales = _load_credentials_with_secrets(sb, cred_id_filter=args.cred)

    if not credenciales:
        logger.error("No se encontraron credenciales activas")
        sys.exit(1)

    sin_secret = [c for c in credenciales if c.get("_secret") is None]
    if sin_secret:
        for c in sin_secret:
            logger.error(
                "SKIP cred=%s plataforma=%s — sin fila en fv_credenciales_secret.",
                c["id"], c.get("plataforma", "?"),
            )
    credenciales = [c for c in credenciales if c.get("_secret") is not None]

    if not credenciales:
        logger.error("Ninguna credencial tiene fila en fv_credenciales_secret. Saliendo.")
        sys.exit(1)

    logger.info("%d credencial(es) a procesar", len(credenciales))
    ok = 0

    for cred in credenciales:
        cred_id  = cred["id"]
        username = cred["username"]
        logger.info("Procesando cred=%s (%s***)", cred_id, username[:3])

        try:
            storage_state = _extract_cookies_for_cred(cred, enc_key, args.headless)
            _store_cookies(sb, cred_id, storage_state, enc_key)
            ok += 1
            logger.info("OK cred=%s -- storage state guardado en fv_credenciales_secret", cred_id)
        except Exception as e:
            logger.error("FALLO cred=%s -- %s", cred_id, e)
            try:
                sb.table("fv_credenciales").update({
                    "ultimo_error": f"extract_cookies error: {type(e).__name__}",
                }).eq("id", cred_id).execute()
            except Exception:
                pass

    logger.info("Finalizado: %d/%d OK", ok, len(credenciales))
    if ok < len(credenciales):
        sys.exit(1)


if __name__ == "__main__":
    main()
