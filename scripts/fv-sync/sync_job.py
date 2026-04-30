"""
sync_job.py — Orquestador principal de sincronización FV.

Flujo:
  1. Lee fv_credenciales activas de Supabase.
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

from supabase import create_client, Client

from crypto import decrypt_password
from fusionsolar_client import make_client, FusionSolarClient

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
    if s in ("0", "normal", "ok", "running", "1"):            return "normal"
    if s in ("2", "fault", "error", "defectuoso"):             return "defectuoso"
    if s in ("3", "offline", "disconnected", "desconectado"):  return "desconectado"
    return "desconocido"


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
    cred_id      = cred["id"]
    empresa_id   = cred.get("empresa_id")   # None si credencial multi-cliente
    plataforma   = cred["plataforma"]
    username     = cred["username"]
    password_enc = cred["password_enc"]
    region_url   = cred.get("region_url") or "https://uni003eu5.fusionsolar.huawei.com"

    logger.info(
        "Sincronizando cred=%s empresa=%s (%s / %s)",
        cred_id, empresa_id or "multi-cliente", plataforma, username,
    )
    t0 = time.time()

    try:
        password = decrypt_password(password_enc, enc_key)
    except Exception as e:
        msg = f"Error al descifrar: {e}"
        logger.error(msg)
        return {"ok": False, "plantas": 0, "alarmas": 0, "msg": msg}

    client: FusionSolarClient = make_client(plataforma, region_url, username, password)

    try:
        client.login()
    except Exception as e:
        msg = f"Login fallido: {e}"
        logger.error(msg)
        if not dry_run:
            sb.table("fv_credenciales").update({"ultimo_error": msg}).eq("id", cred_id).execute()
        return {"ok": False, "plantas": 0, "alarmas": 0, "msg": msg}

    total_plantas = 0
    total_alarmas = 0

    try:
        stations = client.get_station_list()
        logger.info("  %d plantas encontradas", len(stations))

        for st in stations:
            station_code = st.get("stationCode") or st.get("stationDn", "")
            if not station_code:
                continue

            planta_estado = normalize_status(st.get("status", "desconocido"))
            planta_nombre = st.get("stationName") or st.get("plantName", station_code)

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
                "p_capacidad_kwp": st.get("installedCapacity") or st.get("capacity"),
                "p_tiene_bateria": bool(st.get("hasBattery") or st.get("batteryCapacity")),
                "p_fecha_conexion":st.get("gridConnectedDay") or st.get("buildDate"),
                "p_estado":        planta_estado,
                "p_empresa_id":    empresa_id,
            }).execute()
            planta_id = res.data[0]["id"] if res.data else None
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
            try:
                kpi = client.get_station_kpi(station_code)
                sb.table("fv_kpi_realtime").upsert({
                    "planta_id":          planta_id,
                    "potencia_actual_kw":  kpi.get("currentPower") or kpi.get("activePower"),
                    "energia_hoy_kwh":     kpi.get("dayPower") or kpi.get("dayEnergy"),
                    "factor_rendimiento":  kpi.get("performanceRatio") or kpi.get("pr"),
                    "ts":                  datetime.now(timezone.utc).isoformat(),
                }, on_conflict="planta_id").execute()
            except Exception as e:
                logger.warning("  KPI realtime error %s: %s", station_code, e)

            # ── KPIs diarios ──────────────────────────────────
            try:
                hoy_str = date.today().isoformat()
                kpi_d = client.get_station_kpi_daily(station_code)
                sb.table("fv_kpi_diario").upsert({
                    "planta_id":       planta_id,
                    "fecha":           hoy_str,
                    "energia_kwh":     kpi_d.get("dayPower") or kpi_d.get("dayEnergy") or 0,
                    "potencia_max_kw": kpi_d.get("peakPower") or 0,
                    "ingresos_eur":    kpi_d.get("income") or 0,
                }, on_conflict="planta_id,fecha").execute()
            except Exception as e:
                logger.warning("  KPI diario error %s: %s", station_code, e)

            # ── Alarmas activas ───────────────────────────────
            try:
                alarmas = client.get_station_alarms(station_code)
                for al in alarmas:
                    severidad = normalize_severity(al.get("lev") or al.get("severity", "4"))
                    desc = al.get("alarmName") or al.get("description", "Sin descripción")
                    sb.table("fv_alarma").upsert({
                        "planta_id":    planta_id,
                        "codigo":       str(al.get("alarmId") or al.get("id", "")),
                        "severidad":    severidad,
                        "descripcion":  desc,
                        "activa":       True,
                        "detectada_en": al.get("raiseTime") or datetime.now(timezone.utc).isoformat(),
                    }, on_conflict="planta_id,codigo").execute()
                    total_alarmas += 1

                    if severidad in ("critica", "mayor"):
                        alerta_alarma_critica(planta_nombre, severidad, desc, resend_key)
            except Exception as e:
                logger.warning("  Alarmas error %s: %s", station_code, e)

            total_plantas += 1

    except Exception as e:
        msg = f"Error en sync loop: {e}"
        logger.error(msg)
        if not dry_run:
            sb.table("fv_credenciales").update({"ultimo_error": msg}).eq("id", cred_id).execute()
        return {"ok": False, "plantas": total_plantas, "alarmas": total_alarmas, "msg": msg}
    finally:
        try:
            client.logout()
        except Exception:
            pass

    elapsed = round(time.time() - t0, 1)
    logger.info(
        "  ✅ cred=%s: %d plantas, %d alarmas en %.1fs",
        cred_id, total_plantas, total_alarmas, elapsed,
    )

    if not dry_run:
        sb.table("fv_credenciales").update({
            "ultimo_error":          None,
            "ultima_sincronizacion": datetime.now(timezone.utc).isoformat(),
        }).eq("id", cred_id).execute()

    return {
        "ok":     True,
        "plantas": total_plantas,
        "alarmas": total_alarmas,
        "elapsed": elapsed,
    }


# ─────────────────────────────────────────────────────────
# Punto de entrada principal
# ─────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Sincronizador FV → Supabase")
    parser.add_argument("--empresa", help="UUID empresa (solo esa empresa)")
    parser.add_argument("--dry-run", action="store_true", help="Sin escritura en BD")
    args = parser.parse_args()

    dry_run = args.dry_run
    if dry_run:
        logger.info("🔴 DRY-RUN activado — no se escribirá nada en la BD")

    # ── Variables de entorno ─────────────────────────────
    supabase_url = os.environ["SUPABASE_URL"]
    supabase_key = os.environ["SUPABASE_SERVICE_KEY"]
    enc_key      = os.environ["FV_ENCRYPTION_KEY"]
    resend_key   = os.environ.get("RESEND_API_KEY")

    sb: Client = create_client(supabase_url, supabase_key)

    # ── Cargar credenciales activas ──────────────────────
    q = sb.table("fv_credenciales").select("*").eq("activo", "true")
    if args.empresa:
        q = q.eq("empresa_id", args.empresa)
    credenciales = q.execute().data or []
    logger.info("Credenciales activas: %d", len(credenciales))

    if not credenciales:
        logger.warning("No hay credenciales activas. Saliendo.")
        return

    # ── Sincronizar cada credencial ──────────────────────
    resultados = []
    for cred in credenciales:
        resultado = sync_credencial(sb, cred, enc_key, resend_key, dry_run=dry_run)
        resultados.append(resultado)

    total_ok      = sum(1 for r in resultados if r["ok"])
    total_plantas = sum(r["plantas"] for r in resultados)
    total_alarmas = sum(r["alarmas"] for r in resultados)

    # ── Resumen semanal (lunes) ──────────────────────────
    hoy = date.today()
    if hoy.weekday() == 0:   # 0 = lunes
        logger.info("📅 Lunes → generando resumen semanal…")
        generar_resumen_semanal(sb, dry_run=dry_run)

    # ── Informe mensual (día 1) ──────────────────────────
    if hoy.day == 1:
        logger.info("📊 Día 1 → generando borradores de informe mensual…")
        generar_informe_mensual_borrador(sb, dry_run=dry_run)

    # ── Log global de sincronización ────────────────────
    if not dry_run:
        sb.table("fv_sync_log").insert({
            "credenciales_ok":    total_ok,
            "credenciales_total": len(credenciales),
            "plantas_sync":       total_plantas,
            "alarmas_detectadas": total_alarmas,
            "resultado":          "ok" if total_ok == len(credenciales) else "parcial",
            "detalles":           json.dumps(resultados, default=str),
        }).execute()

    # ── Resumen final ────────────────────────────────────
    estado = "✅ OK" if total_ok == len(credenciales) else f"⚠️ {total_ok}/{len(credenciales)} OK"
    logger.info(
        "Sync finalizado: %s | %d plantas | %d alarmas",
        estado, total_plantas, total_alarmas,
    )

    if total_ok < len(credenciales):
        sys.exit(1)


if __name__ == "__main__":
    main()
