# Auth — Self-signup + aprobación manual + whitelist de dominios

**Fecha:** 2026-06-12
**Sprint:** `sprint-domingo-auth-selfsignup`
**Agente:** Cowork (Claude)
**Estado:** ✅ Migration aplicada en prod · ⏳ Endurecimiento RLS preparado pero NO aplicado

---

## 0. Contexto

Este documento cierra el sprint que refuerza el flujo de signup público introducido el 2026-04-26 (ver `supabase/migrations/20260426_signup_aprobacion_manual.sql` y la sección "Auth & Signup" de `CLAUDE.md`). Lo que ya existía:

- `/signup` público con captura de nombre/apellidos/email/password
- `/pending-approval` para usuarios autenticados sin aprobar
- Tab "Pendientes" dentro de `/admin`
- Edge Functions `notify-admin-pending-user` y `notify-user-approval-decision` (Resend)
- Cron `cleanup_pending_users_daily` (auto-rechazo a 7 días)
- Columna legacy `approved` (boolean)

Este sprint añade:

1. Columnas auditables canónicas `is_approved`, `approved_by`, `approved_at`.
2. Whitelist de dominios corporativos (frontend + CHECK constraint).
3. Pantalla standalone `/admin/pendientes` (además del tab existente).
4. Migration `_pending_` lista para endurecer RLS exigiendo `is_approved()` cuando Juan dé el corte.

---

## 1. Arquitectura del flujo

```
                  ┌──────────────────┐
                  │   /signup (FE)   │
                  │  Zod: whitelist  │  ← refine(isAllowedSignupEmail)
                  │  domain valida   │
                  └────────┬─────────┘
                           │ supabase.auth.signUp({email, password, metadata})
                           ▼
              ┌─────────────────────────────┐
              │  auth.users (insert)        │
              └─────────────┬───────────────┘
                            │ trigger handle_new_user (SECURITY DEFINER)
                            ▼
              ┌─────────────────────────────┐
              │  user_profiles              │
              │  - email (CHECK whitelist)  │  ← rechaza no-Valere
              │  - is_approved=false        │  ← canónico
              │  - approved=false           │  ← legacy, en sync via trigger
              │  - status='pendiente'       │
              └─────────────┬───────────────┘
                            │
       ┌────────────────────┴────────────────────┐
       │                                          │
       ▼                                          ▼
┌──────────────┐                  ┌────────────────────────────┐
│ AuthGuard:   │                  │ Edge Function:             │
│ !is_approved │                  │ notify-admin-pending-user  │
│   → /pending │                  │ (Resend → Juan email)      │
│   -approval  │                  └────────────────────────────┘
└──────────────┘
       │
       │  Master/manager aprueba desde
       │  /admin/pendientes O /admin?tab=pendientes
       ▼
┌──────────────────────────────────────────────────────────────┐
│ UPDATE user_profiles                                         │
│   SET is_approved=true,                                      │
│       approved_by=<auth.uid()>,                              │
│       status='active',                                       │
│       role=<seleccionado>                                    │
│ ──── trigger sync_user_profile_approved_columns ───          │
│   - rellena approved_at = NOW() si NULL                      │
│   - propaga approved=true                                    │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
              Edge Function notify-user-approval-decision
              (Resend → email al solicitante)
```

---

## 2. Migrations

### 2.1 Aplicada — `20260612000001_user_approval_flow.sql`

Aplicada en prod vía MCP `apply_migration` el 2026-06-12.

**Cambios:**

- `user_profiles.is_approved boolean NOT NULL DEFAULT false` (canónica).
- `user_profiles.approved_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL`.
- `user_profiles.approved_at timestamptz`.
- Backfill: copia `approved → is_approved` y `created_at → approved_at` para todos los aprobados.
- Trigger `trg_user_profiles_sync_approved_columns` mantiene `approved ⇄ is_approved` y rellena `approved_at` automáticamente.
- CHECK constraint `user_profiles_email_domain_whitelist` (NOT VALID) acepta solo `valereconsultores.com` y `valere.com`.
- `handle_new_user` actualizado: master sigue auto-aprobado (`is_approved=true`, `approved_at=NOW()`).
- `is_approved()` helper SQL ahora lee `is_approved` con fallback a `approved`.

**Verificación post-aplicación (resultado real):**

| email                                  | approved | is_approved | approved_at                  |
| -------------------------------------- | -------- | ----------- | ---------------------------- |
| jolivares@valereconsultores.com        | true     | true        | 2026-04-09 13:11:16.030821   |
| arodriguez@valereconsultores.com       | true     | true        | 2026-04-25 11:18:09.320167   |
| administracion@valereconsultores.com   | true     | true        | 2026-04-25 11:18:49.998318   |
| juanolivarespena@gmail.com             | true     | true        | 2026-04-26 20:40:06.458535   |
| juanolivarespena+signup4@gmail.com     | true     | true        | 2026-04-26 20:54:04.551808   |
| soporte@valereconsultores.com          | true     | true        | 2026-04-30 06:30:55.378463   |
| info@valereconsultores.com             | true     | true        | 2026-05-03 20:35:18.437856   |

7/7 quedaron aprobados. Las cuentas `gmail.com` (test de Juan) están preservadas gracias al `NOT VALID` del CHECK constraint — no se validan filas existentes.

### 2.2 PENDIENTE — `_pending_rls_require_is_approved.sql`

**NO aplicar hasta que Juan dé el go.** Añade una policy RESTRICTIVE en ~60 tablas que exige `public.is_approved()` para SELECT/INSERT/UPDATE/DELETE. RESTRICTIVE = se ANDea con todas las policies existentes, así que no rompe lo que ya hay; solo cierra el acceso a usuarios no aprobados.

**Procedimiento de aplicación:**

1. **Confirma backfill OK.** Correr `scripts/auth_backfill_approval.sql` (manual, ver §3). Verificar que ningún humano activo quedó con `is_approved=false`.

2. **Renombra la migration.**

   ```bash
   git mv supabase/migrations/_pending_rls_require_is_approved.sql \
          supabase/migrations/20260613000001_rls_require_is_approved.sql
   ```

3. **Aplica.** Cualquier vía sirve:
   - Cowork via MCP: `apply_migration` con el contenido.
   - Local: `npx supabase db push`.
   - Dashboard SQL Editor: pegar el archivo entero, Run.

4. **Verifica inmediatamente** con dos cuentas reales (una aprobada, una no):
   - Aprobada: `SELECT count(*) FROM empresas` debe devolver >0.
   - Sin aprobar: la misma query debe dar 0 filas.

5. **Rollback** si algo se rompe:

   ```sql
   DO $$ DECLARE r record; BEGIN
     FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies
              WHERE policyname LIKE 'rls_require_is_approved_%' LOOP
       EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                      r.policyname, r.schemaname, r.tablename);
     END LOOP;
   END; $$;
   ```

---

## 3. Script de backfill

`scripts/auth_backfill_approval.sql` — idempotente, ejecutar manualmente **antes** de aplicar el endurecimiento RLS.

```bash
# Opción Dashboard:
#   Dashboard → SQL Editor → pegar contenido → Run.
# Opción CLI:
supabase db execute --project-ref gtphkowfcuiqbvfkwjxb \
  --file scripts/auth_backfill_approval.sql
```

Marca a TODOS los `user_profiles` actuales como `is_approved=true`, `approved_at=COALESCE(approved_at, created_at, NOW())`, `approved_by=NULL`. Si hay alguna solicitud pendiente real en el momento de correrlo, **edita el `WHERE`** para excluirla:

```sql
UPDATE public.user_profiles
SET is_approved = true, ...
WHERE is_approved IS DISTINCT FROM true
  AND email NOT IN ('solicitud-a-dejar-pendiente@valereconsultores.com');
```

---

## 4. Cambios frontend

| Archivo | Cambio |
| --- | --- |
| `src/core/types/entities.ts` | `UserProfile` ahora incluye `is_approved`, `approved_by`, `approved_at` (nullable). |
| `src/core/auth/approval.ts` (nuevo) | Helpers `isProfileApproved`, `isAllowedSignupEmail`, `emailDomain` + constante `ALLOWED_EMAIL_DOMAINS`. |
| `src/core/auth/approval.test.ts` (nuevo) | 14 tests Vitest cubriendo los helpers. **Todos verdes.** |
| `src/core/hooks/useAuth.ts` | `bootstrapFromSession` rellena los 3 campos nuevos con sus defaults. |
| `src/App.tsx` | `AuthGuard`, `LoginRoute`, `PendingApprovalRoute` usan `isProfileApproved(user)` en lugar de leer `user.approved` directo. Añade ruta `/admin/pendientes`. |
| `src/features/auth/SignupPage.tsx` | Zod schema usa `refine(isAllowedSignupEmail, …)`. Texto pie de página menciona la whitelist. |
| `src/features/admin/PendingUsersPage.tsx` (nuevo) | Página standalone gateada por `role ∈ {master, manager}`. Aprueba con `is_approved=true, approved_by=current_user`. Rechaza vía RPC `admin_reject_user`. |
| `src/features/admin/AdminPage.tsx` | `PendientesTab` y `UsersTab` migrados a `is_approved` / `approved_by`. Mantienen compatibilidad con la columna legacy `approved` en la UI. |
| `src/components/layout/Sidebar.tsx` | Nueva entrada de menú "Pendientes" (icon `UserPlus`, gateada a master/manager). |
| `supabase/functions/notify-admin-pending-user/index.ts` | Lee también `is_approved` (`yaAprobado = is_approved || approved`). |

---

## 5. Validación sintética

### 5.1 BD — CHECK constraint dominio

```sql
SELECT
  email,
  (email IS NULL OR lower(split_part(email,'@',2))
    = ANY (ARRAY['valereconsultores.com','valere.com'])) AS pasa
FROM (VALUES
  ('malicioso@otro-dominio.com'),
  ('test@valereconsultores.com'),
  ('test@valere.com'),
  ('TEST@VALERE.COM')
) AS t(email);
```

| email                       | pasa  |
| --------------------------- | ----- |
| malicioso@otro-dominio.com  | false |
| test@valereconsultores.com  | true  |
| test@valere.com             | true  |
| TEST@VALERE.COM             | true  |

### 5.2 BD — trigger de sincronización

Probado en una transacción que rolleamos al final:

- `UPDATE … SET is_approved=false WHERE email=master` → BD queda con `approved=false, approved_at=NULL, approved_by=NULL` ✓
- `UPDATE … SET approved=false WHERE email=master` → BD queda con `is_approved=false, approved_at=NULL, approved_by=NULL` ✓
- `ROLLBACK` → vuelve al estado original ✓

### 5.3 Helper SQL `is_approved()`

Sin `auth.uid()` (sesión service-role) → devuelve `false`. Correcto: fail-closed.

### 5.4 Frontend — Vitest

`src/core/auth/approval.test.ts` — 14/14 ✓ (ejecutado en sandbox sobre `vitest run`).

Casos cubiertos:
- `isProfileApproved`: null/undefined, canonical, legacy fallback, edge cases con NULL.
- `isAllowedSignupEmail`: whitelist OK, case-insensitive, rechazo de dominios externos, defensa contra ataques con `.attacker.io` como TLD.
- `emailDomain`: extracción y normalización.
- `ALLOWED_EMAIL_DOMAINS`: lista exacta documentada.

### 5.5 Recorrido end-to-end manual (pendiente Juan)

Recomendado correrlo cuando se publique:

| Paso | Resultado esperado |
| --- | --- |
| Signup con `foo@gmail.com` | Error en la UI: "Solo aceptamos correos corporativos Valere…". No llega a Supabase. |
| Signup con `foo@valereconsultores.com` | Éxito. Llega email a `jolivares@valereconsultores.com`. Auto-redirect a `/pending-approval`. |
| Login con esa cuenta antes de aprobar | Auto-redirect a `/pending-approval`. No puede abrir `/dashboard`. |
| Master/manager → `/admin/pendientes` | Ve la fila, selecciona rol, "Aprobar". |
| Refresh sesión del usuario aprobado | Entra al dashboard. `user_profiles.approved_by = <id master>`, `approved_at = NOW()`. |

---

## 6. Cómo añadir nuevos dominios a la whitelist

Cuando se quiera permitir otro dominio corporativo (ej. `valere.es`):

1. **BD** — recrear el CHECK constraint:

   ```sql
   BEGIN;
   ALTER TABLE public.user_profiles
     DROP CONSTRAINT IF EXISTS user_profiles_email_domain_whitelist;
   ALTER TABLE public.user_profiles
     ADD CONSTRAINT user_profiles_email_domain_whitelist
     CHECK (
       email IS NULL
       OR lower(split_part(email, '@', 2)) = ANY (
         ARRAY['valereconsultores.com','valere.com','valere.es']
       )
     )
     NOT VALID;
   COMMIT;
   ```

2. **Frontend** — añadir el dominio a `ALLOWED_EMAIL_DOMAINS` en `src/core/auth/approval.ts`. El resto se cubre solo (Zod refine, SignupPage pie de página, tests).

3. **Tests** — añadir el caso en `approval.test.ts`.

---

## 7. Ruta nueva en la app

- **URL:** `/admin/pendientes`
- **Componente:** `src/features/admin/PendingUsersPage.tsx`
- **Gate:** `AuthGuard roles={['master','manager']}` + recheck local del rol.
- **Acceso UI:** sidebar → bloque "Admin" → "Pendientes" (visible solo a master/manager).
- **Convive con** el tab existente `/admin?tab=pendientes` (ambos escriben `is_approved` ahora).

---

## 8. Pendientes / Próximos pasos

1. ⏳ **Aplicar `_pending_rls_require_is_approved.sql`** cuando Juan dé el go (ver §2.2).
2. ⏳ **Correr backfill** (`scripts/auth_backfill_approval.sql`) antes del corte RLS.
3. ⏳ **Test E2E manual** del recorrido §5.5 cuando la rama se merge a `main`.
4. 💭 **Plantearse migrar a un único campo.** Conservamos `approved` por compatibilidad con código que aún lo lee. Cuando todos los lectores hayan migrado a `is_approved` (grep en main: ya solo queda Edge Function y tipos legacy), se puede:

   ```sql
   ALTER TABLE public.user_profiles DROP COLUMN approved;
   -- previamente: borrar el trigger sync, simplificar handle_new_user
   ```

5. 💭 **`ADMIN_EMAIL` env var** sigue hardcoded a `jolivares@valereconsultores.com` en la Edge Function. Cuando haya >1 admin, refactor a `ADMIN_EMAILS` (lista coma-separada).

---

## 9. Archivos de este sprint

```
supabase/migrations/
  20260612000001_user_approval_flow.sql        ✅ APLICADO en prod
  _pending_rls_require_is_approved.sql         ⏳ PENDIENTE (renombrar para aplicar)

scripts/
  auth_backfill_approval.sql                   ⏳ correr antes del corte RLS

src/core/auth/
  approval.ts                                  nuevo
  approval.test.ts                             nuevo (14 tests)

src/features/admin/
  PendingUsersPage.tsx                         nueva ruta /admin/pendientes
  AdminPage.tsx                                editado (PendientesTab + UsersTab)

src/features/auth/
  SignupPage.tsx                               editado (whitelist Zod refine)

src/components/layout/
  Sidebar.tsx                                  editado (menú "Pendientes")

src/core/hooks/
  useAuth.ts                                   editado (bootstrap 3 campos nuevos)

src/core/types/
  entities.ts                                  editado (UserProfile + 3 campos)

src/App.tsx                                    editado (isProfileApproved + ruta)

supabase/functions/notify-admin-pending-user/
  index.ts                                     editado (lee is_approved)

docs/
  AUTH_SELF_SIGNUP_2026-06-12.md               este documento
```

Restricción del sprint: NO commits desde Cowork (sandbox no escribe a `.git/`). Claude Code en el Windows de Juan se encarga del commit + push cuando todo se valide manualmente.
