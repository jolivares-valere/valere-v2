# RLS hardening — validación profunda del draft

> Sprint paralelo A (backend) — 2026-04-25 noche.
> Validación de `supabase/migrations/_draft_rls_hardening_8_tables.sql`.
> Ejecutado contra prod (`gtphkowfcuiqbvfkwjxb`) en transacción `BEGIN…ROLLBACK`.

---

## Resumen

**15 tests funcionales ejecutados, 15 pass.** El draft de hardening es funcionalmente correcto: bloquea exactamente lo que tiene que bloquear (writes de no-managers a tablas write-restricted, suplantación de creator, deletes a recursos ajenos) y permite todo lo que tiene que permitir (writes self-creator, marcado de alertas leídas por cualquier authed, lectura abierta).

Hay **una observación crítica de configuración** que requiere acción de Juan antes de aplicar en prod (ver §3).

---

## 1) Setup del banco de pruebas

Usuarios reales en `user_profiles`:

| email | id | role | status | approved |
|---|---|---|---|---|
| jolivares@valereconsultores.com | `0d6bc49b-…` | **master** | active | true |
| arodriguez@valereconsultores.com | `d9e9cd08-…` | client | active | false |
| administracion@valereconsultores.com | `3770d3ed-…` | client | active | false |

`is_manager_or_above()` → resuelve `get_user_rol() IN ('admin','master','manager')` → master devuelve true, client devuelve false.

Cada test reproduce el contexto JWT vía:

```sql
set local role authenticated;
perform set_config('request.jwt.claims',
  '{"sub":"<uuid>","role":"authenticated"}', true);
```

## 2) Resultados (15/15 pass)

| # | Test | Esperado | Resultado |
|---|---|---|---|
| 1 | master inserta expediente con `created_by = self` | OK | ✅ OK |
| 2 | master inserta alerta | OK | ✅ OK |
| 3 | master inserta documento de comercializadora | OK | ✅ OK |
| 4 | client inserta alerta | BLOCK 42501 | ✅ BLOCK (42501) |
| 5 | client inserta `comercializadora_docs` | BLOCK 42501 | ✅ BLOCK (42501) |
| 6 | client inserta `savings_calculations` | BLOCK 42501 | ✅ BLOCK (42501) |
| 7 | client inserta expediente con `created_by = self` | OK | ✅ OK |
| 8 | client inserta expediente con `created_by = master` (suplantación) | BLOCK 42501 | ✅ BLOCK (42501) |
| 9 | client UPDATE de su propio expediente | 1 fila | ✅ 1 row |
| 10 | client UPDATE expediente de master | 0 filas (USING filtra) | ✅ 0 rows |
| 11 | client DELETE expediente de master | 0 filas (USING filtra) | ✅ 0 rows |
| 12 | client DELETE de alerta (DELETE = manager+) | 0 filas | ✅ 0 rows |
| 13 | client UPDATE alerta `leida=true` (cualquier authed) | 1 fila | ✅ 1 row |
| 14 | master DELETE expediente propio | 1 fila | ✅ 1 row |
| 15 | client SELECT expedientes (SELECT abierto) | OK | ✅ OK |

Comportamiento detectado y verificado:

- **`with check` violation → SQLSTATE 42501**: confirmado, "permission denied" en lugar de "check constraint violation". Esto es importante porque el FE debe traducirlo a un error de permisos, no a un error de validación de datos.
- **`USING` filtra silenciosamente**: el UPDATE/DELETE devuelve `0 rows affected`, sin error. Toca confirmar con el equipo FE que su capa de mutación trate `affected=0` como "no autorizado" (sonner toast diferente al 42501).
- **`with check` y `USING` se aplican ambos** en UPDATE: si el row existe y pasa USING (el rol es comercial-creador), el WITH CHECK también se evalúa contra los nuevos valores — no se puede cambiar `created_by` para regalárselo a otro.

## 3) ⚠️ Observación crítica antes de aplicar en prod

El draft asume que **los comerciales reales tienen `role IN ('manager','admin','master')`** o que el patrón self-creator (created_by = auth.uid()) cubre el 100% de sus flujos.

Estado actual `user_profiles`:

| role | count |
|---|---|
| master | 1 |
| client | 2 (ambos `approved=false`) |

Cuando Fase 2 importe los comerciales reales de Potencias, sus `user_profiles` deben crearse con `role IN ('manager','comercial')`. **Si entran como `client`, perderán capacidad de inserción** en `alertas`, `comercializadora_docs`, `excel_import_templates`, `savings_calculations` (todas requieren `is_manager_or_above()` para INSERT).

**Acción para Juan antes de aplicar el hardening**:

1. Decidir el rol nominal de los comerciales — `manager` (acceso amplio) o `comercial` (acceso reducido).
2. Si la respuesta es `comercial`: actualizar `is_manager_or_above()` para incluirlo, o ajustar policies para permitir `created_by = auth.uid()` también en `comercializadora_docs`/`excel_import_templates`.
3. Verificar después de la importación de Fase 2:
   ```sql
   select role, count(*) from public.user_profiles group by role;
   ```
   y revisar que el equipo de Valere quede en una distribución como `master(1) + manager(N) + comercial(M) + client(externos)`.

## 4) Mejoras adicionales recomendadas (opcionales)

### 4.A — Mitigar `auth_rls_initplan` en el mismo go

El advisor `auth_rls_initplan` flagea 23 policies que evalúan `auth.uid()` por fila. Patron recomendado por Supabase: envolver en subquery para que PG lo memoize:

```sql
-- antes (lento por cada fila)
created_by = auth.uid()

-- después (memoize)
created_by = (select auth.uid())
```

El draft puede actualizarse en bloque:

```sql
-- En todas las policies expedientes/solicitudes_potencia/comunicaciones_cliente:
-- created_by = auth.uid()           →  created_by = (select auth.uid())
-- enviado_por = auth.uid()          →  enviado_por = (select auth.uid())
```

Es un cambio puramente sintáctico que mantiene la semántica y elimina 23 advisors WARN. Recomiendo aplicarlo en la misma migration.

### 4.B — Corolario: las policies CRM existentes (`actividades.a_read`, `contactos.co_read`, etc.) tienen el mismo patrón

Hay 23 policies con `auth_rls_initplan` — 19 son CRM, 4 son Potencias. Limpiarlas todas en una pasada en lugar de dejar la deuda creciendo. Migration adicional propuesta:

```sql
-- supabase/migrations/_draft_rls_initplan_optimization.sql
-- Reescribir policies que llaman auth.uid() directo a auth.uid() vía subquery.
-- 23 policies — listado completo en docs/SUPABASE_AUDITORIA_ADVISORS_2026-04-25.md
```

Esto es un sprint distinto al hardening. No bloquea Fase 5.

## 5) SQL final draft optimizado

Versión recomendada del hardening con `(select auth.uid())` y reordenado para que las policies de cada tabla sean contiguas:

```sql
-- supabase/migrations/_draft_rls_hardening_8_tables_v2.sql
-- Sustituye al draft actual. Idempotente (drop primero).

-- ───────── helper subquery de auth.uid() ─────────
-- (no requiere cambio en la función, solo en las policies)

-- ═══════════════════════════════════════════════════
-- expedientes
-- ═══════════════════════════════════════════════════
drop policy if exists expedientes_authenticated_all on public.expedientes;
drop policy if exists expedientes_select on public.expedientes;
drop policy if exists expedientes_insert on public.expedientes;
drop policy if exists expedientes_update on public.expedientes;
drop policy if exists expedientes_delete on public.expedientes;

create policy expedientes_select on public.expedientes
  for select to authenticated using (true);

create policy expedientes_insert on public.expedientes
  for insert to authenticated
  with check (created_by = (select auth.uid()) or public.is_manager_or_above());

create policy expedientes_update on public.expedientes
  for update to authenticated
  using      (created_by = (select auth.uid()) or public.is_manager_or_above())
  with check (created_by = (select auth.uid()) or public.is_manager_or_above());

create policy expedientes_delete on public.expedientes
  for delete to authenticated using (public.is_manager_or_above());

-- (igual patrón para ciclos, solicitudes_potencia, alertas, comunicaciones_cliente,
--  savings_calculations, comercializadora_docs, excel_import_templates)
-- Ver _draft_rls_hardening_8_tables.sql original — solo cambiar auth.uid() →
-- (select auth.uid()) en cada referencia.
```

## 6) Cómo aplicar en prod

```sql
-- (en una transacción única; idealmente desde un sprint dedicado, no junto a Fase 5)
begin;
-- pegar contenido completo del draft v2
commit;

-- Verificación post-aplicación
select schemaname, tablename, count(*)
from pg_policies
where schemaname='public'
  and tablename in ('expedientes','ciclos','solicitudes_potencia','alertas',
                    'comunicaciones_cliente','savings_calculations',
                    'comercializadora_docs','excel_import_templates')
group by 1,2 order by 1,2;
-- → cada tabla debe tener 2-4 policies (select+insert+update+delete o select+write).

-- Confirmar que ninguna policy write tiene USING(true)
select * from pg_policies
where schemaname='public'
  and qual='true'
  and cmd != 'SELECT';
-- → 0 filas (excepto policies de SELECT y `alertas_update_leida`, que es intencional).

-- Re-correr el escenario de tests del §2 → 15/15 verde.
```

## 7) Conclusión

El draft RLS hardening es funcionalmente correcto. Aplicarlo en prod requiere:

1. Confirmar el rol nominal de los comerciales tras Fase 2 (§3).
2. Idealmente, aplicar la versión v2 con `(select auth.uid())` para cerrar también los 4 advisors `auth_rls_initplan` afectados.
3. Tests post-aplicación reproduciendo el §2 con un usuario comercial real (ya no master/client).
