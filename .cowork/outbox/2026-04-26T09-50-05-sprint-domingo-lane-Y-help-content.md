# Handoff sprint domingo lane Y (calidad de docs `help/`) → próxima sesión / Juan

**Fecha**: 2026-04-26 ~09:50 UTC (mañana de domingo)
**Lane**: Y — Calidad de docs `help/` basada en logs reales del RAG
**Restricciones cumplidas**: NO commits, NO `supabase/`, NO `src/`, NO `RUNBOOK.ps1`, NO `scripts/unificacion_fase2_*`. Sólo lectura de log Supabase + creación de markdown bajo `docs/`.

---

## Resumen ejecutivo

Sprint completo en autónomo. Análisis del log RAG `crm_asistente_log` (12 filas, todas de smoke-test del 25-abr) + 7 docs `help/` nuevos para gaps inferidos + 1 doc refinado + auditoría del corpus. **Sin bloqueos**. Único input humano necesario: que Juan dispare manualmente el workflow `regenerate-help-embeddings.yml` cuando crea oportuno (instrucciones abajo).

Hallazgo principal: el log es escaso (sesión de prueba), pero los 3 docs creados ayer (`estados-y-etapas`, `configurar-recordatorio`, `anadir-contacto-a-empresa`) **explican todos los scores marginales** (0.55–0.69) registrados — están en filesystem pero **no en `crm_help_embeddings`**. El simple refresh del workflow los moverá a banda OK.

---

## Entregables

### 1. `docs/ANALISIS_LOG_RAG_2026-04-26.md` (informe completo)

11 secciones (TL;DR + schema real + 12 filas crudas + clasificación por banda + análisis del corpus + gaps inferidos + acciones + auditoría + limitaciones + recomendaciones operacionales + anexo coste workflow). Incluye:
- Tabla de las 12 filas con sim, sección, duración.
- Clasificación off-topic (1) / OK ≥0.62 (6) / marginal 0.50–0.62 (5) / gap <0.50 (0).
- Auditoría del corpus por chunks/sección con candidatos a refinar.
- 8 gaps inferidos (sin evidencia en log) con prioridad y sección destino.
- Limitaciones reconocidas (muestra pequeña, falta `documento_top` en el log).
- Recomendaciones para enriquecer el log RAG en futuras iteraciones.

### 2. Docs `help/` nuevos (7)

Todos siguen el template estándar (`README.md` § Convenciones): frontmatter YAML completo (title, section, audience, keywords, related), Resumen rápido, Paso a paso, Errores frecuentes, Preguntas relacionadas.

| Path | Sección | Por qué |
|---|---|---|
| `docs/help/buscador/busqueda-global.md` | **buscador (sección nueva)** | Workflow transversal sin doc — Ctrl+K, atajos, qué se puede buscar. |
| `docs/help/empresas/editar-archivar-empresa.md` | empresas | Existían crear/anadir-contacto pero no editar/archivar/eliminar. |
| `docs/help/empresas/exportar-datos.md` | empresas | Exportar empresas/contactos/contratos a Excel/CSV — gap claro en docs. |
| `docs/help/perfil/configurar-mi-cuenta.md` | **perfil (sección nueva)** | Contraseña, notificaciones, firma, idioma — gap claro. |
| `docs/help/oportunidades/cerrar-oportunidad.md` | oportunidades | Ganada/Perdida/motivos/reabrir — complementa pipeline-kanban y estados-y-etapas. |
| `docs/help/actividades/mis-tareas-pendientes.md` | actividades | Vista de mi día, vencidas, marcar como hecha — complementa registrar-actividad. |
| `docs/help/contactos/contactos-sin-empresa.md` | contactos | Leads sueltos, mover entre empresas, decisor/firmante en detalle. |

### 3. Doc refinado (1)

| Path | Cambio |
|---|---|
| `docs/help/contactos/crear-contacto.md` | Reescrito y ampliado (de 5 chunks esperados a ~10). Añadido: tabla comparativa de puntos de entrada, tabla detallada de campos, **sección dedicada "Decisor vs firmante" con caso práctico**, casos especiales (sin email, email genérico, cambio de empresa, intermediario, duplicado), expansión de errores frecuentes, expansión de keywords (añadidos: agregar, alta, responsable, gerente, director, cargo, departamento, ficha contacto). Semántica original preservada. |

### 4. Decisión de NO crear

- `docs/help/faqs/dudas-comunes.md` (descartado): los puntos sueltos (storage limit, cifrado, compartir docs externos, recurrentes) caben mejor como secciones dentro de los docs de la entidad correspondiente (`subir-documento.md`, `gestionar-usuarios.md`, etc.). Inflar el corpus con un "FAQ" genérico empeora la calidad del retrieval del RAG.

---

## Trigger del workflow `regenerate-help-embeddings.yml`

> **NO ejecutado por este sprint**: genera coste real con Gemini API y sólo Juan debe decidir cuándo se dispara.

### Estado pre-trigger
- Embeddings actuales en `crm_help_embeddings`: **23 docs vectorizados** (vista vía MCP).
- Filesystem actual: **31 docs** en `docs/help/**` (23 ya embeddidos + 3 creados ayer aún no embeddidos + 7 nuevos de este sprint + 1 refinado que cuenta como cambio).
- Diff que el workflow procesará al ejecutarse: **+7 docs nuevos / +3 docs ya en filesystem pero no embeddidos / 1 doc reescrito**. Total ≈ **11 docs nuevos o cambiados**.

### Opción A — Disparar desde GitHub Actions (recomendado)

```bash
# Desde el repo, requiere GH CLI autenticado con permiso de actions:write
gh workflow run regenerate-help-embeddings.yml \
  --repo jolivares-valere/valere-v2 \
  --ref main
```

O vía web: https://github.com/jolivares-valere/valere-v2/actions/workflows/regenerate-help-embeddings.yml → botón "Run workflow" → branch `main` → "Run workflow".

### Opción B — Trigger automático por commit

Cuando se mergee a `main` cualquier cambio en `docs/help/**`, el workflow se dispara solo (filtro `paths`). Es decir: si haces commit + push de los nuevos docs en un PR a `main`, basta con merge.

### Opción C — Local (si prefiere correrlo desde su máquina sin esperar a GitHub)

```bash
# Pre-requisitos: vars de entorno cargadas (.env local con):
#   GEMINI_API_KEY_EMBEDDINGS=...
#   SUPABASE_URL=https://gtphkowfcuiqbvfkwjxb.supabase.co
#   SUPABASE_SERVICE_KEY=...
cd ~/valere-v2
node scripts/generate-help-embeddings.mjs
```

### Expectativas tras el trigger

- **Tiempo total**: 3-6 minutos (clone + npm install si Actions + ~220-310 calls Gemini con throttling + upsert Supabase).
- **Coste API**: <$0.05 USD (modelo `gemini-embedding-001` con `outputDimensionality=768` + free tier mensual de embeddings de Google AI).
- **Filas en `crm_help_embeddings` después**: ~280-320 (vs 216 actuales).
- **Verificación post-trigger**:
  ```sql
  -- Vía MCP Supabase (proyecto gtphkowfcuiqbvfkwjxb)
  SELECT COUNT(DISTINCT source_path) AS docs,
         COUNT(*) AS chunks,
         MAX(created_at) AS last_update
  FROM crm_help_embeddings;
  -- Esperado: docs = 31 (o 30 si README.md sigue contando como "general"), chunks ~300
  ```

### Smoke test post-trigger

Reproducir las consultas marginales del log y verificar que ahora salen >0.62:

```sql
-- Antes del refresh:
--   "¿Cómo añado un contacto a una empresa?" → top_sim 0.599
--   "¿Cómo configuro un recordatorio?"        → top_sim 0.692
--   "¿Qué estados puede tener una oportunidad?" → top_sim 0.577 / 0.668

-- Después del refresh (esperado, sin garantía absoluta sin volver a ejecutar):
--   las 3 deberían subir a >0.75 porque ahora el doc canónico está embeddido.
```

Para reproducir realmente, abrir el widget asistente del CRM en producción (https://valere-v2.pages.dev) y lanzar las preguntas. Quedarán nuevas filas en `crm_asistente_log` para revisar.

---

## Qué NO hizo este lane (intencional)

- **No se tocó `supabase/functions/ask-crm-docs/`** (otros lanes / no necesario).
- **No se modificó el threshold del Edge Function** (es decisión del lane que toca backend; el log confirma que el threshold actual rechazaría correctamente la única consulta off-topic registrada).
- **No se ejecutó el workflow de embeddings** (decisión de Juan + coste real Gemini).
- **No se hicieron commits ni push**: todo en local en el filesystem del repo.
- **No se actualizó `docs/ESTADO.md`** (otro lane está actualizándolo en paralelo según briefing del sprint domingo).

---

## Riesgos identificados

| Riesgo | Mitigación |
|---|---|
| El threshold del Edge Function v10 podría dejar fuera consultas válidas que estén en zona 0.50-0.55. | Recalibrar el umbral cuando haya >100 filas reales en el log. Documentar el valor del threshold elegido en `docs/PLAN_ASISTENTE_RAG_CRM.md`. |
| Los docs nuevos podrían generar **chunks vacíos** o muy cortos si el chunker tiene reglas estrictas. | Verificar tras el refresh con `SELECT source_path, COUNT(*) FROM crm_help_embeddings GROUP BY 1 ORDER BY 2`. Mínimo esperado: 5 chunks/doc. |
| 31 docs es ya un corpus amplio para una consultora pequeña. Más docs ≠ mejor RAG. | NO crear más docs hasta tener evidencia real (≥200 consultas en log). El plan de §9 del análisis recomienda enriquecer el log antes que el corpus. |

---

## Próximos pasos sugeridos (no acción inmediata)

1. **Juan**: trigger del workflow `regenerate-help-embeddings.yml` cuando lo crea oportuno (Opción A recomendada).
2. **Equipo**: usar el asistente del CRM con normalidad durante 1-2 semanas para acumular tráfico real.
3. **Próximo sprint Y o equivalente**: re-ejecutar el análisis con el log enriquecido (`SELECT * FROM crm_asistente_log WHERE fecha >= '<fecha_refresh_embeddings>'`) — esa será la primera medida real de calidad de los docs.
4. **Backend (otro lane)**: implementar enriquecimiento del log con `documento_top` y `chunk_top_index` (cambio aditivo en Edge Function + 1 migración pequeña). Habilita análisis cuantitativo serio.

---

## Archivos creados/modificados (lista exacta)

```
docs/ANALISIS_LOG_RAG_2026-04-26.md                       (nuevo)
docs/help/buscador/busqueda-global.md                     (nuevo)
docs/help/empresas/editar-archivar-empresa.md             (nuevo)
docs/help/empresas/exportar-datos.md                      (nuevo)
docs/help/perfil/configurar-mi-cuenta.md                  (nuevo)
docs/help/oportunidades/cerrar-oportunidad.md             (nuevo)
docs/help/actividades/mis-tareas-pendientes.md            (nuevo)
docs/help/contactos/contactos-sin-empresa.md              (nuevo)
docs/help/contactos/crear-contacto.md                     (refinado, semántica preservada)
.cowork/outbox/2026-04-26T09-50-05-sprint-domingo-lane-Y-help-content.md   (este handoff)
```

Total: **9 archivos `docs/help/**` + 1 análisis + 1 handoff = 11 archivos nuevos o modificados**.

Listos para `git add docs/help/ docs/ANALISIS_LOG_RAG_2026-04-26.md .cowork/outbox/` cuando Juan haga el cierre de los sprints paralelos.

---

**Fin del handoff sprint domingo lane Y.**
