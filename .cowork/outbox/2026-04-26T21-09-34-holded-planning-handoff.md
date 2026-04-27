# Handoff — Planificación integración Holded (sin código todavía)

**Fecha:** 2026-04-26 21:09 UTC
**Agente:** Cowork
**Para:** Juan + próxima sesión Cowork dedicada a Holded
**Contexto:** Juan recibió análisis del agente Browser sobre cuenta Holded, esta sesión Cowork lo procesó y produjo plan adaptado al stack real Valere.

---

## TL;DR

- **3 documentos creados** en `docs/`:
  1. `HOLDED_INFORME_BROWSER_2026-04-26.md` — informe original preservado.
  2. `PLAN_INTEGRACION_HOLDED.md` — plan adaptado a Supabase + Edge Functions + pg_cron.
  3. `COWORK_PROMPT_HOLDED_INTEGRATION.md` — prompt de arranque para nueva sesión Cowork dedicada.
- **Ningún código tocado**. Todo es planificación.
- **Trabajo en curso intacto**: smoke test signup sigue su curso, Fase 2 unificación intacta, Cloudflare Potencias intacto.
- **0€ de coste adicional infra** — todo cabe en plan Free Supabase + Resend.

---

## Lo que NO se hizo (intencional)

- No se aplicó ninguna migration.
- No se desplegó ninguna Edge Function.
- No se modificó código de `src/`.
- No se generó API Key de Holded.
- No se lanzó ninguna nueva sesión Cowork.

Todo está pendiente de que Juan tome 7 decisiones y dé el "go" para arrancar.

---

## Para Juan — qué hacer ahora (en orden)

### Primero: cerrar trabajos en curso

1. **Smoke test signup** — esperando confirmación de los 2 emails Resend (sigue en curso con agente Browser).
2. **Fase 2 unificación Potencias** — 60 min con backups via pg_dump+psql. Protocolo en `scripts/unificacion_fase2_protocolo.md`.
3. **Cloudflare Potencias rollback URL** — 5 min, prompt redactado en chat.
4. **Push acumulado sprints 5-8** vía `RUNBOOK.ps1` original.

### Después: tomar las 7 decisiones para Holded

Sección 6 del plan: `docs/PLAN_INTEGRACION_HOLDED.md`. Resumen:

1. ¿Cuándo arrancamos? Recomendado: post-Fase-2-unificación + post-Cloudflare-Potencias.
2. ¿Holded tiene sandbox separado?
3. ¿Generar API Key dedicada "Valere CRM Integration"?
4. ¿Catálogo de productos: pull-only o sync bidireccional?
5. ¿Incluir Fase 7 (proyectos + time-tracking) o saltar?
6. ¿Quién ejecuta: nueva sesión Cowork o Claude Code CLI?
7. ¿Plazo: urgente 2 semanas o tranquilo 1-2 meses?

### Cuando todo esté listo

1. Genera API Key Holded en Configuración → Desarrolladores. Nombre "Valere CRM Integration".
2. Métela en Vault (Dashboard Supabase → Vault → Add secret `HOLDED_API_KEY`).
3. Abre nueva sesión Cowork. Pega el bloque entre `<<<INICIO>>>` y `<<<FIN>>>` de `docs/COWORK_PROMPT_HOLDED_INTEGRATION.md`.
4. Esa sesión arranca por Fase 0 (auditoría datos) + Fase 1 (infraestructura).

---

## Estimación de esfuerzo del plan completo

| Fase | Días persona | Bloquea siguiente fase |
|---|---|---|
| 0 — Auditoría datos | 1-2 | Sí |
| 1 — Infraestructura | 2-3 | Sí |
| 2 — Catálogos pull-only | 1 | Sí |
| 3 — Contactos bidireccional | 3-4 | No (paralelo posible con 4) |
| 4 — Leads/oportunidades | 3-4 | No |
| 5 — Documentos comerciales | 4-5 | Sí (depende de 3 y 4) |
| 6 — Cobros + conciliación | 2-3 | Sí (depende de 5) |
| 7 — Proyectos + time-tracking | 3-4 | Opcional |
| 8 — Optimización + observabilidad | 2-3 | No |
| **Total con Fase 7** | **21-29** | |
| **Total sin Fase 7** | **18-25** | |

Ritmo realista: 1 fase por semana = ~8 semanas calendario para integración completa.
Hito de "operativo desde Valere" = Fase 5 cerrada = ~5 semanas.

---

## Riesgos clave identificados

1. **Fase 2 unificación Potencias debe ir antes de Fase 0 Holded**. Si no, auditamos datos 2 veces y propagamos suciedad.
2. **Sin sandbox Holded** la primera sync inicial es delicada. Mitigación: dry-run obligatorio en Fase 3.
3. **API Key única** — si se pierde, integración cae. Plan de rotación 90d + alerta.
4. **Volumen de contactos en Holded ("varios miles")** vs Valere CRM (3 actuales + ~30 post-Fase-2). Primera sincronización con paginación.
5. **Holded sin webhooks** → polling cada 15 min con pg_cron. Latencia aceptable para flujo no real-time.

---

## Estado de tareas (Cowork tracker)

- ✅ Procesar informe Browser → guardado en `docs/`.
- ✅ Producir plan adaptado al stack Valere → `docs/PLAN_INTEGRACION_HOLDED.md`.
- ✅ Redactar prompt para nueva sesión Cowork (no Claude Desktop) → `docs/COWORK_PROMPT_HOLDED_INTEGRATION.md`.
- ✅ Outbox handoff (este archivo).
- ✅ Actualizar `docs/ESTADO.md` (siguiente paso de esta sesión Cowork).

---

## Para próxima sesión Cowork (cuando Juan la lance)

Lee como mínimo:

1. `CLAUDE.md` — contexto + arquitectura + stack.
2. `docs/ESTADO.md` — estado del proyecto en tiempo real.
3. `docs/HOLDED_INFORME_BROWSER_2026-04-26.md` — informe original.
4. `docs/PLAN_INTEGRACION_HOLDED.md` — plan adaptado.
5. Este outbox.

Tu sprint: **Fase 0 + Fase 1** del plan. Nada más. Detalles operativos en `docs/COWORK_PROMPT_HOLDED_INTEGRATION.md`.
