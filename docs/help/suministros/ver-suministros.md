---
title: Suministros (CUPS) en el CRM comercial
section: suministros
audience: [asesor_senior, master]
keywords: [suministros, cups, punto de suministro, tarifa, potencia, comercializadora, fotovoltaica, datadis, luz, gas]
related:
  - docs/help/empresas/ficha-empresa.md
  - docs/help/potencias/suministros.md
---

# Suministros (CUPS)

## Qué es
Lista de los puntos de suministro (CUPS) de electricidad y gas de tus clientes: su tarifa de acceso, potencia, dirección, comercializadora, si tienen fotovoltaica y si están sincronizados con Datadis. Es la misma información que usa el módulo de Potencias, ahora también visible en el CRM comercial.

## Cómo acceder
Hay dos sitios:

1. **Menú lateral → CRM Comercial → Suministros**: lista global de todos los CUPS, con buscador (por CUPS, empresa, dirección o comercializadora) y filtro por empresa.
2. **Ficha de una empresa → pestaña «⚡ Suministros»**: solo los CUPS de esa empresa.

## Qué muestra cada CUPS
| Columna | Significado |
|---|---|
| CUPS | Código único del punto de suministro |
| Tarifa | Peaje de acceso (2.0TD, 3.0TD, 6.1TD…) |
| Pot. (kW) | Potencia contratada de referencia |
| Dirección | Dirección física del suministro |
| Comercializadora | Compañía que factura el suministro |
| FV | ☀️ si el punto tiene instalación fotovoltaica/autoconsumo |
| Datadis | ✅ si está sincronizado con Datadis |
| Estado | Activo / baja / pendiente |

## De dónde salen los datos
Los CUPS se dan de alta desde Captura de datos (módulo Energía), desde Potencias, o cargándolos a partir de contratos/facturas. La pestaña y la lista solo los muestran; no se crean datos nuevos aquí.

## Si algo falla
- **No veo la opción «Suministros» en el menú**: requiere función `asesor_senior` o `admin`. Si no la tienes, pídesela al administrador.
- **Una empresa no tiene CUPS**: aún no se han cargado sus puntos de suministro. Se añaden desde Captura de datos o Potencias.
- **Falta la potencia o el consumo de un CUPS**: esos datos llegan de Datadis o de la factura; si el CUPS se cargó solo con la dirección y la tarifa, aparecerán en cuanto se sincronice.
