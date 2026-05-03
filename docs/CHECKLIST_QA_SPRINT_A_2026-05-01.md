# Checklist QA manual Sprint A — antes de commit (1 mayo 2026)

> Antes de commitear los 29 archivos del Sprint A aplicado autónomamente hoy, validar manualmente las 5 cosas tocadas. Si alguna falla, NO commitear hasta corregir. ChatGPT recomendó esto explícitamente y es la condición previa al merge.

---

## Pre-requisitos (PowerShell Windows)

```powershell
cd C:\Users\joliv\valere-v2

# 1. Verificar que estamos en la rama correcta
git branch --show-current
# Debería ser: claude/sprint2-lib-potencias  (o donde esté el WIP)

# 2. Instalar dependencia nueva
npm install
# Verifica que aparece @sentry/react@^10.x.x en node_modules

# 3. Verificar TSC = 0
npx tsc --noEmit
# Si hay errores, NO continuar — hay que cerrarlos primero
# (separados de los ~60 del sprint Potencias)

# 4. Tests deben pasar
npm test -- --run
# 33 tests deben pasar como antes

# 5. Lanzar dev server
npm run dev
# Abrir http://localhost:3000
```

Si cualquiera de los pasos 1-5 falla → para, debug, no continuar al QA visual.

---

## Datos de entrada para las pruebas

Los siguientes datos ayudan a validar los flujos. Sustituir por datos reales de tu entorno.

```
Login:           jolivares@valereconsultores.com
Empresa test:    una de las 24 existentes
CUPS test:       un CUPS de los 72 existentes (preferiblemente vinculado a empresa)
Contacto test:   crear uno nuevo
```

---

## Test 1 — Importes en Kanban Oportunidades (FASE 30.4)

**Ruta:** `http://localhost:3000/oportunidades`

**Estado actual BD:** 4 oportunidades — 3 `cerrada_ganada` + 1 `contactado`.

**Pasos:**

1. Navegar a `/oportunidades`. Debería aparecer la vista Kanban.
2. Identificar la oportunidad en etapa `contactado` (esa es la que tiene posibilidad de tener importes legacy).
3. Click en esa oportunidad → abrir modal/panel de edición.
4. Si tiene `valor_estimado_eur` o `ahorro_anual_estimado` rellenos: cerrar modal → verificar que aparecen en la card del Kanban.
5. Si NO tiene importes: editarla, poner `valor_estimado_eur=10000` y `ahorro_anual_estimado=2000`, guardar.

**Esperado:**
- Card muestra el valor en EUR (formato español, ej: "10.000 €") en negrita debajo del tipo.
- Card muestra "Ahorro: 2.000 €/año" en badge verde-emerald.
- Header de la columna `contactado` suma esos importes.

**Si falla:**
- Verificar que `OportunidadConEmpresa` incluye los campos.
- Verificar que el query `useOportunidades` los trae (`select '*'`).
- Verificar el componente `KanbanCard.tsx` líneas 46-55.

✅ / ❌  Resultado: _________________

---

## Test 2 — Wizard contacto decisor en alta empresa (FASE 30.5)

**Ruta:** `http://localhost:3000/empresas`

**Pasos:**

1. Click "Nueva empresa" arriba derecha.
2. **Esperado**: aparece formulario inline con título "Paso 1: Datos de la empresa".
3. Rellenar mínimo: nombre = "QA Test SL", NIF = "B12345678".
4. Click guardar.
5. **Esperado**: aparece modal centrado con título "Paso 2: Primer contacto" y un mensaje "Por favor, añade al menos un contacto decisor para QA Test SL...".
6. El form de contacto debe tener `es_decisor` ya marcado (checkbox activo).
7. Rellenar: nombre = "Juan Test", apellidos = "QA", email = "qa@test.es".
8. Click guardar.
9. **Esperado**: toast verde "Empresa creada con contacto decisor", modal se cierra, vuelve a lista de empresas con QA Test SL en primera fila.

**Test alternativo — flow "salir sin contacto":**

10. Crear otra empresa "QA Test 2 SL".
11. En el paso 2 (modal contacto), pulsar la X de cerrar.
12. **Esperado**: aparece ConfirmDialog "¿Seguro que quieres crear la empresa sin un contacto decisor?".
13. Click "Volver" → vuelve al modal de contacto.
14. Cerrar de nuevo → click "Crear sin contacto".
15. **Esperado**: toast warning "Empresa creada sin contacto decisor...", modal cierra, empresa creada en lista.

**Si falla:**
- Si no aparece el paso 2: verificar `useCreateEmpresa.mutateAsync` devuelve la empresa creada.
- Si el ConfirmDialog no aparece: verificar import correcto.
- Si `es_decisor` no se pre-marca: verificar prop `defaultValues` en ContactoForm.

⚠️ **IMPORTANTE:** este wizard se aplica solo en CREATE. Editar una empresa existente NO debe disparar el wizard. Probar también:

16. Click en QA Test SL → entrar al detalle → editar campo cualquiera → guardar → NO debe aparecer paso 2.

**Validación adicional con Carolina/equipo (15 minutos):**

17. Mostrar el flow nuevo a quien vaya a usar el alta de empresas.
18. Pregunta clave: "¿es razonable este paso 2 obligatorio o te frena más de lo que aporta?".
19. Si la respuesta es "me frena demasiado", iterar antes de commit (quizás hacer el paso 2 opcional con sugerencia visual fuerte en lugar de modal bloqueante).

✅ / ❌  Resultado: _________________

---

## Test 3 — Asociar suministro Datadis a empresa (FASE 30.6)

**Ruta:** `http://localhost:3000/datadis`

**Pasos:**

1. Login en Datadis y bajar la lista de suministros (si no hay sesión activa).
2. **Esperado**: lista de 14 suministros del cliente CHEMTROL aparece en tabla.
3. En cualquier fila, debe aparecer un nuevo botón "Asociar" (icono Link2) en la última columna.
4. Click "Asociar" en una fila concreta.
5. **Esperado**: se abre modal "Asociar suministro a empresa" con búsqueda.
6. Escribir las primeras letras de una empresa existente (ej "CHEM" si CHEMTROL está en BD, o cualquier otra de las 24).
7. **Esperado**: tras debounce 250ms, aparecen resultados.
8. Click sobre la empresa.
9. Click "Asociar" en el modal.
10. **Esperado**: toast verde "Suministro asociado correctamente". Modal cierra.
11. Refrescar página o ir a `/empresas/<id>` → verificar que el CUPS aparece en el tab "CUPS" o "Suministros" de esa empresa.

**Verificación BD (opcional):**

```sql
SELECT codigo_cups, empresa_id, datadis_sincronizado, datadis_ultima_sync
  FROM public.cups
 WHERE codigo_cups = '<el CUPS asociado>';
```

Debe mostrar `empresa_id` poblado y `datadis_sincronizado=true`.

**Si falla:**
- Si no aparece botón Asociar: verificar `DatadisPage.tsx` columna nueva.
- Si modal no abre: verificar prop `open` y `selectedSupplyForAsociar`.
- Si búsqueda no funciona: verificar `useDebounce` y `useEmpresas` con filter search.
- Si asociación falla con error 23505: ya existe un CUPS con ese código — el upsert debería actualizar, no fallar.

⚠️ **Idempotencia:** intentar asociar el mismo CUPS dos veces no debe fallar. Solo actualiza.

✅ / ❌  Resultado: _________________

---

## Test 4 — Sentry SDK base sin DSN (FASE 30.10)

**Setup:**

```powershell
# Verificar que VITE_SENTRY_DSN NO está en .env
Get-Content .env | Select-String SENTRY
# Debe estar vacío o no existir
```

**Pasos:**

1. Navegar a `http://localhost:3000`. Login.
2. Abrir DevTools (F12) → tab "Network".
3. Filtrar por "sentry".
4. **Esperado**: NINGUNA petición a sentry.io. Cero coste runtime.
5. Tab "Console" → no debe haber errores ni warnings de Sentry.
6. **Esperado**: en bundle de Network → `@sentry/react` NO debe aparecer descargado (lazy import, sin DSN no se carga).

**Test forzado (opcional, simular DSN test):**

```powershell
# Añadir a .env temporalmente:
VITE_SENTRY_DSN=https://test@sentry.example.com/0
```

7. Reiniciar `npm run dev`.
8. Recargar página. En DevTools Network, verificar que `@sentry/react` SÍ se carga ahora.
9. Generar un error provocado: en Console:
   ```js
   throw new Error('test sentry')
   ```
10. **Esperado**: en Network aparece petición a `sentry.example.com` (que fallará 404 obvio, pero confirma que Sentry intentó enviar).
11. **Limpiar**: borrar `VITE_SENTRY_DSN` de `.env` y reiniciar dev.

**Si falla:**
- Si SDK se carga sin DSN: verificar lógica de `getDsn()` en `sentry.ts`.
- Si SDK no se carga con DSN: verificar `await import('@sentry/react')` async.

✅ / ❌  Resultado: _________________

---

## Test 5 — Cron daily_contract_check programado (FASE 30.1, ya en prod)

**No requiere localhost. Verificar directamente en Supabase Dashboard.**

**Pasos:**

1. Ir a https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb/sql/new
2. Ejecutar:
   ```sql
   SELECT jobid, schedule, command, jobname, active
     FROM cron.job
    WHERE jobname = 'daily_contract_check';
   ```
3. **Esperado**: 1 fila, schedule = `0 4 * * *`, active = true.
4. Ejecutar manualmente para verificar:
   ```sql
   SELECT public.run_daily_contract_check();
   ```
5. **Esperado**: JSON con `vencidos`, `oportunidades_creadas`, `tareas_creadas`, `notificaciones_creadas` y `errores: []`. Hoy todos serán 0 porque los 2 contratos no tienen `fecha_fin` problemática.
6. **Mañana 04:00 UTC** se ejecutará por primera vez automáticamente. Comprobar pasado mañana:
   ```sql
   SELECT * FROM public.actividades
    WHERE descripcion = 'Rollover diario: estado activo -> vencido'
       OR titulo LIKE '%renovacion%'
    ORDER BY created_at DESC LIMIT 10;
   ```

**Si falla:**
- Cron jobid no aparece: re-aplicar migration `20260501_fase30_1_*`.
- Función no existe: idem.
- Función existe pero falla: revisar log Supabase Edge Functions o postgres.

✅ / ❌  Resultado: _________________

---

## Test 6 — Migration incidencias.cups_id (FASE 30.8 aditiva, ya en prod)

**Verificar en Supabase Dashboard:**

```sql
-- 1. Columna cups_id existe
SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_schema='public'
   AND table_name='incidencias'
   AND column_name='cups_id';

-- 2. FK existe
SELECT conname, pg_get_constraintdef(oid)
  FROM pg_constraint
 WHERE conrelid = 'public.incidencias'::regclass
   AND conname LIKE '%cups_id%';

-- 3. Índice existe
SELECT indexname FROM pg_indexes
 WHERE tablename='incidencias' AND indexname='idx_incidencias_cups_id';
```

**Esperado:**
- Columna `cups_id` con tipo `uuid`.
- FK `incidencias_cups_id_fkey REFERENCES cups(id) ON DELETE SET NULL`.
- Índice `idx_incidencias_cups_id` existe.

✅ / ❌  Resultado: _________________

---

## Veredicto final

| Test | Resultado | Notas |
|---|---|---|
| 1. Importes Kanban | ☐ | |
| 2. Wizard contacto decisor | ☐ | |
| 3. Asociar Datadis | ☐ | |
| 4. Sentry SDK | ☐ | |
| 5. Cron daily_contract_check | ☐ | |
| 6. Migration cups_id | ☐ | |

### Si todos verdes → COMMIT

```powershell
git checkout -b claude/sprint-a-cowork
git add `
  supabase/migrations/20260501_fase30_1_daily_contract_check_pgcron.sql `
  supabase/migrations/20260501_fase30_8_incidencias_cups_id_fk.sql `
  src/features/oportunidades/components/KanbanCard.tsx `
  src/features/oportunidades/components/KanbanColumn.tsx `
  src/features/empresas/EmpresasPage.tsx `
  src/features/datadis/DatadisPage.tsx `
  src/features/datadis/api.ts `
  src/features/datadis/components/AsociarEmpresaDialog.tsx `
  src/main.tsx `
  src/core/hooks/useAuth.ts `
  src/core/utils/logger.ts `
  src/core/utils/sentry.ts `
  .env.example `
  package.json `
  package-lock.json `
  docs/AUDIT_2026-05-01_MEJORAS_CRM.md `
  docs/AUDIT_2026-05-01_PROFESIONAL_SECTOR.md `
  docs/COMPARATIVA_COWORK_VS_CHATGPT_2026-05-01.md `
  docs/PLAN_CAROLINA_ENGINE_2026-05-01.md `
  docs/PLAN_CAPTACION_PROFESIONAL_2026-05-01.md `
  docs/RELEASE_1_CAPTACION_2026-05-01.md `
  docs/PROMPT_CHATGPT_SECOND_OPINION_2026-05-01.md `
  docs/PLAN_DEPURACION_2026-05-01.md `
  docs/CHECKLIST_QA_SPRINT_A_2026-05-01.md `
  docs/INDICE_2026-05-01.md `
  docs/ROADMAP_FUSION.md `
  docs/ESTADO.md `
  docs/SESIONES/2026-05-01-resumen.md `
  docs/SESIONES/2026-05-01-tarde-sprint-a-autonomo.md `
  .cowork/outbox/2026-05-01-audit-mejoras-crm-handoff.md `
  .cowork/outbox/2026-05-01-sprint-a-autonomo-aplicado.md

git commit -m "feat(fase30): sprint A autónomo + auditorías + plan release 1

BD prod (vía MCP):
- run_daily_contract_check() + cron 04:00 UTC (FASE 30.1)
- incidencias.cups_id uuid FK + index + populate (FASE 30.8 aditiva)

Frontend (validado QA manual checklist):
- Kanban muestra valor_estimado_eur y ahorro_anual_estimado (FASE 30.4)
- Wizard 2 pasos al crear empresa: empresa + contacto decisor (FASE 30.5)
- Boton 'Asociar a empresa' en DatadisPage con dialog (FASE 30.6)
- Sentry SDK lazy con DSN opcional (FASE 30.10)

Docs estratégicos:
- Auditoria técnica + auditoria profesional sector
- Comparativa con ChatGPT + plan ejecutable Release 1 captación
- Plan depuración + checklist QA + índice docs
"

git push origin claude/sprint-a-cowork
```

### Si algún test falla → NO COMMIT

Documentar el fallo en este checklist y volver a esta sesión Cowork con el detalle. **Mejor un repo verde con menos features que un repo con features rotas.**

---

## Tiempo estimado QA completo

- Pre-requisitos npm install + tsc + tests: 5-10 minutos.
- Tests 1-4 visuales en localhost: 20-30 minutos.
- Tests 5-6 SQL en dashboard: 5 minutos.
- **Total: 30-45 minutos** de validación manual.

Coste alto pero ineludible. Sin esto, commiteamos a ciegas.

— Cowork, 1 mayo 2026.
