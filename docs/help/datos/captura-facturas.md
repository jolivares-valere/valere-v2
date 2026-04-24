---
title: Captura de datos de facturas (manual y automática)
section: datos
audience: comerciales
keywords: [datos, factura, captura, p1, p6, consumo, potencia, periodos, manual, ocr, pdf]
related:
  - cups/crear-cups
  - analisis/comparativo-ofertas
  - propuestas-energia/generar-propuesta
---

# Captura de datos de facturas

## Resumen rápido
Menú → **Datos**. Dos formas: introducir manualmente los consumos por periodo (P1-P6), o subir el PDF de la factura para extracción automática (futuro — actualmente manual).

## Para qué sirve

Los datos de las facturas son la base para:

- **Analizar el consumo del cliente** por periodo y mes.
- **Comparar ofertas** de comercializadoras (la calculadora necesita kWh por P1-P6).
- **Detectar excedentes fotovoltaicos** y compensación.
- **Generar propuestas** con ahorro real estimado.

Sin estos datos, la Calculadora no puede generar comparativas precisas.

## Captura manual (lo más habitual hoy)

### Paso a paso

1. Menú → **Datos**.
2. Filtrar por la empresa o CUPS al que pertenece la factura.
3. **+ Nueva factura**.
4. Rellenar:
   - **CUPS** *(obligatorio)*: del desplegable.
   - **Año** *(obligatorio)*: 2024, 2025, 2026...
   - **Mes** *(obligatorio)*: 1-12.
   - **Días facturados**: típicamente 30 (mensual) o 60 (bimestral).
   - **Comercializadora** (retailer): nombre como aparece en factura.
   - **Importe total (€)**: suma final con impuestos.
5. **Consumo por periodo (kWh)**:
   - P1, P2, P3, P4, P5, P6.
   - Tarifa 2.0TD usa solo P1+P2+P3.
   - Tarifa 3.0TD/6.1TD usa P1-P6.
   - Si una factura solo da el total, distribuir según los porcentajes típicos del sector del cliente.
6. **Excedentes (si tiene FV)**:
   - kWh excedentes por periodo P1-P6.
   - Compensación recibida (€).
7. **Guardar**.

## Captura desde PDF (en desarrollo)

Hay una funcionalidad en desarrollo para extraer datos automáticamente del PDF de la factura usando IA. Está implementada en `valere-gestion-potencias` para el caso de cambios de potencia, y se planea integrar en CRM.

Mientras tanto, captura manual.

## Consejos

- **Captura todas las facturas del último año** para el análisis comparativo. Con menos de 12 meses, los cálculos pierden precisión (no se ven estacionalidades).
- **Empieza por las facturas más recientes**: dan la situación actual del cliente, base para comparar con ofertas nuevas.
- **Excedentes**: si el cliente tiene autoconsumo, captura SIEMPRE los datos de excedentes — son un activo importante en la negociación.
- **Lee bien la unidad**: kWh vs kW (potencia ≠ energía). En la captura de datos hablamos de **kWh** (energía consumida).

## Distribución por periodos según tarifa

| Tarifa | Periodos válidos |
|---|---|
| 2.0TD | P1 (punta), P2 (llano), P3 (valle) |
| 3.0TD | P1, P2, P3, P4, P5, P6 |
| 6.1TD | P1, P2, P3, P4, P5, P6 |

Si la tarifa es 2.0TD pero introduces P4-P6, el sistema los ignora (compatibilidad).

## Errores frecuentes

- **"CUPS no encontrado"**: tienes que crear primero el CUPS asociado a la empresa antes de meter facturas. Ver `cups/crear-cups.md`.
- **"Total de consumo P1+...+P6 muy distinto del total facturado"**: revisa que no falte un periodo o esté mal distribuido. La factura suele dar la suma total — si no coincide en ±5% es probable que algún P esté mal.
- **"Año/mes ya existe"**: ya hay una factura registrada para ese CUPS en ese mes. Editar la existente en vez de duplicar.

## Ver el histórico

Desde la pestaña **Datos** filtrando por CUPS, ves el listado mensual con consumos y costes. Útil para:

- Comparar evolución mes a mes.
- Detectar picos anómalos.
- Calcular consumo anual estimado.

## Preguntas relacionadas

- ¿Puedo importar un Excel con consumos de varios meses de golpe?
- ¿Cómo extraer los datos de un PDF de factura automáticamente?
- ¿Datadis trae los consumos sin que yo los introduzca?
- ¿Qué pasa si el cliente cambia de tarifa a mitad de año?
