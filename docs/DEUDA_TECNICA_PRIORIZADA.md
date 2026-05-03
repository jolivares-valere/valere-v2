# Deuda técnica priorizada — Valere CRM (1 mayo 2026)

> Inventario realista de deuda con criticidad y coste estimado de cierre. Para cualquiera (auditor, dev, product) que necesite saber qué duele y por dónde empezar.

## 🔴 Crítica — bloquea avance

### TSC roto en `claude/sprint2-lib-potencias` (~60 errores)

- **Origen**: Sprint integración librería Potencias del 30 abril 2026 (commit `31f8ac4 WIP sprint3`).
- **Bloqueador**: cualquier merge a main, CI rompe, futuros PRs bloqueados.
- **Coste cierre**: 2.5h con plan paso a paso documentado.
- **Plan**: `docs/SPRINT3_TSC_PENDIENTE.md`. Fases A-E.
- **Responsable propuesto**: Code en PowerShell.

### Sprint A working tree sin commit (30+ archivos)

- **Estado**: aplicado autónomamente 1 mayo 2026 vía MCP + edits, pendiente validación + push.
- **Riesgo**: pérdida si reset/cambio rama; falta validación QA manual.
- **Coste cierre**: 30-45 min QA según `docs/CHECKLIST_QA_SPRINT_A_2026-05-01.md` + commit.
- **Bloqueado por**: cierre TSC del sprint Potencias.
- **Responsable propuesto**: Code/Juan en PowerShell tras TSC verde.

### Wizard contacto decisor sin validar adopción

- **Estado**: implementado en EmpresasPage hoy. Nadie lo ha probado todavía.
- **Riesgo**: si Carolina/Juan lo encuentran fricción, abandona el flow y se vuelve a Excel.
- **Coste cierre**: 15 min sesión de prueba conjunta.

## 🟠 Importante — 1-2 semanas

### Sprint A pendientes

| Sub-fase | Coste | Bloqueador |
|---|---|---|
| 30.2 — DROP renovaciones / vista | 3-4h | Refactor `renovaciones/api.ts` y RenovacionesPage para apuntar a `oportunidades`. |
| 30.7 — Datadis batch por NIF | 1d | Edge Function nueva con auth Datadis. |
| 30.9 — RLS granular FASE 20.9 | 2d | Sesión coordinada con observación tabla a tabla (riesgo timeout). |

### `as never` legados — 110 ocurrencias

Tipos `Database` regenerados (5011 líneas) hace tiempo, pero código antiguo sigue con casts. **Nuevos developers copian el patrón roto**.

Distribución:
- `incidencias/api.ts`: 25.
- `renovaciones/api.ts`: 20 (resolverá refactor 30.2).
- `calendario/api.ts`: 17.
- `documentos/api.ts`: 9.
- `empresas/api.ts`: 6.
- `oportunidades/api.ts`: 6.
- `contratos/api.ts`: 4.
- `notificaciones/api.ts`: 3.
- Otros: ~20.

**Coste cierre**: 1-2 días de limpieza por features (FASE 33.4).

### 14 documentos creados 1 mayo 2026

Algunos solapan, otros se contradicen. Mapa en `INDICE_2026-05-01.md`.

**Coste cierre**: 1h consolidación (mover 3 obsoletos a `docs/SESIONES/2026-05-01_estrategia/` o eliminar).

### Validación contacto decisor solo en CREATE UI

Bypaseable por:
- Importador CSV (`src/features/importador/`).
- API directa Supabase (cualquier integración futura).

**Coste cierre**: añadir validación zod en importador + check trigger BD para empresas sin contactos tras N días → notificación. ~3h.

### Edge Function `daily-contract-check` huérfana

Código en `supabase/functions/daily-contract-check/` pero NO desplegada. La lógica vive ahora en SQL `run_daily_contract_check()` desde FASE 30.1. **Decisión pendiente**: deploy como backup manual (botón admin) o eliminar.

**Coste cierre**: 30 min decisión + acción.

## 🟡 Aceptable — gestionable a largo plazo

### Cobertura tests 3% (33 invocaciones en 6 archivos)

Tests existentes:
- `core/hooks/useAutomatizaciones.test.ts`
- `core/hooks/useCustomFields.test.ts`
- `core/utils/dates.test.ts`
- `core/utils/format.test.ts`
- `core/utils/logger.test.ts`
- `features/dashboard/useDashboardScope.test.ts`

**Riesgo**: regresiones silenciosas en refactors grandes (RLS, modelo energético). Funcional hoy porque app es pequeña.

**Coste cierre objetivo 30%**: 5 días dedicados (FASE 33.3).

### Dos escuelas visuales (CRIT-1 design review)

- CRM features: `rounded-md`, `shadow-sm`, padding denso.
- Calculadora features: `rounded-xl/2xl`, `shadow-md`, padding amplio.

**Coste cierre**: 3 días de refactor gradual (FASE 33.2).

### A11y gap

- 30 botones icon-only sin `aria-label` (de 65 totales, gap 46%).
- 5 `confirm()` nativos sin migrar a `ConfirmDialog`.
- Tipografía H1 mixta (`font-display` ausente en algunas pages).

**Coste cierre**: paralelo a convergencia visual, ~2 días.

### Tabla móvil no responsive

`EmpresasPage`, `ContratosPage`, `OportunidadesPage` (vista lista), `IncidenciasPage`, etc. usan `<table>` denso que se desborda en `<lg`.

**Riesgo**: gerente/CFO consultando en móvil → frustración.

**Coste cierre**: convertir a cards/stack en breakpoint mobile, ~2 días (FASE 33.5).

### RAG asistente CRM (`/asistente-crm`)

- Funcional: 15 consultas alltime, 100% encontró respuesta, 4.6s avg.
- Coste mantenimiento: embeddings 268 vectores + Edge Function `ask-crm-docs`.
- **Decisión**: NO eliminar (funciona y es barato), NO priorizar mejoras hasta que volumen suba.

### Modo oscuro pendiente

CSS variables ya preparadas pero sin toggle UI. **Cero impacto producto hoy**. Futuro (FASE 33.6).

## Riesgos de seguridad detectados

### RLS granular NO aplicada en producción (CRÍTICO si abrimos a clientes)

- Estado actual: políticas `all_authenticated` (cualquier usuario logueado ve todo).
- Plan: `supabase/migrations/20260418_fase20.9_rls_granular.sql` y `_draft_rls_hardening_8_tables.sql` listos.
- Bloquea: portal cliente (FASE 32.3).
- **Sin esto, abrir a clientes externos es brecha de privacidad**.
- Coste cierre: 2 días con observación EXPLAIN ANALYZE tabla a tabla.

### `datadis_provincias` sin RLS habilitada

Detectado en `get_advisors`. Tabla pública con datos INE provincias. Riesgo bajo (datos públicos), pero advisor de Supabase lo marca como ERROR.

**Coste cierre**: 1 línea SQL `ALTER TABLE ... ENABLE RLS`.

### Functions SECURITY DEFINER expuestas a `anon`/`authenticated`

15 funciones detectadas por advisor. Mayoría intencionales (helpers RPC para frontend). Pero:
- `admin_reject_user` → debería ser solo master/manager.
- `audit_log_insert` → solo trigger, no RPC.
- `holded_dispatch_worker` → solo cron.
- `run_daily_contract_check` → ya REVOKEado tras detección hoy.

**Coste cierre**: revisar cada uno, REVOKE selectivo. ~2h.

### Functions sin search_path explícito

13 funciones marcadas warning. Riesgo bajo (search_path injection requiere tener funciones maliciosas en otros schemas).

**Coste cierre**: añadir `SET search_path TO 'public', 'pg_temp'` a cada una. ~2h.

### Política RLS `alertas_update_leida` con `USING (true)`

Detectado warning advisor. La política deja a cualquier usuario autenticado actualizar campos `leida` en cualquier alerta de cualquier usuario.

**Coste cierre**: ajustar a `USING (user_id = auth.uid())`. ~15 min.

### `auth_leaked_password_protection` deshabilitado

Supabase Auth puede checkear contra HaveIBeenPwned. No habilitado.

**Coste cierre**: 1 toggle en dashboard. 5 min.

## Features esqueleto sin cablear

### Datadis ↔ CRM (parcialmente resuelto FASE 30.6)

**Antes 1 mayo 2026**: 72 CUPS bajados de Datadis sin vínculo a `empresas`. **Hoy**: dialog manual de asociación añadido. **Pendiente**: 30.7 vinculación masiva por NIF.

### Tabla `documentos` polimórfica con 98 filas

Existe pero no hay generador automático ni firma digital integrada. Solo upload manual.

### Tabla `eventos` polimórfica vacía (0 filas)

Calendario implementado pero usuarios no crean eventos. **Síntoma de fricción** o sin caso de uso percibido.

### Tabla `incidencias` con 0 filas

Idem — workflow listo, no se usa. **Posible debido a**: falta de incidencias automáticas (FASE 32.1) que las generen.

### Tabla `tareas` con 0 filas

`actividades` tipo='tarea' es el patrón vivo. `tareas` separada nunca se usó. **Candidata DROP** futura.

### Tabla `proposals` (legacy Calculadora) con 0 filas

Plan: renombrar a `analisis_comparativo`. Pendiente FASE 31 reorganización.

### Tablas `_migration_*_map` con datos

`_migration_user_map` (4), `_migration_empresa_map` (30), `_migration_cups_map` (75), etc. Son auxiliares de la migración Potencias→CRM. **Candidatas DROP** una vez confirmado que no se necesitan rollback. ~7 tablas.

## Código duplicado / divergente

### `daily-contract-check` Edge Function vs SQL

Código TS (Edge Function, no desplegada) y código SQL (función plpgsql, en cron) hacen lo mismo. Decidir cuál mantener.

### Generadores PDF dispersos

- `core/pdf/autorizacion-valere-pdf.tsx`
- `core/pdf/presentacion-pdf.tsx`
- `core/pdf/pdf-fill.ts`
- `features/potencias/lib/presentacion.ts` (otra capa)

Posible consolidación en `core/pdf/` único con plantillas.

### Mapping de etapas legacy en 2 archivos

`OportunidadesPage.tsx` y `OportunidadForm.tsx` tienen el mismo mapping legacy→canónica. Tras FASE 30.3 ya no debería haber datos legacy entrando. Mantenido como capa defensiva pero candidato a eliminar tras 6 meses sin incidentes.

## Resumen de coste para sanear

| Bloque | Crítico | Importante | Aceptable | Total días |
|---|---|---|---|---|
| TSC + commit Sprint A | 0.5d | — | — | 0.5 |
| Sprint A pendientes | — | 3.5d | — | 3.5 |
| `as never` cleanup | — | 1.5d | — | 1.5 |
| Tests cobertura | — | — | 5d | 5 |
| Convergencia visual + a11y | — | — | 5d | 5 |
| Mobile responsive | — | — | 2d | 2 |
| RLS granular | — | 2d | — | 2 |
| Seguridad advisor | — | 0.5d | — | 0.5 |
| Modo oscuro | — | — | 1d | 1 |
| Doc consolidación | — | 0.25d | — | 0.25 |

**Total saneamiento full**: ~21 días-persona repartidos en 4-6 semanas con 30% del tiempo (regla operativa).

## Recomendación de orden

1. **Crítico (1 día)**: TSC + commit Sprint A.
2. **Importante (1 semana)**: Sprint A pendientes (30.2/30.7/30.9) + RLS granular + advisor seguridad.
3. **Paralelo a desarrollo nuevo (gradual)**: limpieza `as never` por feature al tocar cada una.
4. **Fase futura dedicada (1 semana)**: convergencia visual + a11y + mobile.
5. **Continuo**: tests al 30% durante features nuevas.
