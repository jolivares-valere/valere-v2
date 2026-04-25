# Unificación Supabase — Plan Fases 4 y 5

> Generado por sprint autónomo 8 (2026-04-26).
> Continuación de `docs/PLAN_UNIFICACION_SUPABASE.md` y `docs/PLAN_UNIFICACION_SUPABASE_FASE_0.md`.
> Prerequisitos: Fase 1 ✅ aplicada, Fase 2 ✅ pendiente Juan, Fase 3 ✅ aplicada.

---

## Fase 4 — Deploy + smoke tests + cutover

### Objetivo

Cambiar las apps satélite (Potencias y Excedentes si tiene código separado) para que apunten al CRM canónico. Los usuarios reales empiezan a operar contra el proyecto único.

### Prerequisitos checklist (verificar antes de empezar)

- [ ] Fase 1 aplicada en CRM (✅ — sprint 7).
- [ ] Fase 2 aplicada en CRM (Juan vía pg_dump+psql, sprint 8).
- [ ] FE refactor del CRM aplicado (✅ — sprint 7 + verificación sprint 8).
- [ ] TSC 0 errores en valere-v2 tras Fase 1+3.
- [ ] 39 tests pasando.
- [ ] Smoke test manual del CRM contra prod tras Fase 2: login, ver empresas/CUPS/expedientes con datos reales.

### Subfases

#### 4.A — Deploy del CRM con datos reales (10 min)

Las migrations de schema ya están en prod CRM. Lo único que cambia con Fase 2 es que aparecen ~408 filas reales. El FE refactor está mergeable cuando quieras.

```powershell
# Tras commit + push del PR #6 (script en handoff sprint 7) y merge a main:
# Cloudflare Pages auto-deploya. Sin pasos manuales.
# Opción manual:
cd $HOME\valere-v2
npm run build
# Subir a Cloudflare via dashboard o wrangler
```

#### 4.B — Smoke tests post-deploy (30 min)

Con un compañero de Valere o Juan haciendo de QA:

1. **Login** en `https://valere-v2.pages.dev`.
2. **Empresas** → ver listado, abrir 2-3 que vinieron de Potencias (con `legacy_potencia_id` no null), ver detalles.
3. **CUPS** → mismo: listado, detalle, comprobar `p1_kw..p6_kw`, dirección.
4. **Expedientes** (nueva ruta a habilitar — ver subfase 4.D) → listado.
5. **Admin → Comercializadoras** → ver 6 originales + 2 importadas o fusionadas.
6. **Admin → Ofertas** → si hay ofertas creadas, ver. Crear una nueva. Editar. Borrar.
7. **Análisis** → seleccionar una empresa con CUPS, ejecutar análisis. Comprobar que carga `comercializadora_ofertas` y `precios_regulados_boe`.
8. **Asistente RAG** → preguntar algo. Debe responder igual que antes.
9. **Logs** Edge Function: `mcp__get_logs` para confirmar 0 errores nuevos.

#### 4.C — Apps satélite (Potencias / Excedentes)

Estas apps NO están mounted en este sandbox de Cowork — Juan las refactoriza desde su PowerShell.

**Cambios mínimos por app**:

```diff
# .env (production)
- VITE_SUPABASE_URL=https://alesfvxqtwlrwlmkoosg.supabase.co
- VITE_SUPABASE_ANON_KEY=<anon key Potencias>
+ VITE_SUPABASE_URL=https://gtphkowfcuiqbvfkwjxb.supabase.co
+ VITE_SUPABASE_ANON_KEY=<anon key CRM>
```

```diff
# Source code (todas las queries):
- .from('clients')                 → .from('empresas')
- .from('supplies')                → .from('cups')
- .from('profiles')                → .from('user_profiles')
- .from('regulated_rates')         → .from('precios_regulados_boe')
- .from('client_communications')   → .from('comunicaciones_cliente')
- .from('client_documents')        → .from('documentos').eq('entidad_tipo','empresa')
- .from('expediente_documents')    → .from('documentos').eq('entidad_tipo','expediente')
- .from('alerts')                  → .from('alertas')
- .from('power_requests')          → .from('solicitudes_potencia')

# Columnas renombradas en empresas:
- nombre_fiscal                    → mantener
- cif                              → cif_nif (en CRM la col es nif por ahora — mantener cif si Potencias usa cif)
- email_contacto                   → mantener (CRM tiene email_principal pero email_contacto se añadió en aditiva)

# Columnas renombradas en cups (vs supplies):
- cups (campo)                     → codigo_cups
- client_id                        → empresa_id
- tariff_type                      → tarifa_acceso (o mantener tariff_type — ambas existen)
- distribuidora                    → distribuidor (en CRM la col es distribuidor; nota: canónica es 'distribuidora', renombrar en futuro sprint)
```

**Estrategia recomendada para Potencias**: usar el patrón de **compat views** que aplicamos al CRM. En lugar de refactorizar todas las queries de la app Potencias, **crear views en el CRM** con los nombres viejos:

```sql
-- En CRM, dejar Potencias-app feliz sin tocarla:
create or replace view public.clients as
  select id, nombre AS nombre_fiscal, nif AS cif, email_contacto, telefono_principal AS telefono,
         direccion_fiscal, ciudad, codigo_postal, asesor_id, notas, activo,
         created_by, created_at, comercial_id AS gestor_id
  from public.empresas;

create or replace view public.supplies as
  select id, empresa_id AS client_id, codigo_cups AS cups, denominacion,
         direccion_suministro, ciudad_suministro, tarifa_acceso AS tariff_type,
         channel, distribuidor AS distribuidora, comercializadora_actual AS comercializadora,
         p1_kw, p2_kw, p3_kw, p4_kw, p5_kw, p6_kw,
         potencia_maxima_disponible, tension_kv, notas,
         (estado = 'activo') AS activo, created_at, created_by,
         comercializadora_id
  from public.cups;

create or replace view public.profiles as
  select id, email, nombre, apellidos, rol, activo, created_at
  from public.user_profiles;

create or replace view public.regulated_rates as
  select id, tariff_type, period, rate_eur_kw_day, valid_from, valid_to, updated_by, updated_at
  from public.precios_regulados_boe;

create or replace view public.alerts as
  select id, expediente_id, ciclo_id, request_id, cups_id AS supply_id, empresa_id AS client_id,
         tipo, fecha_alerta, mensaje, leida, fecha_lectura, leida_por, created_at
  from public.alertas;

create or replace view public.power_requests as
  select id, ciclo_id, expediente_id, cups_id AS supply_id, empresa_id AS client_id,
         tipo, estado, comercializadora_nombre, channel_used,
         p1_actual, p1_nueva, p2_actual, p2_nueva, p3_actual, p3_nueva,
         p4_actual, p4_nueva, p5_actual, p5_nueva, p6_referencia,
         fecha_solicitud_enviada, fecha_envio_autorizacion, fecha_firma_cliente,
         fecha_autorizacion, fecha_ejecucion_real,
         fecha_prevista_inicio, fecha_prevista_fin,
         fecha_alerta_amarilla, fecha_alerta_naranja, fecha_alerta_roja,
         ref_solicitud_distribuidora, ref_autorizacion,
         doc_autorizacion_id, doc_autorizacion_firmada_id,
         notas_internas, created_by, created_at, updated_at
  from public.solicitudes_potencia;

create or replace view public.client_communications as
  select id, empresa_id AS client_id, expediente_id, ciclo_id,
         tipo, asunto, cuerpo_html, destinatario_email, cc_email,
         fecha_envio, enviado_por, resend_message_id, estado, error_detalle, created_at
  from public.comunicaciones_cliente;

-- client_documents: una view filtrada
create or replace view public.client_documents as
  select id, empresa_id AS client_id, tipo, nombre, descripcion, nombre_archivo,
         ruta_storage AS storage_path, tamano_bytes, expediente_id, ciclo_id,
         metadata, subido_por, created_at
  from public.documentos
  where entidad_tipo = 'empresa';

-- expediente_documents: idem filtrada
create or replace view public.expediente_documents as
  select id, expediente_id, ciclo_id, tipo, nombre_archivo, nombre_original,
         mime_type, tamano_bytes, ruta_storage AS storage_path, notas,
         subido_por, created_at
  from public.documentos
  where entidad_tipo = 'expediente';

-- documentacion: filtrada
create or replace view public.documentacion as
  select id, nombre, descripcion, 'normativa' AS categoria, nombre_archivo,
         ruta_storage AS storage_path, tamano_bytes, subido_por, created_at
  from public.documentos
  where entidad_tipo = 'general';
```

**Trade-off del approach views**:
- ✅ Cero código que tocar en Potencias / Excedentes apps. Solo cambiar env vars (URL + ANON_KEY) y deploy.
- ✅ Cutover en 5 minutos por app.
- ❌ Las views tienen overhead mínimo (<5ms en queries simples) y aparecen como objetos legacy. Drop tras refactor real.
- ❌ Para INSERT/UPDATE con renames de columnas (ej. `client_id` → `empresa_id`), necesitan triggers explícitos como hicimos para `retailer_offers`.

Para esta migración, recomiendo:
- Crear views read-only para los SELECTs que la app Potencias hace.
- Para los INSERTs/UPDATEs, refactorizar la app Potencias (es el patrón más limpio largo plazo).
- Total estimado refactor Potencias: 1-2 días persona (depende de extensión del código).

#### 4.D — Habilitar features Potencias en el CRM (si aplica)

Las tablas `expedientes`, `ciclos`, `solicitudes_potencia` etc. ahora viven en CRM. Para que los usuarios accedan vía CRM (no vía la app Potencias), hay que crear las pantallas:

- `src/features/expedientes/` — listado, detalle, crear/editar.
- `src/features/solicitudes-potencia/` — kanban por estado.
- `src/features/savings-calculations/` — reporte ahorros.
- Sidebar → añadir entradas para estas páginas.

**Decisión producto pendiente Juan**: ¿quieres que el CRM absorba la funcionalidad Potencias o mantienes las apps separadas y solo unificas la base?
- **Opción A** (apps separadas): Potencias app refactorizada apunta al CRM via env vars. Sigue siendo una app distinta con su URL.
- **Opción B** (unificar UX): añadir features Potencias al CRM. Una sola URL, una sola UX. Apps satélite quedan deprecadas.

**Recomendación**: Opción B para usuarios y Opción A para transición. Es decir: durante la transición ambas apps coexisten apuntando al CRM. Largo plazo, los usuarios solo usan el CRM.

### Verificación post-Fase-4

```sql
-- Counts esperados en prod tras Fase 2:
SELECT 'empresas (~30 + 3 test)' AS t, count(*) FROM empresas
UNION ALL SELECT 'cups (~75 + 1 test)', count(*) FROM cups
UNION ALL SELECT 'expedientes (~41)', count(*) FROM expedientes
UNION ALL SELECT 'ciclos (~41)', count(*) FROM ciclos
UNION ALL SELECT 'solicitudes_potencia (~41)', count(*) FROM solicitudes_potencia;
```

---

## Fase 5 — Cleanup post-cutover (1-2 días, tras 1 semana estable)

### Objetivo

Tras 1 semana sin incidencias, eliminar todo lo legacy y dar el sprint por cerrado.

### Acciones

#### 5.A — Drop compat views CRM (cuando todo el FE esté refactorizado)

```sql
-- Solo cuando se haya verificado por grep que NINGÚN código en valere-v2/
-- ni Potencias/ ni Excedentes/ usa los nombres viejos:
DROP VIEW IF EXISTS public.retailers CASCADE;
DROP VIEW IF EXISTS public.retailer_offers CASCADE;
DROP VIEW IF EXISTS public.boe_regulated_prices CASCADE;
DROP FUNCTION IF EXISTS public.legacy_retailers_insert();
DROP FUNCTION IF EXISTS public.legacy_retailer_offers_insert();

-- Si hicimos views para Potencias-app:
DROP VIEW IF EXISTS public.clients CASCADE;
DROP VIEW IF EXISTS public.supplies CASCADE;
DROP VIEW IF EXISTS public.profiles CASCADE;
DROP VIEW IF EXISTS public.regulated_rates CASCADE;
DROP VIEW IF EXISTS public.alerts CASCADE;
DROP VIEW IF EXISTS public.power_requests CASCADE;
DROP VIEW IF EXISTS public.client_communications CASCADE;
DROP VIEW IF EXISTS public.client_documents CASCADE;
DROP VIEW IF EXISTS public.expediente_documents CASCADE;
DROP VIEW IF EXISTS public.documentacion CASCADE;
```

#### 5.B — Drop tabla `proposals` (cuando consolidación FE bajo `propuestas` esté hecha)

```sql
DROP TABLE IF EXISTS public.proposals CASCADE;
```

Y refactor FE de:
- `src/features/analisis/AnalisisPage.tsx:248` (insert de propuesta).
- `src/features/tracking/TrackingPage.tsx`.
- `src/features/propuestas-energia/PropuestasEnergiaPage.tsx`.

Migrar a `public.propuestas` (tabla canónica CRM ya existente con 0 rows).

#### 5.C — Pausar / borrar proyecto Potencias

```bash
# Vía dashboard Supabase:
# https://supabase.com/dashboard/project/alesfvxqtwlrwlmkoosg/settings/general
# → Pause project (gratis, datos preservados)
# → Después de 1 mes: Delete project
```

Antes de pausar:
1. Verificar que ninguna app apunta al proyecto.
2. `pg_dump` final del proyecto Potencias como backup permanente: `$HOME\valere-backups\potencias_final_archive.sql`.
3. Documentar en `docs/ARQUITECTURA_PROYECTOS.md`.

#### 5.D — Limpieza repo

Cosas pendientes ya identificadas en sprint 5+6:

```powershell
git rm src/features/chat-ia/ChatIAPanel.tsx
git rm -r src/features/chat-ia
git rm -r supabase/functions/chat-consultor   # también delete Edge Function en Supabase Dashboard
git rm src/types/database.ts                   # legacy calculadora, ya no se usa tras refactor completo
git rm src/core/types/database_canonical_2026-04-26.ts   # duplicado de database.ts
git rm q
git rm useAuth.ts
git rm "import { useEffect } from 'react'.txt"
git rm "import { useState } from 'react'.txt"
git rm tsc_output.txt
git rm supabase-migration.sql
git rm -r "CRM VALERE"   # carpeta vacía
```

#### 5.E — Hardening RLS

Aplicar el sprint dedicado de RLS sobre las 8 tablas con `USING(true)`:
- `expedientes`, `ciclos`, `solicitudes_potencia`, `savings_calculations`
- `comunicaciones_cliente`, `comercializadora_docs`, `excel_import_templates`, `alertas`

Ver `docs/RLS_HARDENING_DRAFT_2026-04-26.md` (preparado en sprint 8).

#### 5.F — Auditoría final

```sql
-- 0 ERRORs, < 5 WARN (idealmente solo auth_leaked_password_protection)
SELECT * FROM mcp__get_advisors;

-- 0 orphans en FK
-- (correr scripts/unificacion_fase2_c_verificacion.sql)
```

#### 5.G — Documentación de cierre

- `docs/ARQUITECTURA_PROYECTOS.md`: actualizar para reflejar 1 proyecto Supabase.
- `docs/SEGURIDAD.md`: registrar decisiones nuevas.
- `docs/ESTADO.md`: cerrar la épica de unificación.
- `docs/POST_MORTEM_UNIFICACION.md` (nuevo): qué fue bien, qué mal, lecciones aprendidas.

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Datos Potencias mal mapeados a empresas/cups en Fase 2 | Media | Verificación post-Fase-2 con `_c_verificacion.sql`. Si orphans > 0, ROLLBACK. |
| FE roto post-rename | Baja | Compat views activas como red de seguridad. Validadas SELECT/INSERT/UPDATE/DELETE en sprint 8. |
| Apps satélite no apuntan a CRM correctamente | Media | Smoke test manual subfase 4.B antes de cutover. |
| Cuenta Supabase quedando suspendida por uso (free tier) | Baja | Free tier permite 500MB DB + 2GB transfer/mes. Estamos lejos. |
| Pérdida de docs/blobs en Storage Potencias | Baja | Storage NO se ha migrado en Fase 2 (solo registros). Si las URLs `storage_path` siguen apuntando al bucket de Potencias, las apps fallarán al cargar PDFs. **Requiere paso adicional**: copiar bucket Potencias→CRM o configurar CDN compartida. **Pendiente para Juan**: revisar `client_documents.storage_path` y decidir migración bucket. |

---

## Estimación restante (post sprint 7+8)

| Fase | Estimación | Quién |
|---|---|---|
| Fase 2 datos | 30 min - 1h | Juan (PowerShell pg_dump+psql) |
| Smoke tests post-Fase 2 | 30 min | Juan |
| Refactor apps satélite | 1-2 días | Juan / Cowork (si están mounted) |
| Habilitar features Potencias en CRM (opción B) | 3-4 días | Juan / Cowork |
| Sprint dedicado: drop tabla proposals + consolidar features FE | 1-2 días | Cowork |
| Sprint dedicado: hardening RLS | 1 día | Cowork |
| Cleanup Fase 5 | 0.5-1 día | Juan + Cowork |
| **Total restante** | **~5-7 días persona** | |

Con Fase 1 + 3 ya hechas en sprints 7+8, **el sprint dedicado queda al 60% completo**.
