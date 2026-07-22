# HOJA DE DECISION — 22 CUPS sin tarifa + hallazgos derivados — 2026-07-22
ESTADO: ANALISIS COMPLETO, NADA ESCRITO EN BBDD. SQLs listos, esperan OK de Juan
+ cuadre del auditor.

## Grupo 1 — resolubles desde su contrato (5 CUPS, deterministas)
El contrato vinculado tiene tarifa (en grafia de coma):
- ALMACENES RODRIGUEZ VALDERRUBIO: …976001JS0F y …784001VV0F -> 3.0TD (BASSOLS)
- FERJUVAL: …461001DZ0F -> 3.0TD · …038001HP0F -> 6.1TD (BASSOLS)
- HORTOFRUTICOLA NAVARRO LINDE: …783001TL -> 6.1TD (BASSOLS)
SQL preparado (espera OK):
```sql
update cups c set tarifa_acceso = replace(ct.tarifa_acceso, ',', '.')
from contratos ct
where ct.id = c.contrato_id and c.deleted_at is null
  and c.tarifa_acceso is null and ct.tarifa_acceso is not null;
```

## Grupo 2 — inferible por punto de medida (1 CUPS, confirmar)
- AERCAL …971001FM: datadis_punto_tipo=3 (50-450 kW) -> propuesta 6.1TD si es AT
  (o 3.0TD si BT). CONFIRMAR con factura antes de escribir.

## Grupo 3 — sin fuente en el CRM (16 CUPS)
NEXUS (7): AERCAL ya contado aparte; CALUBA NORTE, CIRCULO RECREATIVO PEDRO MEDINA,
NOVOCARE PLUS x2, NOVOCARE S COOP x3. CYE (8): CP OASIS x2, CRISTINA VAZQUEZ TERRY,
EL ESPINO, ENRIQUE MAILLO, NAUTICALIA, TRIANA CIN x2. CHEMTROL (1): CUPS gas
…560184ZM sin contrato.
Fuentes posibles: (a) facturas del cliente; (b) retomar SIPS F1 — OJO HALLAZGO:
la EF resolver-sips-cups NO esta desplegada (solo existe en la rama aparcada
claude/f1-sips-cups; la memoria decia "desplegada" y es incorrecto — verificado
contra la lista real de EFs); (c) dictado del gestor de cada cuenta.
Propuesta: aparcar hasta retomar SIPS F1 o revision de facturas; no inventar.

## HALLAZGO A — contratos.tarifa_acceso sin normalizar (438 filas)
La normalizacion de la sesion de datos se aplico a cups, NO a contratos:
2,0TD x190 · 3,0TD x178 · 6,1TD x70 siguen con coma. Ademas ContratoForm/asistente
escriben ya la grafia con punto -> conviven ambas y cualquier filtro/join por tarifa
esta partido en dos. SQL preparado (espera OK + cuadre foto antes/despues):
```sql
update contratos set tarifa_acceso = replace(tarifa_acceso, ',', '.')
where deleted_at is null and tarifa_acceso in ('2,0TD','3,0TD','6,1TD');
```

## HALLAZGO B — RLTB pendiente de canonica (gas, ya conocido)
Conviven RL1(9) RL2(5) RL3(5) RL4(12) RL5(3) RL6(1) con RLTB.4(1) y RLTB.5(15).
PREGUNTA para dictado de Juan: ¿RLTB.5 es el mismo peaje que RL5 con otra grafia
(-> unificar a RL5/RL4), o es un producto distinto que debe conservarse?

## Recomendacion de orden
1. OK a Grupo 1 + Hallazgo A juntos (misma naturaleza, 443 filas total, cuadre unico).
2. Dictado RLTB (1 minuto de Juan) -> op pequena si procede.
3. Grupo 2/3 a la espera de factura/SIPS — anotados, sin plazo.
