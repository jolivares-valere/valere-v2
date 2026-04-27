# Handoff — sprint-domingo-lane-X-fase2-prep

**Fecha:** 2026-04-26
**Sprint:** Extender preparación de Fase 2 datos (lane disjunto, paralelo a otros 2 lanes domingo)
**Estado:** ✅ COMPLETADO — sin bloqueos para Juan

## Qué se hizo

### 1. Dry-run end-to-end de Fase 2 vía MCP Supabase

Validado contra **prod CRM** (proyecto `gtphkowfcuiqbvfkwjxb`) en `BEGIN…ROLLBACK` con datos sintéticos representativos:
- 30 clients (24 CIFs únicos, 6 internal duplicates, 2 fusiones con CRM existente, 1 NULL CIF)
- 75 supplies (72 CUPS únicos, 3 internal dups, 1 fusión con CRM)
- 4 profiles (1 matchea CRM)
- 2 comercializadoras (1 fusión con `Iberdrola`, 1 nueva con suffix `SAU`)
- 18 regulated_rates, 41 expedientes/ciclos/solicitudes/savings, 31 comunicaciones, 98 documentos (70+27+1), 1 com_doc, 91 status_log, 2 email_templates
- **Total: ~408 filas de mainstream + edge cases**

**Edge cases probados:**
- CIF con guion (`B-12345678`), espacios (`B 12 345 678`), puntos (`B.12.345.678`), slash (`B/12345678`), mayúsculas/minúsculas
- CUPS con espacios (`es 0031 405194381009JF0F`)
- Nombres con acentos (`Industrias Valeré S.L.`), comas (`IBERDROLA, S.A.`), suffix completo (`Cooperativa Eléctrica SCOOP`)
- CIFs que matchean CRM existente (`G12345678`, `B98765432`)
- CUPS que matchean CRM existente (`ES0031405194381009JF0F`)
- Comercializadora con suffix (`Energía Test SAU`)

**Resultado del dry-run:**
- Counts cuadran con expectativas
- 0 orphans en todos los FK checks (cups, expedientes, ciclos, solicitudes, savings, documentos)
- 0 duplicados normalizados (CIF, CUPS)
- 0 incoherencias (cups.empresa_id == expediente.empresa_id == solicitud.empresa_id)

### 2. Bugs reales encontrados y corregidos

5 problemas en los scripts originales. Todos arreglados en `scripts/unificacion_fase2_b_dedupe_y_transform.sql` (sin tocar `supabase/migrations/`):

1. **`comercializadoras.notas` → `notes`**: la columna del CRM se llama `notes` (legado retailers). El INSERT habría fallado con `column does not exist`.
2. **`precios_regulados_boe.tariff` NOT NULL**: el script solo populaba `tariff_type`. Ahora populates ambas columnas redundantes.
3. **`documentos.entidad_tipo` CHECK constraint**: solo permitía `empresa/contrato/oportunidad/contacto`. El transform necesita `expediente` y `general`. Ahora el script B ejecuta `ALTER TABLE … DROP CONSTRAINT … ADD CONSTRAINT` con la lista extendida.
4. **`documentos.tipo` CHECK constraint**: solo permitía `contrato/factura/documentacion/otro`. Los expediente_documents usan `autorizacion`. Mismo bloque ALTER lo extiende.
5. **Clientes con CIF NULL**: sección 4e nueva — los inserta como empresas propias (sin dedup) en vez de perderlos silenciosamente.

### 3. Mejoras a las normalizadoras

- `norm_cif` ahora elimina también `/`.
- `norm_nombre` ahora:
  - Elimina acentos vía `TRANSLATE()` (sin requerir extension `unaccent`).
  - Elimina comas, paréntesis, guiones.
  - Soporta sufijos completos: `SAU/SLU/SCOOP/SCP/SCL/SA/SL` al final del string.

Validado con 22 casos de test independientes — todos pasan.

### 4. RUNBOOK_FASE2.ps1 generado

`C:\Users\joliv\valere-v2\RUNBOOK_FASE2.ps1` — script PowerShell de 279 líneas, sin helpers custom, solo `pg_dump`/`psql`/cmdlets nativos. Compatible PS 5.1.

**MD5:** `917bda932c4a341ef96894be18cff0c0`

12 pasos con pausas explicativas:
1. Verificación entorno (pg_dump/psql en PATH)
2. Solicitar passwords (SecureString)
3. Verificar conexiones (`SELECT 1`)
4. Backups previos de los 2 proyectos
5. Crear schema staging
6. Dump data-only de Potencias
7. Reescribir `public.` → `_potencia_staging.`
8. Cargar dump en staging
9. **DRY-RUN del transform** (script B con `commit;` reemplazado por `rollback;`)
10. Repetir dry-run + verificación combinada
11. **Confirmación COMMIT** (usuario debe escribir `COMMIT`)
12. Aplicar transform definitivo
13. Verificación final

### 5. Documentación

`docs/SUPABASE_FASE2_RUNBOOK_2026-04-26.md` con:
- Prerequisitos
- Resumen de los 12 pasos
- Detalle de cada bug encontrado y su fix
- Comandos de rollback de emergencia
- Troubleshooting de los 6 errores más probables (auth fail, network timeout, version mismatch, encoding, etc.)
- Anexo con log esperado del dry-run paso 9

## One-liner para Juan

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\joliv\valere-v2\RUNBOOK_FASE2.ps1"
```

Verifica integridad del runbook antes de ejecutar:

```powershell
Get-FileHash -Algorithm MD5 .\RUNBOOK_FASE2.ps1
# Esperado: 917bda932c4a341ef96894be18cff0c0
```

## Restricciones respetadas

- ✅ NO se tocó `supabase/migrations/`
- ✅ NO se tocó `src/`
- ✅ NO se tocó `docs/help/`
- ✅ NO se tocó `RUNBOOK.ps1` (creado `RUNBOOK_FASE2.ps1` aparte)
- ✅ NO commits — todo queda como changes en working tree
- ✅ NO operaciones destructivas en prod — todo dry-run con BEGIN…ROLLBACK
- ✅ Coordinación lane disjunto con otros 2 sprints paralelos

## Archivos modificados

- `scripts/unificacion_fase2_b_dedupe_y_transform.sql` — 5 bugs corregidos + normalizadoras v2
- `scripts/unificacion_fase2_c_verificacion.sql` — normalizadoras v2 alineadas

## Archivos creados

- `RUNBOOK_FASE2.ps1` (279 líneas, MD5 `917bda932c4a341ef96894be18cff0c0`)
- `docs/SUPABASE_FASE2_RUNBOOK_2026-04-26.md`
- `.cowork/outbox/2026-04-26T11-30-00-sprint-domingo-lane-X-fase2-prep.md` (este archivo)
- (Outputs Cowork — temporales) `outputs/fase2_dryrun/dryrun.sql`, `dryrun_data.sql`, `dryrun_transform.sql`, `full_dryrun.sql`

## Bloqueos para Juan

**Ninguno técnico.** Todo está listo para ejecutar. Los pasos manuales de Juan:

1. Recuperar passwords de pooler en el Dashboard de los 2 proyectos
2. Verificar que `pg_dump`/`psql` 17.x está en `PATH`
3. Ejecutar el one-liner
4. Pulsar ENTER en cada pausa tras leer la instrucción
5. Escribir `COMMIT` en el paso 10 cuando esté seguro

Tiempo estimado total: 30-45 min (pausas humanas incluidas).

## Sugerencias para Cowork al re-abrir

- Antes de ejecutar Fase 2 en prod, **comitear los fixes** de `scripts/unificacion_fase2_b_dedupe_y_transform.sql` y `unificacion_fase2_c_verificacion.sql` (Cowork no puede commitear desde sandbox por permisos `.git/`, requiere PowerShell de Juan).
- El runbook depende de que estos archivos estén actualizados en el filesystem cuando Juan ejecute. Si Juan ejecuta antes del commit, los archivos ya tienen los fixes (Edit los aplicó in-place).
- Una **migración 1.5** opcional puede mover los `ALTER TABLE … CHECK` del script B a `supabase/migrations/` para mantener la convención.
