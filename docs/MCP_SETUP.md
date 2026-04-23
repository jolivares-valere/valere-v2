# MCP Setup — Valere CRM

Guía para conectar los MCPs a los agentes Claude del proyecto.

> **Resumen ejecutivo:** Supabase y Vercel se conectan a **Cowork** (agente 1) desde el botón "Connect" en la UI, y en `.mcp.json` para **Claude Code CLI** (agente 2). GitHub queda **fuera** de MCP — se usa `gh` CLI (GitHub CLI) a mano desde la terminal. Decisión tomada 2026-04-23: el MCP oficial de GitHub no está en el registro de Claude y el workaround auto-hosteado (Docker) añade complejidad sin retorno claro mientras Claude Code CLI no esté instalado.

---

## 1. Supabase MCP

### En Cowork (agente 1)
1. Abre la conversación con Claude.
2. Cuando Claude muestre la tarjeta "Supabase → Connect", pulsa **Connect**.
3. Autoriza con tu cuenta Supabase (la que administra el proyecto `gtphkowfcuiqbvfkwjxb`).
4. Verifica con: `list_projects` → debe aparecer `gtphkowfcuiqbvfkwjxb`.

### En Claude Code CLI (agente 2)
El `.mcp.json` de la raíz ya lo tiene configurado. Necesita la variable de entorno:

```bash
# Genera un Personal Access Token en https://supabase.com/dashboard/account/tokens
# Alcance mínimo: acceso al proyecto gtphkowfcuiqbvfkwjxb
echo "SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" >> .env
```

Reinicia Claude Code CLI. Verifica:
```bash
claude mcp list    # debe aparecer "supabase: connected"
```

### Qué desbloquea
- Ejecutar `supabase/migrations/20260422_fase28_6_rls_policies_cleanup.sql` desde Claude
- Consultar tablas en vivo (`empresas`, `contratos`, `cups`, etc.)
- Desplegar Edge Functions (`chat-consultor`, `daily-contract-check`)
- Revisar RLS policies contra la BD real

---

## 2. Vercel MCP

### En Cowork (agente 1)
1. Pulsa **Connect** en la tarjeta de Vercel.
2. Autoriza con tu cuenta Vercel (la que tiene el proyecto `valere-v2`).
3. Verifica con: `list_projects` → debe aparecer el deploy de `valere-v2.vercel.app`.

### En Claude Code CLI (agente 2)
El `.mcp.json` apunta al endpoint HTTP oficial (`https://mcp.vercel.com/`). No requiere token en `.env`; Claude Code abrirá flujo OAuth la primera vez.

### Qué desbloquea
- Ver estado y logs de deploys recientes sin entrar al dashboard
- Diagnóstico de builds fallidos
- Lectura de variables de entorno del proyecto (no las expone en chat)

**Limitación:** el MCP de Vercel es mayormente lectura. Los deploys siguen disparándose por `git push`.

---

## 3. GitHub — sin MCP, con `gh` CLI

Decisión: **GitHub fuera de MCP**. El MCP oficial de GitHub no está en el registro de Claude, y el workaround auto-hosteado (Docker + github-mcp-server + PAT fine-grained) exige Claude Code CLI instalado y Docker corriendo. Mientras eso no pase, es más rápido usar `gh` directamente.

### Instalación (una vez por máquina)
```powershell
winget install --id GitHub.cli
# reinicia PowerShell para que coja el PATH
gh auth login
# elegir: GitHub.com → HTTPS → Login with a web browser
```

### Flujo típico desde terminal
```powershell
# Abrir un PR de la rama actual
gh pr create --title "…" --body "…"

# Ver PRs abiertos
gh pr list

# Estado del CI de un PR
gh pr checks 123

# Leer issues abiertos
gh issue list
```

### Cuando retomar el MCP de GitHub
Si algún día se instala Claude Code CLI y se quiere automatizar flujos (ej. "Claude, abre un PR con el diff que acabas de hacer"), entonces sí merece la pena reactivarlo. La configuración Docker + PAT está documentada en la historia de este doc (commit previo). Por ahora, no.

---

## Decisión de reparto por agente

| Capacidad | Agente 1 Cowork | Terminal PowerShell (Juan) |
|---|---|---|
| Supabase — leer/migrar | ✅ (MCP UI) | ✅ (si instala Claude Code CLI, vía .mcp.json) |
| Vercel — deploys y logs | ✅ (MCP UI) | idem |
| GitHub — PRs/issues | ❌ (sin MCP) | ✅ (`gh` CLI) |
| `git push` real | ❌ (regla del proyecto) | ✅ (`git push`) |
| `npm test` / `npx tsc` | ❌ | ✅ |

Esto preserva la regla del `CLAUDE.md`: Cowork planifica y edita; la terminal hace commits, push, tests y abre PRs.

---

## Troubleshooting

- **`supabase: failed to start`** — revisa que `SUPABASE_ACCESS_TOKEN` está en `.env` y que tu token tiene acceso al proyecto.
- **Vercel pide login cada vez** — token OAuth caducado; vuelve a abrir el flujo desde la UI de Cowork.
- **`gh: command not found`** — `winget install --id GitHub.cli` y reinicia PowerShell.
- **`gh` no autentica** — `gh auth status` para ver estado; `gh auth login` para rehacer.

---

## Seguridad

- Los tokens viven **sólo** en `.env` local (ya gitignored).
- El PAT de GitHub debe ser **fine-grained** y limitado al repo `valere-v2`.
- El access token de Supabase puede revocarse en cualquier momento desde https://supabase.com/dashboard/account/tokens.
- Ni `.mcp.json` ni este doc contienen secretos — los secretos sólo existen en `.env` de cada máquina.
