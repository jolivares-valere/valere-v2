# Prompt agente browser — sábado 2026-04-26 (puntos 2+3 del sprint unificación)

> Copia y pega este prompt al agente Claude in Chrome. Es autocontenido.

---

```
Objetivo: ejecutar 2 tareas para preparar el switch de Potencias del domingo 
noche. Total estimado: 2-3h.

CONTEXTO
- Sprint unificación Potencias → CRM canónico está en marcha.
- El CRM (https://gtphkowfcuiqbvfkwjxb.supabase.co) ya tiene aplicada la 
  migration aditiva con todas las tablas Potencias (expedientes, ciclos, 
  solicitudes_potencia, savings_calculations, etc.). Tablas vacías 
  esperando los datos.
- Domingo noche: Cowork ejecutará la migración de datos vía MCP.
- Para que el lunes los compañeros puedan acceder a Potencias en el nuevo 
  URL con el backend unificado, hace falta:
  1. Crear los 3 usuarios Potencias en auth.users del CRM (para que existan 
     y puedan loguear con magic link).
  2. Subir el código de Potencias a Cloudflare Pages con env vars apuntando 
     al CRM unificado + refactor previo de seguridad (eliminar 
     VITE_GEMINI_API_KEY del frontend).

REGLAS
- NO mostrar valores de credenciales en chat.
- NO modificar el proyecto Supabase viejo de Potencias 
  (alesfvxqtwlrwlmkoosg) — sigue activo durante el sprint.
- Si algo falla, parar y reportar el error literal.

═══════════════════════════════════════════
TAREA 1 — Invitar 3 usuarios en Supabase Auth (5 min)
═══════════════════════════════════════════

PASO 1.1 — Ir al dashboard
- https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb/auth/users

PASO 1.2 — Para CADA email, pulsar "Invite user":

1. arodriguez@valereconsultores.com
   - Nombre/Username: Antonio Rodriguez (si pide)
   - Send invite.

2. administracion@valereconsultores.com
   - Nombre: Carolina Maciñeiras
   - Send invite.

3. soporte@valereconsultores.com
   - Nombre: Julia Ruiz
   - Send invite.

PASO 1.3 — Verificar
- Recargar la página → los 3 usuarios deben aparecer en la lista.
- Estado: "Waiting for verification" o similar (es OK, han de hacer click 
  en el magic link).
- Anotar los UUIDs (id) de los 3 nuevos para reportarlos a Juan al final.

═══════════════════════════════════════════
TAREA 2 — Migrar Potencias a Cloudflare con refactor (2h)
═══════════════════════════════════════════

CONTEXTO
- Repo GitHub: https://github.com/jolivares-valere/valere-gestion-potencias
- Vercel suspendido — no usable.
- Backend destino: CRM UNIFICADO (gtphkowfcuiqbvfkwjxb).
- Refactor obligatorio: VITE_GEMINI_API_KEY expuesta en bundle del frontend, 
  hay que mover a serverless function (que ya existe: api/extract-pdf-data.ts).

═══════════════════════════════════════════
FASE 1 — Refactor seguridad (1.5h)
═══════════════════════════════════════════

PASO 2.1 — Pedirle a Juan que clone el repo localmente (PowerShell):

   cd $HOME
   git clone https://github.com/jolivares-valere/valere-gestion-potencias.git
   cd valere-gestion-potencias
   git checkout -b claude/refactor-cloudflare
   npm install

   (Si ya lo tiene clonado, solo: git pull && npm install)

PASO 2.2 — Inspeccionar src/lib/pdf-parser.ts
- Buscar: import.meta.env.VITE_GEMINI_API_KEY
- Confirmar que crea cliente Gemini directamente en el frontend (vulnerabilidad).

PASO 2.3 — Refactor pdf-parser.ts
- Sustituir la llamada directa a Gemini por fetch a /api/extract-pdf-data:

  export async function parsePdfFile(file: File) {
    const formData = new FormData()
    formData.append("pdf", file)
    const response = await fetch("/api/extract-pdf-data", {
      method: "POST",
      body: formData,
    })
    if (!response.ok) throw new Error(`Extract failed: ${response.statusText}`)
    return response.json()
  }

- Eliminar el import de @google/genai del frontend.
- Adaptar api/extract-pdf-data.ts para Cloudflare Pages Functions (formato 
  distinto a Vercel) — ver siguiente paso.

PASO 2.4 — Adaptar api/ a Cloudflare Pages Functions
- Cloudflare Pages usa formato distinto a Vercel para serverless functions.
- Mover api/extract-pdf-data.ts → functions/api/extract-pdf-data.ts
- Adaptar la firma:

  export async function onRequestPost(context: { request: Request; env: Env }) {
    const { request, env } = context
    const formData = await request.formData()
    const pdfFile = formData.get("pdf") as File
    
    // Importar GoogleGenAI usando esm.sh para compatibilidad Cloudflare
    const { GoogleGenAI } = await import("https://esm.sh/@google/genai")
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })
    
    // ... lógica de extracción que ya existe ...
    
    return new Response(JSON.stringify({ /* resultado */ }), {
      headers: { "Content-Type": "application/json" },
    })
  }
  
  interface Env {
    GEMINI_API_KEY: string
  }

PASO 2.5 — Quitar VITE_GEMINI_API_KEY del .env.example
- Editar .env.example
- Borrar línea VITE_GEMINI_API_KEY=...
- Añadir comentario:
  # GEMINI_API_KEY (server-side) se configura en Cloudflare env vars

PASO 2.6 — Crear public/_redirects
- Archivo nuevo public/_redirects con contenido:
    /*    /index.html   200

PASO 2.7 — Verificar bundle limpio
- Pedirle a Juan ejecutar:
    npm run build
    cd dist
    Select-String -Path "assets/*.js" -Pattern "AIzaSy"
- Si NO devuelve resultados → bundle limpio ✅
- Si devuelve algo → la key sigue exponiendo, revisar imports.

PASO 2.8 — Commit + push
- Pedir a Juan:
    git add .
    git commit -m "security(refactor): VITE_GEMINI_API_KEY -> serverless + redirects SPA"
    git push -u origin claude/refactor-cloudflare
    gh pr create --title "security(refactor): Gemini server-side + Cloudflare-ready"
    # Mergear a main (CI verde + tests).

═══════════════════════════════════════════
FASE 2 — Setup Cloudflare Pages (30 min)
═══════════════════════════════════════════

PASO 2.9 — Conectar repo en Cloudflare
- https://dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git
- Autorizar GitHub (si no está) → seleccionar repo valere-gestion-potencias
- Branch: main
- Project name: valere-gestion-potencias
- Framework preset: Vite (o None)
- Build command: npm run build
- Build output directory: dist

PASO 2.10 — Env vars (CRÍTICO antes de deploy)

Añadir en Production + Preview:

| Variable | Valor |
|---|---|
| VITE_SUPABASE_URL | https://gtphkowfcuiqbvfkwjxb.supabase.co |
| VITE_SUPABASE_ANON_KEY | (copiar de Supabase Dashboard CRM → Settings → API → anon public key) |
| GEMINI_API_KEY | (la nueva key crm-asistente-rag-2026-04-25-v2 sufijo ...8csY que ya está en Supabase secrets) |
| RESEND_API_KEY | (la key Resend "Valere gestion potencia" rotada anteayer) |

⚠️ IMPORTANTE:
- VITE_SUPABASE_URL apunta al CRM UNIFICADO, NO al proyecto viejo de Potencias.
- GEMINI_API_KEY y RESEND_API_KEY van SIN VITE_ — solo backend.

PASO 2.11 — Save and Deploy
- Pulsar Save and Deploy.
- Esperar 2-3 min.
- URL final: valere-gestion-potencias.pages.dev

═══════════════════════════════════════════
FASE 3 — Verificación (30 min)
═══════════════════════════════════════════

PASO 2.12 — Verificar deploy
- valere-gestion-potencias.pages.dev → debe mostrar la página de login.
- DevTools Console → sin errores.
- DevTools Sources → buscar "AIzaSy" en archivos JS → debe dar 0 resultados 
  (si no, el bundle aún tiene la key).

PASO 2.13 — NO entrar al login todavía
- El backend CRM aún no tiene los datos de Potencias migrados (eso es el 
  domingo noche).
- Si haces login, verás la app vacía (sin clientes/expedientes) — esperado.
- Solo verificar que el deploy responde y la UI carga.

═══════════════════════════════════════════
REPORTE FINAL A JUAN
═══════════════════════════════════════════

> ## Sprint unificación — Tareas sábado completadas
> 
> ### Tarea 1 — Usuarios invitados
> - Antonio Rodriguez (UUID: ...): ✅ invitado
> - Carolina Maciñeiras (UUID: ...): ✅ invitado
> - Julia Ruiz (UUID: ...): ✅ invitado
> - Estado: esperando que activen magic link.
> 
> ### Tarea 2 — Potencias en Cloudflare
> - Refactor VITE_GEMINI_API_KEY: ✅ frontend limpio
> - api/ adaptado a Cloudflare Pages Functions: ✅
> - PR mergeado a main: PR #X
> - Cloudflare Pages URL: valere-gestion-potencias.pages.dev
> - Build status: ✅ exitoso
> - Env vars configuradas: ✅ apuntando al CRM unificado
> - Bundle auditado: ✅ sin keys expuestas
> 
> ### Estado para domingo
> - Listo para que Cowork ejecute migración de datos a las 22:00.
> - Sin acceso a datos hasta el switch.
> 
> ### Siguiente acción
> Juan: enviar comunicado al equipo (texto en docs/COMUNICADO_VENTANA_CORTE_DOMINGO.md)

QUÉ NO HACER
- NO migrar datos manualmente — eso es trabajo de Cowork el domingo.
- NO borrar el proyecto Supabase viejo de Potencias.
- NO hacer login con datos reales en la nueva URL hasta el switch.
- NO comunicar el nuevo URL al equipo todavía — Juan lo hará.
```
