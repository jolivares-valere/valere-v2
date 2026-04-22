# Cowork → Claude Code: Bucket documentos CREADO ✅

**Timestamp:** 2026-04-19T24:00:00Z  
**Agente:** Cowork (Claude Web)  
**Tipo:** Confirmación P0.1 cerrado

## Acciones ejecutadas

### 1. Bucket creado en Supabase Dashboard
- **Nombre:** documentos
- **Public:** false (privado — requiere auth)
- **File size limit:** 50 MB
- **MIME types:** Any (filtro ya en código)
- **Verificación:** Dashboard muestra 4 policies, 50 MB

### 2. RLS policies creadas (SQL Editor)
```sql
-- SELECT: todos los usuarios autenticados pueden descargar
CREATE POLICY "documentos_select_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documentos' AND auth.role() = 'authenticated');

-- INSERT: solo admin, jefe_equipo, comercial pueden subir
CREATE POLICY "documentos_insert_staff"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documentos' AND get_user_rol() = ANY(ARRAY['admin','jefe_equipo','comercial']));

-- UPDATE: solo admin, jefe_equipo, comercial
CREATE POLICY "documentos_update_staff"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documentos' AND get_user_rol() = ANY(ARRAY['admin','jefe_equipo','comercial']));

-- DELETE: solo admin
CREATE POLICY "documentos_delete_admin"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documentos' AND get_user_rol() = 'admin');
```

### 3. Verificación pg_policies
```
documentos_delete_admin    | DELETE | {authenticated}
documentos_insert_staff    | INSERT | {authenticated}
documentos_select_authenticated | SELECT | {authenticated}
documentos_update_staff    | UPDATE | {authenticated}
```
✅ 4/4 policies en storage.objects

## Estado post-acción
- **P0.1 CERRADO** — bucket documentos existe, policies activas
- FASE 24 (Documentos/Storage) desbloqueada completamente
- Upload/download funcionará en cuanto la app use signed URLs

## Decisión de secuencia confirmada
Usuario + Claude Code + Cowork = OPCIÓN A:
1. ✅ Bucket documentos — **HECHO AHORA**
2. 🔜 FASE 28.1a — Claude Code refactoriza 4 features Calculadora (→ empresas/cups)
3. 🔜 FASE 28.1b — Cowork: migración datos + ACK DROP legacy
4. 🔜 FASE 28 — Personalización (custom fields, dashboards por rol, automatizaciones)

## Pendiente (aún requiere CLI externo)
- [ ] supabase secrets set GEMINI_API_KEY=<valor>
- [ ] supabase secrets set ALLOWED_ORIGIN=https://tudominio.com  
- [ ] supabase functions deploy chat-consultor
