# Sesión 2026-04-26 (tarde) — Signup público + aprobación manual + Resend

**Agente:** Cowork
**Duración estimada:** ~2h
**Branch:** `claude/signup-aprobacion-manual` (a crear desde PowerShell)

## Contexto

Juan pidió eliminar la dependencia de las invitaciones de email de Supabase (rate-limit saturado el 25-04, además de coste implícito). Decisión: alta pública en `/signup` + aprobación manual desde admin + email transaccional via Resend.

## Decisiones cerradas con Juan

| Tema | Decisión |
|---|---|
| Quien aprueba | Solo Juan (master único) |
| Datos formulario | email + password + nombre + apellido |
| Dominio email | sin restricción |
| Provider email | Resend (plan Free, 100/día, 3000/mes) |
| Dominio envío | `valereconsultores.com` (verified, dominio único del plan Free) |
| `From` address | `Valere CRM <noreply@valereconsultores.com>` |
| `To` admin | `jolivares@valereconsultores.com` |
| Email al usuario | Sí, al aprobar y al rechazar |
| Auto-rechazo | Sí, tras 7 días (cron 03:00 UTC) |
| Migración futura `valere.es` | Pospuesta — `valere.es` requiere DNS en Arsys (`dns45/46.servidoresdns.net`). `valereconsultores.com` ya verificado, no hay urgencia. |

## Trabajo realizado

### Backend (aplicado en prod via MCP)

1. **Migration `signup_aprobacion_manual_2026_04_26`** aplicada:
   - `handle_new_user()` reescrito: captura `nombre`/`apellidos` del `raw_user_meta_data`, marca `status='pendiente'` y `approved=false` para todos excepto el master hardcoded.
   - `is_approved()` helper para RLS futuras.
   - `admin_reject_user(uuid)` — borra de `auth.users` (cascade a `user_profiles`). Solo callable por master (validación interna).
   - `cleanup_pending_users_older_than_7_days()` idempotente.
   - `pg_cron` extension instalada.
   - Cron `cleanup_pending_users_daily` schedule `0 3 * * *` ACTIVE.

2. **Edge Function `notify-admin-pending-user`** v1 desplegada (verify_jwt=true).
3. **Edge Function `notify-user-approval-decision`** v1 desplegada (verify_jwt=true).

Ambas funcionan con `RESEND_API_KEY` secret pendiente de configurar (Juan).

### Frontend

1. `src/features/auth/SignupPage.tsx` — formulario público con zod validation, llama a `supabase.auth.signUp({options:{data:{nombre, apellidos, full_name}}})` + invoca `notify-admin-pending-user` best-effort.
2. `src/features/auth/PendingApprovalPage.tsx` — landing para usuarios con session pero `approved=false`. Botón logout.
3. `src/App.tsx` — añadidas rutas `/signup` (pública) y `/pending-approval` (con session, sin AuthGuard estricto). `AuthGuard` ahora redirige a `/pending-approval` si `profileLoaded && user.approved !== true`. `LoginRoute` idem.
4. `src/features/auth/LoginPage.tsx` — añadido link "Solicitar acceso" → `/signup`.
5. `src/features/admin/AdminPage.tsx`:
   - Nuevo `TabsTrigger value="pendientes"` con icono `UserPlus`.
   - Componente `PendientesTab` con tabla (nombre, email, fecha solicitud, selector rol, botones Aprobar/Rechazar).
   - Aprobar: `update user_profiles set approved=true, status='active', role=X` + invoke `notify-user-approval-decision` con `decision='approved'`.
   - Rechazar: `ConfirmDialog` → `rpc('admin_reject_user', {p_user_id})` + invoke con `decision='rejected'` (capturando email/nombre antes para fallback ya que el user es borrado).

### Limitaciones aceptadas

- Defensa por `approved` solo en frontend (AuthGuard). RLS DB-side no se ha endurecido para no añadir riesgo en este sprint. La función helper `is_approved()` está creada para futuras policies. Aceptable mientras las altas son lentas y manuales.
- API key Resend pasó por chat — recomendado rotar tras smoke test.
- `status` no es enum — aceptable.

## Pendiente Juan (PowerShell)

Detalle completo en `.cowork/outbox/2026-04-26T15-18-22-signup-aprobacion-manual-handoff.md`. Resumen:

1. Configurar `RESEND_API_KEY` secret (dashboard o CLI).
2. Smoke test: signup con email personal → /pending-approval → email a admin → aprobar → email a usuario → login OK.
3. `npx tsc --noEmit` + `npm test -- --run` + `npm run build` (sandbox no fiable por mount Windows desincronizado).
4. `git checkout -b claude/signup-aprobacion-manual` + commit + push.
5. PR a main.
6. Rotar API key Resend.

## Notas técnicas para próxima sesión

- **Sandbox bash no fiable para verificar archivos del repo**: el mount Linux ve archivos truncados que en Windows están completos. Verificar siempre con `Read` tool, no con `wc -l` o `cat`.
- **Edge Functions con strict Deno**: el operador mixto `?? || ` requiere paréntesis explícitos. El primer deploy falló por esto; el segundo aplicó la corrección.
- **`cleanup_pending_users_daily` cron**: corre todos los días a las 03:00 UTC (05:00 Madrid en verano, 04:00 en invierno). Cambiar con `cron.alter_job` si conviene otra hora.
- **El email del admin se hardcoded** en la Edge Function como default si no hay `ADMIN_EMAIL` secret. Para añadir más admins en el futuro: o (a) cambiar a array y refactor, o (b) crear regla forwarding en Google Workspace de `admin-crm@valereconsultores.com` a varios buzones y usarlo como `ADMIN_EMAIL`.
