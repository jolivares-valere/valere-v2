# Patch propuesto — Asistente RAG `ask-crm-docs`

> Sprint paralelo B (frontend / asistente / observabilidad) — 2026-04-25.
> **NO redeploy aún.** Este doc deja la propuesta lista para que un sprint futuro la aplique con un único `supabase functions deploy ask-crm-docs`.

## Contexto

`crm_asistente_log` tiene **12 consultas reales** (todas el 2026-04-25). Análisis vía MCP:

| Métrica | Valor | Veredicto |
|---|---|---|
| `total_consultas` | 12 | OK |
| `con_respuesta` | 12 / 12 | **❌ Falso positivo**: la pregunta "¿Puedes recomendarme un restaurante?" devolvió `encontrada_respuesta=true` con `top_similarity=0.559`. |
| `dur_avg_ms` | 4 359 | Aceptable. |
| `dur_p95_ms` | 8 290 | **🟡 Alto** para chat interactivo (un usuario llegó a 10 011 ms). |
| `sim_avg` / `min` / `max` | 0.704 / 0.559 / 0.901 | El min 0.559 muestra que la función responde aunque no tenga contexto. |

### Bugs detectados

1. **No hay umbral de similitud**. El Edge Function devuelve respuesta del LLM sin importar lo baja que sea la similitud máxima. Resultado: la pregunta off-topic *"¿Puedes recomendarme un restaurante?"* fue atendida (probablemente con la frase de fallback "no encuentro información..." porque el system prompt lo pide) pero quedó loggeada como `encontrada_respuesta=true` y consumió tiempo y coste de LLM (1 237 ms).
2. **Lookup no determinista entre runs**. La pregunta *"¿Cómo subo un contrato firmado?"* obtuvo similitudes 0.901 / 0.851 / 0.599 en distintas sesiones — el bajo (0.599) corresponde a antes de la regeneración de embeddings que hizo el sprint 5; los altos, a después. **No es bug** (es cómo funciona pgvector), pero conviene loggearlo.
3. **Doble llamada a LLM en preguntas repetidas**. Cinco preguntas distintas se repitieron al menos una vez; cada repetición invoca al modelo. Cache trivial por `pregunta_normalizada` ahorraría coste.
4. **Boost por sección poco visible**. El boost +0.05 cuando `seccion` coincide está en `match_crm_help` pero la mayoría de logs tienen `seccion='dashboard'` (la ruta donde el asistente se abrió). El boost casi no se activa porque los chunks no son de la sección "dashboard" sino de la sección que el usuario pregunta. Podría ampliarse a coincidencia parcial o keywords.

### Gaps de cobertura `help/` detectados (similitud < 0.70 sobre tema válido)

| Pregunta real | sim | Diagnóstico |
|---|---|---|
| ¿Qué estados puede tener una oportunidad? | 0.577–0.668 | `pipeline-kanban.md` usa "etapa" no "estado". |
| ¿Cómo configuro un recordatorio? | 0.692 | No existe doc específico de recordatorios; el más cercano es `actividades/registrar-actividad.md`. |
| ¿Cómo añado un contacto a una empresa? | 0.599 | `contactos/crear-contacto.md` lo cubre, pero la pregunta usa "añadir" desde el contexto empresa. |

**Acción de este sprint**: tres docs nuevos creados en `docs/help/` con keywords y verbiage alineados a las preguntas reales:
- `docs/help/oportunidades/estados-y-etapas.md`
- `docs/help/actividades/configurar-recordatorio.md`
- `docs/help/empresas/anadir-contacto-a-empresa.md`

> Cuando se hagan merge en `main` y el workflow `regenerate-help-embeddings.yml` corra, las preguntas equivalentes deberían subir a sim > 0.80.

## Patch propuesto al Edge Function

Cambios mínimos, sin tocar `match_crm_help` (la función SQL queda igual). Todo en `supabase/functions/ask-crm-docs/index.ts`.

### 1. Umbral de similitud + clasificación correcta de "sin respuesta"

```ts
// ── Config nuevos
const MIN_SIMILARITY = Number(Deno.env.get('MIN_SIMILARITY') ?? '0.62')
const STRICT_MIN_SIMILARITY = Number(Deno.env.get('STRICT_MIN_SIMILARITY') ?? '0.50')

// ── Tras la llamada a match_crm_help, antes de construir el prompt:
const topSim = chunks?.[0]?.similarity ?? 0

// (a) similitud catastrófica → ni siquiera llamamos al LLM, contestamos el fallback fijo
if (!chunks || chunks.length === 0 || topSim < STRICT_MIN_SIMILARITY) {
  await logAsistente(supabaseService, {
    pregunta: question,
    seccion: section,
    encontrada_respuesta: false,
    num_chunks: chunks?.length ?? 0,
    top_similarity: topSim || null,
    provider: ai.provider,
    duracion_ms: Date.now() - startedAt,
  })
  return jsonResponse(
    {
      answer: 'No encuentro información sobre eso en la documentación. Pregunta al administrador del CRM.',
      sources: [],
      no_match: true,
    },
    200,
    corsHeaders,
  )
}

// (b) similitud baja pero no nula → seguimos al LLM, pero `encontrada_respuesta` se decide por umbral, no por "el LLM contestó algo"
const encontradaRespuesta = topSim >= MIN_SIMILARITY
```

Y en el log final, sustituir `encontrada_respuesta: true` literal por `encontradaRespuesta` calculado:

```ts
await logAsistente(supabaseService, {
  pregunta: question,
  seccion: section,
  encontrada_respuesta: encontradaRespuesta,
  num_chunks: chunks.length,
  top_similarity: topSim,
  provider: ai.provider,
  duracion_ms: Date.now() - startedAt,
})
```

**Impacto esperado**: la pregunta *"¿Puedes recomendarme un restaurante?"* (sim 0.559) caerá en rama (a) → respuesta fija + log con `encontrada_respuesta=false`. Las consultas válidas con sim 0.55-0.62 seguirán pasando al LLM pero se marcarán como `encontrada_respuesta=false` para análisis de gaps (las queries actualmente "borrosas" se hacen visibles).

### 2. Llenar `pregunta_normalizada` (antes siempre NULL)

```ts
function normalizar(q: string): string {
  return q
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // sin acentos
    .replace(/[¿?¡!.,;:()\[\]"]+/g, ' ')                 // sin puntuación
    .replace(/\s+/g, ' ').trim()
}

// En logAsistente.insert:
await supabase.from('crm_asistente_log').insert({
  pregunta: data.pregunta,
  pregunta_normalizada: normalizar(data.pregunta),
  // ...resto igual
})
```

**Impacto**: hace posible la query `SELECT pregunta_normalizada, count(*) FROM crm_asistente_log GROUP BY 1 ORDER BY 2 DESC` para detectar las preguntas más frecuentes y cachearlas.

### 3. Cache opcional por pregunta normalizada (TTL 1h)

Sólo si quieres ahorrar coste de Gemini:

```sql
-- Migration nueva (sprint futuro):
CREATE TABLE IF NOT EXISTS crm_asistente_cache (
  pregunta_hash text PRIMARY KEY,            -- sha256 de pregunta_normalizada + section
  pregunta_normalizada text NOT NULL,
  seccion text,
  answer text NOT NULL,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_similarity numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON crm_asistente_cache(created_at);
```

En el Edge Function, lookup antes del embedding:

```ts
const hash = await sha256(`${normalizar(question)}::${section ?? ''}`)
const { data: cached } = await supabaseService
  .from('crm_asistente_cache')
  .select('answer, sources, top_similarity, created_at')
  .eq('pregunta_hash', hash)
  .gt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
  .maybeSingle()
if (cached) return jsonResponse({ ...cached, cached: true }, 200, corsHeaders)
```

Y al final del flujo exitoso, upsert en la cache. **Impacto**: las repeticiones reales del log (5 preguntas duplicadas en 30 min) habrían sido 0 ms vs ~4 000 ms.

### 4. (Opcional) Loggear top-3 similitudes

Actualmente solo `top_similarity` se loggea. Si se añade columna `top_similarities numeric[]` a la tabla, el Edge Function puede mandar las 3 mejores, lo que ayuda a depurar casos en los que el chunk #1 era irrelevante pero el #2/#3 sí valían:

```ts
top_similarities: chunks.slice(0, 3).map((c: any) => Number(c.similarity?.toFixed(3) ?? 0)),
```

(Requiere `ALTER TABLE crm_asistente_log ADD COLUMN top_similarities numeric[]`.)

## Cómo aplicar

Sin redeploy en este sprint. Para aplicar:

1. Editar `supabase/functions/ask-crm-docs/index.ts` con los bloques de §1 y §2.
2. (Opcional) Ejecutar la migration de §3 + meter el lookup de cache.
3. Configurar `MIN_SIMILARITY=0.62` y `STRICT_MIN_SIMILARITY=0.50` como secrets si se quiere ajustar sin redeploy:
   ```
   supabase secrets set MIN_SIMILARITY=0.62 STRICT_MIN_SIMILARITY=0.50
   ```
4. `supabase functions deploy ask-crm-docs`.
5. Esperar 24 h y reanalizar `crm_asistente_log`: el ratio `con_respuesta/total` ya no debe ser 100% — ese era el síntoma del bug.

## Métricas a vigilar tras aplicar

```sql
-- Tasa de respuestas reales (debe bajar de 100% a algo realista, p.ej. 80-90%)
SELECT
  date_trunc('day', fecha) AS dia,
  count(*) AS total,
  count(*) FILTER (WHERE encontrada_respuesta) AS con_respuesta,
  round(100.0 * count(*) FILTER (WHERE encontrada_respuesta) / count(*), 1) AS pct
FROM crm_asistente_log
GROUP BY 1 ORDER BY 1 DESC;

-- Top preguntas frecuentes (necesita §2)
SELECT pregunta_normalizada, count(*) AS n, round(avg(top_similarity)::numeric, 2) AS sim
FROM crm_asistente_log
WHERE pregunta_normalizada IS NOT NULL
GROUP BY 1 HAVING count(*) > 1 ORDER BY 2 DESC LIMIT 20;

-- Gaps de doc (sim baja repetida sobre el mismo tema)
SELECT pregunta_normalizada, round(avg(top_similarity)::numeric, 2) AS sim_avg, count(*) AS n
FROM crm_asistente_log
WHERE pregunta_normalizada IS NOT NULL AND top_similarity < 0.65
GROUP BY 1 ORDER BY 3 DESC, 2 ASC LIMIT 20;
```
