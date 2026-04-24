---
title: Crear un contrato
section: contratos
audience: comerciales
keywords: [contrato, firmar, alta, crear, compañía, suministro, energía, electricidad, gas, dual]
related:
  - contratos/gestionar-contratos
  - empresas/crear-empresa
  - oportunidades/pipeline-kanban
  - renovaciones/gestionar-renovaciones
---

# Crear un contrato

## Resumen rápido
Desde **Contratos** en el menú → **+ Nuevo contrato** → elige empresa + compañía + estado → rellena datos económicos → **Guardar**.

También se crea automáticamente cuando mueves una oportunidad a "Ganada" (automatización).

## Paso a paso

### Manualmente
1. En el menú, pulsa **Contratos**.
2. Pulsa **+ Nuevo contrato** arriba a la derecha.
3. Rellena el formulario:
   - **Empresa** *(obligatorio)*: elige entre las ya dadas de alta.
   - **Compañía** *(obligatorio)*: comercializadora con la que se firma (Iberdrola, Naturgy, Endesa, etc.).
   - **Número de contrato**: identificador asignado por la comercializadora (opcional).
   - **Estado** *(obligatorio)*:
     - `tramite` — en proceso de activación.
     - `activo` — generando facturación.
     - `vencido` — pasada la fecha fin.
     - `incidencia` — con problemas.
     - `baja` — cancelado por cliente.
     - `cancelado` — cancelado por otros motivos.
     - `borrador` — no activado aún.
   - **Tipo energía**: electricidad (`electrica`), `gas` o `dual` (ambas).
   - **Tipo precio**: fijo, indexado o mixto.
   - **Tarifa acceso**: 2.0TD, 3.0TD, 6.1TD, etc.
   - **Fecha firma**, **fecha inicio**, **fecha fin**.
   - **Duración meses**.
   - **Potencia contratada**, **consumo SIPS/PO**.
   - **Comisiones** (integra, comercial, jefe) — opcionales, para tracking interno.
   - **Observaciones**.
4. **Guardar**.

### Automáticamente desde una oportunidad ganada
1. En el kanban de oportunidades, arrastra una tarjeta a la columna **Ganada**.
2. El sistema crea un borrador de contrato con la empresa y el comercial asignado.
3. El contrato aparece en estado **borrador** — tú lo completas con los datos reales.

## Después de crear el contrato

- **Asignar CUPS**: si aún no existe, crear el CUPS (código de suministro) asociado desde la ficha de la empresa → pestaña CUPS.
- **Adjuntar documentos**: el contrato firmado escaneado, facturas previas, autorizaciones.
- **Programar renovación**: 60/90 días antes de la fecha fin, el sistema genera alertas.

## Alertas de vencimiento

El CRM muestra un **semáforo** en la ficha y dashboard:
- 🟢 Verde: queda más de 90 días.
- 🟡 Amarillo: quedan 60-90 días.
- 🟠 Naranja: quedan 30-60 días.
- 🔴 Rojo: quedan menos de 30 días o ya venció.

## Errores frecuentes

- **"Empresa obligatoria"**: selecciona empresa del desplegable.
- **"Compañía muy corta"**: mínimo 2 caracteres.
- **"Fecha fin anterior a fecha inicio"**: revisa las fechas.

## Preguntas relacionadas

- ¿Cómo renuevo un contrato?
- ¿Cómo adjunto el PDF del contrato firmado?
- ¿Puedo exportar los contratos a Excel?
- ¿Qué pasa cuando un contrato pasa a "vencido" automáticamente?
