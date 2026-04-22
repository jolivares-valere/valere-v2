# Auditoría backend — resultado

> De: Claude Cowork · Para: Claude Code
> Fecha: 2026-04-19 tarde
> Ejecutada en: Supabase SQL Editor · proyecto gtphkowfcuiqbvfkwjxb

## Resumen
- P0: 2 issues críticos
- P1: 3 issues
- P2: 2 issues

---

## Hallazgos

### P0 — Seguridad

#### P0.1 — Bucket Storage `documentos` NO EXISTE
- **Dónde:** Supabase Storage
- **Evidencia:** `SELECT * FROM storage.buckets` → 0 rows
- **Impacto:** Todo el flujo de upload/download de documentos (DocumentosTab, FASE 24) falla silenciosamente. El código asume que el bucket existe. `createSignedUrl` lanzará error 404.
- **Fix:** Crear manualmente en Supabase Dashboard → Storage → New bucket → nombre: `documentos`, public: false, file size limit: 52428800 (50 MB). Luego añadir policy:
```sql
-- Permitir a usuarios autenticados leer/escribir sus propios documentos
CREATE POLICY "documentos_authenticated" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'documentos' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'documentos' AND auth.role() = 'authenticated');
```
- **Estado:** PENDIENTE (requiere Dashboard, no SQL Editor)

#### P0.2 — Tablas `incidencias` y `renovaciones` con RLS roles={public}
- **Dónde:** pg_policies para incidencias y renovaciones
- **Evidencia:**
  - incidencias policy: `roles={public}`, qual=`(auth.role() = 'authenticated')`
  - renovaciones policy: `roles={public}`, qual=`(auth.role() = 'authenticated')`
- **Impacto:** `roles={public}` incluye usuarios anónimos. La policy usa `auth.role() = 'authenticated'` como guardia, lo que sí filtra autenticados; pero el patrón correcto es `roles={authenticated}` para consistencia y porque si auth.role() lógica cambia en Supabase, la barrera desaparece.
- **Fix propuesto (no aplicar aún — envíame ACK para confirmar):**
```sql
-- Reemplazar policies de incidencias y renovaciones con roles correctos
DROP POLICY IF EXISTS "incidencias_all_authenticated" ON public.incidencias;
CREATE POLICY "incidencias_all_authenticated" ON public.incidencias
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "renovaciones_all_authenticated" ON public.renovaciones;
CREATE POLICY "renovaciones_all_authenticated" ON public.renovaciones
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

---

### P1 — Integridad y consistencia

#### P1.1 — Triggers `updated_at` faltan en 10 tablas
- **Dónde:** Tablas con columna `updated_at` pero sin trigger BEFORE UPDATE
- **Evidencia:** Query sobre pg_trigger + pg_attribute → solo `incidencias` y `renovaciones` tienen trigger. Faltan:
  - contactos, contratos, custom_fields_values, documentos, empresas, eventos, global_config, oportunidades, propuestas, user_profiles
- **Impacto:** `updated_at` no se actualiza automáticamente. Las consultas que filtran por `updated_at` o los clientes que leen `updated_at` para sincronización verán valores obsoletos.
- **Fix propuesto (Claude Code puede aplicar — es idempotente):**
```sql
-- Aplicar trigger set_updated_at a tablas que lo necesitan
-- La función set_updated_at() ya existe (verificado en pg_proc)
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'contactos','contratos','custom_fields_values','documentos',
    'empresas','eventos','global_config','oportunidades','propuestas','user_profiles'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON public.%I; ' ||
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I ' ||
      'FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END;
$$;
```

#### P1.2 — Índices faltantes en eventos y notificaciones
- **Dónde:** tablas `eventos` y `notificaciones`
- **Evidencia:** índices actuales en eventos: solo `eventos_pkey`, `idx_eventos_fecha`, `idx_eventos_usuario`. Falta índice compuesto en `(entidad_tipo, entidad_id)`. Notificaciones: solo `notificaciones_pkey`, sin índice en `(usuario_id, leida, created_at)`.
- **Impacto:** Timeline de eventos y badge de notificaciones harán Seq Scan conforme crezcan los datos.
- **Fix propuesto:**
```sql
CREATE INDEX IF NOT EXISTS idx_eventos_entidad ON public.eventos(entidad_tipo, entidad_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_user_leida ON public.notificaciones(usuario_id, leida, created_at DESC);
```

#### P1.3 — cups.contrato_id con policy cu_all puede silenciar filas migradas
- **Dónde:** cups RLS policy `cu_all`
- **Evidencia:** qual= `(EXISTS (SELECT 1 FROM contratos c WHERE c.id = cups.contrato_id AND (...)))`
- **Impacto:** El CUPS migrado tiene `contrato_id IS NULL` (verificado: 1 fila con contrato_id NULL). El EXISTS falla para NULL → el CUPS queda invisible para todos los usuarios salvo postgres. Dato de datos: cups.contrato_id = NULL → policy cu_all → EXISTS = false → CUPS no visible.
- **Fix propuesto:**
```sql
-- Ajustar policy cups para permitir filas sin contrato (contrato_id IS NULL)
DROP POLICY IF EXISTS cu_all ON public.cups;
CREATE POLICY cu_all ON public.cups
  FOR ALL TO authenticated
  USING (
    cups.contrato_id IS NULL
    OR EXISTS (
      SELECT 1 FROM contratos c
      WHERE c.id = cups.contrato_id
        AND (
          get_user_rol() = ANY (ARRAY['admin','jefe_equipo','visor'])
          OR c.comercial_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    get_user_rol() = ANY (ARRAY['admin','jefe_equipo','comercial'])
  );
```

---

### P2 — Performance y deuda

#### P2.1 — EXPLAIN ANALYZE empresas (RLS permisivo actual)
- **Resultado:** Execution Time: 0.761 ms · INDEX SCAN using idx_empresas_active · cost 2.37
- **Evaluación:** EXCELENTE. El índice funcional idx_empresas_active (deleted_at) está siendo usado. Con solo 2 filas en producción, el coste es trivial.
- **Con FASE 20.9 RLS granular (filtro comercial_id = auth.uid()):** El índice idx_empresas_comercial ya existe. No se espera degradación significativa. Sin necesidad de SECURITY DEFINER view por ahora.

#### P2.2 — Tablas legacy clients y supply_points
- **Evidencia SQL:** clients tiene 4 policies activas (read/insert/update/delete) con qual=true (permisivo total).
- **Sobre uso en código:** No ejecuté grep desde Cowork (sin acceso CLI). Claude Code debe confirmar que ningún import en src/ referencia 'clients' o 'supply_points' como tabla Supabase.
- **Propuesta de DROP (NO ejecutar hasta confirmación de Claude Code):**
```sql
-- Solo ejecutar DESPUÉS de confirmación de Claude Code
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.supply_points CASCADE;
```

---

## Estado de RLS por tabla (resumen completo)

| Tabla | RLS | Policies | Tipo | Tenant-filtered |
|-------|-----|----------|------|-----------------|
| actividades | true | 2 | a_read/a_write | SI (usuario_id/asignado_a + rol) |
| boe_regulated_prices | true | 2 | ALL+SELECT | NO (true) - config global OK |
| clients | true | 4 | CRUD separado | NO (true) - legacy, DROP pendiente |
| contactos | true | 2 | co_read/co_write | Revision necesaria |
| contratos | true | 4 | CRUD separado | SI (comercial_id = auth.uid()) |
| cups | true | 1 | cu_all | SI pero BUG con contrato_id NULL (ver P1.3) |
| custom_fields_schema | true | 2 | admin+read | SI (admin only write) |
| custom_fields_values | true | 1 | all | Revision necesaria |
| documentos | true | 3 | CRUD | SI (verificar) |
| empresas | true | 4 | CRUD separado | SI (comercial_id = auth.uid()) |
| eventos | true | 2 | read+write | SI (usuario_id) |
| facturas | true | 4 | CRUD separado | NO (true) - herencia de invoice_history |
| global_config | true | 2 | ALL+SELECT | NO (true) - config global OK |
| incidencias | true | 1 | ALL | roles=public BUG (ver P0.2) |
| notificaciones | true | 1 | n_own | SI (usuario_id = auth.uid()) |
| oportunidades | true | 2 | read+write | SI (comercial_id = auth.uid()) |
| proposals | true | 4 | CRUD separado | NO (true) - Calculadora legacy |
| propuestas | true | 1 | Revision | Revision necesaria |
| renovaciones | true | 1 | ALL | roles=public BUG (ver P0.2) |
| retailer_offers | true | 4 | CRUD separado | NO (true) - config global OK |

## SECURITY DEFINER functions (auditadas)

| Función | SECURITY DEFINER | Seguridad |
|---------|-----------------|-----------|
| get_user_rol() | SI | SEGURA — lee user_profiles filtrando por auth.uid() internamente |
| handle_new_user() | SI | SEGURA — trigger de creación de perfil en auth.users |
| set_updated_at() | NO | OK |
| get_resumen_vencimientos() | NO | OK |

## Orphan data check
- contactos sin empresa: 0
- contratos sin empresa: 0
- oportunidades sin empresa: 0
- documentos: 0 filas (sin datos aún)
- eventos: 0 filas (sin datos aún — FASE 27 recién creada)
- cups con contrato_id NULL: 1 (el CUPS migrado de supply_points)

---

## Acciones recomendadas a Claude Code
- [ ] Confirmar con grep que 'clients' y 'supply_points' no son referenciados en src/ (feat/core) para aprobar DROP
- [ ] Aplicar triggers updated_at (SQL en P1.1 — es idempotente y seguro)
- [ ] Aplicar índices faltantes (SQL en P1.2 — CREATE INDEX IF NOT EXISTS)
- [ ] Fix policy cups (SQL en P1.3) — CRÍTICO para CUPS migrado sea visible

## Acciones que Cowork puede ejecutar solo (con tu ACK previo)
- [ ] Fix policies incidencias+renovaciones (P0.2) — envíame ACK y lo aplico
- [ ] Aplicar SQL triggers updated_at (P1.1) — puedo aplicar en SQL Editor

## Acciones que requieren Dashboard (tú)
- [ ] Crear bucket Storage documentos (P0.1) — no se puede desde SQL Editor
