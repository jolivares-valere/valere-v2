# Investigación — ¿Hay código AI Studio en las apps satélite?

> 2026-04-26 · Cowork autónomo. Disparada por sospecha de Juan: "parte de la programación de gestión de excedentes y posiblemente potencias se hizo en Google AI Studio, y eso podría explicar problemas de comunicación / datos no encontrados".

---

## TL;DR — Veredicto

| Pregunta | Respuesta |
|---|---|
| ¿El **repo CRM** (`valere-v2`) tiene código generado por AI Studio? | **No.** Cero fingerprints. Limpio. |
| ¿La **app satélite Potencias** desplegada (`valere-gestion-potencias.pages.dev`) tiene código AI Studio en producción? | **No** (en el bundle actual). |
| ¿La app satélite Potencias **se originó** en AI Studio? | **Probable (alta confianza), pendiente de PowerShell de Juan para confirmar al 100 %.** Indicios fuertes: carpeta de origen `musing-kalam/` (patrón nombre AI Studio Build) en Drive sin git remoto, plan de refactor previo confirma `import { GoogleGenAI } from "@google/genai"` directo en cliente con `VITE_GEMINI_API_KEY` en bundle (patrón canónico de export AI Studio). |
| ¿Hay código AI Studio en **Excedentes / Energética**? | **Imposible saber desde aquí** — esos repos no están mounted, los URLs públicos `valere-gestion-energetica.pages.dev` / `valere-excedentes.pages.dev` / `valere-gestion-excedentes.pages.dev` **no responden** (HTTP 000). Sólo Vercel `valere-gestion-energetica.vercel.app` devuelve 404 (cuenta Vercel suspendida desde 2026-04-24). |
| ¿Esto explica los "problemas de comunicación / datos no encontrados"? | **NO directamente, pero la investigación destapó OTRO problema más grave que sí lo explica.** Ver hallazgo 🚨. |

---

## 🚨 Hallazgo crítico (no era el AI Studio)

**El bundle JS público de `https://valere-gestion-potencias.pages.dev` apunta al Supabase del CRM (`gtphkowfcuiqbvfkwjxb`), NO al satélite (`alesfvxqtwlrwlmkoosg`)**, pero la migración de schema está incompleta.

### Cómo lo verifiqué

`curl https://valere-gestion-potencias.pages.dev/assets/index-CjD9wVSh.js` (1.34 MB) y grep:

- `https://gtphkowfcuiqbvfkwjxb.supabase.co` → URL del CRM (PROYECTO VALERE), no la satélite.
- Anon JWT del CRM embebido en el bundle público (`...eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0cGhrb3dmY3VpcWJ2Zmt3anhiIi...role=anon`).
- Tablas que el bundle consulta (`.from(...)`): `expedientes`, `power_requests`, `clients`, `supplies`, `profiles`, `comercializadoras`, `comercializadora_docs`, `savings_calculations`, `ciclos`, `status_log`, `client_communications`, `expediente_documents`, `documentacion`, `regulated_rates`.

### Estado real de esas tablas en el CRM (objetivo del bundle)

Probadas con la anon key del bundle contra `https://gtphkowfcuiqbvfkwjxb.supabase.co/rest/v1/<tabla>?limit=0`:

| Tabla que Potencias consulta | Existe en CRM | Filas | Síntoma para Juan |
|---|---|---|---|
| `expedientes` | ✅ Sí | **0** | "Mis expedientes han desaparecido" |
| `comercializadoras` | ✅ Sí | **0** | "El listado está vacío" |
| `savings_calculations` | ✅ Sí | **0** | Cálculos no aparecen |
| `ciclos` | ✅ Sí | **0** | Sin ciclos |
| `status_log` | ✅ Sí | **0** | Sin historial |
| `expediente_documents` | (probable ✅) | (probable 0) | — |
| `clients` | ❌ NO existe (PostgREST sugiere `documentos`) | — | **Error 404 al cargar la app** |
| `supplies` | ❌ NO existe (PostgREST sugiere `user_profiles`) | — | **Error 404 al cargar la app** |
| `profiles` | ❌ NO existe (PostgREST sugiere `user_profiles`) | — | Auth + listados rotos |
| `power_requests` | ❌ NO existe (PostgREST sugiere `propuestas`) | — | Pantalla principal de Potencias rota |
| `regulated_rates` | ❌ NO existe (PostgREST sugiere `boe_regulated_prices`) | — | Sin tarifas reguladas |
| `client_communications` | ❌ NO existe | — | Sin comunicaciones |
| `client_documents` | ❌ NO existe (sugiere `documentos`) | — | Sin documentos |

**Datos reales (`alesfvxqtwlrwlmkoosg`):** 41 expedientes, 75 supplies, 30 clientes — todos huérfanos del frontend. El frontend ya no apunta a la BBDD donde están.

### Hipótesis de cómo se rompió

Repasando docs (`MIGRATION_RUNBOOK_DOMINGO.md`, `PLAN_UNIFICACION_FASES_4_5_2026-04-26.md`):

- Domingo planificado: migrar Potencias de Vercel → Cloudflare Pages, con `VITE_SUPABASE_URL` apuntando al CRM canónico para preparar Fase 4 de unificación.
- Lo que aparentemente pasó: **se hizo el cutover de URL antes de migrar los datos** y antes de crear todas las tablas en CRM. La migración aditiva (`supabase/migrations/20260425_unificacion_potencias_aditiva.sql`) crea algunas tablas (vacías) pero no todas las necesarias, y los `~408 filas` del protocolo `pg_dump` (`scripts/unificacion_fase2_protocolo.md`) **nunca se importaron**.
- Resultado: el frontend habla con la BBDD equivocada (ahora vacía / con tablas faltantes), y los datos viven en una BBDD a la que nadie llama.

**Severidad: ALTA.** Esto bloquea el uso real de Potencias en producción y casi seguro es la fuente de los "problemas de comunicación / datos que no se encuentran" que Juan observa.

---

## Inventario de la investigación AI Studio (lo encargado)

### 1. Repo CRM Valere (`valere-v2`) — auditoría completa

Buscado por:

```
aistudio.google.com  ai.google.dev  makersuite  generativelanguage.googleapis.com
@google/genai  @google/generative-ai  GoogleGenAI  GoogleGenerativeAI  getGenerativeModel
gemini  PaLM  AIzaSy* (API keys hardcoded)  webhook  n8n  zapier  firebase
```

Resultados relevantes (filtrados de matches obvios en docs/):

| Match | Ubicación | ¿Sospechoso? |
|---|---|---|
| `import { GoogleGenAI } from 'npm:@google/genai@1.0.0'` | `supabase/functions/_shared/ai-adapter.ts`, `supabase/functions/chat-consultor/index.ts` | ❌ No — server-side Deno, propio. |
| `import { GoogleGenAI } from "@google/genai"` | `scripts/generate-help-embeddings.mjs` | ❌ No — script CI Node, propio. |
| `https://generativelanguage.googleapis.com` (CSP) | `index.html` línea 6 | ❌ No — header CSP estándar. |
| Hardcoded `AIzaSy...YuE` | `docs/AUDIT_SEGURIDAD_2026-04-24.md` línea 29 (citando vulnerabilidad pasada en `INSTRUCCIONES.md`) | ⚠️ Histórico — ya rotada, ya documentada. |

**Conclusión CRM:** uso de Gemini limpio, server-side, propio. No hay rastros de export AI Studio.

### 2. Verificación del inventario `docs/INVENTARIO_GEMINI_2026-04-25.md`

Las 5 ubicaciones registradas siguen vigentes:

1. `supabase/functions/_shared/ai-adapter.ts` — Edge Function adapter ✅
2. `supabase/functions/ask-crm-docs/index.ts` — RAG asistente ✅ (v10 ACTIVE en Supabase)
3. `supabase/functions/chat-consultor/index.ts` — chat huérfano ✅ (v7 ACTIVE, sin frontend que lo invoque)
4. `scripts/generate-help-embeddings.mjs` — pipeline embeddings CI ✅
5. `src/features/chat-ia/ChatIAPanel.tsx` — frontend, sin key ✅

**Sin sorpresas.** El inventario es consistente con código a mano (no AI Studio).

### 3. URLs públicas apps satélite

Probadas con `curl -sI`:

| URL | HTTP | Estado |
|---|---|---|
| `valere-gestion-potencias.pages.dev` | 200 | **Vivo** (Cloudflare Pages) |
| `valere-gestion-potencias.vercel.app` | 200 | Vivo (legacy, espejo previo a la migración) |
| `valere-gestion-energetica.pages.dev` | 000 (no resuelve) | No existe |
| `valere-excedentes.pages.dev` | 000 | No existe |
| `valere-gestion-excedentes.pages.dev` | 000 | No existe |
| `valere-energetica.pages.dev` | 000 | No existe |
| `valere-gestion-energetica.vercel.app` | 404 | Vercel suspendido (2026-04-24) |

### 3.1. Inspección bundle Potencias — `index-CjD9wVSh.js` (1,34 MB)

Resultados grep sobre el bundle minificado:

| Buscado | Hits |
|---|---|
| `aistudio.google.com` | 0 |
| `generativelanguage.googleapis.com` | 0 |
| `@google/genai`, `@google/generative-ai` | 0 |
| `GoogleGenAI`, `GoogleGenerativeAI` | 0 |
| `gemini-*` (modelos) | 0 |
| `Gemini` (UI strings) | 0 |
| `AIzaSy` (API keys) | 0 |
| Stack imports | `react-router`, `@supabase/supabase-js`, `lucide-react`, `sonner` |
| Endpoints `fetch(...)` | `/api/extract-pdf-data`, `/api/send-email`, `/api/broadcast` |
| Supabase URL | `https://gtphkowfcuiqbvfkwjxb.supabase.co` (CRM, ¡no satélite!) |
| Anon JWT | Embebido (CRM) |

Las 3 rutas `/api/...` están **realmente desplegadas como Cloudflare Pages Functions**:

```
POST /api/extract-pdf-data → 400 "Invalid JSON body"  (existe, requiere body)
POST /api/send-email       → 400 "Invalid JSON body"  (existe)
POST /api/broadcast        → 405                       (existe, GET no permitido)
```

⇒ El refactor `VITE_GEMINI_API_KEY` → server-side **se completó**. Las llamadas a Gemini hoy viven en Pages Functions, no en el cliente.

### 4. Supabase MCP — edge functions

| Proyecto | Edge functions |
|---|---|
| CRM (`gtphkowfcuiqbvfkwjxb`) | 2: `ask-crm-docs` v10, `chat-consultor` v7 (ambas conocidas) |
| Satélite (`alesfvxqtwlrwlmkoosg`) | **0 edge functions** |

Coherente: la lógica server-side de Potencias vive en Cloudflare Pages Functions, no en Supabase.

### 5. Logs Supabase (24h CRM)

Se intentó `get_logs(service=postgres)` — el resultado superó el límite de tokens del MCP. **No procesado en esta sesión** por falta de tiempo. Los logs accesibles vía Dashboard: `https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb/logs/postgres-logs` — buscar errores `relation "<tabla>" does not exist` en las últimas 24 h. Si la app Potencias ha sido usada por alguien, **tienen que aparecer**.

---

## ¿Por qué se sospecha origen AI Studio (a pesar de bundle limpio)?

Indicios convergentes:

1. **Nombre de carpeta `musing-kalam/`** en `H:\Mi unidad\06_IA_Y_AUTOMATIZACION\CLAUDE\valere-consultores---gestión-de-excedentes\musing-kalam\` (`docs/SCRIPT_SUBIR_POTENCIAS_A_GITHUB.md` líneas 12 y 20). El patrón `<adjetivo>-<científico>` (Kalam = APJ Abdul Kalam) es **el patrón canónico** que Google AI Studio Build asigna a las apps generadas (cf. AI Studio Build mode docs).
2. **Iniciada en Drive local sin git remoto** (`docs/SCRIPT_SUBIR_POTENCIAS_A_GITHUB.md` línea 132: "App iniciada en Drive local sin repo remoto"). Coincide con el flujo "Download project → ZIP" de AI Studio.
3. **Pre-refactor, tenía el patrón canónico AI Studio en cliente** — `docs/PLAN_MIGRACION_POTENCIAS_CLOUDFLARE.md` línea 27: *"`src/lib/pdf-parser.ts` lee `import.meta.env.VITE_GEMINI_API_KEY` y crea `new GoogleGenAI({ apiKey })` directamente en el navegador"*. Esto es exactamente el `App.tsx` que AI Studio Build genera cuando le pides "una app que use Gemini para extraer datos de PDF".
4. **Convención de tablas** (`clients`, `supplies`, `profiles` en inglés singular) diverge de la convención CRM (`empresas`, `cups`, `user_profiles` en español plural). Coherente con un schema generado a partir de un prompt en inglés en AI Studio.

⇒ Hipótesis con alta confianza: **Potencias nació como app generada en AI Studio Build**, descargada a Drive (`musing-kalam/`), continuada manualmente con Claude Code, refactorizada después para sacar la key del cliente. El **código original AI Studio ya casi no queda** (al menos en cliente: 0 fingerprints).

Confirmable al 100 % con el `git log --reverse` del repo `jolivares-valere/valere-gestion-potencias` (primer commit suele decir algo como "Initial commit from AI Studio" o tener el mismo `package.json` que el plantilla AI Studio Build).

---

## ¿Explica esto los "problemas de comunicación / datos no encontrados"?

**Probable: NO directamente. El AI Studio no es la causa actual.** La causa identificada es el **misalineamiento `VITE_SUPABASE_URL` ↔ schema** descrito arriba (🚨).

Pero el origen AI Studio sí explica por qué la convención de tablas (`clients` en inglés, mismas tablas que CRM ya tenía con otro nombre) hizo que la migración de Fase 4 fuera más frágil de lo esperado: **dos schemas con nombres distintos para los mismos conceptos** (clients/empresas, supplies/cups, profiles/user_profiles). Eso aumenta la probabilidad de que alguien apunte el frontend a la BBDD equivocada y "todo parezca roto", que es exactamente lo que está pasando.

---

## Comandos para Juan (PowerShell, 5 min)

Ejecuta este bloque en una PowerShell con `cd $HOME` o donde tengas los repos satélite:

```powershell
# === 1) Verificar primer commit de Potencias (AI Studio fingerprint) ===
$potDirs = @(
  "H:\Mi unidad\06_IA_Y_AUTOMATIZACION\CLAUDE\valere-consultores---gestión-de-excedentes\musing-kalam",
  "$HOME\valere-gestion-potencias",
  "$HOME\valere-potencias"
)
foreach ($d in $potDirs) {
  if (Test-Path "$d\.git") {
    Write-Host "=== $d ===" -ForegroundColor Cyan
    Push-Location $d
    git log --reverse --oneline | Select-Object -First 5
    Write-Host "--- README/initial files ---"
    Get-ChildItem -Force | Where-Object { $_.Name -in @('metadata.json','aistudio.json','.aistudio','app.json','project.json','README.md') } |
      ForEach-Object { Write-Host $_.FullName; Get-Content $_.FullName -TotalCount 30; Write-Host "---" }
    Write-Host "--- package.json name + scripts ---"
    if (Test-Path package.json) { (Get-Content package.json -Raw) -match '"name"\s*:\s*"([^"]+)"' | Out-Null; Write-Host "name: $($matches[1])" }
    Pop-Location
  }
}

# === 2) Buscar fingerprints AI Studio en TODOS los repos satélite ===
$apps = @(
  @{ Name="potencias";   Path="H:\Mi unidad\06_IA_Y_AUTOMATIZACION\CLAUDE\valere-consultores---gestión-de-excedentes\musing-kalam" },
  @{ Name="potencias2";  Path="$HOME\valere-gestion-potencias" },
  @{ Name="excedentes";  Path="$HOME\valere-gestion-excedentes" },
  @{ Name="energetica";  Path="$HOME\valere-gestion-energetica" }
)
$pat = 'aistudio|ai\.google\.dev|makersuite|generativelanguage|@google/genai|@google/generative-ai|GoogleGenAI|GoogleGenerativeAI|VITE_GEMINI_API_KEY|AIzaSy[A-Za-z0-9_-]{30}'
foreach ($a in $apps) {
  if (-not (Test-Path $a.Path)) { Write-Host "[SKIP] $($a.Path) no existe"; continue }
  Write-Host "`n=== $($a.Name) — $($a.Path) ===" -ForegroundColor Cyan
  Get-ChildItem -Path $a.Path -Recurse -File `
    -Include *.ts,*.tsx,*.js,*.jsx,*.mjs,*.json,*.md,*.html,*.env,*.example -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\node_modules\\|\\dist\\|\\.git\\' } |
    Select-String -Pattern $pat -ErrorAction SilentlyContinue |
    Select-Object -First 80 -Property @{N='File';E={$_.Path -replace [regex]::Escape($a.Path),''}}, LineNumber, Line |
    Format-Table -AutoSize -Wrap
}

# === 3) Verificar VITE_SUPABASE_URL configurada en cada repo ===
foreach ($a in $apps) {
  if (-not (Test-Path $a.Path)) { continue }
  Write-Host "`n=== $($a.Name) — env files ===" -ForegroundColor Cyan
  Get-ChildItem -Path $a.Path -Force -File -Filter ".env*" -ErrorAction SilentlyContinue |
    ForEach-Object { Write-Host $_.FullName; Get-Content $_.FullName | Select-String "SUPABASE|GEMINI|RESEND" }
}

# === 4) Origin GitHub (¿qué repos usas hoy?) ===
foreach ($a in $apps) {
  if (-not (Test-Path "$($a.Path)\.git")) { continue }
  Push-Location $a.Path
  Write-Host "$($a.Name): $(git remote get-url origin 2>$null)"
  Pop-Location
}
```

Lo que necesito ver de su salida:
- **Output bloque 1**: si el primer commit dice algo como `"Initial commit from AI Studio"` / archivo `metadata.json` con clave `"aistudio"` / nombre `package.json = "musing-kalam"` → confirma origen AI Studio.
- **Output bloque 2**: hits con `VITE_GEMINI_API_KEY`, `@google/genai` en cliente, `AIzaSy...` hardcoded → key expuesta hoy todavía.
- **Output bloque 3**: a qué `VITE_SUPABASE_URL` apunta cada `.env` local. Comparado con lo que está hoy en Cloudflare Pages env vars.

---

## Recomendaciones

### Acción inmediata (hoy, antes de seguir con cualquier cosa)

1. **Decidir hacia dónde apunta `valere-gestion-potencias.pages.dev`**:
   - **Opción A (rollback rápido, recomendada)**: cambiar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Cloudflare Pages env vars al satélite (`alesfvxqtwlrwlmkoosg`). Redeploy. Vuelve a funcionar como antes — los 41 expedientes vivos vuelven a ser visibles.
   - **Opción B (terminar la migración)**: aplicar la migración aditiva completa al CRM (faltan tablas), correr `scripts/unificacion_fase2_*` para importar los ~408 filas. Sólo después dejar el frontend apuntando al CRM. Es el plan original (`PLAN_UNIFICACION_FASES_4_5_2026-04-26.md`) — pero requiere **horas de trabajo**, no es algo de domingo de noche.

   **Recomendación: A primero, B después con tiempo**. La A es 5 min en Cloudflare dashboard.

2. **Comunicar al equipo Valere** que Potencias estaba inestable hoy y volverá a la normalidad tras el rollback (si se elige A).

### Acción a medio plazo (esta semana)

3. **Rotar la anon key del CRM** que está embebida en el bundle público de Potencias. Aunque las anon keys son por diseño públicas, la idea era que **sólo** `valere-v2.pages.dev` la sirviera. Que esté también en `valere-gestion-potencias.pages.dev` no es un agujero (es una anon key con RLS), pero rompe la trazabilidad. La rotación se puede aplazar — no es urgente.

4. **Confirmar origen AI Studio con el bloque PowerShell**. Si se confirma:
   - **No hay refactor "sacar de AI Studio"** que hacer hoy: el bundle desplegado ya **no** tiene fingerprints AI Studio (la clave Gemini ya está en server-side). El refactor del cliente ya se hizo.
   - Lo que sí queda pendiente es **renombrar las tablas** cuando se haga la unificación con el CRM (`clients` → `empresas`, `supplies` → `cups`, `profiles` → `user_profiles`). Eso ya está documentado en `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` y `docs/ARQUITECTURA_PROYECTOS.md` paragraph 5.

5. **Investigar Excedentes y Energética**: con bloque PowerShell. Si Excedentes vive en `musing-kalam/` (mismo folder, ahí está su backend en `comercializadoras` + `savings_calculations`) → Excedentes y Potencias **comparten codebase**. Es coherente con `docs/PLANNING_APPS_SATELITE.md` línea 14: "Potencias reutilizó la misma BBDD que excedentes".

### Acción a largo plazo

6. **Migrar todo lo restante de origen AI Studio** (si lo hay) a estructura de `src/features/` del CRM en la Fase 4-5 de unificación. Esto ya está planificado.

7. **Procedimiento operativo**: cualquier futuro app generada en AI Studio (o cualquier herramienta no-code) que se quiera promocionar a producción tiene que pasar por revisión de schema y de keys (server-side only) **antes** de entrar al ecosistema Valere. Documentar en `docs/SEGURIDAD.md`.

---

## Limpieza recomendada del ecosistema Valere

> **Restricción dura de Juan (2026-04-26, confirmada explícitamente):**
>
> La app **Gestión de Potencias tiene datos reales útiles del negocio** — empresas y expedientes trabajados, no son datos de prueba ni descartables. En consecuencia:
>
> - **Cero borrado, cero pausa** del proyecto Supabase satélite `alesfvxqtwlrwlmkoosg`.
> - **Cero modificación** de las ~410 filas reales (clientes, supplies, profiles, expedientes, ciclos, power_requests, savings_calculations, client_communications, status_log, expediente_documents).
> - **Cero borrado** de los 100 PDFs en storage del satélite (71 en bucket `documents` ≈ 2.3 MB + 29 en bucket `expediente-docs` ≈ 13 MB).
>
> La estrategia de unificación correcta sigue siendo la prevista: **Fase 2 datos** (importar a CRM con dedupe **manteniendo el satélite vivo como respaldo**) → **Fase 4 apps satélite apuntando a CRM via compat views**. Hasta entonces, el satélite es **inmutable**.
>
> Sólo se busca limpieza de: bundles JS huérfanos, despliegues Vercel duplicados, código residual en repos, edge functions de prueba sin tráfico, repos vacíos. **Datos y proyecto Supabase satélite = sagrados.**

Para cada candidato se distingue:

- 🟢 **Borrar libremente** — sin datos, sin riesgo, sin tráfico observable. Comandos seguros incluidos.
- 🟡 **Pausar/archivar** — sin datos, pero conviene un paso reversible (archive, no delete) por si hay valor latente.
- 🔴 **NO TOCAR sin confirmación** — contiene datos. Solo inventario + preguntas. **Sin comandos de borrado.**

### 🟢 Borrar libremente (cero datos, cero riesgo)

| # | Recurso | Ubicación | Última actividad / evidencia | Riesgo de borrar |
|---|---|---|---|---|
| 1 | Proyecto Vercel `valere-v2` | https://vercel.com/jolivares-valere/valere-v2 | Cuenta Vercel suspendida 2026-04-24. CRM migrado a Cloudflare Pages — `valere-v2.pages.dev`. Cero tráfico esperado tras `COMUNICADO_NUEVO_URL_CRM.md`. | Nulo — los archivos viven en GitHub, redeployable. |
| 2 | Proyecto Vercel `valere-gestion-potencias` | https://vercel.com/jolivares-valere/valere-gestion-potencias | `valere-gestion-potencias.vercel.app` aún devuelve 200 (cache), pero el deploy oficial es `valere-gestion-potencias.pages.dev`. | Nulo — repo en GitHub, redeployable. ⚠️ Antes de borrar: comprobar que ningún bookmark de Valere apunta al `.vercel.app`. |
| 3 | Edge Function `chat-consultor` v7 (CRM Supabase) | `gtphkowfcuiqbvfkwjxb` → Functions → `chat-consultor` | ACTIVE pero **inalcanzable** desde el frontend (sin `<Route>`). Decisión ya documentada en `ESTADO.md` líneas 218, 264: "eliminar". Stateless: solo lógica, sin datos. | Nulo — código vive en `supabase/functions/chat-consultor/index.ts` del repo, redeployable. |
| 4 | Carpeta `src/features/chat-ia/` (CRM repo) | `valere-v2/src/features/chat-ia/ChatIAPanel.tsx` + index | Sin imports en `src/`. Decisión: eliminar (ESTADO.md línea 218). | Nulo — versionado en git, recuperable. |
| 5 | Bundle huérfano JS `index-DggyGpec.js` (Vercel cache) | `valere-gestion-potencias.vercel.app/assets/index-DggyGpec.js` | Versión anterior del bundle Potencias servida sólo desde el deploy Vercel zombie. Si se borra el proyecto Vercel (#2) desaparece automáticamente. | Nulo — cae con #2. |
| 6 | Carpeta vacía `CRM VALERE/` en raíz Windows | `C:\Users\joliv\valere-v2\CRM VALERE\` (mounted como segundo workspace, vacía) | Pendiente desde sesión 2026-04-24 (ESTADO línea 268). | Nulo — vacía. |
| 7 | (condicional) `VITE_GEMINI_API_KEY` en env vars Cloudflare Pages de `valere-v2` | Cloudflare Dashboard → Pages → valere-v2 → Settings → Environment Variables | Si aún aparece tras la limpieza 2026-04-24, residual sin uso. ESTADO 249 dice eliminada — verificar. | Nulo — el código no la lee. |

#### Comandos seguros (PowerShell, requieren `vercel`/`gh`/`supabase` CLI ya autenticados)

```powershell
# === #1, #2 — Vercel projects ===
# Sólo si la cuenta Vercel está reactivada (suspended block-list rm, hay que pagar billing antes
#  o usar el dashboard web aunque suspendida).
vercel project rm valere-v2 --yes
vercel project rm valere-gestion-potencias --yes

# === #3 — Edge Function chat-consultor (CRM, sin datos) ===
# Requiere: cd valere-v2 ; supabase login ; supabase link --project-ref gtphkowfcuiqbvfkwjxb
supabase functions delete chat-consultor

# === #4 — chat-ia frontend orphan ===
cd $HOME\valere-v2
git checkout -b chore/limpiar-chat-ia-huerfano
Remove-Item -Recurse -Force src\features\chat-ia
# Recordar: grep en src/ para asegurar que no hay imports residuales
git add -A; git commit -m "chore: eliminar feature chat-ia huérfana (sin route)"
git push -u origin chore/limpiar-chat-ia-huerfano

# === #6 — carpeta vacía ===
Remove-Item -Recurse -Force "C:\Users\joliv\valere-v2\CRM VALERE"

# === #7 — verificar VITE_GEMINI_API_KEY ya no está en Cloudflare ===
# Dashboard: https://dash.cloudflare.com/?to=/:account/pages/view/valere-v2/settings/environment-variables
# Si aparece, eliminar y redeploy.
```

### 🟡 Pausar/archivar (sin datos, pero reversible)

| # | Recurso | Ubicación | Por qué archivar (no borrar) | Acción reversible |
|---|---|---|---|---|
| 8 | Repo `jolivares-valere/valere-gestion-energetica` (privado) | https://github.com/jolivares-valere/valere-gestion-energetica | Pendiente desde 2026-04-24 (`docs/INFORME_VALERE_GESTION_ENERGETICA.md`). Hipótesis: clone parcial / experimento. Sin Supabase, sin Vercel, sin tráfico. | `gh repo archive` (no `gh repo delete`). Recuperable. |
| 9 | Apps prototipo Google AI Studio (cuenta `valereconsultores.com`) | https://aistudio.google.com/apps | Si Juan tiene apps generadas aparte de la que dio origen a `musing-kalam` (`gestion-de-excedentes`), probablemente hay 1-N prototipos olvidados que siguen consumiendo cuota Gemini. **Inspección visual desde el dashboard** — desde Cowork no son enumerables vía API. | Archive desde el dashboard (papelera, recuperable 30 días). |
| 10 | Keys Gemini `...R_Vs` (creada 2026-04-11) y `...wqag` (creada 2026-03-29) | Google Cloud Console → APIs & Services → Credentials, proyecto "Default Gemini Project" | **Estado dudoso**. ESTADO.md línea 257 dice "revocadas"; líneas 251 y 263 + INVENTARIO_GEMINI_2026-04-25 dicen "revocación pausada". Verificación visual del dashboard antes de actuar. | Si están activas y se confirma cero tráfico 24-48h sobre ellas (Cloud Console → Metrics): **Disable** (reversible) antes de **Delete** (irreversible). |

#### Comandos / pasos (reversibles)

```powershell
# === #8 ===
gh repo archive jolivares-valere/valere-gestion-energetica --yes

# === #9 ===
# Manual en https://aistudio.google.com/apps
#   Por cada app no usada: ⋮ → Archive

# === #10 ===
# Manual en https://console.cloud.google.com/apis/credentials?project=<default-gemini-project>
#   Edit → Restrict key → temporarily disable
#   Esperar 24-48h con métricas a 0
#   Delete key (irreversible)
```

### 🔴 NO TOCAR (datos reales de producción — confirmado por Juan)

Estos elementos contienen datos reales del negocio. **Cowork no ejecuta acciones aquí.** Sólo inventario.

#### Inventario datos reales del satélite Potencias (sagrados)

Proyecto Supabase: **`alesfvxqtwlrwlmkoosg`** ("valere-gestion-potencias", eu-central-1).

| Categoría | Detalle confirmado por Juan | Estado |
|---|---|---|
| Filas en BBDD | **~410 filas reales** distribuidas en: `clients`, `supplies`, `profiles`, `expedientes`, `ciclos`, `power_requests`, `savings_calculations`, `client_communications`, `status_log`, `expediente_documents`, `documentacion`. Empresas y expedientes ya trabajados, en uso por el negocio. | **Inmutables.** |
| Storage bucket `documents` | **71 PDFs ≈ 2.3 MB**. Documentación administrativa de clientes. | **Inmutable.** |
| Storage bucket `expediente-docs` | **29 PDFs ≈ 13 MB**. Documentación específica de expedientes (PDFs grandes, probablemente facturas, autorizaciones, comunicaciones a distribuidora). | **Inmutable.** |
| Edge Functions del satélite | 0 (verificado vía MCP). No hay riesgo aquí. | — |

Riesgos asociados confirmados:
- El frontend `valere-gestion-potencias.pages.dev` **NO está consultando estos datos hoy** (apunta al CRM, ver hallazgo 🚨 al inicio del documento). Los datos siguen en la BBDD pero el equipo no los ve. Cuanto antes se haga el rollback de `VITE_SUPABASE_URL` (sección "Acción inmediata"), antes los recuperan.
- El plan de unificación correcto es **Fase 2 (importar al CRM con dedupe, manteniendo el satélite vivo como respaldo)** → **Fase 4 (apps satélite apuntando al CRM vía compat views)**. Documentado en `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` y `docs/PLAN_UNIFICACION_SUPABASE.md`.

#### Inventario código vivo (sagrado, soporta los datos)

| Recurso | Razón |
|---|---|
| Repo `jolivares-valere/valere-gestion-potencias` (GitHub) | Fuente del deploy en producción. No archivar/borrar. |
| Repo local `H:\Mi unidad\…\musing-kalam\` (Drive) | Mismo código que el repo de GitHub. Posible referencia histórica + cambios locales no pusheados. |
| Tablas vacías en CRM (`expedientes`, `comercializadoras`, `savings_calculations`, `ciclos`, `status_log`, `expediente_documents`) creadas por la migración aditiva 2026-04-25 | 0 filas hoy, pero **necesarias** para que la Fase 2 pueda importar los ~410 filas del satélite cuando se ejecute. Son schema-aditivas, no estorban. **Mantener.** |
| Buckets `documentos` y `crm-files` en CRM (`gtphkowfcuiqbvfkwjxb`, si existen) | Pre-existentes para futuro módulo de adjuntos del CRM. Mantener. |

#### Preguntas para Juan (siguen abiertas, no afectan la inmutabilidad de los datos)

Estas preguntas no piden permiso para borrar nada de Potencias. Sólo orientan acciones colaterales:

1. **Rollback URL Cloudflare**: ¿Confirmas el cambio de `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Cloudflare Pages `valere-gestion-potencias` → satélite `alesfvxqtwlrwlmkoosg`? Esto **devuelve la visibilidad** de los datos a los usuarios de Potencias. Es lo único urgente.
2. **Estado real de las 2 keys Gemini** (`...R_Vs` y `...wqag`): ¿están revocadas (per ESTADO.md línea 257) o activas (per INVENTARIO_GEMINI_2026-04-25)? La docs se contradice — un vistazo a Cloud Console resuelve. Si están activas y `valere-gestion-potencias.pages.dev` ya no las necesita en cliente (el bundle no las contiene), se pueden disable de forma segura tras 24-48h sin tráfico.
3. **Nombre canónico repo Potencias en GitHub**: `valere-gestion-potencias` o `valere-potencias`. `SCRIPT_SUBIR_POTENCIAS_A_GITHUB.md` los menciona ambos.
4. **Sync Drive local `musing-kalam/`**: ¿hay cambios sin pushear vs. el repo de GitHub? (Aclarar antes de cualquier limpieza, **no para borrar — sólo para no perder código**.)

#### Bloqueo explícito

Cero acciones en 🔴. Las acciones de 🟢 son independientes y se pueden ejecutar ya.

### Recomendación priorizada (orden de ejecución)

1. **Hoy mismo (sección 🟢, sin Juan)**: items #1, #2, #3, #4, #6 — limpieza de orphans con cero impacto. ~15 min.
2. **Hoy/mañana (sección 🟢 #7 + 🟡 #10 si Juan confirma estado)**: verificar estado real keys Gemini, disable si todavía activas.
3. **Esta semana (sección 🟡 #8, #9)**: archive `valere-gestion-energetica`, archive prototipos AI Studio sin uso.
4. **Bloqueado (sección 🔴)**: nada hasta respuestas de Juan a las 6 preguntas.

---

## Referencias

- Inventario Gemini previo: `docs/INVENTARIO_GEMINI_2026-04-25.md`
- Plan refactor Potencias: `docs/PLAN_MIGRACION_POTENCIAS_CLOUDFLARE.md`
- Migración aditiva (parcial): `supabase/migrations/20260425_unificacion_potencias_aditiva.sql`
- Protocolo importación datos (no ejecutado): `scripts/unificacion_fase2_protocolo.md`
- Origen `musing-kalam/`: `docs/SCRIPT_SUBIR_POTENCIAS_A_GITHUB.md`
- Mapa apps satélite: `docs/PLANNING_APPS_SATELITE.md`
- Arquitectura: `docs/ARQUITECTURA_PROYECTOS.md`
- Estado decisión chat-ia: `docs/ESTADO.md` línea 218 + 264
- Bucket documentos (CRM): `.cowork/inbox/2026-04-19T24-00-00-bucket-documentos-creado.md`
- Informe valere-gestion-energetica: `docs/INFORME_VALERE_GESTION_ENERGETICA.md`
