# Módulo de captación — best practices call center + integraciones Google Workspace (1 mayo 2026)

> Aterriza la FASE 41 (sprint Carolina) aplicando conocimiento profesional de la industria call center / sales development B2B y las integraciones específicas con Google Workspace. Sustituye al diseño genérico anterior.

---

## 1. Marco — cómo opera un call center B2B profesional

Una operación de telemarketing B2B madura (HubSpot Sales Hub, Outreach.io, SalesLoft, etc.) tiene 5 capas funcionales que el CRM Valere debe instrumentar:

1. **Ingesta y enriquecimiento de leads.** No se llama a leads "fríos vacíos". Se llama a leads enriquecidos con sector, tamaño, decisor probable y dato de valor (en el caso Valere: SIPS).
2. **Lead scoring y priorización.** Carolina no llama por orden alfabético. Una buena pantalla le dice "este lead es hot por X razones, llámalo primero".
3. **Power dialing y CTI** (Computer-Telephony Integration). Click-to-call desde el CRM, no marcar manualmente.
4. **Cadencia multi-canal.** Llamada + email + LinkedIn + WhatsApp encadenados con timing definido. La industria mide en "secuencias" (sequences) y "touches".
5. **Disposition codes y auto-cadencia.** Tras cada llamada, Carolina marca el outcome con 1-2 clics y el sistema genera la siguiente acción automáticamente (callback +3 días, email +1 día, etc.).

**Métricas que importan en este modelo:**

| Métrica | Definición | Benchmark sector consultoría energética B2B España |
|---|---|---|
| **Connect rate** | % llamadas que conectan con humano (no buzón) | 25-40% |
| **Conversation rate** | % conexiones que generan conversación útil | 30-50% |
| **Qualification rate** | % conversaciones útiles que llegan a "cualificado" | 20-35% |
| **Proposal rate** | % cualificados que reciben propuesta | 50-80% |
| **Win rate** | % propuestas que se cierran | 10-25% |
| **Funnel total llamada→cliente** | producto de los anteriores | 0.5-3.5% |
| **Llamadas/hora** | con power dialer | 18-25 |
| **Llamadas/hora** | sin power dialer (manual) | 8-12 |

Para una operación 1 persona (Carolina): 60-80 llamadas/día → 2-5 clientes/semana es realista con buena herramienta. Sin herramienta, suele caer a 30-40 llamadas/día y 0.5-1 cliente/semana.

**Implicación directa**: el CRM tiene que estar diseñado para **velocidad**, no para "registro completo de información". Cada segundo que Carolina pierde rellenando un campo es 1 llamada menos al día.

---

## 2. La pantalla `/captacion` — diseñada para velocidad

### 2.1 Vista lista de llamadas (home de Carolina cada mañana)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HOY · 47 llamadas pendientes · 8 propuestas en seguimiento             │
│  [Búsqueda CUPS] [+ Nuevo lead] [Importar lote]    Carolina A. ▼        │
├─────────────────────────────────────────────────────────────────────────┤
│  🔥 PRIORITARIAS (HOT) — 6                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 📞 INDUSTRIA TEXTIL ABC SL              2 días sin contactar     │   │
│  │    CUPS: ES0031...A0F  ·  3.0TD  ·  EDistribución               │   │
│  │    Score 92/100  ·  Posible ahorro €4.200/año                   │   │
│  │    [📞 Llamar] [✉ Email] [📅 Programar]                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  (5 más...)                                                              │
│                                                                          │
│  🌡 SEGUIMIENTO (WARM) — 18                                             │
│  ...                                                                     │
│                                                                          │
│  ❄  NUEVOS (COLD) — 23                                                  │
│  ...                                                                     │
│                                                                          │
│  📅 CALLBACKS programados hoy — 3                                       │
│  - 11:30 — Comercial Pérez SA (2ª llamada)                              │
│  - 16:00 — Restaurante El Pino (decisión final)                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Principios de diseño:**

- **Una vista, una acción.** Carolina ve la lista y hace click. No hay 5 menús ni 12 filtros.
- **Lead scoring visual** con color e icono. No se pide a Carolina que decida qué llamar antes.
- **Información mínima viable** en la card: nombre, ahorro estimado, días sin contactar. Lo demás se ve en la llamada.
- **Atajos teclado** desde el día 1: `↓/↑` para navegar, `Enter` para abrir, `C` para llamar, `E` para email, `S` para skip.
- **Densidad razonable**: ~10-15 cards visibles sin scroll en pantalla 1080p.

### 2.2 Vista llamada activa (mientras Carolina está al teléfono)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📞 LLAMANDO · INDUSTRIA TEXTIL ABC SL · 00:42                          │
│  [Colgar] [Mute]                                              ⏱ 0:42    │
├──────────────────────────────────┬──────────────────────────────────────┤
│  DATOS LEAD                      │  GUION & OBJECIONES                  │
│                                  │                                       │
│  CUPS ES0031...A0F               │  ▶ APERTURA                          │
│  Tarifa 3.0TD                    │  "Hola, soy Carolina de Valere       │
│  Comercializadora Endesa         │   Consultores. Llamamos a empresas   │
│  Potencia 80 kW (P1-P3)          │   como la suya porque hemos visto    │
│  Distribuidora EDistribución     │   que la mayoría paga..."            │
│  ── según SIPS, ahora            │                                       │
│                                  │  ▶ OBJECIÓN: "Ya tengo consultor"    │
│  Sector CNAE 1310 (Textil)       │  → "Perfecto. ¿Le importaría que    │
│  Empleados ~15-50 (estimado)     │     le mandara un análisis           │
│                                  │     comparativo gratuito? En 30s..." │
│  Estimación pago €40k-50k/año    │                                       │
│  Estimación ahorro €4.200/año    │  ▶ OBJECIÓN: "No tengo tiempo"       │
│                                  │  → "Solo necesito su CUPS y..."      │
│  Histórico Valere: ninguno       │                                       │
│                                  │                                       │
├──────────────────────────────────┴──────────────────────────────────────┤
│  OUTCOME  [Contactado] [Buzón] [No interesa] [Reunión] [Propuesta enviada] │
│           [Callback] [Lista Robinson] [No es decisor]                    │
│  NOTAS    ┌──────────────────────────────────────────────────────┐      │
│           │ Habló con María, jefa compras. Manda info por email. │      │
│           └──────────────────────────────────────────────────────┘      │
│  PRÓXIMO  ☑ Generar diagnóstico  ☑ Email auto en 5 min  ☐ Callback   ☐ │
└─────────────────────────────────────────────────────────────────────────┘
```

**Por qué funciona:**

- **Toda la info que Carolina necesita en una pantalla.** No tiene que cambiar de tab.
- **Guion contextual + objeciones** a la derecha, accesibles sin abrir docs.
- **Outcome con botones grandes**: 1 click + nota corta. Tiempo medio de cierre <10 segundos.
- **Acciones automáticas pre-marcadas**: si Carolina no toca nada, la próxima acción ocurre sola (envío email, generar diagnóstico, programar callback).

### 2.3 Outcomes y auto-cadencia

Cada outcome dispara automatismos. Ejemplo:

| Outcome | Auto-acción | Siguiente paso |
|---|---|---|
| Contactado interesado | Email diagnóstico en 5 min | Callback +3 días |
| Buzón | — | Email recordatorio +1 día, llamada +3 días |
| No interesa | Cerrar oportunidad como `cerrada_perdida` con motivo | — |
| Reunión | Crear `evento` Google Calendar invitando al contacto | Recordatorio 24h antes |
| Propuesta enviada | Mover oportunidad a `oferta_presentada` | Email follow-up +3 días, llamada +5 días |
| Callback | Crear tarea `llamada` con `fecha_vencimiento` | Aparece en lista del día indicado |
| Lista Robinson | Marcar empresa con flag `no_llamar=true` + auditoría | — |
| No es decisor | Pedir referencia: "¿quién es el responsable energético?" | Crear contacto secundario |

Esto es lo que la industria llama **"plays" o "playbooks"**. Carolina se enfoca en la conversación; el sistema hace el trabajo administrativo.

---

## 3. Cadencia multi-canal — la "secuencia"

Industria call center B2B B2B usa secuencias de **8-12 touches en 14-21 días** mezclando canales. Para Valere/Carolina propongo esta cadencia inicial:

```
Día 1   📞 Llamada 1 + (si no contactado) ✉ Email 1 (mismo día, 1h después)
Día 3   ✉ Email 2 corto recordatorio
Día 5   📞 Llamada 2 + (si no contactado) ✉ Email 3 con caso éxito
Día 8   📱 LinkedIn / WhatsApp si tenemos ese contacto
Día 12  📞 Llamada 3 (última intentona)
Día 15  ✉ Email 4 "rompiendo el silencio" / break-up email
Día 21  Cerrar oportunidad como "cerrada_perdida" motivo `sin_respuesta` o mover a nurture (volver a llamar en 6 meses)
```

**Implementación CRM:**

- Tabla `cadencias` con plantillas (cada paso = `dia_offset`, `canal`, `template_id`, `auto`).
- Hook que al crear una nueva oportunidad asigna cadencia por defecto basada en sector/score.
- Cron diario: para cada lead activo, ejecutar el paso correspondiente (enviar email auto si no se hizo manualmente, crear tarea llamada si toca).
- Carolina puede saltarse pasos manualmente o adelantarlos.

**Email "rompiendo el silencio" (día 15) ejemplo:**

> Asunto: ¿le sigue interesando ahorrar en su factura eléctrica?
>
> Hola María,
>
> No quiero seguir molestándole. Le escribo por última vez. Si en algún momento le interesa retomar el análisis de ahorro que comentamos, escríbame y reabro el caso. Si no, le agradezco igualmente su tiempo.
>
> Saludos,
> Carolina Aroca · Valere Consultores

**Tasas de respuesta benchmark:** los break-up emails tienen 5-15% de respuesta — más que cualquier otro email de la cadencia. Valen oro.

---

## 4. Lead scoring profesional

Carolina necesita que el sistema le diga **a qué leads llamar primero**. Algoritmo simple multiplicativo:

```
score = w1·sector + w2·tamaño + w3·tarifa + w4·recencia + w5·comportamiento

donde:
  sector       = 1.5× (industria) | 1.2× (hostelería) | 1.0× (oficinas) | 0.8× (otros)
  tamaño       = log(empleados / 10) · 10        // ~5-30 puntos
  tarifa       = 25 (6.x) | 18 (3.0TD) | 8 (2.0TD)
  recencia     = 20 si último contacto >30d | 10 si <30d | 0 si activo
  comportamiento = 30 si abrió email | 50 si respondió | 0 si no
```

**Ejemplo industria textil 30 empleados, 3.0TD, abrió email anterior:**
`1.5 × score_base + log(30/10)·10 + 18 + 30 = 1.5 × X + 14.7 + 18 + 30`. Score alto, etiqueta HOT.

**Ejemplo restaurante 5 empleados, 2.0TD, sin email:**
Score bajo, etiqueta COLD. Carolina lo llama solo cuando vacía la cola HOT/WARM.

Implementación:
- Vista materializada `lead_scoring` recalculada cada hora (cron pg_cron).
- Vista `/captacion` consume el score como `ORDER BY DESC`.

---

## 5. Email outbound — best practices con Gmail / Workspace

### 5.1 Deliverability (lo más importante)

Si los emails de Carolina van a spam, **toda la cadencia falla**. Configuración obligatoria del dominio `valereconsultores.com`:

- **SPF**: `v=spf1 include:_spf.google.com ~all`.
- **DKIM**: activar en Google Workspace Admin → Apps → Gmail → Authenticate email. Generar clave 2048-bit y publicar registro DNS.
- **DMARC**: empezar con `v=DMARC1; p=none; rua=mailto:dmarc@valereconsultores.com`. Subir a `quarantine` tras 30 días estables.
- **Reputation**: enviar progresivamente. Carolina **no puede pasar de 0 a 200 emails/día de la noche a la mañana**. Calentar dominio 3-4 semanas si es nuevo.
- **Verificar reputation**: [Google Postmaster Tools](https://postmaster.google.com/) (vinculado al dominio).

### 5.2 Reglas de envío masivo en frío

- **Máximo 100-150 emails/día** desde una sola dirección Gmail (límite Workspace + buenas prácticas anti-spam).
- **Plain text > HTML** para emails de captación. Looks personal, mejor deliverability.
- **Sin imágenes** en el primer email. Disparan filtros.
- **Sin links de tracking obvios**. Puedes usar tracking pero el link debe ir al dominio propio, no a un dominio de tracker.
- **Asunto < 50 caracteres**, sin "URGENTE", sin "GRATIS", sin emojis raros.
- **Una sola CTA** por email. "Responda este email" o "Reserve 15 minutos aquí".
- **Personalización real** ({{nombre}}, {{empresa}}, {{sector}} y referencia a su CUPS).
- **Footer con datos legales obligatorios** (LOPDGDD): nombre Valere Consultores, CIF, dirección, opt-out claro.

### 5.3 Plantilla email diagnóstico inicial (post-llamada)

```
Para: maria.compras@industriatextilabc.es
De: Carolina Aroca <carolina@valereconsultores.com>
Asunto: Diagnóstico energético inicial Industria Textil ABC

Hola María,

Como acabamos de hablar por teléfono, le adjunto el diagnóstico inicial
de su suministro:

  CUPS ES0031...A0F
  Tarifa actual 3.0TD con Endesa
  Estimación pago anual ~€42.000
  Ahorro potencial estimado ~€4.200/año (10%)

El diagnóstico está basado en datos públicos (SIPS) y datos sectoriales
de empresas similares. Para confirmar el ahorro real con sus propios
datos de consumo, necesito 5 minutos para autorizar el acceso a Datadis
(la plataforma del Ministerio).

¿Podemos reservar 15 minutos esta semana?

Un saludo,
Carolina Aroca
Valere Consultores · 91 XXX XX XX
www.valereconsultores.com

PD: Si prefiere no recibir más comunicaciones, responda con "Baja".
```

### 5.4 Enviado desde Gmail API — no SMTP

Detalle técnico **importante**: el email NO se envía desde el backend Supabase con SMTP. Se envía vía **Gmail API con OAuth 2.0** desde la cuenta `carolina@valereconsultores.com`. Razón:

1. El email aparece en el **Sent de Carolina en Gmail**. Cuando el cliente responde, va a su inbox normal y Carolina lo gestiona desde Gmail (no desde el CRM).
2. **Threading**: la respuesta del cliente y el email original quedan en el mismo hilo (Message-Id correcto).
3. **Reputation**: usa los servidores de Google con la reputation del dominio Valere.
4. **Compliance audit**: Workspace guarda copia para retention/eDiscovery.

Implementación:
- Edge Function `send-email-gmail` recibe `{from_user_id, to, subject, body, lead_id}`.
- Usa **service account con domain-wide delegation** (configurado en Workspace Admin) para impersonar al usuario `from_user_id`.
- Llama `users.messages.send` de Gmail API.
- Guarda `gmail_message_id` y `thread_id` en tabla `emails_enviados`.
- Tracking apertura: pixel transparente con UUID que apunta a Edge Function `track-open`.

---

## 6. Compliance regulatorio — INELUDIBLE en España

### 6.1 LOPDGDD + GDPR

- **Base legitimadora del tratamiento**: para llamadas en frío B2B se usa "interés legítimo" (artículo 19 LOPDGDD permite contactar a profesionales en su rol profesional). Pero hay que cumplir:
  - **Información en primera comunicación**: identidad del responsable, finalidad, derechos, dónde reclamar.
  - **Derecho de oposición fácil**: en cada email "para no recibir más comunicaciones, responda BAJA".
  - **Registro de tratamientos**: tabla `auditoria_consentimientos` con fecha, canal, contenido informado.
  - **Plazo de retención**: 1 año desde último contacto, luego anonimizar o eliminar.

- **Cookies**: el portal cliente futuro requiere banner cookies si trackea.

- **Datos personales**: nombre + email profesional + teléfono profesional son datos personales. Tratar como tal.

### 6.2 Lista Robinson

- **ADIGITAL gestiona la Lista Robinson** (lista oficial española de "no contactar comercialmente"). Carolina **debe comprobar** cada lead contra esta lista **antes de llamar** o se expone a sanción (3.000-300.000 € según LOPDGDD).
- **API Lista Robinson**: ADIGITAL ofrece servicio de cotejo a empresas asociadas. Coste ~€200-500/año.
- **Implementación CRM**:
  - Tabla `lista_robinson_excluidos` (sincronizada vía API o import semanal).
  - Trigger: al crear/importar lead, comprobar contra `lista_robinson_excluidos`. Si coincide → flag `no_llamar=true`, no aparece en lista de Carolina.
  - Lista interna `lista_exclusion_valere`: clientes que pidieron no ser contactados directamente. Persistente, NO expirable.

### 6.3 Grabación llamadas (si Valere quiere grabarlas)

Requisitos:
- **Aviso explícito** al inicio: *"Esta llamada puede ser grabada para mejorar la calidad del servicio. Si no está de acuerdo, indíquelo y la pararemos"*. — pero esto NO basta como consentimiento.
- **Para grabar de verdad**: consentimiento expreso + retención <12 meses + acceso restringido + posibilidad de borrado a petición.
- **Recomendación**: NO grabar inicialmente. Añade complejidad legal y técnica. Cuando crezca el equipo y se haga formación con grabaciones, evaluarlo entonces.

### 6.4 Email marketing (Ley 34/2002 — LSSI-CE)

- **Opt-in expreso** para newsletters / campañas masivas (NO para emails 1-1 de seguimiento comercial).
- **Identificación clara** del remitente.
- **Mecanismo de baja gratuito y sencillo**.
- **No usar dirección de "no-reply@"** — debe ser una dirección real que reciba bajas.

---

## 7. Métricas que importan — KPIs reales, no vanity

Dashboard de Carolina y dashboard supervisor (Juan):

### Carolina (vista personal)

```
HOY
  Llamadas realizadas:        47 / objetivo 60
  Conversaciones útiles:      18  (38% connect rate)
  Cualificados:                7  (39% qualification rate)
  Propuestas enviadas:         4
  Tiempo medio llamada:    3:42

ESTA SEMANA
  Funnel:    Llamadas 280 → Conversaciones 102 → Cualificados 35 → Propuestas 14 → Cierres 2
  Win rate cierre:  14% (sobre propuestas semana anterior)
```

### Supervisor (Juan / master)

```
EQUIPO CAPTACIÓN — ESTE MES
  Carolina:    [████████░░] 1.247 llamadas · 96 propuestas · 12 cierres · €38k facturación nueva
  (siguientes...)

EMBUDO MES vs MES ANTERIOR
  Llamadas         -8%
  Conversaciones   +12%
  Cualificados     +25%   ← haciendo mejor calificación
  Propuestas       +18%
  Cierres          +30%
  Facturación      +42%   ← upgrade efectividad

CALIDAD DEL FUNNEL
  Tiempo medio llamada → propuesta:    1.2 días (mes anterior 4.8 días) ← 4× más rápido con CRM
  Coste por cliente captado:           €X (calculado desde tiempo Carolina + telefonía + email)
  LTV cliente nuevo / CAC:             3.2× (sano > 3×)
```

**Vanity metrics que NO debemos mostrar como principal:**

- Total llamadas mes (sin contexto de connect rate, no significa nada).
- Emails enviados (sin tasa de apertura).
- Leads creados (sin score, sin avance funnel).

---

## 8. Integraciones Google Workspace — específicas

Como Valere migra a Google Workspace, todas las integraciones se diseñan **Google-first**, no Office.

### 8.1 Gmail API — envío y sync threading

**Setup:**
- Crear proyecto Google Cloud para Valere CRM (`valere-crm-prod`).
- Habilitar Gmail API.
- Crear **service account** con domain-wide delegation.
- En Workspace Admin → Security → API Controls → Domain-wide delegation: añadir el client_id del service account con scope `https://www.googleapis.com/auth/gmail.send` (mínimo) o `https://www.googleapis.com/auth/gmail.modify` (para sync inbox).
- Guardar credenciales JSON en Supabase Secrets.

**Edge Function `send-email-gmail`:**
- Input: `{from_user_email, to, subject, body, in_reply_to?, lead_id}`.
- Impersona al usuario via service account.
- Construye RFC 822 message + envía via `users.messages.send`.
- Devuelve `gmail_message_id` y `thread_id`.
- Guarda en tabla `emails_enviados` para tracking.

**Edge Function `sync-gmail-replies`** (cron cada 15 min):
- Para cada lead activo con `gmail_thread_id`, llamar a `users.threads.get`.
- Si hay mensajes nuevos del cliente → crear `actividad` tipo `email_recibido` + notificación a Carolina.

### 8.2 Google Calendar — agenda integrada

**Casos de uso:**
- Carolina agenda reunión con cliente → se crea evento en su Google Calendar Y aparece como `evento` en CRM.
- Cliente acepta el invite Calendar → se actualiza `evento.estado='confirmado'`.
- 24h antes del evento → recordatorio Calendar nativo + notificación CRM.

**Setup:**
- Habilitar Calendar API en mismo proyecto Google Cloud.
- Service account con scope `https://www.googleapis.com/auth/calendar.events`.
- Endpoint Edge Function `create-calendar-event`: input lead + datetime → crea evento en calendar Carolina + guarda `event_id` en tabla `eventos`.

**Bidireccional:** opcional cron que sincroniza eventos creados en Calendar (por ejemplo desde Gmail "Reservar reunión") y los importa al CRM.

### 8.3 Google Drive — almacenamiento adicional propuestas

**No sustituir Supabase Storage** (que es la fuente de verdad). Pero **espejar** copias específicas:

- Cuando se genera diagnóstico inicial PDF → guardar en bucket Supabase Storage Y subir a `Google Drive/Valere/Clientes/{empresa.nombre}/Diagnostico_inicial_YYYYMMDD.pdf`.
- Cuando se genera propuesta avanzada → idem.
- **Beneficio**: el equipo Valere puede ver los archivos del cliente desde Drive sin entrar al CRM. Útil para administración, contabilidad y para el cliente final si compartes carpeta.

**Setup**: scope `https://www.googleapis.com/auth/drive.file`. Carpeta raíz `Valere/Clientes/` creada manualmente, subcarpetas por empresa creadas auto al primer documento.

### 8.4 Google Contacts — opcional, no recomendado

Sincronizar contactos CRM ↔ Google Contacts es tentador (Carolina ve los contactos en su móvil al llamar). **Pero genera caos** porque las modificaciones bidireccionales pierden info.

**Alternativa simple**: solo OUT desde CRM → Contacts. Cada nuevo contacto en CRM aparece en Google Contacts de Carolina con etiqueta "Valere CRM". Si Carolina edita en su Google, NO se sincroniza atrás.

### 8.5 Google Identity (SSO) — sustitución login email/password

**Plan ya documentado** en `docs/PLAN_MIGRACION_AUTH_GOOGLE_IDENTITY.md`.

Beneficios extra ahora con Workspace:
- 2FA gestionado por Google.
- Si Juan da de baja a un empleado en Workspace → automáticamente pierde acceso al CRM.
- Onboarding nuevos comerciales: 1 click en Workspace = login CRM.

### 8.6 Google Apps Script — solo si no hay alternativa

Apps Script es tentador para automaciones rápidas pero crea sombras técnicas. **Recomendación**: NO hacer flujos críticos en Apps Script. Que el CRM Supabase + Edge Functions sea la fuente única.

Caso aceptable: un script en Sheets para que Juan analice exports manualmente. **No para flujos productivos**.

### 8.7 Lo que NO hacemos (Office)

Anti-patrones explícitos para esta sesión y futuras:
- ❌ Outlook Add-in / Calendar.
- ❌ OneDrive / SharePoint.
- ❌ SMTP con autenticación Office.
- ❌ Microsoft Identity Provider.
- ❌ Excel exports como primary (usar Google Sheets, Excel solo como fallback).
- ❌ Power Automate / Power BI.

---

## 9. Telefonía — CTI integrable

Carolina necesita **click-to-call** desde la pantalla de captación. Sin esto, es Excel con CRM bonito.

**Opciones evaluadas para una operación 1-3 personas:**

| Provider | Coste/usuario | Workspace integration | Click-to-call CRM | Grabación | Recomendación |
|---|---|---|---|---|---|
| **Aircall** | €30-40/mes | Sí (Gmail, Calendar) | Sí, API REST | Sí | ✅ Top option |
| **Ringover** | €20-30/mes | Sí | Sí | Sí | ✅ Alternativa |
| **CloudTalk** | €25-35/mes | Sí | Sí | Sí | OK |
| **Google Voice** | $10-20/mes | Nativa | Limitado | Sí | Solo USA, no E |
| **Twilio Flex** | Variable | Custom | Sí, requiere dev | Sí | Solo si volumen muy alto |

**Recomendación**: **Aircall** o **Ringover**. Ambos tienen API REST y webhook. La integración CRM:

- **Outbound**: botón `Llamar` en CRM hace POST a Aircall API → cliente desktop Aircall marca → llamada en curso.
- **Inbound**: webhook de Aircall al recibir llamada → Edge Function busca el teléfono en `contactos` → si existe → notifica al frontend abrir ficha.
- **Disposition**: al colgar, Aircall manda webhook con duración + outcome → CRM crea `actividad` tipo `llamada` con esa duración.

**Coste estimado para Valere (1-3 personas)**: €60-120/mes con Aircall. Asumible vs el ROI de subir conversion rate.

---

## 10. Errores típicos que evitar — anti-patrones call center

He visto estos errores en consultoras que lanzaron CRM telemarketing y fracasaron. Apuntar para evitarlos:

### 10.1 "El CRM con 50 campos obligatorios"

**Síntoma**: cada lead tiene que tener nombre, apellidos, teléfono fijo, móvil, email, web, dirección, CP, ciudad, provincia, sector, CNAE, empleados, facturación... antes de poder llamar.

**Resultado**: Carolina nunca rellena nada y rompe el CRM.

**Solución**: campos mínimos obligatorios para crear lead son **2**: nombre empresa + algo para contactar (teléfono o email). Todo lo demás se enriquece automáticamente o queda vacío.

### 10.2 "Dashboards bonitos sin acción"

**Síntoma**: pantalla con 12 gráficos coloridos pero ningún botón "actuar".

**Solución**: cada métrica que se muestra debe responder a "¿y si esto sube/baja, qué hago?". Si no hay acción asociada, no se muestra.

### 10.3 "Vigilancia agresiva del comercial"

**Síntoma**: el supervisor mide tiempo entre llamadas, tiempo en pausa, etc. Carolina se siente vigilada y deja la empresa.

**Solución**: medir output (conversaciones útiles, propuestas, cierres), no input minuto a minuto. Solo medir input agregado mensual para detectar burnout.

### 10.4 "Cadencia ignora respuestas"

**Síntoma**: cliente responde "no me interesa" y al día siguiente recibe el siguiente email automático de la cadencia.

**Solución**: clasificación automática de respuestas. Cualquier respuesta con palabras clave ("baja", "no interesa", "stop", "molestar") → pausa cadencia inmediatamente y notifica a Carolina.

### 10.5 "Sin segregación de canales"

**Síntoma**: leads de Canal 1 (Carolina), Canal 2 (comerciales) y Canal 3 (cartera) en el mismo embudo, sin distinguir origen.

**Solución**: campo `origen_canal` en `oportunidades` con CHECK ('telemarketing','comercial','cartera','referido','web','feria'). Vistas filtradas por origen. KPIs separados por canal.

### 10.6 "Diagnostic fatigue"

**Síntoma**: la herramienta puede generar 1000 diagnósticos rápido y empieza a generar diagnósticos de baja calidad indistinguibles.

**Solución**: límite humano, calidad sobre volumen. Si Carolina llama y el lead no es real, no se genera diagnóstico (waste de email + reputation Gmail).

---

## 11. Roadmap actualizado — FASE 41 con todas estas mejoras

Dimensionamiento más realista que el anterior:

### FASE 41 — Sprint Carolina v2 (10-12 días, no 5-6)

| Día | Sub-fase | Tarea |
|---|---|---|
| 1 | 41.1 | Schema: `cadencias`, `lead_scoring`, `emails_enviados`, `lista_robinson_excluidos`, `lista_exclusion_valere`, `auditoria_consentimientos`. Campo `origen_canal` en oportunidades. Flag `no_llamar` en empresas. |
| 2-3 | 41.2 | Edge Function `sips-lookup` |
| 4 | 41.3 | Heurísticas sectoriales + tabla CNAE |
| 5-6 | 41.4 | Generador PDF diagnóstico inicial |
| 7-8 | 41.5 | Pantalla `/captacion` lista + atajos teclado |
| 9 | 41.6 | Pantalla llamada activa + outcomes + auto-cadencia |
| 10 | 41.7 | Edge Function `send-email-gmail` con service account |
| 11 | 41.8 | Plantillas email + sistema cadencia básico (paso 1 manual, resto auto) |
| 12 | 41.9 | Compliance: import Lista Robinson + auditoría consentimientos + opt-out automático |

### FASE 41-bis — Telefonía (3-4 días, posterior si Juan adquiere Aircall/Ringover)

| Día | Tarea |
|---|---|
| 1 | Setup Aircall: cuenta, números, asignar a Carolina |
| 2 | Webhook handler en Edge Function: outbound disposition, inbound notification |
| 3 | Botón click-to-call en pantalla `/captacion` |
| 4 | Auto-creación `actividad llamada` desde webhooks Aircall |

### FASE 41-ter — Google Workspace integraciones (3 días, paralelo)

| Día | Tarea |
|---|---|
| 1 | Setup Google Cloud project + service account + domain-wide delegation |
| 2 | Edge Function calendar-create-event + sync básico CRM↔Calendar |
| 3 | Google Drive espejo de PDFs generados |

### FASE 41-quad — Lead scoring activo (2 días, paralelo)

| Día | Tarea |
|---|---|
| 1 | Vista materializada `lead_scoring` + cron pg_cron horario |
| 2 | Pantalla `/captacion` ordena por score + badges HOT/WARM/COLD |

**Total Sprint Carolina completo**: 18-20 días repartidos en ~4 semanas con paralelismo.

---

## 12. Anti-patrones específicos para Valere

Dado que Valere es **consultora pequeña con poco presupuesto**, evitar:

### 12.1 No comprar Salesforce / HubSpot Pro

Coste 100-200€/usuario/mes. Para 3 usuarios = €4.000-7.000/año. Con el desarrollo del CRM propio que ya tenéis, NO es necesario. Salesforce/HubSpot tendrían sentido si tuvierais un equipo de 20+ comerciales sin tiempo para construir software.

### 12.2 No usar Apollo.io / ZoomInfo para lead generation

Coste variable €100-500/mes según volumen. Para España, los datos de calidad son limitados. **Para B2B energético español, mejor**:

- **eInforma** (suscripción comercial Informa D&B): bases de datos empresas españolas con NIF + CNAE + facturación + empleados + dirección. ~€1.500-3.000/año.
- **Axesor**: alternativa más barata, datos algo menos profundos. ~€600-1.200/año.
- **Lista propia** que Carolina construye con criterios + enriquecimiento SIPS.

### 12.3 No automatizar antes de tener flujo manual estabilizado

**Regla**: NO automatices nada que Carolina no haya hecho manualmente al menos 100 veces. Si automatizamos prematuramente, automatizamos un proceso malo.

Ejemplo: el envío automático del email diagnóstico tras cierta condición. Antes Carolina debe enviar manualmente 100 diagnósticos para que sepamos qué plantilla funciona, qué objeto encaja, en qué contextos NO se debe enviar. Después automatizamos.

### 12.4 No tracking obsesivo de Carolina

Mostrar métricas a Carolina **es bueno** (motivante, retroalimentación). Mostrar métricas detalladas **a Juan/supervisor** debe limitarse a agregados semanales. Tracking minuto-a-minuto convierte el trabajo en infierno y la rotación se dispara.

---

## 13. Decisiones que necesito de Juan antes de empezar

Para construir bien `/captacion` necesito tu input en 7 puntos concretos:

1. **¿Telefonía?** ¿Aircall, Ringover, o seguimos con teléfono fijo/móvil sin CTI inicialmente?
2. **¿Volumen real Carolina?** ¿cuántas llamadas/día hace ahora? ¿propuestas/semana?
3. **¿Origen leads?** ¿lista comprada (¿qué proveedor?), heredada de Excel, web (formulario), search activo Carolina?
4. **¿Cadencia actual?** ¿llama una vez y si no contesta deja? ¿reintenta? ¿cuántos toques?
5. **¿Plantilla email actual?** ¿la tiene escrita o improvisa cada vez?
6. **¿Lista Robinson cumple Valere actualmente?** ¿checkea contra ADIGITAL antes de llamar o no?
7. **¿Setup Google Workspace?** ¿Juan tiene admin? ¿podemos crear service account y dar domain-wide delegation?

Con estas 7 respuestas, puedo dimensionar el sprint más exactamente y empezar.

---

## 14. Resumen ejecutivo

- **Diseño optimizado para velocidad**: 60-80 llamadas/día con info contextual y outcome 1 click.
- **Cadencia 8-12 touches en 14-21 días** mezclando llamada + email + LinkedIn + WhatsApp.
- **Lead scoring** algorítmico simple, refrescado cada hora.
- **Compliance LOPDGDD + Lista Robinson** desde día 1 — no opcional.
- **Gmail API + service account + DKIM/SPF/DMARC** para deliverability.
- **Aircall/Ringover** como CTI recomendado.
- **Google Calendar / Drive / Identity** como integraciones nativas (no Office).
- **18-20 días Sprint completo** en 4 semanas con paralelismo.
- **ROI esperado**: tiempo medio llamada→propuesta cae de 5-7 días a horas; conversión total funnel sube 2-4×.

— Cowork, 1 mayo 2026.
