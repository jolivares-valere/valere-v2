---
title: Dar de alta una venta completa en 2 minutos
section: ventas
audience: todos
keywords: [alta, venta, nueva venta, asistente, contrato nuevo, cups nuevo, empresa nueva, renovacion automatica, 4 pasos]
related:
  - docs/help/comercializadoras/catalogo-comercializadoras.md
  - docs/help/renovaciones/gestionar-renovaciones.md
---

# Dar de alta una venta completa (asistente de 4 pasos)

## Que es
Un asistente que crea de una vez todo lo que necesita una venta: la empresa (si es
nueva), su CUPS, el contrato y la renovacion del pipeline. Objetivo: menos de 2 minutos.

## Como acceder
Menu CRM -> **Nueva venta** (`/alta-venta`).

## Pasos

| Paso | Que haces |
|---|---|
| 1. Empresa | Busca por nombre o NIF. Si no existe, "+ Crear empresa nueva" (nombre, NIF, ciudad; el resto de la ficha se completa despues). |
| 2. CUPS | Elige un CUPS existente de la empresa o crea uno nuevo (codigo ES…, direccion, tarifa de acceso). |
| 3. Contrato | Comercializadora DEL CATALOGO (sin texto libre), tipo de precio, fechas. Si el CUPS es nuevo, el formulario se ADAPTA a la tarifa: 2.0TD pide 2 potencias + 3 energias; el resto, 6 + 6. Los periodos que no aplican no existen (no se rellenan con 0). |
| 4. Renovacion | Se autogenera con prioridad estimada por dias al vencimiento; puedes ajustarla si el negocio manda otra cosa. Sin fecha fin -> entra en la bandeja "Sin fecha". |

## Detalles importantes
- Si la comercializadora no comisiona renovacion (Naturgy, Endesa, Plenitude), el paso 4
  te lo avisa: renovar ahi es defensa de cartera, no ingreso.
- Si el alta falla a mitad (p.ej. sin conexion), reintenta con el mismo boton: lo ya
  creado no se duplica.
- Al terminar tienes enlaces directos a la ficha de empresa, al contrato y al pipeline.

## Si algo falla
- "CUPS no valido": el codigo debe empezar por ES y tener 16 digitos + letras de control.
- "Selecciona comercializadora del catalogo": el campo es obligatorio y no admite texto
  libre. Si falta una comercializadora, pide su alta a un admin (ver doc del catalogo).
