---
title: Alarma de incidencias de datos Datadis (Dashboard)
section: datadis
audience: todos
keywords: [datadis, incidencias, cups, alarma, dashboard, sincronizacion, dar de alta, no coincide, suministros]
related:
  - docs/help/suministros/ver-suministros.md
  - docs/help/datadis/buscador-cups.md
---

# Alarma de incidencias de datos Datadis

## Qué es
Un cuadro de alarma en el Dashboard que avisa cuando los datos de CUPS del CRM no cuadran con lo que Datadis tiene autorizado a Valere. La sincronización nocturna con Datadis detecta dos tipos de problema y los muestra aquí para que se corrijan.

Tipos de incidencia:

- **CUPS por dar de alta**: Datadis autoriza un CUPS de ese cliente que todavía no existe en el CRM. Se muestra su distribuidora y municipio para poder crearlo.
- **CUPS no coincide**: la empresa está autorizada en Datadis pero ningún CUPS del CRM cuadra con los suyos (normalmente porque el CUPS cargado en el CRM es incorrecto o antiguo).

## Cómo acceder
Aparece automáticamente en el **Dashboard**, justo debajo de la tira de vencimientos, en rojo/naranja. Solo se muestra si hay incidencias; si no hay ninguna, no aparece.

## Acciones
Al pinchar en una empresa de la lista, se abre su ficha directamente en la pestaña **Suministros**, donde se corrige el dato:

- Para "CUPS por dar de alta": crear el CUPS que falta (con la distribuidora/dirección que indica Datadis).
- Para "CUPS no coincide": revisar y corregir el código CUPS mal cargado en el CRM.

## Cómo se resuelve la alarma
La lista se regenera en cada sincronización con Datadis (automática cada noche). En cuanto el dato queda corregido en el CRM, la incidencia desaparece sola en la siguiente sincronización. No hay que marcar nada como resuelto manualmente.

## Si algo falla
- Si una empresa aparece en la alarma pero crees que el CUPS es correcto, comprueba que el código CUPS del CRM coincide con el de la factura/Datadis (los primeros 20 caracteres). Diferencias de mayúsculas o espacios no afectan; un dígito distinto sí.
- Si un cliente autorizado no aparece ni en la alarma ni con suministros sincronizados, puede que aún no haya firmado la autorización en Datadis. Revisa la pestaña Datadis de su ficha.
