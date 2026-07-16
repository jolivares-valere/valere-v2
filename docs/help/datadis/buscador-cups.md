---
title: Buscador de CUPS
section: datadis
audience: todos
keywords: [cups, sips, datadis, buscador, consumo, potencia, tarifa, titular, comercializadora]
related:
  - docs/help/datadis/ver-suministros.md
---

# Buscador de CUPS

## QuÃ© es
Pega un CUPS y obtÃ©n, en una sola consulta a Datadis, todos sus datos: titular (NIF/CIF), distribuidor, direcciÃ³n, tarifa de acceso, comercializadora actual, potencias contratadas P1â€“P6, maxÃ­metros, consumo por periodo, consumo total y la curva de consumo mensual (12 meses). No crea ni modifica nada: solo consulta.

## CÃ³mo acceder
MenÃº lateral â†’ bloque Â«CRM ComercialÂ» â†’ **Buscador CUPS** (ruta `/buscador-cups`). Visible para administradores y asesor senior.

## Acciones
- Escribe un **CUPS** (formato ES + 18â€“20 caracteres) y, opcionalmente, el **NIF del titular**.
- Pulsa **Buscar** (o Enter). Se muestran KPIs (consumo total, tarifa, comercializadora, Ãºltimo cambio), la ficha del punto, las tablas por periodo y la grÃ¡fica mensual.

## Requisitos
El titular del CUPS debe haber **autorizado** el NIF de Valere en Datadis (o usar una autorizaciÃ³n ya existente). Si el CUPS no aparece entre los suministros autorizados, se avisa y no hay datos.

## Si algo falla
- Â«CUPS no encontradoÂ»: revisa la autorizaciÃ³n del titular en Datadis (mÃ³dulo Datadis â†’ Autorizaciones).
- Â«Datos parcialesÂ»: alguna sub-consulta de Datadis fallÃ³; los avisos indican cuÃ¡l. Reintenta mÃ¡s tarde (Datadis puede limitar).
- Formato invÃ¡lido: el CUPS debe empezar por `ES` y tener 18â€“20 caracteres.