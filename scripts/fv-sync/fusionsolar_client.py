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
        self.base_url      = base_url.rstrip("/")
        self._storage      = storage_state   # dict con "cookies" + "origins"
        self._pw_ctx       = None
        self._pw           = None
        self._browser      = None
        self._page         = None
        self._station_cache: dict[str, dict] = {}

    # Reutilizamos constantes de WebAuthClient
    _STATION_LIST = WebAuthClient._STATION_LIST
    _TOTAL_KPI    = WebAuthClient._TOTAL_KPI
    _ALARM_LIST   = WebAuthClient._ALARM_LIST
    _DEV_LIST     = WebAuthClient._DEV_LIST
    _DAILY_KPI    = WebAuthClient._DAILY_KPI

    def login(self) -> None:
        """
        Inicializa un browser headless con el storage state pre-extraído.
        Navega directamente al portal (sin pasar por la pantalla de login).
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

        # Inyectar storage state directamente en el contexto del browser.
        # Esto restaura cookies + localStorage sin necesidad de hacer login.
        # storage_state puede ser dict (nuevo formato) o list (formato legacy
        # con solo cookies → convertir automáticamente).
        if isinstance(self._storage, list):
            # Formato legacy: lista plana de cookies
            state_to_load = {"cookies": self._storage, "origins": []}
        else:
            state_to_load = self._storage

        n_cookies = len(state_to_load.get("cookies", []))
        n_origins = len(state_to_load.get("origins", []))
        logger.info(
            "StorageStateClient: cargando %d cookies + %d origenes localStorage",
            n_cookies, n_origins,
        )

        context = self._browser.new_context(
            storage_state=state_to_load,
            viewport={"width": 1280, "height": 720},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        self._page = context.new_page()

        # Navegar directamente al portal (no a la página de login).
        # Con el storage state cargado, el browser ya está autenticado.
        portal_url = self.base_url + "/uniportal/pvmswebsite/nologin.html"
        logger.info("Navegando al portal sin login: %s", portal_url)
        self._page.goto(portal_url, wait_until="domcontentloaded", timeout=30_000)

        # Verificar que no nos redirigió al login
        current_url = self._page.url
        if "login" in current_url.lower() or "unisso" in current_url.lower():
            raise RuntimeError(
                f"Storage state rechazado — redirigido a login: {current_url}. "
                "Ejecuta extract_cookies.py para renovar el storage state."
            )

        logger.info("StorageStateClient: portal cargado OK. URL: %s", current_url)

        # Esperar un poco para que el SPA inicialice
        try:
            self._page.wait_for_load_state("networkidle", timeout=15_000)
        except Exception:
            self._page.wait_for_timeout(3_000)

    def _fetch(self, method: str, path: str, payload: Any = None) -> Any:
        """
        Igual que WebAuthClient._fetch(): ejecuta fetch() en el contexto del browser.
        Las cookies y el fingerprint TLS son los de Chrome → CloudWAF los acepta.
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
        try:
            return self._fetch(method, path, payload)
        except Exception as e:
            logger.warning("_fetch error [%s %s]: %s", method, path, e)
            return default if default is not None else {}

    def get_station_list(self) -> list[dict]:
        data = self._fetch("POST", self._STATION_LIST, {
            "pageNo": 1, "pageSize": 100, "locale": "es_ES",
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
