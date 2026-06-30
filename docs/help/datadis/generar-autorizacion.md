---
title: Generar la autorización de Datadis de una empresa
section: datadis
audience: todos
keywords: [datadis, autorizacion, consentimiento, cups, firmante, dni, consumo, partner, pdf]
related:
  - empresas/crear-empresa
  - contactos/crear-contacto
  - cups/crear-cups
---

# Generar la autorización de Datadis de una empresa

## Qué es
La autorización de Datadis es el documento que el cliente firma para que Valere pueda consultar sus datos de consumo eléctrico en la plataforma Datadis. El CRM la genera ya rellenada con los datos de la empresa, lista para enviar a firmar.

## Cómo acceder
Entra en la ficha de la empresa (**Empresas** → seleccionar empresa) y abre la pestaña **Datadis**. Pulsa **Generar autorización**.

## Qué hace al generar
- Crea el PDF de autorización con el diseño de Valere, ya rellenado con la razón social, el CIF, el firmante y marcando por defecto "Autorizo TODOS los CUPS" y "Sí".
- Si la empresa tiene más de un CUPS, añade un anexo con la lista de CUPS.
- Guarda el PDF en los **Documentos** de la empresa y registra la autorización con estado **Generada**.
- Abre el PDF para que puedas descargarlo y enviarlo al cliente.

## Si faltan datos
Para generar la autorización, la empresa necesita tener: razón social, CIF, un contacto marcado como **firmante** con su **DNI**, y al menos un **CUPS**. Si falta algo, el CRM muestra el aviso **"Faltan datos"** con la lista de lo que falta y un enlace **Completar** que te lleva a la ficha donde rellenarlo. Complétalo y vuelve a pulsar **Generar autorización**.

## Regla importante
Se hace **una autorización por empresa** (por CIF). Si una misma persona es representante legal de varias empresas, se genera una autorización por cada empresa y esa persona las firma todas.

## Estados de una autorización
Generada → Enviada al cliente → Firmada → Enviada a Datadis → Activa. También puede quedar Rechazada, Revocada o Caducada (las autorizaciones caducan a los 24 meses).

## Si algo falla
- "Solo un administrador puede generar autorizaciones": pide a un administrador que la genere.
- No se genera y aparecen datos faltantes: complétalos en la ficha de empresa o del contacto firmante y reintenta.
