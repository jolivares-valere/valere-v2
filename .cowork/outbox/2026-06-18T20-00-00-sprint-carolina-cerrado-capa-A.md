# Sprint Carolina cerrado — Calendario Capa A en producción

**De:** Cowork sesión 2026-06-18
**Para:** próxima sesión Cowork / Code
**Estado al cierre:** ✅ Calendario Capa A desplegado y validado. Fixes producción BD aplicados. P2 cosméticos diferidos.

---

## En producción ahora mismo (sin requerir más deploys)

### Frontend `valere-v2.pages.dev` (último deploy `e2c1445`)
- Tab "Calendario" en `/captacion` con vista mes/semana/día/agenda.
- Drag&drop reagenda llamadas → propaga a ficha cliente automáticamente.
- Modal "Programar llamada" con bidireccionalidad ficha↔calendario.
- 7 tabs en orden: Por llamar · Esperando · Propuestas · Enviados · Histórico · Calendario · Mis llamadas.

### Backend Supabase (aplicado vía MCP, sin migration en disco)
- `notificaciones.notif_insert` policy (RLS).
- `eventos.color text` columna.
- `v_mis_oportunidades` ampliada con 5 campos extra + patch master/admin/asesor_senior.

> ⚠️ Las 3 últimas son **modificaciones en BD que NO están en `supabase/migrations/`**. Si se hace `supabase db reset` o restauración, se perderán. Crear una migration consolidada en próxima sesión.

---

## Pendiente próxima sesión

### 1. Causa raíz corrupción FS Windows (alta prioridad)

Durante esta sesión, **cada Edit/Write desde Cowork al FS de Juan acababa truncando archivos** y dejando NUL bytes al final. Causaba errores TSC sin parar. Posible origen: VS Code o editor abierto sincronizando contenido viejo sobre los cambios del sandbox.

**Acción al arrancar sesión nueva**: pedir a Juan cerrar todos los editores de código antes de empezar. Si reaparece, investigar configuración de auto-save / file watcher.

### 2. P2 cosméticos del informe Claude Browser (parados por #1)

Quedan 4 fixes mecánicos:
- `SelectorVista.tsx` línea 84: "Tabla tipo Excel" → "Tabla".
- `MisLlamadasView.tsx` línea ~163: mensaje contextual para master cuando empty.
- `BandejaCard.tsx` + `BandejaEnviadosCard.tsx`: `title={op.empresa_nombre}` en el `<p>` del nombre.
- `NuevoLeadModal.tsx` línea 30 + `EditarLeadModal.tsx` línea 31: ampliar zod `empresa_nombre` con `.refine(v => !/\d{6,}/.test(v))` y `.refine(v => !/@/.test(v))`.

### 3. Capa B Google Calendar (cuando Juan tenga OAuth listo)

Pre-requisito Juan:
1. `console.cloud.google.com` → proyecto "Valere CRM" → habilitar Google Calendar API.
2. OAuth 2.0 Client ID tipo Web. Redirect URIs:
   - `https://valere-v2.pages.dev/auth/google/callback`
   - `http://localhost:3000/auth/google/callback`
3. Copiar Client ID + Client Secret. Pasárselos a Cowork para añadirlos a Supabase Secrets.

Scope necesario: `https://www.googleapis.com/auth/calendar.events`.

Plan implementación:
- Edge Function `google-oauth-callback` (recibe code, intercambia por refresh_token, guarda en `user_profiles.google_calendar_refresh_token` cifrado).
- Edge Function `sync-to-google` (cron cada 5 min: detecta `oportunidades.fecha_siguiente_accion` modificadas, crea/actualiza eventos en Google Calendar del responsable).
- Columna `oportunidades.google_event_id` para trazabilidad.
- Botón "Conectar mi Google Calendar" en perfil de usuario.

### 4. Outlook (Capa D)

0 código. Cuando Capa B esté validada ≥1 semana:
- Pasar a Carolina link de instrucciones de **Google Workspace Sync for Outlook**.
- Configura una vez en su Outlook, sincroniza automático.

### 5. Crear migration consolidada para los fixes BD aplicados vía MCP

Documentar en `supabase/migrations/20260618_fixes_produccion_color_rls_master.sql` los 3 cambios:
- `ALTER TABLE eventos ADD COLUMN color text`
- `CREATE POLICY notif_insert ON notificaciones FOR INSERT WITH CHECK (...)`
- `DROP+CREATE v_mis_oportunidades` con 28 campos y patch master.

Sin esto, si alguien clona el repo y hace `supabase db reset`, perderá las correcciones.

---

## Lecciones aprendidas / decisiones operativas

1. **CF Pages falla silenciosamente si el build TypeScript falla** — siempre verificar build local antes de pushear.
2. **Mensaje commit multilínea en PowerShell**: usar `git commit -F archivo.txt`. El `-m "..."` rompe con saltos.
3. **Regenerar tipos TS Supabase**: `npx supabase gen types ... | Out-File -Encoding utf8 archivo.ts`. El `>` redirect en PowerShell 5 escribe UTF-16 LE y corrompe.
4. **Cherry-pick siempre que el commit esté en rama lateral por error**: `git checkout main && git pull && git cherry-pick <sha> && git push origin main`.
5. **Si CF Pages no cambia el hash del bundle tras push**: revisar el dashboard de Cloudflare Pages, no asumir caché. El build pudo fallar.

---

## Acción inmediata Juan al volver

```powershell
cd C:\Users\joliv\valere-v2
git pull origin main
cat docs/ESTADO.md
cat .cowork/outbox/2026-06-18T20-00-00-sprint-carolina-cerrado-capa-A.md
```

Después decidir si arrancar P2 (~30 min) o ya Capa B Google Calendar (~3-4h + OAuth setup).

— Cowork, 2026-06-18.
