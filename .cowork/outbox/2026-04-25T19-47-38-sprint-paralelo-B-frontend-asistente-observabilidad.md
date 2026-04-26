# Sprint paralelo B — frontend / asistente RAG / observabilidad

> Lane paralelo al sprint A (backend/migraciones). No tocó `supabase/migrations/`, no tocó advisors, no redeployó Edge Functions, no commiteó. Sin commits — Juan ejecuta script de cierre.

## TL;DR

- Auditoría FE completa, sin sorpresas graves. ErrorBoundary global conectado en `App.tsx` (existía pero estaba sin uso). Telemetría cliente añadida en `src/core/utils/telemetry.ts` (sin dep externa). `framer-motion` y `chat-ia/` confirmados como dead code.
- Asistente RAG: 12 consultas reales analizadas vía MCP Supabase. Bug confirmado (false positive `encontrada_respuesta=true` con sim 0.559). 3 docs nuevos en `docs/help/` para gaps reales. Patch del Edge Function listo en `docs/PATCH_ASISTENTE_RAG_2026-04-25.md`.
- Observabilidad: cero antes, ahora hay buffer cliente (`window.__valereTelemetry`) capturando errores y web vitals. Recomendación de tabla `crm_telemetry` + Edge Function `track-event` documentada.

## Archivos creados/modificados

```
M  src/App.tsx                                          (ErrorBoundary global)
M  src/main.tsx                                         (initTelemetry)
A  src/core/utils/telemetry.ts                          (web-vitals + error capture)
A  docs/help/oportunidades/estados-y-etapas.md          (gap RAG, sim baja)
A  docs/help/actividades/configurar-recordatorio.md     (gap RAG, sim baja)
A  docs/help/empresas/anadir-contacto-a-empresa.md      (gap RAG, sim baja)
A  docs/PATCH_ASISTENTE_RAG_2026-04-25.md               (patch propuesto Edge Fn)
A  docs/AUDITORIA_FE_2026-04-25_SPRINT_PARALELO_B.md    (informe completo)
A  .cowork/outbox/2026-04-25T19-47-38-sprint-paralelo-B-frontend-asistente-observabilidad.md
```

8 ficheros tocados. Ningún `git rm`, ningún borrado destructivo.

## Hallazgos clave del FE

### Dead code confirmado (no borrado en este sprint, ya en lista de Juan)

- `framer-motion` — 0 imports en `src/`, instalado en `package.json` (`^12.38.0`) y declarado como `vendor-motion` chunk en `vite.config.ts`. Borrar en próximo sprint libera ~80 KB.
- `src/features/chat-ia/ChatIAPanel.tsx` — sin imports externos. Llama a `chat-consultor` Edge Function (también huérfana, ya marcada).
- `src/core/components/ErrorBoundary.tsx` — definido pero sin uso. **Conectado en este sprint** (envuelve features y asistente en `App.tsx`).

### `any` en TS

36 hits totales. 21 (58%) están en `useDatadis.ts` y `AdminPage.tsx` y son herencia de cuando `Database = any`. Ahora que los tipos se regeneraron en sprint 7, son sprint de tipado fácil de cerrar.

`tsconfig.json` tiene `strict: true` ✅ pero `noUnusedLocals` y `noUnusedParameters` en `false`. Activarlos sacaría imports muertos en cuanto compile.

### Performance / accesibilidad

- Lazy splitting OK por página (19 páginas + AsistentePanel).
- `recharts` en `vendor-charts`, solo carga al entrar a `/analisis`.
- `React.memo`/`useMemo`/`useCallback` poco usados pero **sin síntomas** de re-renders excesivos hoy.
- a11y: spot-checks parciales OK. AsistentePanel está bien etiquetado. Recomendación: sprint con `@axe-core/react` cuando haya margen.

### Observabilidad antes/después

| Aspecto | Antes | Ahora |
|---|---|---|
| `console.*` directo | Solo en `logger.ts` y `ErrorBoundary.tsx` | igual |
| Logger centralizado | Sí (137 usos) | igual |
| ErrorBoundary global | **No** (definido, sin uso) | **Sí** — features + asistente |
| `window.error` listener | No | Sí (telemetry.ts) |
| `unhandledrejection` listener | No | Sí (telemetry.ts) |
| Web vitals (LCP/FCP/TTFB) | No | Sí, en buffer (telemetry.ts) |
| Telemetría persistida en BD | No | No (pendiente: tabla `crm_telemetry`) |

## Hallazgos clave del Asistente RAG

12 consultas en `crm_asistente_log` (todas el 2026-04-25 entre 10:49 y 11:02 UTC).

### Bug

`encontrada_respuesta=true` para todas las 12, incluyendo "¿Puedes recomendarme un restaurante?" (sim 0.559, claramente off-topic). El Edge Function loggea `true` cualquier vez que `match_crm_help` devuelve ≥1 chunk. **No hay umbral de similitud**.

### Patch listo (no aplicado)

`docs/PATCH_ASISTENTE_RAG_2026-04-25.md` propone:

1. `STRICT_MIN_SIMILARITY=0.50` → si `topSim < 0.50`, devolver fallback fijo SIN llamar al LLM (ahorra ~1-3s y coste).
2. `MIN_SIMILARITY=0.62` → marca `encontrada_respuesta=false` aunque se haya generado respuesta (deja visible los gaps).
3. Llenar `pregunta_normalizada` (columna existe, siempre NULL hoy).
4. (Opcional) Cache simple por `pregunta_hash` con TTL 1h — el log muestra 5 repeticiones reales en 30 min.
5. (Opcional) Loggear top-3 similitudes (requiere `ALTER TABLE crm_asistente_log ADD COLUMN top_similarities numeric[]`).

Aplicar = editar `supabase/functions/ask-crm-docs/index.ts` con los 4 bloques + `supabase functions deploy ask-crm-docs`. ~30 min.

### Gaps de cobertura cubiertos en este sprint

3 docs nuevos en `docs/help/` para preguntas reales con sim baja:

| Pregunta real | sim antes | Doc nuevo |
|---|---|---|
| ¿Qué estados puede tener una oportunidad? | 0.577–0.668 | `oportunidades/estados-y-etapas.md` (usa "estado" como sinónimo de "etapa") |
| ¿Cómo configuro un recordatorio? | 0.692 | `actividades/configurar-recordatorio.md` (3 formas: actividad, evento, alerta automática) |
| ¿Cómo añado un contacto a una empresa? | 0.599 | `empresas/anadir-contacto-a-empresa.md` (verbiage "añadir" desde ficha empresa) |

Total `docs/help/`: 23 → 26 docs.

> Cuando el script PowerShell de cierre llegue a `main`, el workflow `regenerate-help-embeddings.yml` indexará los nuevos. Esperable: las preguntas equivalentes suban a sim > 0.80.

## Pendientes para Juan (sin urgencia, no bloqueantes)

1. **Incluir los 6 ficheros nuevos + 2 modificados en el script PowerShell de cierre** (ya tienes acumulado de sprints 5+6+7+8). Listas:
   ```
   git add src/App.tsx src/main.tsx src/core/utils/telemetry.ts
   git add docs/help/oportunidades/estados-y-etapas.md
   git add docs/help/actividades/configurar-recordatorio.md
   git add docs/help/empresas/anadir-contacto-a-empresa.md
   git add docs/PATCH_ASISTENTE_RAG_2026-04-25.md
   git add docs/AUDITORIA_FE_2026-04-25_SPRINT_PARALELO_B.md
   git add .cowork/outbox/2026-04-25T19-47-38-sprint-paralelo-B-frontend-asistente-observabilidad.md
   ```
2. **Verificar TSC** tras los 2 cambios en `App.tsx` y `main.tsx`: deben seguir 0 errores. Cambios son ~10 líneas y no tocan tipos.
3. **Smoke test asistente** (opcional): abrir el CRM, romper algo a propósito en una feature → debería ver el card del ErrorBoundary en lugar de pantalla blanca.
4. **Revisar buffer telemetría en consola dev**: `window.__valereTelemetry` debe contener LCP/FCP/TTFB tras cargar una página.
5. **(Sprint futuro)** Aplicar `docs/PATCH_ASISTENTE_RAG_2026-04-25.md`. ~30 min.
6. **(Sprint futuro)** Crear tabla `crm_telemetry` + Edge Function `track-event` para activar persistencia de la telemetría. Ver §3.3 de `docs/AUDITORIA_FE_2026-04-25_SPRINT_PARALELO_B.md`.

## Lo que NO se tocó (por restricciones del sprint)

- `supabase/migrations/` — terreno del sprint paralelo A.
- `docs/PLAN_*` — terreno del sprint paralelo A.
- Advisors / RLS — terreno del sprint paralelo A.
- `supabase/functions/ask-crm-docs/index.ts` — patch documentado, no aplicado (no redeploy).
- `package.json` — `framer-motion` no se quitó (deja que el script de cierre + Juan decida).
- `.git/` — sin escrituras.

## Preguntas / decisiones que vendría bien que Juan responda en algún momento (no urgentes)

- ¿Activamos `noUnusedLocals` y `noUnusedParameters` en `tsconfig.json`? Sacaría imports muertos automáticamente. Riesgo: posibles roturas de `tsc --noEmit` que ahora pasa a 0.
- ¿Borramos `framer-motion` ya o esperamos a una decisión de diseño? Si planeas animaciones futuras, conserva.
- ¿Tabla `crm_telemetry` en este Supabase o esperamos a que termine la unificación Fase 5?
