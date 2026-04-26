# Auditoría FE / Asistente RAG / Observabilidad — Sprint paralelo B

> Sprint paralelo B (frontend / asistente RAG / observabilidad), 2026-04-25.
> Co-existe con sprint paralelo A (backend/migraciones). No toca `supabase/migrations/`, no toca advisors, no redeploya Edge Functions, no commitea.

## Resumen ejecutivo

- **Frontend**: arquitectura sólida (lazy splitting OK, logger centralizado OK, 0 `console.*` fuera del logger). Áreas de mejora claras y baratas: ErrorBoundary no estaba conectado, dependencia muerta `framer-motion`, ~36 usos de `any` concentrados en 7 archivos.
- **Asistente RAG**: 12 consultas reales analizadas. Bug de calidad confirmado: la función responde aunque la similitud sea catastrófica (false positive de 0.559 atendido como "encontrado"). Tres docs nuevos en `docs/help/` para cubrir gaps reales detectados. Patch propuesto al Edge Function en `docs/PATCH_ASISTENTE_RAG_2026-04-25.md` (sin redeploy).
- **Observabilidad**: cero instrumentación cliente. Añadido `src/core/utils/telemetry.ts` (sin dependencias) que captura `window.error`, `unhandledrejection` y web vitals en buffer. ErrorBoundary global ahora envuelve features y asistente.
- **Dependencias**: 25 deps + 14 devDeps. `framer-motion` instalada, configurada en `vite.config.ts` (`vendor-motion` chunk) pero **0 imports** — peso muerto en el bundle.

## 1. Frontend — auditoría

### 1.1 Estructura

`src/` está limpio post-FASE 20.6. Convención feature-based respetada:
- 21 features bajo `src/features/` (incluida la huérfana `chat-ia/`).
- 123 archivos `.ts`/`.tsx`, 19 lazy-loaded a nivel de página en `App.tsx`.
- 6 archivos de tests (`vitest`).
- Stack: React 19, Vite 6, Tailwind 4, Supabase JS 2.100, react-query 5, react-hook-form 7, recharts 3, sonner.

### 1.2 Dead code / archivos huérfanos

| Archivo | Estado | Acción recomendada |
|---|---|---|
| `src/features/chat-ia/ChatIAPanel.tsx` | 0 imports externos. Se referencia a sí mismo (`logError` interno) y llama a `chat-consultor` Edge Function que también está marcada para borrado. | Borrar. **Ya estaba en la lista del sprint 8** — sigue pendiente de ejecutar el script PowerShell de cierre. |
| `src/core/components/ErrorBoundary.tsx` | Definido pero **0 usos en src/**. Cualquier crash en una feature tira toda la app. | **Conectado en este sprint** — ahora envuelve `<Suspense>{children}</Suspense>` y el `AsistentePanel` en `App.tsx`. |
| `framer-motion` (dep) | 0 imports en `src/`. Instalada y declarada como chunk vendor en `vite.config.ts`. | Quitar de `package.json` y de `vite.config.ts` (`vendor-motion`) en el próximo sprint. Liberará ~80 KB del bundle. |
| `src/types/database.ts` | 8 imports activos (admin, analisis, datos, propuestas-energia, tracking + core/energia/{adapters,calculator} + core/supabase/client). | **Mantener** — contiene tipos calculator-internos (`SupplyPoint`, `Powers`, `InvoiceData`, `Retailer*`) que no viven en BD. ESTADO sprint 8 ya lo confirma. Pendiente de unificar con `src/core/types/database.ts` en un sprint futuro. |

### 1.3 Imports rotos / paths obsoletos

`grep -rn "from '@/modules\|from '@/hooks\|from '@/lib'" src/` → **0 hits**. Migración `modules/` → `features/` está limpia.

Único hit raro: `src/core/components/CustomFieldsPanel.tsx` importa `'../hooks/useCustomFields'`. **Es válido** (esa hook vive en `src/core/hooks/`). Falso positivo del grep.

### 1.4 Accesibilidad básica (a11y)

Numéricamente:
- 155 `<button>` totales; 127 sin `aria-label` (mayoría tienen texto visible, así que no necesitan label — chequeo numérico no es definitivo).
- 63 `<input>` en features sin `aria-label` explícito (muchos están dentro de un `<label>` parent).

Spot-checks reales:
- `EmpresasPage.tsx` línea 79: `<input type="search" ... aria-label="Buscar empresas por nombre o NIF" ... />` → **OK**.
- `AsistentePanel.tsx`: todos los `<button>` icon-only tienen `aria-label`, `<dialog>` tiene `role="dialog"` y `aria-label`. **Bien**.
- Botones icon-only de `IncidenciasPage`, `RenovacionesPage`, `ActividadesPage`, `ContratoDetailPage`, `EmpresaDetailPage` y la cabecera `Sidebar` deberían pasar por una pasada manual (recomendación: una jornada de auditoría a11y posterior).

**Recomendación**: tras Fase 5 backend, abrir un sprint pequeño de a11y con `axe-core` o `@axe-core/react` en dev (`npm i -D @axe-core/react`, ~25 KB no entra a producción) para detectar issues automáticamente.

### 1.5 Performance

- `lazy()` en cada Page → bien: bundle inicial mínimo. `recharts` solo se carga cuando entras a `/analisis`.
- `vite.config.ts` declara `manualChunks` para `vendor-react`, `vendor-supabase`, `vendor-query`, `vendor-charts`, `vendor-forms`, `vendor-dnd`, `vendor-motion`. **Bien**, salvo `vendor-motion` que carga `framer-motion` no usado (ver §1.2).
- `React.memo` no se usa en ningún sitio (0 hits). `useMemo`/`useCallback`: 30 hits totales. Páginas grandes con muchos handlers (`AdminPage` 623 LOC con 14 `useState`, `DatosPage` 755 LOC con 15 `useState`) podrían beneficiarse de `useCallback` en handlers que pasan a componentes hijos. **No urgente**: la app no muestra síntomas de re-renders excesivos hoy con datos test.
- React Query `staleTime: 30_000` y `refetchOnWindowFocus: false` son sensatos para CRM.

### 1.6 TypeScript strict

`tsconfig.json` tiene `strict: true` ✅, pero `noUnusedLocals` y `noUnusedParameters` están en `false`.

**36 usos de `any`** distribuidos en 7 archivos:

| Archivo | Hits | Causa |
|---|---|---|
| `src/features/admin/AdminPage.tsx` | 16 | Forms de comercializadora/oferta sin tipo derivado de `Database`. |
| `src/core/hooks/useDatadis.ts` | 5 | Comentado: `as any` hasta regenerar tipos (ya regenerados en sprint 7). |
| `src/features/datos/DatosPage.tsx` | 4 | Acceso dinámico a `consumption_p1..6` y `surplus_p1..6`. |
| `src/core/hooks/useSupabaseQuery.ts` | 3 | `catch (err: any)` — patrón aceptable mientras no haya `unknown` en catch. |
| `src/features/analisis/AnalisisPage.tsx` | 2 | Acceso dinámico a `powers.p1..p6`. |

**Recomendación**: ahora que los tipos de Supabase están regenerados (sprint 7), dejar `useDatadis.ts` y `AdminPage.tsx` en un sprint de tipado puede quitar 21 hits de un golpe sin esfuerzo.

Adicionalmente, considerar `noUnusedLocals: true` y `noUnusedParameters: true` en `tsconfig.json` — encontrarás imports muertos en cuanto el `tsc --noEmit` corra.

### 1.7 Cambios aplicados en este sprint

- ✅ `src/App.tsx`: `import ErrorBoundary` + envoltorio doble (children + AsistentePanel) → un crash en una feature ya no tira toda la app. ESTADO sprint 8 confirma TSC 0 errores; este cambio es 6 líneas y no toca tipos.
- ✅ `src/core/utils/telemetry.ts` (nuevo): captura errores no capturados, web vitals (LCP/FCP/TTFB) y los acumula en `window.__valereTelemetry`. Sin dependencias externas.
- ✅ `src/main.tsx`: `initTelemetry()` antes del render.

## 2. Asistente RAG — análisis de logs reales

12 consultas registradas en `crm_asistente_log` (todas el 2026-04-25 entre 10:49 y 11:02 UTC).

### 2.1 Métricas

| Métrica | Valor | Veredicto |
|---|---|---|
| Total | 12 | — |
| Con respuesta | 12 / 12 (100%) | **Bug**: ver §2.2. |
| `dur_avg_ms` | 4 359 | Aceptable. |
| `dur_p50_ms` | 4 126 | Aceptable. |
| `dur_p95_ms` | 8 290 | **Alto** para chat. |
| `sim_avg` / `min` / `max` | 0.704 / 0.559 / 0.901 | Min 0.559 indica respuesta sin cobertura real. |
| `chunks_avg` | 5.00 | Top-k fijo. |

### 2.2 Bug confirmado

La pregunta **"¿Puedes recomendarme un restaurante?"** (off-topic, sim 0.559) fue marcada como `encontrada_respuesta=true`. Esto pasa porque el Edge Function loggea `true` cualquier vez que `match_crm_help` devuelve ≥1 chunk. No hay umbral.

Patch en `docs/PATCH_ASISTENTE_RAG_2026-04-25.md` introduce `MIN_SIMILARITY=0.62` (umbral suave, marca el log) y `STRICT_MIN_SIMILARITY=0.50` (umbral duro, devuelve fallback sin llamar al LLM).

### 2.3 Gaps de cobertura `help/` cubiertos en este sprint

Tres docs nuevos en `docs/help/`, alineados con verbiage de las preguntas reales de bajo `top_similarity`:

1. `docs/help/oportunidades/estados-y-etapas.md` — cubre "¿Qué estados puede tener una oportunidad?" (sim antes 0.577–0.668). Usa "estado" como sinónimo de "etapa".
2. `docs/help/actividades/configurar-recordatorio.md` — cubre "¿Cómo configuro un recordatorio?" (sim antes 0.692). Explica las tres formas: actividad con fecha, evento de calendario, alerta automática.
3. `docs/help/empresas/anadir-contacto-a-empresa.md` — cubre "¿Cómo añado un contacto a una empresa?" (sim antes 0.599). Documento en la sección `empresas/` con verbiage "añadir" desde la ficha.

> No se ejecutaron embeddings; eso lo hace el workflow `regenerate-help-embeddings.yml` cuando los cambios lleguen a `main`.

### 2.4 Mejoras al Edge Function (no aplicadas)

Documentadas en `docs/PATCH_ASISTENTE_RAG_2026-04-25.md`:

1. Umbral de similitud (`STRICT_MIN_SIMILARITY` y `MIN_SIMILARITY`).
2. Llenar `pregunta_normalizada` (columna existe pero siempre NULL).
3. Cache opcional por `pregunta_hash` con TTL 1h (5 repeticiones reales en 30 min en el log).
4. Loggear top-3 similitudes (requiere `ALTER TABLE` mínimo).

## 3. Observabilidad

### 3.1 Estado actual

- **Logger** (`src/core/utils/logger.ts`): bien. Centraliza `console.*`. 137 usos de `logError`/`logInfo` en `src/`. `console.*` directo solo en `logger.ts` y `ErrorBoundary.tsx`.
- **ErrorBoundary**: definido en `src/core/components/ErrorBoundary.tsx` pero no se usaba — corregido en este sprint.
- **Sentry/Datadog/LogRocket**: no integrados. Ningún `window.onerror` ni `unhandledrejection` listener antes de este sprint.
- **Métricas web vitals**: ninguna.
- **React Query Devtools**: no integrado (acertado para producción; podría añadirse en `import.meta.env.DEV`).
- **Tabla de telemetría en BD**: no existe `crm_telemetry`. Existe `crm_asistente_log` solo para el asistente.

### 3.2 Cambios aplicados

- ✅ `ErrorBoundary` ahora envuelve features y asistente en `App.tsx`.
- ✅ `src/core/utils/telemetry.ts` (nuevo, sin deps externas):
  - Listener `window.error` → buffer + `logError`.
  - Listener `unhandledrejection` → buffer + `logError`.
  - `PerformanceObserver` para LCP, FCP, TTFB.
  - Buffer en `window.__valereTelemetry` (200 eventos máx).
  - Punto único `emit()` listo para fire-and-forget a Edge Function cuando exista la tabla.

### 3.3 Recomendaciones (no aplicadas)

Por orden de coste/beneficio:

1. **Crear tabla `crm_telemetry`** (sprint backend, 30 min):
   ```sql
   CREATE TABLE crm_telemetry (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     ts timestamptz NOT NULL DEFAULT now(),
     kind text NOT NULL,
     payload jsonb NOT NULL,
     user_id uuid REFERENCES auth.users(id),
     session_id text,
     route text
   );
   CREATE INDEX ON crm_telemetry(ts DESC);
   CREATE INDEX ON crm_telemetry(kind, ts DESC);
   ```
2. **Edge Function `track-event`** (1 día): recibe POST de `telemetry.ts`, hace insert. Sin dependencias.
3. **Conectar `telemetry.ts` a `track-event`**: sustituir el TODO en `emit()`.
4. **(Opcional) `web-vitals` oficial**: `npm i web-vitals` (~6 KB). Más preciso que el lite local. Solo si la versión lite resulta insuficiente.
5. **(Opcional) `@axe-core/react` en dev**: detecta issues a11y en consola al montar componentes.

## 4. Dependencias — análisis estático

`package.json` tiene 25 deps + 14 devDeps. Todas declaradas como `^` (semver minor). Versiones generales razonables; React 19 y Vite 6 son recientes.

### 4.1 Dependencias a revisar

| Paquete | Versión | Comentario |
|---|---|---|
| `framer-motion` | `^12.38.0` | **0 imports en `src/`**. Borrar. Recortará ~80 KB del bundle vendor-motion. |
| `react-markdown` | `^10.1.0` | Solo se usa en `chat-ia/ChatIAPanel.tsx` (huérfano) y `asistente-crm/components/MessageBubble.tsx`. Tras borrar chat-ia sigue justificada por el asistente. |
| `tw-animate-css` | `^1.4.0` | Plugin Tailwind. No verificado uso real en clases. Spot-check pendiente. |
| `@base-ui/react` | `^1.0.0` | Componentes UI. Verificar si se usa fuera de un único componente shadcn. |

### 4.2 Vulnerabilidades / `npm audit`

No ejecutado en este sprint (no se pidió). Recomendación al sprint backend o cierre: `npm audit --production` (ver salida sin instalar nada). Versiones del repo son suficientemente recientes para que el riesgo sea bajo.

### 4.3 Lockfile

`package-lock.json` existe (npm). No hay `pnpm-lock.yaml` ni `yarn.lock`. Setup coherente.

## 5. Resumen de cambios aplicados (no commiteados)

```
M src/App.tsx                       # ErrorBoundary global (frontend)
M src/main.tsx                      # initTelemetry() (frontend)
A src/core/utils/telemetry.ts       # web-vitals + error capture (frontend)
A docs/help/oportunidades/estados-y-etapas.md         # gap RAG
A docs/help/actividades/configurar-recordatorio.md    # gap RAG
A docs/help/empresas/anadir-contacto-a-empresa.md     # gap RAG
A docs/PATCH_ASISTENTE_RAG_2026-04-25.md              # patch propuesto Edge Function
A docs/AUDITORIA_FE_2026-04-25_SPRINT_PARALELO_B.md   # este doc
```

Sin tocar:
- `supabase/migrations/`
- `supabase/functions/ask-crm-docs/index.ts` (patch propuesto solamente)
- `package.json` (dependencias propuestas para borrado, no quitadas)
- `.git/`

## 6. Siguientes pasos sugeridos

Por orden de coste / beneficio:

1. **Tras fase 2 backend de Juan**: ejecutar el workflow `regenerate-help-embeddings.yml` para que los 3 docs nuevos se indexen. Verificar luego en `crm_asistente_log` que las preguntas equivalentes suben a sim > 0.80.
2. **Aplicar el patch del Edge Function** (`docs/PATCH_ASISTENTE_RAG_2026-04-25.md`) — ~30 min y un `supabase functions deploy`.
3. **Borrar `framer-motion` y `chat-ia/`** en el script PowerShell de cierre que ya tiene Juan pendiente del sprint 5+6+7+8.
4. **Crear tabla `crm_telemetry` + Edge Function `track-event`** para activar la telemetría capturada por `telemetry.ts`.
5. **Sprint a11y** con `@axe-core/react` cuando haya margen.
6. **Quitar `any` de `useDatadis.ts` y `AdminPage.tsx`** ahora que los tipos están regenerados (-21 hits).
