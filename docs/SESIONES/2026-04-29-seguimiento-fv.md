# Sesión 2026-04-29 — Módulo Seguimiento Planta FV

## Qué se hizo

### Contexto
Juan trajo un análisis de Claude Browser sobre integración con FusionSolar (Huawei SmartPVMS).
Conversación previa identificó endpoints internos web + Northbound API oficial.
Decisión: MVP con FusionSolar usando credenciales web existentes, infraestructura GitHub Actions.

### Implementado

**1. Migración SQL** (`supabase/migrations/20260429_seguimiento_fv.sql`)
- 7 tablas con RLS granular multitenant
- `fv_credenciales`: almacena passwords cifradas AES-256-GCM (solo blob, no la clave)
- `fv_planta`, `fv_dispositivo`, `fv_kpi_realtime`, `fv_kpi_diario`, `fv_alarma`, `fv_sync_log`
- Políticas: admin = CRUD total; comercial = solo ve sus empresas

**2. Conector Python** (`scripts/fv-sync/`)
- `crypto.py`: AES-256-GCM, clave de 32 bytes en variable de entorno `FV_ENCRYPTION_KEY`
- `fusionsolar_client.py`: clase abstracta + `WebAuthClient` (cookies web) + `NorthboundClient` (stub para migración futura)
- `sync_job.py`: itera credenciales activas → login → descarga plantas/KPIs/dispositivos/alarmas → upsert en Supabase
- `README.md`: instrucciones completas de setup y onboarding de clientes

**3. GitHub Actions** (`.github/workflows/fv-sync.yml`)
- Cron: `0 1 * * *` = 02:00 hora España
- Dispatch manual con parámetros: `empresa_id` (opcional) y `dry_run`
- Usa secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `FV_ENCRYPTION_KEY`
- Coste: 0€/mes (dentro del plan gratuito de GitHub Actions)

**4. Frontend** (`src/features/seguimiento-fv/`)
- `api.ts`: hooks React Query para todas las tablas fv_*
- `SeguimientoFVPage.tsx`: vista global con KPIs agregados + tabla de todas las plantas + filtros
- `components/PlantaFVTab.tsx`: tab expandible en ficha empresa con:
  - Gráfico de producción 30d (recharts BarChart)
  - Tabla de alarmas activas con badges de severidad
  - Tabla de dispositivos con iconos por tipo
  - Sub-tabs: Producción / Alarmas / Dispositivos
  - Indicador de última sincronización

**5. Integración en app**
- `Sidebar.tsx`: icono ☀️ "Plantas FV" en sección CRM
- `App.tsx`: ruta `/seguimiento-fv`
- `EmpresaDetailPage.tsx`: tab "☀️ Plantas FV" al final de tabs

## Decisiones técnicas

- **GitHub Actions vs Edge Function**: Actions elegido por sin límite de tiempo (vs 30s Edge Functions) y coste 0
- **WebAuth primero, Northbound después**: Las credenciales web ya existen; migración futura sin reescribir código (interfaz abstracta)
- **Sincronización diaria**: suficiente para el caso de uso actual; en tiempo real requeriría webhooks FusionSolar (no disponibles en plan estándar)
- **AES-256-GCM**: cifrado simétrico con nonce aleatorio por cifrado; la clave nunca toca la BD

## Qué quedó pendiente

1. Ejecutar `COMMIT_FV.ps1` (Juan)
2. Aplicar SQL migration en Supabase Dashboard (Juan)
3. Generar y configurar `FV_ENCRYPTION_KEY` (Juan, guardar en 1Password)
4. Configurar GitHub Secrets (Juan)
5. Añadir credenciales del primer cliente FV y hacer primer sync manual con `--dry-run`
6. Panel admin en CRM para gestionar credenciales FV (próxima sesión)
7. Soporte otras plataformas (GoodWe, iSolarCloud, SMA Ennexos) — arquitectura preparada

## Arquitectura para próximas plataformas

```python
# Para añadir GoodWe en el futuro:
# 1. Crear scripts/fv-sync/goodwe_client.py implementando FusionSolarClient
# 2. Añadir 'goodwe' al CHECK en fv_credenciales SQL
# 3. Añadir case en make_client()
# El resto (sync_job.py, frontend, tablas) NO cambia
```
