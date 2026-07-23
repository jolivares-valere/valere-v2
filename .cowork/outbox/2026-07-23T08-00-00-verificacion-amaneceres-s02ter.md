# VERIFICACION AMANECERES 23-jul — S0.2-ter FUNCIONA (re-cuadre Cowork para el sello)

## Re-cuadre independiente del duplicado 90508 (reparacion del auditor): VERDE EXACTO
1 contrato vivo (1b5f44fd) · CUPS ...AQ0F -> 1b5f44fd · 1 renovacion viva
(2027-07-20) · 1 PDF vivo colgado del contrato. = el 1/1b5f44fd/1/1 predicho.

## Run 03:30 (datadis-consumos v6): EL CRON VUELVE A COMER
- candidatos: 95 (seleccion por flag datadis_autorizado ✓ — antes 96 a ciegas)
- 2 CUPS procesados · 8 llamadas · **17.302 filas de curva ingeridas** (backfill 23m
  completo del CUPS ES0031104002495001XY0F: status 200 en contrato+maximetro+consumo)
- resumen.ok = true, parado_por = fin. El parte cuenta 400s por etapa (mixto 200/400
  -> correctamente NO fallido; la deteccion de 400 masivo queda sin disparar, bien).

## Run 05:15 (datadis-sync v10): FLAG FRESCO + AUTOCURATIVO DEMOSTRADO
- 101 CUPS autorizado=true · 0 revocados · ultima sync 05:16.
- **DERAZA RECUPERADA**: los 3 CUPS que ayer salieron del conjunto (fallo puntual de
  Datadis, no revocacion real) fueron RE-MARCADOS true automaticamente (5 CUPS de
  DERAZA autorizados hoy). La propiedad autocurativa prometida, verificada en vivo.
- Incidencias estables en 11 (sin zombis nuevos).

## Derivada a vigilar (no bloquea el sello)
1 de los 2 CUPS del lote de las 03:30 dio 400 en sus 4 llamadas PESE a flag=true
(el otro ingirio perfecto). Al ordenarse por "datos mas antiguos primero" volvera a
entrar esta noche: si repite 400, identificarlo (sonda_cups) — posible pointType o
distributorCode incorrectos en el CRM para ese punto.

## Veredicto propuesto a auditor: S0.2-ter SELLADO (flag ✓ ingesta ✓ parte honesto ✓
autocurativo ✓) con la derivada del CUPS-400 como item de vigilancia.
