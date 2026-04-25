# Inventario apps satélite — Template

> **Cómo usar este archivo**: ejecuta `scripts/inventario_apps_satelite.ps1` desde tu PowerShell. El script genera un `.md` rellenado en `$HOME\valere-backups\` con datos reales (tablas, env vars, dependencias, uso Gemini). Pégalo en `docs/INVENTARIO_APPS_SATELITE_<YYYY-MM-DD>.md` o pégaselo a Cowork como input para Fase 4.
>
> Esta plantilla documenta **qué información necesita Cowork** para poder diseñar la migración Fase 4 sin acceso directo a los repos satélite (no están mounted en el sandbox).

---

## Por qué este inventario

El plan Fase 4 (`docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md`) propone que las apps satélite (`valere-gestion-potencias`, `valere-excedentes`, `valere-gestion-energetica`) apunten al CRM canónico (`gtphkowfcuiqbvfkwjxb`) en lugar de al proyecto Potencias (`alesfvxqtwlrwlmkoosg`). El cambio mínimo es:

1. **env vars** — sustituir `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` por las del CRM.
2. **compat views** — crear views en el CRM con los nombres viejos (`clients`, `supplies`, `profiles`, etc.) para que la app no tenga que tocar queries.
3. **refactor selectivo** si hay INSERT/UPDATE con renames, o si se expone `VITE_GEMINI_API_KEY` en bundle.

Para diseñar las compat views correctas, Cowork necesita saber **exactamente** qué tablas y columnas usa cada app. Sin esa foto, las views se hacen por presunción y arriesgamos romper INSERTs que no testea nadie hasta que un usuario lo intenta en producción.

Inventario por app (rellena con el output del script):

---

## App 1 — `valere-gestion-potencias`

### Identidad

| Campo | Valor |
|---|---|
| Repo GitHub | `https://github.com/jolivares-valere/valere-gestion-potencias` _(confirmar)_ |
| Ruta local | `C:\Users\joliv\valere-gestion-potencias` _(confirmar)_ |
| Hosting actual | Vercel (suspendido 2026-04-24) — migración pendiente a Cloudflare Pages |
| Branch principal | `main` _(confirmar)_ |
| Último commit | `<rellena con script>` |

### Stack

| Paquete | Versión |
|---|---|
| `@supabase/supabase-js` | _<rellena>_ |
| `@google/genai` (o `@google/generative-ai`) | _<rellena>_ |
| `react` | _<rellena>_ |
| `vite` | _<rellena>_ |
| `express` (si aplica para Vercel functions) | _<rellena>_ |

### Env vars

**Frontend (`VITE_*` — visibles en bundle, peligrosas si contienen secretos):**

- _<rellena>_

**Server-side (`process.env` / `Deno.env` — Vercel functions o Edge):**

- _<rellena>_

**Archivos `.env*` locales:**

- _<rellena: nombre archivo + lista de keys>_

**Hosting env vars** (Vercel/Cloudflare Dashboard):

- _<rellena manualmente desde el dashboard — no aparecen en el repo>_

### Tablas Supabase usadas

| Tabla en la app | Equivalente CRM canónico | Acción Fase 4 |
|---|---|---|
| `clients` | `empresas` | compat view |
| `supplies` | `cups` | compat view |
| `profiles` | `user_profiles` | compat view |
| `expedientes` | `expedientes` | _(directa, ya canónica)_ |
| `power_requests` | `solicitudes_potencia` | compat view |
| `ciclos` | `ciclos` | directa |
| _<otras>_ | _<rellena>_ | _<rellena>_ |

### URLs Supabase hardcoded

- _<rellena: cualquier URL `https://*.supabase.co` encontrada en el código>_

### Uso de Gemini

| Archivo | Línea | Contexto | Frontend o server |
|---|---|---|---|
| `src/lib/pdf-parser.ts` | _<rellena>_ | _<rellena: snippet>_ | **frontend** ⚠️ |
| `api/extract-pdf-data.ts` | _<rellena>_ | _<rellena>_ | server |

### Riesgos identificados

- 🔴 **Key Gemini en bundle frontend** (`VITE_GEMINI_API_KEY`) → refactor obligatorio antes de cutover. Ver `docs/PLAN_MIGRACION_POTENCIAS_CLOUDFLARE.md`.
- 🟡 **Apunta a proyecto Potencias legacy** (`alesfvxqtwlrwlmkoosg`) → cambiar a CRM (`gtphkowfcuiqbvfkwjxb`).
- 🟡 **Tablas legacy que necesitan compat views**: `clients`, `supplies`, `profiles`, `power_requests`, `client_communications`, `client_documents`, `expediente_documents`, `alerts`.

### Estimación refactor

- **Camino A** (compat views, no tocar app): 1-2h Cowork (SQL views) + 30 min Juan (env vars + redeploy). Riesgo: INSERTs/UPDATEs requieren triggers.
- **Camino B** (refactor app a nombres canónicos): 1-2 días persona. Más limpio largo plazo.

**Recomendado**: Camino A para cutover urgente; Camino B en sprint dedicado posterior.

---

## App 2 — `valere-excedentes`

### Identidad

| Campo | Valor |
|---|---|
| Repo GitHub | _<no existe aún o `jolivares-valere/valere-excedentes`>_ |
| Ruta local | `H:\Mi unidad\…\valere-consultores---gestión-de-excedentes\musing-kalam` _(según `docs/PLANNING_APPS_SATELITE.md`)_ |
| Estado | **Inacabada**. Iniciada antes que Potencias. |
| Branch principal | _<rellena>_ |
| Último commit | _<rellena>_ |

### Stack

_<rellena con script>_

### Env vars

_<rellena>_

### Tablas Supabase usadas

Según el análisis cruzado (`docs/PLANNING_APPS_SATELITE.md` §1):

- Owner de: `comercializadoras`, `comercializadora_docs`, `savings_calculations`, `regulated_rates`.
- Comparte: `clients`, `supplies`, `profiles`, `status_log`, `client_communications`, `client_documents`, `email_templates`, `documentacion`, `alerts`, `excel_import_templates`.

_<verifica con el script>_

### Uso de Gemini

_<rellena: ¿hay alguno? probablemente no>_

### Riesgos

- ⚠️ **App inacabada** — antes de migrar a CRM canónico, decidir si:
  - se termina y se integra (ver `docs/PLANNING_APPS_SATELITE.md` §FASE C),
  - o se archiva el código y se reabsorben las features en el CRM directamente.
- 🟡 Apunta al proyecto Potencias compartido (sin URL específica si es la misma BBDD).

### Estimación refactor

Depende de la decisión arriba. Si se mantiene viva, mismo patrón que Potencias (env vars + compat views).

---

## App 3 — `valere-gestion-energetica`

### Identidad

| Campo | Valor |
|---|---|
| Repo GitHub | `jolivares-valere/valere-gestion-energetica` _(privado, confirmar)_ |
| Ruta local | `C:\Users\joliv\valere-gestion-energetica` _(confirmar)_ |
| Estado | _<no documentado en valere-v2 — rellenar>_ |
| Branch principal | _<rellena>_ |
| Último commit | _<rellena>_ |

### Stack

_<rellena>_

### Env vars

_<rellena>_

### Tablas Supabase usadas

_<rellena con script>_

### Uso de Gemini

_<rellena>_

### Riesgos

_<rellena con diagnóstico automático>_

### Estimación refactor

_<rellena cuando haya datos>_

---

## Resumen ejecutivo cross-app

| App | Existe local | Tablas detectadas | VITE_* | Gemini hits | URLs Supabase |
|---|---|---|---|---|---|
| valere-gestion-potencias | _<rellena>_ | _<rellena>_ | _<rellena>_ | _<rellena>_ | _<rellena>_ |
| valere-excedentes | _<rellena>_ | _<rellena>_ | _<rellena>_ | _<rellena>_ | _<rellena>_ |
| valere-gestion-energetica | _<rellena>_ | _<rellena>_ | _<rellena>_ | _<rellena>_ | _<rellena>_ |

---

## Decisión arquitectónica pendiente Juan (Opción A vs B)

Ver `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` §4.D:

- **Opción A** (apps separadas): cada app sigue siendo distinta, solo cambia URL Supabase. Ventaja: cutover de minutos. Desventaja: 3 apps en producción a mantener.
- **Opción B** (absorción en CRM): features de Potencias y Excedentes se reimplementan en `valere-v2` bajo `src/features/`. Ventaja: una sola URL, una sola UX, una sola codebase. Desventaja: 3-4 días de desarrollo.

**Recomendación Cowork** (sprint 8): A para transición + B largo plazo.

---

## Próximos pasos

1. **Juan**: ejecutar `scripts/inventario_apps_satelite.ps1` y commitear el output.
2. **Cowork**: con el output, redactar las compat views específicas para cada app en `supabase/migrations/<fecha>_compat_views_apps_satelite.sql`.
3. **Juan**: cambiar env vars en cada app + redeploy.
4. **Smoke tests** post-cutover (Fase 4 §4.B).
5. **Storage bucket migration** decisión paralela (riesgo identificado en plan Fase 4-5 §Riesgos).

---

## Referencias

- `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` — plan ejecutivo Fases 4 y 5.
- `docs/ARQUITECTURA_PROYECTOS.md` — mapa apps Valere.
- `docs/PLAN_MIGRACION_POTENCIAS_CLOUDFLARE.md` — refactor Potencias previo (eliminar key Gemini de bundle).
- `docs/PLANNING_APPS_SATELITE.md` — diagnóstico inicial mezcla excedentes/potencias.
- `docs/INVENTARIO_GEMINI_2026-04-25.md` — inventario Gemini valere-v2.
