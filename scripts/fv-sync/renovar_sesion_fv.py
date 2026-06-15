"""
renovar_sesion_fv.py — Renovador de sesion FusionSolar (Valere CRM).

QUE HACE:
  1. Te pide tu email/password del CRM Valere (login normal) -> obtiene un token.
  2. Lista tus credenciales FV (via API REST de Supabase con TU token, respeta RLS).
  3. Eliges una credencial. Te pide la password del PORTAL FusionSolar (NO se guarda).
  4. Abre un navegador VISIBLE: inicias sesion en FusionSolar (resuelve CAPTCHA si sale).
  5. Captura las cookies y las SUBE cifradas via la Edge Function fv-upload-cookies.

SEGURIDAD:
  - Este PC NUNCA tiene la clave maestra de cifrado ni la SERVICE_KEY de Supabase.
  - La password del portal solo vive en memoria durante el login (no se escribe).
  - El cifrado de las cookies ocurre SERVER-SIDE en la Edge Function.

Solo necesita en el PC: Python + Playwright + Chromium (los instala INSTALAR_RENOVADOR.ps1).
La URL del proyecto y la anon key son publicas (no son secretos).
"""

import getpass
import json
import sys
import urllib.request
import urllib.error

# Config publica (no secreta): URL del proyecto + anon key publica del CRM.
SUPABASE_URL  = "https://gtphkowfcuiqbvfkwjxb.supabase.co"
# anon/publishable key — es publica por diseño (la usa el front del CRM).
# Se rellena en el empaquetado. Si esta vacia, el script la pide por consola.
SUPABASE_ANON_KEY = "__ANON_KEY__"


def _post(url: str, payload: dict, headers: dict) -> dict:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={**headers, "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        raise RuntimeError(f"HTTP {e.code}: {body}")


def _get(url: str, headers: dict) -> list:
    req = urllib.request.Request(url, headers=headers, method="GET")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def login_crm(anon_key: str) -> str:
    print("\n=== Login en el CRM Valere ===")
    email = input("Email del CRM: ").strip()
    pwd   = getpass.getpass("Password del CRM: ")
    res = _post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        {"email": email, "password": pwd},
        {"apikey": anon_key},
    )
    token = res.get("access_token")
    if not token:
        raise RuntimeError("Login fallido: no se recibio token.")
    print("Login CRM OK.")
    return token


def listar_credenciales(anon_key: str, token: str) -> list:
    headers = {"apikey": anon_key, "Authorization": f"Bearer {token}"}
    rows = _get(
        f"{SUPABASE_URL}/rest/v1/fv_credenciales_safe?select=id,nombre,username,plataforma,region_url,estado_sesion&order=nombre",
        headers,
    )
    return rows


def extraer_cookies(region_url: str, username: str, password: str) -> dict:
    from playwright.sync_api import sync_playwright
    print(f"\nAbriendo navegador para {username} @ {region_url}")
    print("=> Inicia sesion en FusionSolar. Resuelve el CAPTCHA si aparece.")
    print("=> El navegador se cerrara solo cuando detecte que has entrado al portal.\n")
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=False, args=["--disable-blink-features=AutomationControlled"])
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"),
        )
        page = context.new_page()
        page.goto(region_url.rstrip("/") + "/", wait_until="domcontentloaded", timeout=60_000)
        # Pre-rellenar usuario/password para comodidad (el usuario solo da a entrar / CAPTCHA)
        try:
            page.wait_for_selector('input[type="password"]', timeout=20_000)
            page.evaluate(
                """([u, p]) => {
                    const setVal = (sel, val) => {
                        const el = document.querySelector(sel); if (!el) return;
                        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                        setter.call(el, val);
                        el.dispatchEvent(new Event('input', {bubbles:true}));
                        el.dispatchEvent(new Event('change', {bubbles:true}));
                    };
                    setVal('input[type="text"]', u);
                    setVal('input[type="password"]', p);
                }""",
                [username, password],
            )
            print("Usuario y password pre-rellenados. Pulsa 'Iniciar sesion' (y CAPTCHA si sale).")
        except Exception:
            print("No se pudo pre-rellenar el formulario; introduce las credenciales a mano.")

        # Esperar a que el usuario complete el login (navegacion al portal)
        try:
            page.wait_for_url("**/uniportal/**", timeout=240_000)  # hasta 4 min para el humano
        except Exception:
            print("\nNo se detecto la entrada al portal (timeout). Si ya entraste, vuelve a intentarlo.")
            browser.close()
            raise RuntimeError("No se completo el login a tiempo.")

        page.wait_for_timeout(4_000)
        state = context.storage_state()
        browser.close()
        n = len(state.get("cookies", []))
        print(f"Sesion capturada: {n} cookies.")
        return state


def subir_cookies(anon_key: str, token: str, cred_id: str, state: dict) -> None:
    headers = {"apikey": anon_key, "Authorization": f"Bearer {token}"}
    res = _post(
        f"{SUPABASE_URL}/functions/v1/fv-upload-cookies",
        {"credencial_id": cred_id, "storage_state": state, "dias_validez": 7},
        headers,
    )
    if not res.get("ok"):
        raise RuntimeError(f"La subida no fue OK: {res}")
    print(f"\nOK. Cookies guardadas. Caducan ~{res.get('cookies_expires_at','')[:10]}.")
    print("Ya puedes pulsar 'Sincronizar' en el CRM.")


def main():
    anon_key = SUPABASE_ANON_KEY
    if anon_key == "__ANON_KEY__" or not anon_key:
        anon_key = input("Pega la anon key del CRM (te la da Juan): ").strip()

    print("=" * 56)
    print(" RENOVADOR DE SESION FUSIONSOLAR — VALERE CRM")
    print("=" * 56)

    try:
        token = login_crm(anon_key)
        creds = listar_credenciales(anon_key, token)
    except Exception as e:
        print(f"\nERROR: {e}")
        input("\nPulsa Enter para salir."); sys.exit(1)

    if not creds:
        print("No tienes credenciales FV visibles. Crea una en el CRM primero.")
        input("\nPulsa Enter para salir."); sys.exit(0)

    print("\nCredenciales disponibles:")
    for i, c in enumerate(creds):
        print(f"  [{i+1}] {c.get('nombre') or c.get('username')}  "
              f"({c.get('plataforma')}, {c.get('username')}) — estado: {c.get('estado_sesion')}")

    try:
        sel = int(input("\nElige el numero de credencial a renovar: ").strip()) - 1
        cred = creds[sel]
    except (ValueError, IndexError):
        print("Seleccion no valida."); input("\nPulsa Enter para salir."); sys.exit(1)

    if cred.get("plataforma") != "fusionsolar":
        print(f"De momento el renovador solo soporta FusionSolar (esta es {cred.get('plataforma')}).")
        input("\nPulsa Enter para salir."); sys.exit(0)

    region_url = cred.get("region_url") or "https://uni003eu5.fusionsolar.huawei.com"
    username   = cred.get("username")
    print(f"\nVas a renovar: {cred.get('nombre') or username}")
    portal_pwd = getpass.getpass("Password del PORTAL FusionSolar (no se guarda): ")

    try:
        state = extraer_cookies(region_url, username, portal_pwd)
        del portal_pwd
        subir_cookies(anon_key, token, cred["id"], state)
    except Exception as e:
        print(f"\nERROR: {e}")
        input("\nPulsa Enter para salir."); sys.exit(1)

    input("\nListo. Pulsa Enter para salir.")


if __name__ == "__main__":
    main()
