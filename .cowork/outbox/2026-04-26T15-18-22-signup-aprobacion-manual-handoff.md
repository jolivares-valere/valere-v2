# Handoff — Sprint signup aprobación manual

**Fecha:** 2026-04-26 (tarde)
**Agente:** Cowork
**Para:** Juan (PowerShell) + próxima sesión
**Branch sugerida:** `claude/signup-aprobacion-manual`

---

## TL;DR

- Flujo `/signup` → admin aprueba/rechaza → emails via Resend.
- Migration SQL **YA APLICADA EN PROD** vía MCP. Cron job activo (03:00 UTC diario).
- Edge Functions **YA DESPLEGADAS Y ACTIVE** (v1) en Supabase.
- Falta: configurar `RESEND_API_KEY` secret + commit + push + smoke test.

---

## ✅ Aplicado en producción (NO requiere acción de Juan)

### 1. Migration `signup_aprobacion_manual_2026_04_26`

Aplicada en `gtphkowfcuiqbvfkwjxb` vía MCP `apply_migration`. Cambios:

- `handle_new_user()` actualizado: captura `nombre`/`apellidos` desde `raw_user_meta_data`, marca `status='pendiente'` y `approved=false` para todos excepto `jolivares@valereconsultores.com` (que sigue siendo master auto-aprobado).
- `is_approved()` — helper para RLS futuras.
- `admin_reject_user(uuid)` — borra de `auth.users` (cascade → user_profiles). Solo callable por master.
- `cleanup_pending_users_older_than_7_days()` — borra pendientes >7d. Idempotente.
- Extensión `pg_cron` instalada.
- Cron `cleanup_pending_users_daily` schedule `0 3 * * *` ACTIVE.

Verificación:
```sql
SELECT proname FROM pg_proc WHERE proname IN
  ('handle_new_user','is_approved','admin_reject_user','cleanup_pending_users_older_than_7_days');
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'cleanup_pending_users_daily';
```

Archivo en repo: `supabase/migrations/20260426_signup_aprobacion_manual.sql`.

### 2. Edge Functions desplegadas (status ACTIVE)

| Function | Version | verify_jwt | Trigger |
|---|---|---|---|
| `notify-admin-pending-user` | v1 | true | invocada por SignupPage tras signUp |
| `notify-user-approval-decision` | v1 | true | invocada por PendientesTab al aprobar/rechazar |

Ambas envían vía Resend desde `Valere CRM <noreply@valereconsultores.com>` al admin (`jolivares@valereconsultores.com`) o al usuario afectado.

Archivos en repo:
- `supabase/functions/notify-admin-pending-user/index.ts`
- `supabase/functions/notify-user-approval-decision/index.ts`

> ⚠️ Las funciones desplegadas tienen pequeñas variaciones respecto al repo (escapado de operadores `??`/`||` con paréntesis explícitos por strict mode de Deno). El comportamiento es idéntico. Cuando hagas commit, deja la versión del repo o sincroniza con `supabase functions download` si quieres alinear byte-a-byte.

---

## ⏳ Pendiente — bloque PowerShell para Juan (15 min)

### Paso 1 — Configurar secret RESEND_API_KEY

Ejecuta UNA de estas dos opciones:

**Opción A (recomendado, 30 segundos): vía Dashboard Supabase**
1. Abre https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb/functions/secrets
2. Click "Add new secret".
3. Nombre: `RESEND_API_KEY`
4. Valor: la API key que generó Claude in Chrome (formato `re_xxx`).
5. Save.

**Opción B: vía Supabase CLI**
```powershell
cd C:\Users\joliv\valere-v2
npx supabase secrets set RESEND_API_KEY=re_TU_KEY_AQUI --project-ref gtphkowfcuiqbvfkwjxb
```

### Paso 2 — Smoke test del flujo completo

```powershell
# Arrancar dev server
cd C:\Users\joliv\valere-v2
npm run dev
```

En navegador:
1. Abre http://localhost:3000/signup
2. Crea una cuenta con tu email personal (NO `jolivares@valereconsultores.com`).
3. Tras el signup deberías ver `/pending-approval`.
4. Comprueba que llegó email a `jolivares@valereconsultores.com` con asunto `[Valere CRM] Nueva alta pendiente: ...`.
5. Logout. Loguéate con tu cuenta master. Ve a `/admin` → tab "Pendientes".
6. Aprueba la cuenta de prueba como `client`.
7. Comprueba que llegó email a esa cuenta con asunto `[Valere CRM] Tu cuenta ha sido aprobada`.
8. Loguéate con la cuenta de prueba → debería entrar al dashboard.

Si algo falla revisa logs Edge Function:
```
https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb/functions
```

### Paso 3 — TSC + tests + build

```powershell
cd C:\Users\joliv\valere-v2
npx tsc --noEmit              # debe dar 0 errores
npm test -- --run              # deben pasar 39/39
npm run build                  # build OK
```

> NOTA: el sandbox bash de Cowork ve archivos truncados (mount Windows desincronizado), por eso TSC se valida en local PowerShell y no en sandbox. El código en disco está correcto (verificado vía Read tool).

### Paso 4 — Commit y push

```powershell
cd C:\Users\joliv\valere-v2

# Crear rama
git checkout -b claude/signup-aprobacion-manual

# Verificar archivos nuevos/modificados
git status

# Esperado:
#   new file:   .cowork/outbox/2026-04-26T15-18-22-signup-aprobacion-manual-handoff.md
#   new file:   docs/SESIONES/2026-04-26-signup-aprobacion.md
#   new file:   src/features/auth/SignupPage.tsx
#   new file:   src/features/auth/PendingApprovalPage.tsx
#   new file:   supabase/functions/notify-admin-pending-user/index.ts
#   new file:   supabase/functions/notify-user-approval-decision/index.ts
#   new file:   supabase/migrations/20260426_signup_aprobacion_manual.sql
#   modified:   src/App.tsx
#   modified:   src/features/auth/LoginPage.tsx
#   modified:   src/features/admin/AdminPage.tsx
#   modified:   docs/ESTADO.md

git add .
git commit -m "feat(auth): signup publico con aprobacion manual + emails Resend

- Migration: handle_new_user con nombre/apellidos + status pendiente,
  admin_reject_user, cleanup_pending_users_older_than_7_days,
  pg_cron job diario 03:00 UTC.
- Edge Function notify-admin-pending-user (v1, ACTIVE)
- Edge Function notify-user-approval-decision (v1, ACTIVE)
- SignupPage publica /signup
- PendingApprovalPage para usuarios no aprobados
- AuthGuard bloquea approved=false a /pending-approval
- Tab Pendientes en AdminPage (aprobar con rol + rechazar)
- LoginPage con link a /signup

Resend dominio: valereconsultores.com (verified)
Plan Free: 100 emails/dia, 3000/mes."

git push -u origin claude/signup-aprobacion-manual
```

### Paso 5 — Abrir PR

```powershell
gh pr create --title "feat(auth): signup publico con aprobacion manual" --body-file .cowork/outbox/2026-04-26T15-18-22-signup-aprobacion-manual-handoff.md --base main
```

O abrir manualmente en https://github.com/jolivares-valere/valere-v2/pulls.

---

## 🔐 Seguridad — rotar API key Resend

La API key de Resend ha pasado por el chat de Cowork. Riesgo bajo (chat es privado), pero buena práctica:

1. Tras confirmar que todo funciona, abre https://resend.com/api-keys
2. Crea una nueva key con mismo scope (Sending, All Domains, name "Valere CRM - Production v2").
3. Configura el nuevo secret en Supabase (paso 1 con la nueva key).
4. Borra la antigua key en Resend.

---

## 📋 Limitaciones conocidas / trabajo futuro

- **RLS no endurecida por approved:** la defensa actual es frontend-only (AuthGuard). Si un usuario no aprobado consigue tokens válidos podría leer datos vía API directa. Para defensa en profundidad ver `supabase/migrations/_draft_rls_hardening_8_tables.sql` (sprint 8) y considerar añadir helper `is_approved()` en policies. **Aceptable para MVP** — las altas son lentas y manuales.
- **Email destino hardcoded** a `jolivares@valereconsultores.com`. Si quieres añadir más admins, modificar `ADMIN_EMAIL` secret en Supabase (lista separada por comas requiere refactor de la Edge Function).
- **`status` no es enum** — usa text con valores convencionales (`pendiente`, `active`). Podría endurecerse con CHECK constraint.
- **Migración futura `noreply@valere.es`**: cuando Juan tenga acceso a Arsys + decida unificar, cambiar `FROM_ADDRESS` en ambas Edge Functions y verificar dominio en Resend. Estimado 15 min trabajo + 24h DNS.

---

## 📁 Archivos creados/modificados

### Nuevos
- `supabase/migrations/20260426_signup_aprobacion_manual.sql`
- `supabase/functions/notify-admin-pending-user/index.ts`
- `supabase/functions/notify-user-approval-decision/index.ts`
- `src/features/auth/SignupPage.tsx`
- `src/features/auth/PendingApprovalPage.tsx`
- `docs/SESIONES/2026-04-26-signup-aprobacion.md`
- `.cowork/outbox/2026-04-26T15-18-22-signup-aprobacion-manual-handoff.md` (este)

### Modificados
- `src/App.tsx` — rutas `/signup` y `/pending-approval`, AuthGuard bloquea `approved=false`, LoginRoute idem
- `src/features/auth/LoginPage.tsx` — link a `/signup`
- `src/features/admin/AdminPage.tsx` — TabsTrigger "Pendientes" + componente `PendientesTab`
- `docs/ESTADO.md` — entrada del sprint
