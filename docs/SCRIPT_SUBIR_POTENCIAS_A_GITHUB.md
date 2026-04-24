# Script — Subir `musing-kalam` a GitHub como `valere-potencias`

**Para ejecutar en PowerShell. Tiempo estimado: 15 minutos.**

Este script:
1. Sube el repo local `musing-kalam` a GitHub como `jolivares-valere/valere-potencias` (privado).
2. Le instala el mismo sistema de memoria persistente que el CRM (CLAUDE.md, docs/ESTADO.md, .cowork/inbox/outbox, .mcp.json).
3. Primer commit de memoria.

**Prerrequisitos:**
- `gh` CLI autenticado con cuenta empresa (ya hecho en sesión anterior).
- Estar en `H:\Mi unidad\06_IA_Y_AUTOMATIZACION\CLAUDE\valere-consultores---gestión-de-excedentes\musing-kalam\`.
- **Importante:** verificar que `.env` está en `.gitignore` del repo antes de hacer el primer push. Si no lo está, parar y añadirlo primero.

---

## Paso 1 — Verificaciones previas (ejecuta en PowerShell)

```powershell
cd "H:\Mi unidad\06_IA_Y_AUTOMATIZACION\CLAUDE\valere-consultores---gestión-de-excedentes\musing-kalam"
git status
Get-Content .gitignore 2>$null | Select-String "^\.env$"
```

Si `git status` ve archivos raros o `.env` no aparece en `.gitignore`, PARAR y avisar en chat antes de seguir.

## Paso 2 — Crear repo en GitHub y push

```powershell
gh repo create jolivares-valere/valere-potencias --private --source=. --remote=origin --push
```

Si pide confirmación, "Y". Debe devolver la URL del repo nuevo.

## Paso 3 — Instalar sistema de memoria (bloque único)

```powershell
# === CLAUDE.md ===
@'
# CLAUDE.md — Valere Potencias

Fichero de contexto persistente para agentes Claude. Leer siempre antes de trabajar.

## Producto

App de back-office energético de Valere Consultores. Gestiona dos flujos que comparten entidades (clientes, suministros):

1. **Gestión de potencias**: expedientes de solicitud/modificación de potencia contratada (`expedientes`, `power_requests`, `expediente_documents`, `ciclos`). Este es el flujo principal actualmente en desarrollo.
2. **Gestión de excedentes** (histórico, inacabado): propuestas comparativas de comercializadoras según cómo gestionan los excedentes de autoconsumo (`comercializadoras`, `comercializadora_docs`, `savings_calculations`). Será la fase C del roadmap.

Cuando madure, este back-office se integrará al CRM principal (`valere-v2`) como features adicionales. Ver `valere-v2/docs/ARQUITECTURA_PROYECTOS.md` paragraph 4 y paragraph 5.

## Enlaces

| Servicio | URL |
|---|---|
| GitHub | https://github.com/jolivares-valere/valere-potencias |
| Supabase | https://supabase.com/dashboard/project/alesfvxqtwlrwlmkoosg |
| Vercel | https://vercel.com/jolivares-valere/valere-gestion-potencias |
| Deploy actual | https://valere-gestion-potencias.vercel.app |

## Cuenta canónica

**`jolivares@valereconsultores.com`** — Google Workspace + Supabase + Vercel + GitHub.

## Stack

Mismo que CRM (valere-v2): React + TypeScript + Vite + Supabase JS + Tailwind. Ver `package.json`.

## Supabase schema — clasificación de tablas

Todas en schema `public` del proyecto `alesfvxqtwlrwlmkoosg`. Cada tabla tiene `COMMENT ON TABLE` con su dominio:

- **excedentes**: `comercializadoras`, `comercializadora_docs`, `savings_calculations`
- **potencias**: `expedientes`, `expediente_documents`, `power_requests`, `ciclos`
- **shared**: `clients`, `supplies`, `profiles`, `status_log`, `client_communications`, `client_documents`, `documentacion`, `email_templates`, `alerts`, `excel_import_templates`, `regulated_rates`

## Convenciones

- Identificadores de dominio en español (`expedientes`, `potencias`).
- UI en español.
- Toasts con `sonner`.
- RLS activo, granular por rol.
- TSC 0 errores antes de cada commit.

## Protocolo de sesión

### Al ABRIR sesión:
```bash
git pull
cat CLAUDE.md docs/ESTADO.md
ls .cowork/inbox/ 2>/dev/null
git log --oneline -5
```

### Al CERRAR sesión:
1. Actualizar `docs/ESTADO.md` (fecha, commits, pendientes).
2. Crear `docs/SESIONES/YYYY-MM-DD-resumen.md` si la sesión fue significativa.
3. Dejar handoff en `.cowork/outbox/` si hay instrucciones para la siguiente.
4. Commit + push en rama `claude/<descripcion>`, nunca directo a main.

## Reglas críticas

- NUNCA commitear `.env` (debe estar en `.gitignore`).
- NUNCA push directo a main; usar ramas `claude/<descripcion>` + PR.
- NUNCA tocar tablas de schema distinto al propio sin consenso documentado.
- Cada migration nueva en `supabase/migrations/YYYYMMDD_<descripcion>.sql` + aplicar vía Supabase MCP.

## Integración futura al CRM

Cuando el producto madure:
- Modo A (migración completa) según `valere-v2/docs/ARQUITECTURA_PROYECTOS.md` paragraph 4.
- Clients → empresas, supplies → cups, profiles → user_profiles (fusionar).
- Tablas específicas (expedientes, power_requests, etc.) se migran al Supabase del CRM.
- Features UI a `valere-v2/src/features/potencias/`.
- Archivar este repo + pausar proyecto Supabase `alesfvxqtwlrwlmkoosg`.
'@ | Set-Content -Path "CLAUDE.md" -Encoding UTF8

# === docs/ESTADO.md ===
New-Item -ItemType Directory -Force -Path "docs" | Out-Null
@'
# Estado actual — Valere Potencias

> Última actualización: 2026-04-23 — Repo subido a GitHub + sistema de memoria instalado.

## Rama

`main` (trabajo en ramas `claude/<descripcion>` via PR).

## Resumen ejecutivo

App iniciada en Drive local (`musing-kalam/`) sin repo remoto. Hoy subida a GitHub. Deploy activo en Vercel `valere-gestion-potencias.vercel.app`. Supabase en uso activo (41 expedientes, 75 supplies, 30 clientes reales).

## Hitos recientes

- 2026-04-23: repo subido a GitHub, sistema de memoria instalado.
- 2026-04-23: Supabase clasificado con COMMENT ON TABLE (excedentes/potencias/shared).
- Previo: desarrollo local con Claude Code, sin registro git remoto.

## Pendientes

| Tarea | Urgencia |
|---|---|
| Conectar proyecto Vercel al repo GitHub (actualmente deploy manual CLI) | Alta |
| Configurar auto-deploy desde rama main | Alta |
| Revisar advisors de seguridad Supabase (correr el mismo sprint que se hizo en CRM) | Media |
| Terminar flujo de "propuesta de excedentes a cliente" (inacabado) | Media |
| Escribir tests mínimos | Baja |
| Convenciones UI alineadas con CRM (StatusBadge, ConfirmDialog, Skeleton) | Baja |

## Estado de las tablas

Ver COMMENT ON TABLE en Supabase para clasificación real. Resumen:
- 3 tablas de feature "excedentes"
- 4 tablas de feature "potencias"
- 11 tablas compartidas

## Comandos útiles

```
npm run dev
npm run build
npx tsc --noEmit
```
'@ | Set-Content -Path "docs\ESTADO.md" -Encoding UTF8

# === Carpetas vacías con .gitkeep ===
New-Item -ItemType Directory -Force -Path "docs\SESIONES" | Out-Null
New-Item -ItemType File -Force -Path "docs\SESIONES\.gitkeep" | Out-Null
New-Item -ItemType Directory -Force -Path ".cowork\inbox" | Out-Null
New-Item -ItemType File -Force -Path ".cowork\inbox\.gitkeep" | Out-Null
New-Item -ItemType Directory -Force -Path ".cowork\outbox" | Out-Null
New-Item -ItemType File -Force -Path ".cowork\outbox\.gitkeep" | Out-Null

# === .mcp.json ===
@'
{
  "$schema": "https://json.schemastore.org/mcp.json",
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "${SUPABASE_ACCESS_TOKEN}",
        "--project-ref",
        "alesfvxqtwlrwlmkoosg"
      ]
    },
    "vercel": {
      "type": "http",
      "url": "https://mcp.vercel.com/"
    }
  }
}
'@ | Set-Content -Path ".mcp.json" -Encoding UTF8

# === .env.example (plantilla sin secretos) ===
@'
# Copiar a .env (gitignored) y rellenar.

VITE_SUPABASE_URL=https://alesfvxqtwlrwlmkoosg.supabase.co
VITE_SUPABASE_ANON_KEY=...

# MCP — Supabase management API (para Claude Code CLI)
# Genera token en https://supabase.com/dashboard/account/tokens
SUPABASE_ACCESS_TOKEN=sbp_...
'@ | Set-Content -Path ".env.example" -Encoding UTF8

# === Asegurar .env y .mcp.json token en .gitignore ===
$gitignore = Get-Content .gitignore -Raw -ErrorAction SilentlyContinue
if ($gitignore -notmatch '^\.env$') {
    Add-Content .gitignore "`n.env`n.env.local`n.env.*.local`n"
}

# === Commit y push ===
git add CLAUDE.md docs/ .cowork/ .mcp.json .env.example .gitignore
git commit -m "docs(memory): instalar sistema de memoria persistente del CRM"
git push
```

## Paso 4 — Post-script: tareas manuales en Vercel

Después del push, ve a https://vercel.com/jolivares-valere/valere-gestion-potencias/settings/git y conecta el repo `jolivares-valere/valere-potencias`. Los próximos `git push` harán auto-deploy.

## Paso 5 — Post-script: copiar SUPABASE_ACCESS_TOKEN al `.env`

```powershell
# Reutiliza el token del CRM, es el mismo access token para toda la cuenta Supabase empresa.
# Ver en C:\Users\joliv\valere-v2\.env la variable SUPABASE_ACCESS_TOKEN y cópiala al
# nuevo .env en musing-kalam\ (que acabas de crear como plantilla).
```
