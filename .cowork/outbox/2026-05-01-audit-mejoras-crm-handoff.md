# Handoff 2026-05-01 — Auditoría de mejora del CRM

**De:** Claude Cowork (sesión 2026-05-01, sobre `claude/sprint2-lib-potencias` HEAD `7980c6b`)
**Para:** Claude Code / próxima sesión
**Tipo:** estratégico — no urgente.

---

## Qué se ha hecho hoy

1. Verificación rigurosa del análisis estratégico de Juan (browser) contra el código real:
   - 5 áreas del análisis + capa técnica + UX/diseño.
   - Cada carencia clasificada como ✅ resuelta / 🟡 esqueleto sin cablear / ❌ inexistente.
2. Documento entregable: `docs/AUDIT_2026-05-01_MEJORAS_CRM.md`.
3. Roadmap accionable integrado en `docs/ROADMAP_FUSION.md` (FASES 30 → 33).
4. `docs/ESTADO.md` actualizado.

## Hallazgo más rentable

**Datadis está aislado del CRM.** Las 14 fichas Datadis bajadas no están vinculadas a `empresas`. Una vez vinculadas, todo lo demás (cálculo de ahorro en oportunidad, incidencias automáticas, informes energéticos, portal cliente) se desbloquea de golpe. Coste: ½–1 día (FASE 30.6 + 30.7).

## Hallazgo más urgente

**Edge Function `daily-contract-check` existe pero no está programada.** El cron está descrito en su README pero no en migrations. Resultado: contratos vencen sin que se cree la oportunidad de renovación, sin tarea, sin notificación. Coste: 15 min (FASE 30.1).

## Pre-requisito antes de empezar Sprint A

Cerrar `docs/SPRINT3_TSC_PENDIENTE.md` (~2.5 h, ya tiene plan paso a paso). Si no, el merge a `main` rompe CI y bloquea futuras PRs.

Plan: Fase A → B → C → D → E del SPRINT3_TSC_PENDIENTE, después se puede empezar FASE 30.1.

## Sprint A — FASE 30 (recomiendo abrirlo en una rama nueva `claude/audit-sprint-a`)

10 sub-fases, 5 días. Empezar por:

1. **30.1** Programar cron `daily-contract-check` (15 min).
2. **30.4** Mostrar `ahorro_anual_estimado` en Kanban (15 min) — visible en próximo demo.
3. **30.6 + 30.7** Vinculación Datadis ↔ Empresa.
4. **30.9** RLS granular tabla a tabla (1 d con observación entre cada tabla).

Detalle completo en `docs/ROADMAP_FUSION.md` sección "Sprints derivados de AUDIT_2026-05-01...".

## Decisiones que necesitan input de Juan

1. **`renovaciones` vs `oportunidades.tipo='renovacion'`** (FASE 30.2): mi recomendación es eliminar la tabla `renovaciones` y filtrar oportunidades. Pero si Juan ya pensaba en el módulo `/renovaciones` como vista separada, conviene mantener la tabla y conectar el cron a ella.
2. **Validador de facturas — proveedor LLM** (FASE 32.2): Anthropic Claude / Google Gemini / OpenAI / opción privada con pdfplumber + reglas. Decidir antes de firmar DPA.
3. **Fuente OMIE para informe "vencen en 90 d con precio mercado"** (FASE 31.8): API gratuita o snapshot manual semanal. Sugiero snapshot manual hasta validar uso real.
4. **Subsegmentos finos** (FASE 31.5): mantener los 5 actuales (industrial/comercial/servicios/agricola/residencial_colectivo) o ampliar a 8–10 con hostelería/sanitario/deporte/etc.

## Cosas a corregir en `CLAUDE.md` (no urgente)

- "39/39 tests" → real son 33 invocaciones en 6 ficheros.
- "Pendiente mover Gemini API a Edge Function" → ya está en `chat-consultor` Edge Function ✅, actualizar.

## Reglas aprendidas hoy

- El navegador es buen analista de producto pero no ve el código. Confiar en su priorización pero verificar el "no existe" — varios casos eran "existe pero no se usa", lo que cambia el coste por un orden de magnitud.
- Cuando la tabla, el SQL y la Edge Function ya están y sólo falta el cron, el coste es minutos. Detectar esos casos primero.
- Los design reviews previos (`docs/DESIGN_REVIEW_2026-04-20.md`) siguen vigentes — no rehacer, integrar.

— Cowork, 1 mayo 2026.
