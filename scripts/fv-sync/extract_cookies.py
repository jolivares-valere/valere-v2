"""
extract_cookies.py — Extrae cookies de sesión de FusionSolar y las guarda en Supabase.

EJECUTAR LOCALMENTE (no en CI). Abre un browser VISIBLE donde puedes:
  - Ver si FusionSolar pide CAPTCHA y resolverlo manualmente
  - Completar cualquier verificación adicional de Huawei SSO

Las cookies extraídas se cifran con AES-256-GCM y se guardan en fv_credenciales.
El job de CI las usa directamente con httpx (sin necesidad de login en CI).

Uso:
    python extract_cookies.py                    # Todas las credenciales activas
    python extract_cookies.py --cred <uuid>      # Solo una credencial
    python extract_cookies.py --headless         # Sin UI (solo si no hay CAPTCHA)

Requisitos de entorno:
    SUPABASE_URL, SUPABASE_SERVICE_KEY, FV_ENCRYPTION_KEY
    (pueden estar en un archivo .env en el directorio actual)

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


def _extract_cookies_for_cred(cred: dict, enc_key: str, headless: bool) -> list[dict]:
    """
    Abre un browser Playwright, navega a FusionSolar y hace login.
    Devuelve la lista de cookies del contexto tras el login exitoso.

    Si headless=False (por defecto), el usuario VE el browser y puede
    resolver CAPTCHAs o verificaciones extra de Huawei SSO.
    """
    from playwright.sync_api import sync_playwright

    base_url = cred.get("region_url") or "https://uni003eu5.fusionsolar.huawei.com"
    username = cred["username"]
    password_raw = decrypt_password(cred["password_enc"], enc_key)

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
    """Cifra y guarda el storage state completo en fv_credenciales."""
    state_json = json.dumps(storage_state)
    state_enc  = encrypt_password(state_json, enc_key)

    # Estimamos expiración en 7 días (las cookies de FusionSolar suelen durar 7-30 días)
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

    sb.table("fv_credenciales").update({
        "session_cookies":    state_enc,
        "cookies_expires_at": expires_at,
        "cookies_updated_at": datetime.now(timezone.utc).isoformat(),
        "ultimo_error":       None,
    }).eq("id", cred_id).execute()

    logger.info(
        "Storage state guardado en Supabase para cred=%s (expira ~%s)",
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
        logger.error(
            "Faltan variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_KEY, FV_ENCRYPTION_KEY"
        )
        sys.exit(1)

    sb = create_client(supabase_url, supabase_key)

    # Cargar credenciales
    q = sb.table("fv_credenciales").select("*").eq("activo", "true")
    if args.cred:
        q = q.eq("id", args.cred)
    credenciales = q.execute().data

    if not credenciales:
        logger.error("No se encontraron credenciales activas")
        sys.exit(1)

    logger.info("%d credencial(es) a procesar", len(credenciales))
    ok = 0

    for cred in credenciales:
        cred_id  = cred["id"]
        username = cred["username"]
        logger.info("Procesando %s (%s)", username, cred_id)

        try:
            storage_state = _extract_cookies_for_cred(cred, enc_key, args.headless)
            _store_cookies(sb, cred_id, storage_state, enc_key)
            ok += 1
            logger.info("OK %s -- storage state guardado", username)
        except Exception as e:
            logger.error("FALLO %s -- %s", username, e)

    logger.info("Finalizado: %d/%d OK", ok, len(credenciales))
    if ok < len(credenciales):
        sys.exit(1)


if __name__ == "__main__":
    main()
