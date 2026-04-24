---
title: Análisis comparativo de ofertas (calculadora)
section: analisis
audience: comerciales
keywords: [analisis, comparativo, calculadora, ofertas, ahorro, comercializadoras, simular, comparar]
related:
  - datos/captura-facturas
  - propuestas-energia/generar-propuesta
  - cups/crear-cups
---

# Análisis comparativo de ofertas

## Resumen rápido
Menú → **Análisis**. Selecciona empresa + CUPS → el sistema usa los datos de facturas + ofertas de comercializadoras configuradas → genera comparativa con ahorro vs situación actual y por cada oferta candidata.

## Cuándo usar el análisis

- Cliente potencial que quiere ver qué le ahorrarías.
- Renovación de contrato existente — comparar la oferta actual con alternativas.
- Auditoría general — revisar a clientes vivos si están en la mejor opción.

## Paso a paso

1. Menú → **Análisis**.
2. **Filtros** arriba:
   - **Empresa** *(obligatorio)*.
   - **CUPS** *(obligatorio)*: si la empresa tiene varios, elegir el que se quiere analizar.
   - **Periodo a comparar**: últimos 12 meses, último año fiscal, periodo libre.
3. El sistema calcula automáticamente:
   - **Consumo anual estimado** (kWh totales sumados de las facturas del periodo).
   - **Coste actual anual** (importe total de las facturas).
   - **Coste medio €/kWh actual**.
4. Tabla **Ofertas comparadas**:
   - Por cada oferta de comercializadora marcada como "Incluir en comparación":
     - Coste estimado anual con esa oferta.
     - Ahorro vs actual (€ y %).
     - Detalle desglosado por concepto (energía, potencia, peajes, impuestos).
5. **Pulsar sobre una oferta** → ver detalle completo + opción de generar propuesta.

## Cómo se calcula

### Inputs

- **Consumo histórico**: del CUPS, sumando facturas del periodo.
- **Potencias contratadas P1-P6**: de la ficha del CUPS.
- **Tarifa de acceso**: 2.0TD / 3.0TD / 6.1TD.
- **Precios de la oferta**: configurados en `comercializadoras → ofertas`.

### Cálculo simplificado

```
Coste energía = Σ (kWh_periodo_i × precio_energia_periodo_i)
Coste potencia = Σ (kW_periodo_i × precio_potencia_periodo_i × días_facturación)
Coste peajes = peajes regulados BOE (auto, según tarifa)
Coste alquiler contador = fijo según tarifa
Subtotal = energía + potencia + peajes + alquiler
Impuesto IEE = Subtotal × IEE%  (de global_config)
IVA = (Subtotal + IEE) × IVA%   (de global_config)
Total = Subtotal + IEE + IVA
```

Para excedentes (si el CUPS tiene autoconsumo):
```
Compensación excedentes = Σ (kWh_excedente_periodo_i × precio_excedente_oferta)
Coste neto = Coste total - Compensación
```

### Outputs

- **Coste estimado mensual y anual** por oferta.
- **Ahorro absoluto y porcentual** vs situación actual.
- **Coste medio €/kWh** comparable.
- **Ranking** de las ofertas más económicas.

## Configurar ofertas para comparar

Las ofertas vienen de la tabla `comercializadora_ofertas`. Las gestiona el admin:

1. Admin → Comercializadoras → Ofertas.
2. **+ Nueva oferta**:
   - Comercializadora.
   - Nombre del producto (ej: "Iberdrola 2.0TD Indexado abril 2026").
   - Tarifa de acceso aplicable.
   - Precios energía P1-P6 (€/kWh).
   - Precios potencia P1-P6 (€/kW/día).
   - Modelo de excedentes (compensación / neta / sin compensación).
   - Cuotas adicionales (alta, gestión anual, etc.).
   - **Incluir en comparación** (checkbox): solo se compara si está activado.
3. Guardar.

Es responsabilidad del admin mantener las ofertas actualizadas — los precios cambian frecuentemente.

## Ver desglose de una oferta

En la tabla de comparativa, click en una oferta → modal con desglose:

- Por periodo (P1-P6) — kWh consumidos × precio energía × precio potencia.
- Cuotas fijas.
- Impuestos.
- Comparativa con la actual línea por línea.

Útil para explicar al cliente exactamente de dónde viene el ahorro.

## Errores frecuentes

- **"Sin datos suficientes"**: el CUPS no tiene 12 meses de facturas. Captura más datos primero.
- **"No hay ofertas para esta tarifa"**: la tarifa del CUPS (ej. 6.1TD) no tiene ofertas configuradas. Pedir al admin que añada.
- **Ahorros poco realistas (>50%)**: revisa si las potencias contratadas en la ficha CUPS son correctas — un error ahí distorsiona todo.

## Preguntas relacionadas

- ¿Cómo añadir una oferta nueva al sistema?
- ¿Por qué la oferta X aparece más cara que la del cliente actual si su precio energía es menor?
- ¿Cómo generar una propuesta a partir de la oferta ganadora?
- ¿Cómo comparar ofertas de gas natural?
