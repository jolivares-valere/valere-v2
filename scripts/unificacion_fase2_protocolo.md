# Fase 2 — Migración de datos Potencias → CRM canónico

> Generado por sprint autónomo 6 (2026-04-26).
> Prerequisitos: Fase 1 (`supabase/migrations/20260426_fase1_unificacion_renames_schema.sql`) aplicada en CRM.
> **Es operación destructiva sobre prod CRM** — leer el plan de rollback antes de ejecutar.

## Resumen

Importar **~408 filas** de datos de producción del proyecto `valere-gestion-potencias` (`alesfvxqtwlrwlmkoosg`, eu-central-1) al proyecto CRM canónico (`gtphkowfcuiqbvfkwjxb`, eu-west-1):

| Tabla origen | Filas | Tabla destino |
|---|---:|---|
| `clients` | 30 (24 CIFs únicos) | `empresas` (dedupe vs CRM por CIF) |
| `supplies` | 75 (72 CUPS únicos) | `cups` (dedupe vs CRM por código) |
| `profiles` | 4 | `user_profiles` (dedupe por email) |
| `comercializadoras` | 2 | `comercializadoras` (dedupe por nombre) |
| `regulated_rates` | 18 | `precios_regulados_boe` (append distinto valid_from) |
| `email_templates` | 2 | `email_templates` (append) |
| `expedientes` | 41 | `expedientes` (append, FK re-mapeadas) |
| `ciclos` | 41 | `ciclos` (append) |
| `power_requests` | 41 | `solicitudes_potencia` (append, FK re-mapeadas) |
| `savings_calculations` | 41 | `savings_calculations` (append) |
| `client_communications` | 31 | `comunicaciones_cliente` (append) |
| `client_documents` | 70 | `documentos` (append polimórfico, entidad_tipo='empresa') |
| `expediente_documents` | 27 | `documentos` (append polimórfico, entidad_tipo='expediente') |
| `comercializadora_docs` | 1 | `comercializadora_docs` (append) |
| `documentacion` | 1 | `documentos` (append polimórfico, entidad_tipo=null o 'general') |
| `status_log` | 91 | `status_log` (append) |
| `alerts` | 0 | `alertas` (skip — vacía) |
| `excel_import_templates` | 0 | `excel_import_templates` (skip — vacía) |

**Internal duplicates en Potencias** detectados: 6 clients con CIF duplicado, 3 supplies con CUPS duplicado. Hay que reducirlos antes (Paso 2 más abajo).

## Estrategia cross-proyecto (¿por qué este protocolo?)

Los 2 proyectos están en **organizaciones de Supabase distintas en regiones distintas**. Tres opciones:

| Opción | Pros | Contras |
|---|---|---|
| **A. `pg_dump` + `psql`** (recomendado) | Sencillo, sin red abierta, audit trail por archivo | Requiere PSQL instalado y connection strings con SUPER |
| B. `postgres_fdw` (Foreign Data Wrapper) | Migración SQL-only, pure Postgres | Requiere `postgres_fdw` extension + credenciales en plain text en CRM, latencia cross-region |
| C. Script Node/Python con cliente Supabase | API limpia | Lento (300+ requests), dependencias extra |

**Decisión: opción A** (`pg_dump --data-only` desde Potencias → staging en CRM → SQL transforms → tablas canónicas).

## Protocolo paso a paso

### 0. Backups (no negociable)

```powershell
$env:PGPASSWORD_CRM = "<password CRM>"  # pedir a Juan
$env:PGPASSWORD_POT = "<password Potencias>"

# Backup full pre-migración
pg_dump "postgresql://postgres.gtphkowfcuiqbvfkwjxb:$env:PGPASSWORD_CRM@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" `
  --no-owner --no-acl `
  --schema=public `
  > $HOME\valere-backups\crm_pre_fase2_$(Get-Date -Format yyyyMMdd_HHmm).sql

pg_dump "postgresql://postgres.alesfvxqtwlrwlmkoosg:$env:PGPASSWORD_POT@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" `
  --no-owner --no-acl `
  --schema=public `
  > $HOME\valere-backups\potencias_pre_fase2_$(Get-Date -Format yyyyMMdd_HHmm).sql
```

### 1. Dump de datos Potencias (data-only)

```powershell
# Dumpear SOLO los datos de las tablas relevantes
pg_dump "postgresql://postgres.alesfvxqtwlrwlmkoosg:$env:PGPASSWORD_POT@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" `
  --data-only --column-inserts --no-owner --no-acl `
  --schema=public `
  -t public.clients -t public.supplies -t public.profiles `
  -t public.comercializadoras -t public.regulated_rates -t public.email_templates `
  -t public.expedientes -t public.ciclos -t public.power_requests `
  -t public.savings_calculations -t public.client_communications `
  -t public.client_documents -t public.expediente_documents `
  -t public.comercializadora_docs -t public.documentacion `
  -t public.status_log `
  > $HOME\valere-backups\potencias_data_only.sql
```

### 2. Cargar dump en schema staging del CRM

Aplicar primero `unificacion_fase2_a_staging.sql` para crear schema `_potencia_staging` con todas las tablas tal cual Potencias.

```powershell
psql "postgresql://postgres.gtphkowfcuiqbvfkwjxb:$env:PGPASSWORD_CRM@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" `
  -f .\scripts\unificacion_fase2_a_staging.sql

# Sustituir public. → _potencia_staging. en el dump (sed/PowerShell regex)
$content = Get-Content $HOME\valere-backups\potencias_data_only.sql -Raw
$content = $content -replace 'public\.', '_potencia_staging.'
$content | Out-File -Encoding utf8 $HOME\valere-backups\potencias_data_only_staged.sql

psql "postgresql://postgres.gtphkowfcuiqbvfkwjxb:$env:PGPASSWORD_CRM@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" `
  -f $HOME\valere-backups\potencias_data_only_staged.sql
```

### 3. Aplicar transform staging → canónico

```powershell
psql "postgresql://postgres.gtphkowfcuiqbvfkwjxb:$env:PGPASSWORD_CRM@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" `
  -f .\scripts\unificacion_fase2_b_dedupe_y_transform.sql
```

Este script ejecuta dentro de una **transacción única** (todo o nada):
- Función `normalizar_cif()` y `normalizar_cups()`.
- Inserts dedup-aware en `empresas`, `cups`, `comercializadoras`, `precios_regulados_boe`.
- Tablas de mapeo `_migration_*_map` (staging.id → canonical.id) para re-mapear FKs.
- Inserts en `expedientes`, `ciclos`, `solicitudes_potencia`, etc. con FKs re-mapeadas.
- `client_documents` + `expediente_documents` → `documentos` polimórfico (entidad_tipo + entidad_id).

Si algo falla → ROLLBACK automático, prod queda intacta.

### 4. Verificación

```powershell
psql "postgresql://postgres.gtphkowfcuiqbvfkwjxb:$env:PGPASSWORD_CRM@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" `
  -f .\scripts\unificacion_fase2_c_verificacion.sql
```

Debe mostrar:
- Contadores totales = CRM + Potencias - duplicados.
- 0 orphans en FKs.
- 0 duplicados por CIF en empresas.
- 0 duplicados por código_cups en cups.

### 5. Limpiar staging

Cuando todo esté validado y las apps satélite apunten al CRM (Fase 3+):

```sql
DROP SCHEMA _potencia_staging CASCADE;
DROP TABLE _migration_empresa_map;
DROP TABLE _migration_cups_map;
DROP TABLE _migration_user_map;
DROP TABLE _migration_comercializadora_map;
DROP TABLE _migration_expediente_map;
DROP TABLE _migration_ciclo_map;
```

## Plan de rollback

| Punto | Acción rollback | Tiempo |
|---|---|---|
| Antes de paso 3 | `DROP SCHEMA _potencia_staging CASCADE` (no afecta prod) | 1 min |
| Durante paso 3 (en tx) | ROLLBACK automático del transaction. Prod intacta | 0 min |
| Después de paso 3 | Restore desde `crm_pre_fase2_*.sql` (paso 0) | 10-30 min |
| Después de Fase 3 (apps cambiadas) | Mismo restore + revertir env vars apps satélite | 15 min adicional |

**Los proyectos originales se mantienen intactos** durante toda la Fase 2 y siguientes hasta la Fase 5 (cleanup), donde se pausan tras 1 semana estable.

## Bloqueos para Cowork (por qué no se ejecuta autónomo)

- 🔒 **Connection strings** y passwords de los 2 proyectos no están disponibles en el sandbox de Cowork. Hay que recuperarlos del Dashboard Supabase (Database → Connection pooling).
- 🔒 **Operación destructiva sobre prod del CRM**. Aunque dentro de la transacción es reversible, la regla "operaciones destructivas en prod sin rollback claro" del sprint manda esperar tu OK.
- 🔒 **`pg_dump` no está disponible en el sandbox** (es PowerShell de Juan o WSL).

Ejecutar tras: revisar `unificacion_fase2_b_dedupe_y_transform.sql` (lo más denso del sprint), confirmar backups completados, y validar que las apps satélite están listas para apuntar al CRM (Fase 3).
