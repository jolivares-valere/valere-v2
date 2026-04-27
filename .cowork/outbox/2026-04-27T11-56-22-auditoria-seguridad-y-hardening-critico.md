# Handoff — Auditoría seguridad + hardening crítico aplicado

**Fecha:** 2026-04-27 13:56 (hora local) / 11:56 UTC
**Agente:** Cowork
**Para:** Juan + próxima sesión (Cowork Holded o Code CLI)
**Contexto:** Juan pidió revisión de seguridad antes de seguir con Holded. CRM gestiona PII clientes (RGPD aplicable).

---

## Documentos generados

1. **`docs/AUDIT_SEGURIDAD_2026-04-27.md`** — informe completo: 5 hallazgos críticos, 8 medios, 11 puntos buenos, plan priorizado.
2. **`memory/project_valere_security_priority.md`** — regla persistente para sesiones futuras (siempre revisar seguridad antes de feature, RGPD prioridad).
3. Este outbox.

## Acciones aplicadas en prod (via apply_migration)

### `security_hardening_critical_v2_2026_04_27`

- **C-02**: `incidencias` y `renovaciones` ya no tienen policy USING(true) FOR ALL. Ahora 4 policies granulares cada una.
  - incidencias: SELECT abierto authed; INSERT creador-o-manager+; UPDATE creador-o-asignado-o-manager+; DELETE manager+.
  - renovaciones: SELECT abierto authed; INSERT asignado-o-manager+; UPDATE asignado-o-manager+-o-comercial-de-la-empresa; DELETE manager+.
- **C-05**: `documentos` y `eventos` policies ya con `to authenticated` (antes `{public}`). Defensa en profundidad. Sin cambio funcional.
- **M-08**: REVOKE EXECUTE de funciones SECURITY DEFINER (handle_new_user, get_user_rol, is_approved, is_manager_or_above, admin_reject_user, cleanup_pending_users) FROM public/anon. GRANT explícito solo a authenticated en las que el frontend sí necesita.

### Verificación post-aplicación

```sql
-- 0 USING(true) en write para incidencias/renovaciones/documentos/eventos
-- (excepción intencional: alertas_update_leida, decisión Juan 2026-04-27)
SELECT tablename, COUNT(*) policies, COUNT(*) FILTER (WHERE qual='true' AND cmd!='SELECT') using_true_write
FROM pg_policies WHERE schemaname='public'
  AND tablename IN ('incidencias','renovaciones','documentos','eventos')
GROUP BY tablename;
-- Resultado: las 4 con 4 policies cada una, 0 USING(true) write.
```

## Pendiente Juan (NO arrancar Holded hasta hacer estos 2)

### C-01 — Rotar passwords DB Supabase (5 min)

Pasar el prompt al agente Browser (ver chat principal Cowork). Reseteará passwords de los 2 proyectos Supabase. Después actualizar variables permanentes de PowerShell:

```powershell
[Environment]::SetEnvironmentVariable('VALERE_CRM_DB_PASSWORD', 'NUEVO_VALOR', 'User')
[Environment]::SetEnvironmentVariable('VALERE_POTENCIAS_DB_PASSWORD', 'NUEVO_VALOR', 'User')
```

### M-06 — Toggle Leaked Password Protection (1 min)

Pasar el prompt al agente Browser para que lo busque (la UI de Supabase puede haber cambiado de ubicación). Activar el check contra HaveIBeenPwned para signups.

## Pendiente sprint dedicado (esta semana)

- **C-03**: decisión Juan + migration unificar nomenclatura roles (master/manager/consultant/client vs admin/jefe_equipo/comercial/visor).
- **C-04**: forzar encriptación passwords Datadis con Vault (sprint ~2h).
- **M-01**: MFA obligatorio en cuenta Supabase (Juan).
- **M-02**: Network restrictions Supabase (Juan + análisis IPs).

## Pendiente sprint próximo

- **M-03**: audit log de operaciones sensibles (cambios rol, exports, borrados PII).
- **M-04**: retención logs >7d (decisión upgrade Pro o export propio a R2).
- **M-05**: backup offsite cifrado a Cloudflare R2.
- Política RGPD formal (registro tratamientos, derechos ARSULIPO, plan incident response) ANTES de Holded.

## Para próxima sesión Cowork (Holded u otra)

- Lee `docs/AUDIT_SEGURIDAD_2026-04-27.md` antes de tocar nada.
- Memoria persistente actualizada: prioridad seguridad ALTA en este proyecto.
- Prompt Holded actualizado en `docs/COWORK_PROMPT_HOLDED_INTEGRATION.md` con sección "PRIORIDAD #1 — SEGURIDAD" + reglas obligatorias (RLS granular, no plain passwords, encriptación Vault, etc.).

## Estado de la API key Holded

- ✅ Generada en Holded como "Valere CRM Integration" (32 chars).
- ✅ Guardada como `HOLDED_API_KEY` en Supabase Edge Functions Secrets del proyecto CRM (`gtphkowfcuiqbvfkwjxb`).
- ✅ Digest verificado: termina en `...728993b0ecb498c...`.
- Lista para usar desde Edge Function Deno con `Deno.env.get('HOLDED_API_KEY')`.

## Quick reference

- Informe seguridad: `docs/AUDIT_SEGURIDAD_2026-04-27.md`
- Plan Holded adaptado: `docs/PLAN_INTEGRACION_HOLDED.md`
- Prompt arranque sesión Holded: `docs/COWORK_PROMPT_HOLDED_INTEGRATION.md`
- Memoria proyecto seguridad: `memory/project_valere_security_priority.md`
