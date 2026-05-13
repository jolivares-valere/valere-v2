# Estado actual del proyecto Valere v2

> **Última actualización: 2026-05-13 (sesión 3ª) — Datadis: ConsumoTab validado en prod (4bed1ed). 6 tabs operativas. TSC 0 errores.**
>
> ## ✅ SESIÓN 2026-05-13 (3ª parte) — DATADIS: TAB CONSUMO + PERÍODOS 3.0TD
>
> | Artefacto | Cambio | Commit |
> |---|---|---|
> | `periodos30TD.ts` | Nuevo: `derivePeriod()` pura, matriz 3.0TD verano/invierno, `PeriodConfidence='estimated'`, TODO festivos v2 | `4bed1ed` |
> | `normalizers.ts` | `normalizeConsumption()` reescrito: lee `timeCurveList[].measureMagnitudeActive`, `metodoObtencion`. DTOs `ConsumoMonthlyAgg` + `ConsumoNormalized` con `byPeriod`, `dominantPeriod`, `periodConfidence` | `4bed1ed` |
> | `api.ts` | `DatadisConsumptionPoint` actualizado con campos reales: `measureMagnitudeActive`, `metodoObtencion`, `energyPoured`, `energyGenerated`, `selfConsumptionEnergy` | `4bed1ed` |
> | `SupplyDetailPage.tsx` | `ConsumoTab` reescrito: gráfico apilado P1-P6 estimado, tabla con badge Real/Estimada/Mixto, aviso ámbar, KPIs (total, media, máx hora, período dominante) | `4bed1ed` |
> | `docs/datadis/payloads/` | Fixture `get_consumption_EDISTRIBUCION_2026-05-13.json` + regla de oro en blueprint: payload real antes de normalizer | `4bed1ed` |
>
> ### Validación producción ConsumoTab (2026-05-13)
> - ✅ 13 meses visibles (2025-05 → 2026-05), total 28.071 kWh (coherente con payload real ≈28k)
> - ✅ Gráfico apilado P1-P6 con leyenda; badge "Períodos estimados" visible
> - ✅ Tabla con badges Real (12 filas) / Mixto (2025-10)
> - ✅ Aviso: "matriz 3.0TD oficial, sin festivos, error <2%"
> - ✅ Regresión: Información / Contrato / Curva / Cierres / Reactiva intactas
> - ⚠️ MÁX. HORA: 24.667 kWh con 15kW contratados — posible pico con exceso de potencia, revisar en conciliación factura
>
> ### Estado módulo Datadis — VISOR OPERATIVO COMPLETO ✅
> 6 tabs validadas en producción: Información · Contrato · Curva · Cierres · Reactiva · Consumo
>
> ### Pendientes Datadis (próximas sesiones)
> - ⏳ #35: Autoconsumo FV en normalizeConsumption() — esperar payload real de CUPS con energyPoured/energyGenerated informados
> - ⏳ #36: ConsumoTab drill-down mensual→diario→horario + filtro franja horaria
> - ⏳ Factura teórica v1: Contrato + Consumo + Maxímetro + Reactiva → estimación económica
>
> ---
>
> ## ✅ SESIÓN 2026-05-13 (2ª parte) — DATADIS: NORMALIZERS + TAB REACTIVA
>
> | Artefacto | Cambio | Commit |
> |---|---|---|
> | `src/features/datadis/normalizers.ts` | Nueva capa de normalización: `ContractDTO`, `MaxPowerDTO`, `ReactiveDTO`. Funciones `normalizeContract`, `normalizeMaxPower`, `normalizeReactive`, `extractProvince`, `extractMunicipio`, `extractTariff`. Soporta shapes EDISTRIBUCIÓN (español) + otros portales (inglés). | `a0c8e8e` |
> | `src/features/datadis/SupplyDetailPage.tsx` | Refactor completo para usar DTOs canónicos. Nueva `ReactivaTab`: KPIs, gráfico de barras con Cell coloreado, tabla P1-P6, badge de penalización por umbral. Tab 5ª añadida al router de tabs. | `a0c8e8e` + `4ea3dcc` |
> | `docs/DATADIS_BLUEPRINT_MODULO_CRM_VALERE.md` | Blueprint arquitectónico completo: DTOs, normalizers, tablas BD, dashboards, alertas, roadmap. | `b0626cb` |
>
> ### Estado módulo Datadis tras esta sesión — VALIDADO EN PRODUCCIÓN ✅
> - ✅ Normalización centralizada: frontend nunca toca campos raw de Datadis
> - ✅ Tab Reactiva funcional: KPIs (2915 kVArh total, 14/14 meses), gráfico, tabla P1-P6, badges
> - ✅ Tab Cierres: columna REACTIVA con valores reales (antes mostraba "---")
> - ✅ Tab Contrato: "Indefinido" en fin de contrato (antes mostraba "---")
> - ✅ TSC 0 errores; desplegado en https://valere-v2.pages.dev (`4ea3dcc`)
> - ⏳ Tab Consumo: desglose mensual/anual P1-P6 (próxima sesión Datadis)
> - ⏳ Curva Tipo 1/2: pendiente probar con CUPS de telemedida real
> - ⏳ Mover normalización al Edge Function datadis-proxy (backend, futuro)
>
> ---
>
> ## ✅ SESIÓN 2026-05-13 (1ª parte) — FV HARDENING COMPLETO + AUDIT SCAFFOLD
>
> | Artefacto | Cambio | Commit / Estado |
> |---|---|---|
> | `fusionsolar_client.py` | EU5 fix: `get_daily_kpi` detecta `NE=` → usa `dn`+`queryTime`+`timeZone:2`. Retry x3 en StorageStateClient. | `45a7c3a` en main |
> | `sync_job.py` | Overflow guards HOTEL SIERRA LUZ (`>99,999→0`). `sleep(1)` anti-rate-limit. | `45a7c3a` en main |
> | `.github/workflows/fv-sync.yml` | Cron `0 7 * * *` (07:00 UTC). `concurrency.group`. Fix YAML inputs injection (inputs via `env:` vars). | `4a50df9` + `a5ad0b4` en main |
> | `sync_job.py` | Helpers `_audit_record()` (no bloqueante) + `_classify_error()`. `run_id` UUID por ejecución. Backfill instrumentado. | `24653ce` en main ✅ |
> | `supabase/migrations/20260513_fv_sync_audit.sql` | ENUM `fv_error_category`, tabla `fv_sync_audit`, 4 índices, vista `fv_sync_health_latest`, RLS via `empresas.comercial_id`. | Aplicado en prod ✅ |
> | `supabase/migrations/20260422_fase28_6_rls_policies_cleanup.sql` | RLS granular notificaciones + limpieza policies custom_fields duplicadas. | Aplicado en prod ✅ |
> | `docs/PLAN_INCIDENCIAS_CRM_CONEXION.md` | Plan completo para conectar IncidenciasTab a tabla `incidencias` real (~2h). | Documentado ✅ |
>
> ### Validación local EU5 (sesión 2026-05-13)
> - EU5 fix validado localmente con `python sync_job.py`: `NE=135347362` KPI insertado OK
> - Overflow guard capturó `-99999999.0` para HOTEL SIERRA LUZ → guardado como `0.0 kWh` ✅
> - Merge `feature/fv-operational-redesign` → `main` completado: `24653ce` ✅
>
> ### Seguridad — Supabase Advisor (2026-05-13)
> **Resuelto**: `rls_disabled_in_public` → 0 tablas sin RLS.
> - `fv_credenciales_backup_20260511`, `fv_planta_backup_20260511`, `fv_sync_log_backup_20260511` → RLS ON sin policies (bloqueadas). Migración: `20260513_fix_rls_backup_tables.sql`
> - `datadis_provincias` → RLS ON + lectura authenticated.
> - ⏳ Pendiente DROP de las 3 tablas backup cuando se confirme que las migraciones del 11/05 están consolidadas.
>
> ### Pendientes FV (próxima sesión)
> - ⏳ **[BLOQUEANTE]** CI auth fallback: `AUTH_REDIRECT → WebAuthClient → persistir storage_state → retry único`
> - ⏳ Asignar 7 plantas reales a empresa+CUPS desde tab "Sin asignar"
> - ⏳ Configurar `RESEND_API_KEY` en Supabase Edge Functions Secrets
> - ⏳ Configurar `GITHUB_PAT` en Supabase Edge Functions Secrets
> - ⏳ Deploy Edge Function `trigger-fv-sync`
> - ⏳ Conectar `IncidenciasTab` a tabla `incidencias` real (plan en `docs/PLAN_INCIDENCIAS_CRM_CONEXION.md`, ~2h)
> - ⏳ Deploy Edge Function `chat-consultor`
> - ⏳ Regenerar tipos Supabase (4 casts `supabase as any` restantes)
> - ⏳ DROP tablas backup 20260511 (cuando confirmado que no se necesitan)
>
> ---
>
> ## ✅ SESIÓN 2026-05-12 — FV SESSION MANAGEMENT + SYNC MANUAL DESDE CRM
>
> ## ✅ SESIÓN 2026-05-12 — FV SESSION MANAGEMENT + SYNC MANUAL DESDE CRM
>
> | Artefacto | Cambio | Commit |
> |---|---|---|
> | **Supabase migración** | `fv_credenciales`: nuevo campo `estado_sesion` (activa/por_caducar/caducada/error/desconocida) + `cookies_expires_at` público. Vista `fv_credenciales_safe` actualizada. Función helper `fv_estado_sesion()`. | via MCP |
> | `sync_job.py` | Escribe `estado_sesion` tras cada intento sync. Refleja `cookies_expires_at` secret→público. Protege KPIs existentes si falla auth (no sobreescribe). Acepta `--credencial <uuid>` para sync puntual. | `7f12dc5` |
> | `fv-sync.yml` | Input `credencial_id` en `workflow_dispatch` para sync por credencial desde CRM. | `7f12dc5` |
> | `supabase/functions/trigger-fv-sync/index.ts` | **Nueva Edge Function**: recibe petición del CRM (master/admin), llama GitHub Actions dispatch API con `GITHUB_PAT`. Registra en `fv_sync_log`. | `7f12dc5` |
> | `api.ts` | Tipo `FVEstadoSesion`, campo `estado_sesion` en `FVCredencial`, hook `useTriggerFVSync()`. | `7f12dc5` |
> | `CredencialesTab.tsx` | Badge 🟢/🟠/🔴 por credencial. Botón "Sincronizar" individual. Botón "Sincronizar todo". Aviso sesión caducada con comando exact de `extract_cookies.py`. | `7f12dc5` |
>
> **Pendiente tras esta sesión:**
> 1. Crear GitHub PAT (Actions: Read & Write) → añadir como secret `GITHUB_PAT` en Supabase Edge Functions
> 2. `npx supabase functions deploy trigger-fv-sync --project-ref gtphkowfcuiqbvfkwjxb`
> 3. Renovar cookies FusionSolar (`python extract_cookies.py`) y validar botón Sincronizar en CRM
>
> ---
>
> ## ✅ SESIÓN 2026-05-12 — FIX BUG CACHÉ EU5 (sesión anterior continuada)
>
> | Artefacto | Cambio | Commit |
> |---|---|---|
> | `fusionsolar_client.py` | `StorageStateClient.get_station_list`: añadida clave `dn` al cache key (EU5 usa `dn`, no `stationCode`). `get_station_kpi`: check ampliado de campos realtime + warning de fallback. | `626985a` |
> | `sync_job.py` | Logs `[DIAG-KPI]` para validar clave EU5. KPI extraction con todas las variantes de campo. Fix `capacidad_kwp` usando `onlyInverterPower` como fallback. | `626985a` |
> | `api.ts` | Join `cups:cups(id, codigo_cups)` + normalización `ultima_sync` y `cups_asociados`. | `7f12dc5` |
>
> ---

> **Última actualización: 2026-05-11 por Cowork — SESIÓN 3ª: fixes cierres duplicados (PlantasTab 79f07cf, AsignarPlantaModal daef025) + nueva tab "Alarmas FV" con datos reales Supabase (c9c8a16). TSC 0 errores. Branch: feature/fv-operational-redesign.**
>
> ## ✅ SESIÓN 2026-05-11 (3ª parte) — ALARMAS FV + FIXES DUPLICADOS
>
> | Artefacto | Cambio | Commit |
> |---|---|---|
> | `PlantasTab.tsx` | Eliminadas líneas 146-147 (cierre `)\n}` duplicado por bug sandbox append) | `79f07cf` |
> | `AsignarPlantaModal.tsx` | Eliminado `}` extra en línea 235 | `daef025` |
> | `api.ts` | Nuevo hook `useTodasLasAlarmas()` — JOIN `fv_alarma` → `fv_planta` → `empresas`, limit 200, orden `iniciada_en` DESC | `c9c8a16` |
> | `AlarmasTab.tsx` | Nueva tab: KPIs (activas/críticas/mayores/resueltas), buscador, filtros estado+severidad, botón refetch, lista con colores por severidad | `c9c8a16` |
> | `SeguimientoFVPage.tsx` | Tab "Alarmas FV" entre Excedentes e Incidencias CRM; "Incidencias" → "Incidencias CRM" | `c9c8a16` |
>
> **Estado actual**: 9 tabs en `/seguimiento-fv`. Alarmas FV lee de `fv_alarma` real (28 alarmas sincronizadas). PlantasTab y AsignarPlantaModal sin crashes. TSC 0 errores.
>
> ## ✅ SESIÓN 2026-05-11 (2ª parte) — HARDENING FRONTEND FV
>
> | Fix | Archivo | Cambio | Commit |
> |---|---|---|---|
> | C-1 crash PlantasTab | `PlantasTab.tsx:128` | `(p.cups_asociados ?? []).length` — guard undefined | `386875d` |
> | C-2 vista 404 | Supabase | `CREATE VIEW fv_credenciales_safe` con `security_invoker=true` + `GRANT SELECT TO authenticated` | via MCP |
> | C-3 estados KPI | `sync_job.py:82` | `normalize_status`: añadido `connected/on-grid→normal`, `faulty→defectuoso`, `off-grid→desconectado` | `386875d` |
> | I-4 modal "0" | `AsignarPlantaModal.tsx:109` | `!!planta.capacidad_kwp` evita render de `0` en JSX | `386875d` |
>
> **Estado fv_planta tras sync**: FOAM JAEN/MENGIBAR/JUAN RUBIO → `normal` ✅ · GUADIX/HOTEL SIERRA LUZ → `desconectado` ✅ · FOAM SANTIPONCE/PAZ Y BIEN → `desconocido` (FusionSolar envía estado no mapeado aún).
> **capacidad_kwp=0**: 5 plantas — FusionSolar no tiene el campo registrado en el portal (no es bug del sync).
>
> ## ✅ SESIÓN 2026-05-11 — SYNC FV REAL + FIXES SQL + ALARMAS
>
> | Artefacto | Cambio | Commit |
> |---|---|---|
> | Supabase `fv_upsert_planta` | DROP + recreación con `RETURNS TABLE(planta_id, planta_empresa_id, planta_is_new)` — elimina ambigüedad entre output columns y columnas de `fv_planta`. UPDATE usa alias `fp`. | via MCP Supabase |
> | `scripts/fv-sync/sync_job.py` | Lee `res.data[0]["planta_id"]` (nuevo nombre RETURNS TABLE). Upsert `fv_alarma` usa `iniciada_en` (real) en vez de `detectada_en` (inexistente). Añadidos `alarm_id` y `dispositivo`. | `518da18` → feature/fv-operational-redesign |
>
> **Resultado verificado en Supabase**: `fv_planta=7, fv_kpi_realtime=7, fv_kpi_diario=7, fv_sync_log=92+`. Sync limpio: `1/1 OK — 7 plantas, 0 alarmas en 17.4s`.
>
> **Flujo de refresco de cookies**: las cookies FusionSolar duran ~7 días. Cuando expiren, ejecutar `python extract_cookies.py` (abre browser visible, hace login, guarda en `fv_credenciales_secret`).
>
> ## ✅ SESIÓN 2026-05-11 — CI FIX + DIAGNÓSTICO FV SYNC + COMMIT MÓDULO FV
>
> | Artefacto | Cambio | Commit |
> |---|---|---|
> | `.github/workflows/fv-sync.yml` | Step "Ejecutar sincronización" estaba truncado en línea 63 (solo `name:`). Completado con `working-directory`, `env` (4 secrets) y `run: python sync_job.py`. | `c70d44b` → main |
> | `src/features/seguimiento-fv/api.ts` | Eliminado fragmento duplicado líneas 496-512 (causa build error). Completadas truncaciones en `onSuccess`/`onError` + 3× `(supabase as any)` para columnas post-migración. | `3f095e1` → feature/demo-audit-mode |
> | `src/App.tsx` | Completada truncación en route `/cartera-senior`. | idem |
> | `src/components/layout/Sidebar.tsx` | Completadas etiquetas de cierre truncadas. | idem |
> | `src/core/demo/fixtures.ts` | Recuperadas 221 líneas perdidas (FV_ALARMAS, CUPS, DATADIS, CAPTACION, FIXTURES export). | idem |
> | `src/features/seguimiento-fv/components/PlantasTab.tsx` | Truncación + `title` → `aria-label` en icono Battery. | idem |
> | `src/features/seguimiento-fv/components/ProduccionTab.tsx` | Truncación + formatter recharts tipado con `as [string, string]`. | idem |
> | `feature/fv-operational-redesign` | 14 archivos del módulo FV completo (frontend + Edge Function + migración SQL + Python). | `7c64604` → new branch |
>
> **Run #97 resultado**: YAML fix confirmado (job ejecutó 44s vs fallo instantáneo anterior). AUTH_REDIRECT FusionSolar — cookies de sesión invalidadas server-side por Huawei. Fix: ejecutar `extract_cookies.py` localmente tras despliegue coordinado.
>
> ## ⏳ CAMBIO COORDINADO FV — PENDIENTE DESPLIEGUE (rama lista 2026-05-11)
>
> **Todo listo en rama `feature/fv-operational-redesign` (commit 7c64604). NO aplicar por separado.**
>
> Orden de despliegue cuando estés listo:
> 1. Backup tablas `fv_credenciales` y `fv_planta` en Supabase Dashboard
> 2. Configurar `FV_ENCRYPTION_KEY` en Supabase → Edge Functions → Secrets (32 bytes base64, misma clave que Python)
> 3. `supabase functions deploy fv-create-credential --project-ref gtphkowfcuiqbvfkwjxb`
> 4. Aplicar `supabase/migrations/20260510_fv_alta_manual_credenciales.sql` en SQL Editor
> 5. `python sync_job.py --check-secrets` — verifica secretos post-migración
> 6. `python sync_job.py --dry-run` — smoke sin escritura
> 7. Probar alta de credencial real desde CRM → verificar login FV
> 8. Probar asignación de planta a empresa+CUPS
> 9. Validar UI en `feature/fv-operational-redesign`
> 10. Activar sincronización recurrente
>
> Rollback SQL documentado en docs/SESIONES/2026-05-10-resumen.md.
>
> ## ✅ SESIÓN 2026-05-10 — FV MÓDULO ALTA MANUAL + SEGURIDAD
>
> | Archivo | Cambio |
> |---|---|
> | `supabase/migrations/20260510_fv_alta_manual_credenciales.sql` | Split-table: `fv_credenciales` (operativa) + `fv_credenciales_secret` (secretos, solo service_role). RLS + REVOKE sobre authenticated/anon. `username_masked` generado. `fv_planta` con `cups_id`, `sync_enabled`, `nombre_fusionsolar`, `nombre_interno`, `empresa_id` nullable. |
> | `supabase/functions/fv-create-credential/index.ts` | Edge Function: cifrado AES-256-GCM, JWT + rol admin/master, escribe en ambas tablas, rollback si falla secret, nunca devuelve password_enc |
> | `src/features/seguimiento-fv/api.ts` | `useCrearCredencial`/`useActualizarCredencial` vía Edge Function, `usePlantasSinAsignar`, `useAsignarPlantaEmpresa` |
> | `src/features/seguimiento-fv/components/CredencialFormModal.tsx` | Formulario alta/edición credencial con toggle password, aviso seguridad, plataformas pre-configuradas |
> | `src/features/seguimiento-fv/components/AsignarPlantaModal.tsx` | Asignación planta → empresa + CUPS con selects en cascada |
> | `src/features/seguimiento-fv/components/CredencialesTab.tsx` | Self-fetching, fallback a fixtures, banner demo mode, botones crear/editar |
> | `src/features/seguimiento-fv/components/SinAsignarTab.tsx` | Self-fetching, tabla con "Asignar cliente" por planta |
> | `scripts/fv-sync/sync_job.py` | `load_fv_credentials_with_secrets()` (JOIN a tabla secreta), `check_secrets_diagnostic()`, `--check-secrets` flag, sin KeyError si falta secret |
> | `scripts/fv-sync/extract_cookies.py` | Lee password de `fv_credenciales_secret`, escribe cookies en `fv_credenciales_secret` vía upsert |
> | `COMMIT_FV_MODULE_2026-05-10.ps1` | Incluye todos los archivos anteriores, checklist de despliegue en output |
>
> ## ✅ SESIÓN 2026-05-10 — FV SYNC DIAGNÓSTICOS (sesión anterior)
>
> | Archivo | Cambio | Commit |
> |---|---|---|
> | `fusionsolar_client.py` | FusionSolarAuthError/ResponseError + StorageStateClient completo (check_session, _log_storage_state_info, _fetch estructurado, login robusto con FusionSolarAuthError en redirect) | `cda9a24` |
> | `extract_cookies.py` | Usa `context.storage_state()` (cookies + localStorage) en vez de solo `context.cookies()` | `cda9a24` |
> | `sync_job.py` | Importa FusionSolarAuthError, catch específico con log `AUTH_REDIRECT` + `ACCIÓN REQUERIDA: ejecuta extract_cookies.py` | `cda9a24` |
> | `test_cookie_auth.py` | Reescrito: usa StorageStateClient igual que CI, check_session() + get_station_list(), diagnósticos OK/AUTH_REDIRECT/NON_JSON/SUPABASE_ERROR | `cda9a24` |
> | `fv-sync.yml` | Elimina step Playwright duplicado; añade step "Diagnóstico entorno" (fecha UTC, Python version, vars de entorno presentes sin mostrar valores) | `cda9a24` |
>
> ## ⏳ PENDIENTES FV (fase hardening)
>
> - ✅ Sync FusionSolar real: 7 plantas, 28 alarmas, upserts idempotentes
> - ✅ Frontend hardening: crash PlantasTab, vista fv_credenciales_safe, normalize_status, modal fix
> - ⏳ Asignar 7 plantas reales a empresa + CUPS desde tab "Sin asignar"
> - ⏳ Activar cron GitHub Actions nocturno (fv-sync.yml ya existe — añadir schedule)
> - ⏳ Configurar RESEND_API_KEY para alertas email alarmas críticas
> - ⏳ Tab "Alarmas FusionSolar" separado de "Incidencias CRM"
> - ⏳ Mapear estados FusionSolar desconocido restantes (FOAM SANTIPONCE, PAZ Y BIEN)
> - ⏳ Limpiar logs [DIAG] temporales en sync_job.py
> - ⏳ localStorage.removeItem("sb-dtpbghvfxwyvkugtsojr-auth-token") en cliente
>
> ## 📋 PENDIENTES CRM (previos, sin cambios hoy)
>
> - ✅ SQL fase28.6 aplicado en Supabase 2026-05-13 vía MCP (`fase28_6_rls_policies_cleanup`). **Nota**: aplicado manualmente, NO mediante `supabase db push` — el archivo local `20260422_fase28_6_rls_policies_cleanup.sql` queda como referencia histórica pero ya NO debe re-ejecutarse.
> - Deploy Edge Function `chat-consultor`
> - Regenerar tipos Supabase (4 casts `supabase as any` restantes)

> **Última actualización (más reciente): 2026-05-05 (jornada larga) por Cowork — 5 sprints encadenados con smoke real Carolina entre cada uno. Todo desplegado.**
>
> ## ✅ JORNADA 2026-05-05 — RESUMEN
>
> Sesión arrancó con feedback real de Carolina A sobre Herba Ricemills. Encadenamos 5 sprints validados con smoke entre cada uno:
>
> | Sprint | Commit | Smoke |
> |---|---|---|
> | Sprint Fase 2-3 + vencimiento prospecto | `0260ae3` | OK Carolina |
> | Sprint C — visibilidad post-handoff | `8c38089` | OK con Claude in Chrome |
> | Hotfix C — toast + drawer placeholder | `ffb3bfa` | OK Carolina |
> | Sprint D1 — helper vencimiento + cards | `b3c3d03` | OK uso real |
> | Fix1 RAG — Edge Function v20 (sin Fuentes:) | (Edge Fn, no commit) | 3/3 OK |
> | Fix2 RAG — docs/help al día | `d0efcf6` | 5/5 OK Carolina |
> | Micro-fix RAG — Edge Function v21 anti-alucinación | (Edge Fn, no commit) | aplicado tras alucinación P5 |
>
> ## ✅ SPRINT C — VISIBILIDAD POST-HANDOFF (2026-05-05)
>
> Origen: smoke real Carolina con Herba Ricemills. Al pasar caso a analista perdía control comercial.
>
> ### BD aplicada (mirror SQL: `supabase/migrations/20260505_sprint_c_visibilidad_post_handoff.sql`)
> - Vista `v_captacion_todos_mis_casos` ampliada: incluye `created_by`, `creador_nombre`, `creador_funciones`.
> - RPC `agregar_comentario_oportunidad(uuid, text)` — inserta actividad tipo `nota` permitido a responsable, creador, admin/senior, o usuario que aparezca en handoffs.
>
> ### Frontend
> - `OportunidadDrawer`: cabecera "Responsable / Creador", banner azul "Solo seguimiento", botón "Añadir comentario" + form inline. Footer de cambio de etapa oculto cuando `esSoloSeguimiento`.
> - `BandejaCard`: badge azul "Solo seguimiento" cuando user no es responsable (solo en pestaña "Todos mis casos").
> - Hook `useAgregarComentario`.
>
> ### Hotfix C aplicado (commit `ffb3bfa`)
> - Toaster: `top-right` 3.5s → `bottom-right` 5s. No tapa botones.
> - Drawer vencimiento: ahora siempre visible en captación; placeholder dashed gris cuando no hay fecha. Carolina ve si guardó OK.
>
> ## ✅ SPRINT D1 — HELPER + CARDS MEJORADAS (2026-05-05)
>
> Origen: análisis Carolina + ChatGPT — la card no decía qué hacer, había que abrir cada drawer.
>
> ### BD (mirror SQL: `supabase/migrations/20260505_d1_v_mis_oportunidades_vencimiento.sql`)
> - Vista `v_mis_oportunidades` ampliada: `fecha_vencimiento_contrato_prospecto`, `fuente_vencimiento_contrato_prospecto`, `factura_fecha_prevista`. Aditivo, sin breaking changes.
>
> ### Frontend
> - Nuevo módulo `src/features/captacion/utils/vencimiento.ts`: helper limpio con campos `estado / diasRestantes / label`. Función `siguienteAccionLead(etapa, fecha)` con overlay de urgencia. `ESTADO_CLASSES` central.
> - 15 tests nuevos (`vencimiento.test.ts`) con `vi.useFakeTimers`. Cubre 90 días = amarillo (caso borde validado).
> - Migrado helper viejo en `api.ts` (re-export). `VencimientoContratoForm` y `OportunidadDrawer` usan `sem.estado`.
> - `BandejaCard`: badge color con texto "Vence en X días" debajo del NIF (solo si hay fecha). Línea "→ siguiente acción" ahora dinámica con texto urgente cuando aplica.
>
> ### Resultado
> Carolina ve en cards: "Urgente: vence en 15 días — llama ya", "Prioridad alta: vence en 50 días", etc. Sin abrir el drawer.
>
> ## ✅ FIX1 RAG — EDGE FUNCTION SIN "FUENTES:" (2026-05-05)
>
> Origen: smoke Carolina detecta que el asistente RAG mostraba `[Fuente N: docs/help/...]` en respuestas. Ruido visual + jerga técnica para usuario no técnico.
>
> ### Aplicado
> - Edge Function `ask-crm-docs` versión 20 desplegada via MCP.
> - System prompt reescrito: prohíbe explícitamente citar archivos, rutas, "Fuentes:", "Referencias:".
> - Contexto interno usa delimitadores neutros (`--- INFORMACIÓN INTERNA ---` / `--- FIN ---`) sin path. El LLM ya no tiene de dónde copiar la sintaxis técnica.
> - Array `sources` sigue en JSON por si futuro UI propio, pero hoy se ignora.
>
> ## ✅ FIX2 RAG — DOCS/HELP AL DÍA (2026-05-05)
>
> Origen: tras Fix1, las preguntas sobre features nuevas ("Solo seguimiento", "comentario", "prospecto vs cliente") devolvían honestamente "No encuentro información". Faltaba la documentación.
>
> ### Docs nuevos
> - `docs/help/captacion/separacion-prospecto-cliente.md` (9 chunks indexados).
> - `docs/help/captacion/seguimiento-tras-handoff.md` (12 chunks).
> - `docs/help/captacion/vencimiento-y-semaforo.md` (12 chunks).
>
> ### Docs actualizados
> - `crear-lead.md`: bloque vencimiento + nace prospecto.
> - `pasar-a-analisis.md`: sección "Después de pasarlo" con visibilidad + comentarios.
> - `README.md`: índice + estado.
>
> ### Pipeline
> Workflow `regenerate-help-embeddings` ejecutó: DELETE + INSERT en `crm_help_embeddings`. Embeddings nuevos validados con SQL contra Supabase.
>
> ### Smoke 5/5 OK con Carolina
> 1. "Solo seguimiento" → respuesta operativa.
> 2. "Cómo añado comentario" → pasos numerados.
> 3. "Prospecto vs cliente" → diferencias claras.
> 4. "Cómo registro fecha vencimiento" → vías + fuentes + semáforo.
> 5. Bonus "Cómo funciona el semáforo" → tabla colores.
> Sin "Fuentes:", sin rutas, sin jerga técnica.
>
> ## Deuda técnica conocida (no bloqueante)
>
> - **4 casts `(supabase as any)`** por columnas nuevas no reflejadas en tipos generados. Solución: regenerar tipos. Pendiente.
> - **Cache Cloudflare con bundles obsoletos** en tabs viejos. Patrón conocido. Solución: hard refresh + tab nuevo.
> - **Alucinación menor del asistente RAG**: la respuesta P5 mencionó *"Naranja y Rojo aparecen en Dashboard como alertas"* — no implementado. Si Carolina lo busca y no lo encuentra, refinar doc o implementar alertas reales.
>
> ## Próxima sesión (orden firmado tras dictamen ChatGPT cierre)
>
> **REGLA #0:** NO arrancar nada técnico hasta tener feedback REAL de Carolina.
>
> 1. **Recoger feedback real Carolina** (sin código). Frases literales tipo "no veo qué hacer hoy" / "abro muchas cards" / "¿qué hago ahora?".
> 2. Si Carolina aporta fricción → fix prioritario por su feedback.
> 3. Si no → **D2 vista tabla**. Mensaje detallado en `.cowork/outbox/2026-05-06T-d2-vista-tabla.md`.
> 4. **Decisión Dashboard comercial.** ChatGPT entregó scope completo (KPIs + alertas + acciones del día + pipeline + equipo + funnel). Trigger: 2 de 4 síntomas en uso real. Si no, no arrancar.
> 5. Filtros CRM restantes: Datadis, Renovaciones, Incidencias, Contratos.
> 6. Regenerar tipos Supabase + quitar 4 casts.
>
> ## Backlog estratégico (no arrancar sin trigger)
>
> - **`.cowork/backlog/agenda-captacion.md`** — agenda interna captación + estrategia calendarios compartidos. Plan completo con fases (interna primero, Google Calendar después). Trigger: Carolina dice "no sé a quién llamar hoy" o >20-30 prospectos activos por persona. Scope estimado cuando arranque: 1-2 sesiones cowork. El 60% de lógica ya en código.
>
> ---
>
> **Última actualización (anterior): 2026-05-05 por Cowork — Sprint Fase 2-3 separación CRM/Captación + vencimiento contrato prospecto cerrado y desplegado.**
>
> ## ✅ SPRINT FASE 2-3 + VENCIMIENTO PROSPECTO — DESPLEGADO (2026-05-05)
>
> Commit `0260ae3` en `origin/main`. TSC 0, tests 74/74, build OK, push OK. Cloudflare deploy pendiente (~2 min).
>
> ### Lo que entrega
>
> **Separación lógica CRM ↔ Captación**
> - Empresas, contactos, oportunidades, dashboard y búsqueda global del CRM filtran por `estado_relacion='cliente'` / `contexto='crm'`.
> - Captación opera independiente: prospectos no contaminan listas del CRM hasta promoción explícita.
> - Drawer captación muestra badge ámbar **PROSPECTO** y botón verde "Convertir a cliente CRM" (admin/senior + etapa cerrada_ganada/contrato_firmado/activo) → invoca RPC `convertir_prospecto_a_cliente`.
>
> **Vencimiento contrato actual del prospecto**
> - 3 columnas nuevas en `oportunidades`: `fecha_vencimiento_contrato_prospecto`, `fuente_vencimiento_contrato_prospecto`, `notas_vencimiento_contrato_prospecto`. Aisladas de la tabla `contratos` real (CRM).
> - Componente `VencimientoContratoForm` reutilizable (date + select fuente + notas + semáforo en vivo).
> - Helper puro `calcularSemaforoVencimiento`: verde >90d, amarillo ≤90d, naranja ≤60d, rojo ≤30d, vencido <0.
> - Integrado en `NuevoLeadModal` (bloque "Datos adicionales") y `EditarLeadModal` (sección dedicada con flag `actualizar_vencimiento` para distinguir borrar vs no tocar).
> - `OportunidadDrawer` muestra fecha + semáforo + fuente + notas en el detalle.
>
> ### BD prod (aplicada vía MCP, mirror SQL en disco)
>
> 1. `20260505_fase1_separacion_captacion_crm.sql`
>    - ALTER `empresas` (+ `estado_relacion`, `origen_relacion`, `convertido_cliente_at/_por`)
>    - ALTER `oportunidades` (+ `contexto`, `convertida_a_crm_at/_por`)
>    - Backfill: 24 clientes históricos / 9 prospectos (4 DEMO + 2 TEST SMOKE + 3 leads Carolina A)
>    - Trigger `enforce_oportunidad_contexto_coherence`
>    - RPC `convertir_prospecto_a_cliente` SECURITY DEFINER
>    - 4 vistas con `security_invoker = true`
>    - `crear_lead_captacion` v3 con prospecto/captacion forzados
> 2. `20260505_vencimiento_contrato_prospecto.sql`
>    - 3 columnas nuevas en `oportunidades` + check constraint en `fuente_vencimiento`
>    - `crear_lead_captacion` v4 (3 params nuevos opcionales)
>    - `actualizar_lead_captacion` v3 (flag `p_actualizar_vencimiento` boolean)
>
> ### Deuda técnica conocida (no bloqueante)
>
> - 4 archivos con cast `(supabase as any)` por columnas nuevas no reflejadas en tipos generados:
>   - `src/features/empresas/api.ts:32`
>   - `src/features/oportunidades/api.ts:30`
>   - `src/features/dashboard/api.ts:51`
>   - `src/components/search/GlobalSearch.tsx:26`
> - Solución: regenerar tipos con `supabase gen types typescript --project-id gtphkowfcuiqbvfkwjxb > src/core/types/database.ts` y quitar los casts.
>
> ### Smoke test pendiente Juan (post deploy CF)
>
> 1. `/empresas` debe mostrar 24 clientes, NO 33.
> 2. `/captacion` sigue mostrando los 9 prospectos.
> 3. Crear lead nuevo → nace con `estado_relacion=prospecto, contexto=captacion`.
> 4. Vencimiento prospecto: 15d→rojo, 50d→naranja, 80d→amarillo, 200d→verde.
> 5. Convertir a cliente: solo admin/senior + etapa ganado/firmado.
>
> ### Orden siguiente sesión (acordado con Juan/ChatGPT 2026-05-05)
>
> 1. Smoke corto separación/vencimientos (validar antes de tocar nada).
> 2. Filtros módulos CRM restantes: Datadis, Renovaciones, Incidencias, Contratos.
> 3. Badge "Vence en X días" en `BandejaCard` (P1 útil para Carolina).
> 4. Regenerar tipos Supabase + quitar 4 casts `(supabase as any)`.
> 5. Tests unitarios `calcularSemaforoVencimiento` (helper puro, fácil con `vi.useFakeTimers`).
>
> Mensaje detallado para próxima sesión en `.cowork/outbox/2026-05-05T-prioridades-post-fase23.md`.
>
> ---
>
> **Última actualización (anterior): 2026-05-04 tarde por Cowork (sesión autónoma) — Sprint Operativo Captación COMPLETO en disco (Días 1-5). Pendiente PS1 commit + push.**
>
> ## ✅ SPRINT OPERATIVO CAPTACIÓN — COMPLETO
>
> Carolina Aroca ya puede operar end-to-end. La sesión autónoma de la tarde cerró Días 2-5.
>
> **Día 1 commiteado en main** (commit `4dfc3b1`): permisos por funciones, drawer base, RPC lead.
>
> **Días 2-5 en disco, pendiente commit** (script `COMMIT_SPRINT_DIAS2_5_2026-05-04.ps1`):
> - Modal "+ Nuevo lead" con form mínimo viable
> - 14 forms contextuales por etapa cubriendo todo el ciclo:
>   - Por llamar: No contesta / No es decisor / Esperando factura / No interesa
>   - Esperando factura: Recordatorio / Factura recibida (upload) / Pasar a análisis / No envía
>   - Factura recibida (Carolina M): Empezar análisis / Asignar a senior
>   - En análisis / Propuesta en preparación: Subir propuesta lista
>   - Asignada a senior: Empezar a preparar propuesta
>   - Propuestas para enviar: Marcar enviada
>   - Seguimientos: Cliente acepta / rechaza (con motivo) / Pedir visita / Programar
> - Upload Supabase Storage con validaciones (PDF/JPG/PNG, max 15MB, sanitización)
> - Handoffs manuales con triggers BD (responsable_actual_id se actualiza solo)
> - Tab "Todos mis casos" cross-bandeja para Carolina A
> - 35 tests nuevos (motivos, storage, permissions)
>
> ### BD aplicada en prod
>
> 1. `20260504_sprint_operativo_captacion_dia1.sql` (commiteada)
> 2. `20260504_sprint_captacion_dia3_storage_policies.sql` (en disco):
>    - helper `user_has_funcion(text)` STABLE SECURITY DEFINER
>    - policies adicionales en bucket `documentos` para funciones telemarketing/analista/asesor_senior/admin
>    - policies adicionales en tabla `public.documentos`
>
> ### Pendiente operativo Juan
>
> 1. Ejecutar `.\COMMIT_SPRINT_DIAS2_5_2026-05-04.ps1` (valida TSC + tests + build, commit + push, ~2 min).
> 2. Esperar deploy Cloudflare Pages (~2 min).
> 3. Smoke test login Carolina Aroca + ciclo completo.
> 4. Si OK → enviar onboarding actualizado al equipo.
>
> ### Próximos pasos posibles tras uso real
>
> - Sprint plantillas propuestas (PDF auto)
> - Google Calendar integración para visitas
> - Permisos capa B/C/D del backlog
> - Notificaciones push/email
>
> ---
>
> **Última actualización (anterior): 2026-05-04 por Cowork — Smoke test 4 perfiles + onboarding + feedback ready. Listo para arrancar uso real.**
>
> ## ✅ DÍA 1 USO REAL — TODO PREPARADO (2026-05-04)
>
> Sesión enfocada en validación pre-uso, sin código nuevo (directriz ChatGPT).
>
> ### 1. Smoke test BD + código (objetivo)
>
> Verificación SQL de `v_mis_oportunidades` por usuario + auditoría Sidebar.tsx + App.tsx + deploy Cloudflare.
>
> | Usuario | Bandeja real (BD) |
> |---|---|
> | Carolina Aroca [telemarketing] | Industria Textil ABC [esperando_factura] |
> | Carolina Maciñeiras [analista] | Hostal del Pino [factura_recibida] |
> | Antonio Rodriguez [asesor_senior] | Frigorífica Norte [asignada_a_senior] |
> | Juan Olivares [admin+asesor_senior] | Bodega Mediterránea SL [asignada_a_senior] (€18.500 / €9.200/año) |
>
> **Nota:** se añadió Bodega Mediterránea SL a Juan el 2026-05-04 para que su bandeja Cartera Senior tenga al menos 1 caso visible al validar UI. `external_id='DEMO_MVP'` para borrado fácil cuando lleguen datos reales.
>
> Filtrado correcto. Deploy `valere-v2.pages.dev` HTTP 200 servido por Cloudflare.
>
> ### 2. Fugas conocidas (deuda no bloqueante para uso real)
>
> - Sidebar "CRM Comercial" (13 items) y "Gestión de Potencias" (9 items) visibles a todos sin filtro por funciones.
> - Solo `/admin` tiene guard de rol; resto de rutas accesibles tecleando URL directa.
> - RLS permisivo (cualquier authenticated puede CRUD cualquier tabla).
>
> Aceptado como deuda. Si el equipo reporta fricción real durante uso, se desbloquea capa A del backlog de permisos.
>
> Doc: `docs/SMOKE_TEST_4_USERS_2026-05-04.md`.
>
> ### 3. Onboarding equipo listo
>
> 3 borradores de mensaje (Antonio, Carolina M, Carolina A) en `docs/ONBOARDING_4_USERS_2026-05-04.md`. Tono coloquial profesional, en castellano. Carolina Aroca con password temporal `Valere2026Temporal!` y reset en primer login.
>
> ### 4. Mecanismo feedback activado
>
> `docs/FEEDBACK_USO_REAL.md` con plantilla copiable + 6 categorías (`fuga`, `hueco`, `ux`, `bug`, `mejora`, `confianza`). Trigger: 3+ entradas o ≥7 días → Cowork procesa y propone sprint correctivo.
>
> ### Próximo paso (NO es código, es operativo de Juan)
>
> 1. Enviar los 3 mensajes a Antonio, Carolina M y Carolina A.
> 2. Asignarse a sí mismo una oportunidad demo si quiere validar UI desde perfil senior (su bandeja sale vacía hoy).
> 3. Llenar `docs/FEEDBACK_USO_REAL.md` a medida que aparezcan fricciones.
> 4. Esperar ≥1 semana antes de pedir nuevas features.
>
> ---
>
> **Última actualización (anterior): 2026-05-03 por Cowork — 4 usuarios reales operativos + 3 demos reasignados. Próximo: uso real ≥1 semana.**
>
> ## ✅ USUARIOS REALES OPERATIVOS (2026-05-03)
>
> 4 usuarios reales con funciones asignadas. Las 3 oportunidades demo han sido reasignadas a sus responsables reales según el flujo:
>
> | Usuario | Email | Funciones | Demo asignada (etapa) |
> |---|---|---|---|
> | Juan Olivares | jolivares@ | `['admin','asesor_senior']` | (sin demo asignada — supervisión) |
> | Antonio Rodriguez | arodriguez@ | `['asesor_senior']` | DEMO MVP — Frigorífica Norte SL (asignada_a_senior) |
> | Carolina Maciñeiras | administracion@ | `['analista']` | DEMO MVP — Hostal del Pino SL (factura_recibida) |
> | Carolina Aroca | info@ | `['telemarketing']` | DEMO MVP — Industria Textil ABC SL (esperando_factura) |
>
> ### Carolina Aroca — credencial inicial
>
> Usuario creado vía SQL en auth.users (no había registro previo). Password temporal: `Valere2026Temporal!`. Juan le facilita el acceso y le pide reset de password en primer login.
>
> ### Petición permisos granulares — diferida
>
> Juan pidió plantear permisos editables por usuario. **Documentado como BACKLOG en `docs/BACKLOG_PERMISOS_GRANULARES_2026-05-03.md`** (4 capas: menú → entidad → campo → RPC).
> Razón del aplazamiento: directriz validada por ChatGPT — *"El modelo de datos ya soporta el flujo real. Lo siguiente no es más código, es uso real con el equipo."*
> Pre-requisito: ≥1 semana uso real con los 4 usuarios para identificar fugas concretas y diseñar permisos basados en evidencia, no en hipótesis.
>
> ### Próximo paso (sin desviación)
>
> Uso real con los 4 usuarios. Recoger feedback en `.cowork/inbox/` o `docs/SESIONES/`. Cuando haya ≥3 fricciones reales documentadas, desbloquear sprint de permisos granulares.
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — Schema CONGELADO. Próximo: saneamiento.**
>
> ## 🛑 SCHEMA CONGELADO (decisión final aceptada por ChatGPT)
>
> ChatGPT da dictamen final tras revisar fixes post-audit:
>
> > *"ACEPTAR. Schema ya está suficientemente bien para MVP. NO seguir refinando base de datos salvo bug real. La frase: el modelo de datos ya soporta el flujo real; el riesgo ya no está en el schema, está en empezar UI sin cerrar la deuda crítica."*
>
> ### Últimas correcciones documentales aplicadas (1 mayo noche)
>
> 1. ✅ Eliminada contradicción en `SCHEMA_MVP_CAPTACION_FINAL_2026-05-01.md` sobre "trigger motivo_perdida obligatorio" → marcado como decisión final SIN trigger, gestión UI/backend.
> 2. ✅ Eliminada misma contradicción en `RELEASE_1_CAPTACION_2026-05-01.md` (bloque SQL CREATE TRIGGER → reemplazado por nota explicativa).
> 3. ✅ Añadida nota de dependencia en `20260501_mvp_captacion_multi_rol_schema.sql` indicando que debe aplicarse junto con el fix post-audit (evita reintroducir bugs en entornos nuevos).
>
> ### Defaults validados por ChatGPT para las 3 preguntas críticas pendientes
>
> 1. **Criterio "alto consumo / cliente complejo"**: decisión MANUAL de Carolina Maciñeiras. CRM puede mostrar sugerencias visuales (consumo alto / multi-CUPS / tarifa 6.x / potencia elevada) pero NO autoasignar.
> 2. **Emails Carolina Maciñeiras + Antonio**: pendientes de Juan.
> 3. **Intentos antes de marcar `no_envia_factura`**: regla simple inicial = 3 intentos en 10 días (día 0 / día 3 / día 7 / día 10 cierre sugerido). CRM sugiere, Carolina confirma. NO automático.
>
> ### Funciones por user (validadas)
>
> ```
> Juan:                ['admin', 'asesor_senior']
> Antonio:             ['asesor_senior']
> Carolina Aroca:      ['telemarketing']
> Carolina Maciñeiras: ['analista']
> ```
>
> ### Frase guía actualizada
>
> > *El modelo de datos ya soporta el flujo real. El riesgo ya no está en el schema; está en empezar UI sin cerrar la deuda crítica.*
>
> ### Orden inflexible de saneamiento (sin desviación)
>
> ```
> 1. Cerrar TSC Potencias                    [Code/Juan, ~2.5h]
> 2. QA + commit Sprint A                    [Juan, ~45min]
> 3. Regenerar tipos Supabase                [Code, prohíbe nuevos `as never`]
> 4. Crear users Maciñeiras + Antonio        [Cowork, cuando Juan dé emails]
> 5. Asignar funciones a los 4 users         [Cowork]
> 6. Sembrar responsable_actual_id 4 oport.  [Cowork, manual case-by-case]
> 7. Empezar UI MVP por BANDEJAS por rol     [no dashboards, no Kanban genérico]
> ```
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — Fixes post-audit ChatGPT aplicados**
>
> ## ✅ FIXES POST-AUDIT CHATGPT APLICADOS EN BD
>
> ChatGPT auditó el schema MVP recién aplicado. Veredicto: **ACEPTAR CON CONDICIONES**. Detectó 3 problemas técnicos pequeños pero importantes. Corregidos vía MCP. Migration espejo: `supabase/migrations/20260501_mvp_captacion_fixes_post_audit_chatgpt.sql`.
>
> ### Fix 1 — `to_user_id` FK incoherencia
>
> Era `NOT NULL + ON DELETE SET NULL` (contradictorio: Postgres lo acepta pero falla en runtime al borrar usuario).
> ✅ Cambiado a `ON DELETE RESTRICT` (un handoff histórico nunca pierde a quién recibió el caso).
>
> ### Fix 2 — `v_mis_oportunidades` security_invoker
>
> Falta `WITH (security_invoker = true)` — buena práctica Supabase para que filtrado RLS use el rol del consumidor, no del creador. Crítico para futuro portal cliente.
> ✅ Recreada con `security_invoker = true` + `GRANT SELECT TO authenticated`.
>
> ### Fix 3 — Catálogo motivo_perdida (inconsistencia documental)
>
> Estaba documentado en RELEASE_1 pero la migration MVP no lo incluyó. ChatGPT detectó la inconsistencia.
> ✅ Aplicado `motivo_perdida_enum` (21 valores en 4 familias: A_contacto / B_estatus / C_funnel / D_fuera_perfil) + columnas `motivo_perdida_codigo` + `motivo_perdida_detalle` + vista `v_motivos_perdida_familia`.
> ⚠️ SIN trigger obligatorio (lo gestionará UI cuando llegue, según recomendación ChatGPT).
>
> ### QA test trigger handoff
>
> Test end-to-end con rollback: trigger `tg_oportunidad_handoff_apply` actualiza correctamente `responsable_actual_id` y `etapa_operativa` al insertar handoff. Sin residuos. ✓
>
> ### Veredicto ChatGPT
>
> > *"ACEPTAR CON CONDICIONES. No revertiría. Schema multi-rol es mejora clara, refleja flujo real, aditivo, no toca frontend. PERO no dejaría que Claude empiece UI todavía."*
>
> ChatGPT también valida la concepción rectora: **"Cada usuario ve solo lo que le toca AHORA"** vía `v_mis_oportunidades`. Y refuerza un principio UX clave: **"Diseña bandejas, no pantallas genéricas. Que diga 'esto es lo que tienes que resolver ahora'"**.
>
> ### Pasos antes de UI MVP (orden inflexible)
>
> 1. Cerrar TSC sprint Potencias (Code, ~2.5h).
> 2. QA + commit Sprint A (`docs/CHECKLIST_QA_SPRINT_A_2026-05-01.md`, ~45 min).
> 3. **Regenerar tipos Supabase** `npx supabase gen types typescript` antes de UI (evitar más `as never`).
> 4. Crear users Carolina Maciñeiras + Antonio en BD (cuando Juan dé emails).
> 5. Asignar `funciones` a los 4 users (Juan/Antonio/Aroca/Maciñeiras).
> 6. Sembrar `responsable_actual_id` en las 4 oportunidades existentes.
> 7. **Empezar UI por bandejas, no por dashboard** (principio ChatGPT).
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — Schema MVP multi-rol APLICADO en BD**
>
> ## ✅ SCHEMA MVP CAPTACIÓN APLICADO (saneamiento estructural sin código frontend)
>
> Tras feedback ChatGPT al modelo multi-rol (3/4 ajustes aceptados, 1 matizado), aplicado a BD prod vía MCP. Documento decisiones: `docs/SCHEMA_MVP_CAPTACION_FINAL_2026-05-01.md`.
>
> ### Aplicado en BD producción
>
> - **`oportunidades` ALTER**: 8 columnas nuevas (etapa_operativa, responsable_actual_id, decisor_identificado, factura_recibida_at, factura_documento_id, propuesta_documento_id, propuesta_enviada_at, visita_programada_at).
> - **CHECK etapa_operativa** con 10 valores: nuevo / contactado / esperando_factura / factura_recibida / en_analisis / propuesta_en_preparacion / propuesta_lista / propuesta_enviada / seguimiento / cerrado.
> - **Tabla `oportunidad_handoffs`** con trigger `handoff_apply` que actualiza `responsable_actual_id` automáticamente.
> - **Tabla `oportunidad_emails`** (concepto decisor vs ejecutor — aporte ChatGPT).
> - **Vista `v_mis_oportunidades`** filtra por `responsable_actual_id = auth.uid()`.
> - **`user_profiles.funciones text[]`** para telemarketing/analista/asesor_senior/admin.
>
> Migration espejo: `supabase/migrations/20260501_mvp_captacion_multi_rol_schema.sql`.
>
> ### Decisiones tras ChatGPT
>
> - ✅ Aceptado: simplificar de 17 a 10 estados operativos (no 9 — necesito distinguir factura_recibida de en_analisis).
> - ✅ Aceptado: tabla emails con decisor + ejecutor.
> - ✅ Aceptado: minimizar triggers (solo handoff_apply + motivo_perdida).
> - 🔧 Matizado: NO añadido `tipo_atencion` (se deriva de funciones del responsable).
>
> ### Lo que NO se ha hecho (sigue regla "no programar UI encima de base inestable")
>
> - Cero código frontend nuevo.
> - Cero modificación a `src/`.
> - Cero migration nuevas pendientes.
>
> ### Pendiente para arrancar UI MVP
>
> 1. **Cerrar TSC sprint Potencias** (Code en PowerShell, ~2.5h).
> 2. **Commit Sprint A actual** (~30+ archivos working tree).
> 3. **Crear users en BD** para Carolina Maciñeiras y Antonio (cuando Juan dé emails).
> 4. **Asignar `funciones`** a los 4 users.
> 5. Entonces UI MVP 7 días siguiendo `FLUJO_REAL_CAPTACION_VALERE_2026-05-01.md`.
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — FLUJO REAL multi-rol descubierto**
>
> ## 🚨 DESCUBRIMIENTO CRÍTICO — flujo de captación es MULTI-ROL, no 1 vendedor
>
> Juan describió el flujo real. Cambia profundamente el diseño del MVP. Doc: `docs/FLUJO_REAL_CAPTACION_VALERE_2026-05-01.md`.
>
> ### 4 roles operativos identificados
>
> | Persona | Rol | Función |
> |---|---|---|
> | Carolina Aroca | Telemarketing + envío + seguimiento | Llama lead, pide decisor, manda presentación, pide factura, recibe propuesta lista, la envía, llama seguimiento |
> | Carolina Maciñeiras | Análisis + decisión asignación + propuestas estándar | Recibe factura, analiza, decide complejidad, hace propuesta estándar, decide a qué asesor asignar |
> | Antonio | Asesor senior | Atiende casos complejos directamente, propuesta personalizada, cierre directo |
> | Juan | Asesor senior + master | Idem Antonio + visión global |
>
> ### Workflow con handoffs explícitos
>
> ```
> Carolina Aroca llama → manda presentación → pide factura
>   ├── No factura → cierre `no_envia_factura`
>   └── Factura recibida → handoff a Carolina Maciñeiras
>           ├── Estándar → Maciñeiras hace propuesta → handoff a Carolina Aroca
>           │              └── Aroca envía email + llama seguimiento → cierre
>           └── Complejo → Maciñeiras decide asesor → handoff a Antonio o Juan
>                          └── Asesor contacta DIRECTAMENTE al cliente → cierre directo
> ```
>
> ### Modelo de datos propuesto (cambia el MVP)
>
> - ALTER `oportunidades`: `etapa_operativa`, `responsable_actual_id`, `tipo_atencion` (estandar/senior), `factura_recibida_at`, `factura_documento_id`, `propuesta_documento_id`.
> - Nueva tabla `oportunidad_handoffs` con trigger que actualiza `responsable_actual_id` automáticamente.
> - Vista `v_mis_oportunidades` filtra por `responsable_actual_id = auth.uid()`.
> - ALTER `user_profiles`: `funciones text[]` con valores telemarketing/analista/asesor_senior/admin.
>
> ### MVP redimensionado (de 3-5 días → 7 días)
>
> - Día 1: schema multi-rol + crear users Carolina M. y Antonio en BD.
> - Día 2: UI Carolina Aroca (3 tabs: por llamar / propuestas para enviar / seguimientos).
> - Día 3: UI Carolina Maciñeiras (facturas pendientes + propuestas en preparación).
> - Día 4: UI asesores senior (cartera asignada a mí).
> - Día 5: subida factura + propuesta documento.
> - Día 6: compliance básico + motivos pérdida.
> - Día 7: QA con los 4 roles + ajustes.
>
> Esto **es un MVP que refleja la realidad**. El v1 anterior (1 vendedor) habría fallado en simulación.
>
> ### 10 preguntas pendientes a Juan antes de empezar
>
> Críticas (1, 4, 8): criterio "alto consumo", users en BD, intentos antes de marcar perdida.
> Importantes (2, 3, 5, 6): handoff post-asesor senior, formato propuestas, visita, multi-CUPS.
> Refinamiento (7, 9, 10): reasignaciones, generar propuesta sin factura, cliente recuperación.
>
> ### Confirmación de la hipótesis ChatGPT
>
> ChatGPT predijo: *"es bastante posible que descubramos que el modelo de datos es incorrecto"*. **Confirmado**: el modelo "1 vendedor → cliente" no encaja. Necesitamos modelo multi-rol con handoffs. Esto valida la regla "diseña → prueba → corrige → repite": antes de programar más, modelar bien la realidad.
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — Reenfoque pre-producto + MVP validación**
>
> ## 🔁 REENFOQUE ESTRATÉGICO (tercera ronda ChatGPT — auditor externo)
>
> Tras leer el handoff completo, ChatGPT corrige el diagnóstico:
>
> > *"No es problema de adopción. Es producto en construcción con datos heredados. Estado natural de pre-producto. Pero estás diseñando SIN datos reales de uso → riesgo de sobre-diseño antes de validación."*
>
> **Acepto el reenfoque con un matiz**: ChatGPT propone "Release 1 en 3 días" — discrepo en formulación, **acepto en espíritu**: 3-5 días MVP pelado + 1 semana simulación + 4-6 días R1 final.
>
> ### Regla nueva (sustituye a 70/30):
> > *Diseña → prueba → corrige → repite. Construir el siguiente paso pequeño, ponerlo en manos de Carolina, observar, decidir con esa información.*
>
> ### Plan próximas 4 semanas
>
> | Semana | Foco | Outcome |
> |---|---|---|
> | 1 | L-M cierre TSC + commit + 30.2/30.3 · X-V construcción **MVP pelado** | MVP usable mínimo (5 días) |
> | 2 | Simulación uso real Carolina · NO construir nada nuevo · solo observar | datos de uso real |
> | 3 | L sesión revisión + decisiones · M-V Release 1 final ajustado | R1 validado por uso |
> | 4 | Sprint B (FASE 31 modelo energético) o pivot según aprendizajes | siguiente sprint |
>
> ### MVP pelado (3-5 días) — qué entra
> - `/captacion` lista priorizada manual (sin scoring matemático).
> - Ficha llamada activa + outcomes con motivos pérdida (catálogo cerrado).
> - Botón `tel:` (sin CTI).
> - Alta empresa+contacto+oportunidad unificada.
> - Schema mínimo: `origen_canal`, `motivo_perdida` enum, `no_llamar`.
> - Aviso LOPDGDD verbal (sin auditoría sofisticada).
>
> ### MVP NO incluye
> - PDF diagnóstico, plantilla email Gmail, lead scoring, cadencias, dashboard supervisor, tracking apertura, compliance profundo. **Solo si Carolina lo pide post-simulación**.
>
> ### Criterios éxito simulación (≥3 de 5)
> - Carolina logra 4h+ continuas con CRM 1 día concreto.
> - Tiempo cerrar llamada < 60 seg.
> - ≥50% llamadas registradas vs hechas.
> - Cualitativamente: "es mejor que mi Excel".
> - ≥1 propuesta enviada desde CRM.
>
> Documento ejecutable: `docs/REENFOQUE_USO_REAL_2026-05-01.md`.
>
> ### Compromiso Cowork durante simulación
> NO construir nada nuevo, NO arreglar a mitad de jornada, observar + recopilar feedback en `docs/SIMULACION_CAROLINA_FEEDBACK.md` (futuro).
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — FASE 30.3 + paquete handoff auditor externo**
>
> ## ✅ FASE 30.3 cerrada (saneamiento autorizado dentro regla 70/30)
>
> Aplicada autónomamente vía MCP + edits TS:
> - BD prod: UPDATE 1 fila `contactado`→`auditoria_consumo` + ALTER CHECK a 8 etapas + comment.
> - TS: `EtapaOportunidad` en `entities.ts` reducido a 8 valores.
> - TS: `OportunidadForm.tsx` ETAPAS array limpio.
> - Mapeo defensivo legacy→canónica mantenido en KanbanColumn/OportunidadForm como capa seguridad.
> - Migration espejo: `supabase/migrations/20260501_fase30_3_cerrar_etapas_legacy.sql`.
>
> Estado BD post-aplicación: 3 `cerrada_ganada` + 1 `auditoria_consumo`. Pipeline 100% energético.
>
> ## 📦 PAQUETE HANDOFF PARA AUDITOR EXTERNO (ChatGPT u otro)
>
> A petición de Juan, generado paquete autocontenido para auditoría sin acceso al repo:
>
> **5 documentos nuevos:**
> - `docs/HANDOFF_CHATGPT_AUDITOR_VALERE_2026-05-01.md` — documento maestro (11 secciones).
> - `docs/INDEX_PROYECTO_VALERE.md` — punto de entrada general.
> - `docs/ESTADO_TECNICO_ACTUAL.md` — stack + arquitectura.
> - `docs/ROADMAP_VIGENTE.md` — roadmap condensado.
> - `docs/DEUDA_TECNICA_PRIORIZADA.md` — deuda con coste de cierre.
>
> **ZIP descargable:**
> - `valere-crm-audit-pack-2026-05-01.zip` — 1.5 MB, 438 archivos.
> - Incluye: docs/, supabase/migrations, supabase/functions, src/, scripts/, package.json, tsconfig*, vite.config, .env.example, CLAUDE.md, index.html.
> - Excluye: .env real, .git, node_modules, .venv, __pycache__.
> - El `.env` real de `scripts/fv-sync/` redactado a `[REDACTED]`.
>
> ## ➡️ PRÓXIMO PASO INMEDIATO (Juan en PowerShell)
>
> 1. Cerrar TSC sprint Potencias (`docs/SPRINT3_TSC_PENDIENTE.md`, ~2.5h).
> 2. Ejecutar `CHECKLIST_QA_SPRINT_A_2026-05-01.md` (30-45 min).
> 3. Si todo verde → commit + push según comando del checklist (incluye los 30+ archivos de hoy).
> 4. Para auditoría: subir ZIP + handoff a ChatGPT (o cualquier auditor externo).
>
> ---
>
> **Última actualización (anterior): 2026-05-01 Cowork — Módulo Datadis completo: tabs funcionales + caché persistente Supabase**
>
> ## ✅ MÓDULO DATADIS — SPRINT COMPLETADO
>
> | Item | Estado | Detalle |
> |---|---|---|
> | `DatadisPage` — filas navegables | ✅ | `<Link>` en CUPS + `onClick` en fila → `/datadis/:cups`. `distributorLabel()` resuelve nombre completo |
> | `SupplyDetailPage` — 4 tabs | ✅ | Información, Contrato, Curva, Cierres. Helper `sf()` mapea claves español↔inglés |
> | Ruta `/datadis/:cups` | ✅ | Registrada en `App.tsx`, lazy loaded |
> | Fixes auditoría P0/P1/P2 | ✅ | Claves API en español, tipoPunto guard en CurveTab, distribuidoras, tildes, badge "Sincronizado", botón volver |
> | Tabla `datadis_proxy_cache` | ✅ APLICADA en prod | Cache read-through con TTL por action. RLS authenticated=SELECT, service_role=write |
> | Edge Function `datadis-proxy` v8 | ✅ DESPLEGADA (version 8, ACTIVE) | Cache HIT fresco → devuelve sin llamar Datadis. Cache MISS → llama y guarda. Fallo Datadis → fallback stale |
> | Scripts commit | ✅ | `COMMIT_DATADIS_AUDIT_FIXES.ps1`, `COMMIT_DATADIS_PROXY_V8.ps1`, `COMMIT_DATADIS_MAIN.ps1` **ejecutados por Juan** |
>
> ## ➡️ SIGUIENTE SESIÓN
>
> - TSC `claude/sprint2-lib-potencias` sigue pendiente (~60 errores documentados en `docs/SPRINT3_TSC_PENDIENTE.md`)
> - Sprint A sub-fases pendientes: 30.2 (DROP renovaciones), 30.3 (etapas legacy), 30.7 (vinculación masiva NIF), 30.9 (RLS granular)
> - Cuando Datadis tenga acceso API funcional: añadir botón "Actualizar desde Datadis" en `SupplyDetailPage` con `force_refresh: true`
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — Opción A reducida aceptada + verificaciones BD**
>
> ## ✅ DECISIÓN ESTRATÉGICA — Opción A reducida (saneamiento primero)
>
> Tras segunda crítica ChatGPT, aceptado plan: **2-3 días de saneamiento técnico obligatorio antes de arrancar Release 1**. Frase guía:
>
> > *"Podemos seguir pensando ideas nuevas, pero no seguir programando encima de una base inestable."*
>
> Regla operativa nueva: **no más de 1 sprint abierto + 1 rama experimental simultáneos**.
>
> ## 🔬 VERIFICACIONES BD ejecutadas hoy (informan decisiones Sprint A)
>
> | Verificación | Resultado | Implicación |
> |---|---|---|
> | `renovaciones` filas vivas | **0** | FASE 30.2: DROP totalmente seguro |
> | `oportunidades` etapas legacy | **1 sola** (`contactado`) | FASE 30.3: trivial, 1 UPDATE |
> | RAG asistente uso 30d | 15 consultas, 100% encontradas, 4.6s avg | NO eliminar. NO priorizar mejoras |
> | Lista Robinson integrada | NO | R2 según RELEASE_1_CAPTACION |
> | Cron `daily_contract_check` | Activo (jobid 3, próxima 04:00 UTC mañana) | FASE 30.1 cerrada ✅ |
>
> ## 📋 ENTREGABLES SESIÓN (sin código nuevo, solo investigación + planificación)
>
> - `docs/CHECKLIST_QA_SPRINT_A_2026-05-01.md` — checklist 6 tests para validar antes de commit (30-45 min de QA manual).
> - `docs/INDICE_2026-05-01.md` — mapa único de los 11 documentos creados hoy + contradicciones detectadas + plan de retirada de docs obsoletos.
> - Verificaciones BD ejecutadas vía MCP (no destructivas).
>
> ## ➡️ PASOS INMEDIATOS (TÚ EN POWERSHELL)
>
> 1. Cerrar TSC sprint Potencias siguiendo `docs/SPRINT3_TSC_PENDIENTE.md`.
> 2. Ejecutar `CHECKLIST_QA_SPRINT_A` (30-45 min QA manual).
> 3. Si todo verde → commit + push según comando del checklist.
> 4. Decisiones 30.2/30.3: con la BD verificada, son ejecuciones triviales que puedo hacer en próxima sesión Cowork si lo apruebas.
>
> ## ➡️ COWORK PRÓXIMA SESIÓN (con repo verde)
>
> 1. FASE 30.2: DROP `renovaciones` (vacía, sin riesgo).
> 2. FASE 30.3: 1 UPDATE oportunidades + restringir CHECK + actualizar EtapaOportunidad enum TS.
> 3. Sprint Release 1 día 1-3 (schema motivos pérdida + origen canal + UI lista + UI ficha).
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — Plan depuración + Release 1 integrado**
>
> ## ⚖️ REGLA OPERATIVA NUEVA — depuración + nuevas ideas en paralelo
>
> Tras preocupación válida de Juan ("no quiero acumular deuda mientras avanzo en propuestas"), establecida la regla:
> **70% nueva funcionalidad / 30% depuración. NO abrir sprint nuevo sin cerrar el anterior.**
>
> Documento ejecutable: `docs/PLAN_DEPURACION_2026-05-01.md` con inventario completo de loose ends, calendario 4 semanas integrando depuración + Release 1, y 29 archivos pendientes de commit identificados explícitamente.
>
> **Loose ends críticos:**
> - 🔴 TSC roto en `claude/sprint2-lib-potencias` (~60 errores) — bloquea merge a main.
> - 🔴 Sprint A aplicado hoy NO commiteado (29 archivos working tree).
> - 🔴 Wizard contacto decisor sin validar uso real con Juan/Carolina.
>
> **Loose ends importantes:**
> - 🟠 Sprint A pendientes (30.2, 30.3, 30.7, 30.9).
> - 🟠 111 `as never` legados.
> - 🟠 15 documentos creados hoy sin índice consolidado.
>
> **Documento ejecutable Release 1 captación**: `docs/RELEASE_1_CAPTACION_2026-05-01.md` redimensionado a 11 días (de 18-20) tras crítica ChatGPT. SIN Gmail API auto, SIN CTI, SIN SIPS pilar único, CON motivos de pérdida estructurados (20 valores) y compliance LOPDGDD día 1.
>
> **Pregunta concreta a Juan para próxima sesión**: ¿100% depuración, mezclado, o 100% Release 1 asumiendo cierre TSC paralelo?
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — Plan captación profesional + Workspace**
>
> ## ⚙️ DISEÑO PROFESIONAL MÓDULO CAPTACIÓN — `docs/PLAN_CAPTACION_PROFESIONAL_2026-05-01.md`
>
> Aplicado conocimiento industria call center / sales development B2B + integraciones Google Workspace (sustituyen a Office).
>
> **Aporta:**
> - Wireframe ASCII pantallas `/captacion` lista + llamada activa.
> - Cadencia 8-12 touches en 14-21 días (llamada + email + LinkedIn).
> - Lead scoring algorítmico (sector × tamaño × tarifa × recencia × comportamiento).
> - Compliance LOPDGDD + Lista Robinson ADIGITAL + LSSI-CE.
> - Email outbound con Gmail API + service account + DKIM/SPF/DMARC.
> - Telefonía Aircall/Ringover (€60-120/mes operación 1-3 personas).
> - Integraciones Google Workspace: Gmail API send/sync threading, Calendar, Drive (espejo PDFs), Identity (SSO).
> - Anti-patrones evitar: 50 campos obligatorios, vigilancia agresiva, automatización prematura, Apollo/ZoomInfo.
> - 13 KPIs reales (no vanity): connect rate, conversation rate, qualification rate, win rate, tiempo medio llamada→propuesta.
>
> **Sprint Carolina v2 redimensionado**: 18-20 días en 4 semanas con paralelismo (era 5-6 días, era ingenuo).
>
> **7 preguntas concretas pendientes a Juan** para arrancar (telefonía, volumen, origen leads, cadencia actual, plantilla email, Lista Robinson, Workspace admin).
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — Plan Carolina-as-engine**
>
> ## 🔴 INSIGHT GO-TO-MARKET — Carolina es el motor real de captación
>
> Tras describir Juan los 3 canales (Carolina telemarketing, comerciales, cartera), todo el plan estratégico se reordena. Documento: `docs/PLAN_CAROLINA_ENGINE_2026-05-01.md`.
>
> **Insight:** el cuello de botella real del Canal 1 (Carolina) NO es "no hay leads" — es el ciclo "llamada → pedir factura → esperar 5-7 días → análisis manual → propuesta". Reducible a "llamada → CUPS → click → propuesta enviada en minutos" usando SIPS + heurísticas + OMIE.
>
> **Plan revisado mes 1-3:**
> - **Mes 1 (~14 días)**: cerrar Sprint A + adopción interna + SIPS/OMIE + **Sprint Carolina FASE 41** (pantalla `/captacion` + diagnóstico + flow rápido). Outcome: Carolina genera 10 propuestas/día desde CRM.
> - **Mes 2 (~10 días)**: FASE 42 generador propuesta avanzada (Canal 2) + FASE 36-bis validador facturas (Canal 3) + cifra "€ recuperados" home.
> - **Mes 3 (~5 días)**: FASE 43 optimización trimestral + reporting mensual cliente (Canal 3 retención).
>
> **Diferidos a mes 4+**: FV calculator, CAEs, portal cliente, Sentry DSN.
>
> **Pendiente input Juan**: 6 preguntas concretas sobre Carolina (volumen llamadas, herramientas actuales, acceso SIPS, plantilla email) para diseñar wireframe `/captacion` óptimo. Ver doc.
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — Comparativa con ChatGPT + plan revisado**
>
> ## 🟠 SEGUNDA OPINIÓN CHATGPT — `docs/COMPARATIVA_COWORK_VS_CHATGPT_2026-05-01.md`
>
> ChatGPT validó el plan estratégico con 2 correcciones importantes y 1 idea nueva:
>
> 1. **Modelo híbrido empresa/CUPS** (no sustituir uno por otro): CRM=empresa, Operaciones=CUPS. Mejor formulación que la propuesta original.
> 2. **Adopción interna como prioridad #1** (Sprint 30.bis): el equipo no usa el CRM. Sin esto, el resto es teoría. Matiz Cowork: la adopción se gana con flujos donde "CRM > Excel", no se fuerza por disciplina.
> 3. **IDEA NUEVA — Modo diagnóstico primera reunión** (FASE 41): SIPS + heurísticas sectoriales + OMIE → PDF de 30 segundos con "pagas €X, ahorrarías €Y". Sin Datadis, sin facturas. Arma comercial concreta.
>
> Plan revisado de prioridades 2 meses (~25 días-persona):
> - Cerrar Sprint A pendiente.
> - Sprint adopción interna (KPI uso CRM por usuario).
> - Sprint sector mínimo (SIPS + OMIE, sin BOE scraper ni eSIOS).
> - **Sprint modo diagnóstico (FASE 41) — nueva prioridad #1**.
> - Sprint generador propuesta (FASE 42).
> - Sprint validador v0 con 3 reglas críticas.
> - Sprint € trofeo + vista `/suministros`.
>
> Diferidos: FV + CAEs (mes 3+), descartado de momento CSRD/PPA/CER/auditoría obligatoria.
>
> ---
>
> **Última actualización (anterior): 2026-05-01 noche por Cowork — Auditoría profesional sector**
>
> ## 🟣 AUDITORÍA PROFESIONAL DEL SECTOR — `docs/AUDIT_2026-05-01_PROFESIONAL_SECTOR.md`
>
> Tras el audit técnico (mañana) y el sprint autónomo (tarde), Juan pidió una auditoría con lente de profesional del sector consultoría energética. Resultado: documento de 13 secciones que identifica 3 grandes ejes:
>
> 1. **El CRM hoy es un CRM general aplicado a energía, no un CRM vertical**: el objeto central debe ser el suministro/CUPS, no la empresa.
> 2. **5 fuentes públicas gratuitas no consumidas**: SIPS, OMIE, REE/eSIOS, BOE, CNMC. Cada una desbloquea features comerciales.
> 3. **Los servicios adyacentes son donde está el ticket grande**: autoconsumo FV, CAEs, CER, auditoría obligatoria RD 56/2016, CSRD/CBAM, PPA.
>
> Roadmap ampliado FASES 34-40 propuesto. Las 3 prioridades 60d:
> - Cerrar bucle Datadis (auditoría inicial automatizada).
> - Validador de facturas v0 (reglas críticas + plantilla reclamación).
> - Cifra trofeo "€ recuperados a clientes 12m" en home + material comercial.
>
> ---
>
> **Última actualización (anterior): 2026-05-01 tarde por Cowork — Sprint A autónomo aplicado**
>
> ## 🟢 SPRINT A AUTÓNOMO — 6/10 sub-fases aplicadas
>
> Tras la auditoría, Juan dio luz verde para avanzar autónomamente. Aplicado vía Supabase MCP + edits frontend:
>
> | Sub-fase | Estado | Aplicado |
> |---|---|---|
> | 30.1 — pg_cron daily-contract-check | ✅ | BD prod: cron jobid 3, 04:00 UTC. Función SQL `run_daily_contract_check()`. Migration espejo `20260501_fase30_1_*` |
> | 30.4 — Importes en Kanban | ✅ | KanbanCard + KanbanColumn editados |
> | 30.5 — Wizard contacto decisor | ✅ | EmpresasPage convertido a wizard 2 pasos en CREATE |
> | 30.6 — Asociar Datadis↔Empresa | ✅ | AsociarEmpresaDialog (nuevo) + hook `useAsociarSuministroAEmpresa` + botón en DatadisPage |
> | 30.8 (aditiva) — incidencias.cups_id | ✅ | BD prod: ALTER + index + populate. Migration espejo `20260501_fase30_8_*` |
> | 30.10 — Sentry SDK base | ✅ | sentry.ts wrapper lazy + integrado en main.tsx, useAuth, logger.ts. `.env.example` actualizado. `@sentry/react@^10` añadido a package.json |
>
> Pendientes Sprint A (con razón documentada):
> - **30.2 / 30.3** — necesitan decisión de Juan (consolidar renovaciones, etapas legacy).
> - **30.7** — vinculación masiva Datadis por NIF, requiere nueva Edge Function.
> - **30.9** — RLS granular, mejor en sesión coordinada con observación tabla a tabla.
>
> **PRE-REQUISITO MERGE A MAIN:** cerrar TSC pendiente de `claude/sprint2-lib-potencias` (`docs/SPRINT3_TSC_PENDIENTE.md`).
>
> **Pasos siguientes (Code, PowerShell):**
> 1. `npm install` (instala `@sentry/react`)
> 2. `npx tsc --noEmit` (verifica integración)
> 3. `npm test -- --run` (33 tests deben pasar)
> 4. Sanity check manual en localhost:3000
> 5. Commit con el comando del handoff: `.cowork/outbox/2026-05-01-sprint-a-autonomo-aplicado.md`
>
> ---
>
> ## 🟦 AUDITORÍA 2026-05-01 — `docs/AUDIT_2026-05-01_MEJORAS_CRM.md`
>
> Disparada por análisis estratégico de Juan en navegador (5 áreas + matriz de priorización). Verificación rigurosa contra código + ampliación con capa técnica y UX.
>
> **Hallazgos clave:**
> - Pipeline energético existe (FASE 21.a) pero **migración a medias**: etapas legacy aún vivas en BD y Dashboard.
> - Edge Function `daily-contract-check` lista pero **sin programar pg_cron** — la automatización del rollover no se ejecuta.
> - Datadis aislado del CRM: ningún flujo asocia los CUPS bajados con empresas. **Es el cable más rentable.**
> - RLS granular FASE 20.9 escrita pero **no aplicada** — bloquea portal cliente.
> - Tabla `incidencias` con `cups: text` (no FK uuid) — vinculación débil.
> - Validador de facturas y portal cliente: ❌ inexistentes (producto nuevo, sprint completo cada uno).
> - 111 `as never` legados, sólo 6 ficheros test (33 tests reales, no 39).
> - Dos escuelas visuales (CRM `rounded-md` vs Calc `rounded-xl`) — design review 2026-04-20 sigue vigente.
>
> **Plan propuesto:** 3 sprints (FASES 30, 31, 32) + diferidos (FASE 33+) integrados en `docs/ROADMAP_FUSION.md`:
> - **Sprint A (FASE 30) · 5 d** — "Cablear lo que ya existe": cron, RLS, vinculación Datadis↔Empresa.
> - **Sprint B (FASE 31) · 5 d** — "Ampliar el modelo energético": precios P1–P6, oportunidad_cups, historial, informes.
> - **Sprint C (FASE 32) · 5 d** — "Diferenciar el servicio": validador facturas, portal cliente, autorización Datadis.
>
> **Pre-requisito sprint A:** cerrar TSC pendiente de `claude/sprint2-lib-potencias` (`docs/SPRINT3_TSC_PENDIENTE.md`).
>
> Resumen completo: `docs/AUDIT_2026-05-01_MEJORAS_CRM.md`. Mensaje detallado para Code: `.cowork/outbox/2026-05-01-audit-mejoras-crm-handoff.md`.
>
> ---
>
> **Última actualización (anterior): 2026-04-30 por Cowork noche — Integración Datadis proxy v4 funcional**
>
> ## ✅ DATADIS PROXY — INTEGRACIÓN COMPLETADA (commit 6aa361c en claude/sprint2-lib-potencias)
>
> | Item | Estado | Detalle |
> |---|---|---|
> | Edge Function `datadis-proxy` v4 | ✅ ACTIVA en prod | 5 endpoints: get_supplies, get_consumption, get_max_power, get_contractual, get_reactive |
> | Fix auth Bearer | ✅ | `/api-private/*` exige `Authorization: Bearer jwt`. Sin Bearer → 401. Verificado A/B en navegador. |
> | Cookie JSESSIONID | ✅ | Capturada en login, reenviada en peticiones (Spring Security stateful) |
> | Migración SQL | ✅ aplicada en prod | datadis_consumos_cache, consentimientos_datadis, columnas datadis_* en cups, datadis_provincias (52 INE) |
> | Test get_supplies | ✅ | 14 suministros CHEMTROL, 3 distribuidoras activas, CodError 902 (EOSA+EREDES sin respuesta — normal) |
>
> **Próximos pasos Datadis:**
> - Test get_consumption con CUPS concreto de CHEMTROL
> - Exponer CodError 902 como warning en frontend (no bloquear flujo)
> - Cache en BD: buscar en datadis_consumos_cache antes de llamar a Datadis
> - UI en CRM: pantalla suministros por cliente + importación de consumos
> - Solicitar acceso API oficial Datadis (datadis@enagas.es) para modo `terceros`
>
> ---
>
> **Última actualización (anterior): 2026-04-30 por Cowork tarde — Integración librerías Potencias (Sprint 1+2+3 parcial)**
>
> ## Cowork tarde 2026-04-30 — Sprint integración Potencias al CRM
>
> Rama: `claude/sprint2-lib-potencias` (sin push aún).
>
> | Sprint | Estado | Detalle |
> |---|---|---|
> | 1 P0 | ✅ | trigger `fn_calcular_alertas_solicitudes` aplicado al CRM. 41 fechas alerta calculadas. Julia Ruiz creada en auth.users. 31 expedientes huérfanos asignados. _migration_user_map actualizado. |
> | Auditoría | ✅ | `docs/AUDITORIA_POTENCIAS_VS_CRM.md` con 4 gaps identificados (triggers, lib, componentes, endpoint). |
> | 2 (copiar archivos) | ✅ | 16 archivos `musing-kalam` → CRM en estructura `src/core/pdf/`, `src/core/email/`, `src/core/excel/`, `src/features/potencias/lib/`, `src/features/potencias/components/shared/`, `api/`. |
> | 3 primera pasada | ✅ | Imports `@/lib/*` → `@/core/*`. 12 nombres tablas reemplazados. Tipos `TariffType`, `PowerValues`, `RegulatedRate` añadidos a entities.ts. Reemplazos `client_id → empresa_id`, FKs renamed. |
> | 3 segunda pasada | ⏳ pendiente | ~60 errores TSC documentados en `docs/SPRINT3_TSC_PENDIENTE.md`. Plan Sprint 4 detallado por fases (A-E, ~2.5h). |
>
> **Estado BD CRM:** trigger alertas activo, datos completos (41 expedientes con created_by), sin advisors RLS pendientes.
>
> ⚠️ **NO mergear `claude/sprint2-lib-potencias` hasta que TSC = 0** (si no, CI bloquea futuros PRs).
>
> Pendientes próxima sesión: ver `.cowork/outbox/2026-04-30-sprint3-tsc-pendiente.md`.
>
> ---
>
> **Última actualización (Code mañana): 2026-04-30 por Cowork (sesión — FV schema redesign + mantenimiento + informes)**
>
> ## ✅ COMPLETADO EN ESTA SESIÓN (commits 00243bd + a388e04 en main)
>
> | Componente | Estado | Detalle |
> |---|---|---|
> | fix(fv-sync): fill(force=True) eliminado | ✅ | Playwright Python: fill() no acepta force=True; causaba TypeError en 10s. Corregido. |
> | database.ts regenerado con tablas fv_* | ✅ | 5011 líneas, incluye todas las tablas fv_*. Elimina (supabase as any) en api.ts |
> | Schema FV rediseñado (multi-credencial) | ✅ aplicado en prod | UNIQUE (plataforma,region_url,station_code): 1 planta física = 1 fila. fv_planta_credencial N:M. fv_upsert_planta() protege empresa_id |
> | fv_planta: nombre_interno + nombre_fusionsolar | ✅ | Valere puede poner nombre personalizado; sync no lo sobreescribe |
> | fv_credenciales: tipo + descripcion | ✅ | instalador_multicliente / cliente_monoplanta / cliente_multiplanta. JOLIVARES etiquetado. |
> | Password JOLIVARES actualizado | ✅ | Nuevo hash xa1Y/hIblHe3JqD8:... aplicado en Supabase |
> | fv_empresa_mantenimiento | ✅ aplicado en prod | Registro empresas externas de mantenimiento (datos, contacto, contrato) |
> | fv_mantenimiento | ✅ aplicado en prod | Intervenciones por planta: preventiva, correctiva, limpieza, inspección |
> | fv_config_informe | ✅ aplicado en prod | Config entrega informes por cliente: modo_envio, gestor_id, asesor_id, destinatarios |
> | fv_informe_mensual extendido | ✅ aplicado en prod | Estados: borrador→revision_pendiente→aprobado→enviado. Edición contenido, notas gestor |
> | Trigger notificación informe pendiente | ✅ | Crea notif CRM al gestor cuando informe pasa a revision_pendiente |
>
> ## ⏳ PENDIENTE INMEDIATO
>
> | Item | Responsable | Notas |
> |---|---|---|
> | Lanzar Run #15 en GitHub Actions | Juan | Fix fill(force=True) ya commiteado en 00243bd |
> | .\COMMIT_FV_MANT_INFORMES.ps1 | ✅ HECHO | a388e04 en main |
> | Verificar plantas en fv_planta tras Run #15 | Juan + Cowork | Si verde: ejecutar SQL asignación empresas |
> | RESEND_API_KEY en GitHub Actions secrets | Juan | Settings → Secrets → Actions (ya está en Supabase EF) |
>
> ## 🔮 SIGUIENTE SPRINT (Fase B módulo FV)
>
> | Item | Estado | Notas |
> |---|---|---|
> | Refactor SeguimientoFVPage con tabs | Pendiente | Dashboard global, vista por cliente, detalle planta |
> | Gráfico producción 30 días (recharts) | Pendiente | Usa fv_kpi_diario |
> | Edición nombre_interno desde CRM | Pendiente | Inline edit en tarjeta planta |
> | UI mantenimiento por planta | Pendiente | Tabla intervenciones + próximas fechas |
> | UI fv_config_informe por empresa | Pendiente | Panel configuración en EmpresaDetailPage |
>
> ## 📋 PENDIENTE REAL (no implementado)
>
> | Item | Bloqueador | Notas |
> |---|---|---|
> | Integración Datadis | Trámite Juan (registro terciario) | Plan en docs/PLAN_INTEGRACION_DATADIS.md |
> | Auth Google Identity | Decisión producto | Plan en docs/PLAN_MIGRACION_AUTH_GOOGLE_IDENTITY.md |
> | RESEND_API_KEY secret GitHub Actions | Acción Juan | Para emails alarmas FV |
> | Más credenciales FV (otros instaladores) | Acción Juan | Dar cuando pipeline esté estable |
> | fv_actuacion (actuaciones Valere + ROI) | Sprint 3 | Ver plan módulo FV |
> | Informes PDF integrados FV+facturas | Sprint 4 | Ver plan módulo FV |
> | fv_alarma_procedimiento (catálogo resolución) | Sprint 2 | Ver plan módulo FV |

## Historial de sesiones relevantes

| Fecha | Commits | Resumen |
|---|---|---|
| 2026-04-29 mañana | e8ed8c2…6464a89 | Reescritura Playwright, fixes CI ubuntu-22.04, fix login |
| 2026-04-29 noche | a3d4a21 | Fix dashboard, asistente RAG, ExpedienteDetail |
| 2026-04-30 | 00243bd, a388e04 | Schema FV multi-credencial, mantenimiento, workflow informes |
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               