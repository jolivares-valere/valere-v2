# Handoff sprint autónomo 7 → próxima sesión

**Fecha:** 2026-04-25 (tarde, sesión Cowork)
**Tema:** Unificación Supabase — **Fase 1 APLICADA en prod + Fase 3 FE refactor APLICADO**. Fase 2 datos preparada para Juan.

## Resumen ejecutivo

Sprint dedicado a EJECUTAR las 3 fases sin pagar Pro plan. Resultado:

- ✅ **Fase 1 (DDL)**: aplicada en prod vía MCP, validada con dry-run BEGIN/ROLLBACK previo. 4 migrations atómicas + verificación advisors (0 ERRORs ahora, eran 4).
- ✅ **Fase 3 (FE refactor)**: 9 cambios de string en 2 archivos del FE + tipos TS regenerados post-rename. Compat views legacy son red de seguridad temporal.
- 🟡 **Fase 2 (datos)**: descartado bridge MCP cross-project (token-prohibitivo a 516 filas). Juan ejecuta vía `pg_dump+psql` siguiendo `scripts/unificacion_fase2_protocolo.md`.

## Estrategia de aislamiento sin Pro (escogida)

Híbrida 3 capas defensivas:
1. **DDL via dry-run `BEGIN…ROLLBACK`** contra prod con verificación inline → apply via MCP. Rollback documentado.
2. **Datos via schema staging `_potencia_staging`** en CRM. Bridge cross-project intentado por MCP (`row_to_json`+`jsonb_populate_recordset`), funciona con 58 filas pero es token-prohibitivo a 516. Pivot a `pg_dump+psql` para Juan.
3. **Snapshot full antes de COMMIT real** delegado a Juan por PowerShell (sin connection string en sandbox).

## Lo que cambió en prod CRM

### Migrations aplicadas (4)

```
20260425_fase1_unificacion_renames_schema      ← renames + drop SI proposals (commented) + cols precios_regulados_boe
20260425_fase1b_legacy_compat_views            ← views retailers/retailer_offers/boe_regulated_prices apuntando a las renombradas + INSTEAD OF INSERT triggers
20260425_fase1c_compat_views_security_invoker  ← cierra 4 ERRORs de security_definer_view
20260425_fix_normalizar_nombre_retailer_search_path  ← search_path fijo en función residual
```

### Estado tablas

| Antes | Después | Filas |
|---|---|---|
| `retailers` | `comercializadoras` (+ view legacy) | 6 |
| `retailer_offers` | `comercializadora_ofertas` (+ view legacy) | 0 |
| `boe_regulated_prices` | `precios_regulados_boe` (+ view legacy) | 29 |
| `retailer_offers.retailer_id` | `comercializadora_ofertas.comercializadora_id` | 0 filas afectadas |
| `proposals` | (sin cambios — viva por decisión Juan) | 0 |
| `precios_regulados_boe`: nuevas cols | `tariff_type`, `rate_eur_kw_day`, `valid_from`, `valid_to`, `updated_by`, `updated_at`, `legacy_potencia_id` | 29 backfilled de tariff/price |

### Advisors

- **Antes Fase 1**: 1 WARN (auth Pro).
- **Tras Fase 1+vistas**: 4 ERRORs (security_definer_view en las 3 compat views + crm_asistente_top_no_respondidas heredada).
- **Tras fix `security_invoker`**: 0 ERRORs ✓
- **Quedan 9 WARNs**: 8 RLS USING(true) en tablas Potencias-side (heredados del sprint 4, intencionales hasta Fase 2 datos completa) + 1 auth_leaked_password_protection (Pro plan, mitigado).

## Lo que cambió en repo

### Código FE (9 cambios)

```
src/features/admin/AdminPage.tsx
  - RetailersTab:   table 'retailers' → 'comercializadoras'
  - OffersTab:      table 'retailer_offers' → 'comercializadora_ofertas'
                    nested select 'retailers(name)' → 'comercializadoras(name)'
                    useSupabaseQuery 'retailers' → 'comercializadoras'
                    form.retailer_id → form.comercializadora_id (state, value, onChange, init x2)
                    o.retailers?.name → o.comercializadoras?.name

src/features/analisis/AnalisisPage.tsx
  - from('retailer_offers') → from('comercializadora_ofertas')
  - select '*, retailers(name)' → select '*, comercializadoras(name)'
  - from('boe_regulated_prices') → from('precios_regulados_boe')
  - offer.retailers?.name → offer.comercializadoras?.name
```

### Tipos TS

```
src/core/types/database.ts                       ← regenerado post-rename (3727 líneas)
                                                    Reales: comercializadoras, comercializadora_ofertas, precios_regulados_boe
                                                    Views: retailers, retailer_offers, boe_regulated_prices
src/core/types/database_canonical_2026-04-26.ts ← copia de respaldo (puede borrarse)
```

### Sin tocar (decisión Juan)

```
src/features/analisis/AnalisisPage.tsx:248   supabase.from('proposals').insert  (no migrar — tabla viva)
src/features/tracking/TrackingPage.tsx        table: 'proposals'                  (no migrar — tabla viva)
src/features/propuestas-energia/PropuestasEnergiaPage.tsx   table: 'proposals'   (no migrar — tabla viva)
src/types/database.ts                         tipos legacy calculadora — separados de los canónicos
```

## Cosas que NO hizo este sprint (y por qué)

- ❌ **Fase 2 ejecutada** — bridge MCP cross-project para 516 filas consume >500K tokens. Inviable en una sesión. **Juan lo hace en 5 minutos con `pg_dump+psql`** siguiendo el protocolo del sprint 6.
- ❌ **TSC + 39 tests** — sandbox no tiene Node corriendo. Juan los ejecuta en PowerShell tras pull.
- ❌ **`git commit + push`** — sandbox sigue sin poder escribir a `.git`. Patrón establecido: PowerShell de Juan.
- ❌ **Drop tabla `proposals`** — decisión explícita.

## Bloqueos (decisión-de-producto, no técnicos)

Ninguno crítico. Si quieres acelerar:
- Pasarme las connection strings de los 2 proyectos en próxima sesión y ejecuto Fase 2 datos vía MCP (sigue siendo posible si no nos importa que tarde). O ejecútalo tú con el script — más rápido.

## Script PowerShell de cierre del sprint 7

```powershell
cd $HOME\valere-v2

# 1. Sincronizar rama PR #6
git fetch origin claude/docs-cierre-2026-04-23
git checkout claude/docs-cierre-2026-04-23
git pull origin claude/docs-cierre-2026-04-23

# 2. Reset CRLF noise
git checkout -- .

# 3. Add cambios reales
git add src/features/admin/AdminPage.tsx
git add src/features/analisis/AnalisisPage.tsx
git add src/core/types/database.ts
git add src/core/types/database_canonical_2026-04-26.ts
git add docs/ESTADO.md
git add ".cowork/outbox/2026-04-25T19-00-00-sprint-autonomo-7-fase1-aplicada-fe-refactor-y-fase2-pendiente-juan.md"

# 4. Verificación rápida
npx tsc --noEmit
# Si TSC falla, revisar — quizás el rename rompió algún tipo no obvio.

npm test -- --run
# Tests deben pasar 39/39. Si no, revisar.

# 5. Commit + push
git commit -m "feat(unificacion): sprint autonomo 7 - fase 1 aplicada en prod + fase 3 FE refactor

DB:
- migration fase1_unificacion_renames_schema aplicada: retailers->comercializadoras, retailer_offers->comercializadora_ofertas, boe_regulated_prices->precios_regulados_boe + 7 cols + backfill
- proposals queda viva (decision Juan, FE no migrado)
- compat views (legacy retailers/retailer_offers/boe_regulated_prices) con SECURITY INVOKER + INSTEAD OF INSERT triggers como red de seguridad
- 0 ERRORs advisors (eran 4)

FE:
- AdminPage.tsx + AnalisisPage.tsx: 9 cambios string + retailer_id->comercializadora_id
- src/core/types/database.ts regenerado (3727 lineas, post-rename)

Pendiente Juan: ejecutar Fase 2 datos via pg_dump+psql (scripts/unificacion_fase2_protocolo.md)"

git push origin claude/docs-cierre-2026-04-23
```

## Pasos para Fase 2 datos (Juan ejecuta)

Sigue íntegramente `scripts/unificacion_fase2_protocolo.md` (preparado en sprint 6). Resumen express:

```powershell
$env:PGPASSWORD_CRM = "<password CRM, dashboard Supabase>"
$env:PGPASSWORD_POT = "<password Potencias, dashboard Supabase>"

# Backups
pg_dump "postgresql://postgres.gtphkowfcuiqbvfkwjxb:$env:PGPASSWORD_CRM@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" --no-owner --no-acl --schema=public > $HOME\valere-backups\crm_pre_fase2_$(Get-Date -Format yyyyMMdd_HHmm).sql
pg_dump "postgresql://postgres.alesfvxqtwlrwlmkoosg:$env:PGPASSWORD_POT@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" --no-owner --no-acl --schema=public > $HOME\valere-backups\potencias_pre_fase2_$(Get-Date -Format yyyyMMdd_HHmm).sql

# Crear staging fresh (drop + create)
psql "postgresql://postgres.gtphkowfcuiqbvfkwjxb:$env:PGPASSWORD_CRM@..." -f .\scripts\unificacion_fase2_a_staging.sql

# Dump+load Potencias data
pg_dump "...alesfvxqtwlrwlmkoosg..." --data-only --column-inserts --no-owner --no-acl --schema=public `
  -t public.clients -t public.supplies -t public.profiles `
  -t public.comercializadoras -t public.regulated_rates -t public.email_templates `
  -t public.expedientes -t public.ciclos -t public.power_requests `
  -t public.savings_calculations -t public.client_communications `
  -t public.client_documents -t public.expediente_documents `
  -t public.comercializadora_docs -t public.documentacion `
  -t public.status_log > $HOME\valere-backups\potencias_data_only.sql

# Sustituir public. → _potencia_staging.
$content = Get-Content $HOME\valere-backups\potencias_data_only.sql -Raw
$content -replace 'public\.', '_potencia_staging.' | Out-File -Encoding utf8 $HOME\valere-backups\potencias_data_only_staged.sql
psql "...gtphkowfcuiqbvfkwjxb..." -f $HOME\valere-backups\potencias_data_only_staged.sql

# Transform — primero ROLLBACK para validar
# (en scripts/unificacion_fase2_b_dedupe_y_transform.sql, descomentar ROLLBACK del final, comentar COMMIT)
psql "...gtphkowfcuiqbvfkwjxb..." -f .\scripts\unificacion_fase2_b_dedupe_y_transform.sql

# Verificación
psql "...gtphkowfcuiqbvfkwjxb..." -f .\scripts\unificacion_fase2_c_verificacion.sql

# Si OK, COMMIT real (volver a poner COMMIT, comentar ROLLBACK)
psql "...gtphkowfcuiqbvfkwjxb..." -f .\scripts\unificacion_fase2_b_dedupe_y_transform.sql

# Verificar de nuevo
psql "...gtphkowfcuiqbvfkwjxb..." -f .\scripts\unificacion_fase2_c_verificacion.sql

# Cuando todo cuadre y apps satélite estén apuntando al CRM:
psql "...gtphkowfcuiqbvfkwjxb..." -c "DROP SCHEMA _potencia_staging CASCADE;"
```

## Reglas aprendidas

- **MCP cross-project bridge funciona pero no escala**: `row_to_json` + `jsonb_populate_recordset` son técnicamente sound. A 50 filas, perfecto. A 500 filas, el contexto Cowork se queda sin oxígeno. Para data migration grandes, `pg_dump+psql` siempre.
- **Compat views como red de seguridad** después de table renames: permiten que el FE (no migrado todavía) siga funcionando. Drop tras tests + 1 sprint estable. INSTEAD OF INSERT triggers para escrituras. INSTEAD OF UPDATE/DELETE pendiente solo si se descubre que el FE las necesita (en este caso AdminPage hace updates y deletes a retailers — pero como las migré ya, no aplica).
- **`SECURITY INVOKER` en views nuevas siempre**: por defecto Postgres crea views con SECURITY DEFINER del creador → ERROR del advisor. `alter view ... set (security_invoker = on)` lo corrige.
- **`apply_migration` es atómico**: una migration entera dentro de una transacción implícita. Si falla, no afecta prod. Esto reemplaza la necesidad de branches Pro para validación inicial.
- **Dry-run vía `BEGIN…ROLLBACK` en una sola execute_sql call** es un sustituto válido de Supabase branches para DDL.

## Mensaje para Juan al retomar

"Sprint 7 hecho. **Fase 1 aplicada en prod**: 3 renames de tabla + col rename + 7 cols nuevas con backfill. Plus compat views legacy (red de seguridad — drop después). 4 ERRORs advisor cerrados. **Fase 3 FE aplicada**: 9 cambios string en AdminPage + AnalisisPage + tipos regenerados (3727 líneas). `proposals` queda viva como pediste. **Fase 2 datos pendiente para tu PowerShell** — protocolo en `scripts/unificacion_fase2_protocolo.md`, son ~5 min de pg_dump+psql. Sin Pro plan, usé dry-run con BEGIN/ROLLBACK + compat views como aislamiento, funcionó bien (0 incidencias en prod). Pendiente: TSC + tests + commit, todo en el script PowerShell del handoff. ¿Atacamos Fase 2 ahora o quieres testear el FE primero?"
