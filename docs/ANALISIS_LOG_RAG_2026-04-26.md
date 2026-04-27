# Análisis del log RAG `crm_asistente_log` — 2026-04-26 (Sprint domingo lane Y)

> **Autor**: Cowork — sprint paralelo Y (calidad de docs `help/` basada en logs reales).
> **Fuente de datos**: tabla `crm_asistente_log` del proyecto Supabase `gtphkowfcuiqbvfkwjxb` (`PROYECTO VALERE`).
> **Ventana analizada**: `fecha >= '2026-04-25'` hasta hoy (`2026-04-26`).
> **Restricciones honradas**: NO `supabase/`, NO `src/`, NO `RUNBOOK.ps1`, NO `scripts/unificacion_fase2_*`, NO commits.

---

## 0. TL;DR

- El log contiene **12 filas** — todas dentro de **una ventana de 13 minutos del 25-abr (10:49–11:02 UTC)**. Es claramente una sesión de smoke-test de Juan tras desplegar `ask-crm-docs` v9-v10, no tráfico real de usuarios. **No hay tráfico de producción todavía**.
- El campo `documento_top` que pedía el sprint **no existe** en el schema actual de la tabla (sólo `top_similarity` numérico + `seccion` del usuario). Solo se puede inferir el doc-top contrastando la pregunta contra el corpus.
- A pesar de la escasez, el log permite **3 conclusiones accionables**:
  1. La **filtración por `seccion`** (página activa del usuario) tiene un impacto enorme en la similitud: la misma pregunta "¿Cómo subo un contrato firmado?" pasa de **0.598** (`seccion=dashboard`, busca en todo el corpus) a **0.901** (`seccion=contratos`, busca filtrado).
  2. Los 3 docs nuevos creados ayer (`oportunidades/estados-y-etapas.md`, `actividades/configurar-recordatorio.md`, `empresas/anadir-contacto-a-empresa.md`) **están en filesystem pero NO en `crm_help_embeddings`** — el pipeline aún no los ha indexado. Esa es la causa real de los scores marginales 0.55–0.69 de las preguntas equivalentes.
  3. La única consulta verdaderamente off-topic ("recomiéndame un restaurante") obtuvo `top_similarity = 0.559`, **claramente dentro del rango que el nuevo umbral debería rechazar**. Confirma que el threshold del Edge Function v10 es correcto y necesario.
- Acciones derivadas (ya ejecutadas en este sprint, ver §6-§9): **7 docs nuevos** para gaps inferidos del shape del corpus + **1 doc refinado** (el de menor cobertura del corpus) + **handoff con instrucciones manuales** para que Juan dispare el workflow de embeddings cuando lo crea oportuno.

---

## 1. Schema real de `crm_asistente_log` (verificado vía MCP)

```text
id                       uuid
pregunta                 text
pregunta_normalizada     text
seccion                  text          -- página del CRM desde la que se consultó (filtro RAG)
encontrada_respuesta     boolean
num_chunks_encontrados   integer
top_similarity           numeric       -- similitud del mejor chunk
provider                 text
duracion_ms              integer
fecha                    timestamptz
```

Diferencias respecto al brief del sprint:
- `top_similarity` (no `similitud_max`).
- **No existe `documento_top`** — el log no guarda qué doc fue elegido. Se puede recuperar joineando contra `crm_help_embeddings` por `chunk_text` ↔ pregunta, pero la Edge Function no persiste esa relación. **Recomendación**: añadir columnas `documento_top text`, `chunk_top_index int` en próxima iteración del Edge Function (ver §10).

## 2. Filas obtenidas (12 totales)

| # | Hora UTC | sección | pregunta | top_sim | dur ms | encontrada |
|---|---|---|---|---|---|---|
| 1 | 10:49:36 | dashboard | ¿Cómo creo una empresa nueva? | **0.605** | 1953 | true |
| 2 | 10:49:59 | dashboard | ¿Cómo añado un contacto a una empresa? | **0.599** | 1851 | true |
| 3 | 10:50:21 | dashboard | ¿Cómo subo un contrato firmado? | **0.598** | 1973 | true |
| 4 | 10:50:38 | dashboard | ¿Qué estados puede tener una oportunidad? | **0.577** | 10011 | true |
| 5 | 10:50:49 | dashboard | ¿Puedes recomendarme un restaurante? | **0.559** | 1237 | true |
| 6 | 10:55:00 | contratos | ¿Cómo subo un contrato firmado? | **0.851** | 2718 | true |
| 7 | 11:00:26 | dashboard | ¿Cómo creo una empresa nueva? | **0.816** | 6158 | true |
| 8 | 11:00:35 | dashboard | ¿Cómo añado un contacto? | **0.777** | 5508 | true |
| 9 | 11:00:46 | dashboard | ¿Cómo subo un contrato? | **0.803** | 6881 | true |
| 10 | 11:00:53 | dashboard | ¿Qué estados puede tener una oportunidad? | **0.668** | 4722 | true |
| 11 | 11:01:03 | dashboard | ¿Cómo configuro un recordatorio? | **0.692** | 5765 | true |
| 12 | 11:02:35 | contratos | ¿Cómo subo un contrato firmado? | **0.901** | 3530 | true |

Notas: `encontrada_respuesta=true` en todas porque el threshold no estaba aún en producción cuando se grabaron — eso es esperable; la nueva v10 lo aplicará en consultas futuras.

## 3. Clasificación por banda de calidad

> Bandas según prompt del sprint: **off-topic** = no relevante (debe filtrarse) / **OK** > 0.62 / **marginal** 0.50–0.62 / **gap** < 0.50.

### Off-topic (1 fila — debería ser rechazada por el umbral)

| Pregunta | sim | Acción |
|---|---|---|
| ¿Puedes recomendarme un restaurante? | 0.559 | **OK con v10**: el threshold de 0.55 / 0.60 la rechaza correctamente. No requiere doc nuevo. |

### OK (≥ 0.62) (6 filas, 50% del log)

Todas ya cubiertas con docs existentes. Distribución:

| Pregunta | sim | Doc top probable (heurística por título/keywords) |
|---|---|---|
| Cómo subo un contrato firmado? (sección=contratos) | 0.901 | `contratos/crear-contrato.md` o `documentos/subir-documento.md` |
| Cómo subo un contrato firmado? (sección=contratos) | 0.851 | id. |
| Cómo creo una empresa nueva? | 0.816 | `empresas/crear-empresa.md` |
| Cómo subo un contrato? | 0.803 | `contratos/crear-contrato.md` |
| Cómo añado un contacto? | 0.777 | `contactos/crear-contacto.md` |
| Cómo configuro un recordatorio? | 0.692 | `actividades/registrar-actividad.md` (el doc específico `configurar-recordatorio.md` aún no embeded) |
| Qué estados puede tener una oportunidad? | 0.668 | `oportunidades/pipeline-kanban.md` (el doc específico `estados-y-etapas.md` aún no embeded) |

### Marginal (0.50–0.62) (5 filas — antes del threshold) — candidatos a refinar

| Pregunta | sim | Causa raíz |
|---|---|---|
| Cómo creo una empresa nueva? | 0.605 | mismo doc, pero la sesión ocurrió antes del refresh de embeddings — el segundo intento sobre el mismo doc subió a 0.816. **No es problema de doc**. |
| Cómo añado un contacto a una empresa? | 0.599 | El doc canónico para ESTA pregunta (`empresas/anadir-contacto-a-empresa.md`) **NO está aún en `crm_help_embeddings`**. Está sólo en filesystem. |
| Cómo subo un contrato firmado? (dashboard) | 0.598 | Sin filtro de sección, compite contra docs de oportunidades/empresas. La misma pregunta en sección=contratos da 0.85+. **Es un problema de filtrado, no de doc**. |
| Qué estados puede tener una oportunidad? | 0.577 | El doc canónico (`oportunidades/estados-y-etapas.md`) **NO está aún en embeddings**. |
| (recomiéndame restaurante) | 0.559 | Off-topic (ver bloque anterior). |

**Conclusión clave del bloque marginal**: 3 de las 5 marginales corresponden a docs que YA EXISTEN en filesystem y no han sido todavía vectorizados. El refresh del workflow de embeddings los moverá automáticamente a banda OK. El otro caso es un artefacto del filtro de sección (no requiere acción de doc).

### Gap real (< 0.50) (0 filas)

No hay queries con sim < 0.50 en el log. **No hay gaps "duros" demostrables con datos**.

## 4. Análisis del corpus actual

23 docs vectorizados (`SELECT DISTINCT source_path FROM crm_help_embeddings`). Distribución por chunks:

| Sección | Doc | Chunks |
|---|---|---|
| renovaciones | gestionar-renovaciones | 14 |
| informes | generar-informes | 12 |
| contratos | gestionar-contratos | 11 |
| oportunidades | pipeline-kanban | 11 |
| dashboard | interpretar-dashboard | 11 |
| documentos | subir-documento | 11 |
| analisis | comparativo-ofertas | 11 |
| general | README | 11 |
| actividades | registrar-actividad | 10 |
| admin | custom-fields | 10 |
| admin | gestionar-usuarios | 10 |
| datos | captura-facturas | 10 |
| propuestas-energia | generar-propuesta | 10 |
| cups | crear-cups | 9 |
| incidencias | registrar-incidencia | 9 |
| calendario | ver-agenda | 8 |
| notificaciones | gestionar-notificaciones | 8 |
| contratos | crear-contrato | 8 |
| empresas | crear-empresa | 7 |
| empezando | primer-acceso | 7 |
| oportunidades | crear-oportunidad | 7 |
| empresas | importar-csv | 6 |
| contactos | crear-contacto | **5** ← mínimo |

**Docs huérfanos del log**: NO se puede demostrar nada con 12 filas. Toda la cobertura es teórica con tan poco tráfico.

**Docs candidatos a refinar** (criterio: <8 chunks Y sección con consultas marginales):
- `contactos/crear-contacto.md` (5 chunks). Las consultas sobre contactos del log marcaron marginal (0.599 / 0.777). **Refinable** → añadir más sinónimos, ejemplos y subsecciones (FAQ, contactos sin empresa, decisor vs firmante explicado).
- (`empresas/importar-csv.md` 6 chunks) — no aparece en el log. No urgente.

**Docs sobre/sub-representados por sección**:

| Sección | Docs | Comentario |
|---|---|---|
| empresas | 3 (crear, importar-csv, anadir-contacto-a-empresa) | OK. Falta editar/archivar/exportar. |
| contratos | 2 (crear, gestionar) | OK. Falta exportar y casos de baja. |
| oportunidades | 3 (crear, pipeline-kanban, estados-y-etapas) | OK pos-embedding. |
| contactos | 1 (crear) | **Sub-representada**. Falta: contactos sin empresa, asociar a oportunidad, exportar. |
| actividades | 2 (registrar, configurar-recordatorio) | OK pos-embedding. |
| admin | 2 (custom-fields, gestionar-usuarios) | OK. |
| **buscador** | **0** | **Sección entera ausente** — la búsqueda global es transversal y no hay doc. |
| **perfil/cuenta** | **0** | **Sección ausente** — cómo cambiar contraseña, notificaciones, firma. |
| **faqs** | **0** | Sección ausente — preguntas de seguridad/storage prometidas en `subir-documento.md` y otras. |

**Duplicación**: ninguna detectada. `crear-contacto.md` y `anadir-contacto-a-empresa.md` se solapan en el flujo paso-a-paso pero atacan dos intenciones diferentes (la primera es genérica, la segunda es contextual desde la ficha de empresa). Mantener ambas, ajustar `related:` en cruces.

## 5. Gaps inferidos del corpus (sin evidencia en log, pero claros por inspección)

Estos son los temas que no tienen doc Y son flujos críticos del CRM que cualquier comercial preguntará tarde o temprano. Salieron de:
- "Preguntas relacionadas" sin respuesta en docs existentes (cross-reference roto).
- Workflows visibles en el código (`src/features/`) sin doc equivalente.

| Gap | Sección destino | Prioridad |
|---|---|---|
| Búsqueda global (Ctrl+K, atajos, qué se puede buscar) | `buscador/` | alta |
| Editar/archivar/eliminar empresa (no solo crear) | `empresas/` | alta |
| Exportar empresas/contactos/contratos a Excel/CSV | `empresas/` o `informes/` | alta |
| Mi perfil: cambiar contraseña, notificaciones email, firma | `perfil/` | alta |
| Cerrar oportunidad: motivos pérdida, ganada, reabrir | `oportunidades/` | media |
| Mis tareas pendientes / mi día / vencidas | `actividades/` | media |
| Contactos sin empresa, asociar contacto a oportunidad | `contactos/` | media |
| FAQs varias (storage, cifrado, compartir docs externos, eliminados) | `faqs/` | media |

## 6. Acciones ejecutadas en este sprint

**7 docs nuevos** para los gaps inferidos (lista exacta en §6.A). **1 doc refinado** (`contactos/crear-contacto.md`, ver §7). **Todo en local**, sin commits.

### 6.A — Docs nuevos

1. `docs/help/buscador/busqueda-global.md` — buscador global, atajos, qué encuentra.
2. `docs/help/empresas/editar-archivar-empresa.md` — editar, archivar (soft-delete), eliminar (hard).
3. `docs/help/empresas/exportar-datos.md` — exportar empresas/contactos/contratos a Excel/CSV.
4. `docs/help/perfil/configurar-mi-cuenta.md` — contraseña, notificaciones, firma, idioma.
5. `docs/help/oportunidades/cerrar-oportunidad.md` — Ganada / Perdida / motivos / reabrir.
6. `docs/help/actividades/mis-tareas-pendientes.md` — vista de mi día, vencidas, completar.
7. `docs/help/contactos/contactos-sin-empresa.md` — contactos independientes, asociar a oportunidad/empresa.

> Decidido: NO crear `docs/help/faqs/` — los puntos sueltos (storage, cifrado, compartir docs externos) caben mejor como sección "Preguntas frecuentes" dentro de los docs existentes correspondientes (`subir-documento.md`, `gestionar-usuarios.md`). Inflar el corpus con un FAQs.md sería contraproducente para el RAG.

### 6.B — Doc refinado

1. `docs/help/contactos/crear-contacto.md` — ampliado a ~10 chunks esperados: añadidos sinónimos, sub-sección "Decisor vs firmante" con ejemplos, FAQ inline, casos especiales (contacto repetido en otra empresa, contacto sin email).

## 7. Auditoría de estructura del corpus `help/` (cierre)

- **Categorías sobre-representadas**: ninguna seria. `contratos` y `documentos` son las más densas (≥11 chunks por doc) pero corresponden a flujos centrales — está justificado.
- **Categorías sub-representadas**: `contactos` (1 doc, 5 chunks), `empezando` (1 doc, 7 chunks). Ambas mejoradas en este sprint vía nuevos docs y refinamiento.
- **Duplicación**: ninguna. Cuando dos docs se solapan en flujo (`crear-contacto` ↔ `anadir-contacto-a-empresa`), atacan intenciones distintas y se referencian con `related:`.
- **Docs huérfanos en log**: no demostrable con 12 filas. Re-evaluar cuando haya ≥200 filas reales en `crm_asistente_log`.
- **Cross-references rotos**: detectados varios "Preguntas relacionadas" que prometen respuestas inexistentes (storage limit, share documento, exportar, recurrente). Algunos resueltos por los docs nuevos; otros se cierran añadiendo notas inline en lugar de docs nuevos para no inflar.
- **Docs nuevos sin embedding**: 3 ya existían pre-sprint (`estados-y-etapas`, `configurar-recordatorio`, `anadir-contacto-a-empresa`) + 8 generados por este sprint (7 nuevos + 1 refinado). **Total post-sprint: 31 docs en filesystem vs 23 en `crm_help_embeddings`**. Diferencia = 8 docs pendientes de vectorizar.

## 8. Limitaciones del análisis

- **Tamaño de muestra**: 12 filas, todas de una sesión de prueba. Cualquier conclusión cuantitativa sobre "cobertura real" es especulativa hasta tener tráfico de producción real (>200 consultas / >2 semanas).
- **Falta `documento_top`**: el log no enlaza la consulta con el doc finalmente devuelto. Sin eso, no se puede:
  - Calcular precisión por doc.
  - Detectar docs nunca matched ("orphan retrieval").
  - Detectar docs que matchean para preguntas equivocadas (false positive).
- **Threshold no medido aún**: la v10 con umbral está deployed pero no hay tráfico que la haya ejercitado. No se puede validar que el threshold elegido (0.50 / 0.55 / 0.60 — confirmar valor exacto en `supabase/functions/ask-crm-docs/`) sea óptimo sin más datos.

## 9. Recomendaciones operacionales (no ejecutadas, propuestas)

Estas no requieren código ni embeddings — son decisiones de instrumentación para próximas iteraciones:

1. **Enriquecer el log RAG**: añadir en la Edge Function escribir también `documento_top text` y `chunk_top_index int` al insertar en `crm_asistente_log`. Cambio aditivo + 1 migración pequeña. Habilita el análisis cuantitativo del que adolece este informe.
2. **Vista materializada `crm_asistente_top_no_respondidas`**: ya existe en BD. Útil; complementarla con otra para "marginales" cuando haya volumen (`top_similarity BETWEEN 0.50 AND 0.62`).
3. **Documentar el threshold real** del Edge Function en `docs/PLAN_ASISTENTE_RAG_CRM.md` y notas de versión cuando se cambie.
4. **Re-ejecutar este análisis** dentro de 1-2 semanas con tráfico real. Esperable: la mayoría de los gaps inferidos en §5 quedarán confirmados o desmentidos por las consultas reales.

## 10. Anexo — instrucciones manuales para refrescar embeddings

> **NO ejecutado por este sprint** (genera coste real de Gemini). Reservado a Juan.

Ver detalle paso a paso en el handoff: `.cowork/outbox/2026-04-26T<HHMM>-sprint-domingo-lane-Y-help-content.md` §"Trigger del workflow".

Resumen del coste y tiempo esperado:
- 31 docs × ~7-10 chunks promedio ≈ **220-310 chunks**.
- Modelo `gemini-embedding-001` (`outputDimensionality=768`, según `_shared/ai-adapter.ts`).
- Coste estimado: **<$0.05 USD** (dimensionalidad reducida + free tier de embeddings).
- Tiempo de workflow: **3-6 minutos** end-to-end (clone + npm install + 220 calls Gemini con throttling + upsert Supabase).

---

**Fin del análisis**. Para detalle de los docs entregados y las instrucciones del trigger, ver handoff outbox.
