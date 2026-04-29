"""
fusionsolar_client.py — Cliente FusionSolar con dos implementaciones intercambiables.

- WebAuthClient  → usa credenciales web normales (modo actual)
- NorthboundClient → usa usuario Northbound oficial de Huawei (migración futura)

Ambos exponen el mismo interfaz:
    client.get_station_list()      → list[dict]
    client.get_station_kpi(code)   → dict
    client.get_devices(code)       → list[dict]
    client.get_alarms(code)        → list[dict]
    client.get_daily_kpi(code, date) → dict
"""

import logging
import time
from abc import ABC, abstractmethod
from datetime import date
from typing import Any

import httpx

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────
# Interfaz abstracta
# ─────────────────────────────────────────────────────────

class FusionSolarClient(ABC):
    """Interfaz común para cualquier implementación de cliente FusionSolar."""

    @abstractmethod
    def login(self) -> None:
        """Autentica la sesión. Lanza excepción si falla."""

    @abstractmethod
    def get_station_list(self) -> list[dict]:
        """Devuelve lista de plantas: [{'stationCode', 'stationName', 'capacity', 'status', ...}]"""

    @abstractmethod
    def get_station_kpi(self, station_code: str) -> dict:
        """KPIs en tiempo real: {'currentPower', 'dayPower', 'monthPower', 'totalPower', 'dayIncome'}"""

    @abstractmethod
    def get_devices(self, station_code: str) -> list[dict]:
        """Lista de dispositivos: [{'devSn', 'devName', 'devTypeId', 'softVer', 'runState'}]"""

    @abstractmethod
    def get_alarms(self, station_code: str) -> list[dict]:
        """Alarmas activas: [{'alarmId', 'alarmCode', 'alarmDesc', 'severity', 'raiseTime'}]"""

    @abstractmethod
    def get_daily_kpi(self, station_code: str, day: date) -> dict:
        """Producción de un día: {'energy': float, 'incomeDay': float}"""


# ─────────────────────────────────────────────────────────
# Implementación 1: Web Auth (scraping autenticado)
# ─────────────────────────────────────────────────────────

class WebAuthClient(FusionSolarClient):
    """
    Autenticación con credenciales web normales del portal FusionSolar.
    Usa cookies de sesión + cabecera roarand.

    Ventaja: funciona con las credenciales que ya nos dieron los clientes.
    Riesgo: los endpoints internos pueden cambiar sin aviso.
    """

    # Endpoints internos identificados via inspección de red
    _STATION_LIST   = "/rest/pvms/web/station/v1/station/station-list"
    _TOTAL_KPI      = "/rest/pvms/web/station/v1/station/total-real-kpi"
    _STATUS_COUNT   = "/rest/pvms/web/station/v1/station/station-status-count"
    _ALARM_LIST     = "/rest/pvms/fm/v1/statistic"
    _DEV_LIST       = "/rest/pvms/web/device/v1/device-list"
    _DAILY_KPI      = "/rest/pvms/web/station/v1/station/day-real-kpi"

    def __init__(self, base_url: str, username: str, password: str, timeout: int = 30):
        self.base_url = base_url.rstrip("/")
        self.username = username
        self.password = password
        self.timeout  = timeout
        self._client: httpx.Client | None = None
        self._token: str = ""

    # ── Autenticación ──────────────────────────────────────

    def login(self) -> None:
        """Realiza login web y guarda la sesión en self._client."""
        import re as _re

        # Usamos un cliente SIN base_url para poder POST a URLs absolutas del form action
        self._client = httpx.Client(
            timeout=self.timeout,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; ValereCRM/1.0)"},
        )

        # Paso 1: GET la raíz del portal — los redirects establecen sesión completa
        # y nos llevan a la página de login con service= y jsessionid ya en la URL.
        # Para eu5.fusionsolar.huawei.com esto produce:
        #   GET / → 302 → /unisso/login.action;jsessionid=XXX?service=...
        resp = self._client.get(self.base_url + "/")
        resp.raise_for_status()

        login_url = str(resp.url)   # URL final tras redirects (absoluta)
        html      = resp.text
        roarand   = self._client.cookies.get("roarand", "")

        is_unisso = "unisso" in login_url or "unisso" in html[:2000]

        if is_unisso:
            # Flujo CAS UNISSO
            # Extraer action del form — es una URL absoluta o relativa con jsessionid+service
            form_action_match = _re.search(
                r'<form[^>]+action=["\']([^"\']+)["\']', html, _re.IGNORECASE
            )
            raw_action = form_action_match.group(1) if form_action_match else login_url

            # Resolver URL relativa → absoluta
            if raw_action.startswith("http"):
                form_action = raw_action
            elif raw_action.startswith("/"):
                form_action = self.base_url + raw_action
            else:
                # relativa sin / → relativa al directorio actual
                base_dir = login_url.rsplit("/", 1)[0]
                form_action = base_dir + "/" + raw_action

            # Extraer TODOS los <input type="hidden"> de forma robusta
            hidden_fields: dict[str, str] = {}
            for tag_match in _re.finditer(r'<input[^>]+>', html, _re.IGNORECASE):
                tag = tag_match.group(0)
                if 'hidden' not in tag.lower():
                    continue
                name_m  = _re.search(r'name=["\']([^"\']+)["\']',  tag, _re.IGNORECASE)
                value_m = _re.search(r'value=["\']([^"\']*)["\']', tag, _re.IGNORECASE)
                if name_m:
                    hidden_fields[name_m.group(1)] = value_m.group(1) if value_m else ""

            form_data = {
                **hidden_fields,
                "username": self.username,
                "password": self.password,
            }
            if "_eventId" not in form_data:
                form_data["_eventId"] = "submit"

            logger.debug("CAS form action: %s", form_action)
            logger.debug("CAS hidden fields: %s", list(hidden_fields.keys()))

            # POST a la URL absoluta del form action
            resp2 = self._client.post(
                form_action,
                data=form_data,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Referer": login_url,
                    **({"roarand": roarand} if roarand else {}),
                },
            )
            # CAS devuelve 302 → portal si login OK; 200 → misma página si falla
            if resp2.status_code not in (200, 302):
                raise RuntimeError(f"FusionSolar UNISSO login fallido: HTTP {resp2.status_code}")
            # Verificar que no seguimos en la página de login (indica credenciales incorrectas)
            final_url = str(resp2.url)
            if "unisso/login" in final_url and resp2.status_code == 200:
                raise RuntimeError(
                    "FusionSolar UNISSO login fallido: credenciales incorrectas "
                    f"(redirigido a {final_url})"
                )
            roarand = self._client.cookies.get("roarand", roarand)
        else:
            # Flujo antiguo JSON (portales uni003eu5, etc.)
            payload = {"userName": self.username, "value": self.password}
            headers = {"roarand": roarand} if roarand else {}
            resp2 = self._client.post(
                self.base_url + "/rest/neteco/oauthserver/account/authorize",
                json=payload,
                headers=headers,
            )
            resp2.raise_for_status()
            body = resp2.json()
            if body.get("failCode") not in (None, 0, "0", ""):
                raise RuntimeError(f"FusionSolar login fallido: {body}")

        # Guardar token anti-CSRF para las llamadas siguientes
        self._token = self._client.cookies.get("roarand", roarand)
        logger.info("FusionSolar login OK para %s@%s", self.username, self.base_url)

    def _headers(self) -> dict:
        return {"roarand": self._token} if self._token else {}

    def _url(self, path: str) -> str:
        """Convierte path relativo en URL absoluta usando base_url."""
        if path.startswith("http"):
            return path
        return self.base_url + path

    def _get(self, path: str, params: dict | None = None) -> Any:
        assert self._client, "Debes llamar a login() primero"
        resp = self._client.get(self._url(path), params=params, headers=self._headers())
        resp.raise_for_status()
        body = resp.json()
        # FusionSolar devuelve {"success": true/false, "data": ...} en endpoints internos
        if isinstance(body, dict) and body.get("success") is False:
            raise RuntimeError(f"FusionSolar error en {path}: {body.get('failCode')} — {body.get('message')}")
        return body

    def _post(self, path: str, payload: dict | None = None) -> Any:
        assert self._client, "Debes llamar a login() primero"
        resp = self._client.post(self._url(path), json=payload or {}, headers=self._headers())
        resp.raise_for_status()
        body = resp.json()
        if isinstance(body, dict) and body.get("success") is False:
            raise RuntimeError(f"FusionSolar error en {path}: {body.get('failCode')} — {body.get('message')}")
        return body

    # ── Datos ──────────────────────────────────────────────

    def get_station_list(self) -> list[dict]:
        body = self._post(self._STATION_LIST, {"pageNo": 1, "pageSize": 100})
        stations = body.get("data", {})
        if isinstance(stations, dict):
            stations = stations.get("list", [])
        return stations or []

    def get_station_kpi(self, station_code: str) -> dict:
        ts_ms = int(time.time() * 1000)
        body = self._get(self._TOTAL_KPI, {
            "stationCodes": station_code,
            "queryTime": ts_ms,
            "timeZone": 2,   # UTC+2 (España verano)
        })
        data = body.get("data", {})
        if isinstance(data, list):
            data = data[0] if data else {}
        return data

    def get_devices(self, station_code: str) -> list[dict]:
        body = self._post(self._DEV_LIST, {
            "stationCodes": station_code,
            "pageNo": 1,
            "pageSize": 200,
        })
        data = body.get("data", {})
        if isinstance(data, dict):
            return data.get("list", [])
        return data or []

    def get_alarms(self, station_code: str) -> list[dict]:
        body = self._get(self._ALARM_LIST, {
            "stationCodes": station_code,
            "alarmType": 1,  # 1 = activas
        })
        data = body.get("data", [])
        return data if isinstance(data, list) else []

    def get_daily_kpi(self, station_code: str, day: date) -> dict:
        ts_ms = int(time.mktime(day.timetuple()) * 1000)
        body = self._get(self._DAILY_KPI, {
            "stationCodes": station_code,
            "collectTime": ts_ms,
        })
        data = body.get("data", {})
        if isinstance(data, list):
            data = data[0] if data else {}
        return data

    def close(self):
        if self._client:
            self._client.close()


# ─────────────────────────────────────────────────────────
# Implementación 2: Northbound API (migración futura)
# ─────────────────────────────────────────────────────────

class NorthboundClient(FusionSolarClient):
    """
    Cliente oficial Northbound API de FusionSolar (/thirdData/).
    Requiere usuario de tipo "Northbound" creado por el cliente en su portal.

    Documentación Huawei: https://support.huawei.com/enterprise/...
    Token válido ~30 min → renovación automática.
    """

    _LOGIN     = "/thirdData/login"
    _STATIONS  = "/thirdData/getStationList"
    _REAL_KPI  = "/thirdData/getStationRealKpi"
    _DAY_KPI   = "/thirdData/getKpiStationDay"
    _DEVICES   = "/thirdData/getDevList"
    _ALARMS    = "/thirdData/getAlarmList"

    def __init__(self, base_url: str, username: str, system_code: str, timeout: int = 30):
        self.base_url    = base_url.rstrip("/")
        self.username    = username
        self.system_code = system_code   # systemCode = contraseña Northbound
        self.timeout     = timeout
        self._client: httpx.Client | None = None
        self._xsrf: str = ""

    def login(self) -> None:
        self._client = httpx.Client(base_url=self.base_url, timeout=self.timeout)
        resp = self._client.post(self._LOGIN, json={
            "userName": self.username,
            "systemCode": self.system_code,
        })
        resp.raise_for_status()
        body = resp.json()
        if body.get("success") is False:
            raise RuntimeError(f"Northbound login fallido: {body.get('failCode')}")
        self._xsrf = resp.cookies.get("XSRF-TOKEN", "")
        logger.info("FusionSolar Northbound login OK para %s", self.username)

    def _post(self, path: str, payload: dict) -> Any:
        assert self._client, "Debes llamar a login() primero"
        resp = self._client.post(path, json=payload,
                                 headers={"XSRF-TOKEN": self._xsrf})
        resp.raise_for_status()
        body = resp.json()
        if body.get("success") is False:
            # Código 407 = token expirado → renovar y reintentar una vez
            if body.get("failCode") == 407:
                logger.warning("Token Northbound expirado, renovando...")
                self.login()
                resp = self._client.post(path, json=payload,
                                         headers={"XSRF-TOKEN": self._xsrf})
                resp.raise_for_status()
                body = resp.json()
        return body.get("data", {})

    def get_station_list(self) -> list[dict]:
        data = self._post(self._STATIONS, {})
        return data if isinstance(data, list) else []

    def get_station_kpi(self, station_code: str) -> dict:
        data = self._post(self._REAL_KPI, {"stationCodes": station_code})
        if isinstance(data, list):
            return data[0] if data else {}
        return data or {}

    def get_devices(self, station_code: str) -> list[dict]:
        data = self._post(self._DEVICES, {"stationCodes": station_code})
        return data if isinstance(data, list) else []

    def get_alarms(self, station_code: str) -> list[dict]:
        data = self._post(self._ALARMS, {
            "stationCodes": station_code,
            "beginTime": 0,
            "endTime": int(time.time() * 1000),
        })
        return data if isinstance(data, list) else []

    def get_daily_kpi(self, station_code: str, day: date) -> dict:
        ts_ms = int(time.mktime(day.timetuple()) * 1000)
        data = self._post(self._DAY_KPI, {
            "stationCodes": station_code,
            "collectTime": ts_ms,
        })
        if isinstance(data, list):
            return data[0] if data else {}
        return data or {}

    def close(self):
        if self._client:
            self._client.close()


# ─────────────────────────────────────────────────────────
# Factory
# ─────────────────────────────────────────────────────────

def make_client(
    plataforma: str,
    base_url: str,
    username: str,
    password: str,
    mode: str = "web",
) -> FusionSolarClient:
    """
    Crea el cliente correcto según plataforma y modo.

    Args:
        plataforma: 'fusionsolar' | 'goodwe' | ...  (solo fusionsolar implementado)
        base_url:   URL base del portal (ej. 'https://uni003eu5.fusionsolar.huawei.com')
        username:   usuario del portal
        password:   contraseña en claro (ya descifrada por crypto.py)
        mode:       'web' → WebAuthClient | 'northbound' → NorthboundClient
    """
    if plataforma != "fusionsolar":
        raise NotImplementedError(f"Plataforma '{plataforma}' no implementada aún")

    if mode == "northbound":
        return NorthboundClient(base_url, username, password)
    return WebAuthClient(base_url, username, password)
