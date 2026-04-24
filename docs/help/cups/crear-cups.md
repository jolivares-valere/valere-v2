---
title: Crear un CUPS (punto de suministro)
section: cups
audience: todos
keywords: [cups, suministro, punto, energía, electricidad, gas, potencia, tarifa, distribuidor]
related:
  - empresas/crear-empresa
  - contratos/crear-contrato
  - cups/datadis-integracion
---

# Crear un CUPS

## Resumen rápido
El CUPS (Código Universal del Punto de Suministro) es el identificador único legal de un punto de consumo eléctrico o de gas en España (20-22 caracteres). Se crea desde la ficha de una empresa → pestaña **CUPS** → **+ Nuevo CUPS**.

## Paso a paso

1. Abre la ficha de la empresa titular del suministro (Menú → Empresas → click).
2. Pestaña **CUPS** dentro de la ficha.
3. **+ Nuevo CUPS**.
4. Rellena:
   - **Código CUPS** *(obligatorio)*: los 20-22 caracteres que aparecen en la factura eléctrica o de gas. Formato típico: `ES00311234...`.
   - **Dirección suministro**: lugar físico donde se consume.
   - **Estado**: `activo`, `baja`, `cancelado`, `tramite`.
   - **Distribuidor**: Iberdrola Distribución, Endesa Distribución, E-Distribución, UFD, etc.
   - **Comercializadora actual**: con quién factura ahora (Iberdrola, Naturgy, etc.).
   - **Tarifa acceso**: 2.0TD, 3.0TD, 6.1TD, etc.
   - **Potencias contratadas (P1-P6)**: kW en cada periodo. Introducirlas en orden.
   - **Energía mensual (P1-P6)**: consumo en kWh por periodo (opcional, se rellena automáticamente con Datadis).
5. Campos fotovoltaica (si tiene autoconsumo):
   - **Fecha instalación FV**
   - **Potencia FV (kWp)**
   - **Potencia inversor (kW)**
   - **Marca inversor**
   - **Modelo autoconsumo**: colectivo, individual, sin excedentes, compensación.
   - **Coste instalación (€)**.
6. **Guardar**.

## Campos importantes

- **Código CUPS**: se normaliza (mayúsculas, sin espacios/guiones) al guardar. Si ya existe en el sistema, el sistema avisa para evitar duplicados.
- **Tarifa acceso**: determina qué precios regulados BOE aplican. Cambia cada año por ley — revisar anualmente.
- **Potencias P1-P6**: obligatorias si vas a calcular ahorros con Calculadora. Sin ellas, las comparativas no funcionan.

## Vincular con un contrato

Un CUPS suele estar asociado a un **contrato** (el que lo comercializa ahora). Vinculación:

1. Desde la ficha del CUPS → pestaña **Contratos**.
2. **+ Asociar contrato existente** o **+ Nuevo contrato**.
3. Seleccionar el contrato (si ya existe) o crear uno nuevo.
4. Al vincular, el CUPS se considera "facturando bajo ese contrato".

Un CUPS puede tener varios contratos a lo largo del tiempo (histórico de cambios de comercializadora).

## Integración Datadis

Si configuras el CUPS con los datos del titular correctos y activas la sincronización Datadis, el sistema descarga automáticamente:

- **Curvas horarias de consumo** (últimos 12 meses).
- **Potencias máximas registradas** (para dimensionar).
- **Cambios de comercializadora** históricos.
- **Excedentes fotovoltaicos** si los hay.

Activar:

1. Ficha del CUPS → pestaña **Datadis**.
2. Pulsar **Sincronizar ahora**.
3. Si no hay token configurado, te pide autorizar (el admin debe haber configurado primero el conector Datadis).

## Consejos

- **Un CUPS por punto físico**: no crees varios CUPS para la misma dirección.
- **Titular correcto**: asegúrate de que el CUPS está asociado a la empresa cuyo NIF coincide con el titular real en Datadis (si no coincide, la sincronización falla).
- **Copia el CUPS de la factura**: para evitar errores de transcripción.

## Errores frecuentes

- **"CUPS ya existe"**: ya está dado de alta — busca en la lista global de CUPS.
- **"Formato CUPS inválido"**: debe tener 20-22 caracteres alfanuméricos, empezar por "ES".
- **"Potencias no pueden ser 0"**: si es tarifa 2.0TD introducir al menos P1 y P2. Si es 3.0TD/6.1TD, los 6 periodos.
- **"Error sincronización Datadis"**: el titular del CUPS no coincide con el NIF de la empresa, o el token Datadis expiró.

## Preguntas relacionadas

- ¿Cómo sincronizar consumos con Datadis?
- ¿Qué pasa si cambio de comercializadora?
- ¿Puedo tener varios CUPS en la misma empresa?
- ¿Cómo marcar un CUPS como fotovoltaica?
- ¿Qué diferencia hay entre 2.0TD, 3.0TD y 6.1TD?
