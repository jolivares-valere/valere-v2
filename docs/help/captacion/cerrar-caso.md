---
title: Cerrar caso (ganada / perdida / pedir visita)
section: captacion
audience: telemarketing
keywords: [cerrar, ganada, perdida, motivo, visita, seguimiento, programar, acepta, rechaza]
related:
  - captacion/enviar-propuesta
---

# Cerrar caso o continuar seguimiento

## Cuándo usar
Has llamado al cliente tras enviarle la propuesta y vas a registrar el resultado.

## Qué hace
Cierra el caso (ganada o perdida) o lo pasa a otro responsable / programa próximo contacto.

## Pasos
1. Abre el caso en pestaña **"Seguimientos"**.
2. Click el botón que toca:
   - **Cliente acepta** → cierra como ganada. Nota opcional con detalles.
   - **Cliente rechaza** → motivo del catálogo. Si eliges **"Otro motivo"**, el detalle libre es **obligatorio**.
   - **Pedir visita** → manda el caso a un asesor senior con una nota explicativa (obligatoria).
   - **Programar próximo contacto** → fecha futura, sigue en bandeja.

## Qué debe pasar
- **Acepta / Rechaza**: toast verde, drawer cierra, caso sale de "Seguimientos" y queda en "Todos mis casos" con badge "Cerrado".
- **Pedir visita**: caso pasa al asesor senior, sigue en "Todos mis casos" pero ya no en tu bandeja activa.
- **Programar contacto**: timeline registra fecha y nota; el caso sigue en "Seguimientos".
- BD registra `etapa = cerrada_ganada` o `cerrada_perdida` según el caso, y `motivo_perdida_codigo` cuando aplica.

## Si falla
- **"Detalle obligatorio si eliges 'otro'"** → escribe el motivo libre, no puede estar vacío.
- **"Añade contexto para el asesor senior"** → la nota es obligatoria al pedir visita.
- **"No hay asesores senior"** → avisa a Juan para que asigne la función.
- **Toast rojo con mensaje técnico** → copia y avisa a soporte.
