# Plan migración Auth → Google Identity

> Generado 2026-04-25 por Cowork.
> Para ejecutar cuando Google Workspace esté completamente migrado y estable.
> Tiempo total: 4-6h trabajo (técnico + comunicación equipo + rollout).

---

## Objetivo

Sustituir el login email+password de Supabase Auth por **Google OAuth** vinculado a las cuentas de Workspace `@valereconsultores.com`. Beneficios:

- **UX**: 1 click para entrar, sin recordar contraseña.
- **Seguridad**: cuando alguien deja Valere y se da de baja en Workspace, automáticamente pierde acceso al CRM.
- **2FA gratuita**: hereda el 2FA configurado en Workspace.
- **Auditoría centralizada**: logs de acceso en consola de admin Workspace.
- **Sin gestión de contraseñas**: cero lío con resets, expiraciones, fugas.

Supabase Auth se mantiene como **backend** — solo cambia el método de autenticación a OAuth Google.

---

## Pre-requisitos

- ✅ Google Workspace activo en `valereconsultores.com`.
- ✅ Acceso admin al Google Cloud Console (incluido con Workspace).
- ✅ Dominio del CRM configurado (`valere-v2.pages.dev` o dominio custom).
- ✅ Permisos master en Supabase para configurar OAuth providers.

---

## FASE 1 — Configurar Google Cloud OAuth Client (30 min)

### 1.1 Crear proyecto en Google Cloud (si no existe)

1. Ir a https://console.cloud.google.com con cuenta admin Workspace.
2. **Selector de proyecto** arriba → **New Project**.
3. Nombre: `valere-crm-auth`.
4. Organización: `valereconsultores.com`.
5. **Create**.

### 1.2 Habilitar Google+ API (necesaria para OAuth)

1. APIs & Services → Library.
2. Buscar "Google+ API" → **Enable**.

### 1.3 Configurar OAuth Consent Screen

1. APIs & Services → OAuth consent screen.
2. **User Type**: Internal (solo cuentas Workspace de tu org).
3. Rellenar:
   - **App name**: "Valere CRM"
   - **User support email**: `jolivares@valereconsultores.com`
   - **App logo**: subir logo Valere (cuadrado, mínimo 120x120).
   - **App home URL**: `https://valere-v2.pages.dev`
   - **App privacy policy / terms**: opcionales para Internal.
   - **Developer contact info**: email Juan.
4. **Save and continue**.
5. **Scopes**: añadir:
   - `openid`
   - `email`
   - `profile`
6. **Save**.

### 1.4 Crear OAuth Client ID

1. APIs & Services → Credentials → **+ CREATE CREDENTIALS** → **OAuth client ID**.
2. Application type: **Web application**.
3. Name: "Valere CRM Web Client".
4. **Authorized redirect URIs**: añadir las URLs que Supabase necesita:
   - `https://gtphkowfcuiqbvfkwjxb.supabase.co/auth/v1/callback`
5. **Authorized JavaScript origins** (opcional):
   - `https://valere-v2.pages.dev`
   - `http://localhost:3000`
6. **Create**.
7. **Apuntar el Client ID y Client Secret** que se generan (NO compartir en chat).

---

## FASE 2 — Configurar Provider en Supabase (15 min)

1. Ir a https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb/auth/providers
2. Encontrar **Google** en la lista de providers → **Enable**.
3. Rellenar:
   - **Client ID**: el del paso 1.4.
   - **Client Secret**: el del paso 1.4.
   - **Authorized Domains**: añadir `valereconsultores.com` para forzar que solo entren cuentas de la org.
4. **Save**.

Verificar que el redirect URI mostrado por Supabase coincide con el configurado en Google Cloud (paso 1.4).

---

## FASE 3 — Adaptar `useAuth` y LoginPage (2h)

### 3.1 Añadir botón "Login con Google" en LoginPage

`src/features/auth/LoginPage.tsx`:

```tsx
import { supabase } from '@/core/supabase/client'

async function handleGoogleLogin() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
      queryParams: {
        // Forzar selector de cuenta (útil si el usuario tiene varias)
        prompt: 'select_account',
        // Limitar al dominio Workspace
        hd: 'valereconsultores.com',
      },
    },
  })
  if (error) {
    toast.error('Error al iniciar sesión con Google')
    logError(error, 'LoginPage.googleLogin')
  }
}

// En el JSX, añadir como primera opción:
<button
  onClick={handleGoogleLogin}
  className="w-full flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg px-4 py-2.5"
>
  <GoogleIcon className="w-5 h-5" />
  <span>Continuar con Google</span>
</button>

<div className="my-4 text-center text-xs text-slate-400">o con email</div>

{/* Mantener el form email+password como fallback durante el rollout */}
<form>...</form>
```

### 3.2 Crear el perfil tras OAuth

Cuando un nuevo usuario entra con Google por primera vez, Supabase crea automáticamente la fila en `auth.users` pero NO en `user_profiles`. Hay que sincronizar.

Hay 2 opciones:

**Opción A — Trigger SQL (recomendada)**:

```sql
-- supabase/migrations/20260425_auto_create_user_profile.sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, nombre, apellidos, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'given_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'family_name', ''),
    'comercial',                -- rol por defecto, admin lo cambia después
    'pending'                   -- pendiente de aprobación
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

**Opción B — Frontend tras login**:

```tsx
// En useAuth o LoginCallback
const { data: { user } } = await supabase.auth.getUser()
if (user) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', user.id)
    .single()
  if (!profile) {
    await supabase.from('user_profiles').insert({
      id: user.id,
      email: user.email,
      nombre: user.user_metadata?.given_name ?? user.email,
      apellidos: user.user_metadata?.family_name ?? '',
      role: 'comercial',
      status: 'pending',
    })
  }
}
```

**Recomendación: A** (trigger). Centraliza la lógica en el backend, evita race conditions, y funciona aunque el frontend no tenga el código de creación.

### 3.3 Actualizar `useAuth` para detectar si la cuenta requiere aprobación

Ya está implementado en el CRM actual (`status = 'pending'` bloquea acceso). Verificar que sigue funcionando con OAuth.

---

## FASE 4 — Dual-mode durante rollout (3-7 días)

Durante el periodo de transición, MANTENER ambos métodos:

- Email + password (legacy, para compañeros que aún no han migrado).
- Google OAuth (nuevo, recomendado).

Razón: si Google falla por cualquier motivo durante la migración, los compañeros pueden seguir entrando con su contraseña.

En LoginPage, mostrar Google como opción principal y email como secundaria ("o con email").

---

## FASE 5 — Migración de usuarios existentes (1h + comunicación)

### 5.1 Crear comunicación al equipo

Email/Slack al equipo:

> **Asunto**: Cambio en cómo se entra al CRM — más fácil
>
> Hola equipo,
>
> A partir de [fecha], tenéis una opción nueva para entrar al CRM **con un solo click** usando vuestra cuenta de Google de Valere (la del email).
>
> **Cómo**:
> 1. Vais a https://valere-v2.pages.dev como siempre.
> 2. Pulsáis **"Continuar con Google"** (botón nuevo arriba).
> 3. Elegís vuestra cuenta @valereconsultores.com.
> 4. Listo. No más contraseñas que recordar.
>
> Vuestro acceso actual con email+contraseña SIGUE FUNCIONANDO durante 1 mes para que tengáis tiempo de migrar. Después del [fecha+30] solo Google funcionará.
>
> **Si tenéis problemas** entrando con Google, escribidme inmediatamente.
>
> Un abrazo,
> Juan

### 5.2 Migración manual de cuentas existentes

Para cada usuario actual (hay solo 1 según `user_profiles` — Juan):

1. Login con email+password una última vez para confirmar identidad.
2. Vincular cuenta Google: en perfil → "Vincular cuenta Google" → autorizar.
3. Verificar que sigue funcionando.

Tras 1 mes en dual-mode, eliminar la opción email+password.

### 5.3 Política para nuevos usuarios

A partir de la migración, todos los altas nuevas son SOLO con Google OAuth. Eliminar de la UI el formulario "Crear cuenta con email" (o ocultar).

---

## FASE 6 — Cleanup tras 1 mes (15 min)

1. Eliminar form email+password de LoginPage.
2. Cambiar la política de Supabase Auth para que no permita nuevos registros email+password (Settings → Auth → "Email signup" → disable).
3. Mantener la opción "Forgot password" por si alguien con cuenta legacy aún la necesita (poco probable a esa altura).

---

## Beneficios post-migración

- ✅ Compañeros tienen 1 click para entrar — UX mejor.
- ✅ Cuando alguien deja Valere → admin desactiva su cuenta Workspace → automáticamente pierde acceso CRM (mismo día). Antes era un paso manual extra.
- ✅ 2FA gratuita heredada de Workspace.
- ✅ No hay contraseñas que rotar / fugar / olvidar / resetear.
- ✅ Auditoría: el admin Workspace ve qué usuarios y cuándo entraron.

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Google OAuth rechaza por config wrong | Periodo dual-mode permite seguir trabajando con email |
| Compañeros confundidos | Comunicación clara + 1 mes de dual-mode + soporte directo |
| Cuenta Workspace temporalmente caída | Email+password como fallback durante 1 mes |
| Usuarios externos (no-Workspace) | Si los hubiera (no parece el caso), excluirlos del flujo Google y mantener email para ellos |

---

## Verificación final

Tras completar todas las fases:

1. Login con Google funciona para todos los compañeros.
2. Nuevos altas se crean automáticamente con `status='pending'` (admin debe aprobar).
3. Email+password ya no acepta nuevos registros.
4. Logs de acceso en Workspace admin → Audit log → Login events.

---

## Checklist de ejecución

- [ ] Fase 1: OAuth client creado en Google Cloud + scopes configurados.
- [ ] Fase 2: Provider Google enabled en Supabase con client ID + secret.
- [ ] Fase 3: LoginPage actualizada con botón Google + trigger handle_new_user creado.
- [ ] Fase 4: Dual-mode activo (Google + email simultáneos).
- [ ] Fase 5: Comunicado enviado + usuarios existentes vinculados.
- [ ] Fase 6: Cleanup tras 1 mes — solo Google permitido.

---

## Notas adicionales

- **MFA en Google Workspace**: configurarlo a nivel admin para todos los usuarios. Doble seguridad transparente para el CRM sin código adicional.
- **Salir de Google ≠ salir del CRM**: el token de sesión Supabase es independiente del token Google una vez emitido. Hay que hacer logout explícito en el CRM también.
- **Si en el futuro cambia el dominio Workspace**: re-configurar `Authorized Domains` en Supabase + el `hd` query param en el código.
