# Plan migración `valere-gestion-potencias` a Cloudflare Pages

> Generado 2026-04-24 por Cowork. Plan ejecutable paso a paso.
> Requiere refactor previo para eliminar `VITE_GEMINI_API_KEY` del frontend.
> Tiempo total estimado: 3-4h (1.5h refactor + 1.5h migración + 0.5h verificación).

---

## Resumen

Potencias está desplegado en Vercel (ahora suspendido). Toca migrar a Cloudflare Pages siguiendo el mismo patrón que el CRM. Pero **antes** hay que refactorizar el frontend para que no exponga la key Gemini en el bundle público — si migramos tal cual, perpetuamos la fuga.

Orden:

1. **Refactor Potencias** (1.5h) — eliminar `VITE_GEMINI_API_KEY` del frontend, unificar toda la lógica Gemini en la Vercel Serverless Function.
2. **Migración Cloudflare Pages** (1.5h) — crear proyecto, env vars, deploy.
3. **Verificación** (30 min) — smoke tests + revisar bundle final sin key.

---

## PREREQUISITO — Refactor `VITE_GEMINI_API_KEY` out of frontend

### Contexto

Según inventario Gemini cross-app (2026-04-24):

- `src/lib/pdf-parser.ts` lee `import.meta.env.VITE_GEMINI_API_KEY` y crea `new GoogleGenAI({ apiKey })` directamente en el navegador. ❌ La key queda en el bundle JS público.
- `api/extract-pdf-data.ts` (Vercel Serverless Function) hace lo mismo pero server-side. ✅ Correcto.

**Objetivo refactor**: eliminar el camino del frontend (`pdf-parser.ts` llamando directamente a Gemini) y que toda la extracción de PDFs pase siempre por la función serverless.

### Paso 1 — Bajar repo a local

Si aún no lo tienes:

```powershell
cd C:\dev  # o donde sueles tener tus repos
git clone https://github.com/jolivares-valere/valere-gestion-potencias.git
cd valere-gestion-potencias
npm install
```

### Paso 2 — Refactorizar `pdf-parser.ts`

Cambiar el archivo para que llame a `/api/extract-pdf-data` en lugar de importar `@google/genai` directamente.

**Antes** (simplificado):

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

export async function parsePdfFile(file: File) {
  const text = await extractTextFromPdf(file);
  const result = await ai.models.generateContent({ /* ... */ });
  return result;
}
```

**Después**:

```typescript
export async function parsePdfFile(file: File) {
  // FormData para enviar el file al endpoint serverless
  const formData = new FormData();
  formData.append("pdf", file);

  const response = await fetch("/api/extract-pdf-data", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Extract failed: ${response.statusText}`);
  }

  return response.json();
}
```

Y adaptar `api/extract-pdf-data.ts` para aceptar FormData:

```typescript
import type { VercelRequest, VercelResponse } from "@vercel/node";
import formidable from "formidable";
import { GoogleGenAI } from "@google/genai";
import { readFile } from "fs/promises";

export const config = {
  api: { bodyParser: false }, // formidable gestiona el body
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const form = formidable({ maxFileSize: 10 * 1024 * 1024 });
  const [_fields, files] = await form.parse(req);
  const pdfFile = Array.isArray(files.pdf) ? files.pdf[0] : files.pdf;

  if (!pdfFile) return res.status(400).json({ error: "No PDF uploaded" });

  const pdfBuffer = await readFile(pdfFile.filepath);

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!, // server-side, sin VITE_
  });

  // Lógica de extracción (la que ya tenías)
  // ...

  return res.json({ /* resultado */ });
}
```

### Paso 3 — Eliminar la dependencia del frontend

En `package.json`:

```json
{
  "dependencies": {
    // Mover "@google/genai" de dependencies a devDependencies si solo se
    // usa en el serverless (es backend). O dejarlo en dependencies si
    // también el serverless lo importa — depende de cómo Vercel empaquete.
    // Lo importante: el bundle del FRONTEND no lo debe contener.
  }
}
```

Verificar con `npm run build` que el tamaño del bundle del frontend se reduce (la librería `@google/genai` es bastante grande).

### Paso 4 — Eliminar `VITE_GEMINI_API_KEY` del `.env.example`

```diff
# .env.example
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
- VITE_GEMINI_API_KEY=your-gemini-key
```

Y en su sitio poner un comentario explicativo:

```
# GEMINI_API_KEY (server-side) se configura en las env vars de Vercel/Cloudflare,
# no en .env local. Se consume desde api/extract-pdf-data.ts.
```

### Paso 5 — Verificar que el frontend no tiene la key

```powershell
npm run build
# Después, buscar la key en los archivos generados:
cd dist
Select-String -Path "assets\*.js" -Pattern "AIzaSy"
# Debe devolver CERO resultados. Si aparece, la key sigue en el bundle.
```

### Paso 6 — Commit + PR

```powershell
git checkout -b claude/refactor-gemini-backend
git add .
git commit -m "security(refactor): eliminar VITE_GEMINI_API_KEY del frontend, todo via serverless"
git push origin claude/refactor-gemini-backend
gh pr create --title "security: Gemini solo server-side (refactor pre-migración Cloudflare)"
```

Mergear cuando TSC pase y los tests sigan verdes.

---

## MIGRACIÓN — Cloudflare Pages

### Paso 7 — Añadir `public/_redirects` para SPA routing

Mismo que el CRM. Crear archivo `public/_redirects` con:

```
/*    /index.html   200
```

Commit directo en `main` (o incluir en el PR del refactor).

### Paso 8 — Crear proyecto en Cloudflare Pages

Juan, en el dashboard de Cloudflare (cuenta `Jolivares@valereconsultores.com`):

1. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Autorizar org `jolivares-valere` si no está.
3. Seleccionar repo `valere-gestion-potencias`.
4. Configurar build:
   - **Project name**: `valere-gestion-potencias`
   - **Production branch**: `main`
   - **Framework preset**: `None` (o Vite si aparece).
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. **NO pulsar Save and Deploy todavía** — añadir env vars primero.

### Paso 9 — Configurar env vars en Cloudflare

En el panel del proyecto Cloudflare:

| Variable | Valor | Scope |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://alesfvxqtwlrwlmkoosg.supabase.co` | Production + Preview |
| `VITE_SUPABASE_ANON_KEY` | (copiar de Supabase dashboard → Potencias → API) | Production + Preview |
| `GEMINI_API_KEY` | (key rotada `...wqag` o nueva si rotación) | Production + Preview |
| `RESEND_API_KEY` | (key nueva rotada hoy `Valere gestion potencia`) | Production + Preview |

**Importante**: `GEMINI_API_KEY` **SIN prefijo `VITE_`** — solo el backend (Cloudflare Functions serverless) la lee. El frontend ya no la necesita después del refactor.

### Paso 10 — Pages Functions (equivalente a Vercel Serverless Functions)

Cloudflare Pages soporta funciones serverless nativamente — las tienes que portar de `api/*.ts` a `functions/api/*.ts`.

**Antes** (Vercel):

```typescript
// api/extract-pdf-data.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ...
}
```

**Después** (Cloudflare Pages Functions):

```typescript
// functions/api/extract-pdf-data.ts
export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const formData = await request.formData();
  const pdfFile = formData.get("pdf") as File;

  const ai = new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
  });

  // ...
  return new Response(JSON.stringify({ /* ... */ }), {
    headers: { "Content-Type": "application/json" },
  });
}

interface Env {
  GEMINI_API_KEY: string;
}
```

**Nota**: las Pages Functions de Cloudflare usan Workers runtime, no Node.js. Algunas APIs de Node (como `fs`, `formidable`) no existen. Usar `request.formData()` nativo.

### Paso 11 — Deploy

Pulsar **Save and Deploy** en Cloudflare. El primer build debería completarse en ~2-3 min.

URL inicial: `valere-gestion-potencias.pages.dev`.

---

## VERIFICACIÓN

### Paso 12 — Smoke tests

1. Abrir `valere-gestion-potencias.pages.dev`.
2. Login con email Valere.
3. Verificar que el dashboard carga y muestra clients.
4. Probar el **parser de PDFs**:
   - Subir un PDF de prueba (factura eléctrica real).
   - Verificar que extrae CUPS, potencias, CIF, etc.
   - Verificar en DevTools Network que la llamada va a `/api/extract-pdf-data` (no directo a `generativelanguage.googleapis.com`).
5. Probar un flujo completo: crear cliente → añadir supply → crear expediente → ciclos.

### Paso 13 — Auditoría del bundle

Con DevTools → Sources, buscar "AIzaSy" en el bundle de producción. **No debe aparecer**.

```powershell
# Desde local también:
cd dist
Select-String -Path "assets\*.js" -Pattern "AIzaSy"
# Debe dar 0 resultados
```

### Paso 14 — Avisar al equipo del nuevo URL

Mismo flujo que con el CRM: avisar del nuevo URL (o conectar dominio custom `potencias.valereconsultores.com`).

### Paso 15 — Limpieza Vercel

Tras 1 semana estable en Cloudflare:

1. En Vercel, eliminar el proyecto `valere-gestion-potencias`.
2. Mantener la cuenta Vercel para evitar rotura de otros posibles proyectos.

---

## Dominio custom (opcional, post-migración)

Cuando todo esté estable:

1. En Cloudflare Pages → proyecto `valere-gestion-potencias` → **Custom domains**.
2. Añadir `potencias.valereconsultores.com`.
3. Configurar DNS (si el dominio está en Arsys, añadir CNAME apuntando a Cloudflare).
4. Esperar propagación (<24h).

Alternativa: si decidís transferir el dominio a Cloudflare (registrar), el DNS se gestiona automáticamente y la configuración es inmediata.

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Pages Functions no soporta todas las libs que usa la Vercel function | Media | Revisar código, reemplazar dependencias Node-specific con alternativas Web API |
| Break del parser de PDFs durante refactor | Media | Testing local con PDFs de prueba antes de mergear. Feature flag opcional. |
| Env vars mal copiadas | Baja | Revisar uno por uno antes del primer deploy |
| Usuarios con marcador viejo no reciben aviso | Baja | Mandar comunicado por Slack/email. Dominio custom redirige. |
| Rotación key Gemini genera downtime breve | Baja | Hacer rotación en ventana de baja actividad |

---

## Orden recomendado

1. **Refactor Gemini backend-only** + PR + merge.
2. **Añadir `public/_redirects`** al repo.
3. **Rotación defensiva Gemini key** (opcional — si quieres aprovechar para rotar también).
4. **Setup Cloudflare Pages** + env vars.
5. **Verificar funcionalidad**.
6. **Comunicado equipo** nuevo URL.
7. **Limpieza Vercel** tras 1 semana estable.

Tiempo total: 3-4h de trabajo efectivo. No es sprint dedicado, se puede hacer en una mañana.
