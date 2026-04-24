# Handoff sprint autónomo 4 → próxima sesión

## Logros

Continuación del sprint 3 (asistente RAG completo). Este sprint avanza las **siguientes fases del plan general** sin intervención de Juan:

1. ✅ **Fase 0 Unificación Supabase diseñada** — documento exhaustivo con schema SQL canónico, scripts de migración, plan rollback. Ahorra 2-3 días del sprint dedicado.
2. ✅ **Tabla `crm_asistente_log` aplicada en Supabase** — logger anonimizado para métricas de uso del asistente. Edge Function actualizada para logear cada consulta.
3. ✅ **Plan migración Auth a Google Identity documentado** — paso a paso 6 fases, listo para ejecutar cuando Workspace esté estable.
4. ✅ **3 docs help/ calculadora** (captura facturas, comparativo, propuestas) → **23 docs help/ totales**.

## Entregables

### Docs nuevos

- `docs/PLAN_UNIFICACION_SUPABASE_FASE_0.md` (el más importante del sprint)
- `docs/PLAN_MIGRACION_AUTH_GOOGLE_IDENTITY.md`
- `docs/help/datos/captura-facturas.md`
- `docs/help/analisis/comparativo-ofertas.md`
- `docs/help/propuestas-energia/generar-propuesta.md`

### Migration SQL aplicada

- `supabase/migrations/20260425_asistente_log.sql` — tabla `crm_asistente_log` + vista `crm_asistente_top_no_respondidas` + policies RLS (admin read, service write).
- Extensión `pg_trgm` activada (necesaria para búsqueda fuzzy de preguntas similares).

### Código modificado

- `supabase/functions/ask-crm-docs/index.ts` — añadido `logAsistente()` que registra cada consulta anonimizada (sin user_id ni IP, por RGPD). Escribe siempre, falla silenciosamente si hay error (no bloquea respuesta al usuario).

## Novedades importantes

### Fase 0 Unificación Supabase — lo más denso del sprint

El documento `docs/PLAN_UNIFICACION_SUPABASE_FASE_0.md` contiene:

- **Decisiones arquitectónicas cerradas**: naming canónico, single catálogo comercializadoras, estrategia de dedupe, región eu-west-1.
- **Schema SQL completo de 36 tablas** canónicas (ya puede copiarse y aplicarse).
- **Scripts de migración** con ejemplos concretos de dedupe (empresas por CIF normalizado, CUPS por código, mapping legacy → canónico).
- **Plan de rollback** por fase.
- **Scripts de verificación post-migración** (contadores, integridad referencial, duplicados).
- **RLS policies canónicas** con pattern común para comerciales/manager/master.

Cuando Juan dé go para el sprint de unificación, este documento elimina la fase de diseño (que habría costado 2-3 días). El sprint pasa de 10-12d a **7-9d persona**.

### Asistente log — habilita métricas

A partir del próximo deploy de la Edge Function `ask-crm-docs`, cada consulta se registra con:

- Pregunta original + pregunta normalizada (lowercase+trim).
- Sección (de qué página venía).
- `encontrada_respuesta` (true/false según chunks).
- Top similarity.
- Duración ms.

Sin user_id ni IP (privacidad por diseño).

La vista `crm_asistente_top_no_respondidas` da las **top 50 preguntas sin respuesta de las últimas 4 semanas**. Sirve como TODO automático para escribir nuevos docs `help/` según el uso real.

Futuro: crear pantalla admin en el CRM para ver estas métricas (Admin → Uso asistente). Trabajo de ~1h.

### Plan Auth Google Identity

Documento listo para cuando Workspace esté estable. Puntos clave:

- **Dual-mode 1 mes**: email+password y Google simultáneos para transición suave.
- **Trigger SQL `handle_new_user`** para crear automáticamente `user_profiles` tras OAuth.
- **Policy Google Workspace-only** (`hd=valereconsultores.com`) — solo cuentas Workspace org pueden entrar.
- **Beneficios**: 1 click login, 2FA gratuita heredada de Workspace, desactivación automática al dar de baja en Workspace.

## Estado del plan general

### ✅ Completado hasta ahora

- CRM migrado a Cloudflare Pages.
- 2 fugas credenciales cerradas + INSTRUCCIONES.md limpio.
- Mapa estratégico v5 persistente en Cowork.
- Asistente RAG end-to-end (backend + frontend + 23 docs help/).
- Fase 2 RAG desplegada (pgvector + tabla + función + RLS).
- Tabla asistente_log para métricas desplegada.
- Auditoría seguridad preventiva (limpio).
- Fase 0 Unificación Supabase diseñada.
- Plan migración Auth documentado.
- Plan migración Potencias documentado.
- Plan Arsys documentado.
- Setup OpenClaw documentado.

### 🟡 Listo para activar (requiere Juan)

- Deploy Edge Function `ask-crm-docs` + configurar secrets.
- Activar workflow GitHub `regenerate-help-embeddings` + secrets GitHub.
- Rotación defensiva keys Gemini (opcional, cuando se haga deploy).
- Commit + push de todo lo pendiente al PR #6.

### 🟡 Esperando input (Juan / agentes externos)

- Backup Arsys terminando (Claude web).
- Subir excedentes de Drive a GitHub (agente browser cuando pueda).
- Verificar key ...YuE en cuenta personal Google (Juan, 30 seg).

### 🔴 Sprints grandes pendientes

- Unificación Supabase (ahora 7-9d con Fase 0 hecha).
- Migración Potencias a Cloudflare (3-4h con refactor).
- Migración Auth a Google Identity (4-6h cuando Workspace estable).

## Comandos PowerShell para commitear

```powershell
cd $HOME\valere-v2

git add docs/ESTADO.md docs/PLAN_UNIFICACION_SUPABASE_FASE_0.md docs/PLAN_MIGRACION_AUTH_GOOGLE_IDENTITY.md supabase/migrations/20260425_asistente_log.sql supabase/functions/ask-crm-docs/index.ts docs/help/datos docs/help/analisis docs/help/propuestas-energia ".cowork/outbox/2026-04-25T01-30-00-sprint-autonomo-4-fase-0-supabase.md"

git commit -m "feat+docs: sprint autonomo 4 - fase 0 unificacion supabase + asistente_log + plan auth google + 3 docs calculadora

- docs/PLAN_UNIFICACION_SUPABASE_FASE_0.md: schema canonico SQL completo (36 tablas) + scripts migracion con dedupe CIF/CUPS + plan rollback (ahorra 2-3d del sprint dedicado)
- Migration crm_asistente_log aplicada + vista crm_asistente_top_no_respondidas + Edge Function ask-crm-docs loguea anonimizado
- docs/PLAN_MIGRACION_AUTH_GOOGLE_IDENTITY.md: 6 fases paso a paso con dual-mode y trigger SQL
- 3 docs help/ calculadora: captura-facturas, comparativo-ofertas, generar-propuesta (23 totales)"

git push origin claude/docs-cierre-2026-04-23
```

## Mensaje para Juan al retomar

"He leído el estado. Sprint 4 hecho: Fase 0 Unificación Supabase completamente diseñada (el sprint grande pasa de 10-12d a 7-9d), tabla asistente_log ya desplegada + Edge Function la usa, plan migración Auth a Google listo, 3 docs help calculadora añadidos (23 totales). Estado general: muchísimo documentado + implementado. Pendiente activación operativa (deploy Edge Function + secrets GitHub + reactivar Vercel o no). ¿Por dónde seguimos?"

## Reglas aprendidas

- **SQL migrations con `create extension if not exists`** es obligatorio si la extensión puede no estar ya activada — no todas las cuentas Supabase traen todo activado (pg_trgm no estaba).
- **Logs anonimizados por diseño**: no guardar user_id/IP en `crm_asistente_log`, solo lo mínimo para análisis. Evita problemas RGPD y simplifica la política de retención.
- **Dedupe strategy por campo normalizado**: usar función `normalizar_cif(text)` idempotente permite ejecutar y re-ejecutar los scripts sin duplicar.
- **Separar diseño (Fase 0) de ejecución (Fases 1-5)** para sprints grandes: permite revisar y ajustar antes de tocar datos reales.
