# Prompt de arranque — nueva sesión Cowork dedicada a integración Holded

> **Cómo usarlo**: abre una nueva ventana de Claude (Cowork mode) sin contexto previo. Pega el bloque entre `<<<INICIO>>>` y `<<<FIN>>>` como primer mensaje. La sesión arrancará leyendo el repo y ejecutará el sprint Fase 0 + Fase 1.

> **Por qué Cowork y no Claude Desktop**: Cowork tiene MCP de Supabase (DDL, deploy edge functions, vault), acceso al repo Valere CRM en `C:\Users\joliv\valere-v2`, y ejecución de PowerShell para commits. Desktop no.

---

## Bloque a copiar/pegar

```
<<<INICIO>>>

ROL: arquitecto + tech lead de la integración Holded ↔ Valere CRM. Trabajas en el repo C:\Users\joliv\valere-v2 sobre Supabase + React + TypeScript + Edge Functions Deno + Cloudflare Pages.

PROTOCOLO DE ARRANQUE - EJECUTA AHORA, EN ESTE ORDEN:

1. Lee CLAUDE.md completo. Ahí está la arquitectura, stack, convenciones, decisiones tomadas, sistema de agentes y bus de mensajes. Entiende todo antes de seguir.

2. Lee docs/ESTADO.md completo. Especialmente la cabecera con las últimas actualizaciones (signup aprobacion manual, Fase 2 unificación pendiente, Cloudflare Potencias rollback pendiente).

3. Lee docs/HOLDED_INFORME_BROWSER_2026-04-26.md. Es la fuente original — análisis del agente Browser sobre la cuenta Holded de Valere y propuesta inicial de integración.

4. Lee docs/PLAN_INTEGRACION_HOLDED.md. Es el plan adaptado al stack Valere por la sesión Cowork anterior. Contiene: arquitectura adaptada a Supabase + Edge Functions, mapeo de tablas, plan de fases 0-8, riesgos vs trabajos en curso, y decisiones que necesita Juan.

5. Lee .cowork/inbox/ (si hay archivos) — instrucciones de la sesión anterior para ti. Lee también los outbox recientes de Cowork (.cowork/outbox/2026-04-26T15-18-22-* y 2026-04-26T16-02-37-*) para entender el contexto del trabajo signup en curso.

6. Ejecuta git remote -v y git log --oneline -5 para confirmar que estás en main actualizado.

Tras leer todo, di una sola frase: "He leído el plan Holded. Estamos en: [resumen 2 líneas del estado]. Mi siguiente paso es: [siguiente acción concreta]."

OBJETIVO DE TU SPRINT:

Ejecutar Fase 0 (auditoría datos) + Fase 1 (infraestructura) del plan Holded. Punto. NADA más en este sprint.

PRIORIDAD #1 — SEGURIDAD:

Este proyecto trata datos personales (RGPD aplicable): NIFs, IBANs, datos energéticos, contratos. Lee docs/AUDIT_SEGURIDAD_2026-04-27.md ANTES de cualquier feature. Hallazgos críticos ya resueltos (C-02, C-05, M-08), pero hay pendientes que afectan tu trabajo:

- C-03 (nomenclatura roles inconsistente): si tu integración crea tablas con policies, usa SOLO los roles canónicos master/manager/consultant/client.
- C-04 (passwords Datadis plain pendiente): NO replicar el patrón de passwords en plano para Holded. La API key ya está en Edge Functions Secrets, NO la pongas en BBDD ni en repo.
- M-01/M-02 (MFA + network restrictions): pendientes de Juan, no bloqueantes para tu sprint.

Reglas de seguridad obligatorias para cualquier código/migration que escribas:
- Cada nueva tabla nace con RLS habilitado + 4 policies granulares (SELECT/INSERT/UPDATE/DELETE).
- Cada nueva tabla con PII: SELECT abierto authed, INSERT/UPDATE creador-o-manager+, DELETE manager+. Patrón usado en RLS hardening 2026-04-27.
- Cualquier campo sensible (passwords, tokens, IBAN, datos médicos): cifrado en BBDD con Supabase Vault. NUNCA plain text.
- integration_logs y holded_integration_logs: enmascarar IBAN/NIF parcialmente, NO loggear payloads completos con PII.
- Edge Functions con verify_jwt=true por defecto. Si una function valida internamente (ej. webhook), justificar en comentario.
- Service role key SOLO en Edge Functions Deno (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')). NUNCA en frontend.
- Functions SECURITY DEFINER: REVOKE EXECUTE FROM public/anon, GRANT solo a authenticated o roles específicos.
- Si propones almacenar credenciales de cliente (Datadis, Holded del cliente, etc.): cifrado obligatorio con Vault, NUNCA plain.

REGLAS CRÍTICAS DE PROYECTO:

1. NO TOQUES los siguientes trabajos en curso:
   - Sprint signup-aprobacion-manual (rama claude/signup-aprobacion-manual ya mergeada).
   - Edge Functions notify-admin-pending-user y notify-user-approval-decision.
   - Migration 20260426_signup_aprobacion_manual.sql.
   - Configuración Resend en Vault (no leas ni modifiques RESEND_API_KEY).
   - Trabajos pendientes Fase 2 unificación Potencias (archivos en scripts/unificacion_fase2_*).
   - Tab "Pendientes" del AdminPage.tsx.
2. Tu rama de trabajo: claude/holded-integration. Nunca commits a main directamente.
3. Antes de aplicar cualquier migration via MCP Supabase apply_migration, hazlo primero en dry-run (BEGIN ... ROLLBACK).
4. La API Key de Holded la mete Juan en Vault — tú nunca la pides ni la pegas en chat ni en código. Lee desde Edge Functions con vault.decrypted_secrets.
5. Convenciones de código del proyecto (CLAUDE.md): toasts con sonner, ConfirmDialog para destructivas, Skeleton para loading, español dominio + inglés técnico, TSC 0 errores antes de commit, 39+ tests pasando.
6. PowerShell 5.1 es el target real — si generas RUNBOOK.ps1 valida sintaxis sin paréntesis dentro de strings concatenados con +.
7. El sandbox bash NO puede escribir a .git/ ni borrar archivos en valere-v2 (mount Windows). Tú preparas, Juan ejecuta el commit/push final.

DECISIONES YA TOMADAS POR JUAN (NO LAS VUELVAS A PREGUNTAR — están en docs/PLAN_INTEGRACION_HOLDED.md sección 6):

1. Cuándo arrancar: HOY, post-Fase 2 unificación cerrada (ya cerrada 2026-04-27).
2. Sandbox: NO se asume sandbox separado. Estrategia: contacto test en producción llamado "TEST_VALERE_NOSINCRONIZAR" excluido explícitamente. Tabla holded_config debe tener excluded_nifs text[] con ese valor.
3. Productos sync: empezar pull-only (Holded→CRM). Tabla holded_config debe tener productos_sync_mode text default 'read' check ('read','bidirectional'). Toggle activable después desde panel admin.
4. Fase 7 (Proyectos): postergar. Hacer Fases 0-6 primero. Fase 7 opcional tras facturación operativa.
5. Plazo: cadencia normal 1 fase/semana.
6. API key Holded: ya generada como "Valere CRM Integration", guardada en Supabase Edge Functions Secrets como HOLDED_API_KEY. Verifica con SQL en gtphkowfcuiqbvfkwjxb: SELECT name FROM vault.decrypted_secrets WHERE name='HOLDED_API_KEY' (puede que esté en supabase_functions secrets en lugar de vault — confirma con Juan dónde está).

PRE-REQUISITOS A VALIDAR ANTES DE EMPEZAR FASE 0:

- ✅ Fase 2 unificación cerrada (verificado 2026-04-27, 526 filas migradas, 0 huérfanos).
- ✅ RLS hardening 8 tablas Potencias-side aplicado (post-Fase 2).
- ⏳ Confirma que HOLDED_API_KEY existe en secrets de Supabase Edge Functions. Si no aparece, pregunta a Juan dónde la metió (puede ser Vault o Edge Functions Secrets — patrón Resend fue Edge Functions Secrets).

ENTREGABLES DE ESTE SPRINT:

Fase 0 - Auditoría datos:
- supabase/migrations/<fecha>_holded_data_audit.sql con función valida_nif_cif() + queries de auditoría.
- docs/AUDIT_DATOS_VALERE_PRE_HOLDED_<fecha>.md con reporte ejecutivo (% NIFs válidos, direcciones desglosadas vs concatenadas, duplicados detectados).
- Si hay datos sucios: migration de limpieza con dry-run primero.

Fase 1 - Infraestructura:
- supabase/migrations/<fecha>_holded_infrastructure.sql con:
  * 3 columnas holded_id, holded_etag, holded_synced_at en tablas dominio.
  * Tablas holded_config, holded_sync_queue, holded_integration_logs, holded_conflicts, holded_sync_state.
  * Vault.create_secret('HOLDED_API_KEY', '...') si Juan ya pasó la key (la pasa por dashboard o CLI, NO por chat).
  * pg_cron jobs holded_worker_5min y holded_pull_catalogs_daily.
- supabase/functions/_shared/holded-client.ts (Deno).
- supabase/functions/holded-worker/index.ts (consume sync_queue).
- supabase/functions/notify-integration-error/index.ts (Resend, mismo patrón que notify-admin-pending-user).
- src/features/admin/AdminPage.tsx: añadir tab "Holded" con UI mínima (estado, contadores, botón Pull manual catálogos).
- Tests Vitest para mappers + helpers SQL.
- TSC 0 errores, 39+/39 tests pasando.

AL CIERRE:

1. Actualiza docs/ESTADO.md con la sección "Sprint Holded Fase 0+1".
2. Crea docs/SESIONES/<fecha>-holded-fase0-fase1.md con resumen.
3. Crea .cowork/outbox/<timestamp>-holded-fase01-handoff.md con instrucciones para próxima sesión (Fase 2 catálogos).
4. Crea RUNBOOK_HOLDED_FASE01.ps1 idempotente (sin antipatrones PS5.1) para Juan ejecute commit + push + PR.
5. NO mergees el PR. NO ejecutes migrations en producción sin validar dry-run y consultar a Juan.

CONTEXTO ADICIONAL CRUCIAL:

- Empresa cliente: VALERE CONSULTORES ASOCIADOS SL, CIF B10759520.
- Holded tiene módulos activos: Contactos, Ventas, Compras, CRM (Embudo "Embudo 1"), RRHH, Inventario, Proyectos, Tesorería, Contabilidad. Volumen: varios miles de contactos.
- Cuenta Holded plan estándar (no enterprise). Confirmar si tiene sandbox separado.
- API key dedicada que Juan generará: nombre "Valere CRM Integration", scope completo (Sending + Pulling).

RECURSOS:

- API docs Holded: https://developers.holded.com
- MCP Supabase disponible para apply_migration, deploy_edge_function, execute_sql, list_tables, etc.
- Vault para secrets: SELECT vault.create_secret('HOLDED_API_KEY', '...') (DDL via apply_migration o execute_sql con privilegios).
- Resend para notificaciones de error: misma cuenta que ya usa el CRM. Reutiliza FROM_ADDRESS Valere CRM <noreply@valereconsultores.com>.

ARRANCA AHORA con el protocolo de arranque (paso 1-6) y luego confirma estado y siguiente acción.

<<<FIN>>>
```

---

## Notas operativas para Juan

### Cuándo lanzar este prompt

**NO ahora mismo.** Espera a:

1. ✅ Smoke test del signup completado y pasado (en curso).
2. ✅ Fase 2 unificación Potencias ejecutada (60 min con backups vía pg_dump+psql).
3. ✅ Cloudflare Potencias rollback URL aplicado (5 min).
4. ✅ Tomar las 7 decisiones de `docs/PLAN_INTEGRACION_HOLDED.md` sección 6.
5. ✅ Generar API Key Holded "Valere CRM Integration" (Configuración → Desarrolladores en Holded).

Cuando tengas todo eso, lanza la nueva sesión Cowork con el bloque de arriba.

### Cómo pasarle a la nueva sesión la API Key Holded

**Opción A (recomendada)**: tú lo metes en Vault directamente vía Supabase Dashboard:

1. Dashboard Supabase → Project Settings → Vault.
2. Add new secret. Name: `HOLDED_API_KEY`. Value: <pega la key>.
3. Save.

**Opción B**: vía SQL Editor (más rápido):

```sql
SELECT vault.create_secret('PEGAR_LA_KEY_AQUI', 'HOLDED_API_KEY');
```

(orden: valor primero, nombre segundo).

**Opción C**: pasarla a la nueva sesión Cowork por chat — esa sesión la mete via MCP. Misma seguridad que la rotación Resend (queda en chat, mejor rotar después).

### Coordinación con esta sesión

La nueva sesión arranca **fresca** sin contexto. Toda la coordinación va vía:
- `.cowork/outbox/` (mensajes que la sesión Holded deja para esta).
- `.cowork/inbox/` (mensajes que tú pones aquí para la sesión Holded).

Si la sesión Holded necesita hacer algo que afecta a tablas tocadas por esta sesión (ej. añadir columna a `user_profiles`), debe avisarte primero y tú me consultas a mí.

### Si abres en paralelo

Puedes tener **2 sesiones Cowork abiertas a la vez** (una para signup/auth/Holded coordinación, otra para ejecutar Fase 0+1 Holded). Bus de mensajes evita pisarse. Si Juan se confunde de ventana, peor — recomendable trabajar en una y dejar la otra "en stand-by" mientras revisas output.
