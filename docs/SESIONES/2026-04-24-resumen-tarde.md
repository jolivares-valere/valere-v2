# Sesión 2026-04-24 (tarde-noche) — Migración Cloudflare + Mapa Estratégico v4

**Duración:** ~5h · **Rama:** `claude/docs-cierre-2026-04-23` → PR #6.

## Hilo de la sesión

Empezó como rescate del merge huérfano de la sesión anterior (resuelto por la mañana, ver `2026-04-24-resumen.md`), siguió con migración del CRM a Cloudflare Pages por suspensión de cuenta Vercel, derivó a auditoría de credenciales (2ª fuga detectada: VITE_GEMINI_API_KEY), y acabó como sesión estratégica completa con creación de un **mapa persistente** (artifact Cowork) que cubre todo el ecosistema Valere.

## Hitos

### 1. Merge huérfano cerrado (mañana)
- `git merge --abort` + limpieza de 6 lock files vía `mcp__cowork__allow_cowork_file_delete`.
- `git checkout -- .` para descartar 198 ficheros de ruido CRLF/LF.
- 3 docs sin commitear de la sesión 2026-04-23 → PR #6.
- Rama local `claude/mcp-setup` borrada (squash en main).

### 2. Migración CRM a Cloudflare Pages
- **Trigger**: cuenta Vercel `valere-consultores` SUSPENDIDA por billing → `valere-v2.vercel.app` caído.
- Análisis confirmó: `vercel.json` solo tenía config Vite estándar, sin `api/`, sin middleware, sin `@vercel/*` packages → migración trivial.
- Añadido `public/_redirects` (`/* /index.html 200`) para SPA routing en Cloudflare.
- Claude in Chrome (agente browser) ejecutó la migración completa: nuevo deploy en **`https://valere-v2.pages.dev`**.
- Build OK 28s. Login y navegación verificados.

### 3. 2ª fuga de credencial detectada y mitigada
- Al copiar env vars de Vercel → Cloudflare se encontró `VITE_GEMINI_API_KEY` (que no estaba en mi inventario).
- Análisis del código (grep en `src/`): **NO se usa en ninguna parte**. Era residual del frontend pre-FASE 20.8 (cuando el chat IA llamaba a Gemini directo desde cliente, antes del refactor a Edge Function de Supabase).
- Eliminada de Cloudflare (Production + Preview) + redeploy.
- Las 2 keys de Google AI Studio quedaron pendientes de revocar — se descubrió después que requiere inventario cross-app antes de revocar (Juan tiene otras apps que podrían usarlas).

### 4. Hallazgo crítico: chat IA del CRM = código huérfano + reframe completo
- `ChatIAPanel.tsx` existe en `src/features/chat-ia/` y la Edge Function `chat-consultor` está ACTIVE v2 en Supabase (verificado vía MCP).
- Pero **NO hay `<Route path="/chat-ia">` en `App.tsx` ni link en Sidebar** — la feature es inaccesible desde la UI.
- Juan clarificó el caso de uso real: **NO un consultor energético abierto, sino un asistente RAG sobre la documentación del CRM** (compañeros preguntan "cómo hago X" y el bot busca en la doc).
- Decisión: NO eliminar — REDISEÑAR con pgvector + embeddings de docs + Gemini API.

### 5. Mapa estratégico Valere — artifact persistente Cowork (4 versiones iteradas)
- **v1**: AS-IS inicial (apps, hosting, agentes, credenciales, decisiones, acciones).
- **v2**: input de Juan sobre las apps reales y reframe del chat IA.
- **v3**: hallazgo de 2 proyectos Supabase con duplicidad masiva (extraído via MCP `list_projects` + `list_tables`).
- **v4**: investigación web (OpenClaw, ChatGPT Workspace Agents, Workspace AI features, Arsys backup).

### 6. Investigación web — 3 búsquedas que cambian el plan
- **Workspace Business YA incluye Gemini Advanced + NotebookLM Plus + Gemini API GRATIS** desde enero 2025. Juan paga 80€/mes (5 cuentas × 16€) y nadie usa estas features → infrautilización masiva.
- **ChatGPT Workspace Agents existe** (lanzado 22-abr-2026). Mi análisis previo estaba mal: Juan tiene plan Empresa, SÍ tiene Workspace Agents disponibles.
- **OpenClaw** → control remoto requiere Mission Control (proyecto open-source 2.6k stars) + Cloudflare Tunnel para acceso seguro desde Cowork.

### 7. Plan Arsys ejecutable (Juan tiene Claude web gestionándolo)
- Histórico correos Arsys caduca en ~17 días (migración Workspace hace 13).
- 3 estrategias paralelas: Backup nativo Arsys (0,50€/mes, casi gratis con plan que tiene) + Thunderbird IMAP local (gratis) + Migration Tool de Workspace (re-import).
- Comparativa coste vs herramientas pro: Arsys Backup gana por mucho (~0€ vs $250-1000 USD).

### 8. Cuatro entregables creados en `docs/`
- `INFORME_VALERE_GESTION_ENERGETICA.md` — confirmado vía MCP que no tiene Supabase asociado, recomendación archivar.
- `PLAN_UNIFICACION_SUPABASE.md` — plan exhaustivo en 6 fases, basado en schema real extraído via MCP, mapeo campo a campo de las 5 tablas duplicadas.
- `COMUNICADO_NUEVO_URL_CRM.md` — borrador email/Slack listo para enviar al equipo Valere con el nuevo URL + recordatorio Workspace AI.
- `CREDENCIALES_1PASSWORD.csv` — 21 entradas importables a 1Password con todas las credenciales identificadas.

## Decisiones tomadas

1. **Hosting frontend**: Cloudflare Pages para las 3 apps (free, sin restricción comercial).
2. **Auth**: migrar a Google Identity cuando Workspace estable.
3. **Apps satélite**: código a medida (descartado AppSheet).
4. **Chat IA del CRM**: REDISEÑAR como asistente RAG sobre docs (NO eliminar).
5. **Workflow agentes**: Cowork (planificación) + Claude Code CLI (implementación token) + Claude in Chrome (dashboards) + OpenClaw (batch tarifa fija).
6. **Credenciales**: 1Password vault Valere.
7. **Supabase**: opción A — unificar a 1 proyecto canónico (sprint dedicado 10-12d).
8. **ChatGPT**: NO upgrade necesario (ya tiene Empresa).
9. **OpenClaw control remoto**: vía Mission Control + Cloudflare Tunnel.
10. **Workspace AI**: promover uso entre compañeros (incluido en pago actual).

## Pendientes para próxima sesión

### Urgente
- Verificar progreso del rescate Arsys (Claude web lo gestiona).
- Mergear PR #6 cuando CI pase.

### Siguiente sprint inmediato
- Inventario Gemini cross-app + revocar 2 keys probables huérfanas (después del mapa, ahora con confianza).
- Mandar comunicado a compañeros (`docs/COMUNICADO_NUEVO_URL_CRM.md` listo).
- Investigar repo `valere-gestion-energetica` en GitHub y archivar.
- Adoptar 1Password vault Valere e importar `docs/CREDENCIALES_1PASSWORD.csv`.
- Setup OpenClaw Mission Control + Cloudflare Tunnel.

### Sprint medio
- Migrar Potencias a Cloudflare Pages.
- Bajar Vercel a Hobby / borrar proyectos.

### Sprint largo
- Sprint dedicado de unificación Supabase (seguir `docs/PLAN_UNIFICACION_SUPABASE.md`).
- Diseñar e implementar asistente RAG del CRM.
- Migrar auth a Google Identity.
- Configurar dominios custom para las 3 apps.

## Aprendizajes

- **CRLF/LF en mounts Cowork**: cuando aparezcan 100+ ficheros "modificados" tras un merge, verificar con `git diff --numstat` antes de asumir. Si insertions == deletions línea a línea, es ruido y `git checkout -- .` lo limpia.
- **Lock files git**: usar `mcp__cowork__allow_cowork_file_delete` cuando el sandbox no puede borrarlos.
- **No revocar credenciales sin inventario cross-app**: se intentó revocar las 2 keys Gemini con un agente browser, Juan paró a tiempo recordando que tiene otras apps que podrían usarlas. Lección: SIEMPRE inventario antes de revocar en proyectos con múltiples apps.
- **Workspace Business AI**: Anthropic me hubo formado con info anterior a enero 2025. Update mental: Workspace Business INCLUYE Gemini Advanced gratis. Caso típico de "ya pagaba sin saberlo" — herramienta excelente para reducir coste IA en empresas con Workspace.
- **OpenClaw + ChatGPT Empresa**: el plan ChatGPT con suscripción cubre el coste por token de los agentes batch — combinación potente: agentes locales (OpenClaw) gratis dentro de la cuota.
- **2 proyectos Supabase con duplicidad**: es muy fácil acabar con backends fragmentados cuando se desarrollan apps en momentos distintos. La unificación duele 10-12 días pero ahorra meses de mantenimiento.
