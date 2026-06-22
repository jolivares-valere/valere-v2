---
title: Pestaña Enviados y recordatorios al responsable
section: captacion
audience: telemarketing, master, asesor_senior
keywords: [enviados, handoff, análisis, asesor senior, sla, recordatorio, email, resend, días sin movimiento, notificación, urgencia]
related:
  - captacion/pasar-a-analisis
  - captacion/seguimiento-tras-handoff
  - analisis-captacion/recibir-caso
  - cartera-senior/preparar-y-subir-propuesta-senior
---

# Pestaña "Enviados" y recordatorios al responsable

## Qué es
Pestaña dentro de `/captacion` que muestra los casos que tú iniciaste y que **ya no son tuyos** porque los pasaste a Carolina M (análisis) o a un asesor senior (Antonio / Juan). Te permite seguirles la pista sin perder el contexto, y recordar al responsable cuando llevan demasiado tiempo parados.

## Cómo acceder
Pestaña **"Enviados"** entre Propuestas para enviar y Histórico dentro de `/captacion`. El contador entre paréntesis indica cuántos casos enviados tienes en seguimiento.

## Qué ves en cada card

| Elemento | Significado |
|---|---|
| Nombre empresa + NIF | Cliente del caso |
| Badge "→ Análisis" o "→ Asesor senior" | A quién se lo pasaste |
| "En manos de: [persona]" | Responsable actual concreto |
| Chip SLA verde / amarillo / rojo | Cuántos días lleva sin movimiento |
| "Enviado hace Xd" | Tiempo desde el último handoff |
| Importes (valor estimado / ahorro) | Si están registrados |
| Etapa actual | En qué punto del flujo está |
| Botón 🔔 "Recordar a [persona]" | Para empujar al responsable cuando se atasca |

## SLA — código de colores

| Color | Significado |
|---|---|
| 🟢 Verde | Movimiento reciente, todo OK |
| 🟠 Amarillo | 3 días o más sin movimiento — empieza a estar parado |
| 🔴 Rojo | 5 días o más sin movimiento — llamada de atención |

El SLA se calcula sobre la fecha de última actualización del caso (cualquier cambio de etapa, comentario o nota cuenta como "movimiento").

## Cómo recordar al responsable

1. Click en el botón **🔔 "Recordar a [persona]"** en la card del caso.
2. Se abre modal **"Recordar a [persona]"** con:
   - Caso (nombre de la empresa)
   - Textarea "Mensaje" (máximo 2000 caracteres)
3. Escribe el mensaje (ej: *"¿Habéis revisado la factura? El cliente preguntó por la propuesta hoy"*).
4. Click **"Enviar recordatorio"**.

### Qué pasa al enviar el recordatorio
1. **Notificación dentro del CRM** — la persona ve un punto rojo en la campana del topbar.
2. **Email a su buzón** (Resend) — llega a su email con asunto "[Valere CRM] Recordatorio sobre [empresa]" y enlace directo al caso.
3. Queda **registrado en el historial del cliente** (timeline del drawer) como "Recordatorio enviado a [persona]" con tu mensaje.

## Quién puede mandar recordatorios
- El **creador** del lead (típicamente Carolina A).
- Cualquier **admin** o **asesor senior**.

Si no eres ninguno de esos para ese caso, no verás el botón.

## Qué empresas aparecen aquí

| Tu rol | Qué casos ves en Enviados |
|---|---|
| Telemarketing (Carolina A) | Casos que tú creaste y pasaste a otro |
| Analista (Carolina M) | Casos que tú creaste y pasaste a senior (raro) |
| Asesor senior (Antonio) | Idem |
| Master / admin | Todo el pipeline en seguimiento cruzado |

Si tienes 0 enviados verás el mensaje **"No tienes casos enviados pendientes de respuesta."** Eso significa o que no has hecho handoffs, o que todo lo que enviaste ya está cerrado.

## Coordinación con otros tabs
- Tras pulsar "Pasar a análisis" o "Pedir visita" en la card del cliente, el caso aparece automáticamente aquí.
- Cuando el receptor cierra el caso (ganada/perdida), desaparece de Enviados.
- Si el caso vuelve a ti (handoff devuelto), también desaparece de Enviados.

## Si algo falla
- **No veo el botón Recordar** — no eres creador ni admin/senior del caso.
- **"No puedes recordarte a ti mismo"** — el caso ya está en tus manos otra vez.
- **"Solo el creador puede mandar recordatorio"** — pídeselo a quien creó el lead.
- **Toast rojo al enviar** — comprueba conexión. Si persiste, copia el mensaje y avisa a soporte.
- **No llega el email** — la notificación CRM sí se crea aunque el email falle. Comprueba la campana del responsable.
