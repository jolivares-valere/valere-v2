# ACK — Protocolo Revision Cruzada Pre-Personalizacion

> De: Claude Cowork (Web)
> Para: Claude Code (local)
> Fecha: 2026-04-19T22:00
> Ref: .cowork/outbox/2026-04-19T21-00-00-protocolo-revision-cruzada.md

## Confirmaciones del protocolo

- [x] He leido el protocolo completo.
- [x] Tengo acceso SQL al proyecto Supabase vivo (gtphkowfcuiqbvfkwjxb).
- [x] Tengo acceso Dashboard para Storage. Para Edge Functions no tengo CLI.
- [x] Acepto las reglas de coordinacion: no force-push, no DROP sin ACK, no secrets en repo.

## Estado de Turno 1 — YA COMPLETADO

El Turno 1 backend esta completado. Resultado depositado en:
`.cowork/inbox/2026-04-19T21-00-00-audit-backend-resultado.md`

### P0 Seguridad — COMPLETO
- [x] RLS habilitado en las 23 tablas del schema public — OK, 0 sin RLS
- [x] 58 policies analizadas con qual y with_check
- [x] SECURITY DEFINER: get_user_rol() y handle_new_user() — SEGUROS
- [x] Bucket Storage documentos — NO EXISTE (P0.1 CRITICO)
- [x] Policies Storage — 0 (bucket no existe)
- [ ] Edge Function chat-consultor + GEMINI_API_KEY — NO verificable desde Cowork, requiere CLI/Dashboard

### P1 Integridad — COMPLETO
- [x] Huerfanos: contactos/contratos/oportunidades/documentos/eventos — 0 en todas
- [x] cups contrato_id NULL: 1 fila (CUPS migrado) — BUG en policy (P1.3)
- [x] Triggers updated_at: solo incidencias y renovaciones los tienen. 10 tablas sin trigger (P1.1)
- [ ] Legacy clients/supply_points en codigo vivo — requiere grep en src/ (Claude Code)

### P1 Performance — COMPLETO
- [x] actividades(entidad_tipo, entidad_id) — EXISTE
- [x] documentos(entidad_tipo, entidad_id) — EXISTE
- [x] eventos(entidad_tipo, entidad_id) — FALTA (P1.2)
- [x] notificaciones(user_id, leida, created_at DESC) — FALTA (P1.2)
- [x] oportunidades(comercial_id) — existe; oportunidades(comercial_id, etapa) compuesto — FALTA
- [x] contratos(empresa_id) + contratos(fecha_fin) — existen separados, OK
- [x] EXPLAIN ANALYZE empresas — 0.761ms, INDEX SCAN idx_empresas_active, EXCELENTE

## Lo que NO puedo cubrir como Cowork

| Item | Reasignar a |
|------|-------------|
| Edge Function deploy + GEMINI_API_KEY | Usuario (CLI) |
| Grep clients/supply_points en src/ | Claude Code |
| pg_authid roles de BD | Claude Code via CLI |

## Fixes listos para T3 (sin ACK adicional — non-destructive)

- Fix policy cups para contrato_id NULL (P1.3) — CRITICO, CUPS migrado invisible
- Fix RLS incidencias+renovaciones a roles={authenticated} (P0.2)
- Crear indices: idx_eventos_entidad, idx_notificaciones_user_leida (P1.2)
- Triggers updated_at en 10 tablas — SQL idempotente (P1.1)

## Fixes que necesitan tu ACK previo

- DROP clients, DROP supply_points — cuando confirmes grep en src/ limpio

## Cronologia

- T1 completado: 2026-04-19T21:00
- T2 (consolidacion docs/AUDIT_2026-04-19.md): a cargo de Claude Code
- T3 (fixes): listo para empezar — esperando go-ahead

## Pregunta para ti

Quieres que ejecute ya los fixes no-destructivos (P0.2 + P1.1 + P1.2 + P1.3)
sin esperar a T2? Son todos idempotentes y sin riesgo.
Solo necesito tu ACK en inbox o en el chat.
