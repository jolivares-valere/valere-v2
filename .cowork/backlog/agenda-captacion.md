# BACKLOG — Agenda interna de captación + estrategia calendario

**Estado:** BACKLOG. NO arrancar. Esperar trigger explícito (ver más abajo).
**Origen:** dictamen Juan + ChatGPT 2026-05-05 cierre jornada.
**Tipo:** sprint estratégico de UX comercial. Cambio de modelo, no de UI.

---

## Por qué este backlog existe

Carolina Aroca es **llamadora a la antigua usanza**. No tiene alta práctica tecnológica. El sistema actual le permite ver casos pero no le dice "a quién llamar hoy a las 10:00 y por qué". Hoy lo lleva en cabeza y en notas externas.

Si esto crece a 50+ prospectos activos, Carolina pierde el hilo. La intuición de Juan es correcta: hace falta una capa de acción diaria. **Pero no es un calendario tradicional**. Es una pestaña "Hoy" + agenda interna ligera.

---

## Trigger para arrancar este sprint

Arrancar SOLO si se cumple **al menos uno** de estos 4 síntomas en uso real:

1. Carolina dice literalmente *"no sé a quién llamar hoy"* o *"se me pasan seguimientos"*.
2. Juan detecta leads sin tocar durante varios días en bandejas de Carolina.
3. Hay más de 20-30 prospectos activos por persona.
4. El equipo empieza a llevar la agenda fuera del CRM (post-it, libreta, WhatsApp con uno mismo).

**Si no se cumple ninguno → NO arrancar.** Es sobreconstrucción.

---

## Principio rector

```
El CRM (Captación) sigue siendo la fuente de verdad.
La agenda solo responde: "¿Qué hago, cuándo y con quién?"
La agenda NO duplica datos. Solo orquesta el orden del día.
```

Calendario externo (Google) **NO** es la base. Es capa opcional posterior.

---

## Plan por fases — orden estricto

### FASE 1 — Agenda interna en /captacion (sin Google Calendar)

Lo mínimo viable. Validar concepto antes de integrar nada externo.

#### 1.1 — Modelo de datos

Tabla nueva `captacion_eventos`:

```sql
CREATE TABLE public.captacion_eventos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidad_id  uuid NOT NULL REFERENCES public.oportunidades(id) ON DELETE CASCADE,
  empresa_id      uuid NOT NULL REFERENCES public.empresas(id),
  responsable_id  uuid REFERENCES public.user_profiles(id),
  tipo_evento     text NOT NULL CHECK (tipo_evento IN (
    'llamada','reclamar_factura','seguimiento_propuesta','analisis_factura',
    'visita','recuperar_contacto','vencimiento_90','vencimiento_60','vencimiento_30','otro'
  )),
  titulo          text NOT NULL,
  descripcion     text,
  fecha_inicio    timestamptz NOT NULL,
  fecha_fin       timestamptz,
  estado          text NOT NULL DEFAULT 'pendiente' CHECK (estado IN (
    'pendiente','realizado','reprogramado','cancelado','sin_respuesta'
  )),
  -- Para Fase 2 cuando integremos Google Calendar
  google_calendar_id text,
  google_event_id    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES public.user_profiles(id),
  deleted_at      timestamptz
);

-- RLS: visible para responsable, creador, admin/senior
-- Trigger: actualizar updated_at en cada UPDATE
```

#### 1.2 — Pestaña "Hoy" en /captacion

UX clave para Carolina. Lista de acciones del día ordenada por hora.

```
┌─────────────────────────────────────────────┐
│ HOY — martes 6 de mayo                      │
│                                             │
│ 10:00  Herba Ricemills                      │
│        Reclamar factura · 954 589 200       │
│        [Llamado] [No contesta] [Reprogramar]│
│                                             │
│ 11:30  Mariscos Castellar                   │
│        Seguimiento propuesta enviada        │
│        [Llamado] [No contesta] [Reprogramar]│
│                                             │
│ 12:00  S.A.T. Royal                         │
│        Recuperar contacto · sin respuesta x2│
│        [Llamado] [No contesta] [Reprogramar]│
└─────────────────────────────────────────────┘
```

**Reglas UX firmadas con ChatGPT:**

- Botones GRANDES. No iconos pequeños.
- Sin jerga técnica: nada de "evento", "workflow", "etapa_operativa". Solo "llamada", "factura pendiente", "propuesta enviada", "volver a llamar".
- Cada fila debe contener todo lo necesario para llamar SIN abrir el drawer: empresa, motivo, teléfono, último resultado.
- Click en empresa → abre drawer con detalle. Pero el flujo principal NO requiere abrir drawer.
- Acciones rápidas (botones grandes):
  - **Llamado** → marca evento como `realizado` + abre form rápido para registrar resultado.
  - **No contesta** → marca como `sin_respuesta` + crea automáticamente nuevo evento +1 o +2 días.
  - **Reprogramar** → datepicker simple, fecha nueva.
  - **Añadir nota** (botón secundario) → textarea de 1 frase.

#### 1.3 — Reglas automáticas de creación de eventos

El sistema crea eventos solos cuando Carolina toma acciones que ya existen:

| Acción Carolina hace HOY | Evento que crea el sistema |
|---|---|
| Marca "cliente acepta enviar factura" + fecha prometida | `reclamar_factura` en la fecha prometida 10:00 |
| Marca "recordatorio enviado" | `reclamar_factura` en +2 días |
| Marca "propuesta enviada" | `seguimiento_propuesta` en +3 días |
| Marca "no contesta" en una llamada | `llamada` en +1 día (o +2 si es 2ª vez sin contestar) |
| Lead tiene `fecha_vencimiento_contrato_prospecto` | NO crear evento masivo desde día 1. Crear solo cuando entra en ventana ≤90 días |

**Regla de oro:** el sistema NUNCA crea más de 1 evento futuro por oportunidad. Si ya existe un evento `pendiente`, no crea otro hasta que el actual se cierre. Evita ruido.

#### 1.4 — Timeline bidireccional con actividades

Cuando un evento se cierra:
- `realizado` → crea actividad tipo `llamada` con resultado.
- `sin_respuesta` → crea actividad tipo `llamada` con resultado `sin_respuesta`.
- `reprogramado` → no crea actividad, solo actualiza fecha.
- `cancelado` → no crea actividad.

El timeline del lead muestra todo: comentarios + actividades + eventos cerrados. Una sola línea de la verdad.

#### 1.5 — Vista calendario semanal interna

Solo después de que la pestaña "Hoy" funcione bien.

Vista: 5 columnas (lunes-viernes), eventos como bloques con color según tipo:
- 🔵 Azul — llamada / recuperar_contacto
- 🟡 Amarillo — reclamar_factura / analisis_factura
- 🟠 Naranja — seguimiento_propuesta
- 🔴 Rojo — vencimiento_30 (urgente)
- 🟢 Verde — visita

NO hace falta drag & drop en V1. Click en bloque → abre drawer del lead.

---

### FASE 2 — Integración Google Calendar (opcional, posterior)

**Solo arranca si la Fase 1 está validada con uso real ≥2 semanas.**

#### 2.1 — Calendarios separados (no uno solo)

Un calendario por rol/persona, todos compartidos con Juan:

| Calendario | Eventos que recibe |
|---|---|
| **Captación — Carolina A** | llamada, reclamar_factura, seguimiento_propuesta, recuperar_contacto |
| **Análisis — Carolina M** | analisis_factura, preparar_propuesta_estandar |
| **Asesor senior — Antonio / Juan** | visita, llamada_senior, propuesta_compleja |
| **Dirección comercial — Juan** | vista agregada, solo hitos: vencimientos críticos, visitas, casos alto potencial |

#### 2.2 — Formato de evento en Google Calendar

Título: `[CAPTACIÓN] Herba — Reclamar factura`

Descripción:
```
Lead: Herba Ricemills (División Arroz - Hisparroz)
Acción: reclamar factura prometida
Teléfono: 954 589 200
Email: info@herba.es
Estado en CRM: esperando factura
Última llamada: 05/05 — sandra no decisora
Notas: gran consumidor, contacto en 2024 era Sandra
Link: https://valere-v2.pages.dev/captacion?oportunidad=<id>
```

#### 2.3 — Sincronización CONTROLADA

**Desde CRM hacia Calendar:** SÍ
- Crear evento al crear evento en CRM.
- Actualizar fecha si el evento se reprograma en CRM.
- Cancelar evento si la oportunidad se cierra.

**Desde Calendar hacia CRM:** NO al principio
- Si Carolina mueve un evento en Google Calendar manualmente, el cambio NO vuelve al CRM en MVP.
- Razón: evita que Calendar se convierta en fuente de verdad paralela y se desincronice.
- Si en uso real se demuestra necesidad, se añade webhook bidireccional en sprint posterior.

---

### FASE 3 — Dashboard alimentado por agenda (futuro)

El día que se haga el Dashboard comercial (otro backlog), debe leer de `captacion_eventos` para mostrar:

- **Acciones de hoy** (eventos pendientes hoy).
- **Acciones vencidas** (eventos pendientes con `fecha_inicio < now()`).
- **Seguimientos pendientes** (eventos tipo `seguimiento_propuesta`).
- **Vencimientos 90/60/30** (eventos tipo `vencimiento_*`).
- **Carga por persona** (count de eventos pendientes por `responsable_id`).

Esto cierra el bucle: agenda → dashboard → orden del día.

---

## Lo que NO hacer (firmado con ChatGPT)

- ❌ Sincronización bidireccional Google Calendar en MVP.
- ❌ Calendarios "inteligentes" con IA que sugieren horarios.
- ❌ Notificaciones push o email automatizadas.
- ❌ IA predictiva (qué cliente va a aceptar).
- ❌ Drag & drop en V1.
- ❌ Múltiples calendarios compartidos antes de validar uso real con uno.
- ❌ Crear eventos masivos para todos los vencimientos desde día 1.

---

## Criterio de éxito (test final)

Carolina abre `/captacion` por la mañana. En **menos de 10 segundos** sabe:

1. A quién tiene que llamar hoy.
2. Por qué (motivo claro).
3. Qué teléfono usar.
4. Qué pasó la última vez con ese cliente.
5. Qué botón pulsar después de la llamada.

Si necesita pensar más de 10 segundos, el diseño falla.

---

## Decisiones arquitectónicas firmadas

1. **Tabla `captacion_eventos` separada de `actividades`.** Las actividades son historial pasado; los eventos son acción futura. Mezclar conceptos confunde.
2. **No usar `eventos` polimórfica existente.** Esa tabla es para calendario CRM cliente. Captación tiene su propio modelo más simple.
3. **Google Calendar es capa de comodidad.** Si falla, agenda interna sigue funcionando. NO debe ser bloqueante.
4. **Agenda no envía emails al cliente.** Solo organiza el día interno. Si en futuro queremos email automático "te llamaremos el martes", es scope propio.
5. **Una persona = un calendario en Fase 2.** No mezclar calendarios. Cada uno ve solo lo suyo + el agregado de dirección si aplica.

---

## Referencias y dependencias

- Helper `siguienteAccionLead(etapa, fecha)` en `src/features/captacion/utils/vencimiento.ts` — base lógica para "qué tipo de evento crear".
- Vista `v_captacion_todos_mis_casos` ya expone `responsable_actual_id` y `created_by` — base para asignar responsable al evento.
- `fecha_vencimiento_contrato_prospecto` ya existe en `oportunidades` — base para los eventos tipo `vencimiento_90/60/30`.

Por tanto: cuando arranque este sprint, **el 60% de la lógica ya está en código**. Es composición, no invención.

---

## Estimación de scope cuando llegue el trigger

- **Fase 1 (agenda interna):** 1-2 sesiones cowork de ~3h cada una.
  - Migration tabla + RLS.
  - Hook `useEventosCaptacion`.
  - Componente `<PestañaHoy>`.
  - Lógica de creación automática de eventos.
  - Integración con timeline existente.
- **Fase 2 (Google Calendar):** 1 sesión + creación de credenciales OAuth Google.
- **Fase 3 (dashboard alimentado por eventos):** dependiente de cuando se haga Dashboard.

---

## Nota de cierre

Lo que pide Carolina al final NO es un calendario. Es:

> *"una lista clara de a quién llamar hoy"*

Empieza por ahí. Lo demás es valor añadido posterior.
