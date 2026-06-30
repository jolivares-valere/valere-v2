# Desconectar Vercel del repo (limpieza de integración muerta)

> **Contexto:** El CRM se migró de Vercel a Cloudflare Pages el 2026-04-24 (ver CLAUDE.md).
> Vercel ya no se usa para producción, pero su integración de GitHub **sigue activa** y
> comenta un "deploy preview" en cada PR. Es ruido y deuda técnica. Conviene desconectarlo.
>
> **Quién lo hace:** Juan (toca permisos de integraciones/OAuth, no automatizable por seguridad).
> **Tiempo:** ~2 minutos.

## Por qué desconectarlo
- Cada PR recibe un comentario de Vercel además del de Cloudflare (confusión).
- Consume build minutes de Vercel innecesariamente.
- Mantiene una integración OAuth con acceso al repo que ya no se usa (superficie de riesgo).
- El hosting real es **https://valere-v2.pages.dev** (Cloudflare). Vercel no afecta a producción.

## Opción A — Desde el dashboard de Vercel (recomendada)
1. Entra en https://vercel.com/dashboard
2. Abre el proyecto `valere-v2`.
3. Settings → Git → **Disconnect** (desconectar el repositorio de GitHub).
   - O directamente Settings → **Delete Project** si la cuenta está suspendida y no la usas.

## Opción B — Desde GitHub (quitar el acceso de la app de Vercel)
1. GitHub → repo `jolivares-valere/valere-v2` → **Settings**.
2. **Webhooks**: localiza el webhook de `vercel.com` y bórralo (o desactívalo).
3. (Opcional, a nivel cuenta) GitHub → tu perfil → Settings → **Applications** →
   **Installed GitHub Apps** → Vercel → Configure → quitar acceso al repo `valere-v2`.

## Verificación
- Abre un PR de prueba (o el siguiente que toque): ya **no** debe aparecer el comentario de Vercel.
- El comentario de **Cloudflare Pages** debe seguir apareciendo (ese es el bueno).

## Nota
Si en el futuro quisierais volver a Vercel, se reconecta desde el dashboard de Vercel
importando el repo de nuevo. No se pierde nada borrando la integración ahora.
