---
title: Suministros (CUPS) en el CRM comercial
section: suministros
audience: [asesor_senior, master]
keywords: [suministros, cups, punto de suministro, tarifa, potencia, comercializadora, fotovoltaica, datadis, luz, gas, curva, consumo, grafica, csv, descargar consumos]
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
| Curva (solo en la pestaña de la ficha de empresa) | 🟢 con fecha = curva de consumo disponible y al día · 🟡 con fecha = la curva existe pero está incompleta (parada en esa fecha) · "—" = sin curva en el CRM · botón **«Ver»** = abre la gráfica de consumo |
| Estado | Activo / baja / pendiente |

## Ver la curva de consumo (botón «Ver»)

Desde la ficha de una empresa → pestaña «⚡ Suministros», cada CUPS tiene un botón **«Ver»** en la columna Curva que abre la gráfica de consumo bajo la tabla:

- **Gráfica mensual**: barras con el consumo (kWh) por mes, hasta ~2 años hacia atrás.
- **Zoom diario**: clic en un mes para ver sus barras día a día; el botón «Mensual» vuelve a la vista de meses.
- **Botón «CSV»**: descarga el consumo diario completo del CUPS en un fichero que abre directamente en Excel (decimales con coma).
- **Aviso «🟡 backfill incompleto»**: la curva existe pero tiene huecos (meses pasados con días de menos) o su último dato tiene más de 45 días. No es un error: la ingesta nocturna de Datadis la va completando sola.
- **CUPS sin curva**: se muestra un aviso (no un error). Los datos llegan solos cuando la autorización Datadis del cliente está activa; si el punto no está autorizado, no hay dato que traer.

## Incidencias Datadis en la pestaña
Si la empresa tiene incidencias de datos con Datadis (CUPS autorizados que faltan en el CRM, o empresa autorizada sin CUPS coincidente), la pestaña Suministros de su ficha las muestra en un panel rojo encima de la tabla — el mismo aviso que la alarma del Dashboard y el chip rojo de la cabecera.

## De dónde salen los datos
Los CUPS se dan de alta desde Captura de datos (módulo Energía), desde Potencias, o cargándolos a partir de contratos/facturas. La pestaña y la lista solo los muestran; no se crean datos nuevos aquí.

## Si algo falla
- **No veo la opción «Suministros» en el menú**: requiere función `asesor_senior` o `admin`. Si no la tienes, pídesela al administrador.
- **Una empresa no tiene CUPS**: aún no se han cargado sus puntos de suministro. Se añaden desde Captura de datos o Potencias.
- **El botón «Ver» da un error al abrir la curva**: recarga la página y reintenta; si persiste, avisa al administrador.
- **La gráfica sale con huecos o parada en una fecha**: es el aviso 🟡 — el backfill de Datadis sigue en curso y se completa solo con la ingesta nocturna.
- **Falta la potencia o el consumo de un CUPS**: esos datos llegan de Datadis o de la factura; si el CUPS se cargó solo con la dirección y la tarifa, aparecerán en cuanto se sincronice.
