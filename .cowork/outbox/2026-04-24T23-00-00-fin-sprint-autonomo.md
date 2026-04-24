# Handoff 2026-04-24 noche (sprint autónomo) → siguiente sesión

## Contexto

Juan me dio autonomía durante 2 horas para avanzar el plan. Completé 4 entregables grandes más 1 auditoría preventiva. Ningún agente browser involucrado — solo trabajo mío.

## Entregables creados/actualizados

### 📄 Nuevos docs

- `docs/AUDIT_SEGURIDAD_2026-04-24.md` — auditoría preventiva del repo. Resultado: limpio tras limpieza de `INSTRUCCIONES.md`. Recomendaciones: eliminar `.env.txt` (basura), activar Secret Scanning + Push Protection en GitHub, considerar gitleaks pre-commit.
- `docs/PLAN_MIGRACION_POTENCIAS_CLOUDFLARE.md` — plan paso a paso 3-4h. Incluye refactor previo (mover `VITE_GEMINI_API_KEY` a serverless) + setup Cloudflare + Pages Functions + verificación.
- `docs/PLAN_ASISTENTE_RAG_CRM.md` — actualizado con ruta estable única (sin NotebookLM como UI). 5 fases: estructura `docs/help/` + pipeline embeddings + Edge Function + widget + evolución progresiva.
- `docs/help/README.md` — índice y convenciones de la doc interna del CRM.
- `docs/help/empezando/primer-acceso.md` — cómo loguearse al CRM.
- `docs/help/empresas/crear-empresa.md` — alta de empresa paso a paso.
- `docs/help/empresas/importar-csv.md` — importación masiva CSV.
- `docs/help/oportunidades/pipeline-kanban.md` — uso del kanban + 8 etapas.
- `docs/help/actividades/registrar-actividad.md` — tipos de actividad + flujos.

### 🎨 Artifact actualizado

- **Mapa estratégico v5** en Cowork sidebar. Añade pestaña "📝 Cambios v5" que resume hallazgos de la investigación profunda.

### ✏️ Docs existentes actualizados

- `docs/ESTADO.md` — header actualizado con resumen sesión autónoma.
- Este archivo (handoff).

## Estado consolidado al cierre

### ✅ Completado hoy

1. Migración CRM a Cloudflare Pages (`valere-v2.pages.dev`).
2. 2 fugas credenciales cerradas (Resend rotada + VITE_GEMINI_API_KEY eliminada de Cloudflare).
3. INSTRUCCIONES.md limpio (key literal sustituida por nota).
4. Mapa estratégico v5 (artifact persistente).
5. Plan unificación Supabase exhaustivo (6 fases).
6. Plan asistente RAG ruta estable única (5 fases, sin dependencias externas).
7. Plan migración Potencias (incluye refactor pre-migración).
8. Auditoría seguridad preventiva del repo.
9. 6 docs de ayuda piloto (estructura `docs/help/`).
10. Comunicado para compañeros redactado.
11. CSV credenciales para 1Password.

### 🟡 En curso (otros agentes)

- **Backup Arsys**: gestionado por Claude web. Caduca en ~15-16 días (perdió 1 día desde ayer).

### 🟡 Pendientes sin urgencia

| # | Tarea | Responsable | Coste |
|---|---|---|---|
| 1 | Subir código excedentes de Drive a GitHub + auditar `.env` | Agente browser (prompt listo) | ~1h |
| 2 | Verificar key `...YuE` en cuenta personal Google AI Studio | Juan | 30 segundos |
| 3 | Rotar anon key Supabase personal `dtpbghvfxwyvkugtsojr` | Juan (si el proyecto sigue activo) | 2 min |
| 4 | Eliminar `.env.txt` del repo (basura) | Juan PowerShell | 30 segundos |
| 5 | Activar Secret Scanning + Push Protection en GitHub | Juan | 1 min |
| 6 | Mandar comunicado a compañeros (nuevo URL CRM) | Juan | 5 min |
| 7 | Importar CSV credenciales a 1Password | Juan (cuando monte vault) | 10 min |
| 8 | Mergear PR #6 cuando CI verde | Juan | 1 min |

### 🔴 Pendientes de sprint (2-4 semanas)

- Refactor Potencias (`VITE_GEMINI_API_KEY` → serverless) — ver `docs/PLAN_MIGRACION_POTENCIAS_CLOUDFLARE.md`.
- Migrar Potencias a Cloudflare Pages (tras refactor).
- Bajar Vercel a Hobby / borrar proyectos.

### 🔴 Pendientes de sprint largo (4-8 semanas)

- Sprint dedicado unificación Supabase (6 fases, 10-12d) — ver `docs/PLAN_UNIFICACION_SUPABASE.md`.
- Implementar asistente RAG del CRM (5 fases, ~15-20h) — ver `docs/PLAN_ASISTENTE_RAG_CRM.md`.
- Migrar auth a Google Identity.
- Dominios custom para las 3 apps.

## Comandos PowerShell para cerrar commit

```powershell
cd $HOME\valere-v2

git status
# Deberías ver los siguientes archivos:
# - docs/ESTADO.md (modified)
# - docs/help/ (new dir con 6 archivos)
# - docs/PLAN_ASISTENTE_RAG_CRM.md (modified)
# - docs/PLAN_MIGRACION_POTENCIAS_CLOUDFLARE.md (new)
# - docs/AUDIT_SEGURIDAD_2026-04-24.md (new)
# - .cowork/outbox/2026-04-24T23-00-00-fin-sprint-autonomo.md (new)

git add docs/ESTADO.md docs/help docs/PLAN_ASISTENTE_RAG_CRM.md docs/PLAN_MIGRACION_POTENCIAS_CLOUDFLARE.md docs/AUDIT_SEGURIDAD_2026-04-24.md ".cowork/outbox/2026-04-24T23-00-00-fin-sprint-autonomo.md"

git commit -m "docs: sprint autonomo noche (help docs + plan potencias + audit seguridad + ruta estable asistente)"

git push origin claude/docs-cierre-2026-04-23
```

Eso completa el PR #6 con todo.

## Mensaje para Juan al retomar sesión

"He leído el mapa estratégico v5 y el handoff. Resumen corto: sprint autónomo de hoy avanzó el plan en 4 frentes (asistente RAG Fase 1, plan migración Potencias, auditoría seguridad, estructura docs/help con 5 docs piloto). Lo más urgente sigue siendo el backup Arsys (~15 días). ¿Cómo va el rescate? ¿Por dónde seguimos?"

## Reglas aprendidas esta sesión

- **Fragmentar prompts al agente browser genera fricción** — consolidar tareas relacionadas en 1 solo prompt cuando sea posible.
- **"Ruta estable" como criterio arquitectónico** → evitar dependencias de productos externos específicos para experiencia usuario. Solo como herramientas personales opcionales.
- **NO revocar credenciales sin inventario cross-app** — la rotación defensiva es siempre más segura que revocar a ciegas.
- **Workspace Gemini no es para APIs externas** — es para usuarios humanos en Gmail/Docs. Para apps custom, Gemini API estándar (free tier suficiente a vuestra escala).
- **Drive sincronizando `node_modules/` es antipatrón** — añadir a exclusiones Drive Desktop.
