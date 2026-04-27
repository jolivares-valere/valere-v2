# Auditoría RLS débil — 2026-04-26

> Sprint domingo, lane 3 (docs/proceso). **Read-only**: este documento NO modifica policies ni aplica migrations. Salida del sondeo `pg_policies` + `pg_class` contra el proyecto CRM (`gtphkowfcuiqbvfkwjxb`).
>
> Sirve como input para el sprint dedicado de hardening RLS, complementando `supabase/migrations/_draft_rls_hardening_8_tables.sql` (que cubre solo 8 tablas) con todo lo que falta detectar fuera de ese listado.

---

## TL;DR

- **36 tablas** en `public`, **todas** con RLS habilitado (`relrowsecurity = true`). Ninguna tabla queda accesible sin policy.
- **11 tablas** tienen al menos una policy con `qual = true` o `auth.role() = 'authenticated'` que abre la operación a **cualquier authenticated**:
  - **8 tablas** ya cubiertas por el draft de hardening: `alertas`, `ciclos`, `comercializadora_docs`, `comunicaciones_cliente`, `excel_import_templates`, `expedientes`, `savings_calculations`, `solicitudes_potencia`. Patrón uniforme: `policy ALL USING(true) WITH CHECK(true)`.
  - **3 tablas adicionales NO cubiertas por el draft** que también requieren hardening: `documentos`, `incidencias`, `renovaciones`. Detalladas en §3.
- **6 tablas** tienen policies SELECT duplicadas con `qual = true` (cada SELECT tiene 2 policies con la misma semántica). No son inseguras pero ensucian la auditoría y dificultan el debug. Detalladas en §4.
- **7 lecturas amplias intencionales** (info catálogo, plantillas, embeddings RAG, perfil propio, etc.). Documentadas en §5 como decisión consciente — no requieren hardening pero sí registro.

---

## 1. Estado RLS por tabla

Tablas en `public` con conteo de policies y filas (snapshot 2026-04-26):

| Tabla | RLS | #Policies | Filas | Estado |
|---|:-:|:-:|---:|---|
| actividades | ✅ | 2 | 0 | OK (granular por usuario_id/asignado_a/rol) |
| alertas | ✅ | 1 | 0 | 🔴 USING(true) — draft hardening |
| ciclos | ✅ | 1 | 0 | 🔴 USING(true) — draft hardening |
| comercializadora_docs | ✅ | 1 | 0 | 🔴 USING(true) — draft hardening |
| comercializadora_ofertas | ✅ | 3 | n/a | 🟡 SELECT duplicado true; write granular OK |
| comercializadoras | ✅ | 3 | 6 | 🟡 SELECT duplicado true; write granular OK |
| comunicaciones_cliente | ✅ | 1 | 0 | 🔴 USING(true) — draft hardening |
| contactos | ✅ | 2 | 1 | OK (granular vía empresas.comercial_id) |
| contratos | ✅ | 4 | 2 | OK (granular por comercial_id + rol) |
| crm_asistente_log | ✅ | 2 | n/a | OK (admin/manager read; service_role write — diseño) |
| crm_help_embeddings | ✅ | 2 | 216 | 🟢 INTENCIONAL (lectura pública RAG; write service_role) |
| cups | ✅ | 1 | 1 | OK (granular vía contratos) |
| custom_fields_schema | ✅ | 4 | n/a | 🟡 SELECT abierto authenticated (schema compartido — INTENCIONAL) |
| custom_fields_values | ✅ | 4 | n/a | OK (granular por rol) |
| datadis_consumptions | ✅ | 4 | n/a | OK (granular por rol/empresa) |
| datadis_tokens | ✅ | 4 | n/a | OK (granular admin + comercial-de-empresa) |
| documentos | ✅ | 3 | 0 | 🔴 Tiene `documentos_all_authenticated` que ANULA las granulares (PERMISSIVE OR) |
| email_templates | ✅ | 1 | 0 | 🟡 SELECT abierto (intencional — plantillas comunes) |
| empresas | ✅ | 4 | 3 | OK (granular completa) |
| eventos | ✅ | 2 | 0 | OK (granular por rol) |
| excel_import_templates | ✅ | 1 | 0 | 🔴 USING(true) — draft hardening |
| expedientes | ✅ | 1 | 0 | 🔴 USING(true) — draft hardening |
| facturas | ✅ | 5 | 0 | 🟡 SELECT duplicado true; write granular OK |
| global_config | ✅ | 3 | n/a | 🟡 SELECT duplicado true; write granular OK |
| incidencias | ✅ | 1 | 0 | 🔴 ALL `auth.role()='authenticated'` — falta granular |
| notificaciones | ✅ | 3 | 0 | OK (granular por usuario_id) |
| oportunidades | ✅ | 2 | 4 | OK (granular por comercial_id + rol) |
| precios_regulados_boe | ✅ | 3 | 29 | 🟡 SELECT duplicado true; write granular OK |
| proposals | ✅ | 5 | 0 | 🟡 SELECT duplicado true; write granular OK (legacy — drop tras consolidar a `propuestas`) |
| propuestas | ✅ | 1 | 0 | OK (granular vía oportunidades) |
| renovaciones | ✅ | 1 | 0 | 🔴 ALL `auth.role()='authenticated'` — falta granular |
| savings_calculations | ✅ | 1 | 0 | 🔴 USING(true) — draft hardening |
| solicitudes_potencia | ✅ | 1 | 0 | 🔴 USING(true) — draft hardening |
| status_log | ✅ | 1 | 0 | 🟡 SELECT abierto (intencional — log auditoría lectura) |
| tareas | ✅ | 2 | 0 | OK (granular por asignado_a + rol) |
| user_profiles | ✅ | 3 | n/a | 🟡 SELECT abierto (necesario para joins FE — INTENCIONAL) |

Leyenda:
- 🔴 = expuesto, hardening requerido en próximo sprint.
- 🟡 = revisable: o duplicado redundante, o lectura amplia consciente que merece registro.
- 🟢 = lectura/escritura amplia INTENCIONAL ya documentada.
- OK = policies granulares correctas.

---

## 2. Tablas YA cubiertas por `_draft_rls_hardening_8_tables.sql`

No-op para esta auditoría — el draft ya las contempla. Listadas para checklist:

1. `alertas` — `alertas_authenticated_all` ALL `qual=true with_check=true`.
2. `ciclos` — `ciclos_authenticated_all` ALL `qual=true with_check=true`.
3. `comercializadora_docs` — `comercializadora_docs_authenticated_all` ALL `qual=true with_check=true`.
4. `comunicaciones_cliente` — `comunicaciones_cliente_authenticated_all` ALL `qual=true with_check=true`.
5. `excel_import_templates` — `excel_import_templates_authenticated_all` ALL `qual=true with_check=true`.
6. `expedientes` — `expedientes_authenticated_all` ALL `qual=true with_check=true`.
7. `savings_calculations` — `savings_calculations_authenticated_all` ALL `qual=true with_check=true`.
8. `solicitudes_potencia` — `solicitudes_potencia_authenticated_all` ALL `qual=true with_check=true`.

Aplicar tras Fase 2 datos según el draft. **Recomendación**: ampliar el draft incluyendo §3 (3 tablas extra) en una única migration `20260427_rls_hardening_11_tables.sql` para no fragmentar.

---

## 3. Tablas con USING(true) NO cubiertas por el draft (hardening pendiente)

Estas son las únicas hallazgos nuevos respecto al inventario de sprint 8.

### 3.A — `documentos` (CRÍTICO)

Tabla polimórfica para adjuntos. Tiene **3 policies**:

| Policy | Roles | CMD | qual | with_check |
|---|---|---|---|---|
| `doc_read` | public | SELECT | `(deleted_at IS NULL) AND get_user_rol() IN (admin,jefe_equipo,comercial,visor)` | — |
| `doc_write` | public | ALL | `get_user_rol() IN (admin,jefe_equipo,comercial)` | idem |
| `documentos_all_authenticated` | public | ALL | `auth.role() = 'authenticated'` | idem |

**Problema**: las policies PostgreSQL son **permissive OR** por defecto. El predicado `auth.role()='authenticated'` es un superconjunto del granular → la weak **anula** la granular. Cualquier usuario autenticado puede leer/escribir/borrar cualquier documento, ignorando rol y `deleted_at`.

**Fix recomendado** (incluir en migration combinada):

```sql
-- Eliminar la policy weak que está sobreescribiendo a las granulares.
DROP POLICY IF EXISTS documentos_all_authenticated ON public.documentos;
-- doc_read y doc_write ya cubren el caso correctamente.
```

**Verificación post-fix**:
```sql
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename='documentos';
-- Debe quedar solo doc_read y doc_write
```

**Riesgo de regresión**: bajo. Los componentes que escriben documentos pasan por mutaciones que asumen rol válido. La weak es residuo de iteración anterior.

---

### 3.B — `incidencias` (HIGH)

| Policy | Roles | CMD | qual | with_check |
|---|---|---|---|---|
| `incidencias_all_authenticated` | authenticated | ALL | `auth.role() = 'authenticated'` | idem |

**Problema**: tabla wide open authenticated. No hay policy granular que la complemente.

**Patrón propuesto** (similar al de `actividades` / `tareas`):

```sql
-- Asume cols (verificar antes de aplicar): id, empresa_id (FK), creado_por, asignado_a (uuid), estado, deleted_at.
DROP POLICY IF EXISTS incidencias_all_authenticated ON public.incidencias;

CREATE POLICY incidencias_select ON public.incidencias FOR SELECT TO authenticated USING (
  deleted_at IS NULL AND (
    get_user_rol() = ANY (ARRAY['admin','jefe_equipo','manager','master','visor']::text[])
    OR creado_por = auth.uid()
    OR asignado_a = auth.uid()
    OR EXISTS (SELECT 1 FROM empresas e WHERE e.id = incidencias.empresa_id AND e.comercial_id = auth.uid())
  )
);

CREATE POLICY incidencias_insert ON public.incidencias FOR INSERT TO authenticated WITH CHECK (
  get_user_rol() = ANY (ARRAY['admin','jefe_equipo','manager','master','comercial']::text[])
);

CREATE POLICY incidencias_update ON public.incidencias FOR UPDATE TO authenticated USING (
  get_user_rol() = ANY (ARRAY['admin','jefe_equipo','manager','master']::text[])
  OR creado_por = auth.uid()
  OR asignado_a = auth.uid()
) WITH CHECK (
  get_user_rol() = ANY (ARRAY['admin','jefe_equipo','manager','master','comercial']::text[])
);

CREATE POLICY incidencias_delete ON public.incidencias FOR DELETE TO authenticated USING (
  get_user_rol() = ANY (ARRAY['admin','jefe_equipo','manager','master']::text[])
);
```

**Pre-flight check obligatorio**: ejecutar `\d+ public.incidencias` antes de aplicar para confirmar columnas reales (`creado_por`, `asignado_a`, `empresa_id`, `deleted_at`). Ajustar el SQL si difieren.

---

### 3.C — `renovaciones` (HIGH)

| Policy | Roles | CMD | qual | with_check |
|---|---|---|---|---|
| `renovaciones_all_authenticated` | authenticated | ALL | `auth.role() = 'authenticated'` | idem |

Mismo patrón que `incidencias`. Una renovación está siempre ligada a un contrato/empresa, así que el filtro natural es vía `contratos.comercial_id` o `empresas.comercial_id`.

```sql
-- Asume cols (verificar): id, contrato_id (FK), creado_por, fecha_renovacion, estado, deleted_at.
DROP POLICY IF EXISTS renovaciones_all_authenticated ON public.renovaciones;

CREATE POLICY renovaciones_select ON public.renovaciones FOR SELECT TO authenticated USING (
  deleted_at IS NULL AND (
    get_user_rol() = ANY (ARRAY['admin','jefe_equipo','manager','master','visor']::text[])
    OR EXISTS (SELECT 1 FROM contratos c WHERE c.id = renovaciones.contrato_id AND c.comercial_id = auth.uid())
  )
);

CREATE POLICY renovaciones_insert ON public.renovaciones FOR INSERT TO authenticated WITH CHECK (
  get_user_rol() = ANY (ARRAY['admin','jefe_equipo','manager','master','comercial']::text[])
);

CREATE POLICY renovaciones_update ON public.renovaciones FOR UPDATE TO authenticated USING (
  get_user_rol() = ANY (ARRAY['admin','jefe_equipo','manager','master']::text[])
  OR EXISTS (SELECT 1 FROM contratos c WHERE c.id = renovaciones.contrato_id AND c.comercial_id = auth.uid())
) WITH CHECK (
  get_user_rol() = ANY (ARRAY['admin','jefe_equipo','manager','master','comercial']::text[])
);

CREATE POLICY renovaciones_delete ON public.renovaciones FOR DELETE TO authenticated USING (
  get_user_rol() = ANY (ARRAY['admin','jefe_equipo','manager','master']::text[])
);
```

Mismo pre-flight check.

---

## 4. Policies SELECT duplicadas (limpieza, no seguridad)

Cada una de estas tablas tiene **dos** policies SELECT con `qual = true` (típicamente una con nombre legacy de cuando la tabla se llamaba `retailers`/`retailer_offers`/`boe_regulated_prices`/`invoice_history` + otra con el nombre nuevo). PostgreSQL los OR-juntos resuelve igual, pero ensucia auditoría y advisors.

| Tabla | Policy a mantener | Policy a borrar |
|---|---|---|
| `comercializadoras` | `retailers_select` | `Authenticated users can read retailers` |
| `comercializadora_ofertas` | `retailer_offers_select` | `Authenticated users can read retailer_offers` |
| `precios_regulados_boe` | `boe_select` | `Authenticated users can read boe_regulated_prices` |
| `facturas` | `facturas_select` | `Authenticated users can read invoice_history` |
| `global_config` | `global_config_select` | `Authenticated users can read global_config` |
| `proposals` | `proposals_select` | `Authenticated users can read proposals` |

Migration de limpieza (incluir en sprint hardening combinado):

```sql
DROP POLICY IF EXISTS "Authenticated users can read retailers" ON public.comercializadoras;
DROP POLICY IF EXISTS "Authenticated users can read retailer_offers" ON public.comercializadora_ofertas;
DROP POLICY IF EXISTS "Authenticated users can read boe_regulated_prices" ON public.precios_regulados_boe;
DROP POLICY IF EXISTS "Authenticated users can read invoice_history" ON public.facturas;
DROP POLICY IF EXISTS "Authenticated users can read global_config" ON public.global_config;
DROP POLICY IF EXISTS "Authenticated users can read proposals" ON public.proposals;
```

Riesgo: **cero** — ambas policies hacen exactamente lo mismo, eliminar una de ellas no cambia el conjunto de filas legibles.

---

## 5. Lecturas amplias intencionales (registrar, NO endurecer)

Estas son `qual = true` por **diseño** y deben quedar documentadas en `docs/SEGURIDAD.md` para que el siguiente auditor no las re-flaguee.

| Tabla / policy | Por qué se deja abierto | Riesgo aceptado |
|---|---|---|
| `crm_help_embeddings.crm_help_embeddings_read_authenticated` | Edge Function `ask-crm-docs` necesita leer embeddings con el JWT del usuario para hacer matching. Datos no sensibles (texto público de `docs/help/`). | Ninguno relevante. |
| `crm_help_embeddings.crm_help_embeddings_write_service_role` | Pipeline GitHub Actions usa service role para regenerar embeddings. | Ninguno. |
| `crm_asistente_log.asistente_log_service_write` | Log RGPD-anonimizado. Solo Edge Function (service_role) escribe. | Lectura ya restringida a admin/manager (✅). |
| `email_templates.email_templates_authenticated_read` | Plantillas de email son catálogo compartido. Escritura no expuesta. | Bajo — añadir hardening de write si futuro WriteUI. |
| `precios_regulados_boe.boe_select` | Precios BOE son **públicos por ley**. Lectura abierta es la norma. | Ninguno. |
| `global_config.global_config_select` | Config no sensible (parámetros UI, branding). Sensible (API keys) **NO debe estar aquí**. | Bajo — auditar contenido cada release. |
| `status_log.status_log_authenticated_read` | Auditoría de cambios visible al equipo. | Bajo — confirmar 0 PII en `status_log.payload`. |
| `user_profiles.Users can read own profile` (qual=true) | Necesario para que el FE pueda joinear nombres de comerciales en empresas/contratos/oportunidades. **Verificar columnas expuestas**: si hay `phone`/`address`/etc, considerar VIEW pública con solo `id, nombre, apellidos, role`. | Medio — revisar columnas en sprint dedicado. |
| `custom_fields_schema.cfs_select_authenticated` | Schema de custom fields debe ser visible para que el FE pinte formularios. Write granular. | Ninguno. |

**Acción**: añadir un párrafo en `docs/SEGURIDAD.md` titulado "Lecturas amplias intencionales" con esta tabla, para que en futuras auditorías no se reabran como hallazgos.

---

## 6. Vistas y otros objetos

Las **compat views** (`retailers`, `retailer_offers`, `boe_regulated_prices`) heredan RLS de la tabla base por `security_invoker = on` (verificado en sprint 7). No requieren policy propia. Si en algún momento se cambian a `security_definer`, vuelve a fallar el advisor `security_definer_view` (ver sprint 7 fixes).

Cuando se añadan compat views para apps satélite (Potencias) en Fase 4, **garantizar `security_invoker = on`** en cada `CREATE OR REPLACE VIEW`.

---

## 7. Plan de remediación recomendado

Una sola migration combinada en lugar de 3 separadas:

**`supabase/migrations/_draft_rls_hardening_completo_2026-04-27.sql`** (renombrar a fecha real al aplicar):

1. Bloque A — 8 tablas Potencias (copiar contenido de `_draft_rls_hardening_8_tables.sql`).
2. Bloque B — `documentos`: `DROP POLICY documentos_all_authenticated`.
3. Bloque C — `incidencias`: 4 policies granulares (DROP weak primero).
4. Bloque D — `renovaciones`: 4 policies granulares (DROP weak primero).
5. Bloque E — Limpieza duplicados SELECT (6 `DROP POLICY`).

**Pre-flight**:
```sql
-- 1. Verificar columnas reales de incidencias y renovaciones:
\d+ public.incidencias
\d+ public.renovaciones

-- 2. BEGIN; <toda la migration>; verify counts; ROLLBACK; — confirmar que apply no rompe nada.

-- 3. Verificar que el FE usa get_user_rol()/is_manager_or_above() correctamente — grep en src/.
```

**Aplicar tras**: Fase 2 datos completa + smoke test estable de 1 semana, así puedes tester con datos reales y roles diversos.

**Rollback** (si algo se rompe):
```sql
-- Re-crear las policies weak temporalmente:
CREATE POLICY incidencias_all_authenticated ON public.incidencias FOR ALL TO authenticated USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');
-- Idem renovaciones, documentos.
-- Y las 8 USING(true) del draft 8-tables (sus DROP están en el bloque A).
```

---

## 8. Checklist de cierre auditoría

- [x] Sondeo `pg_class` + `pg_policies` realizado (this doc).
- [x] 3 hallazgos nuevos documentados (`documentos`, `incidencias`, `renovaciones`).
- [x] 6 duplicados SELECT identificados (limpieza opcional).
- [x] 9 lecturas amplias clasificadas como intencionales.
- [ ] Aplicar migration combinada (sprint dedicado, post Fase 2 datos). **Bloqueado por Fase 2**.
- [ ] Añadir párrafo "Lecturas amplias intencionales" a `docs/SEGURIDAD.md` (sprint dedicado).
- [ ] Re-correr esta auditoría tras hardening, verificar 0 hallazgos rojos. Refrescar este doc con sufijo `_post_hardening`.

---

> Sprint domingo, lane 3. NO commits, NO migrations aplicadas — solo análisis. Output consumible por el sprint dedicado de hardening RLS.
