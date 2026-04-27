# Runbook Fase 2 — Migración Potencias → CRM canónico

> Generado: 2026-04-26 por `sprint-domingo-lane-X-fase2-prep`.
> Estado scripts: dry-run **PASA** (BEGIN…ROLLBACK contra prod CRM).
> Volumen probado: 30 empresas, 75 CUPS, 41 expedientes/ciclos/solicitudes/savings, 31 comunicaciones, 98 documentos, 1 com_doc, 91 status_log, 2 email_templates.
> 408 filas representativas. 0 orphans, 0 duplicados, 0 incoherencias.

## TL;DR — One-liner

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\joliv\valere-v2\RUNBOOK_FASE2.ps1"
```

MD5 esperado del runbook: `917bda932c4a341ef96894be18cff0c0`
(verifica con `Get-FileHash -Algorithm MD5 .\RUNBOOK_FASE2.ps1`).

## Índice

1. Prerequisitos
2. Resumen de lo que hace el runbook (12 pasos)
3. Bugs encontrados durante el dry-run y corregidos
4. Comandos de rollback de emergencia
5. Troubleshooting
6. Anexo: log esperado del dry-run

---

## 1. Prerequisitos

- **Fase 1 ya aplicada** en CRM (`supabase/migrations/20260426_fase1_unificacion_renames_schema.sql`). Verifica que la tabla `comercializadoras` tiene la columna `legacy_potencia_com_id` y `empresas` tiene `legacy_potencia_id`.
- **PostgreSQL client tools 17.x** instalado (`pg_dump`, `psql` en el `PATH`). Si no, descarga desde https://www.postgresql.org/download/windows/.
- **PowerShell 5.1+** (Windows nativo) o PowerShell 7.x.
- **Connection strings** con passwords del pooler:
  - CRM: https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb/settings/database (Connection pooling → Session mode)
  - Potencias: https://supabase.com/dashboard/project/alesfvxqtwlrwlmkoosg/settings/database
  - Username CRM: `postgres.gtphkowfcuiqbvfkwjxb`
  - Username Potencias: `postgres.alesfvxqtwlrwlmkoosg`
  - Host CRM: `aws-0-eu-west-1.pooler.supabase.com:5432`
  - Host Potencias: `aws-0-eu-central-1.pooler.supabase.com:5432`
- **Carpeta de backups** disponible (default: `$env:USERPROFILE\valere-backups`).
- **No tener nadie usando el CRM** durante la migración (ventana de mantenimiento). Coordina con el equipo.

## 2. Pasos del runbook

El script `RUNBOOK_FASE2.ps1` ejecuta los siguientes pasos, **pausando** entre cada uno con instrucción concreta de qué buscar:

| # | Paso | Qué hace | Qué verificar en la pausa |
|---|---|---|---|
| 0 | Verificación entorno | Comprueba `pg_dump`, `psql`, scripts | (sin pausa) |
| 1 | Solicitar passwords | Lee passwords como `SecureString` | Tienes ambos passwords del Dashboard |
| 2 | Verificar conexiones | `SELECT 1` contra ambos proyectos | Salida `OK` en ambos |
| 3 | Backups previos | `pg_dump` schema-only de los 2 proyectos | Tamaños razonables (>50KB CRM, >100KB Potencias) |
| 4 | Crear schema staging | Aplica `unificacion_fase2_a_staging.sql` | `\dt _potencia_staging.*` lista 19 tablas |
| 5 | Dump data-only Potencias | `pg_dump --data-only --column-inserts` de las 16 tablas relevantes | Archivo >50KB |
| 6 | Reescribir `public.` → `_potencia_staging.` | Search-replace con `Get-Content -Raw` y `-replace` | Inicio del archivo apunta a `_potencia_staging` |
| 7 | Cargar dump en staging | `psql -f` del archivo reescrito | Counts staging cuadran (~30 clients, etc.) |
| 8 | DRY-RUN del transform | Ejecuta `b` con `commit;` → `rollback;` reemplazado | Sin errores en el output |
| 9 | Repetir dry-run + verificación | Concatena `b_dryrun.sql` + `c_verificacion.sql` dentro del mismo BEGIN, hace ROLLBACK | Counts esperados, orphans = 0, duplicados = 0 |
| 10 | **Confirmación COMMIT** | Pide al usuario escribir `COMMIT` | Usuario decide si aborta o continúa |
| 11 | Aplicar transform definitivo | `psql -f unificacion_fase2_b_dedupe_y_transform.sql` con su propio `commit;` | Sin errores |
| 12 | Verificación final | `psql -f unificacion_fase2_c_verificacion.sql` | Mismos checks del paso 9 pero con datos persistidos |

## 3. Bugs encontrados durante el dry-run y corregidos

El dry-run del 2026-04-26 reveló **5 problemas reales** en los scripts originales. Todos corregidos en el commit que acompaña este runbook.

### 3.1 Columna inexistente: `comercializadoras.notas` (debe ser `notes`)

**Síntoma esperado en producción:** `ERROR: column "notas" of relation "comercializadoras" does not exist`.

**Causa:** la tabla `comercializadoras` en CRM tiene la columna `notes` (legado del esquema retailers). El script B intentaba insertar `notas`.

**Fix aplicado:** en `scripts/unificacion_fase2_b_dedupe_y_transform.sql` línea ~83, el INSERT ahora apunta a `notes`.

### 3.2 NOT NULL violado: `precios_regulados_boe.tariff`

**Síntoma esperado:** `ERROR: null value in column "tariff" violates not-null constraint`.

**Causa:** `precios_regulados_boe` tiene 2 columnas redundantes: `tariff` (legacy, NOT NULL) y `tariff_type` (nullable). El script B solo populaba `tariff_type`.

**Fix aplicado:** el INSERT ahora populates **ambas** con el mismo valor (`rr.tariff_type`). Una limpieza posterior puede eliminar la columna `tariff` cuando el código frontend deje de leerla.

### 3.3 CHECK constraint: `documentos.entidad_tipo` no permite `expediente`/`general`

**Síntoma esperado:** `ERROR: new row for relation "documentos" violates check constraint "documentos_entidad_tipo_check"`.

**Causa:** la constraint actual permite solo `'empresa','contrato','oportunidad','contacto'`. El transform de Potencias necesita usar `'expediente'` y `'general'`.

**Fix aplicado:** el script B ahora ejecuta `ALTER TABLE … DROP CONSTRAINT … ADD CONSTRAINT` con la lista extendida ANTES de los inserts en `documentos`. Es idempotente.

### 3.4 CHECK constraint: `documentos.tipo` no permite `autorizacion`

**Síntoma esperado:** mismo tipo de error que 3.3.

**Causa:** `documentos.tipo` permite solo `'contrato','factura','documentacion','otro'`. Los `expediente_documents` de Potencias usan `'autorizacion'`.

**Fix aplicado:** mismo bloque ALTER que 3.3 extiende también esta constraint.

### 3.5 Clientes con CIF NULL se perdían

**Síntoma esperado en producción:** sin error, pero data loss silencioso. Un cliente con CIF NULL no se inserta en `empresas`, no se mapea, y todos sus supplies/expedientes/documentos quedan huérfanos en `_potencia_staging`.

**Causa:** las cláusulas `WHERE pg_temp.norm_cif(cif) IS NOT NULL` excluían a estos clientes de todos los pasos del 4a al 4d.

**Fix aplicado:** nueva sección **4e** en el script B que inserta clientes con CIF NULL como empresas propias (sin dedup, ya que NULL nunca se considera duplicado).

### 3.6 Mejoras a las normalizadoras (defensivas, no eran bug)

- **`norm_cif`**: ahora también elimina `/` (caso `B/12345678`).
- **`norm_nombre`**: 
  - Strips acentos (á → a, é → e, etc.) sin requerir extension `unaccent`.
  - Strips comas, paréntesis, guiones.
  - Reconoce sufijos societarios completos: `SAU`, `SLU`, `SCOOP`, `SCP`, `SCL`, `SA`, `SL` al final del string.
- **`norm_cups`**: sin cambios (la lógica original es correcta — el suffix CUPS es semánticamente significativo).

## 4. Rollback de emergencia

### 4.1 Si el dry-run falla (paso 8 o 9)

- La transacción hace ROLLBACK automático (todo en `BEGIN…ROLLBACK`).
- Prod queda **intacta**. No hace falta restore.
- El schema `_potencia_staging` sigue cargado con datos de Potencias. Para limpiarlo:
  ```sql
  DROP SCHEMA _potencia_staging CASCADE;
  ```

### 4.2 Si el COMMIT del paso 11 falla a mitad

- Si la transacción del script `b` aborta limpiamente → ROLLBACK automático, prod intacta.
- Si quedó parcialmente commiteado (improbable, está toda en `begin;…commit;`) → restaura desde el backup del paso 3:
  ```powershell
  psql "$crmConn" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
  psql "$crmConn" -f "$env:USERPROFILE\valere-backups\crm_pre_fase2_<timestamp>.sql"
  ```

### 4.3 Si descubres un problema horas/días después

- Mantén los backups del paso 3 al menos 1 mes.
- El proyecto Potencias sigue intacto durante toda la fase 2 (no se toca).
- Restore CRM:
  ```powershell
  $env:PGPASSWORD_CRM = "<password>"
  psql "postgresql://postgres.gtphkowfcuiqbvfkwjxb:$env:PGPASSWORD_CRM@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" `
    -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
  psql "postgresql://postgres.gtphkowfcuiqbvfkwjxb:$env:PGPASSWORD_CRM@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" `
    -f "$env:USERPROFILE\valere-backups\crm_pre_fase2_<timestamp>.sql"
  ```
- Tras restore: re-aplicar Fase 1 si fue parte del backup eliminado, luego Fase 2.

## 5. Troubleshooting

### 5.1 `pg_dump: error: server version mismatch`

**Causa:** estás usando un cliente Postgres más antiguo que la versión del server (17.6).

**Solución:** descarga PostgreSQL 17.x cliente tools y asegúrate de que está primero en el `PATH`:
```powershell
$env:PATH = 'C:\Program Files\PostgreSQL\17\bin;' + $env:PATH
pg_dump --version  # debe mostrar 17.x
```

### 5.2 `psql: error: connection to server … failed: password authentication failed`

**Causa:** password incorrecto o connection string mal formada.

**Solución:**
- Verifica que copiaste el password sin espacios al inicio/final.
- Usa el username del pooler (`postgres.<project_ref>`), no `postgres` solo.
- Usa `aws-0-<region>.pooler.supabase.com:5432`, no el host directo.

### 5.3 `psql: error: connection to server … failed: timeout expired`

**Causa:** firewall corporativo bloqueando 5432, o Supabase pooler caído.

**Solución:**
- Comprueba conectividad: `Test-NetConnection aws-0-eu-west-1.pooler.supabase.com -Port 5432`.
- Si el firewall bloquea, usa el direct connection string (puerto 6543) o cambia a una red sin restricciones.
- Verifica status: https://status.supabase.com/

### 5.4 `ERROR: duplicate key value violates unique constraint "empresas_pkey"`

**Causa:** ejecutaste el script B 2 veces seguidas sin haber rolled back. El primero ya creó las empresas con sus UUIDs.

**Solución:**
- Si fue dry-run, no afecta prod. Re-ejecuta el script B desde cero.
- Si fue post-COMMIT, revisa el script — los `WHERE NOT EXISTS` deberían prevenir duplicados; si no lo hicieron es porque las tablas `_migration_*_map` quedaron sucias.
- Limpia y re-empieza:
  ```sql
  DROP TABLE IF EXISTS _migration_user_map, _migration_empresa_map, _migration_cups_map,
                       _migration_comercializadora_map, _migration_expediente_map,
                       _migration_ciclo_map, _migration_request_map;
  ```

### 5.5 Encoding raro en el dump (caracteres `é` aparecen como `Ã©`)

**Causa:** PowerShell usó UTF-16 BOM al escribir el archivo reescrito.

**Solución:** el script ya usa `-Encoding UTF8` explícito. Si aún ves problemas, verifica:
```powershell
[System.Text.Encoding]::Default  # debe ser UTF-8 en PowerShell 7+
```

### 5.6 Pool de conexiones agotado a mitad de ejecución

**Causa:** El plan free de Supabase limita 60 conexiones concurrentes en el pooler.

**Solución:**
- Cierra otras herramientas que conecten al CRM (Cowork, Claude Code, Studio).
- Ejecuta el runbook fuera de horario laboral.

## 6. Anexo: log esperado del dry-run paso 9

Estos son los counts que debe arrojar la verificación dry-run (con CRM en estado pre-Fase2: 3 empresas, 1 cups, 6 comercializadoras, 29 precios_regulados, 3 user_profiles, 0 todo lo demás):

| ord | section | metric                       | value | desde_potencias |
|-----|---------|------------------------------|-------|-----------------|
| 1   | count   | empresas                     | 25    | 24              |
| 2   | count   | cups                         | 73    | 73              |
| 3   | count   | comercializadoras            | 7     | 1               |
| 4   | count   | precios_regulados            | 47    | 18              |
| 5   | count   | expedientes                  | 41    | 41              |
| 6   | count   | ciclos                       | 41    | 41              |
| 7   | count   | solicitudes                  | 41    | 41              |
| 8   | count   | savings                      | 41    | 0               |
| 9   | count   | comunic                      | 31    | 31              |
| 10  | count   | documentos                   | 98    | 0               |
| 11  | count   | com_docs                     | 1     | 1               |
| 12  | count   | status_log                   | 91    | 91              |
| 13  | count   | emails                       | 2     | 0               |
| 14  | count   | users                        | 3     | 1               |
| 20  | map     | empresa_map                  | 30    | 8 fusionada     |
| 21  | map     | cups_map                     | 75    | 3 fusionada     |
| 22  | map     | comercializadora_map         | 2     | —               |
| 23  | map     | user_map                     | 1     | —               |
| 24  | map     | expediente_map               | 41    | —               |
| 25  | map     | ciclo_map                    | 41    | —               |
| 26  | map     | request_map                  | 41    | —               |
| 30-38 | orphan | (todos)                     | 0     | —               |
| 40-41 | dup    | (todos)                     | 0     | —               |
| 50-51 | coh    | (todos)                     | 0     | —               |

> **Nota sobre los 24 vs 30 en empresa_map:** las 30 entradas del map cubren los 30 clients de Potencias. De ellas, 8 son `fusionada=true`: 2 fusiones con CRM existente (CIFs `G12345678` y `B98765432`) más 6 internal duplicates (los "perdedores" de los 5 grupos de CIFs duplicados — 11 rows totales en grupos, 5 winners + 6 losers). Las 22 restantes son fresh inserts (16 fresh + 5 winners de dup groups + 1 NULL CIF — wait: 16 fresh + 5 dup-winners + 1 NULL CIF = 22. Plus 2 fusionadas y 6 duplicate-losers = 30 total.).

> **24 desde_potencias en empresas:** las 22 nuevas + 2 que se "fusionaron con" empresas CRM existentes (las 2 empresas CRM ahora tienen `legacy_potencia_id` poblado).

---

## MD5 del runbook

```text
917bda932c4a341ef96894be18cff0c0  RUNBOOK_FASE2.ps1
```

Verifica en Windows con:
```powershell
Get-FileHash -Algorithm MD5 .\RUNBOOK_FASE2.ps1
```
