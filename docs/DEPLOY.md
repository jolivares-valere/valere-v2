# Deploy

Dos estrategias según el caso de uso.

## Comparativa rápida

| | Cloudflare Tunnel | Vercel |
|---|---|---|
| Setup | 5 min | 15 min |
| Coste | Gratis | Gratis (plan Hobby) |
| URL | Cambia en cada arranque (o fija con subdomain) | Fija: `valere.vercel.app` o custom |
| Requiere tu PC encendido | Sí | No |
| CI/CD automático | No | Sí (deploy en cada push) |
| Preview URLs por PR | No | Sí |
| Para demo a cliente | ⚠️ | ✅ |
| Para testing de compañeros | ✅ | ✅ |
| Para producción | ❌ | ✅ |

**Recomendación**: Cloudflare Tunnel para pruebas puntuales rápidas. Vercel para uso frecuente, demos y producción.

## Opción A — Cloudflare Tunnel (5 min, tu PC)

### Prerrequisitos

- `npm run dev` corriendo en `localhost:3000`
- Tener cuenta de Cloudflare (gratis)

### Pasos

1. Descargar `cloudflared` en tu PC: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

2. Para un túnel **rápido y efímero** (URL aleatoria que expira al cerrar):

   ```powershell
   cloudflared tunnel --url http://localhost:3000
   ```

   Te devuelve una URL tipo `https://<random-name>.trycloudflare.com`. Comparte con tus compañeros.

3. Para túnel **persistente con subdomain propio** (requiere dominio en Cloudflare):

   ```powershell
   # Autenticar
   cloudflared tunnel login

   # Crear túnel nombrado
   cloudflared tunnel create valere-dev

   # Configurar DNS: mapear subdomain al tunnel
   cloudflared tunnel route dns valere-dev valere-dev.tu-dominio.com

   # Correr
   cloudflared tunnel run valere-dev
   ```

### Cuidado

- La URL queda pública mientras el túnel esté activo. No pongas datos sensibles de producción.
- Cuando apagues el PC o cierres `cloudflared`, la URL deja de funcionar.
- Para producción real usa Vercel.

## Opción B — Vercel (15 min, sin PC)

### Prerrequisitos

- Cuenta de Vercel (gratis en https://vercel.com/signup)
- Repo en GitHub (ya lo tienes: `jolivares-valere/valere-v2`)
- Credenciales Supabase para producción

### Pasos

1. **Importar repo** en Vercel:
   - Dashboard de Vercel → "Add New..." → "Project"
   - Seleccionar `jolivares-valere/valere-v2`
   - Framework detectado automáticamente: Vite
   - Root directory: `./` (default)
   - Build command: `npm run build` (default)
   - Output directory: `dist` (default)

2. **Environment variables** (muy importante):

   ```
   VITE_SUPABASE_URL=<tu-project-url>
   VITE_SUPABASE_ANON_KEY=<tu-anon-key>
   ```

   Estas se obtienen en Supabase → Project Settings → API.

3. **Branch settings**:
   - Production branch: `main`
   - Preview deploys: habilitados para todas las ramas (por defecto)

4. Click **Deploy**. En 2-3 min tienes URL tipo `valere.vercel.app`.

### Deploys posteriores

Automáticos:
- Push a `main` → deploy a producción.
- Push a cualquier otra rama → preview URL automático.
- PR abierto → Vercel comenta en el PR con el preview URL.

### Dominio custom

Si quieres `app.valere.es` o similar:
- Vercel → Settings del proyecto → Domains → Add
- Seguir instrucciones para configurar DNS (apuntar CNAME a `cname.vercel-dns.com`).

### CSP en producción

Recordatorio: el `Content-Security-Policy` en `index.html` (añadido en FASE 28 hardening) restringe `connect-src` a:
- `'self'`
- `ws:` y `wss:`
- `https://*.supabase.co` (BD + auth + storage)
- `wss://*.supabase.co` (realtime)
- `https://generativelanguage.googleapis.com` (Gemini, aunque ahora va via Edge Function)
- `https://fonts.googleapis.com` / `https://fonts.gstatic.com` (Inter + Outfit)

Si Vercel añade Analytics u otros scripts, habrá que aflojar el CSP. Revisar consola del navegador la primera vez que accedas en producción por si algo se queja.

## Edge Function `chat-consultor`

El frontend en Vercel se conecta a la Edge Function alojada en Supabase. **No se despliega en Vercel**, va en Supabase.

Instrucciones completas en [`supabase/functions/chat-consultor/README.md`](../supabase/functions/chat-consultor/README.md).

Resumen:
```bash
supabase login
supabase link --project-ref <PROJECT_REF>
supabase secrets set GEMINI_API_KEY=tu-key
supabase secrets set ALLOWED_ORIGIN=https://valere.vercel.app
supabase functions deploy chat-consultor
```

## Post-deploy checklist

Tras el primer deploy:

- [ ] Login funciona (comprueba que `VITE_SUPABASE_*` son correctos)
- [ ] Dashboard carga con datos
- [ ] Crear una empresa de prueba
- [ ] Cambiar etapa de una oportunidad → toast + borrador de contrato
- [ ] `/admin` accesible solo para master/manager
- [ ] `/calendario` carga sin error PGRST200 (FK `eventos.usuario_id` debe estar aplicada)
- [ ] Chat IA responde (requiere deploy de Edge Function + secrets)
- [ ] Consola del navegador sin errores CSP (si los hay → ajustar `connect-src` en `index.html`)

## Rollback

### En Vercel
Dashboard → Deployments → seleccionar uno anterior → "Promote to Production".

### En Cloudflare Tunnel
Matar el proceso. No hay versionado.

### En Supabase (si se aplicó una migration errónea)
Ejecutar el SQL inverso manualmente en SQL Editor. No hay rollback automático. Por eso:
- **Siempre verificar `SELECT count(*)` antes de DROP**.
- Para cambios de schema no-triviales, backup previo via Supabase Dashboard → Database → Backups.
