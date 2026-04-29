"""
sync_job.py — Orquestador principal de sincronización FV.

Flujo:
  1. Lee fv_credenciales de Supabase (activas).
  2. Por cada cliente: instancia el cliente FusionSolar, hace login, sincroniza datos.
  3. Guarda resultados en fv_planta, fv_dispositivo, fv_kpi_realtime,
     fv_kpi_diario, fv_alarma.
  4. Escribe registro en fv_sync_log.

Ejecución:
    python sync_job.py                    # Sincroniza todos los clientes activos
    python sync_job.py --empresa <uuid>   # Solo un cliente (útil para debug)
    python sync_job.py --dry-run          # No escribe en BD, imprime JSON
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import date, timedelta, timezone

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
# Normalización de severidad
# ─────────────────────────────────────────────────────────
_SEVERITY_MAP = {
    # FusionSolar codes (estimados según docs Huawei)
    "1": "critica",
    "2": "mayor",
    "3": "menor",
    "4": "advertencia",
    "critical": "critica",
    "major": "mayor",
    "minor": "menor",
    "warning": "advertencia",
}

def normalize_severity(raw: str | int) -> str:
    return _SEVERITY_MAP.get(str(raw).lower(), "desconocida")

def normalize_status(raw: str | int) -> str:
    s = str(raw).lower()
    if s in ("0", "normal", "ok", "running"):
        return "normal"
    if s in ("1", "fault", "error", "defectuoso"):
        return "defectuoso"
    if s in ("2", "offline", "disconnected", "desconectado"):
        return "desconectado"
    return "desconocido"

# ─────────────────────────────────────────────────────────
# Sincronización de una credencial
# ─────────────────────────────────────────────────────────

def sync_credencial(
    sb: Client,
    cred: dict,
    enc_key: str,
    dry_run: bool = False,
) -> dict:
    """
    Sincroniza todas las plantas de una credencial FV.
    Devuelve resumen: {'ok': bool, 'plantas': int, 'alarmas': int, 'msg': str}
    """
    empresa_id    = cred["empresa_id"]
    cred_id       = cred["id"]
    plataforma    = cred["plataforma"]
    username      = cred["username"]
    password_enc  = cred["password_enc"]
    region_url    = cred.get("region_url") or "https://uni003eu5.fusionsolar.huawei.com"

    logger.info("Sincronizando empresa=%s (%s / %s)", empresa_id, plataforma, username)
    t0 = time.time()

    try:
        password = decrypt_password(password_enc, enc_key)
    except Exception as e:
        msg = f"Error al descifrar credencial: {e}"
        logger.error(msg)
        return {"ok": False, "plantas": 0, "alarmas": 0, "msg": msg}

    client: FusionSolarClient = make_client(plataforma, region_url, username, password)

    try:
        client.login()
    except Exception as e:
        msg = f"Login fallido: {e}"
        logger.error(msg)
        if not dry_run:
            sb.table("fv_credenciales").update({
                "ultimo_error": msg,
            }).eq("id", cred_id).execute()
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

            # ── Upsert planta ──
            planta_row = {
                "empresa_id":    empresa_id,
                "credencial_id": cred_id,
                "plataforma":    plataforma,
                "station_code":  station_code,
                "nombre":        st.get("stationName") or st.get("plantName", station_code),
                "pais":          st.get("country", "ES"),
                "capacidad_kwp": st.get("capacity") or st.get("installedCapacity"),
                "tiene_bateria": bool(st.get("hasBattery") or st.get("batteryCapacity")),
                "fecha_conexion": st.get("gridConnectedDay") or st.get("buildDate"),
                "estado":        normalize_status(st.get("status", "desconocido")),
            }

            if dry_run:
                logger.info("  [DRY-RUN] planta: %s", json.dumps(planta_row, default=str))
                planta_id = None
            else:
                res = sb.table("fv_planta").upsert(
                    planta_row,
                    on_conflict="empresa_id,plataforma,station_code"
                ).execute()
                planta_id = res.data[0]["id"] if res.data else None

            if not planta_id:
                # En dry-run no tenemos ID real; saltamos los hijos
                total_plantas += 1
                continue

            # ── KPIs en tiempo real ──
            try:
                kpi = client.get_station_kpi(station_code)
                kpi_row = {
                    "planta_id":          planta_id,
                    "potencia_actual_kw":  kpi.get("currentPower") or kpi.get("activePower"),
                    "energia_hoy_kwh":     kpi.get("dayPower") or kpi.get("dayEnergy"),
                    "energia_mes_kwh":     kpi.get("monthPower") or kpi.get("monthEnergy"),
                    "energia_total_kwh":   kpi.get("totalPower") or kpi.get("totalEnergy") or kpi.get("cumulativeEnergy"),
                    "ingresos_hoy_eur":    kpi.get("dayIncome"),
                    "actualizado_en":      "now()",
                }
                if not dry_run:
                    sb.table("fv_kpi_realtime").upsert(
                        kpi_row, on_conflict="planta_id"
                    ).execute()
            except Exception as e:
                logger.warning("  KPI realtime error en %s: %s", station_code, e)

            # ── KPI del día anterior ──
            yesterday = date.today() - timedelta(days=1)
            try:
                day_kpi = client.get_daily_kpi(station_code, yesterday)
                if day_kpi:
                    day_row = {
                        "planta_id":      planta_id,
                        "fecha":          yesterday.isoformat(),
                        "energia_kwh":    day_kpi.get("energy") or day_kpi.get("productPower"),
                        "ingresos_eur":   day_kpi.get("incomeDay") or day_kpi.get("income"),
                    }
                    if not dry_run:
                        sb.table("fv_kpi_diario").upsert(
                            day_row, on_conflict="planta_id,fecha"
                        ).execute()
            except Exception as e:
                logger.warning("  KPI diario error en %s: %s", station_code, e)

            # ── Dispositivos ──
            try:
                devices = client.get_devices(station_code)
                for dev in devices:
                    dev_type_id = dev.get("devTypeId", 0)
                    tipo_map = {1: "inversor", 10: "bateria", 22: "optimizador", 47: "smart_meter"}
                    tipo = tipo_map.get(int(dev_type_id), "otro")
                    dev_row = {
                        "planta_id":   planta_id,
                        "device_id":   str(dev.get("id") or dev.get("devDn", "")),
                        "tipo":        tipo,
                        "nombre":      dev.get("devName") or dev.get("name"),
                        "modelo":      dev.get("softVer") or dev.get("model"),
                        "numero_serie": dev.get("devSn") or dev.get("sn"),
                        "estado":      normalize_status(dev.get("runState", "desconocido")),
                    }
                    if not dry_run and dev_row["device_id"]:
                        sb.table("fv_dispositivo").upsert(
                            dev_row, on_conflict="planta_id,device_id"
                        ).execute()
            except Exception as e:
                logger.warning("  Dispositivos error en %s: %s", station_code, e)

            # ── Alarmas ──
            try:
                alarms = client.get_alarms(station_code)
                alarm_ids_activos = []
                for alarm in alarms:
                    alarm_id = str(alarm.get("alarmId") or alarm.get("id", ""))
                    if not alarm_id:
                        continue
                    alarm_row = {
                        "planta_id":   planta_id,
                        "alarm_id":    alarm_id,
                        "codigo":      str(alarm.get("alarmCode", "")),
                        "severidad":   normalize_severity(alarm.get("severity", "desconocida")),
                        "descripcion": alarm.get("alarmDesc") or alarm.get("description"),
                        "dispositivo": alarm.get("devName") or alarm.get("deviceName"),
                        "iniciada_en": alarm.get("raiseTime") or alarm.get("createTime"),
                        "activa":      True,
                    }
                    if not dry_run:
                        sb.table("fv_alarma").upsert(
                            alarm_row, on_conflict="planta_id,alarm_id"
                        ).execute()
                    alarm_ids_activos.append(alarm_id)
                    total_alarmas += 1

                # Marcar como inactivas las alarmas que ya no existen en la plataforma
                if not dry_run and alarm_ids_activos:
                    # Las que están en BD pero no en la lista actual → resolved
                    sb.table("fv_alarma").update({
                        "activa": False,
                        "resuelta_en": "now()",
                    }).eq("planta_id", planta_id).eq("activa", True).not_.in_(
                        "alarm_id", alarm_ids_activos
                    ).execute()
                elif not dry_run:
                    # No hay alarmas → todas resueltas
                    sb.table("fv_alarma").update({
                        "activa": False,
                        "resuelta_en": "now()",
                    }).eq("planta_id", planta_id).eq("activa", True).execute()

            except Exception as e:
                logger.warning("  Alarmas error en %s: %s", station_code, e)

            total_plantas += 1

        # Marcar último login OK
        if not dry_run:
            sb.table("fv_credenciales").update({
                "ultimo_ok_at": "now()",
                "ultimo_error": None,
            }).eq("id", cred_id).execute()

    except Exception as e:
        msg = f"Error durante sincronización: {e}"
        logger.error(msg)
        if not dry_run:
            sb.table("fv_credenciales").update({
                "ultimo_error": msg,
            }).eq("id", cred_id).execute()
        return {"ok": False, "plantas": total_plantas, "alarmas": total_alarmas, "msg": msg}
    finally:
        client.close()

    duracion_ms = int((time.time() - t0) * 1000)
    logger.info("  ✅ Sync OK: %d plantas, %d alarmas, %dms", total_plantas, total_alarmas, duracion_ms)
    return {
        "ok": True,
        "plantas": total_plantas,
        "alarmas": total_alarmas,
        "msg": f"OK: {total_plantas} plantas, {total_alarmas} alarmas en {duracion_ms}ms",
        "duracion_ms": duracion_ms,
    }


# ─────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Sincronización diaria FV → Supabase")
    parser.add_argument("--empresa", help="UUID de empresa (solo esa)")
    parser.add_argument("--dry-run", action="store_true", help="No escribe en BD")
    args = parser.parse_args()

    # Variables de entorno requeridas
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")  # Service Role (salta RLS)
    enc_key      = os.environ.get("FV_ENCRYPTION_KEY")

    if not supabase_url or not supabase_key:
        logger.error("Faltan variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_KEY")
        sys.exit(1)
    if not enc_key:
        logger.error("Falta variable de entorno: FV_ENCRYPTION_KEY")
        sys.exit(1)

    sb: Client = create_client(supabase_url, supabase_key)

    # Obtener credenciales activas
    query = sb.table("fv_credenciales").select("*").eq("activo", True)
    if args.empresa:
        query = query.eq("empresa_id", args.empresa)
    creds = query.execute().data or []

    if not creds:
        logger.info("No hay credenciales FV activas. Nada que sincronizar.")
        return

    logger.info("Iniciando sync de %d credenciales FV", len(creds))
    errores = 0

    for cred in creds:
        result = sync_credencial(sb, cred, enc_key, dry_run=args.dry_run)

        # Escribir log en BD
        if not args.dry_run:
            sb.table("fv_sync_log").insert({
                "empresa_id":   cred["empresa_id"],
                "plataforma":   cred["plataforma"],
                "ok":           result["ok"],
                "plantas_sync": result["plantas"],
                "alarmas_sync": result["alarmas"],
                "mensaje":      result["msg"],
                "duracion_ms":  result.get("duracion_ms"),
            }).execute()

        if not result["ok"]:
            errores += 1

    logger.info(
        "Sync completado. %d OK, %d con errores.",
        len(creds) - errores, errores
    )

    if errores > 0:
        sys.exit(1)  # GitHub Actions marca el job como fallido


if __name__ == "__main__":
    main()
