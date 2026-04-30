# Sprint 3 — TSC pendiente tras migración lib Potencias

**Fecha:** 2026-04-30
**Rama:** `claude/sprint2-lib-potencias`
**Estado:** ~60 errores TSC. Código copiado y mapeado a nivel de tablas, pero pendientes refactors de columnas y dependencias.

## Contexto

Los 16 archivos copiados desde `musing-kalam` (Drive Desktop) al CRM tienen referencias a columnas del schema POT que en CRM se renombraron durante la integración `20260425_unificacion_potencias_aditiva.sql`.

Esta sesión hizo:
- ✅ Imports actualizados (`@/lib/*` → `@/core/*`).
- ✅ 12 nombres de tablas reemplazados (`clients→empresas`, `supplies→cups`, `power_requests→solicitudes_potencia`, etc.).
- ✅ Tipos `TariffType`, `PowerValues`, `RegulatedRate` añadidos a `entities.ts`.
- ✅ Reemplazos parciales (`client_id → empresa_id`, FKs de `clients_*_fkey → empresas_*_fkey`).
- ⚠️ **Pendiente sprint 4:** ajuste manual de columnas + dependencias.

## Errores TSC agrupados

### 🟢 Fáciles (~30 min)

#### 1. Dependencias npm faltantes (3 errores)
```bash
npm install @react-pdf/renderer pdf-lib
```
Afecta: `pdf-fill.ts`, `autorizacion-valere-pdf.tsx`, `presentacion-pdf.tsx`.

#### 2. `formatFecha` no exportado en `@/core/utils/dates` (2 errores)
Opciones:
- **A.** Añadir `formatFecha` a `src/core/utils/dates.ts`:
  ```ts
  export function formatFecha(d: string | Date | null | undefined): string {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  ```
- **B.** Reemplazar en imports: `formatFecha` → otra función ya existente (`formatDate`?).

#### 3. Parámetros lambda sin tipar (~6 errores TS7006)
Añadir `: any` o tipos específicos en:
- `pdf-fill.ts:65` parámetro `f`
- `presentacion-pdf.tsx:189-238` parámetros `e`, `s`, `i`

#### 4. `Uint8Array → BlobPart` (4 errores TS2322)
Cambiar:
```ts
new Blob([uint8Array], ...)
```
por:
```ts
new Blob([new Uint8Array(uint8Array)], ...)
```
o cast a `BlobPart`:
```ts
new Blob([uint8Array as unknown as BlobPart], ...)
```
Afecta: `GenerateAuthorizationDialog.tsx:176`, `GenerateGroupAuthValereDialog.tsx:198,212`, `SendPresentationDialog.tsx:129`.

#### 5. `generateEmailPresentacion` no exportado (1 error)
En `SendPresentationDialog.tsx:15` importa `generateEmailPresentacion` de `@/core/email/email-templates` pero la función no existe (probablemente quedó en un archivo anterior). Verificar el archivo `email-templates.ts` y o añadir la función o cambiar el caller a usar `generateEmailPresentacion` que sí esté exportado.

### 🟡 Media complejidad

#### 6. Schema `documentos` (5 errores)
Tabla CRM `documentos` usa columnas distintas que `client_documents` de POT:
| Código POT | CRM `documentos` |
|---|---|
| `client_id` | `empresa_id` (ya remapeado) |
| `storage_path` | `ruta_storage` |
| (no había) | `nombre_original` requerido en algunos casos |

Archivos afectados: `ClientDocuments.tsx`, `client-docs.ts`.

```bash
sed -i 's|storage_path:|ruta_storage:|g; s|"storage_path"|"ruta_storage"|g; s|\.storage_path|.ruta_storage|g' \
  src/features/potencias/components/shared/ClientDocuments.tsx \
  src/features/potencias/lib/client-docs.ts
```

#### 7. Schema `cups` (5 errores)
| Código POT | CRM `cups` |
|---|---|
| `cups` (columna) | `codigo_cups` |
| `tariff_type` | `tarifa_acceso` |

Archivos afectados: `MultiSupplyImportDialog.tsx`, `presentacion.ts`, `GenerateGroupAuthValereDialog.tsx`.

⚠️ **No usar sed simple para `cups` porque se confunde con la tabla**. Hacer reemplazos manuales puntuales:
- `select('cups, tariff_type, ...')` → `select('codigo_cups, tarifa_acceso, ...')`
- `.cups` (acceso a propiedad del row) → `.codigo_cups`
- Tipos `cups: string` → `codigo_cups: string`

#### 8. Schema `comercializadoras` (3 errores)
Tabla CRM tiene `name` (heredado) y `nombre_normalizado`. La query pide `nombre` que no existe.

Decisión: añadir alias en SELECT — `select('id, name as nombre').eq('activa', true)` o crear migración que añada columna `nombre` como alias.

Archivos afectados: `MultiSupplyImportDialog.tsx`.

### 🔴 Complejo — refactor extenso (1-2 horas)

#### 9. Schema `empresas` — 30+ errores
Tabla CRM `empresas` usa nomenclatura distinta que `clients` POT:

| `clients` (POT) | `empresas` (CRM) |
|---|---|
| `nombre_fiscal` | `nombre` |
| `cif` | `nif` |
| `direccion_fiscal` | `direccion` |
| `codigo_postal` | `cp` |
| `email_contacto` | `email_principal` |
| `asesor_id` | `comercial_id` |
| `gestor_id` | (NO EXISTE) — decidir: añadir columna o eliminar uso |

Archivos afectados:
- `presentacion.ts`
- `GenerateGroupAuthValereDialog.tsx` (mucho)
- `MultiSupplyImportDialog.tsx`
- `pdf-fill.ts` (USA `cliente.nombre_fiscal` como key de schema interno — NO cambiar ahí, es intencional)

⚠️ **Hacer archivo por archivo, NO con sed masivo** — `nombre_fiscal` puede aparecer en strings literales que NO son columnas BD (ej. labels de UI).

#### 10. `gestor_id` — decisión de schema
La columna no existe en `empresas` del CRM. Opciones:
- **A.** Añadir migration que crea `empresas.gestor_id uuid REFERENCES user_profiles(id)`.
- **B.** Reusar `comercial_id` para ambos roles (asesor y gestor).
- **C.** Eliminar funcionalidad de "gestor" del módulo Potencias del CRM.

Recomendado: **A** (añadir columna).

## Plan Sprint 4 (próxima sesión)

1. **Fase A — Fáciles** (30 min): instalar dependencias npm + añadir `formatFecha` + casts Blob + tipar lambdas + arreglar export `generateEmailPresentacion`.
2. **Fase B — Schema documentos** (15 min): sed `storage_path → ruta_storage` en 2 archivos.
3. **Fase C — Schema cups + comercializadoras** (30 min): manual, archivo por archivo.
4. **Fase D — Schema empresas** (1 hora): manual, archivo por archivo. Decidir destino de `gestor_id`.
5. **Fase E — Verificar TSC = 0** + commit + PR.

## Riesgo si NO se completa
El módulo Potencias del CRM (que ya está deployado en producción) **funciona parcialmente sin estos archivos**. Las acciones críticas que NO funcionan hoy en producción:
- Generar autorización PDF
- Subir autorización firmada
- Enviar presentación al cliente
- Importar Excel multisuministros
- Cálculo de ahorros automático

Hasta cerrar Sprint 4, **mantener la app `valere-gestion-potencias.vercel.app` activa** como fallback funcional.
