"""
fusionsolar_client.py — Cliente FusionSolar via Playwright (headless browser).

Por qué Playwright en vez de httpx:
  El portal FusionSolar EU5 usa cifrado RSA con parámetros dinámicos que cambian
  entre sesiones. En vez de replicar ese protocolo, Playwright lanza un Chromium
  headless que hace el login exactamente igual que un usuario real. Las cookies
  (incluyendo HttpOnly como roarand/bspsession) se gestionan automáticamente.

Interfaz pública:
    client = WebAuthClient(base_url, username, password)
    client.login()
    stations = client.get_station_list()     # lista de dicts con KPIs embebidos
    kpi      = client.get_station_kpi(code)
    devices  = client.get_devices(code)
    alarms   = client.get_alarms(code)
    day_kpi  = client.get_daily_kpi(code, date)
    client.close()

Integración futura con incidencias CRM:
    Las alarmas FV de severidad "critica"/"mayor" se pueden vincular a la tabla
    `incidencias` del CRM para seguimiento unificado. Ver sync_job.py para el
    punto de extensión (TODO: INCIDENCIAS_CRM).
"""

import logging
import time
from abc import ABC, abstractmethod
from datetime import date, datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────
# Excepciones propias
# ─────────────────────────────────────────────────────────

class FusionSolarAuthError(Exception):
    """
    La sesión de FusionSolar fue rechazada o ha expirado.
    Causas comunes:
      - El storage state ha expirado (cookies WAF o de sesión caducadas).
      - FusionSolar redirigió a la página de login (/unisso/login.action).
      - El storage state no contiene las cookies necesarias.
    Solución: ejecutar extract_cookies.py localmente para renovar.
    """
    def __init__(self, reason: str, redirect_url: str = "", endpoint: str = ""):
        self.reason       = reason
        self.redirect_url = redirect_url
        self.endpoint     = endpoint
        super().__init__(
            f"[AUTH_ERROR] {reason}"
            + (f" | redirect→{redirect_url}" if redirect_url else "")
            + (f" | endpoint={endpoint}"     if endpoint     else "")
        )


class FusionSolarResponseError(Exception):
    """Respuesta HTTP inesperada (no-JSON, status 5xx, etc.)."""
    def __init__(self, status: int, body_preview: str, endpoint: str = ""):
        self.status       = status
        self.body_preview = body_preview
        self.endpoint     = endpoint
        super().__init__(
            f"[RESPONSE_ERROR] HTTP {status} en {endpoint} — "
            f"body(primeros 300 chars): {body_preview}"
        )


# ─────────────────────────────────────────────────────────
# Interfaz abstracta común
# ─────────────────────────────────────────────────────────

class FusionSolarClient(ABC):
    """Interfaz común para cualquier implementación de cliente FusionSolar."""

    @abstractmethod
    def login(self) -> None:
        """Autentica la sesión. Lanza excepción si falla."""

    @abstractmethod
    def get_station_list(self) -> list[dict]:
        """Lista de plantas con KPIs embebidos."""

    @abstractmethod
    def get_station_kpi(self, station_code: str) -> dict:
        """KPIs en tiempo real de una planta."""

    @abstractmethod
    def get_devices(self, station_code: str) -> list[dict]:
        """Dispositivos de una planta (inversores, baterías, etc.)."""

    @abstractmethod
    def get_alarms(self, station_code: str) -> list[dict]:
        """Alarmas activas de una planta."""

    @abstractmethod
    def get_daily_kpi(self, station_code: str, day: date) -> dict:
        """Producción de un día concreto."""

    def close(self) -> None:
        """Libera recursos. Llamar siempre en un bloque finally."""

    # ── Aliases de conveniencia ────────────────────────────────────────────
    # sync_job.py usa estos nombres; delegan en los métodos abstractos.

    def get_station_kpi_daily(self, station_code: str) -> dict:
        """Alias de get_daily_kpi para hoy."""
        from datetime import date
        return self.get_daily_kpi(station_code, date.today())

    def get_station_alarms(self, station_code: str) -> list[dict]:
        """Alias de get_alarms."""
        return self.get_alarms(station_code)

    def logout(self) -> None:
        """Alias de close() — compatibilidad con sync_job.py."""
        self.close()


# ─────────────────────────────────────────────────────────
# Implementación con Playwright
# ─────────────────────────────────────────────────────────

class WebAuthClient(FusionSolarClient):
    """
    Autenticación mediante Playwright (Chromium headless).

    Flujo de login:
      1. Lanza Chromium headless
      2. Navega a base_url  →  SSO redirige a /unisso/login.action
      3. Rellena usuario + contraseña y hace clic en "Iniciar sesión"
      4. Espera redirección al portal (/uniportal/…)
      5. Todas las llamadas REST se ejecutan con page.evaluate(fetch(…))
         Las cookies HttpOnly se incluyen automáticamente por el browser.
    """

    # Endpoints internos del portal EU5
    _STATION_LIST = "/rest/pvms/web/station/v1/station/station-list"
    _TOTAL_KPI    = "/rest/pvms/web/station/v1/station/total-real-kpi"
    _ALARM_LIST   = "/rest/pvms/fm/v1/statistic"
    _DEV_LIST     = "/rest/pvms/web/device/v1/device-list"
    _DAILY_KPI    = "/rest/pvms/web/station/v1/station/day-real-kpi"

    def __init__(self, base_url: str, username: str, password: str, timeout: int = 30):
        self.base_url  = base_url.rstrip("/")
        self.username  = username
        self.password  = password
        self.timeout   = timeout
        self._pw_ctx   = None
        self._pw       = None
        self._browser  = None
        self._page     = None
        # Caché de datos de estación obtenidos en get_station_list()
        self._station_cache: dict[str, dict] = {}

    # ── Login ──────────────────────────────────────────────────────────────

    def login(self) -> None:
        from playwright.sync_api import sync_playwright

        self._pw_ctx = sync_playwright()
        self._pw     = self._pw_ctx.__enter__()

        self._browser = self._pw.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
            ],
        )
        context = self._browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        self._page = context.new_page()

        # Paso 1: navegar al portal → redirige automáticamente al SSO
        logger.info("Playwright: navegando a %s", self.base_url)
        self._page.goto(
            self.base_url + "/",
            timeout=self.timeout * 1000,
            wait_until="domcontentloaded",
        )

        # Paso 2: esperar que aparezca el formulario de login (campo password)
        self._page.wait_for_selector('input[type="password"]', timeout=15_000)
        logger.debug("Formulario de login detectado en %s", self._page.url)
        # Pequeña pausa para que la animación CSS del SPA termine de renderizar
        self._page.wait_for_timeout(1_500)

        # Paso 3: rellenar credenciales via JavaScript
        # En CI headless los campos pueden estar en el DOM pero no visibles aún
        # por animaciones CSS del SPA de FusionSolar. evaluate() bypasea todos
        # los checks de visibilidad de Playwright (force=True no es suficiente
        # cuando el elemento tiene display:none o está cubierto por un overlay).
        self._page.evaluate(
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
                fillInput(document.querySelector('input[type="text"]'), user);
                fillInput(document.querySelector('input[type="password"]'), pwd);
            }""",
            [self.username, self.password],
        )
        logger.debug("Credenciales rellenadas via JS evaluate")

        # Paso 4: enviar el formulario
        # Estrategia: focus el campo password via JS (no requiere visibilidad),
        # luego page.keyboard.press() que opera sobre el elemento con foco activo.
        # Esto bypasea los checks de visibilidad de Playwright y funciona en CI headless.
        self._page.evaluate(
            """() => {
                const pwd = document.querySelector('input[type="password"]');
                if (pwd) pwd.focus();
            }"""
        )
        self._page.keyboard.press("Enter")
        logger.debug("Formulario enviado via keyboard.press(Enter) sobre campo con foco JS")

        # Paso 5: esperar redirección al portal
        # Registrar URL actual antes de esperar (ayuda a diagnosticar fallos de login)
        url_antes = self._page.url
        logger.info("URL antes de wait_for_url: %s", url_antes)
        try:
            self._page.wait_for_url("**/uniportal/**", timeout=25_000)
        except Exception as e:
            # Guardar screenshot de diagnóstico para entender qué muestra el portal
            url_despues = self._page.url
            logger.error("wait_for_url falló. URL actual: %s", url_despues)
            try:
                import os
                screenshot_path = os.path.join(os.getcwd(), "playwright_debug.png")
                self._page.screenshot(path=screenshot_path, full_page=True)
                logger.info("Screenshot de diagnóstico guardado en %s", screenshot_path)
            except Exception as se:
                logger.warning("No se pudo guardar screenshot: %s", se)
            raise

        # Esperar a que el JS del SPA inicialice (networkidle puede ser largo)
        try:
            self._page.wait_for_load_state("networkidle", timeout=15_000)
        except Exception:
            # networkidle no es crítico; continuar si tarda demasiado
            self._page.wait_for_timeout(3_000)

        logger.info(
            "FusionSolar login OK (Playwright) para %s @ %s",
            self.username, self.base_url,
        )

    # ── Llamadas REST desde el contexto del navegador ─────────────────────

    def _fetch(self, method: str, path: str, payload: Any = None) -> Any:
        """
        Ejecuta fetch() en el contexto de la página del portal.
        Las cookies (incluidas las HttpOnly) se envían automáticamente.
        Los datos se pasan como argumentos JS para evitar problemas de escape.
        """
        url = path if path.startswith("http") else self.base_url + path
        result = self._page.evaluate(
            """([method, url, payload]) =>
                fetch(url, {
                    method,
                    headers: {"Content-Type": "application/json"},
                    body: (method !== "GET" && payload !== null)
                          ? JSON.stringify(payload)
                          : undefined,
                }).then(r => {
                    if (!r.ok) throw new Error("HTTP " + r.status + " " + url);
                    return r.json();
                })
            """,
            [method.upper(), url, payload],
        )
        return result

    def _safe_fetch(self, method: str, path: str, payload: Any = None, default: Any = None) -> Any:
        """Igual que _fetch pero captura excepciones y devuelve default."""
        try:
            return self._fetch(method, path, payload)
        except Exception as e:
            logger.warning("_fetch error [%s %s]: %s", method, path, e)
            return default if default is not None else {}

    # ── API pública ────────────────────────────────────────────────────────

    def get_station_list(self) -> list[dict]:
        """
        Devuelve la lista de plantas con KPIs embebidos (potencia actual,
        producción hoy, energía acumulada, estado).
        """
        data = self._fetch("POST", self._STATION_LIST, {
            "pageNo":   1,
            "pageSize": 100,
            "locale":   "es_ES",
        })

        raw = data.get("data", data)
        stations: list[dict] = []
        if isinstance(raw, dict):
            stations = raw.get("list", raw.get("pageList", []))
        elif isinstance(raw, list):
            stations = raw

        # Cachear datos por station_code para reutilizar en get_station_kpi
        for st in stations:
            code = st.get("stationCode") or st.get("stationDn", "")
            if code:
                self._station_cache[code] = st

        logger.debug("get_station_list: %d plantas", len(stations))
        return stations

    def get_station_kpi(self, station_code: str) -> dict:
        """
        KPIs en tiempo real. Si station_code está en la caché de station_list
        (que ya incluye currentPower / dayPower), devuelve esos datos directamente
        sin llamada extra. Si no, consulta el endpoint de KPI total.
        """
        cached = self._station_cache.get(station_code, {})
        # La respuesta de station-list incluye currentPower y dayPower directamente
        if cached.get("currentPower") is not None or cached.get("dayPower") is not None:
            return cached

        # Fallback: endpoint de KPI total (no por planta, sino global)
        ts_ms = int(time.time() * 1000)
        return self._safe_fetch(
            "GET",
            f"{self._TOTAL_KPI}?queryTime={ts_ms}&timeZone=2",
        ).get("data", {})

    def get_devices(self, station_code: str) -> list[dict]:
        data = self._safe_fetch("POST", self._DEV_LIST, {
            "stationCodes": station_code,
            "pageNo":   1,
            "pageSize": 100,
        }, default={"data": {}})
        raw = data.get("data", data)
        if isinstance(raw, dict):
            return raw.get("list", [])
        return raw or []

    def get_alarms(self, station_code: str) -> list[dict]:
        """
        Alarmas activas de una planta.
        El endpoint /fm/v1/statistic puede devolver alarmas globales o por planta
        según parámetros. Se filtra por station_code si viene en la respuesta.
        """
        data = self._safe_fetch(
            "GET",
            f"{self._ALARM_LIST}?stationCode={station_code}",
            default={"data": {}},
        )
        raw = data.get("data", data)
        alarms: list[dict] = []
        if isinstance(raw, dict):
            alarms = raw.get("list", raw.get("alarmList", []))
        elif isinstance(raw, list):
            alarms = raw
        return alarms

    def get_daily_kpi(self, station_code: str, day: date) -> dict:
        """Producción de un día concreto para una planta."""
        dt    = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc)
        ts_ms = int(dt.timestamp() * 1000)
        data  = self._safe_fetch("POST", self._DAILY_KPI, {
            "stationCodes": station_code,
            "collectTime":  ts_ms,
        }, default={})
        raw = data.get("data", data)
        if isinstance(raw, list):
            return raw[0] if raw else {}
        return raw or {}

    def close(self) -> None:
        try:
            if self._browser:
                self._browser.close()
        except Exception as e:
            logger.debug("browser.close() error: %s", e)
        try:
            if self._pw_ctx and self._pw:
                self._pw_ctx.__exit__(None, None, None)
        except Exception as e:
            logger.debug("playwright.__exit__() error: %s", e)
        self._browser = None
        self._page    = None
        self._pw      = None


# ─────────────────────────────────────────────────────────
# Cliente con storage state pre-extraído (sin login en CI)
# ─────────────────────────────────────────────────────────

class StorageStateClient(FusionSolarClient):
    """
    Cliente FusionSolar usando Playwright headless con storage state pre-extraído.

    Por qué Playwright y NO httpx:
      FusionSolar usa CloudWAF de Huawei que vincula las cookies al fingerprint TLS
      del browser (JA3/JA4). httpx tiene un fingerprint TLS diferente al de Chrome,
      por lo que CloudWAF rechaza las peticiones con 302 incluso desde la misma IP.
      Playwright headless usa el mismo engine Chromium → fingerprint TLS idéntico →
      CloudWAF acepta las peticiones.

    Flujo:
      1. extract_cookies.py (local, headful): login real → context.storage_state()
         → cifrado AES-256-GCM → guardado en fv_credenciales.session_cookies.
      2. sync_job.py (CI, headless): carga storage state → browser.new_context(
         storage_state=state) → navega al portal SIN login → API calls via
         page.evaluate(fetch(...)) exactamente como WebAuthClient.

    Las cookies WAF expiran en ~7-30 días. extract_cookies.py se re-ejecuta cuando
    sync_job detecta que el storage state ha expirado o es rechazado.
    """

    def __init__(self, base_url: str, storage_state: dict):
        import re
        from urllib.parse import urlparse
        self.base_url      = base_url.rstrip("/")
        self._storage      = storage_state   # dict con "cookies" + "origins"
        self._pw_ctx       = None
        self._pw           = None
        self._browser      = None
        self._context      = None   # BrowserContext — para context.request
        self._page         = None
        self._portal_url   = None   # URL final del portal (Referer en API calls)
        self._roarand      = None   # no usado (SPA no envía roarand)
        self._station_cache: dict[str, dict] = {}

        # API base URL: el SPA llama a eu5.fusionsolar.huawei.com/rest/...
        # pero el portal está en uni003eu5.fusionsolar.huawei.com.
        # Derivamos la API base quitando el prefijo "uniNNN" del subdominio.
        parsed = urlparse(self.base_url)
        api_host = re.sub(r'^uni\d+', '', parsed.hostname or '')
        self._api_base_url = f"{parsed.scheme}://{api_host}" if api_host else self.base_url
        if self._api_base_url != self.base_url:
            logger.info("API base URL: %s (portal: %s)", self._api_base_url, self.base_url)

    # Reutilizamos constantes de WebAuthClient
    _STATION_LIST = WebAuthClient._STATION_LIST
    _TOTAL_KPI    = WebAuthClient._TOTAL_KPI
    _ALARM_LIST   = WebAuthClient._ALARM_LIST
    _DEV_LIST     = WebAuthClient._DEV_LIST
    _DAILY_KPI    = WebAuthClient._DAILY_KPI

    # ── Diagnóstico de cookies ──────────────────────────────

    def _log_storage_state_info(self, state: dict) -> None:
        """Registra metadatos del storage state sin exponer valores secretos."""
        cookies = state.get("cookies", [])
        origins = state.get("origins", [])
        nombres  = [c["name"] for c in cookies]
        dominios = list({c.get("domain", "") for c in cookies})
        tiene_roarand  = "roarand"  in nombres
        tiene_jsess    = "JSESSIONID" in nombres
        tiene_waf      = any("HWWAFSESID" in n for n in nombres)
        tiene_dp_sess  = "dp-session" in nombres

        logger.info("  Cookies (%d): %s", len(cookies), nombres)
        logger.info("  Dominios:     %s", dominios)
        logger.info("  roarand: %s | JSESSIONID: %s | HWWAF: %s | dp-session: %s",
                    tiene_roarand, tiene_jsess, tiene_waf, tiene_dp_sess)
        if not tiene_roarand:
            logger.warning("  ADVERTENCIA: cookie 'roarand' (CSRF) ausente — "
                           "puede causar rechazo en endpoints POST.")
        for origin in origins:
            keys = [item["name"] for item in origin.get("localStorage", [])]
            if keys:
                logger.info("  localStorage [%s]: %s", origin.get("origin","?"), keys)

    # Prefixes que resuelven al dominio eu5 (auth/config/infra compartida).
    # TODO: extender si se descubren más endpoints eu5 usados por el sync.
    _EU5_PREFIXES = (
        "/rest/pvms/web/demouser/",
        "/rest/pvms/security/",
        "/rest/pvms/web/publicapp/",
        "/rest/pvms/web/server/",
    )

    def _url_for_endpoint(self, path: str) -> str:
        """Devuelve la URL completa para un endpoint FusionSolar.

        FusionSolar EU5 usa dos origins:
          eu5.fusionsolar.huawei.com   → auth / config / infra compartida
          uni003eu5.fusionsolar.huawei.com → datos de plantas (station, device, kpi, alarms)

        Regla: los paths en _EU5_PREFIXES van a _api_base_url (eu5),
               el resto va a base_url (uni003eu5).
        Si el path ya es una URL completa, se devuelve tal cual.
        """
        if path.startswith("http"):
            return path
        for prefix in self._EU5_PREFIXES:
            if path.startswith(prefix):
                return self._api_base_url + path
        return self.base_url + path

    def _api_headers(self) -> dict:
        """Headers exactos que usa el SPA de FusionSolar en sus llamadas REST.
        Capturados mediante page.on('request') en extract_cookies.py (2026-05-11).

        Campos obligatorios descubiertos:
          roarand              — token CSRF inyectado por el SPA como header (no cookie)
          x-non-renewal-session — "true" en todos los POSTs del SPA
          x-timezone-offset    — offset UTC en minutos (120 = UTC+2, Europa/Madrid verano)
          accept               — "application/json, text/javascript, */*; q=0.01"
        """
        headers: dict = {
            "Content-Type":           "application/json",
            "X-Requested-With":       "XMLHttpRequest",
            "X-Non-Renewal-Session":  "true",
            "X-Timezone-Offset":      "120",
            "Referer":                self._portal_url or f"{self.base_url}/uniportal/",
            "Accept":                 "application/json, text/javascript, */*; q=0.01",
        }
        if self._roarand:
            headers["roarand"] = self._roarand
        return headers

    def check_session(self) -> str:
        """
        Verifica si la sesión sigue activa usando un endpoint ligero.
        Usa el api_base_url real (eu5.fusionsolar.huawei.com) capturado del SPA.
        Devuelve: OK | AUTH_REDIRECT | NON_JSON_RESPONSE | HTTP_ERROR | EXCEPTION
        """
        # check-guest está en eu5 (demouser = prefix EU5) — _url_for_endpoint lo resuelve
        url = self._url_for_endpoint("/rest/pvms/web/demouser/v1/check-guest")
        logger.info("check_session → GET %s", url)
        try:
            resp = self._context.request.get(
                url,
                headers=self._api_headers(),
            )
            final_url = resp.url
            ct = resp.headers.get("content-type", "")
            status_code = resp.status

            if "login" in final_url or "unisso" in final_url:
                logger.warning("check_session → AUTH_REDIRECT a %s", final_url)
                return "AUTH_REDIRECT"
            if "json" not in ct:
                preview = resp.text()[:200]
                logger.warning("check_session → NON_JSON HTTP %s | ct=%s | preview: %s",
                               status_code, ct, preview)
                return "NON_JSON_RESPONSE"
            if not resp.ok:
                logger.warning("check_session → HTTP_ERROR %s", status_code)
                return "HTTP_ERROR"

            logger.info("check_session → OK (HTTP %s)", status_code)
            return "OK"
        except Exception as e:
            logger.error("check_session → EXCEPTION: %s", e)
            return "EXCEPTION"

    # ── Login ───────────────────────────────────────────────

    def login(self) -> None:
        """
        Inicializa un browser headless con el storage state pre-extraído.
        Navega directamente al portal (sin pasar por la pantalla de login).
        Lanza FusionSolarAuthError si la sesión es rechazada.
        """
        from playwright.sync_api import sync_playwright

        self._pw_ctx = sync_playwright()
        self._pw     = self._pw_ctx.__enter__()

        self._browser = self._pw.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
            ],
        )

        # Normalizar formato: acepta lista legacy (solo cookies) o dict completo
        if isinstance(self._storage, list):
            state_to_load = {"cookies": self._storage, "origins": []}
        else:
            state_to_load = self._storage

        n_cookies = len(state_to_load.get("cookies", []))
        n_origins = len(state_to_load.get("origins", []))
        logger.info("StorageStateClient: %d cookies, %d origenes localStorage", n_cookies, n_origins)
        self._log_storage_state_info(state_to_load)

        context = self._browser.new_context(
            storage_state=state_to_load,
            viewport={"width": 1280, "height": 720},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        self._context   = context   # guardamos para usar context.request en _fetch
        self._portal_url = None     # URL del portal tras navegación (Referer)
        self._roarand    = None     # token CSRF (cookie roarand leída post-navegación)
        self._page = context.new_page()

        # ── Captura de requests del SPA para diagnóstico y extracción de roarand ──
        # roarand es un token CSRF que FusionSolar inyecta como request header
        # (no como cookie). El SPA lo obtiene del servidor tras el login y lo
        # almacena en memoria JS — no es accesible via document.cookie ni window.
        # Capturamos el valor de los headers de los requests reales del SPA.
        _captured_spa_requests: list[dict] = []
        _roarand_found: list[str] = []   # lista para poder mutar en closure

        def _on_spa_request(request):
            url = request.url
            if "/rest/pvms/" in url or "/rest/fo/" in url:
                headers = dict(request.headers)
                _captured_spa_requests.append({
                    "method": request.method,
                    "url":    url,
                })
                rr = headers.get("roarand")
                if rr and not _roarand_found:
                    _roarand_found.append(rr)

        self._page.on("request", _on_spa_request)

        # Navegar a la raíz del portal. Con el storage state cargado el servidor
        # debería ir directamente a /uniportal/... sin pasar por el login.
        # NO usamos una URL hardcodeada de nologin.html (podría no existir).
        logger.info("Navegando a %s (esperando redirect directo a /uniportal/...)", self.base_url)
        try:
            self._page.goto(self.base_url + "/", wait_until="domcontentloaded", timeout=30_000)
        except Exception as nav_err:
            logger.warning("goto() excepción (puede ser timeout en networkidle): %s", nav_err)

        current_url = self._page.url
        logger.info("URL tras navegación: %s", current_url)

        if "login" in current_url.lower() or "unisso" in current_url.lower():
            # Hacer screenshot de diagnóstico si estamos en CI
            try:
                import os
                shot = os.path.join(os.getcwd(), "playwright_auth_fail.png")
                self._page.screenshot(path=shot, full_page=False)
                logger.info("Screenshot guardado: %s", shot)
            except Exception:
                pass
            raise FusionSolarAuthError(
                reason="Storage state rechazado — redirigido a login",
                redirect_url=current_url,
            )

        logger.info("StorageStateClient: portal OK. URL: %s", current_url)
        self._portal_url = current_url   # usado como Referer en context.request

        # Esperar a que el SPA inicialice. El servidor setea roarand CSRF tras el
        # page load — necesitamos networkidle para que el cookie aparezca en el jar.
        try:
            self._page.wait_for_load_state("networkidle", timeout=15_000)
            logger.info("StorageStateClient: networkidle OK")
        except Exception:
            logger.warning("networkidle timeout — esperando 4s adicionales")
            self._page.wait_for_timeout(4_000)

        # ── DIAGNÓSTICO: requests del SPA capturadas en headless ───────────
        logger.info("=== REQUESTS SPA en headless (%d) ===", len(_captured_spa_requests))
        for r in _captured_spa_requests:
            logger.info("  [SPA] %s %s", r["method"], r["url"])

        # Extraer roarand de los headers capturados del SPA.
        # roarand NO está en cookies — el SPA lo gestiona como header CSRF en memoria.
        if _roarand_found:
            self._roarand = _roarand_found[0]
            logger.info("roarand capturado del SPA ✅ (%s...)", self._roarand[:8])
        else:
            self._roarand = None
            logger.warning(
                "roarand NO capturado del SPA — el SPA no hizo ninguna llamada autenticada "
                "durante la inicialización. Los POSTs podrían fallar."
            )

        # Verificación rápida de sesión via context.request (ya con SPA inicializado)
        session_status = self.check_session()
        if session_status == "AUTH_REDIRECT":
            raise FusionSolarAuthError(
                reason="check_session confirma redirect a login tras navegación",
                redirect_url=current_url,
            )
        if session_status in ("NON_JSON_RESPONSE", "HTTP_ERROR"):
            logger.warning("check_session=%s — continuando (puede ser transitorio)", session_status)

    # ── Fetch via Playwright context.request (estrategia principal) ────────
    # Usa el cliente HTTP nativo de Playwright en lugar de page.evaluate(fetch()).
    # Ventajas sobre page.evaluate:
    #   - No sujeto a CSP/CORS ni a service workers del SPA
    #   - Usa las cookies del contexto (incluidas HttpOnly: JSESSIONID, roarand…)
    #   - Fingerprint TLS = Chrome (CloudWAF de Huawei lo acepta)
    #   - No requiere que el SPA esté inicializado

    def _fetch(self, method: str, path: str, payload: Any = None) -> Any:
        """
        Petición HTTP usando context.request (Playwright APIRequestContext).
        Detecta redirects a login, respuestas no-JSON y errores HTTP.
        Lanza FusionSolarAuthError o FusionSolarResponseError.
        """
        import json as _json
        url = self._url_for_endpoint(path)
        m   = method.upper()

        # Diagnóstico
        logger.debug("_fetch %s %s (payload=%s)", m, url, payload is not None)

        try:
            if m == "GET":
                resp = self._context.request.get(
                    url,
                    headers=self._api_headers(),
                )
            else:
                resp = self._context.request.post(
                    url,
                    headers=self._api_headers(),
                    data=_json.dumps(payload) if payload is not None else "{}",
                )
        except Exception as e:
            logger.error("_fetch %s %s — context.request excepción: %s", m, url, e)
            raise FusionSolarResponseError(status=0, body_preview=str(e), endpoint=url)

        final_url   = resp.url
        ct          = resp.headers.get("content-type", "")
        status_code = resp.status

        logger.debug("_fetch %s %s → HTTP %s ct=%s finalUrl=%s",
                     m, url, status_code, ct, final_url)

        # Redirect a login → sesión expirada
        if "login" in final_url or "unisso" in final_url:
            raise FusionSolarAuthError(
                reason="API redirigida a login (sesión expirada o rechazada)",
                redirect_url=final_url,
                endpoint=url,
            )

        # Respuesta no-JSON
        if "json" not in ct:
            preview = resp.text()[:300]
            logger.warning("_fetch NON_JSON HTTP %s | ct=%s | preview: %s",
                           status_code, ct, preview)
            raise FusionSolarResponseError(
                status=status_code, body_preview=preview, endpoint=url,
            )

        # Error HTTP con JSON (FusionSolar devuelve errores estructurados)
        if not resp.ok:
            try:
                body = resp.json()
            except Exception:
                body = {}
            logger.warning("_fetch HTTP_ERROR %s | body: %s", status_code, str(body)[:200])
            raise FusionSolarResponseError(
                status=status_code, body_preview=str(body)[:200], endpoint=url,
            )

        return resp.json()

    def _safe_fetch(self, method: str, path: str, payload: Any = None, default: Any = None) -> Any:
        try:
            return self._fetch(method, path, payload)
        except (FusionSolarAuthError, FusionSolarResponseError):
            raise   # propagar errores conocidos para que sync_job los trate
        except Exception as e:
            logger.warning("_fetch error [%s %s]: %s", method, path, e)
            return default if default is not None else {}

    def get_station_list(self) -> list[dict]:
        # Body exacto capturado del SPA (2026-05-11):
        # curPage (no pageNo), queryTime = medianoche del día actual en el portal,
        # timeZone = 2 (UTC+2, Europa/Madrid verano).
        # pageSize 100 para obtener todas las plantas en una sola llamada.
        ts_ms = int(datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        ).timestamp() * 1000)
        data = self._fetch("POST", self._STATION_LIST, {
            "curPage":           1,
            "pageSize":          100,
            "gridConnectedTime": "",
            "queryTime":         ts_ms,
            "timeZone":          2,
            "sortId":            "createTime",
            "sortDir":           "DESC",
            "locale":            "es_ES",
        })
        raw = data.get("data", data)
        stations: list[dict] = []
        if isinstance(raw, dict):
            stations = raw.get("list", raw.get("pageList", []))
        elif isinstance(raw, list):
            stations = raw
        for st in stations:
            code = st.get("stationCode") or st.get("stationDn", "")
            if code:
                self._station_cache[code] = st
        logger.debug("get_station_list: %d plantas", len(stations))
        return stations

    def get_station_kpi(self, station_code: str) -> dict:
        cached = self._station_cache.get(station_code, {})
        if cached.get("currentPower") is not None or cached.get("dayPower") is not None:
            return cached
        ts_ms = int(time.time() * 1000)
        return self._safe_fetch(
            "GET", f"{self._TOTAL_KPI}?queryTime={ts_ms}&timeZone=2"
        ).get("data", {})

    def get_devices(self, station_code: str) -> list[dict]:
        data = self._safe_fetch("POST", self._DEV_LIST, {
            "stationCodes": station_code, "pageNo": 1, "pageSize": 100,
        }, default={"data": {}})
        raw = data.get("data", data)
        if isinstance(raw, dict):
            return raw.get("list", [])
        return raw or []

    def get_alarms(self, station_code: str) -> list[dict]:
        data = self._safe_fetch(
            "GET", f"{self._ALARM_LIST}?stationCode={station_code}",
            default={"data": {}},
        )
        raw = data.get("data", data)
        alarms: list[dict] = []
        if isinstance(raw, dict):
            alarms = raw.get("list", raw.get("alarmList", []))
        elif isinstance(raw, list):
            alarms = raw
        return alarms

    def get_daily_kpi(self, station_code: str, day: date) -> dict:
        dt    = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc)
        ts_ms = int(dt.timestamp() * 1000)
        data  = self._safe_fetch("POST", self._DAILY_KPI, {
            "stationCodes": station_code, "collectTime": ts_ms,
        }, default={})
        raw = data.get("data", data)
        if isinstance(raw, list):
            return raw[0] if raw else {}
        return raw or {}

    def close(self) -> None:
        try:
            if self._browser:
                self._browser.close()
        except Exception as e:
            logger.debug("browser.close() error: %s", e)
        try:
            if self._pw_ctx and self._pw:
                self._pw_ctx.__exit__(None, None, None)
        except Exception as e:
            logger.debug("playwright.__exit__() error: %s", e)
        self._browser = None
        self._page    = None
        self._pw      = None


# ─────────────────────────────────────────────────────────
# Factory
# ─────────────────────────────────────────────────────────

def make_client(
    plataforma: str,
    base_url: str,
    username: str,
    password: str,
    storage_state: dict | None = None,
) -> FusionSolarClient:
    """
    Crea el cliente correcto según la plataforma y el modo de autenticación.

    Args:
        plataforma:    "fusionsolar" (unico implementado)
        base_url:      URL del portal (ej. https://uni003eu5.fusionsolar.huawei.com)
        username:      Usuario del portal
        password:      Contrasena en claro (ya descifrada)
        storage_state: Storage state completo de Playwright (cookies + localStorage).
                       Si se proporciona → StorageStateClient (Playwright headless sin login).
                       Si None → WebAuthClient (Playwright login headless completo).

    Nota: httpx (CookieAuthClient) no funciona con FusionSolar porque CloudWAF
    verifica el fingerprint TLS del cliente. Playwright replica el fingerprint de
    Chrome, httpx no. Por eso ambos modos usan Playwright.
    """
    if plataforma != "fusionsolar":
        raise NotImplementedError(f"Plataforma '{plataforma}' no implementada aun")

    if storage_state:
        logger.info(
            "make_client: usando StorageStateClient (storage state pre-extraido, sin login en CI)"
        )
        return StorageStateClient(base_url, storage_state)

    logger.info("make_client: usando WebAuthClient (Playwright login headless)")
    return WebAuthClient(base_url, username, password)
