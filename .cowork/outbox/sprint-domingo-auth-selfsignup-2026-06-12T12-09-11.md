# Sprint domingo — Auth self-signup + aprobación manual + whitelist

**Fecha:** 2026-06-12
**Agente:** Cowork (Claude)
**Estado:** ✅ Trabajo entregado · ⏳ corte RLS pendiente de Juan

---

## Qué se hizo

Refuerzo del flujo signup público existente (mig. 20260426). Cubre las 9 tareas del brief:

1. **Migration aplicada en prod** vía MCP `apply_migration`:
   `supabase/migrations/20260612000001_user_approval_flow.sql`
   - Columnas `is_approved`, `approved_by`, `approved_at` en `user_profiles`.
   - Trigger `trg_user_profiles_sync_approved_columns` mantiene legacy `approved` y nuevo `is_approved` sincronizados.
   - CHECK constraint `user_profiles_email_domain_whitelist` (NOT VALID) → solo `valereconsultores.com` + `valere.com`.
   - `handle_new_user` actualizado para escribir `is_approved` al master.
   - `is_approved()` SQL helper ahora lee el campo canónico.
   - Backfill: los 7 usuarios existentes ya están `is_approved=true`.

2. **Migration RLS preparada PERO NO aplicada**:
   `supabase/migrations/_pending_rls_require_is_approved.sql`
   - Estrategia: policies RESTRICTIVE adicionales por tabla (~60 tablas) que añaden el AND `is_approved()` sobre las policies existentes.
   - **No aplicar hasta que Juan dé el go.** Instrucciones detalladas en el archivo y en `docs/AUTH_SELF_SIGNUP_2026-06-12.md` §2.2.

3. **Script de backfill**:
   `scripts/auth_backfill_approval.sql` — idempotente. Correr **antes** del corte RLS.

4. **Frontend (no commits — Juan los hace)**:
   - `src/core/auth/approval.ts` + `approval.test.ts` (14 tests verdes en `vitest run`).
   - `src/core/types/entities.ts` → `UserProfile` con los 3 campos nuevos.
   - `src/core/hooks/useAuth.ts` → `bootstrapFromSession` los rellena.
   - `src/App.tsx` → `AuthGuard`, `LoginRoute`, `PendingApprovalRoute` usan `isProfileApproved()`. Añadida ruta `/admin/pendientes`.
     - ⚠️ Otro agente (telemetría) tocó este mismo archivo en paralelo. Mis cambios coexisten con los suyos sin conflicto observable.
   - `src/features/auth/SignupPage.tsx` → Zod `refine(isAllowedSignupEmail)`.
   - `src/features/admin/PendingUsersPage.tsx` (nuevo) — escribe `is_approved` + `approved_by`.
   - `src/features/admin/AdminPage.tsx` → `PendientesTab` + `UsersTab` migrados.
   - `src/components/layout/Sidebar.tsx` → menú "Pendientes" (master/manager).
   - `supabase/functions/notify-admin-pending-user/index.ts` → lee `is_approved` con fallback.

5. **Documentación**:
   - `docs/AUTH_SELF_SIGNUP_2026-06-12.md` — arquitectura, migrations aplicadas vs pendientes, cómo añadir dominios, cómo aplicar el corte RLS.

---

## Lo que tiene que hacer Juan (en orden)

### Hoy / al final de la sesión

1. **Revisar el diff** de los archivos editados/creados (lista completa en `docs/AUTH_SELF_SIGNUP_2026-06-12.md` §9).

2. **Correr TSC + tests** en su Windows local (el sandbox no puede por CRLF):
   ```powershell
   cd ~\valere-v2
   npx tsc --noEmit
   npm test -- --run
   ```
   Si TSC pasa (debería; mis archivos nuevos son LF clean) y tests siguen verdes (39 + 14 nuevos = 53), todo OK.

3. **Commit + push** (Cowork no puede; la sandbox no escribe a `.git/`):
   ```powershell
   cd ~\valere-v2
   git add supabase/migrations/20260612000001_user_approval_flow.sql `
           supabase/migrations/_pending_rls_require_is_approved.sql `
           scripts/auth_backfill_approval.sql `
           src/core/auth/approval.ts `
           src/core/auth/approval.test.ts `
           src/core/types/entities.ts `
           src/core/hooks/useAuth.ts `
           src/App.tsx `
           src/features/auth/SignupPage.tsx `
           src/features/admin/PendingUsersPage.tsx `
           src/features/admin/AdminPage.tsx `
           src/components/layout/Sidebar.tsx `
           supabase/functions/notify-admin-pending-user/index.ts `
           docs/AUTH_SELF_SIGNUP_2026-06-12.md
   git commit -m "feat(auth): is_approved + whitelist dominios + pantalla /admin/pendientes"
   git push origin main
   ```

### Cuando quiera cerrar el corte RLS

1. Verificar que el backfill `scripts/auth_backfill_approval.sql` se ha corrido y que ningún humano activo quedó con `is_approved=false`.

2. Renombrar la migration pendiente:
   ```powershell
   git mv supabase/migrations/_pending_rls_require_is_approved.sql `
          supabase/migrations/20260613000001_rls_require_is_approved.sql
   ```

3. Aplicar via MCP o `supabase db push`.

4. Verificación inmediata: con un usuario aprobado debe ver datos; con uno sin aprobar `SELECT count(*) FROM empresas` debe dar 0.

5. Rollback si algo falla:
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

## Lo que NO he tocado

Respetando el brief y los chats paralelos (b1e6ea41, a0907e77, ecdd4fc2):

- `supabase/functions/generar-propuesta-pptx/`
- `src/features/analisis/AnalisisPage.tsx`
- `src/features/propuestas-energia/*`
- Cualquier cosa ESIOS / Datadis
- `.git/` (sandbox no puede)

---

## Cosas a vigilar / posibles edge cases

- **Trigger sync**: si en el futuro algún path actualiza simultáneamente `approved` Y `is_approved` con valores distintos, el trigger conserva el cambio según cuál haya cambiado vs `OLD`. Edge raro pero documentado en el código.
- **`approved_by` queda NULL** para todos los usuarios actuales (backfill) y para futuras aprobaciones desde la Edge Function (no tienen auth.uid). La pantalla admin sí lo rellena con el `current_user.id`.
- **CHECK NOT VALID**: si en el futuro alguien añade `VALIDATE CONSTRAINT user_profiles_email_domain_whitelist`, fallará por las dos cuentas gmail.com de testing. Mantenerlo NOT VALID o limpiar esas cuentas antes.
- **AsistentePanel** se monta en TODAS las rutas autenticadas (incluso `/admin/pendientes`). Su Edge Function `ask-crm-docs` no lee `user_profiles` con RLS user-context, así que sigue funcionando aunque endurezcamos RLS.

Sin bloqueos pendientes que requieran input humano más allá del corte RLS.
