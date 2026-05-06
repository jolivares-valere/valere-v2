---
title: Crear lead nuevo
section: captacion
audience: telemarketing
keywords: [lead, nuevo, alta, captación, llamada, prospecto, empresa, contacto, vencimiento, contrato actual]
related:
  - captacion/pedir-factura
  - captacion/cerrar-caso
  - captacion/vencimiento-y-semaforo
  - captacion/separacion-prospecto-cliente
---

# Crear lead nuevo

## Cuándo usar
Cuando alguien (web, recomendación, base fría, contacto previo) te pasa una empresa para llamar.

## Qué hace
Crea empresa + contacto + oportunidad en un solo paso. La empresa nace como **prospecto** (no aparece en /empresas del CRM hasta que firmemos contrato). El caso aparece en tu pestaña "Por llamar".

## Pasos
1. En `/captacion`, click **"+ Nuevo lead"** arriba a la derecha.
2. Rellena los **obligatorios**: nombre de empresa y teléfono.
3. Si quieres, despliega **"+ Datos adicionales"** para añadir más información.
4. Click **"Crear lead"**.

## Qué puedes añadir en "+ Datos adicionales"
Bloque opcional al final del modal. Todo lo de aquí se puede completar después desde el botón Editar del drawer.

- **NIF/CIF**, email empresa, ciudad.
- **Segmento:** industrial / comercial / servicios / agrícola / residencial colectivo.
- **Origen:** base fría / web / recomendación / contacto previo / otro.
- **Notas iniciales:** contexto, referencia, observaciones.
- **Vencimiento contrato actual del prospecto:** si ya sabes cuándo le vence el contrato actual al cliente, anótalo aquí. Activa el semáforo 90/60/30 días en la card. Detalles en el doc específico de vencimiento.
- **Contactos:** uno o varios. Marca uno como principal con la estrella.

## Qué debe pasar
- Toast verde "Lead creado" abajo a la derecha.
- El modal se cierra.
- El caso aparece en pestaña **"Por llamar"** y en **"Todos mis casos"**.
- Se abre automáticamente el drawer con el detalle del lead.

## Si falla
- **"Mínimo 2 caracteres"** en empresa → escribe al menos 2 letras.
- **"Teléfono mínimo 6 dígitos"** → completa el teléfono.
- **"Email inválido"** → revisa el formato del email (o déjalo vacío si no lo tienes).
- **Toast rojo con mensaje técnico** → copia el mensaje y avisa a soporte.
