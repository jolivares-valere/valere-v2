# Roadmap de Fusión CRM + Calculadora

Plan ejecutable para unificar los dos bloques funcionales del repo Valere en una sola arquitectura feature-based. Cada FASE es una unidad independiente: 1 objetivo, 1 commit, verificación con `npx tsc --noEmit` a 0 errores, PR actualizado, listo para ser retomada desde conversación nueva mirando solo el último commit + este fichero.

## Estado de partida (abril 2026)

- Branch `claude/valere-crm-architecture-2vvEV` (HEAD `4d134a6`): CRM completo en arquitectura feature-based (FASE 13B → 19). PR #1 draft abierto a `main`.
- Branch `origin/main` (HEAD `807781a`): Calculadora en arquitectura flat (`src/modules/*`, `src/lib/*`, `src/hooks/*`, `src/components/*`). Cowork aplicando fixes ahí.
- Schema BD: dos schemas SQL coexisten — `supabase-migration.sql` (Calculadora) y `supabase/migrations/001_crm_core.sql` (CRM).

## Decisión

Fusionar ambos bajo la arquitectura CRM feature-based. La Calculadora se reorganiza en `src/features/calculadora/`, `src/features/analisis/`, `src/features/propuestas/`, `src/features/tracking/`, `src/features/admin/`. `src/lib/*` se mueve a `src/core/energia/`. El `useAuth` legacy se unifica con el del CRM. `user_profiles` se migra a `users_profile` y se elimina.

## Mapa Calculadora → Destino

| Origen legacy | Destino feature-based |
|---|---|
| `src/modules/AdminPanel.tsx` | `src/features/admin/AdminPage.tsx` + `components/` |
| `src/modules/Clients.tsx` | **eliminar**: `clients` se migra a `empresas` (ya existente) |
| `src/modules/DataCapture.tsx` | `src/features/datos/DatosPage.tsx` (+ subcomponentes: Cliente, PuntoSuministro, HistoricoFacturas) |
| `src/modules/Analysis.tsx` | `src/features/analisis/AnalisisPage.tsx` |
| `src/modules/Proposals.tsx` | `src/features/propuestas-energia/PropuestasEnergiaPage.tsx` (no confundir con CRM `propuestas` comercial) |
| `src/modules/Tracking.tsx` | `src/features/tracking/TrackingPage.tsx` |
| `src/modules/Dashboard.tsx` | **fusionar** con `src/features/dashboard/DashboardPage.tsx`: KPIs CRM + Calculadora juntos |
| `src/lib/calculator.ts` | `src/core/energia/calculator.ts` |
| `src/lib/tariffs.ts` | `src/core/energia/tariffs.ts` |
| `src/lib/supabase.ts` | **eliminar** — usar `src/core/supabase/client.ts` |
| `src/lib/utils.ts` | fusionar con `src/core/utils/` |
| `src/hooks/useAuth.tsx` | **eliminar** — usar `src/core/hooks/useAuth.ts` |
| `src/hooks/useSupabaseQuery.ts` | `src/core/hooks/useSupabaseQuery.ts` (revisar si aún aporta frente a react-query) |
| `src/components/Layout.tsx` | `src/core/layout/Layout.tsx` + introducir `react-router-dom` (no está en CRM actual: comprobar) |
| `src/components/LoginPage.tsx` | **eliminar** — usar `src/features/auth/LoginPage.tsx` |
| `src/components/ConsultantChat.tsx` | `src/features/chat-ia/ChatIAPanel.tsx` (con Edge Function, FASE 20.8) |
| `src/components/StatCard.tsx`, `EmptyState.tsx`, `ErrorBoundary.tsx` | `src/core/components/` |
| `src/components/ui/*` | se quedan donde están (lib shadcn) |
| `supabase-migration.sql` | migrar tablas nuevas a `supabase/migrations/003_calculadora.sql` |

## Mapa de tablas BD

**Canónica de perfiles: `user_profiles`** (Calc). Invertido respecto a la decisión inicial — código CRM se adapta, no al revés.

| Legacy | Destino | Acción |
|---|---|---|
| `users_profile` (CRM) | `user_profiles` (canónica) | Migrar 1 fila, luego DROP `users_profile`. El código CRM se adapta. |
| `clients` | `empresas` | Migrar filas con mapeo `nombre_comercial→nombre, nif→nif, consultor_asignado (email) → comercial_id (FK user_profiles)`, DROP |
| `supply_points` | `cups` | Migrar con mapeo de campos, DROP |
| `proposals` | nueva tabla `analisis_comparativo` | Dejar `propuestas` como CRM comercial y crear tabla propia calc |
| `invoice_history` | `facturas` (renombrar, FK a `cups`) | Ya tiene `consumption_p1..p6` y `surplus_p1..p6` desde FASE 20.0.1 ✅ |
| `retailers`, `retailer_offers` | iguales | Conservar |
| `boe_regulated_prices`, `global_config` | iguales | Conservar |
| `documentos`, `eventos` | iguales | Ya existen en CRM, polimórficas. Pendiente feature frontend (fuera de fusión). |

---

## FASES

Cada FASE: 1 objetivo, 1 commit. TSC a 0 antes del commit. Si una FASE se queda a medias, el siguiente agente la retoma mirando el último commit.

### FASE 20.0 — Documentación y roadmap ✅
**Objetivo**: crear `CLAUDE.md` y `docs/ROADMAP_FUSION.md`.
**Entregables**: este fichero + CLAUDE.md.
**DONE**: `git log --oneline -1` → `docs(fase20.0): CLAUDE.md y roadmap de fusión CRM+Calculadora`.

### FASE 20.0.1 — Preparar `invoice_history` con consumo por período ✅
**Objetivo**: añadir columnas `consumption_p1..p6` y `surplus_p1..p6` a `invoice_history` para resolver Bug 2 del audit de Cowork.
**Ejecutado por**: Claude Cowork directamente en Supabase (abril 2026).
**SQL aplicado**:
```sql
ALTER TABLE invoice_history
  ADD COLUMN IF NOT EXISTS consumption_p1..p6 numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS surplus_p1..p6 numeric DEFAULT 0;
```
**Pendiente frontend**: consumir estas columnas en FASE 20.5c (migración de DataCapture) en lugar de tocar la versión legacy.
**DONE**: tabla pasa de 11 a 23 columnas, defaults a 0, registros existentes no rotos.

### FASE 20.1 — Regenerar tipos Supabase reales
**Objetivo**: eliminar `Database = any` de `src/core/supabase/client.ts`.
**Prerrequisito**: acceso a Supabase project-ref. El usuario debe ejecutar `supabase gen types typescript --project-id <REF> > src/core/types/database.ts` o copiar desde el dashboard Supabase (Settings → API → TypeScript types).
**Ficheros**:
- `src/core/types/database.ts` (nuevo, tipos generados).
- `src/core/supabase/client.ts`: `import type { Database } from '../types/database'`, eliminar `= any`.
- Eliminar los `as never` de: `src/features/oportunidades/api.ts`, `src/features/importador/components/ImportEmpresas.tsx`.
- Eliminar `src/core/types/entities.ts` (sustituido por `Database['public']['Tables'][...]`) o mantenerlo como capa de alias.
**DONE**: `npx tsc --noEmit` = 0, `npm run build` OK. Commit `fix(fase20.1): tipos Supabase reales, eliminar Database=any y casts as never`.

### FASE 20.2 — Merge de `main` en la branch CRM
**Objetivo**: traer commits de Cowork (`807781a`) a nuestra branch, resolver conflictos.
**Ficheros potencialmente conflictivos**: ninguno directamente (Cowork toca `src/modules/*` que no existen en CRM; CRM toca `src/features/*` que no existen en main). Posibles conflictos: `package.json`, `vite.config.ts`, `supabase-migration.sql`, `index.html`.
**Acciones**:
1. `git fetch origin main`.
2. `git merge origin/main --no-ff -m "merge: origin/main (Cowork fixes 1, 3, 4 + BOE 6.2/6.3/6.4TD) en branch CRM"`.
3. Resolver conflictos priorizando nuestros ficheros en `src/core/` y `src/features/`, los suyos en `src/modules/`, `src/lib/`, `src/hooks/`, `src/components/`.
4. En `tsconfig.json` mantener `"exclude": ["src/modules"]` temporal.
5. `npx tsc --noEmit` = 0.
**DONE**: `git log --oneline -5` muestra merge commit. Commit automático del merge.

### FASE 20.3 — Unificar auth (`useAuth`) apuntando a `user_profiles` canónica
**Objetivo**: eliminar `src/hooks/useAuth.tsx` legacy y adaptar `src/core/hooks/useAuth.ts` (CRM) para leer de la tabla canónica `user_profiles` (Calc). Portar al auth CRM la funcionalidad extra: roles `master/manager/consultant/client`, `approved`, jerarquía.
**Ficheros**:
- `src/core/hooks/useAuth.ts`: cambiar `.from('users_profile')` → `.from('user_profiles')`. Añadir campos `role`, `approved` al tipo. Implementar jerarquía (master=4 > manager=3 > consultant=2 > client=1).
- Eliminar `src/hooks/useAuth.tsx`.
- Buscar imports de `@/hooks/useAuth` y reemplazarlos por `@/core/hooks/useAuth`.
- SQL: migrar la única fila de `users_profile` a `user_profiles` si no existe ya, luego `DROP TABLE users_profile;` (migración `supabase/migrations/003_drop_users_profile.sql`). **Ejecutar solo después del commit de código**.
**DONE**: `grep -r "hooks/useAuth" src/` = 0 matches. `grep -r "users_profile" src/` = 0. TSC = 0. Commit `refactor(fase20.3): useAuth unificado leyendo de user_profiles canónica`.

### FASE 20.4 — Mover `src/lib/*` a `src/core/energia/` y `src/core/utils/`
**Objetivo**: vaciar `src/lib/` entero.
**Acciones**:
- `src/lib/calculator.ts` → `src/core/energia/calculator.ts`.
- `src/lib/tariffs.ts` → `src/core/energia/tariffs.ts`.
- `src/lib/supabase.ts` → eliminar, redirigir imports a `src/core/supabase/client.ts`.
- `src/lib/utils.ts` → fusionar con `src/core/utils/` (revisar duplicados con `src/core/utils/dates.ts`, `energy.ts`, `logger.ts`).
- Actualizar imports en todo `src/modules/*` y cualquier otro consumidor.
**DONE**: `src/lib/` vacío o eliminado. TSC = 0 (con `src/modules` aún excluido). Commit `refactor(fase20.4): src/lib → src/core/energia + src/core/utils`.

### FASE 20.5 — Migrar módulos Calc uno a uno a `src/features/`
Sub-fases independientes. Cada una: un módulo, un commit, TSC = 0, ruta funcional.

#### FASE 20.5.a — `Clients` → fusionar con `empresas`
Eliminar `src/modules/Clients.tsx`. Todos los accesos a tabla `clients` se refactorizan para usar `empresas`. Si aún hay datos en `clients` vivos, se añade una migración SQL `supabase/migrations/004_merge_clients_empresas.sql`.
**DONE**: `clients` ya no se referencia en código. Commit `refactor(fase20.5a): fusionar Clients con empresas`.

#### FASE 20.5.b — `AdminPanel` → `src/features/admin/`
Split en subcomponentes: `AdminPage.tsx` con tabs (Usuarios, Comercializadoras, Ofertas, Config). Cada tab como componente separado en `components/`.
**DONE**: ruta `/admin` funcional. Commit `feat(fase20.5b): migrar AdminPanel a features/admin`.

#### FASE 20.5.c — `DataCapture` → `src/features/datos/`
Subcomponentes: `ClienteSection`, `PuntoSuministroSection`, `HistoricoFacturasSection`. Añadir edición (problema 7 de Cowork).
**DONE**: ruta `/datos` funcional. Commit `feat(fase20.5c): migrar DataCapture a features/datos con edición`.

#### FASE 20.5.d — `Analysis` → `src/features/analisis/`
Mantener lógica `calculator.ts` (ya movido en 20.4).
**DONE**: ruta `/analisis` funcional. Commit `feat(fase20.5d): migrar Analysis a features/analisis`.

#### FASE 20.5.e — `Proposals` → `src/features/propuestas-energia/`
Diferenciar claramente de CRM `propuestas` (comercial). Renombrar tabla `proposals` a `analisis_comparativo` en migración `supabase/migrations/005_rename_proposals.sql`.
**DONE**: ruta `/propuestas-energia` funcional. Commit `feat(fase20.5e): migrar Proposals a features/propuestas-energia`.

#### FASE 20.5.f — `Tracking` → `src/features/tracking/`
Implementar botón "Generar PDF" de "Próximos Pasos" (observación menor de Cowork).
**DONE**: ruta `/tracking` funcional. Commit `feat(fase20.5f): migrar Tracking a features/tracking con PDF`.

#### FASE 20.5.g — `Dashboard` fusionar CRM + Calc
Añadir KPIs de Calculadora al `DashboardPage.tsx` de CRM: total ahorro identificado, % medio, últimos análisis, ConsultantChat embedido.
**DONE**: Dashboard muestra ambos dominios. Commit `feat(fase20.5g): dashboard unificado CRM+Calculadora`.

### FASE 20.6 — Eliminar `src/modules/` y `src/components/*` legacy
**Objetivo**: borrar carpetas vacías/legacy, quitar exclusión del `tsconfig.json`.
**Acciones**:
- Eliminar `src/modules/`.
- Eliminar `src/hooks/`.
- Eliminar `src/lib/`.
- Mover `src/components/Layout.tsx`, `LoginPage.tsx`, `ConsultantChat.tsx`, `StatCard.tsx`, `EmptyState.tsx`, `ErrorBoundary.tsx` a sus destinos (`src/core/layout/`, `src/features/chat-ia/`, `src/core/components/`). Si algo aún no tiene destino claro, parar y decidir.
- Mantener `src/components/ui/` (shadcn).
- `tsconfig.json`: eliminar `"exclude": ["src/modules"]`.
**DONE**: `find src -type d` no contiene `modules/`, `hooks/`, `lib/`. TSC = 0. Commit `refactor(fase20.6): eliminar estructura legacy flat`.

### FASE 20.7 — Unificar schema Supabase
**Objetivo**: una sola migración consolidada. Eliminar duplicaciones. (Nota: `users_profile` ya fue dropeada en FASE 20.3.)
**Acciones**:
1. `supabase/migrations/006_unify_schema.sql`:
   - Migrar `clients` → `empresas` con mapeo de campos y transformar `consultor_asignado (email TEXT)` → `comercial_id (UUID FK user_profiles)` via `SELECT id FROM user_profiles WHERE email = clients.consultor_asignado`.
   - Migrar `supply_points` → `cups`.
   - Renombrar `invoice_history` → `facturas`.
   - Añadir FKs necesarias.
   - DROP tablas vacías: `clients`, `supply_points`.
2. Actualizar queries en `src/features/admin/api.ts`, `src/features/analisis/api.ts`, `src/features/datos/api.ts`, etc.
**DONE**: TSC = 0, schema consistente, app arranca sin errores runtime. Commit `feat(fase20.7): unificar schema Supabase, eliminar tablas duplicadas`.

### FASE 20.8 — Mover chat Gemini a Edge Function
**Objetivo**: quitar la API key del cliente (problema 6 del audit).
**Acciones**:
- Crear `supabase/functions/chat-consultor/index.ts` (Deno) con la lógica de llamada a Gemini, leyendo `GEMINI_API_KEY` de secrets de Supabase.
- Refactorizar `src/features/chat-ia/ChatIAPanel.tsx` para llamar a `supabase.functions.invoke('chat-consultor', { body: { messages } })`.
- Quitar `import.meta.env.VITE_GEMINI_API_KEY` del cliente.
- Documentar en README cómo setear el secret.
**DONE**: chat funciona, API key no visible en bundle. Commit `feat(fase20.8): chat Gemini vía Edge Function, quitar API key del cliente`.

### FASE 20.9 — RLS granular
**Objetivo**: endurecer policies (problema 5).
**Acciones**:
- `supabase/migrations/007_rls_multitenant.sql`:
  - Policy `empresas`: `comercial_id = auth.uid() OR role IN ('master','manager')`.
  - Idem `contactos`, `contratos`, `oportunidades`, `actividades`, `propuestas`, `facturas` (vía JOIN con `cups.empresa_id`).
  - `analisis_comparativo`: FK a `cups`, policy via empresa.
- Probar con dos usuarios reales (uno `consultant`, uno `master`).
**DONE**: usuario `consultant` solo ve sus empresas. Commit `feat(fase20.9): RLS multitenant por comercial_id`.

### FASE 20.10 — Pendientes menores del audit
- Botón **Editar** en Ofertas (Cowork problema 8) — cubierto en FASE 20.5b si se incluye edición.
- Botón **Editar** en Facturas y Puntos de suministro (Cowork problema 7) — cubierto en FASE 20.5c.
- ~~Bug 2 (columnas por período en `invoice_history`)~~ — **ya aplicado en BD en FASE 20.0.1**. Queda solo consumirlas desde el frontend en FASE 20.5c.
- Quitar `autoprefixer` de `devDependencies` (Tailwind 4 no lo necesita).
- Features nuevas a valorar (fuera de fusión estricta): aprovechar `documentos` y `eventos` (tablas polimórficas ya creadas) para un módulo de documentos adjuntos y un calendario/agenda.
**DONE**: audit 100% cerrado. Commit `fix(fase20.10): cerrar pendientes del audit Cowork`.

---

## FASES 21-26 — Mejoras funcionales post-fusión

Propuestas integradas tras análisis de CRMs del sector energético español. Cada FASE es independiente y se ejecuta tras completar la fusión (20.x). Mantienen la misma metodología: 1 objetivo, 1 commit, TSC = 0.

### FASE 21 — Mejoras UI del CRM existente

Tres sub-fases independientes:

#### FASE 21.a — Pipeline de oportunidades con etapas energéticas
**Objetivo**: sustituir las etapas genéricas por el flujo real del sector.
**Cambios**:
- Actualizar `EtapaOportunidad` en `entities.ts`: `prospecto → auditoria_consumo → oferta_presentada → negociacion → contrato_firmado → activo → cerrada_ganada → cerrada_perdida`.
- Añadir campo `ahorro_anual_estimado` (numeric, nullable) a tabla `oportunidades` — es el KPI de venta real en energía.
- Actualizar componente Kanban con probabilidades por etapa (0% → 20% → 40% → 60% → 80% → 100%).
- Mostrar valor total de ahorro acumulado por etapa en el pipeline.
- Migración SQL: `supabase/migrations/0XX_pipeline_energetico.sql`.
**DONE**: pipeline muestra etapas energéticas y ahorro. Commit `feat(fase21a): pipeline oportunidades con etapas energeticas y ahorro estimado`.

#### FASE 21.b — Alertas de vencimiento de contratos mejoradas
**Objetivo**: semáforo visual de vencimientos + widget en dashboard.
**Cambios**:
- En listado de contratos: calcular días restantes, badge con semáforo (rojo <30d, naranja 30-60, amarillo 60-90, verde >90).
- Añadir campo `penalizacion_salida` (text/numeric, nullable) a tabla `contratos`.
- Widget en Dashboard: "Contratos que vencen pronto" — top 5 más urgentes, botón "Iniciar renovación" que crea oportunidad de tipo `renovacion`.
- Migración SQL si hace falta nueva columna.
**DONE**: alertas visibles en contratos y dashboard. Commit `feat(fase21b): alertas vencimiento con semaforo y widget dashboard`.

#### FASE 21.c — Timeline de actividades en fichas de empresa y contrato
**Objetivo**: reutilizar `ActividadesTimeline` ya existente en fichas de empresa y contrato.
**Cambios**:
- Añadir tab "Actividades" en `EmpresaDetailPage.tsx` con `entidad_tipo='empresa'`.
- Añadir sección actividades en `ContratoDetailPage.tsx` con `entidad_tipo='contrato'`.
- Reutilizar componentes existentes de `src/features/actividades/`.
**DONE**: timeline visible en fichas. Commit `feat(fase21c): timeline actividades en fichas empresa y contrato`.

### FASE 22 — Módulo de Incidencias
**Objetivo**: gestión de reclamaciones y problemas de clientes con contratos activos.
**Ubicación**: `src/features/incidencias/`
**Tabla nueva** — `incidencias`:
```
id uuid PK, empresa_id FK, contrato_id FK (nullable), cups text (nullable),
titulo text NOT NULL, descripcion text, 
tipo: 'facturacion'|'cambio_comercializadora'|'corte_suministro'|'potencia'|'acceso_red'|'otro',
estado: 'abierta'|'en_gestion'|'pendiente_cliente'|'pendiente_comercializadora'|'resuelta'|'cerrada',
prioridad: 'baja'|'media'|'alta'|'critica',
asignado_a FK user_profiles, fecha_apertura timestamptz DEFAULT now(),
fecha_limite timestamptz, fecha_resolucion timestamptz,
importe_reclamado numeric, importe_recuperado numeric,
created_by FK user_profiles, created_at, updated_at, deleted_at
```
**Funcionalidades**:
- Listado global con filtros (estado/prioridad/tipo/empresa).
- Kanban por estado o listado con badges de prioridad.
- Formulario completo. Contador de días abierta (SLA visual).
- Timeline de actividades con `entidad_tipo='incidencia'`.
- KPI en Dashboard: "Incidencias abiertas" + "Críticas".
- Tab "Incidencias" en ficha de empresa.
- Migración SQL: `supabase/migrations/0XX_incidencias.sql`.
**DONE**: ruta `/incidencias` funcional. Commit `feat(fase22): modulo incidencias con kanban y SLA`.

### FASE 23 — Módulo de Renovaciones
**Objetivo**: vista especializada para retención de clientes con contratos próximos a vencer.
**Ubicación**: `src/features/renovaciones/`
**Tabla nueva** — `renovaciones`:
```
id uuid PK, contrato_id FK, empresa_id FK,
estado: 'detectada'|'contactado'|'oferta_enviada'|'negociacion'|'renovado'|'perdido',
fecha_deteccion timestamptz DEFAULT now(), fecha_vencimiento_contrato date,
motivo_perdida text, nuevo_contrato_id FK (nullable),
asignado_a FK user_profiles, created_at, updated_at, deleted_at
```
**Funcionalidades**:
- Creación automática cuando contrato entra en zona naranja (≤60 días) si no existe renovación activa.
- Listado ordenado por urgencia (días restantes ASC).
- Kanban simple con etapas.
- Métricas: tasa de renovación, tiempo medio de cierre, contratos en riesgo por comercial.
- KPI en Dashboard: "Renovaciones pendientes".
- Al marcar como "Renovado" → vincular al nuevo contrato.
- Migración SQL: `supabase/migrations/0XX_renovaciones.sql`.
**DONE**: ruta `/renovaciones` funcional. Commit `feat(fase23): modulo renovaciones con deteccion automatica`.

### FASE 24 — Documentos/Adjuntos con Supabase Storage
**Objetivo**: subida y gestión de ficheros vinculados a entidades.
**Prerrequisito**: crear bucket `valere-docs` en Supabase Storage.
**Tabla existente** — `documentos` (ya existe, 0 filas):
- Añadir campos si faltan: `tamanio bigint`, `mime_type text`.
- Tipos habituales: `factura`, `oferta`, `contrato_firmado`, `certificado`, `autorizacion`, `otro`.
**Funcionalidades**:
- Subida de ficheros con `react-dropzone` (ya en deps) en fichas de empresa, contrato, incidencia.
- Visor inline para PDF, descarga directa para otros tipos.
- Listado de documentos por entidad.
- Supabase Storage policies: solo users autenticados, max 10MB por fichero.
**DONE**: subida y listado funcional en fichas. Commit `feat(fase24): documentos adjuntos con Supabase Storage`.

### FASE 25 — Notificaciones in-app
**Objetivo**: alertas automáticas y badge con contador en sidebar.
**Tabla existente** — `notificaciones` (ya existe en schema):
- Verificar campos y añadir los que falten.
**Triggers de notificación**:
- Tarea vencida (actividad tipo=tarea, estado=pendiente, fecha_vencimiento < now()).
- Contrato en zona roja (<30 días).
- Incidencia crítica asignada (si FASE 22 completada).
- Oportunidad sin actividad en 15 días.
**Funcionalidades**:
- Badge con contador en sidebar (icono campana).
- Panel desplegable al hacer click.
- Marcar como leída individual o todas.
- Generación de notificaciones: función SQL o cron job vía pg_cron o desde frontend al cargar dashboard.
**DONE**: notificaciones visibles y funcionales. Commit `feat(fase25): notificaciones in-app con badge en sidebar`.

### FASE 26 — Exportaciones e Informes
**Objetivo**: exportación CSV/Excel + informes predefinidos.
**Ubicación**: `src/features/informes/`
**Dependencia**: librería `xlsx` (SheetJS) — añadir a `package.json`.

#### FASE 26.a — Exportación CSV/Excel en todos los listados
Botón "Exportar" en listados de empresas, contactos, contratos, actividades, oportunidades, incidencias. Exporta los datos con el filtro aplicado.
**DONE**: botón exportar funcional en todos los listados. Commit `feat(fase26a): exportacion CSV/Excel en listados`.

#### FASE 26.b — Informes predefinidos
Dos informes iniciales:
1. **Informe comercial mensual**: actividades por comercial, oportunidades creadas/cerradas, contratos firmados, tasa de conversión. Filtro por mes y comercial.
2. **Cartera activa**: empresas con contrato activo, CUPS gestionados, consumo total (kWh), ahorro generado. Exportable a Excel.
**DONE**: ruta `/informes` funcional. Commit `feat(fase26b): informes comercial mensual y cartera activa`.

---

# Sprints derivados de `docs/AUDIT_2026-05-01_MEJORAS_CRM.md`

Tres sprints (FASES 30, 31, 32) que cierran las brechas detectadas en la auditoría del 1 mayo 2026. Cada sub-fase: 1 commit, TSC=0, marcar ✅ aquí al cerrar.

## FASE 30 — Cablear lo que ya existe (Sprint A · 5 días)

Convertir esqueletos en flujos funcionales. Sin SQL nuevo significativo, sólo migraciones de cierre + glue UI.

### FASE 30.1 — Programar pg_cron de `daily-contract-check`
**Objetivo**: el rollover diario funciona sólo. Hoy la Edge Function existe pero nadie la invoca.
**Migration**: `supabase/migrations/20260502_pgcron_daily_contract_check.sql` con `cron.schedule('daily_contract_check', '0 4 * * *', $$ SELECT net.http_post(...) $$)`.
**Verificación**: tras 24 h, contratos con `fecha_fin < today` están en estado `vencido`; oportunidades de renovación creadas para los que vencen en ≤60 d.
**DONE**: commit `feat(fase30.1): programar cron daily-contract-check`.

### FASE 30.2 — Consolidar `renovaciones` vs `oportunidades.tipo='renovacion'`
**Objetivo**: una sola tabla autoritativa. Hoy duplicamos el dato.
**Decisión propuesta**: la fuente de verdad es `oportunidades.tipo='renovacion'`. Convertir `/renovaciones` en una vista filtrada de oportunidades. `DROP TABLE renovaciones` (con migración de datos si hay rows). Refactorizar `src/features/renovaciones/api.ts` para apuntar a `oportunidades`.
**Riesgo**: si Cowork ha persistido datos en `renovaciones`, migrarlos. Hacer `SELECT count(*) FROM renovaciones WHERE deleted_at IS NULL` antes.
**DONE**: commit `refactor(fase30.2): consolidar renovaciones en oportunidades`.

### FASE 30.3 — Cerrar migración FASE 21.a (etapas legacy)
**Objetivo**: pipeline 100% energético, sin etapas genéricas residuales.
**Acciones**:
- Migración SQL: `UPDATE oportunidades SET etapa = CASE etapa WHEN 'contactado' THEN 'auditoria_consumo' WHEN 'analisis' THEN 'auditoria_consumo' WHEN 'propuesta_enviada' THEN 'oferta_presentada' WHEN 'ganada' THEN 'cerrada_ganada' WHEN 'perdida' THEN 'cerrada_perdida' WHEN 'cancelada' THEN 'cerrada_perdida' ELSE etapa END;`
- Restringir `oportunidades_etapa_check` a las 8 etapas energéticas.
- Limpiar `EtapaOportunidad` en `src/core/types/entities.ts` a 8 valores.
- Refactorizar `DashboardPage.tsx:20-34` para iterar las 8 etapas.
**DONE**: commit `refactor(fase30.3): pipeline 100% energético, etapas legacy retiradas`.

### FASE 30.4 — Mostrar importes en Kanban + tabla oportunidades
**Objetivo**: los campos `valor_estimado_eur` y `ahorro_anual_estimado` se ven en la UI.
**Ficheros**: `src/features/oportunidades/components/KanbanCard.tsx`, `KanbanColumn.tsx` (suma por etapa), `OportunidadesPage.tsx` (tabla list mode).
**DONE**: commit `feat(fase30.4): mostrar ahorro y valor estimado en pipeline`.

### FASE 30.5 — Validación: empresa nueva exige contacto decisor
**Objetivo**: `EmpresaForm` permite crear empresa sin contacto. Cambiar a wizard 2 pasos: empresa → contacto inicial.
**Validación zod**: form requiere ≥1 contacto con `es_decisor=true` antes de submit.
**DONE**: commit `feat(fase30.5): wizard alta empresa con contacto decisor obligatorio`.

### FASE 30.6 — Botón "Asociar a empresa" en `DatadisPage`
**Objetivo**: por cada fila del listado Datadis, abrir un modal que busca/crea empresa y vincula `cups.empresa_id` + `cups.codigo_cups` + datos Datadis.
**Reutiliza**: la búsqueda de empresas que ya tiene `GlobalSearch`.
**DONE**: commit `feat(fase30.6): asociar suministros Datadis a empresas`.

### FASE 30.7 — Vinculación masiva Datadis ↔ Empresa por NIF
**Objetivo**: acción admin que mira los suministros Datadis del usuario logueado, los cruza por NIF contra `empresas`, y crea/asocia automáticamente.
**Edge Function nueva**: `datadis-bulk-associate` (recibe credenciales Datadis, devuelve resumen de mapeos propuestos para revisión).
**UI**: tab nueva en `/admin` o botón en `DatadisPage`.
**DONE**: commit `feat(fase30.7): vinculación masiva Datadis-empresas por NIF`.

### FASE 30.8 — `incidencias.cups: text → cups_id uuid FK`
**Objetivo**: incidencias con FK fuerte a CUPS.
**Migration**:
```sql
ALTER TABLE public.incidencias ADD COLUMN cups_id uuid REFERENCES public.cups(id) ON DELETE SET NULL;
UPDATE public.incidencias i SET cups_id = c.id FROM public.cups c WHERE c.codigo_cups = i.cups;
CREATE INDEX idx_incidencias_cups_id ON public.incidencias(cups_id);
ALTER TABLE public.incidencias DROP COLUMN cups; -- después de validar
```
**DONE**: commit `refactor(fase30.8): incidencias.cups text -> cups_id uuid FK`.

### FASE 30.9 — Aplicar RLS granular FASE 20.9 con feature flag
**Objetivo**: pasar de RLS permisiva (`all_authenticated`) a granular por `comercial_id`. **Tabla a tabla, con EXPLAIN ANALYZE antes/después y rollback inmediato si p95 > 500 ms.**
**Orden propuesto**: empresas → contactos → contratos → oportunidades → actividades → incidencias → renovaciones → cups.
**Día 1**: empresas. Día 2: si OK, contactos+contratos. Día 3: oportunidades+actividades. Día 4: el resto.
**Helper**: `is_manager_or_above()` ya existe (`fase20.9_rls_granular.sql:10-22`).
**DONE**: commit `security(fase30.9): aplicar RLS granular en producción`.

### FASE 30.10 — Observabilidad básica (Sentry o Logtail)
**Objetivo**: tener errores de producción visibles. Hoy `logger.ts` no envía a ningún sink remoto.
**Decisión**: Sentry plan free (5 K eventos/mes) o Logtail (gratis 1 GB/mes). Recomendación Sentry por rastreo de stacks.
**Cobertura**: frontend + Edge Functions críticas (`daily-contract-check`, `chat-consultor`, `datadis-proxy`).
**DONE**: commit `feat(fase30.10): observabilidad con Sentry`.

---

## FASE 31 — Ampliar el modelo energético (Sprint B · 5 días)

Schema y datos para que la palanca económica esté en BD.

### FASE 31.1 — Precios P1–P6 en `contratos`
ALTER `contratos` ADD `precio_energia_p1..p6 numeric(8,5)`, `precio_potencia_p1..p6 numeric(10,2)`, `documento_firmado_id uuid REFERENCES documentos(id)`.
Refactor `ContratoForm.tsx` para 12 campos opcionales (collapsable por defecto).
**DONE**: commit `feat(fase31.1): contratos con precios P1-P6 desglosados`.

### FASE 31.2 — Detalle económico en `oportunidades`
ALTER `oportunidades` ADD `consumo_anual_kwh numeric(12,2)`, `precio_actual_kwh numeric(8,5)`, `precio_ofertado_kwh numeric(8,5)`, `fee_valere_pct numeric(5,2)`, `plazo_meses int`.
**DONE**: commit `feat(fase31.2): oportunidades con detalle económico energético`.

### FASE 31.3 — Tabla `oportunidad_cups` (N:M)
Crear tabla con `oportunidad_id`, `cups_id`, `created_at`. UI multi-select en `OportunidadForm` que filtra por `empresa_id`.
**DONE**: commit `feat(fase31.3): vincular oportunidades a múltiples CUPS`.

### FASE 31.4 — `historial_precios_contrato` con trigger
Tabla `historial_precios_contrato (id, contrato_id, snapshot_at, precio_energia_p1..p6, precio_potencia_p1..p6, motivo)` + trigger `BEFORE UPDATE ON contratos` que captura snapshot cuando cambian precios. Renovación = motivo `renovacion`.
**DONE**: commit `feat(fase31.4): historial de precios de contrato`.

### FASE 31.5 — Subsegmento + tamaño + consumo estimado en `empresas`
ALTER `empresas` ADD `subsegmento text`, `tamano_empleados text`, `consumo_anual_estimado_kwh numeric(12,2)`. Trigger que actualiza `consumo_anual_estimado_kwh` al asociar CUPS.
**DONE**: commit `feat(fase31.5): segmentación enriquecida de empresas`.

### FASE 31.6 — `rol_energetico` y `canal_preferido` en `contactos`
ALTER `contactos` ADD `rol_energetico text CHECK IN ('decisor','tecnico','administrativo','propietario')`, `canal_preferido text CHECK IN ('email','telefono','whatsapp','presencial')`.
**DONE**: commit `feat(fase31.6): rol energético y canal preferido en contactos`.

### FASE 31.7 — Hook `useAhorroEstimado(oportunidad_id)`
Calcula ahorro contra Datadis: lee `cups.energia_p*_kwh` × `oportunidad.precio_actual_kwh` − × `oportunidad.precio_ofertado_kwh`. Muestra en `OportunidadDetailDrawer`.
**DONE**: commit `feat(fase31.7): cálculo de ahorro contra Datadis en oportunidades`.

### FASE 31.8 — 5 informes energéticos
1. Ahorro generado 12 m.
2. Vencen en 90 d con precio actual vs OMIE (snapshot manual semanal).
3. Distribución tarifaria de la cartera.
4. Top consumidores con ahorro relativo bajo.
5. Reactiva acumulada último mes (si hay datos).
**Ficheros**: `src/features/informes/components/Informe*.tsx` (5 nuevos) + SQL agregado en `informes/api.ts`.
**DONE**: commit `feat(fase31.8): 5 informes energéticos sobre la cartera`.

---

## FASE 32 — Diferenciar el servicio (Sprint C · 5 días)

Las dos palancas de fidelización: validador de facturas y portal cliente.

### FASE 32.1 — Edge Function `datadis-incidencias-detector`
Cron diario. Tres detectores:
1. Lecturas estimadas en últimos 7 días → incidencia tipo `facturacion`.
2. Excesos de potencia (max_power > contracted_power) → tipo `potencia`.
3. Reactiva fuera de umbral (>33% energía activa) → tipo `facturacion`.
Usa `cups_id` (de FASE 30.8). `created_by = NULL` con marca `auto=true` (añadir columna).
**DONE**: commit `feat(fase32.1): incidencias automáticas desde Datadis`.

### FASE 32.2 — Validador de facturas v0
Subida PDF en `/empresas/:id` tab "Facturas comercializadora" → Edge Function `factura-validator`:
1. Extracción texto (pdf-parse / pdfplumber via Deno o Python lambda).
2. LLM call (Claude Haiku o Gemini Flash) con prompt estructurado → JSON con `consumo_p*`, `precio_p*`, `importes`.
3. Comparar contra `cups.energia_p*_kwh` + `contratos.precio_energia_p*` del mismo período.
4. Tabla `facturas_validacion (factura_id, estado: 'ok'|'discrepancia', diffs jsonb, importe_reclamable)`.
5. Si discrepancia: crea incidencia auto con plantilla de reclamación.
**DPA pendiente** con proveedor LLM antes de mover datos reales.
**DONE**: commit `feat(fase32.2): validador de facturas v0`.

### FASE 32.3 — Portal cliente v0
**Pre-requisito**: FASE 30.9 aplicada (RLS granular). Sin RLS, un cliente vería todos los datos.
**Mapping**: tabla `cliente_empresa (user_id, empresa_id)` (un cliente puede ser de varias empresas).
**Rutas nuevas**: `/cliente/dashboard`, `/cliente/suministros`, `/cliente/incidencias`, `/cliente/ahorros`.
**AuthGuard**: `roles=['client']` redirige a `/cliente/dashboard`.
**Layout cliente**: sidebar minimalista (4 items) en lugar del completo.
**DONE**: commit `feat(fase32.3): portal cliente v0`.

### FASE 32.4 — Generador de Autorización Datadis desde CRM
Reutilizar `src/features/potencias/lib/client-docs.ts` como base para autorizaciones Datadis. Botón "Generar autorización Datadis" en `EmpresaDetailPage` → PDF prerellenado → upload firmado → `documentos.tipo='autorizacion_datadis'` + `firmado_el`.
**DONE**: commit `feat(fase32.4): generador de autorización Datadis`.

---

## FASE 33+ — Sprints diferidos

- **33.1** Firma digital con Signaturit/DocuSign (3 d).
- **33.2** Convergencia visual completa (CRIT-1, CRIT-2 design review): `rounded-xl` único, padding `p-6 md:p-8`, H1 `font-display`, eliminar `confirm()`, añadir `aria-label` (3 d).
- **33.3** Tests a 30% cobertura dominio (5 d).
- **33.4** Limpieza de los 111 `as never` legados (1 d).
- **33.5** Tabla móvil responsive (cards en lugar de tablas a `<lg`) (2 d).
- **33.6** Modo oscuro (1 d).

---

## Checklist — Fusión (20.x)

- [x] FASE 20.0 — Documentación ✅
- [x] FASE 20.0.1 — invoice_history columnas ✅
- [x] FASE 20.1 — Tipos Supabase reales ✅
- [x] FASE 20.2 — Merge main ✅
- [x] FASE 20.3 — Unificar useAuth ✅
- [x] FASE 20.4 — Mover src/lib → core/energia + core/utils ✅
- [x] FASE 20.5 — Migrar módulos Calc a features/ ✅
- [x] FASE 20.6 — Eliminar estructura legacy flat ✅
- [x] FASE 20.7 — Unificar schema Supabase ✅ (20.7.a-d completados por Cowork 2026-04-19)
- [x] FASE 20.8 — Chat Gemini → Edge Function ✅ (archivo creado; deploy pendiente CLI: `supabase functions deploy`)
- [x] FASE 20.9 — RLS granular ✅ (SQL creado; aplicación pendiente EXPLAIN ANALYZE en producción)
- [x] FASE 20.10 — Pendientes menores del audit ✅ (ediciones + autoprefixer + shadcn)

## Checklist — Mejoras post-fusión (21-26)

- [x] FASE 21.a — Pipeline energético ✅ (frontend; SQL prompt en outbox 2026-04-18T19-00)
- [x] FASE 21.b — Alertas vencimiento ✅
- [x] FASE 21.c — Timeline en fichas ✅ (ya integrado en Empresa y Contrato)
- [x] FASE 22 — Incidencias ✅ (SQL aplicado por Cowork 2026-04-18)
- [x] FASE 23 — Renovaciones ✅ (SQL aplicado por Cowork 2026-04-18)
- [x] FASE 24 — Documentos/Storage ✅ (SQL aplicado; bucket Storage manual pendiente)
- [x] FASE 25 — Notificaciones ✅
- [x] FASE 26.a — Exportación CSV/Excel ✅
- [x] FASE 26.b — Informes ✅
- [x] FASE 27 — Calendario/Agenda con tabla `eventos` ✅ (vista mes + form CRUD)

## Mejoras de plataforma (post-roadmap)

- [x] Code-splitting con `React.lazy()` por rutas + `manualChunks` para vendors (main bundle 1515 kB → 253 kB)
- [x] Vitest + React Testing Library + tests de humo en `core/utils` (16 tests)

## Checklist — Auditoría 2026-05-01 (FASES 30 → 33)

Sprint A — Cablear lo que ya existe:
- [x] FASE 30.1 — Programar pg_cron de `daily-contract-check` ✅ aplicado en prod 2026-05-01 (jobid 3, cron 04:00 UTC, lógica en SQL `run_daily_contract_check()`)
- [ ] FASE 30.2 — Consolidar `renovaciones` vs `oportunidades` (pendiente decisión Juan)
- [ ] FASE 30.3 — Cerrar migración FASE 21.a (etapas legacy) (pendiente verificar etapas vivas)
- [x] FASE 30.4 — Mostrar importes en Kanban + tabla ✅ frontend modificado 2026-05-01 (TSC pendiente)
- [x] FASE 30.5 — Validación: empresa nueva exige contacto decisor ✅ wizard 2 pasos en EmpresasPage 2026-05-01 (TSC pendiente)
- [x] FASE 30.6 — Botón "Asociar a empresa" en `DatadisPage` ✅ AsociarEmpresaDialog + hook + botón 2026-05-01 (TSC pendiente)
- [ ] FASE 30.7 — Vinculación masiva Datadis ↔ Empresa por NIF (requiere Edge Function nueva)
- [x] FASE 30.8 (aditiva) — `incidencias.cups: text → cups_id uuid FK` ✅ ALTER + index + populate aplicado en prod 2026-05-01. 30.8b (DROP cups text) cuando frontend migre.
- [ ] FASE 30.9 — Aplicar RLS granular FASE 20.9 con feature flag (sesión coordinada con Juan)
- [x] FASE 30.10 — Observabilidad básica (Sentry o Logtail) ✅ Sentry SDK lazy 2026-05-01 (TSC pendiente)

Sprint B — Ampliar el modelo energético:
- [ ] FASE 31.1 — Precios P1–P6 en contratos
- [ ] FASE 31.2 — Detalle económico en oportunidades
- [ ] FASE 31.3 — Tabla `oportunidad_cups` (N:M)
- [ ] FASE 31.4 — `historial_precios_contrato` con trigger
- [ ] FASE 31.5 — Subsegmento + tamaño + consumo estimado en empresas
- [ ] FASE 31.6 — `rol_energetico` y `canal_preferido` en contactos
- [ ] FASE 31.7 — Hook `useAhorroEstimado`
- [ ] FASE 31.8 — 5 informes energéticos

Sprint C — Diferenciar el servicio:
- [ ] FASE 32.1 — Edge Function `datadis-incidencias-detector`
- [ ] FASE 32.2 — Validador de facturas v0
- [ ] FASE 32.3 — Portal cliente v0 (depende de 30.9)
- [ ] FASE 32.4 — Generador de Autorización Datadis

Diferidos:
- [ ] FASE 33.1 — Firma digital
- [ ] FASE 33.2 — Convergencia visual completa
- [ ] FASE 33.3 — Tests a 30% cobertura
- [ ] FASE 33.4 — Limpieza `as never`
- [ ] FASE 33.5 — Tabla móvil responsive
- [ ] FASE 33.6 — Modo oscuro

## Criterios de cierre global

- [ ] `npx tsc --noEmit` = 0.
- [ ] `npm run build` OK.
- [ ] `npm run dev`: login → dashboard → navegar por todas las rutas → funciona todo.
- [ ] Schema Supabase sin tablas duplicadas.
- [ ] API keys Gemini fuera del cliente.
- [ ] RLS granular probado con 2 roles.

## Recomendación operativa

Trabajar **una FASE por conversación de Claude Code**. Al empezar una conversación nueva:
1. `git log --oneline -10` para ver dónde se quedó.
2. Leer `CLAUDE.md` (automático en Claude Code).
3. Abrir `docs/ROADMAP_FUSION.md` y buscar la siguiente FASE no marcada como DONE.
4. Ejecutar.
5. Commit + push + actualizar este fichero (marcar la FASE con ✅).
6. `/compact` o cerrar.

Esto garantiza que ninguna FASE dependa de memoria del chat anterior.
