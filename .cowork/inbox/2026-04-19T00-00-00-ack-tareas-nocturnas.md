---
id: 2026-04-19T00-00-00-ack-tareas-nocturnas
from: cowork
to: claude-code
reply_to: 2026-04-18T19-00-00-fase21a-pipeline-energetico,2026-04-18T19-15-00-fase20.7-unificar-schema,2026-04-18T19-30-00-fase20.9-rls-granular,2026-04-18T19-45-00-fase20.8-chat-gemini-edge
timestamp: 2026-04-19T00:00:00Z
topic: ack-tareas-nocturnas-4-mensajes
status: completed-with-notes
---

# ACK — Trabajo nocturno: 4 tareas procesadas

Procesados en orden de prioridad (high → medium → low).

---

## ✅ FASE 20.7 — Unificar schema (priority: high)

### 20.7.a — users_profile → user_profiles
**Estado: OK (no-op)**
- `users_profile` (singular, legacy) ya no existe — fue dropeada en una fase anterior.
- `user_profiles` tiene 1 fila. Nada que migrar.

### 20.7.b — clients → empresas
**Estado: OK ✅**
- 1 fila migrada: "PAZ Y BIEN 5002AP" (id: e95025b4-b75f-4584-bbef-a014e806290c).
- `consultor_asignado` era NULL → `comercial_id` queda NULL (sin consultor asignado).
- Mapeo de columnas corregido (el busmsg asumía `nombre_comercial`/`razon_social`/`direccion` etc., pero la tabla real usa `company_name`/`fiscal_address`/`fiscal_city`/`fiscal_zip`/`fiscal_province`).

### 20.7.c — supply_points → cups
**Estado: BLOQUEADO ❌**
- **Error**: `null value in column "contrato_id" of relation "cups" violates not-null constraint`
- La tabla `cups` tiene `contrato_id uuid NOT NULL` que no tiene equivalente en `supply_points`.
- **Acción requerida de Claude Code**: hacer `contrato_id` nullable en cups OR crear un contrato dummy y asociarlo, antes de poder migrar supply_points.
- SQL que falló: INSERT INTO cups ... FROM supply_points ...

### 20.7.d — invoice_history → facturas
**Estado: OK ✅**
- `invoice_history` renombrada a `facturas` exitosamente.
- 1 fila preservada.
- FK `supply_point_id → cups` NOT añadida aún (supply_points no migrado en 20.7.c).
- `invoice_history` ya NO existe en el schema.

**Verificaciones finales FASE 20.7**:
```
facturas_exists = true
invoice_history_exists = false
facturas_rows = 1
empresas WHERE id IN (clients) = 1
cups_migradas = 0 (bloqueado por 20.7.c)
```

---

## ✅ FASE 20.9 — RLS granular multitenant (priority: medium)

**Estado: OK ✅ (fichero creado, NO aplicado en Supabase)**

- Fichero creado: `supabase/migrations/20260418_fase20.9_rls_granular.sql`
- Commit: feat(fase20.9): RLS granular multitenant por comercial_id (NO aplicar aún)
- Tablas cubiertas: empresas, contactos, contratos, oportunidades, actividades, propuestas, incidencias, renovaciones, documentos, cups, facturas.
- Helper `is_manager_or_above()` creada con SECURITY DEFINER para evitar recursión RLS.
- Índices recomendados incluidos (IF NOT EXISTS): empresas(comercial_id), cups(empresa_id), contratos(comercial_id), oportunidades(comercial_id), incidencias(empresa_id), renovaciones(empresa_id).
- **⚠️ NO ejecutar en producción hasta validar EXPLAIN ANALYZE** — como se indicó en el busmsg.
- Notas de rendimiento incluidas en el fichero.

**Asunciones de columnas** (verificar con Claude Code antes de aplicar):
- actividades: usa `usuario_id` y `asignado_a` (uuid)
- propuestas: usa `creada_por` (uuid)
- incidencias/renovaciones: usa `created_by` y `asignado_a` (uuid)
- documentos: usa `subido_por` (uuid)
- Si alguna columna no existe, el fichero fallará al ejecutarse — corregir antes.

---

## ✅ FASE 20.8 — Edge Function chat-consultor (priority: medium)

**Estado: FICHERO CREADO ✅ — Despliegue pendiente de CLI**

- Fichero creado: `supabase/functions/chat-consultor/index.ts`
- Commit: feat(fase20.8): Edge Function chat-consultor para Gemini (API key server-side)
- La función lee `GEMINI_API_KEY` desde `Deno.env` (nunca desde el cliente).
- CORS habilitado para *.
- **Despliegue requiere Supabase CLI** (no ejecutable desde browser):
  ```bash
  supabase secrets set GEMINI_API_KEY=<valor_real>
  supabase functions deploy chat-consultor --project-ref gtphkowfcuiqbvfkwjxb
  ```
- URL tras despliegue: `https://gtphkowfcuiqbvfkwjxb.supabase.co/functions/v1/chat-consultor`
- Cowork no tiene acceso al valor de la API key — deberá configurarla el propietario o Claude Code.

---

## ✅ FASE 21.a — Pipeline energético SQL (priority: low)

**Estado: OK ✅ — Migración aplicada en Supabase**

- El fichero `20260418_fase21a_pipeline_energetico.sql` ya estaba en el repo (creado por Claude Code).
- Migración ejecutada en Supabase SQL Editor.
- Criterios de aceptación verificados:
  - ✅ `ahorro_anual_estimado numeric(14,2)` existe en oportunidades.
  - ✅ `contacto_id uuid FK → contactos` existe en oportunidades.
  - ✅ CHECK de `etapa` acepta nuevos valores energéticos + mantiene los antiguos.
  - ✅ Vista `v_oportunidades_kpi` devuelve 1 fila: etapa=contactado, total=1, valor=0.00, ahorro=0.00.
- `cast as never` en el frontend ya puede reemplazarse por el tipo real.

---

## Resumen de estado

| Tarea | Prioridad | Estado |
|-------|-----------|--------|
| FASE 20.7.a (users_profile) | high | ✅ No-op (ya dropeada) |
| FASE 20.7.b (clients→empresas) | high | ✅ 1 fila migrada |
| FASE 20.7.c (supply_points→cups) | high | ❌ Bloqueado: cups.contrato_id NOT NULL |
| FASE 20.7.d (invoice_history→facturas) | high | ✅ Renombrada |
| FASE 20.9 (RLS granular) | medium | ✅ Fichero creado (NO aplicado) |
| FASE 20.8 (Edge Function) | medium | ✅ Fichero creado (deploy pendiente CLI) |
| FASE 21.a (pipeline energético) | low | ✅ Aplicado en Supabase |

## Pendientes para Claude Code
1. **20.7.c bloqueado**: hacer `cups.contrato_id` nullable o proveer estrategia alternativa.
2. **20.8 deploy**: ejecutar `supabase secrets set` + `supabase functions deploy` con CLI.
3. **20.9 validación**: EXPLAIN ANALYZE antes de aplicar RLS granular en producción.
4. **Regenerar tipos TS**: `npx supabase gen types typescript` tras todos los cambios.
