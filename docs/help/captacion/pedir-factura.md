---
title: Llamar y pedir factura
section: captacion
audience: telemarketing
keywords: [llamada, factura, esperando, decisor, no contesta, no es decisor, no interesa]
related:
  - captacion/crear-lead
  - captacion/subir-factura
  - captacion/cerrar-caso
---

# Llamar y pedir factura

## Cuándo usar
Tienes un caso en pestaña **"Por llamar"** y vas a llamar al cliente.

## Qué hace
Registra el resultado de la llamada y mueve el caso a la siguiente etapa según lo que diga el cliente.

## Pasos
1. Abre el caso (click en su tarjeta) → drawer con detalle.
2. Llama al cliente.
3. Según resultado, click el botón que toca:
   - **No contesta** → registra intento, sigue en bandeja.
   - **No es decisor** → escribe nuevo nombre + teléfono del decisor.
   - **Esperando factura** → cliente acepta enviar. Rellena email a donde la enviará y fecha prevista (auto: hoy + 3 días).
   - **No interesa** → motivo del catálogo + detalle si eliges "Otro".

## Qué debe pasar
- Toast verde con la acción registrada.
- El caso cambia de pestaña según el resultado:
  - "No contesta" → sigue en "Por llamar".
  - "Esperando factura" → pasa a **"Esperando factura"**.
  - "No interesa" → desaparece, queda como cerrado en "Todos mis casos".
- Timeline registra la actividad con fecha y hora.

## Si falla
- **"Detalle obligatorio si eliges 'otro'"** → escribe el motivo libre antes de cerrar.
- **Toast rojo "Error"** → copia el mensaje y avisa a soporte.
- **No cambia de pestaña** → refresca la página y vuelve a abrir el caso.
