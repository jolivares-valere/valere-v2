# Datadis — Fix emparejamiento CUPS + Alarma de incidencias en Dashboard (2026-07-10)

> Continuación del cierre partner. Auditoría de integración + corrección de bug + feature de alarma.

## Auditoría (estado real)
- De **246 empresas** con NIF, **18 están autorizadas** a Valere en Datadis hoy (authorizedNif=200). El resto (228) dan 403/404 → aún no han firmado autorización (no es fallo).
- Tras el fix: **83 CUPS sincronizados en 18 empresas**.

## Fallos detectados y qué se hizo

### 1. BUG de emparejamiento (corregido) — worker v8
- El CUPS tiene 20 chars base + a veces 2 de frontera (0F, 1P, 0P). El worker emparejaba por 22 chars y **fallaba cuando el CRM guardaba el código largo y Datadis el corto** (REAL CANOE, DERAZA 1 CUPS).
- Fix: emparejar por los **20 chars base** en ambos lados (`base20`).
- Verificado: REAL CANOE pasó de 0→1 sync; DERAZA de 2→3. Queda permanente para nuevos clientes.

### 2. CUPS que faltan en el CRM (incidencia `cups_falta_en_crm`)
- Datadis autoriza CUPS que el CRM no tiene. Ej.: ASOC PAZ Y BIEN (~6), DERAZA (2: `...22185532QM`, `...10864336JF`), CDAD REGANTES (`...053001YM0F`), REAL CANOE (`...7130679LE1P`), CHEMTROL (1).
- Total vivo: **11**.

### 3. CUPS mal cargado (incidencia `cups_no_coincide`)
- **SOCOESREMA** (F91240614): CRM tiene `ES0218901000026874AA` pero Datadis autoriza `ES0031104431293001SJ0F` — CUPS distinto. Requiere corregir el CUPS en el CRM.
- Total vivo: **1**.

## Lo construido

### Base de datos
- Migración `supabase/migrations/20260710_datadis_incidencias.sql` (APLICADA en prod vía conector). Tabla `datadis_incidencias` con RLS (lectura authenticated, escritura service_role).

### Worker `datadis-sync` (v8 desplegado)
- Fix base20 + escribe `datadis_incidencias` en cada run (refresco total → autorreparable: al corregir el dato, la incidencia desaparece sola en la siguiente sync).
- Repo `supabase/functions/datadis-sync/index.ts` = versión legible (comentada). **NOTA**: la copia DESPLEGADA es una versión minificada ASCII funcionalmente idéntica (por límites de la herramienta de deploy). Si quieres paridad exacta, redepliega desde el repo con `supabase functions deploy datadis-sync`.

### Frontend (Dashboard)
- `src/features/datadis/incidencias.api.ts` — hook `useDatadisIncidencias` (agrupa por empresa, refetch 60s).
- `src/features/dashboard/components/IncidenciasDatadisCard.tsx` — alarma roja/naranja, colapsable, oculta si no hay incidencias. Al pinchar una empresa → `/empresas/:id?tab=suministros`.
- `src/features/dashboard/DashboardPage.tsx` — card cableada bajo la tira de vencimientos.
- `src/features/empresas/EmpresaDetailPage.tsx` — ahora abre pestaña vía query param `?tab=` (para el enlace directo de la alarma).
- Doc RAG `docs/help/datadis/incidencias-datos.md`.

## ⚠️ PENDIENTE Juan (terminal) antes de commitear
- **El mount del sandbox sirve copias OBSOLETAS** de algunos ficheros → `tsc` desde el sandbox dio errores FALSOS (ficheros reales intactos, verificado con Read). Ejecuta en tu terminal:
  - `npx tsc --noEmit` (debe dar 0)
  - `npm test -- --run` (39/39)
- Commit sugerido (rama `claude/ui-renovaciones-cups` o nueva `claude/datadis-incidencias`):
  ```
  git add supabase/functions/datadis-sync/index.ts supabase/migrations/20260710_datadis_incidencias.sql \
    src/features/datadis/incidencias.api.ts src/features/dashboard/components/IncidenciasDatadisCard.tsx \
    src/features/dashboard/DashboardPage.tsx src/features/empresas/EmpresaDetailPage.tsx \
    docs/help/datadis/incidencias-datos.md docs/ESTADO.md \
    .cowork/outbox/2026-07-10T09-00-00-datadis-fix-cups-y-alarma-incidencias.md
  git commit -m "feat(datadis): fix emparejamiento CUPS por base20 + alarma incidencias en Dashboard"
  git push origin <rama>
  ```
- Borrar `datadis-diag-temp` del dashboard (neutralizada v3, devuelve 410). Tabla temporal `datadis_diag_run` ya borrada.

## Cómo probar la alarma
1. Abrir el Dashboard con un usuario autenticado → debe verse la alarma "Datadis: 12 incidencias… en N empresas".
2. Pinchar SOCOESREMA → abre su ficha en pestaña Suministros para corregir el CUPS.
3. Corregir un CUPS → a la siguiente sync nocturna (o run manual) la incidencia desaparece.
