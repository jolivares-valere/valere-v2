# MCP Setup — Valere CRM

Guía para conectar los 3 MCPs (Supabase, Vercel, GitHub) a los agentes Claude del proyecto.

> **Resumen ejecutivo:** Supabase y Vercel se conectan a **Cowork** (agente 1) desde el botón "Connect" en la UI. GitHub no existe como MCP oficial en el registro de Claude, así que se usa el servidor auto-hosteado (oficial de GitHub) vía `.mcp.json` en **Claude Code CLI** (agente 2). Este fichero vive en la raíz del repo.

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

## 3. GitHub MCP (auto-hosteado)

GitHub **no tiene MCP oficial en el registro de Cowork**. Se usa el servidor oficial de GitHub (imagen Docker) vía `.mcp.json`, que solo funciona en **Claude Code CLI**.

### Requisitos previos
- Docker Desktop instalado y arrancado (Windows/Mac).
  - Alternativa sin Docker: usar el binario nativo de [`github-mcp-server`](https://github.com/github/github-mcp-server/releases) y cambiar el bloque `github` en `.mcp.json` a `"command": "<ruta-al-binario>"`.

### Crear Personal Access Token (PAT)
1. Ir a https://github.com/settings/tokens (pestaña "Fine-grained tokens" recomendada).
2. **Scopes mínimos:**
   - Repository access: `jolivares-valere/valere-v2` (sólo este repo)
   - Repository permissions: `Contents: Read & Write`, `Issues: Read & Write`, `Pull requests: Read & Write`, `Actions: Read`, `Metadata: Read`
3. Copiar el token `ghp_...` o `github_pat_...`.
4. Añadir a `.env`:

```bash
echo "GITHUB_PERSONAL_ACCESS_TOKEN=github_pat_xxxxxxxxxxxxxxxxxxxxxxxx" >> .env
```

> `.env` ya está en `.gitignore`. **Nunca commitear el token.**

### Verificar
Reinicia Claude Code CLI en la raíz del repo:
```bash
cd ~/valere-v2
claude mcp list    # debe aparecer "github: connected"
```

Primera prueba: pide a Claude Code "lista los últimos 5 PRs abiertos de este repo".

### Qué desbloquea
- Abrir PRs, crear issues, comentar sobre cambios desde Claude sin salir del CLI
- Leer estado del CI de GitHub Actions (los 39/39 tests + TSC 0 errores)
- Revisar histórico de commits y autores
- Listar branches y comparar diffs remotos

---

## Decisión de reparto por agente

| Capacidad | Agente 1 Cowork | Agente 2 Claude Code CLI |
|---|---|---|
| Supabase — leer/migrar | ✅ (MCP UI) | ✅ (.mcp.json) |
| Vercel — deploys y logs | ✅ (MCP UI) | ✅ (.mcp.json) |
| GitHub — PRs/issues | ❌ (no hay MCP en registry) | ✅ (.mcp.json auto-hosteado) |
| `git push` real | ❌ (regla del proyecto) | ✅ |

Esto preserva la regla del `CLAUDE.md`: Cowork planifica y edita; Claude Code CLI es el único que hace commits y push.

---

## Troubleshooting

- **`supabase: failed to start`** — revisa que `SUPABASE_ACCESS_TOKEN` está en `.env` y que tu token tiene acceso al proyecto.
- **`github: docker: command not found`** — Docker Desktop no arrancado o no instalado. Arranca Docker o cambia a binario nativo.
- **Vercel pide login cada vez** — token OAuth caducado; vuelve a abrir el flujo desde la UI de Cowork o re-ejecuta `claude mcp auth vercel`.
- **Ver qué MCPs ve Claude Code** — `claude mcp list` desde la raíz del repo.

---

## Seguridad

- Los tokens viven **sólo** en `.env` local (ya gitignored).
- El PAT de GitHub debe ser **fine-grained** y limitado al repo `valere-v2`.
- El access token de Supabase puede revocarse en cualquier momento desde https://supabase.com/dashboard/account/tokens.
- Ni `.mcp.json` ni este doc contienen secretos — los secretos sólo existen en `.env` de cada máquina.
