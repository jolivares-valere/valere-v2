# Sesión 2026-07-02 (Cowork) — Flujo público de recuperar contraseña

## Contexto / por qué
Julia (soporte@valereconsultores.com) no podía entrar. Diagnóstico por logs de auth:
intentos de login con contraseña incorrecta + un intento de re-registro (`/signup` → 422
"User already registered"). **NO había ningún flujo de reset de contraseña en el CRM**
(solo enlace a /signup en login; sin ruta ni página de reset; el único
`resetPasswordForEmail` estaba en el mock). Decisión de Juan: construir el flujo completo.

## Hecho en esta sesión (código, SIN commit — pendiente terminal de Juan)
Ficheros nuevos:
- `src/features/auth/ForgotPasswordPage.tsx` — ruta pública `/forgot-password`. Pide email →
  `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })`.
  Mensaje genérico (no filtra si el email existe). Maneja rate limit.
- `src/features/auth/ResetPasswordPage.tsx` — ruta pública `/reset-password`. Capta la sesión
  de recuperación (evento `PASSWORD_RECOVERY` / `getSession`, timeout 5s → "enlace inválido"),
  formulario nueva contraseña + confirmar → `updateUser({ password })` → `signOut()` →
  redirige a `/login` con toast de éxito.

Ficheros modificados:
- `src/features/auth/LoginPage.tsx` — añadido enlace «¿Olvidaste tu contraseña?» → `/forgot-password`.
- `src/App.tsx` — imports + rutas públicas `/forgot-password` y `/reset-password` (fuera de AuthGuard).
- `src/features/auth/SignupPage.tsx` — mensaje "email ya registrado" ahora apunta al reset.
- `docs/help/auth/recuperar-contrasena.md` — NUEVO (doc RAG).
- `docs/help/AUTH-SIGNUP-Y-APROBACION.md` — actualizado el punto de "olvidé contraseña".

## PENDIENTE en terminal de Juan (Windows) — el sandbox NO pudo verificar
El mount de Linux sirvió snapshots truncados; tsc del sandbox dio errores FALSOS
(verificado que el lado Windows está correcto vía Read). Hay que:

1. Poner los cambios en rama limpia desde main:
   ```
   git stash            # si hay cambios sueltos de datadis en el árbol
   git checkout main && git pull origin main
   git checkout -b claude/auth-reset-password
   # traer los 7 ficheros de arriba (ya están en el working tree)
   ```
2. `npx tsc --noEmit`  → debe dar 0 errores.
3. `npm test -- --run`  → 39/39 (o el número vigente).
4. Commit + push + PR:
   ```
   git add src/features/auth src/App.tsx docs/help
   git commit -m "feat(auth): flujo publico recuperar contrasena (forgot + reset password)"
   git push origin claude/auth-reset-password
   ```

## PENDIENTE en Supabase Dashboard (crítico para que funcione en prod)
1. **Authentication → URL Configuration → Redirect URLs**: añadir
   `https://valere-v2.pages.dev/reset-password` y `http://localhost:3000/reset-password`.
2. **Authentication → Email Templates → Reset Password**: verificar que está habilitado.
3. **SMTP (DELIVERABILITY)**: el SMTP por defecto de Supabase va limitado (~2/h) y es poco
   fiable a dominios externos. Configurar SMTP propio (Resend, ya usado por las Edge Functions
   del CRM) en Authentication → SMTP Settings para que los emails de reset lleguen de verdad.

## Stopgap inmediato para Julia (si Juan lo pide)
Hasta que esto esté desplegado + SMTP OK, Julia sigue bloqueada. Alternativa inmediata:
fijar contraseña temporal desde Supabase (auth.users, crypt/bcrypt) y que la cambie luego.
Juan de momento eligió construir el flujo, no la temporal.
