---
title: Subir factura recibida
section: captacion
audience: telemarketing
keywords: [factura, subir, pdf, jpg, archivo, recibida, documento]
related:
  - captacion/pedir-factura
  - captacion/pasar-a-analisis
---

# Subir factura recibida

## Cuándo usar
El cliente te ha enviado por email la factura energética. La descargaste y la quieres meter al CRM.

## Qué hace
Sube el archivo al CRM, lo asocia al caso y mueve el caso a la pestaña **"Esperando factura"** → estado **"Factura recibida"**.

## Pasos
1. Abre el caso en pestaña **"Esperando factura"**.
2. En el drawer, click **"Factura recibida"** (botón verde).
3. Selecciona el archivo. Acepta **PDF, JPG, PNG** (máximo 15 MB).
4. Confirma la fecha de recepción (autorrellenada con hoy).
5. Click **"Subir factura"**.

## Qué debe pasar
- Toast verde "Factura recibida y registrada".
- El caso cambia a estado **"Factura recibida"**.
- Aparece botón nuevo: **"Pasar a análisis (Carolina M)"**.
- En el bloque "Estado del caso" del drawer aparece un botón para descargar la factura.
- Timeline registra la subida con el nombre del archivo.

## Si falla
- **"Tipo de archivo no permitido"** → solo PDF, JPG o PNG.
- **"Archivo demasiado grande"** → máximo 15 MB. Comprime el PDF o usa otra calidad.
- **"Archivo vacío"** → el archivo tiene 0 bytes; vuelve a descargarlo del email.
- **"Factura subida pero falla al actualizar estado"** → el archivo SÍ se ha guardado. Vuelve a pulsar "Factura recibida" y reintenta.
