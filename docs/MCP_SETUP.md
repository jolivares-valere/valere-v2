# MCP Setup — Valere CRM

Guia para conectar los MCPs a los agentes Claude del proyecto.

> **Resumen ejecutivo:** Supabase y Vercel se conectan a **Cowork** (agente 1) desde el boton "Connect" en la UI, y en .mcp.json para **Claude Code CLI** (agente 2). GitHub queda **fuera** de MCP — se usa gh CLI (GitHub CLI) a mano desde la terminal. Decision tomada 2026-04-23: el MCP oficial de GitHub no esta en el registro de Claude y el workaround auto-hosteado (Docker) anade complejidad sin retorno claro mientras Claude Code CLI no este instalado.

---

## 1. Supabase MCP

### En Cowork (agente 1)
1. Abre la conversacion con Claude.
2. Cuando Claude muestre la tarjeta "Supabase -> Connect", pulsa **Connect**.
3. Autoriza con tu cuenta Supabase (la que administra el proyecto gtphkowfcuiqbvfkwjxb).
4. Verifica con: list_projects -> debe aparecer gtphkowfcuiqbvfkwjxb.

### En Claude Code CLI (agente 2)
El .mcp.json de la raiz ya lo tiene configurado. Necesita la variable de entorno:

- Genera un Personal Access Token en https://supabase.com/dashboard/account/tokens
- Alcance minimo: acceso al proyecto gtphkowfcuiqbvfkwjxb
- Anadir a .env: SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxx

Reinicia Claude Code CLI. Verifica: claude mcp list — debe aparecer "supabase: connected".

### Que desbloquea
- Ejecutar migrations desde Claude sin copiar al dashboard.
- Consultar tablas en vivo (empresas, contratos, cups, etc.).
- Desplegar Edge Functions (chat-consultor, daily-contract-check).
- Revisar RLS policies contra la BD real.

---

## 2. Vercel MCP

### En Cowork (agente 1)
1. Pulsa **Connect** en la tarjeta de Vercel.
2. Autoriza con tu cuenta Vercel (la que tiene el proyecto valere-v2).
3. list_teams funciona (cuenta personal devuelve array vacio). Para list_projects / list_deployments se necesita teamId u orgId (ver 2.1).

### 2.1 Para que Vercel MCP devuelva proyectos en cuenta personal
Desde terminal con Vercel CLI:
- npm i -g vercel
- cd C:\Users\joliv\valere-v2
- vercel link  (crea .vercel/project.json con orgId personal)

### En Claude Code CLI (agente 2)
El .mcp.json apunta al endpoint HTTP oficial (https://mcp.vercel.com/). No requiere token en .env; Claude Code abrira flujo OAuth la primera vez.

### Que desbloquea
- Ver estado y logs de deploys recientes sin entrar al dashboard.
- Diagnostico de builds fallidos.
- Lectura de variables de entorno del proyecto.

**Limitacion:** el MCP de Vercel es mayormente lectura. Los deploys siguen disparandose por git push.

---

## 3. GitHub — sin MCP, con gh CLI

Decision: **GitHub fuera de MCP**. El MCP oficial de GitHub no esta en el registro de Claude, y el workaround auto-hosteado (Docker + github-mcp-server + PAT fine-grained) exige Claude Code CLI instalado y Docker corriendo. Mientras eso no pase, es mas rapido usar gh directamente.

### Instalacion (una vez por maquina)
- winget install --id GitHub.cli
- reinicia PowerShell
- gh auth login (elegir: GitHub.com -> HTTPS -> Login with a web browser)

### Flujo tipico desde terminal
- Abrir un PR de la rama actual: gh pr create --title "..." --body "..."
- Ver PRs abiertos: gh pr list
- Estado del CI de un PR: gh pr checks 123
- Leer issues abiertos: gh issue list

### Cuando retomar el MCP de GitHub
Si algun dia se instala Claude Code CLI y se quiere automatizar flujos (ej. "Claude, abre un PR con el diff que acabas de hacer"), entonces si merece la pena reactivarlo. La configuracion Docker + PAT esta documentada en la historia de este doc. Por ahora, no.

---

## Decision de reparto por agente

| Capacidad | Agente 1 Cowork | Terminal PowerShell (Juan) |
|---|---|---|
| Supabase — leer/migrar | Si (MCP UI) | Si (si instala Claude Code CLI, via .mcp.json) |
| Vercel — deploys y logs | Si (MCP UI) | idem |
| GitHub — PRs/issues | No (sin MCP) | Si (gh CLI) |
| git push real | No (regla del proyecto) | Si (git push) |
| npm test / npx tsc | No | Si |

Esto preserva la regla del CLAUDE.md: Cowork planifica y edita; la terminal hace commits, push, tests y abre PRs.

---

## Troubleshooting

- **supabase: failed to start** — revisa que SUPABASE_ACCESS_TOKEN esta en .env y que tu token tiene acceso al proyecto.
- **Vercel pide login cada vez** — token OAuth caducado; vuelve a abrir el flujo desde la UI de Cowork.
- **gh: command not found** — winget install --id GitHub.cli y reinicia PowerShell.
- **gh no autentica** — gh auth status para ver estado; gh auth login para rehacer.

---

## Seguridad

- Los tokens viven **solo** en .env local (ya gitignored).
- El access token de Supabase puede revocarse en cualquier momento desde https://supabase.com/dashboard/account/tokens.
- Ni .mcp.json ni este doc contienen secretos — los secretos solo existen en .env de cada maquina.
