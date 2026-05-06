---
title: Vencimiento del contrato del prospecto y semáforo
section: captacion
audience: [telemarketing, asesor_senior]
keywords: [vencimiento, contrato, semáforo, urgente, prioridad, 90 60 30 días, fecha, contrato actual, prospecto, fuente, caduca, expira]
related:
  - captacion/crear-lead
  - captacion/pasar-a-analisis
---

# Vencimiento del contrato del prospecto y semáforo

## Cuándo importa
Cuando sabes (o estimas) cuándo le vence al prospecto el contrato que tiene actualmente con su comercializadora. Es el dato comercial más potente que tienes para decidir a quién llamas hoy.

## Qué es y por qué es importante
**No es un contrato de Valere.** Es la fecha en la que el prospecto puede cambiar libremente de comercializadora sin penalización (o con penalización conocida). Si el contrato vence en 25 días, urge llamar; si vence en 8 meses, la prioridad es otra.

El sistema convierte ese dato en un **semáforo de colores** que aparece en la card y en el drawer, y modifica el texto de "siguiente acción" para que veas qué urge sin abrir nada.

## Cómo registrar la fecha

### Al crear un lead nuevo
1. En `/captacion`, click **"+ Nuevo lead"**.
2. Despliega **"+ Datos adicionales"**.
3. Baja al bloque **"Vencimiento contrato actual del prospecto"** al final del modal.
4. Rellena:
   - **Fecha vencimiento contrato:** la que conoces o estimas.
   - **Fuente del dato:** elige una de las opciones (ver más abajo).
   - **Notas vencimiento:** observaciones libres (penalización, condiciones, etc.).
5. Crea el lead. La fecha queda guardada con el caso.

### Al editar un lead existente
1. Abre el caso → click **"Editar"** (lápiz arriba a la derecha del drawer).
2. En el modal, baja a la sección **"Vencimiento contrato actual"**.
3. Rellena los mismos tres campos.
4. Guarda. Al reabrir el drawer verás el bloque coloreado del semáforo.

## Fuentes del dato
La fuente te ayuda a saber cómo de fiable es la fecha:
- **Cliente lo dijo en llamada:** el cliente te lo confirmó por teléfono.
- **Aparece en la factura:** lo viste impreso en una factura del cliente.
- **Email del cliente:** te lo confirmó por email.
- **Estimado por nosotros:** no lo sabe el cliente, lo calculamos por contexto (sector, comercializadora típica, antigüedad).
- **Desconocido:** no tienes información fiable.

## El semáforo
| Color | Cuándo | Significado |
| --- | --- | --- |
| 🔴 Rojo | Vence en ≤30 días | Urgente. Llamar ya. |
| 🟠 Naranja | Vence en ≤60 días | Prioridad alta. |
| 🟡 Amarillo | Vence en ≤90 días | Iniciar contacto, plazo cómodo. |
| 🟢 Verde | Vence en >90 días | Seguimiento futuro. |
| ⚫ Vencido | Fecha pasada | Cliente está fuera de contrato; ventana abierta. |
| Sin badge | No hay fecha | El sistema no muestra nada. No molesta. |

**Detalle clave:** 90 días entran en amarillo (no en verde). Es el umbral comercial donde empiezas a llamar.

## Dónde ves el semáforo

### En la card de la bandeja
Debajo del NIF de la empresa aparece un badge pequeño con el color y el texto **"Vence en X días"**. Si no hay fecha, no aparece nada — la card no se llena de ruido.

### En el texto "siguiente acción" de la card
La línea con flecha (→) cambia según la urgencia:
- **Vencimiento ≤30 días:** *"Urgente: vence en X días — llama ya"*
- **Vencimiento ≤60 días:** *"Prioridad alta: vence en X días"*
- **Vencimiento ≤90 días:** *"Contactar ya: vence en X días"*
- **Vencimiento >90 días o sin fecha:** mensaje normal de la etapa (ej: "Llamar para presentar Valere").

Así ves en una línea qué urge llamar sin abrir el drawer.

### En el drawer
Más abajo del drawer hay una sección **"Vencimiento contrato actual del prospecto"** que muestra:
- La fecha exacta.
- Bloque coloreado con el semáforo.
- La fuente del dato.
- Las notas que añadiste.

Si no has registrado fecha, ves un bloque **"Sin fecha registrada"** con el texto que te invita a editar el lead para añadirla.

## Qué pasa si no hay fecha
- La card no muestra badge.
- El texto "siguiente acción" usa el mensaje normal de la etapa.
- El drawer muestra el placeholder "Sin fecha registrada".

No es un error. Mucha información comercial se descubre con el tiempo: si hoy no sabes la fecha, registra el lead sin ella y la añades cuando la sepas.

## Si falla
- **Pongo fecha y al guardar no aparece el semáforo** → cierra y reabre el drawer; el detalle se carga al abrir.
- **El semáforo dice "Vencido" y la fecha es futura** → revisa el formato de la fecha (debe ser dd/mm/aaaa).
- **El badge aparece pero el color no coincide** → confirma los días que faltan; <30 rojo, <60 naranja, <90 amarillo (90 incluido), >90 verde.
- **No veo el bloque de vencimiento al editar** → el bloque está al final del modal de edición, antes de "Notas". Haz scroll dentro del modal.
