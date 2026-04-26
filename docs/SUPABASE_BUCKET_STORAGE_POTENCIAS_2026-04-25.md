# Impacto del bucket `documents` (Potencias) en la unificación

> Sprint paralelo A (backend) — 2026-04-25 noche.
> Riesgo identificado en `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` §Riesgos.
> Análisis técnico + 3 opciones evaluadas.

---

## TL;DR

Tras la Fase 2, las filas en `client_documents`/`expediente_documents`/`documentacion`/`comercializadora_docs` apuntan a **archivos físicos que viven en el proyecto Supabase de Potencias** (`alesfvxqtwlrwlmkoosg`). Mientras ese proyecto exista, las URLs siguen funcionando. **Pausar/borrar el proyecto Potencias rompe el acceso a los PDFs**.

Volumen real (medido vía MCP, 2026-04-25):

| Bucket Potencias | Objetos | Tamaño | Uso |
|---|---|---|---|
| `documents` | 71 (70 + 1 test) | 2,2 MB | client_documents (PDFs y HTML facturas/estudios) |
| `expediente-docs` | 29 | 13 MB | expediente_documents (PDFs autorizaciones, comunicaciones distribuidora) |
| **Total** | **100** | **~15 MB** | — |

CRM destino: bucket `documentos` (file_size_limit 50 MB, privado, 0 objetos hoy).

**Recomendación**: **Opción A (copia 1:1)** — coste casi nulo, descarta cualquier dependencia cruzada, y desbloquea Fase 5.C (pausar proyecto Potencias) sin riesgo.

---

## 1) Estado actual del schema

Mientras la Fase 2 no haya corrido, las tablas CRM relevantes están vacías:

```sql
select 'documentos' as t, count(*) from public.documentos
union all select 'storage.objects(documentos bucket)', count(*) 
from storage.objects where bucket_id='documentos';
-- → 0 / 0
```

En Potencias, las tablas y storage tienen los datos:

| Tabla origen | Filas con `storage_path` | Bucket apuntado |
|---|---|---|
| `client_documents` | 70 | `documents` (subpath `client-docs/<empresa_uuid>/...`) |
| `expediente_documents` | 27 | `expediente-docs` (subpath `<expediente_uuid>/<file>.pdf`) |
| `documentacion` | 1 | `documents` |
| `comercializadora_docs` | 1 | (probablemente bucket dedicado, verificar antes de migración) |

Después de la Fase 2 (data import), los 99 registros aterrizarán en `public.documentos` con sus `ruta_storage` apuntando a paths que **NO existen** en el bucket CRM `documentos`.

## 2) Tres opciones evaluadas

### Opción A — Copia 1:1 al CRM (recomendada)

**Idea**: copiar los 100 objetos físicos de los buckets de Potencias al bucket `documentos` del CRM, preservando paths. Las filas ya migradas en Fase 2 funcionan tal cual.

**Pasos**:

1. Generar listado de objetos a copiar (vía SQL en Potencias):
   ```sql
   select bucket_id, name, (metadata->>'mimetype') as mime,
          (metadata->>'size')::bigint as bytes
   from storage.objects
   where bucket_id in ('documents','expediente-docs')
   order by bucket_id, name;
   ```

2. Script PowerShell o Node con dos clientes Supabase (Potencias service_role + CRM service_role):
   ```typescript
   // pseudocódigo
   for (const obj of objectsToCopy) {
     const data = await potenciasClient.storage
       .from(obj.bucket_id).download(obj.name);
     // Re-mapear bucket_id origen → bucket destino:
     //   - documents      → documentos (con prefijo "client-docs/" o "general/" según legacy)
     //   - expediente-docs → documentos (con prefijo "expediente-docs/")
     const destPath = remapPath(obj.bucket_id, obj.name);
     await crmClient.storage.from('documentos')
       .upload(destPath, await data.arrayBuffer(), { upsert: true });
     // Actualizar ruta_storage en CRM tras subida:
     await crmClient.from('documentos')
       .update({ ruta_storage: destPath })
       .eq('legacy_potencia_id', obj.legacy_id);
   }
   ```

3. Verificación post-copia:
   ```sql
   select count(*) from storage.objects where bucket_id='documentos';
   -- → debe coincidir con count en BD (100 filas con ruta_storage)
   ```

**Coste**:
- 15 MB transferencia entre 2 cuentas Supabase free tier (transfer egress: 2 GB/mes — sobrado).
- Tiempo: 5-10 min de script.
- Cero downtime de la app: durante la copia las apps siguen leyendo del proyecto antiguo, y el cutover Fase 4 recoge ya las URLs del CRM.

**Pros**:
- ✅ Auto-contenido: tras la copia, CRM no depende de Potencias.
- ✅ Permite pausar/borrar proyecto Potencias sin riesgo.
- ✅ Backup natural: los originales siguen en Potencias hasta que Juan pulse "delete".
- ✅ Las RLS policies del bucket destino (CRM) se aplican uniformemente.

**Contras**:
- Hace falta un script/job. Estimación: 1 hora trabajo de Juan o Cowork.
- Re-mapear paths al subir (no son rutas simples — incluyen `client-docs/<empresa_uuid>` y `<expediente_uuid>/`); requiere un transform del path durante la copia.

### Opción B — CDN compartida / proxy

**Idea**: dejar los archivos en Potencias y servirlos desde el CRM vía Edge Function que actúa como proxy (firma URL en Potencias, devuelve al cliente).

**Pasos**:
1. Crear Edge Function `proxy-document` en CRM que recibe `(legacy_storage_path)` y devuelve un signed URL del proyecto Potencias.
2. FE del CRM, al cargar `documentos`, llama esta Edge Function en lugar de llamar a `storage.from(...).createSignedUrl()` directo.
3. Cron/scheduled task: refrescar tokens de servicio Potencias.

**Pros**:
- ✅ Cero copia de datos — siempre se sirve desde el origen.
- ✅ Si un día Potencias queda como "archivo", se mantiene intacto.

**Contras**:
- ❌ **Bloquea Fase 5.C indefinidamente** (no se puede pausar Potencias).
- ❌ Service-role keys cross-project → acoplamiento operativo y de seguridad.
- ❌ Latencia adicional (proxy hop) en cada `download`.
- ❌ Free tier de Potencias: transfer 2 GB/mes — si los usuarios descargan PDFs, el límite puede saltar.
- ❌ Complejidad operativa: 2 proyectos vivos para siempre.

**Veredicto**: descartada salvo que Juan tenga un motivo regulatorio para no mover los archivos (no parece el caso).

### Opción C — Dual-read durante transición + copia diferida

**Idea**: durante 4 semanas, FE del CRM intenta primero el bucket CRM, y si falla (404), recae al bucket Potencias. Mientras tanto, un job en background copia los objetos. Cuando todos copiados, dropear el fallback.

**Pasos**:
1. Wrap en `src/core/utils/storage.ts` que prueba CRM primero, Potencias después.
2. Background job (Edge Function programada) que cada hora copia los pendientes.
3. Tras 4 semanas o "todos copiados", quitar el fallback.

**Pros**:
- ✅ Zero downtime, zero blocking en cutover.
- ✅ Migración progresiva.

**Contras**:
- ❌ FE más complejo (3 archivos `src/` adicionales).
- ❌ Service-role cross-project (igual que Opción B mientras dure).
- ❌ Sobre-engineering: 100 archivos de 15 MB no justifica un dual-read.

**Veredicto**: descartada por complejidad desproporcionada al volumen real.

---

## 3) Comparativa resumida

| Criterio | A (copia 1:1) | B (proxy) | C (dual-read) |
|---|---|---|---|
| Tiempo de implementación | 1-2 h | 4-6 h | 1-2 días |
| Downtime de app | 0 | 0 | 0 |
| Permite pausar Potencias en Fase 5.C | ✅ | ❌ | ✅ tras 4 sem |
| Service-role cross-project | una sola vez | permanente | temporal |
| Cambios en FE | 0 | sí | sí |
| Riesgo de pérdida | bajo (originales hasta delete) | bajo | bajo |
| Complejidad operativa post-cierre | nula | alta | media |
| **Recomendación** | ✅ **Adoptar** | descartar | descartar |

## 4) Plan detallado para Opción A

### 4.A — Decisiones de mapeo de paths

Subpaths del bucket destino `documentos` del CRM:

```
documentos/
├── client-docs/<empresa_uuid>/<file>     ← copiados de Potencias::documents
├── expediente-docs/<expediente_uuid>/<file> ← copiados de Potencias::expediente-docs
├── general/<file>                         ← copiados de Potencias::documents (los que no son client-docs)
└── comercializadoras/<file>               ← copiados de Potencias::?? (verificar)
```

Equivalente para la columna `ruta_storage`:

| Tabla CRM | entidad_tipo | ruta_storage post-migración |
|---|---|---|
| `documentos` (consolidada) | empresa | `client-docs/<empresa_uuid>/<file>` |
| | expediente | `expediente-docs/<expediente_uuid>/<file>` |
| | general | `general/<file>` |
| | comercializadora | `comercializadoras/<file>` |

(Para el caso `comercializadora_docs`, conservar tabla dedicada — solo 1 fila, no necesita refactor polimórfico.)

### 4.B — Script de copia (esquema)

```typescript
// scripts/migrate_storage_potencias_to_crm.ts
import { createClient } from '@supabase/supabase-js';

const SRC = createClient(POTENCIAS_URL, POTENCIAS_SERVICE_ROLE);
const DST = createClient(CRM_URL, CRM_SERVICE_ROLE);

async function copyOne(srcBucket: string, srcPath: string,
                      dstBucket: string, dstPath: string) {
  const { data: blob, error: dlErr } = await SRC.storage.from(srcBucket).download(srcPath);
  if (dlErr) throw dlErr;
  const { error: upErr } = await DST.storage.from(dstBucket)
    .upload(dstPath, blob!, { upsert: true,
                              contentType: blob!.type,
                              cacheControl: '3600' });
  if (upErr) throw upErr;
}

async function main() {
  // 1) Copia documents/* → documentos/client-docs/* o documentos/general/*
  const { data: docs } = await SRC.storage.from('documents').list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
  for (const obj of docs ?? []) {
    const isClientDoc = obj.name.startsWith('client-docs/');
    const dstPath = isClientDoc ? obj.name : `general/${obj.name}`;
    await copyOne('documents', obj.name, 'documentos', dstPath);
  }

  // 2) Copia expediente-docs/* → documentos/expediente-docs/*
  const { data: exps } = await SRC.storage.from('expediente-docs').list('', { limit: 1000 });
  for (const obj of exps ?? []) {
    const dstPath = `expediente-docs/${obj.name}`;
    await copyOne('expediente-docs', obj.name, 'documentos', dstPath);
  }

  console.log('Done');
}
main();
```

### 4.C — Update SQL post-copia

Tras la Fase 2 que aterriza las filas en CRM con `ruta_storage` heredada de Potencias, ejecutar un solo UPDATE para reescribir las rutas:

```sql
-- Para client_documents (ya en documentos canónico tras Fase 2):
update public.documentos
set ruta_storage = ruta_storage  -- ya viene como 'client-docs/...' → no cambia
where entidad_tipo = 'empresa'
  and ruta_storage like 'client-docs/%';

-- Para expediente_documents (rutas como '<uuid>/<file>'):
update public.documentos
set ruta_storage = 'expediente-docs/' || ruta_storage
where entidad_tipo = 'expediente'
  and ruta_storage not like 'expediente-docs/%';

-- Para documentacion general:
update public.documentos
set ruta_storage = 'general/' || ruta_storage
where entidad_tipo = 'general'
  and ruta_storage not like 'general/%';
```

(Estos UPDATE pueden ir en `scripts/unificacion_fase2_d_storage_paths.sql` para encadenar tras Fase 2.)

### 4.D — Verificación

```sql
-- 1) Cada documento en BD tiene su objeto en CRM
select d.id, d.ruta_storage, o.name
from public.documentos d
left join storage.objects o
  on o.bucket_id='documentos' and o.name = d.ruta_storage
where d.deleted_at is null
  and o.name is null;
-- → debe devolver 0 filas (todos los documentos tienen su objeto)

-- 2) Counts cuadran
select count(*) from public.documentos where deleted_at is null;
select count(*) from storage.objects where bucket_id='documentos';
-- → diff <= 1 (el "test/" de Potencias se puede dropear)
```

## 5) Coordinación con Fase 2

La copia de objetos puede hacerse **antes, durante o después** de Fase 2, pero el orden recomendado es:

```
1. Backup Potencias (Juan, pg_dump + storage export opcional)
2. Aplicar Fase 2 SQL: tablas pobladas con ruta_storage de Potencias.
3. Correr script de copia 4.B (~10 min).
4. Correr SQL update 4.C (1 segundo).
5. Verificar 4.D (1 segundo).
6. Smoke test app: abrir un documento desde el CRM → debe descargar correctamente.
7. Una semana más tarde, Fase 5.C: pausar proyecto Potencias.
```

## 6) Coste y riesgo

- **Coste**: 0 € (free tier alcanza), 1-2 h de Juan o Cowork (si Cowork tiene service-role keys de los 2 proyectos).
- **Riesgo de pérdida**: bajo. Originales en Potencias siguen vivos hasta que Juan los borre conscientemente. Recomendado mantener Potencias en estado `paused` 1 mes antes de `delete`.
- **Compatibilidad cross-project**: el script usa el SDK estándar de Supabase con dos clientes — funciona sin Pro plan.

## 7) Bloqueante / desbloqueante

- **Sin esta migración**: Fase 5.C (pausar Potencias) bloqueada indefinidamente. Cuenta Supabase de Potencias sigue contando aunque no se use.
- **Con esta migración**: Fase 5.C pasa a "1 click en dashboard". CRM 100% auto-suficiente.

## 8) Recomendación final

Adoptar **Opción A**, programar el script de copia inmediatamente después de Fase 2, ejecutar 4.D para validar, y dejar el proyecto Potencias en estado `paused` durante el mes posterior antes de eliminarlo. Esto da margen de rollback amplio sin complicar la arquitectura.
