"""
sync_job.py — Orquestador principal de sincronización FV.

Flujo:
  1. Lee fv_credenciales activas de Supabase (con JOIN a fv_credenciales_secret).
  2. Por cada credencial: login con Playwright, sincroniza plantas.
  3. Guarda en: fv_planta, fv_kpi_realtime, fv_kpi_diario, fv_alarma.
  4. Si hay plantas caídas o alarmas críticas/mayores → email a JOLIVARES via Resend.
  5. Los lunes → genera resúmenes semanales en fv_resumen_semanal.
  6. El día 1 de cada mes → crea borrador de informe mensual en fv_informe_mensual.
  7. Escribe registro en fv_sync_log.

Uso:
    python sync_job.py                    # Todos los clientes activos
    python sync_job.py --empresa <uuid>   # Solo una empresa
    python sync_job.py --dry-run          # Sin escritura en BD
    python sync_job.py --check-secrets    # Diagnóstico: verifica que cada credencial
                                          # tiene fila en fv_credenciales_secret

CAMBIO COORDINADO (2026-05-10):
    Los secretos (password_enc, session_cookies, cookies_expires_at) se leen de
    fv_credenciales_secret, no de fv_credenciales. Este cambio DEBE desplegarse junto
    con la migración SQL 20260510_fv_alta_manual_credenciales.sql y la Edge Function
    fv-create-credential. NO ejecutar sync_job.py contra Supabase producción hasta que
    la migración esté aplicada.

Integración futura con incidencias CRM:
    TODO: INCIDENCIAS_CRM — cuando una alarma crítica/mayor persiste más de 24h,
    crear automáticamente una incidencia en la tabla `incidencias` del CRM con
    empresa_id, descripción y enlace a la planta. Hablar con Juan para definir
    el flujo de asignación y resolución.
"""

import argparse
import json
import logging
import os
import sys
import time
from collections import defaultdict
from datetime import date, timedelta, timezone, datetime

# Cargar .env automáticamente si existe (dev local; en GitHub Actions las vars vienen del entorno)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv no instalado — se usan las vars del entorno directamente

from supabase import create_client, Client

from crypto import decrypt_password
from fusionsolar_client import make_client, FusionSolarClient, FusionSolarAuthError, FusionSolarResponseError

# ─────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("fv_sync")


# ─────────────────────────────────────────────────────────
# Normalización
# ─────────────────────────────────────────────────────────

_SEVERITY_MAP = {
    "1": "critica",   "critical": "critica",   "critica": "critica",
    "2": "mayor",     "major": "mayor",         "mayor": "mayor",
    "3": "menor",     "minor": "menor",         "menor": "menor",
    "4": "advertencia", "warning": "advertencia", "advertencia": "advertencia",
}

def normalize_severity(raw) -> str:
    return _SEVERITY_MAP.get(str(raw).lower(), "desconocida")

def normalize_status(raw) -> str:
    s = str(raw).lower()
    if s in ("0", "normal", "ok", "running", "1", "connected", "on-grid"): return "normal"
    if s in ("2", "fault", "error", "defectuoso", "faulty"):               return "defectuoso"
    if s in ("3", "offline", "disconnected", "desconectado", "off-grid"):  return "desconectado"
    return "desconocido"


# ─────────────────────────────────────────────────────────
# Carga de credenciales con secretos (JOIN a tabla secreta)
# ─────────────────────────────────────────────────────────

def load_fv_credentials_with_secrets(
    sb: Client,
    empresa_filter: str | None = None,
) -> list[dict]:
    """
    Carga credenciales activas de fv_credenciales incluyendo sus secretos
    de fv_credenciales_secret mediante un JOIN de PostgREST.

    Retorna una lista de dicts donde cada item incluye una clave '_secret'
    con {password_enc, session_cookies, cookies_expires_at} o None si la
    credencial no tiene fila en fv_credenciales_secret (configuración incompleta).

    SEGURIDAD: este script usa service_role (SUPABASE_SERVICE_KEY), que bypassa
    RLS y los REVOKE explícitos sobre 'authenticated'/'anon'. El role 'authenticated'
    del frontend NUNCA puede leer fv_credenciales_secret.
    No loguear el contenido de '_secret'.
    """
    q = (
        sb.table("fv_credenciales")
        .select(
            "id, plataforma, nombre, username, region_url, activo, tipo, "
            "descripcion, empresa_id, ultimo_ok_at, ultimo_error, "
            "fv_credenciales_secret(password_enc, session_cookies, cookies_expires_at)"
        )
        .eq("activo", True)
    )
    if empresa_filter:
        q = q.eq("empresa_id", empresa_filter)

    rows = q.execute().data or []

    result = []
    for row in rows:
        # PostgREST devuelve el objeto relacionado 1:1 bajo la clave del nombre de tabla.
        # Es None si no hay fila en fv_credenciales_secret (credencial incompleta).
        secret = row.pop("fv_credenciales_secret", None)
        row["_secret"] = secret  # None o dict con password_enc, session_cookies, ...
        result.append(row)

    return result


def check_secrets_diagnostic(sb: Client, empresa_filter: str | None = None) -> int:
    """
    Modo diagnóstico: verifica que cada credencial activa tiene fila en
    fv_credenciales_secret y que password_enc no está vacío.

    Retorna el número de credenciales con configuración incompleta (0 = todo OK).
    """
    logger.info("=== DIAGNÓSTICO DE SECRETOS FV ===")
    credenciales = load_fv_credentials_with_secrets(sb, empresa_filter)

    if not credenciales:
        logger.warning("No hay credenciales activas.")
        return 0

    sin_secret   = []
    sin_password = []
    ok           = []

    for cred in credenciales:
        cred_id    = cred["id"]
        plataforma = cred.get("plataforma", "?")
        masked     = cred.get("username", "?")[:3] + "***"
        secret     = cred.get("_secret")

        if secret is None:
            sin_secret.append(cred_id)
            logger.error(
                "❌ FALTA SECRET: cred=%s plataforma=%s username=%s — "
                "sin fila en fv_credenciales_secret. "
                "Crear credencial desde el CRM o ejecutar Edge Function fv-create-credential.",
                cred_id, plataforma, masked,
            )
        elif not secret.get("password_enc"):
            sin_password.append(cred_id)
            logger.error(
                "❌ PASSWORD VACÍO: cred=%s plataforma=%s username=%s — "
                "fv_credenciales_secret existe pero password_enc está vacío.",
                cred_id, plataforma, masked,
            )
        else:
            tiene_cookies = bool(secret.get("session_cookies"))
            expira        = (secret.get("cookies_expires_at") or "N/A")[:10]
            logger.info(
                "✅ OK: cred=%s plataforma=%s username=%s — "
                "password_enc presente, cookies=%s (expiran %s)",
                cred_id, plataforma, masked,
                "sí" if tiene_cookies else "no", expira,
            )
            ok.append(cred_id)

    total  = len(credenciales)
    fallos = len(sin_secret) + len(sin_password)
    logger.info(
        "=== RESULTADO: %d/%d OK · %d sin secret · %d sin password ===",
        len(ok), total, len(sin_secret), len(sin_password),
    )
    return fallos


# ─────────────────────────────────────────────────────────
# Notificaciones por email (Resend)
# ─────────────────────────────────────────────────────────

ADMIN_EMAIL = "jolivares@valereconsultores.com"
CRM_URL     = "https://valere-v2.pages.dev/seguimiento-fv"
FROM_EMAIL  = "Valere CRM <noreply@valereconsultores.com>"


def _send_email(asunto: str, html: str, resend_key: str | None) -> None:
    if not resend_key:
        logger.warning("RESEND_API_KEY no configurado — alerta omitida")
        return
    try:
        import httpx
        r = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {resend_key}", "Content-Type": "application/json"},
            json={"from": FROM_EMAIL, "to": [ADMIN_EMAIL], "subject": asunto, "html": html},
            timeout=10,
        )
        if r.status_code in (200, 201):
            logger.info("✉️  Email enviado: %s", asunto)
        else:
            logger.warning("Resend HTTP %d: %s", r.status_code, r.text[:200])
    except Exception as e:
        logger.error("Error enviando email: %s", e)


def alerta_planta_caida(nombre: str, estado: str, resend_key: str | None) -> None:
    ts = datetime.now().strftime("%d/%m/%Y %H:%M")
    _send_email(
        asunto=f"⚠️ Planta FV caída: {nombre}",
        html=f"""<h2 style="color:#dc2626">⚠️ Planta fuera de servicio</h2>
        <p><b>Planta:</b> {nombre} &nbsp;|&nbsp; <b>Estado:</b>
           <span style="color:#dc2626">{estado.upper()}</span> &nbsp;|&nbsp;
           <b>Detectado:</b> {ts}</p>
        <p><a href="{CRM_URL}" style="background:#1d4ed8;color:white;padding:8px 16px;
           border-radius:6px;text-decoration:none">Ver en Valere CRM →</a></p>""",
        resend_key=resend_key,
    )


def alerta_alarma_critica(nombre: str, severidad: str, descripcion: str, resend_key: str | None) -> None:
    color = "#dc2626" if severidad == "critica" else "#ea580c"
    icono = "🔴" if severidad == "critica" else "🟠"
    ts = datetime.now().strftime("%d/%m/%Y %H:%M")
    _send_email(
        asunto=f"{icono} Alarma {severidad} FV: {nombre}",
        html=f"""<h2 style="color:{color}">{icono} Alarma {severidad.upper()}</h2>
        <p><b>Planta:</b> {nombre} &nbsp;|&nbsp; <b>Severidad:</b>
           <span style="color:{color}">{severidad.upper()}</span></p>
        <p><b>Descripción:</b> {descripcion}</p>
        <p><b>Detectado:</b> {ts}</p>
        <p><a href="{CRM_URL}" style="background:#1d4ed8;color:white;padding:8px 16px;
           border-radius:6px;text-decoration:none">Ver en Valere CRM →</a></p>""",
        resend_key=resend_key,
    )


# ─────────────────────────────────────────────────────────
# Resumen semanal (lunes)
# ─────────────────────────────────────────────────────────

def generar_resumen_semanal(sb: Client, dry_run: bool = False) -> None:
    """Agrega los KPIs de la semana anterior en fv_resumen_semanal."""
    hoy           = date.today()
    semana_inicio = hoy - timedelta(days=7)
    semana_fin    = hoy - timedelta(days=1)
    logger.info("Resumen semanal: %s → %s", semana_inicio, semana_fin)

    rows = (
        sb.table("fv_kpi_diario")
        .select("planta_id, fecha, energia_kwh, potencia_max_kw")
        .gte("fecha", semana_inicio.isoformat())
        .lte("fecha", semana_fin.isoformat())
        .execute()
        .data or []
    )

    por_planta: dict[str, dict] = defaultdict(lambda: {
        "energia_kwh": 0.0, "potencia_max_kw": 0.0, "dias_activo": 0,
    })
    for r in rows:
        pid = r["planta_id"]
        kwh = r.get("energia_kwh") or 0
        por_planta[pid]["energia_kwh"] += kwh
        if kwh > 0:
            por_planta[pid]["dias_activo"] += 1
        pmax = r.get("potencia_max_kw") or 0
        if pmax > por_planta[pid]["potencia_max_kw"]:
            por_planta[pid]["potencia_max_kw"] = pmax

    for planta_id, agg in por_planta.items():
        row = {
            "planta_id":       planta_id,
            "semana_inicio":   semana_inicio.isoformat(),
            "semana_fin":      semana_fin.isoformat(),
            "energia_kwh":     round(agg["energia_kwh"], 3),
            "potencia_max_kw": round(agg["potencia_max_kw"], 3),
            "dias_activo":     agg["dias_activo"],
        }
        if dry_run:
            logger.info("[DRY-RUN] resumen_semanal: %s", json.dumps(row, default=str))
        else:
            sb.table("fv_resumen_semanal").upsert(row, on_conflict="planta_id,semana_inicio").execute()

    logger.info("Resumen semanal: %d plantas procesadas", len(por_planta))


# ─────────────────────────────────────────────────────────
# Informe mensual (día 1 de cada mes)
# ─────────────────────────────────────────────────────────

CO2_KG_PER_KWH = 0.233  # Factor España REE (kg CO₂ por kWh generado/evitado)


def generar_informe_mensual_borrador(sb: Client, dry_run: bool = False) -> None:
    """Crea borradores de informe mensual por empresa. El PDF se genera desde el CRM."""
    hoy        = date.today()
    mes_inicio = (hoy.replace(day=1) - timedelta(days=1)).replace(day=1)
    mes_fin    = hoy.replace(day=1) - timedelta(days=1)
    logger.info("Informe mensual borrador: %s/%s", mes_inicio.month, mes_inicio.year)

    rows = (
        sb.table("fv_kpi_diario")
        .select("planta_id, energia_kwh, ingresos_eur, fv_planta(empresa_id)")
        .gte("fecha", mes_inicio.isoformat())
        .lte("fecha", mes_fin.isoformat())
        .execute()
        .data or []
    )

    por_empresa: dict[str, dict] = defaultdict(lambda: {"energia": 0.0, "ahorro": 0.0})
    for r in rows:
        planta_data = r.get("fv_planta") or {}
        eid = planta_data.get("empresa_id")
        if not eid:
            continue
        por_empresa[eid]["energia"] += r.get("energia_kwh") or 0
        por_empresa[eid]["ahorro"]  += r.get("ingresos_eur") or 0

    for empresa_id, agg in por_empresa.items():
        energia = round(agg["energia"], 3)
        row = {
            "empresa_id":          empresa_id,
            "mes":                 mes_inicio.isoformat(),
            "estado":              "borrador",
            "energia_total_kwh":   energia,
            "ahorro_estimado_eur": round(agg["ahorro"], 2),
            "co2_evitado_kg":      round(energia * CO2_KG_PER_KWH, 2),
            "generado_en":         datetime.now(timezone.utc).isoformat(),
        }
        if dry_run:
            logger.info("[DRY-RUN] informe_mensual: %s", json.dumps(row, default=str))
        else:
            sb.table("fv_informe_mensual").upsert(row, on_conflict="empresa_id,mes").execute()

    logger.info("Borradores mensuales: %d empresas", len(por_empresa))


# ─────────────────────────────────────────────────────────
# Sincronización de una credencial
# ─────────────────────────────────────────────────────────

def sync_credencial(
    sb: Client,
    cred: dict,
    enc_key: str,
    resend_key: str | None,
    dry_run: bool = False,
) -> dict:
    cred_id    = cred["id"]
    empresa_id = cred.get("empresa_id")   # None si credencial multi-cliente
    plataforma = cred["plataforma"]
    username   = cred["username"]
    region_url = cred.get("region_url") or "https://uni003eu5.fusionsolar.huawei.com"

    # ── Leer secretos desde _secret (cargados vía JOIN a fv_credenciales_secret) ──
    # SEGURIDAD: _secret viene de service_role. No loguear su contenido.
    secret = cred.get("_secret")
    if secret is None:
        msg = (
            "CONFIG_ERROR — sin fila en fv_credenciales_secret. "
            "Registra la credencial desde el CRM o ejecuta la Edge Function fv-create-credential."
        )
        logger.error("❌ cred=%s plataforma=%s: %s", cred_id, plataforma, msg)
        if not dry_run:
            sb.table("fv_credenciales").update({
                "ultimo_error": msg,
                "estado_sesion": "error",
            }).eq("id", cred_id).execute()
        return {"ok": False, "plantas": 0, "alarmas": 0, "msg": msg}

    password_enc = secret.get("password_enc")
    if not password_enc:
        msg = "CONFIG_ERROR — fv_credenciales_secret existe pero password_enc está vacío."
        logger.error("❌ cred=%s plataforma=%s: %s", cred_id, plataforma, msg)
        if not dry_run:
            sb.table("fv_credenciales").update({
                "ultimo_error": msg,
                "estado_sesion": "error",
            }).eq("id", cred_id).execute()
        return {"ok": False, "plantas": 0, "alarmas": 0, "msg": msg}

    # Reflejar cookies_expires_at del secret → tabla pública (para que la UI lo vea)
    cookies_expires_at_pub = secret.get("cookies_expires_at")
    if not dry_run and cookies_expires_at_pub:
        sb.table("fv_credenciales").update({
            "cookies_expires_at": cookies_expires_at_pub,
        }).eq("id", cred_id).execute()

    logger.info(
        "Sincronizando cred=%s empresa=%s (%s / %s)",
        cred_id, empresa_id or "multi-cliente", plataforma, username,
    )
    t0 = time.time()

    try:
        password = decrypt_password(password_enc, enc_key)
    except Exception as e:
        msg = f"DECRYPT_ERROR — no se pudo descifrar password: {type(e).__name__}"
        logger.error("❌ cred=%s: %s", cred_id, msg)
        if not dry_run:
            sb.table("fv_credenciales").update({"ultimo_error": msg}).eq("id", cred_id).execute()
        return {"ok": False, "plantas": 0, "alarmas": 0, "msg": msg}

    # ── Seleccionar modo de autenticación ───────────────────
    # Si hay storage state pre-extraído y no está expirado → StorageStateClient
    #   (Playwright headless sin login: navega directamente al portal con sesión pre-cargada)
    # Si no                                                → WebAuthClient
    #   (Playwright login completo: puede fallar en CI por CAPTCHA)
    #
    # IMPORTANTE: httpx (CookieAuthClient anterior) NO funciona porque CloudWAF de
    # FusionSolar verifica el fingerprint TLS del cliente. Playwright reproduce el
    # fingerprint de Chrome; httpx no.
    #
    # Los campos session_cookies y cookies_expires_at vienen de fv_credenciales_secret
    # (no de fv_credenciales — esas columnas fueron eliminadas en la migración 2026-05-10).
    session_state_enc  = secret.get("session_cookies")
    cookies_expires_at = secret.get("cookies_expires_at")
    storage_state: dict | None = None

    if session_state_enc:
        from datetime import timezone as _tz
        now = datetime.now(_tz.utc)
        expired = (
            cookies_expires_at is not None
            and datetime.fromisoformat(cookies_expires_at) < now
        )
        if expired:
            logger.warning(
                "Storage state expirado para cred=%s (expiró %s). "
                "Ejecuta extract_cookies.py para renovar. Intentando login Playwright...",
                cred_id, cookies_expires_at,
            )
        else:
            try:
                import json as _json
                state_json    = decrypt_password(session_state_enc, enc_key)
                storage_state = _json.loads(state_json)
                # Soporte formato legacy (lista de cookies) y nuevo (dict con cookies+origins)
                if isinstance(storage_state, list):
                    n = len(storage_state)
                    logger.info(
                        "Usando %d cookies (formato legacy) para cred=%s (expiran %s)",
                        n, cred_id, (cookies_expires_at or "N/A")[:10],
                    )
                else:
                    n = len(storage_state.get("cookies", []))
                    logger.info(
                        "Usando storage state con %d cookies para cred=%s (expiran %s)",
                        n, cred_id, (cookies_expires_at or "N/A")[:10],
                    )
            except Exception as e:
                logger.warning(
                    "Error al descifrar storage state cred=%s: %s. Fallback a Playwright.",
                    cred_id, type(e).__name__,
                )
                storage_state = None

    client: FusionSolarClient = make_client(plataforma, region_url, username, password, storage_state=storage_state)

    try:
        client.login()
    except FusionSolarAuthError as e:
        msg = f"AUTH_REDIRECT — sesión rechazada por FusionSolar: {e}"
        logger.error("❌ %s", msg)
        logger.error(
            "ACCIÓN REQUERIDA: las cookies de sesión han expirado o FusionSolar ha cerrado la sesión. "
            "Pulsa «Renovar sesión» en el CRM o ejecuta extract_cookies.py localmente."
        )
        if not dry_run:
            sb.table("fv_credenciales").update({
                "ultimo_error": msg,
                "estado_sesion": "caducada",
            }).eq("id", cred_id).execute()
        return {"ok": False, "plantas": 0, "alarmas": 0, "msg": msg}
    except Exception as e:
        msg = f"UNEXPECTED_ERROR en login: {type(e).__name__}: {e}"
        logger.error("❌ %s", msg, exc_info=True)
        if not dry_run:
            sb.table("fv_credenciales").update({
                "ultimo_error": msg,
                "estado_sesion": "error",
            }).eq("id", cred_id).execute()
        return {"ok": False, "plantas": 0, "alarmas": 0, "msg": msg}

    total_plantas = 0
    total_alarmas = 0

    try:
        stations = client.get_station_list()
        logger.info("  %d plantas encontradas", len(stations))

        # Loguear claves y valores numéricos del primer station para diagnóstico
        if stations:
            s0 = stations[0]
            logger.info("  [DIAG] keys primer station: %s", list(s0.keys()))
            # Mostrar valores de campos que podrían ser KPIs (numéricos o cadenas numéricas)
            kpi_candidates = {k: v for k, v in s0.items()
                              if v is not None and k not in ("dn", "stationCode", "stationDn",
                                                              "stationName", "plantName", "country",
                                                              "gridConnectedDay", "buildDate")}
            logger.info("  [DIAG] valores station[0]: %s", kpi_candidates)

        for st in stations:
            # FusionSolar EU5 usa "dn" (ej: "NE=137403508"), no stationCode/stationDn
            station_code = (
                st.get("stationCode")
                or st.get("stationDn")
                or st.get("dn", "")
            )
            if not station_code:
                logger.warning("  [SKIP] station sin station_code: %s", list(st.keys()))
                continue

            # FusionSolar EU5 usa "plantStatus", no "status"
            planta_estado = normalize_status(
                st.get("status") or st.get("plantStatus", "desconocido")
            )
            # Nombre: probar varias claves posibles
            planta_nombre = (
                st.get("stationName")
                or st.get("plantName")
                or st.get("name")
                or station_code
            )

            # ── Upsert fv_planta (via función segura anti-duplicados) ──────
            if dry_run:
                logger.info(
                    "  [DRY-RUN] planta: %s / %s / empresa=%s",
                    plataforma, planta_nombre, empresa_id or "sin asignar",
                )
                total_plantas += 1
                continue

            # fv_upsert_planta: no sobreescribe empresa_id si ya tiene valor (asignacion manual)
            res = sb.rpc("fv_upsert_planta", {
                "p_plataforma":    plataforma,
                "p_region_url":    region_url,
                "p_station_code":  station_code,
                "p_credencial_id": cred_id,
                "p_nombre":        planta_nombre,
                "p_pais":          st.get("country", "ES"),
                # EU5: installedCapacity suele ser "0.0"; onlyInverterPower = suma kW inversores
                # Usamos la mejor fuente disponible (todas en kW/kWp)
                "p_capacidad_kwp": (
                    st.get("installedCapacity") or st.get("capacity")
                    or st.get("onlyInverterPower") or st.get("inverterPower")
                    or None
                ),
                "p_tiene_bateria": bool(st.get("hasBattery") or st.get("batteryCapacity")),
                "p_fecha_conexion":st.get("gridConnectedDay") or st.get("buildDate"),
                "p_estado":        planta_estado,
                "p_empresa_id":    empresa_id,
            }).execute()
            planta_id = res.data[0]["planta_id"] if res.data else None
            if not planta_id:
                logger.warning("  fv_upsert_planta sin resultado para %s", station_code)
                total_plantas += 1
                continue

            # ── Alerta si planta recién caída ─────────────────
            if planta_estado in ("defectuoso", "desconectado"):
                prev = (
                    sb.table("fv_planta").select("estado")
                    .eq("id", planta_id).single().execute().data or {}
                )
                if prev.get("estado") not in ("defectuoso", "desconectado"):
                    logger.warning("  ⚠️  Planta caída: %s (%s)", planta_nombre, planta_estado)
                    alerta_planta_caida(planta_nombre, planta_estado, resend_key)

            # ── KPIs realtime ─────────────────────────────────
            # Columnas reales de fv_kpi_realtime (verificadas 2026-05-11):
            # potencia_actual_kw, energia_hoy_kwh, energia_mes_kwh,
            # energia_total_kwh, ingresos_hoy_eur, actualizado_en
            # FusionSolar EU5 puede usar claves distintas a la API global.
            # El log [DIAG-KPI] muestra las claves reales en cada run.
            try:
                kpi = client.get_station_kpi(station_code)
                logger.info("  [DIAG-KPI] %s → keys: %s", station_code, list(kpi.keys()))
                # Intentar leer la potencia con todas las variantes conocidas de EU5/global
                potencia_kw = float(
                    kpi.get("currentPower")
                    or kpi.get("realTimePower")
                    or kpi.get("activePower")
                    or kpi.get("inverterPower")
                    or 0
                )
                energia_hoy = float(
                    kpi.get("dailyEnergy")
                    or kpi.get("dayEnergy")
                    or kpi.get("dayPower")
                    or 0
                )
                energia_mes = float(kpi.get("monthEnergy") or kpi.get("monthPower") or 0)
                energia_total = float(
                    kpi.get("cumulativeEnergy")
                    or kpi.get("totalEnergy")
                    or kpi.get("totalPower")
                    or 0
                )
                sb.table("fv_kpi_realtime").upsert({
                    "planta_id":          planta_id,
                    "potencia_actual_kw":  potencia_kw,
                    "energia_hoy_kwh":     energia_hoy,
                    "energia_mes_kwh":     energia_mes,
                    "energia_total_kwh":   energia_total,
                    "ingresos_hoy_eur":    0,  # FusionSolar no devuelve ingresos en EUR
                    "actualizado_en":      datetime.now(timezone.utc).isoformat(),
                }, on_conflict="planta_id").execute()
            except Exception as e:
                logger.warning("  KPI realtime error %s: %s", station_code, e)

            # ── KPIs diarios ──────────────────────────────────
            # Usamos los datos del station-list (ya disponibles en kpi) ya que
            # get_station_kpi devuelve la caché del station-list que incluye dailyEnergy.
            try:
                hoy_str = date.today().isoformat()
                kpi_d = client.get_station_kpi(station_code)  # usa caché station-list
                sb.table("fv_kpi_diario").upsert({
                    "planta_id":       planta_id,
                    "fecha":           hoy_str,
                    "energia_kwh":     float(kpi_d.get("dailyEnergy") or kpi_d.get("dayPower") or kpi_d.get("dayEnergy") or 0),
                    "potencia_max_kw": float(kpi_d.get("inverterPower") or kpi_d.get("peakPower") or 0),
                    "ingresos_eur":    0,
                }, on_conflict="planta_id,fecha").execute()
            except Exception as e:
                logger.warning("  KPI diario error %s: %s", station_code, e)

            # -- Alarmas activas
            try:
                alarmas = client.get_alarms(station_code)
                for al in alarmas:
                    severidad = normalize_severity(al.get("lev") or al.get("severity", "4"))
                    desc = al.get("alarmName") or al.get("description", "Sin descripcion")
                    sb.table("fv_alarma").upsert({
                        "planta_id":    planta_id,
                        "alarm_id":     str(al.get("alarmId") or al.get("id", "")),
                        "codigo":       str(al.get("alarmId") or al.get("id", "")),
                        "severidad":    severidad,
                        "descripcion":  desc,
                        "dispositivo":  al.get("devName") or al.get("deviceName") or "",
                        "activa":       True,
                        "iniciada_en":  al.get("raiseTime") or datetime.now(timezone.utc).isoformat(),
                    }, on_conflict="planta_id,codigo").execute()
                    total_alarmas += 1
                    if severidad in ("critica", "mayor"):
                        alerta_alarma_critica(planta_nombre, severidad, desc, resend_key)
            except Exception as e:
                logger.warning("  Alarmas error %s: %s", station_code, e)

            total_plantas += 1

    except FusionSolarAuthError as e:
        msg = f"AUTH_REDIRECT durante sync: {e}"
        logger.error("ERROR %s", msg)
        logger.error(
            "La sesión expiró a mitad de sincronización. "
            "Pulsa «Renovar sesión» en el CRM o ejecuta extract_cookies.py."
        )
        if not dry_run:
            sb.table("fv_credenciales").update({
                "ultimo_error": msg,
                "estado_sesion": "caducada",
            }).eq("id", cred_id).execute()
        # IMPORTANTE: no sobreescribimos los KPIs existentes (return antes de cualquier
        # escritura destructiva) — los datos buenos se conservan del sync anterior.
        return {"ok": False, "plantas": total_plantas, "alarmas": total_alarmas, "msg": msg}
    except Exception as e:
        msg = f"UNEXPECTED_ERROR en sync loop: {type(e).__name__}: {e}"
        logger.error("ERROR %s", msg, exc_info=True)
        if not dry_run:
            sb.table("fv_credenciales").update({
                "ultimo_error": msg,
                "estado_sesion": "error",
            }).eq("id", cred_id).execute()
        return {"ok": False, "plantas": total_plantas, "alarmas": total_alarmas, "msg": msg}
    finally:
        try:
            client.logout()
        except Exception:
            pass

    elapsed = round(time.time() - t0, 1)
    logger.info("  OK cred=%s: %d plantas, %d alarmas en %.1fs", cred_id, total_plantas, total_alarmas, elapsed)

    if not dry_run:
        # Calcular estado_sesion basado en cuándo caducan las cookies
        import datetime as _dt
        now_utc = datetime.now(timezone.utc)
        cexp = secret.get("cookies_expires_at")
        if cexp:
            try:
                exp_dt = _dt.datetime.fromisoformat(cexp)
                if exp_dt.tzinfo is None:
                    exp_dt = exp_dt.replace(tzinfo=timezone.utc)
                if exp_dt < now_utc:
                    estado_sesion = "caducada"
                elif exp_dt < now_utc + _dt.timedelta(hours=24):
                    estado_sesion = "por_caducar"
                else:
                    estado_sesion = "activa"
            except Exception:
                estado_sesion = "activa"
        else:
            estado_sesion = "activa"

        sb.table("fv_credenciales").update({
            "ultimo_error":       None,
            "ultimo_ok_at":       now_utc.isoformat(),
            "estado_sesion":      estado_sesion,
            "cookies_expires_at": cexp,  # reflejo del campo secreto
        }).eq("id", cred_id).execute()

    return {"ok": True, "plantas": total_plantas, "alarmas": total_alarmas, "elapsed": elapsed}


# -- Punto de entrada principal

def main() -> None:
    parser = argparse.ArgumentParser(description="Sincronizador FV")
    parser.add_argument("--empresa",       help="UUID empresa (filtra por empresa_id en fv_credenciales)")
    parser.add_argument("--credencial",    help="UUID credencial (sincroniza solo esta credencial)")
    parser.add_argument("--dry-run",       action="store_true")
    parser.add_argument("--check-secrets", action="store_true",
                        help="Diagnostico: verifica secretos en fv_credenciales_secret y sale")
    args = parser.parse_args()

    dry_run = args.dry_run
    if dry_run:
        logger.info("DRY-RUN activado")

    supabase_url = os.environ["SUPABASE_URL"]
    supabase_key = os.environ["SUPABASE_SERVICE_KEY"]
    enc_key      = os.environ["FV_ENCRYPTION_KEY"]
    resend_key   = os.environ.get("RESEND_API_KEY")

    sb = create_client(supabase_url, supabase_key)

    if args.check_secrets:
        fallos = check_secrets_diagnostic(sb, empresa_filter=args.empresa)
        sys.exit(1 if fallos > 0 else 0)

    credenciales = load_fv_credentials_with_secrets(sb, empresa_filter=args.empresa)

    # Filtro por credencial específica (dispatch manual desde CRM)
    if args.credencial:
        credenciales = [c for c in credenciales if c["id"] == args.credencial]
        if not credenciales:
            logger.error("Credencial %s no encontrada o no activa.", args.credencial)
            sys.exit(1)
        logger.info("Sincronización puntual: credencial=%s", args.credencial)

    logger.info("Credenciales activas: %d", len(credenciales))

    if not credenciales:
        logger.warning("No hay credenciales activas. Saliendo.")
        return

    resultados = []
    for cred in credenciales:
        resultado = sync_credencial(sb, cred, enc_key, resend_key, dry_run=dry_run)
        resultados.append(resultado)

    total_ok      = sum(1 for r in resultados if r["ok"])
    total_plantas = sum(r["plantas"] for r in resultados)
    total_alarmas = sum(r["alarmas"] for r in resultados)

    hoy = date.today()
    if hoy.weekday() == 0:
        logger.info("Lunes: generando resumen semanal")
        generar_resumen_semanal(sb, dry_run=dry_run)

    if hoy.day == 1:
        logger.info("Dia 1: generando informe mensual borrador")
        generar_informe_mensual_borrador(sb, dry_run=dry_run)

    logger.info("Sync completado: %d/%d OK -- %d plantas, %d alarmas",
                total_ok, len(credenciales), total_plantas, total_alarmas)

    if not dry_run:
        sb.table("fv_sync_log").insert({
            "credenciales_ok":    total_ok,
            "credenciales_total": len(credenciales),
            "plantas_sync":       total_plantas,
            "alarmas_sync":       total_alarmas,
            "alarmas_detectadas": total_alarmas,
            "ok":                 total_ok == len(credenciales),
            "resultado":          "ok" if total_ok == len(credenciales) else "parcial",
            "iniciado_en":        datetime.now(timezone.utc).isoformat(),
        }).execute()


if __name__ == "__main__":
    main()
