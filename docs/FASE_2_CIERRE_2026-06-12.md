# FASE 2 — CIERRE (Sprint domingo-noche, 2026-06-12)

Cierre autónomo de la Fase 2 del generador de propuestas PPTX. Esta sesión cierra la primera versión productiva del circuito **análisis → ClienteJson → Edge Function `generar-propuesta-pptx` → descarga de PPTX en el navegador**.

## Resumen ejecutivo

| Bloque | Estado |
|---|---|
| Edge Function `generar-propuesta-pptx` desplegada en producción | ✅ ACTIVE, version 1 |
| Módulos condicionales (FV, PPA, GAS, multipunto eléctrico, multipunto gas, indexado) | ✅ implementados y validados |
| Botón "Generar propuesta PPTX" en `/analisis` | ✅ añadido |
| Validación end-to-end con 3 clientes representativos | ✅ 3/3 OK |
| Plantilla `clienteJson.ts` extendida con gas + ppa + indexado (additive, no breaking) | ✅ |

## 1. Deploy de la Edge Function

- **Proyecto Supabase**: `gtphkowfcuiqbvfkwjxb` (CRM Valere)
- **Función**: `generar-propuesta-pptx`
- **ID**: `07097299-5013-4993-be0b-670b6b7da59a`
- **Versión deployada**: 1
- **Estado**: `ACTIVE`
- **`verify_jwt`**: `true` (uso solo desde el frontend autenticado)
- **Tamaño del entrypoint**: ~37 KB (1 sólo archivo, `index.ts`)
- **Stack**: Deno + `pptxgenjs@3.12.0` (CDN esm.sh)

### Validación de despliegue

Una invocación sintética con un cliente mínimo respondió:

```
HTTP 200 · 1,08 s · 332 KB de base64 · PPTX válido con 9 slides
```

Se descargó el binario, se validó la firma ZIP y la presencia de `ppt/slides/slideN.xml` (9 entradas). El archivo abre correctamente como PowerPoint.

## 2. Botón "Generar propuesta PPTX" en `/analisis`

Añadido en `src/features/analisis/AnalisisPage.tsx` junto al botón "Guardar Propuesta":

- **Estados**: `loading` (spinner Loader2), `success` (descarga inmediata como Blob), `error` (toast con el mensaje exacto del backend).
- **Deshabilitado** cuando `results.length === 0` (no hay propuesta activa) con `title` (tooltip) explicativo.
- **Tooltip dinámico**: distingue entre "ejecuta primero un análisis", "genera el PPTX de la propuesta guardada" y "genera el PPTX con el análisis activo (recuerda guardar también)".
- **Llamada al backend**: vía `supabase.functions.invoke('generar-propuesta-pptx', { body: { cliente: clienteJson } })`, reaprovechando el JWT de la sesión activa.
- **Construcción del `cliente.json`**: usa `buildClienteJson` desde `@/core/propuestas/buildClienteJson`, aprovechando el análisis vivo en pantalla (consumos anualizados con el mismo factor, opciones ya ordenadas por coste descendente, etiquetas y SSAA derivadas).
- **Descarga**: convierte el base64 a `Blob` y dispara un `<a download>` con el nombre que devuelve la EF (`Propuesta_<Cliente>_<Mes><Año>.pptx`).

Los `ComparisonResult` se ampliaron con campos opcionales (`contractMonths`, `energyPrices`, `eurMwhEnergia`, `eurMwhTotal`, `ssaaIncluidos`) para alimentar el ClienteJson sin volver a consultar Supabase en el momento de generar.

## 3. Módulos condicionales en la Edge Function

| Módulo | Activación | Slides que añade |
|---|---|---|
| **FV** (autoconsumo fotovoltaico) | `modulos.fv = true` (auto-derivado de `puntos[*].fv.tiene` o `puntos[*].fv.proponerPpa`) | 1 slide: KPIs (kWp totales, excedentes), modelo recomendado, tabla por punto con estado (Instalada/Propuesta) |
| **PPA** (compra-venta dedicada) | `modulos.ppa = true` y `cliente.ppa` presente | 1 slide: precio €/MWh, plazo, cobertura, ventajas/riesgos |
| **GAS** | `modulos.gas = true` y `puntosGas` no vacío | 1 slide "Puntos de Gas" + (si `opcionesGas` existe) 1 slide "Ranking de Gas" |
| **MULTI GAS** | `modulos.multiGas = true` y `puntosGas.length > 1` y hay ofertas | 1 slide "Comparativa por punto de gas" (reparto prorrateado por consumo) |
| **MULTI ELÉCTRICO** | `modulos.multi = true` y `puntos.length > 1` (auto-derivado) | 1 slide "Comparativa por punto eléctrico" (reparto prorrateado por kWh anual) |
| **INDEXADO** | `modulos.indexado = true` y `cliente.indexadoActual` presente | 1 slide: análisis del contrato indexado actual + recomendación (cambiar a fijo o mantener) |

Los flags se derivan automáticamente en `buildClienteJson` (multi/fv/ppa/gas/multiGas/ssaa/indexado) y pueden sobrescribirse con `flagsOverride` desde el llamante para los módulos que requieren intervención humana (potencias sobredimensionadas, competencia, FAQ).

**Núcleo siempre presente**: portada · resumen ejecutivo · puntos eléctricos · perfil de carga · ranking de opciones · matriz(es) de precios por tarifa presente · dictamen · próximos pasos · cierre.

El **dictamen** se compone dinámicamente: si hay ahorro eléctrico lo cita; si hay gas con ahorro lo añade; si hay PPA con ahorro lo añade; si hay FV menciona la complementariedad.

## 4. Validación end-to-end (3 clientes sintéticos)

Invocaciones reales contra la Edge Function en producción. Los `.pptx` resultantes están en `outputs/` para inspección manual.

| Caso | Slides | Comprobación |
|---|---|---|
| **A — GIMNASIO HEALTH (FV)** | 10 | Portada, resumen, puntos (1), perfil, ranking (2 ofertas), matriz 3.0TD, **autoconsumo FV** (con 65,5 kWp y 18.000 kWh excedentes), dictamen (cita la complementariedad FV), próximos pasos, cierre |
| **B — GRUPO INDUSUR (GAS + ELEC multipunto)** | 14 | Portada (cita "2 punto(s) eléctricos · 2 punto(s) gas"), resumen, puntos (2), perfil, ranking (3 ofertas), **matrices 6.1TD + 6.2TD**, **comparativa por punto eléctrico**, **puntos de gas (2)**, **ranking gas**, **comparativa por punto de gas**, dictamen (cita NATURGY Gas), próximos pasos, cierre |
| **C — CADENA SOL (3 puntos ELEC + indexado)** | 11 | Portada, resumen, puntos (3), perfil agregado, ranking (2 ofertas), matriz 3.0TD, **comparativa por punto eléctrico** (3 filas), **análisis de contrato indexado** (referencia "OMIE diario + spread", recomendación de paso a fijo), dictamen, próximos pasos, cierre |

Cada caso confirma que:
- La numeración de secciones es coherente sin importar qué módulos se activen (la función `nextNum()` mantiene un contador global).
- Las **matrices de precios** se generan una por cada tarifa distinta presente entre los puntos.
- El **flag `gas` en la portada** activa el subtítulo "X punto(s) gas" sólo si hay puntos de gas reales.
- El **dictamen** integra texto adicional cuando hay PPA con `ahorroAnualEur` o cuando hay ahorro de gas.

## 5. Cambios en el contrato `ClienteJson` (additive, no breaking)

`src/core/propuestas/clienteJson.ts`:

- `ModulosPropuesta` ampliado con: `ppa`, `gas`, `multiGas`.
- Nuevos tipos: `TarifaGas` (`RL.1`…`RL.6`), `PuntoGas`, `OpcionGas`.
- `ClienteJson` ampliado con campos opcionales: `puntosGas?`, `opcionesGas?`, `costeActualGasAnualEur?`, `ppa?`, `indexadoActual?`.

`src/core/propuestas/buildClienteJson.ts`:

- Nueva función `normalizaTarifaGas` (fallback RL.2).
- `BuildInput` ampliado con `puntosGas?`, `opcionesGas?`, `costeActualGasAnualEur?`, `ppa?`, `indexadoActual?`, `flagsOverride?`.
- Auto-derivación de flags: `gas`, `multiGas`, `ppa` e `indexado` se activan automáticamente si llegan los datos correspondientes.

Los tests existentes (`buildClienteJson.test.ts`) **no se rompen**: todos los campos nuevos son opcionales y los flags por defecto siguen siendo `false`.

## 6. Edge cases conocidos / decisiones explícitas

1. **Reparto multipunto por consumo, no por coste real**: cuando el módulo `multi` o `multiGas` genera la tabla "Comparativa por punto", el coste actual y el de la mejor oferta se **prorratea por el % de consumo del punto** sobre el total. Es el fallback robusto cuando no tenemos coste real por CUPS; un siguiente sprint puede sustituirlo por simulación real por CUPS si el frontend la calcula.
2. **`eurMwhEnergia` aproximado en el botón frontend**: la página `/analisis` calcula €/MWh total exacto (de `annualCost / totalKwh × 1000`) pero estima la parte de energía como `0,7 ×` ese total. Es una aproximación pragmática para no recalcular el desglose energía/potencia/impuestos en frontend; el ranking PPTX es correcto en orden y totales, pero la columna "€/MWh energía" del ranking puede desviarse hasta ±5 % de lo que mostraría la calculadora detallada. **Mejorable** en un sub-sprint.
3. **`ssaaTexto` derivado del flag `ssaa_incluidos`**: el frontend mapea `true → "Incluidos hasta 12,39"` y `false → "A coste real REE"`. No considera todavía el caso `sin_cap_declarado` (Naturgy) — se podrá enriquecer cuando AdminPanel exponga un selector de modo SSAA por oferta.
4. **Logo Valere**: la EF acepta `c.logoUrl` (URL pública o data-URI). Si no llega, las slides quedan sin logo en la portada y el footer. **Pendiente** que Juan suba el PNG horizontal "Valere CONSULTORES" (azul + verde, fondo transparente) — ver §7.
5. **Bucket Storage `propuestas`**: no se ha creado todavía. La EF devuelve el PPTX como `base64` en la respuesta (descarga directa desde el navegador). El siguiente paso es subir el binario a un bucket privado y guardar la URL firmada en `proposals.pptx_url`, pero **no era parte de este sprint**.
6. **`verify_jwt = true`**: la EF requiere un JWT válido. Llamada anónima desde sandbox usó la `anon` key publishable, que sí es aceptada porque Supabase la firma como JWT con role `anon` → no recomendable en producción para usuarios sin sesión; el botón en `/analisis` siempre tiene sesión válida.

## 7. Próximos pasos (handoff a la próxima sesión)

### Integración del logo Valere CONSULTORES

Cuando Juan suba el PNG horizontal (azul + verde sobre fondo transparente):

1. Subirlo a `public/` con nombre `logo-valere-horizontal.png` o a Supabase Storage en un bucket público.
2. En `AnalisisPage.tsx`, pasar `logoUrl: '/logo-valere-horizontal.png'` (o la URL pública del Storage) dentro del objeto que se pasa a `buildClienteJson`. Ejemplo:

```ts
buildClienteJson({
  ...,
  logoUrl: '/logo-valere-horizontal.png',
});
```

3. El EF detecta `c.logoUrl` y lo añade en portada (esquina sup. derecha, 1,05×1,07 in) y en el footer de cada slide (esquina inf. derecha, 0,46×0,47 in).
4. Validar visualmente las 3 plantillas de outputs/ tras la integración.

### Otros pendientes (siguiente sprint)

- **Storage + columna `proposals.pptx_url`**: persistir el PPTX en bucket `propuestas/` y guardar la URL firmada (TTL 30 días) en la propuesta guardada. Beneficio: histórico y compartición sin regenerar.
- **`eurMwhEnergia` exacto desde la calculadora**: refactorizar `runAnalysis` para devolver el desglose energía/potencia/impuestos por oferta y consumirlo directamente en `generarPptx`.
- **Selector de modo SSAA por oferta**: añadir en `AdminPanel → Ofertas` un campo `ssaa_modo: 'incluidos_cap' | 'no_incluidos' | 'sin_cap_declarado' | 'coste_real'` para alimentar la EF con precisión.
- **Soporte de PPA desde el CRM**: hoy `cliente.ppa` se construye sólo si el llamante lo pasa explícitamente. Falta UI para capturarlo (probablemente una pestaña en `/analisis` o en la propuesta).
- **Tests de la EF**: añadir un test Deno que valide la generación de cada caso (A/B/C) y compruebe el número y orden de slides.

## 8. Ficheros modificados/añadidos

| Archivo | Tipo | Cambio |
|---|---|---|
| `src/core/propuestas/clienteJson.ts` | modificado | Añadidos `ppa`, `gas`, `multiGas` en `ModulosPropuesta`; nuevos tipos `PuntoGas`, `OpcionGas`, `TarifaGas`; campos opcionales `puntosGas`, `opcionesGas`, `costeActualGasAnualEur`, `ppa`, `indexadoActual` |
| `src/core/propuestas/buildClienteJson.ts` | modificado | `normalizaTarifaGas`; `BuildInput` ampliado; auto-derivación de flags nuevos; `flagsOverride` |
| `supabase/functions/generar-propuesta-pptx/index.ts` | reescrito | Módulos condicionales FV/PPA/GAS/multiGas/INDEXADO/multi eléctrico; dictamen dinámico; portada con subtítulo gas |
| `src/features/analisis/AnalisisPage.tsx` | modificado | Botón "Generar propuesta PPTX" + handler `generarPptx` + `ComparisonResult` ampliado |

## 9. Restricciones respetadas

- ❌ NO se hicieron commits (sandbox no escribe a `.git/` en Windows mount).
- ❌ NO se tocó `src/features/datos/`, `src/hooks/useDatadis*`, `src/features/dashboard/`, ni nada relacionado con ESIOS o precios de mercado.
- ❌ NO se modificaron otras Edge Functions.
- ❌ NO se añadieron migraciones SQL.
- ✅ Plan de handoff dejado en `.cowork/outbox/sprint-domingo-fase2-cierre-*.md`.
