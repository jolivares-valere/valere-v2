# Plan de depuración + nuevas ideas en paralelo (1 mayo 2026)

> Tras la preocupación de Juan: *"me preocupa dejar de mejorar el CRM para avanzar propuestas nuevas, quiero depurar lo ya trabajado y continuar con nuevas ideas"*. Este documento inventario el loose ends actual del proyecto, los clasifica y propone un calendario que mezcla depuración + Release 1 captación sin acumular deuda.

---

## 1. La preocupación de Juan es correcta

**Sí, hay riesgo real de acumular deuda técnica si avanzamos con propuestas nuevas sin cerrar lo abierto.** Reconozco que en las últimas 2 sesiones he producido mucho documento + código + migrations sin cerrar el ciclo (commit, validar adopción, medir).

La regla operativa correcta para Valere es:

> **No abrir un nuevo sprint hasta haber cerrado el anterior** (commit en main, TSC verde, tests pasando, sanity check con usuario real).

Y a más largo plazo:

> **30% del tiempo a depuración** (deuda técnica, bugs, refactors menores) y **70% a nuevas funcionalidades**. Sin esa proporción, en 6 meses todo se vuelve frágil.

---

## 2. Inventario de loose ends — qué hay abierto hoy

### 🔴 Crítico (bloquea futuros avances)

1. **TSC roto en `claude/sprint2-lib-potencias`** (~60 errores documentados en `docs/SPRINT3_TSC_PENDIENTE.md`).
   - Impacto: bloquea merge a main, bloquea CI, bloquea cualquier release.
   - Coste cierre: ~2.5h según plan documentado.

2. **Sprint A aplicado hoy NO commiteado**.
   - Impacto: si crash de máquina o cambio de rama, se pierde el trabajo.
   - Coste cierre: 1h (`npm install`, `tsc`, `tests`, sanity, `git add`, commit, push).

3. **Wizard contacto decisor sin validar uso real**.
   - Impacto: ChatGPT advertía de esto — implementamos algo sin que Carolina/Juan lo prueben. Puede tener fricción y nadie lo usa.
   - Coste cierre: 30 minutos de prueba conjunta + ajuste si hace falta.

### 🟠 Importante (puede esperar pero no más de 1-2 semanas)

4. **Sprint A pendientes** (30.2, 30.3, 30.7, 30.9).
   - 30.2 — Consolidar renovaciones vs oportunidades (decisión Juan + ~2h ejecución).
   - 30.3 — Cerrar etapas legacy oportunidades (~2h con verificación previa).
   - 30.7 — Vinculación masiva Datadis por NIF (Edge Function nueva, ~1 día).
   - 30.9 — Aplicar RLS granular FASE 20.9 (~2 días con observación tabla a tabla).

5. **111 `as never` legados** — la BD tiene tipos `Database` regenerados pero código antiguo no fue limpiado.
   - Impacto: cuando alguien añade query nueva, copia el patrón roto.
   - Coste cierre: 1 día de limpieza por features.

6. **15 documentos `docs/` creados en últimas 24h** — algunos solapan, otros se contradicen.
   - Lista: AUDIT_2026-05-01_MEJORAS_CRM.md, AUDIT_2026-05-01_PROFESIONAL_SECTOR.md, COMPARATIVA_COWORK_VS_CHATGPT_2026-05-01.md, PLAN_CAROLINA_ENGINE_2026-05-01.md, PLAN_CAPTACION_PROFESIONAL_2026-05-01.md, RELEASE_1_CAPTACION_2026-05-01.md, PROMPT_CHATGPT_SECOND_OPINION_2026-05-01.md, PLAN_DEPURACION_2026-05-01.md (este).
   - Coste cierre: 1h de consolidación → un único índice `docs/INDICE_2026-05-01.md` que apunte a cada uno.

7. **Validación contacto decisor solo en CREATE** — si Juan crea empresa por importador CSV (no UI), bypasea la validación.
   - Coste cierre: añadir validación en `src/features/importador/` también, ~2h.

### 🟡 Deuda aceptable (gestionable a largo plazo)

8. **Cobertura tests 3%** (6 archivos test, 33 tests reales). No es bloqueante mientras no haya regresiones graves; subir a 30% es FASE 33.3.

9. **Dos escuelas visuales** (CRM `rounded-md` vs Calc `rounded-xl`). Comprometedor pero no funcional. FASE 33.2.

10. **30 botones icon-only sin aria-label**. A11y deuda, no funcional. FASE 33.2 paralela a convergencia visual.

11. **5 `confirm()` nativos sin migrar a ConfirmDialog**. UI inconsistente, no funcional. FASE 33.2.

12. **Tabla móvil no responsive**. Pyme con CFO en iPhone podría ser problema; bajo impacto hoy. FASE 33.5.

13. **Modo oscuro pendiente**. Cero impacto producto. FASE 33.6.

### 🟢 Investigaciones pendientes (no son deuda, son conocimiento)

14. **¿Se usa el RAG asistente CRM `/asistente-crm`?** Si <10 consultas/semana → eliminar.
    - Coste cierre: query a `crm_help_embeddings` o tabla `asistente_log` para medir, decidir.

15. **¿Cuáles son las etapas reales en oportunidades hoy?** Para FASE 30.3 hay que verificar antes.
    - `SELECT etapa, count(*) FROM oportunidades WHERE deleted_at IS NULL GROUP BY etapa;` — yo lo puedo lanzar.

16. **¿Cuántos eventos genera `daily_contract_check` mañana?** El cron está activo, mañana 04:00 UTC corre por primera vez en serio.
    - Coste verificación: 5 min mañana ver `actividades` creadas.

---

## 3. Plan integrado — depuración + Release 1 en paralelo

Propongo distribuir 4 semanas mezclando bloques **DEP** (depuración) y **R1** (Release 1 captación).

### Semana 1 — Cierre crítico + arranque R1

| Día | Bloque | Tarea | Estado al final |
|---|---|---|---|
| L | DEP | Cerrar TSC sprint2-lib-potencias (Code en PowerShell) | TSC=0, mergeable |
| M | DEP | Commit + push Sprint A aplicado hoy (npm install, tsc, tests, sanity) | Sprint A en main |
| M | DEP | Validación uso wizard contacto decisor con Juan (15 min sesión) | OK o iterar |
| X | DEP | Sprint A pendiente: 30.2 + 30.3 con verificación previa BD | Pipeline limpio, renovaciones consolidadas |
| X | R1 | Schema Release 1 (motivos pérdida + origen canal + auditoría contacto) — yo aplico vía MCP | Migration en prod |
| J | R1 | UI lista priorizada `/captacion` (subagente) | Pantalla lista accesible |
| V | R1 | UI ficha llamada activa + outcomes (subagente) | Workflow llamada cerrable |

**Outcome semana 1:** TSC verde, sprint A mergeado, primeros 3 días de Release 1 listos. Cero deuda nueva.

### Semana 2 — Continúa R1 + depuración media

| Día | Bloque | Tarea |
|---|---|---|
| L | R1 | UI alta lead unificada (empresa+contacto+oportunidad 1 form) |
| M | R1 | PDF diagnóstico Release 1 con disclaimers correctos |
| M | DEP | Limpieza `as never` en `incidencias/api.ts` (25) y `renovaciones/api.ts` (20) ahora que tipos están regenerados |
| X | R1 | Plantilla email + botón "Copiar a Gmail draft" |
| J | R1 | Compliance LOPDGDD: tabla auditoría + flag no_llamar + texto modelo |
| V | R1 | Dashboard mínimo Carolina + supervisor + sesión QA con Carolina |

**Outcome semana 2:** Release 1 funcional al 90%. 45 `as never` retirados.

### Semana 3 — Validación R1 + Sprint A faltante

| Día | Bloque | Tarea |
|---|---|---|
| L-M | R1 | Carolina trabaja con CRM real, Cowork acompaña en directo, bugfixes |
| X | R1 | Sesión iterativa Carolina + Juan, ajustes finos |
| J | DEP | Sprint A 30.7: vinculación masiva Datadis por NIF (Edge Function) |
| V | DEP | Limpieza `as never` en `calendario/api.ts` (17) + `documentos/api.ts` (9) |

**Outcome semana 3:** Release 1 en uso real con feedback Carolina. Datadis batch listo. ~70 `as never` retirados.

### Semana 4 — RLS + medición R1 + planning R2

| Día | Bloque | Tarea |
|---|---|---|
| L-M | DEP | Sprint A 30.9: aplicar RLS granular FASE 20.9 con feature flag tabla a tabla |
| X | DEP | Consolidación documentación: `docs/INDICE_2026-05-01.md` + retirar docs obsoletos |
| J | R1 | Análisis a 30 días Release 1: KPIs Carolina, motivos de pérdida, tiempo medio |
| V | PLAN | Decidir Release 2 según data real + sesión planificación con Juan |

**Outcome semana 4:** RLS aplicado, docs consolidados, Release 1 con métricas reales para informar Release 2.

---

## 4. Regla operativa propuesta

A partir de hoy, cualquier sesión Cowork sigue este patrón:

```
1. Recolectar tareas pendientes desde último commit (loose ends).
2. Antes de añadir nada nuevo: ¿hay algo abierto que cierro en <30 min?
3. Si sí → cerrar primero. Si no → empezar lo nuevo.
4. Al finalizar la sesión: SIEMPRE commit + push + actualizar ESTADO.md.
5. NUNCA dejar trabajo importante en working tree sin push.
```

**Cambio respecto al patrón actual**: hoy he producido 8 archivos en working tree sin commit. Eso debe pasar a "no hacer más".

---

## 5. Bloqueador inmediato: el TSC del sprint Potencias

Antes de cualquier otra cosa, **alguien tiene que cerrar el TSC pendiente** de `claude/sprint2-lib-potencias`. Mientras eso esté abierto:
- No se puede mergear lo de hoy a main.
- No se pueden mergear futuros sprints.
- El CI bloquea PRs.

**Opciones:**

A) **Tú o Code en PowerShell**, siguiendo el plan paso a paso de `docs/SPRINT3_TSC_PENDIENTE.md` (~2.5h).

B) **Yo en Cowork, vía subagente**: pero requiere acceso a npm install / tsc local que el sandbox no tiene. **No viable**.

C) **Trabajar el Release 1 en una rama nueva `claude/release-1-captacion`** desde main puro, dejar el sprint Potencias para Code en paralelo. Esto separa los caminos. **Es lo que recomiendo**.

---

## 6. Inventario simple de "qué tienes en el working tree ahora mismo"

Para que tengas visibilidad de qué falta commitear:

**Aplicado en BD prod (ya está, no es working tree):**
- `fase30_1_daily_contract_check_pgcron` ✓
- `fase30_1_secure_run_daily_contract_check` ✓
- `fase30_8_incidencias_cups_id_fk` ✓

**En working tree, pendiente commit (Sprint A frontend):**
- `src/main.tsx` (Sentry init)
- `src/core/utils/sentry.ts` (nuevo)
- `src/core/utils/logger.ts` (forward Sentry)
- `src/core/hooks/useAuth.ts` (setSentryUser)
- `src/features/oportunidades/components/KanbanCard.tsx` (importes)
- `src/features/oportunidades/components/KanbanColumn.tsx` (suma columna)
- `src/features/empresas/EmpresasPage.tsx` (wizard)
- `src/features/datadis/api.ts` (hook asociar)
- `src/features/datadis/DatadisPage.tsx` (botón asociar)
- `src/features/datadis/components/AsociarEmpresaDialog.tsx` (nuevo)
- `package.json` (`@sentry/react@^10`)
- `.env.example` (DSN Sentry)
- `supabase/migrations/20260501_fase30_1_*.sql` (espejo)
- `supabase/migrations/20260501_fase30_8_*.sql` (espejo)
- `docs/AUDIT_2026-05-01_MEJORAS_CRM.md` (nuevo)
- `docs/AUDIT_2026-05-01_PROFESIONAL_SECTOR.md` (nuevo)
- `docs/COMPARATIVA_COWORK_VS_CHATGPT_2026-05-01.md` (nuevo)
- `docs/PLAN_CAROLINA_ENGINE_2026-05-01.md` (nuevo)
- `docs/PLAN_CAPTACION_PROFESIONAL_2026-05-01.md` (nuevo)
- `docs/RELEASE_1_CAPTACION_2026-05-01.md` (nuevo)
- `docs/PROMPT_CHATGPT_SECOND_OPINION_2026-05-01.md` (nuevo)
- `docs/PLAN_DEPURACION_2026-05-01.md` (nuevo, este)
- `docs/ROADMAP_FUSION.md` (modificado, FASES 30-33)
- `docs/ESTADO.md` (modificado, encabezamiento)
- `docs/SESIONES/2026-05-01-resumen.md` (nuevo)
- `docs/SESIONES/2026-05-01-tarde-sprint-a-autonomo.md` (nuevo)
- `.cowork/outbox/2026-05-01-audit-mejoras-crm-handoff.md` (nuevo)
- `.cowork/outbox/2026-05-01-sprint-a-autonomo-aplicado.md` (nuevo)

**29 archivos modificados/nuevos sin commit.** Esto es el síntoma visible de la deuda que apuntas.

---

## 7. Propuesta concreta de qué hacer ahora

**Mi recomendación priorizada para los próximos 2-3 días:**

### Lo que tú haces (PowerShell Windows)

1. **Hoy/mañana**: cerrar TSC sprint Potencias siguiendo `docs/SPRINT3_TSC_PENDIENTE.md` o asignar a Code para que lo haga.
2. **Después**: ejecutar el comando completo del handoff para commit del trabajo aplicado hoy:
   ```powershell
   cd C:\Users\joliv\valere-v2
   npm install
   npx tsc --noEmit
   npm test -- --run
   # sanity check localhost:3000
   git checkout -b claude/sprint-a-cowork
   git add [archivos del handoff]
   git commit -m "feat(fase30): sprint A autónomo aplicado"
   git push origin claude/sprint-a-cowork
   ```
3. **Decidir**: si las sub-fases pendientes 30.2/30.3 (consolidar renovaciones, etapas legacy) las haces tú, las hace Code, o las hago yo en próxima sesión Cowork.

### Lo que yo hago próxima sesión Cowork

1. Si tú das luz verde y has cerrado TSC: **arrancar Release 1 día 1-3** (schema + UI lista + UI ficha) en una rama nueva `claude/release-1-captacion`.
2. Si pides depuración primero: arranco **Sprint A 30.2 + 30.3 + 30.7 + 30.9** y dejo Release 1 esperando.
3. Si quieres mezclar: hago Release 1 schema (1 día) + Sprint A 30.2 (1 día) + Release 1 UI lista (1 día) etc.

### Mi recomendación

**Opción mezclada**: depurar lo crítico primero (TSC + commit + 30.2/30.3), y luego arrancar Release 1 con la conciencia limpia. **No empezar Release 1 sin que el repo esté en estado verde**.

---

## 8. Cierre

La preocupación de Juan es correcta y la convertimos en regla operativa: **70% nueva funcionalidad / 30% depuración**, con la condición ineludible de **no abrir sprint nuevo sin cerrar el anterior**.

El plan integrado de 4 semanas mezcla R1 + DEP. Es realista para Juan (parcial) + Cowork (sesiones sueltas) + Code (TSC + sub-fases puntuales).

**Pregunta concreta a Juan para próxima sesión:**

> ¿Quieres que dedique 100% de la próxima sesión a depuración (cerrar Sprint A 30.2 + 30.3, consolidar docs, decidir RAG asistente), o que arranque Release 1 en paralelo asumiendo que tú/Code cerráis el TSC esta semana?

Si me dices "depuración", lo cierro. Si dices "mezclado", arranco R1 schema + R1 UI lista mientras espero TSC. Si dices "R1 puro", arranco R1 sabiendo que el merge a main está bloqueado hasta tu cierre TSC.

— Cowork, 1 mayo 2026.
