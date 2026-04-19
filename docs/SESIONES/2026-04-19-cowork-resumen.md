# VALERE CRM — Resumen sesiones Cowork (Claude Web)
> Archivo de memoria persistente. Última actualización: 2026-04-19 por Claude Cowork (claude.ai)

---

## Sesión nocturna: 2026-04-18T19:00 – 2026-04-19T01:00

### Contexto
Trabajo autónomo nocturno. Rama `claude/valere-crm-architecture-2vvEV`.
Instrucción: leer 4 mensajes en `.cowork/outbox/` con fecha `2026-04-18T19-*`, ejecutar por prioridad (high → medium → low), dejar ACK en `.cowork/inbox/`.

### Mensajes procesados (en orden de prioridad)

| Prioridad | Mensaje | Tarea |
|-----------|---------|-------|
| high | `2026-04-18T19-15-00-fase-20.7-unificacion-schema.md` | Unificación schema |
| medium | `2026-04-18T19-30-00-fase-20.9-rls-granular.md` | RLS granular multitenant |
| medium | `2026-04-18T19-00-00-fase-20.8-edge-function-chat.md` | Edge Function Gemini |
| low | `2026-04-18T19-45-00-fase-21.a-pipeline-energetico.md` | Pipeline energético SQL |

---

## FASE 20.7 — Unificación de schema

### 20.7.a — users_profile → user_profiles
- Estado: ✅ no-op
- La tabla users_profile NO existía (ya se llamaba user_profiles)
- user_profiles tiene 1 fila existente

### 20.7.b — clients → empresas
- Estado: ✅ OK — 1 fila migrada
- Empresa: "PAZ Y BIEN 5002AP"
- Correcciones de columnas: company_name→nombre, fiscal_address→direccion, tax_id→cif, contact_email→email, contact_phone→telefono

### 20.7.c — supply_points → cups
- Estado en sesión nocturna: ❌ BLOQUEADO
- Bloqueador: cups.contrato_id NOT NULL, supply_points no tiene equivalente
- Estado en sesión mañana: ✅ RESUELTO (ver FASE 20.7.c RETRY abajo)

### 20.7.d — invoice_history → facturas
- Estado: ✅ OK
- Tabla renombrada correctamente
- facturas_exists=true, invoice_history_exists=false, rows=1

---

## FASE 20.9 — RLS granular multitenant
- Estado: ✅ Archivo SQL creado, NO aplicado (instrucción explícita)
- Archivo: supabase/migrations/20260418_fase20.9_rls_granular.sql
- Pendiente: EXPLAIN ANALYZE antes de activar en producción

---

## FASE 20.8 — Edge Function chat-consultor
- Estado: ✅ Archivo TypeScript creado, deploy pendiente CLI
- Archivo: supabase/functions/chat-consultor/index.ts
- Pendiente: supabase secrets set GEMINI_API_KEY + supabase functions deploy

---

## FASE 21.a — Pipeline energético
- Estado: ✅ Migración aplicada y verificada en Supabase
- ahorro_anual_estimado: ✅, contacto_id: ✅, v_oportunidades_kpi: 1 fila ✅

---

## FASE 20.7.c RETRY — Fix cups.contrato_id nullable (sesión 2026-04-19 mañana)

### Paso 1: ALTER TABLE
- SQL: ALTER TABLE public.cups ALTER COLUMN contrato_id DROP NOT NULL;
- Estado: ✅ OK — "Success. No rows returned"
- Nota: primer intento falló por rollback al mezclar DDL+DML. Se separaron en queries distintas.

### Paso 2: INSERT supply_points → cups
- Estado: ✅ OK — rows_migrated = 1
- Correcciones de columnas:
  - sp.direccion NO existe → real: sp.supply_address
  - sp.distribuidora NO existe → real: sp.current_retailer
- SQL final:
  INSERT INTO public.cups (id, empresa_id, codigo_cups, direccion_suministro, distribuidor, estado, created_at)
  SELECT sp.id, sp.client_id, sp.cups, sp.supply_address, sp.current_retailer, 'activo', sp.created_at
  FROM public.supply_points sp
  WHERE NOT EXISTS (SELECT 1 FROM public.cups c WHERE c.codigo_cups = sp.cups);

---

## Estado real de las tablas post-sesiones

| Tabla | Estado | Filas | Notas |
|-------|--------|-------|-------|
| user_profiles | ✅ activa | 1 | Nombre correcto |
| empresas | ✅ activa | 1 | PAZ Y BIEN migrada |
| clients | ⚠️ legacy | 1 | Pendiente DROP futura |
| cups | ✅ activa | 1 | CUPS migrado, contrato_id nullable |
| supply_points | ⚠️ legacy | 1 | Pendiente DROP futura |
| facturas | ✅ activa | 1 | Renombrada desde invoice_history |
| invoice_history | ❌ eliminada | - | Renombrada a facturas |
| oportunidades | ✅ activa | 1 | Pipeline energético ok |

---

## Correcciones de schema (columnas asumidas vs reales)

| Tabla | Columna asumida | Columna real |
|-------|----------------|--------------|
| empresas | company_name | nombre |
| empresas | fiscal_address | direccion |
| empresas | tax_id | cif |
| empresas | contact_email | email |
| empresas | contact_phone | telefono |
| supply_points | direccion | supply_address |
| supply_points | distribuidora | current_retailer |

---

## Decisiones tomadas

1. NO hacer DROP de clients ni supply_points hasta confirmación de Claude Code
2. NO aplicar FASE 20.9 RLS granular hasta EXPLAIN ANALYZE en producción
3. NO hacer force-push en ningún momento
4. GEMINI_API_KEY siempre server-side, nunca en bundle cliente
5. Separar DDL + DML en queries distintas para evitar rollback total

---

## Pendientes para Claude Code

- [ ] supabase secrets set GEMINI_API_KEY=<valor_real>
- [ ] supabase functions deploy chat-consultor
- [ ] Refactorizar ChatIAPanel.tsx para usar supabase.functions.invoke
- [ ] EXPLAIN ANALYZE en FASE 20.9 antes de aplicar RLS granular
- [ ] Confirmar DROP de clients y supply_points (datos ya migrados)
- [ ] npx supabase gen types typescript para regenerar tipos TS
- [ ] Crear bucket Storage documentos (public=false, 50MB max)
