# Conector FV Sync — Valere CRM

Script Python para sincronización diaria de datos de plantas fotovoltaicas
desde plataformas de monitorización (FusionSolar) hacia Supabase.

## Arquitectura

```
GitHub Actions (cron 02:00 ES) → sync_job.py → FusionSolar → Supabase
```

## Configuración inicial

### 1. Generar la clave de cifrado

```bash
cd scripts/fv-sync
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python crypto.py generate
# → Nueva FV_ENCRYPTION_KEY: <base64 de 32 bytes>
```

Guarda esa clave en **1Password** (nunca en el repo).

### 2. Configurar secrets en GitHub

Ve a: `https://github.com/jolivares-valere/valere-v2/settings/secrets/actions`

| Secret | Valor |
|---|---|
| `SUPABASE_URL` | `https://gtphkowfcuiqbvfkwjxb.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service Role Key del proyecto Supabase |
| `FV_ENCRYPTION_KEY` | 1doMcEYZBiBnKo5npSgV1JGzDlBDYT0m0LSXBWyefts= |

### 3. Aplicar la migración SQL

En el Supabase Dashboard → SQL Editor:
```sql
-- Pegar el contenido de supabase/migrations/20260429_seguimiento_fv.sql
```

### 4. Añadir un cliente FV

Desde el panel admin de Valere CRM → pestaña "FV Credenciales" (en ficha de empresa).

O directamente via SQL (para el primer cliente):

```sql
-- 1. Cifrar la contraseña (en local):
python scripts/fv-sync/crypto.py  -- usa encrypt_password() en Python

-- 2. Insertar:
INSERT INTO fv_credenciales (empresa_id, plataforma, username, password_enc, region_url)
VALUES (
  '<uuid-empresa>',
  'fusionsolar',
  '<usuario-portal>',
  '<blob-cifrado>',
  'https://uni003eu5.fusionsolar.huawei.com'
);
```

## Ejecución manual (debug)

```bash
cd scripts/fv-sync
source .venv/bin/activate

# Dry-run (no escribe en BD):
FV_ENCRYPTION_KEY=<key> SUPABASE_URL=<url> SUPABASE_SERVICE_KEY=<skey> \
  python sync_job.py --dry-run

# Solo un cliente:
python sync_job.py --empresa <uuid-empresa>

# Todos los clientes:
python sync_job.py
```

## Flujo de sincronización

1. Lee `fv_credenciales` (activo=true) de Supabase.
2. Por cada credencial: login FusionSolar → descarga plantas, KPIs, dispositivos, alarmas.
3. Upsert idempotente en todas las tablas `fv_*`.
4. Escribe en `fv_sync_log` (OK/error, duración, número de plantas).
5. Exit code 0 = todo OK; Exit code 1 = algún cliente falló (GitHub Actions marcará job como rojo).

## Añadir una nueva plataforma (GoodWe, iSolarCloud, SMA...)

1. Crear `goodwe_client.py` implementando la clase abstracta `FusionSolarClient`.
2. Añadir el nuevo `plataforma` a la migración SQL y al `make_client()` en `fusionsolar_client.py`.
3. El resto del pipeline (`sync_job.py`, tablas, frontend) no cambia.

## Seguridad

- Las contraseñas se cifran con **AES-256-GCM** antes de insertarse en Supabase.
- La clave maestra (`FV_ENCRYPTION_KEY`) solo existe en GitHub Secrets y en 1Password.
- El script usa la **Service Role Key** de Supabase (salta RLS), por eso corre solo en CI/CD; el frontend usa la anon key con RLS activado.
- Nunca se loguea ninguna contraseña ni cookie en claro.
