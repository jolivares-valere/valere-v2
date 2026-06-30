# Dossier de soporte — Revisión con Carolina, módulo Captación

**Fecha reunión:** 2026-05-19
**Asistentes:** Juan + Carolina Aroca (telemarketing)
**Objetivo:** recoger feedback de uso real con la pantalla `/captacion` y decidir qué mejorar para que Carolina pueda trabajar fluido sin fricciones.
**Preparado por:** Cowork, basado en el estado actual del repo, los outbox previos y el plan Carolina-as-engine (2026-05-01).

> **Regla #0 firmada con ChatGPT 2026-05-05:** *"el riesgo ya no es técnico, es sobreconstruir sin escuchar uso real"*. Esta reunión es para escuchar, no para vender funcionalidades nuevas.

---

## 1. ¿Para qué se diseñó esta pantalla? (recordatorio)

Carolina Aroca es **el motor de captación de Valere**. La pantalla `/captacion` está construida para sustituir Excel + libreta + WhatsApp:

| Antes | Con `/captacion` |
|---|---|
| Anotar leads en Excel | `+ Nuevo lead` (modal con form mínimo: empresa + tel obligatorios) |
| Sin saber dónde está cada caso | 5 tabs: Por llamar / Esperando factura / Propuestas para enviar / Seguimientos / Todos mis casos |
| Llamar a ciegas | Card con nombre, NIF, semáforo de vencimiento, siguiente acción, próxima llamada |
| Subir factura al WhatsApp del compañero | Drawer del lead → botón "Subir factura" → handoff automático a Carolina M |
| Pedir a alguien el estado de un caso antiguo | Tab "Todos mis casos" con badge "Solo seguimiento" |

**Principio:** Carolina sólo ve Captación (sidebar oculta CRM Comercial, Datadis, Potencias). Está blindado por capa de permisos.

---

## 2. Estado real implementado hoy (resumen ejecutivo)

✅ **Funcionando en producción** (`valere-v2.pages.dev`):

| Bloque | Qué hace |
|---|---|
| Modal `+ Nuevo lead` | Form mínimo + sección expandible (NIF, email, ciudad, segmento, origen, notas). Multi-contacto (Compras + Operaciones + ...). Vencimiento contrato actual con fecha + fuente. |
| Bandeja Carolina (`/captacion`) | 5 tabs filtrando por `etapa_operativa`: nuevo/contactado → esperando_factura → propuesta_lista → propuesta_enviada/seguimiento + "Todos mis casos" |
| Card de oportunidad | Empresa + NIF + semáforo vencimiento + siguiente acción + próxima llamada (📅) + importes + última actividad |
| Drawer detalle | Cabecera + datos empresa + contactos + timeline actividades + bloque acciones contextual por etapa |
| Acciones contextuales | Por etapa, sólo aparecen los botones que aplican (no más, no menos): No contesta · No decisor · Esperando factura · Recordatorio · Subir factura · Pasar a análisis · No envía factura · Marcar propuesta enviada · Cliente acepta / rechaza · Pedir visita · Posponer llamada · Cerrar perdida |
| Posponer llamada | Modal aparte: fecha + hora + nota → guarda `fecha_siguiente_accion`, aparece en card como "📅 Próxima llamada" |
| Subir factura | Storage Supabase con validación tipo/tamaño → handoff automático a Carolina M |
| Cerrar perdida | Catálogo de 8 motivos típicos (telemarketing) + texto libre en "Otro" |
| Comentarios | Hilo del caso (Sprint C) — Carolina puede dejar comentarios incluso cuando ya no es la responsable |
| Visibilidad post-handoff | Si Carolina creó un lead que ya pasó a Carolina M / asesor, ella lo sigue viendo en "Todos mis casos" con badge azul "Solo seguimiento" |
| Semáforo vencimiento | En cada card: rojo ≤30d · naranja 30-60d · amarillo 60-90d · verde >90d · gris sin fecha · negro vencido |

### Decisiones de UX que ya están firmadas (no se tocan salvo que Carolina pida)
- Botones **grandes**, sin jerga técnica (nada de "workflow", "etapa_operativa").
- Cada card debe permitir decidir sin abrir el drawer.
- Toasts en bottom-right (Sprint C hotfix).
- 7 motivos cerrados + "Otro" — lista corta para velocidad.

---

## 3. Lo que **NO** está construido (a propósito) y queda en backlog

Esto es importante: hay cosas que ChatGPT y Juan firmaron NO construir hasta que Carolina lo pida con sus palabras. Si en la reunión pide algo de este listado, **es luz verde para arrancar**.

| Backlog | Trigger para arrancar | Estimación |
|---|---|---|
| **Pestaña "Hoy"** — lista del día con "a quién llamar a las 10:00 y por qué" | Carolina dice *"no sé a quién llamar hoy"* o *"se me pasan seguimientos"* | 1-2 sesiones cowork (60% lógica ya en código) |
| **Vista tabla (D2)** — selector Cards/Tabla con 9 columnas, sort por urgencia | Carolina dice *"tengo que abrir muchas cards para decidir"* | 1 sesión |
| **Dashboard comercial** — KPIs + alertas + acciones del día + pipeline | 2 de 4 síntomas en uso real | 2-3 sesiones |
| **Google Calendar integration** | Sólo tras validar "Hoy" durante ≥2 semanas | 1 sesión + OAuth |
| **Diagnóstico inicial sin factura** (SIPS + heurísticas → PDF en 30s) | Decisión Juan tras uso real | FASE 41 entera, ~5-6 días |
| **Agente "investigar lead"** | ≥3 entradas que mencionen "falta encontrar contactos" | Fase de visión, no MVP |
| **Lead scoring HOT/WARM/COLD** | NO arrancar — workflow ya prioriza solo | — |

> **Frases-trigger de Carolina que escuchar (literal, no parafrasear):**
> - *"no veo qué tengo que hacer hoy"* → Pestaña Hoy / Dashboard
> - *"tengo que abrir muchas cosas para decidir"* → Vista tabla
> - *"no sé qué es prioritario"* → Dashboard
> - *"se me pasan oportunidades"* → Alertas / agenda
> - *"no me deja hacer X"* → Permisos / RLS
> - *"esto me confunde"* → UX / copy
> - *"se ve raro / lento"* → Bug / cache CF

---

## 4. Preguntas concretas a hacer a Carolina

> Orden lógico: empezar por "cómo te ha ido", luego entrar en lo concreto.

### Bloque A — Uso real
1. ¿Cuántos leads has metido tú misma con `+ Nuevo lead` desde que empezaste? (orientativo)
2. ¿Has llegado a usar todos los tabs o sólo uno o dos?
3. ¿Has subido alguna factura desde el drawer? ¿Te resultó claro dónde estaba el botón?
4. ¿Has tenido que llamar a alguien y al abrir la card has visto lo que necesitabas, o has tenido que abrir el drawer?

### Bloque B — Fricciones / lo que no funciona
5. ¿Hay algo que has intentado hacer y **no has podido** o no has sabido dónde estaba?
6. ¿Hay algún botón que pulsaste y "no pasó nada visible" o pensaste "esto no era esto"?
7. ¿Algo que se te haya colgado, dado error o quedarse en blanco?
8. ¿Hay algún dato que aparece pero no entiendes qué significa? (ej: "Solo seguimiento", "Etapa: contactado", semáforo de color, etc.)

### Bloque C — Lo que echas en falta
9. Si pudieras pedir **una sola cosa** que te facilite el día, ¿cuál sería?
10. ¿Cómo decides cada mañana a quién llamar? (cuenta el proceso real — Excel? memoria? abrir todas las cards una a una?)
11. Cuando un cliente promete factura para "dentro de 3 días", ¿cómo te aseguras de no olvidártelo?
12. ¿Te gustaría ver un calendario / agenda con tus llamadas del día? ¿O prefieres una lista?

### Bloque D — Multiusuario
13. ¿Tienes claro cuándo pasas un caso a Carolina Maciñeiras? ¿Funciona el botón "Pasar a análisis"?
14. ¿Has tenido alguna vez la duda de "¿este caso ya es mío o de otro?"?

### Bloque E — Comodidad del teléfono
15. ¿Qué número marcas cuando llamas (el de empresa o el del contacto)? ¿La extensión se ve bien?
16. ¿Echas en falta poder llamar con un click? (CTI, próxima fase)

---

## 5. Plantilla de captura durante la reunión

Copiar/pegar este bloque para cada fricción que mencione (después se vuelca a `docs/FEEDBACK_USO_REAL.md`):

```markdown
### 2026-05-19 (revisión Carolina) — <título corto>
- **Quién**: Carolina Aroca
- **Pantalla / ruta**: /captacion → <zona>
- **Qué intentaba hacer**:
- **Qué pasó (literal)**:
- **Qué esperaba**:
- **Severidad**: baja / media / alta
- **Tags**: [hueco] / [ux] / [bug] / [mejora] / [confianza]
```

**Severidad rápida:**
- 🔴 **alta** — no puede terminar la tarea o pierde datos
- 🟠 **media** — da un rodeo pero acaba
- 🟢 **baja** — ruido visual / sugerencia

---

## 6. Lo que SÍ se puede prometer (porque ya está hecho o casi)

| Petición probable | Respuesta |
|---|---|
| "Quiero subir factura desde la card sin abrir drawer" | Backlog UX puntual, ~30 min |
| "Quiero ver el teléfono más grande" | Backlog UX, ~30 min |
| "Quiero ordenar por vencimiento" | Vista tabla con sort — D2, ~1 sesión |
| "Quiero ver mis llamadas de hoy" | Pestaña Hoy — ~1-2 sesiones |
| "Quiero que el sistema me recuerde llamar a X" | Posponer llamada YA EXISTE (modal aparte). Si no lo ha encontrado, es problema de descubrimiento — fix UX |
| "Quiero que se mande un email automático al cliente" | NO en este sprint (scope nuevo, OAuth, plantillas). Anotar en backlog |
| "Quiero hacer un PDF de propuesta para mandar" | FASE 41 — diagnóstico inicial, requiere SIPS + plantilla |

---

## 7. Lo que NO se puede prometer hoy (gestionar expectativas)

- **Lista Robinson sincronización automática** — fuera de scope MVP.
- **CTI / llamada con un click (Aircall)** — fuera de scope.
- **Tracking apertura email** — no antes de R3.
- **OCR de facturas / extracción auto** — no en MVP.
- **Lead scoring HOT/WARM/COLD** — explícitamente descartado: el workflow ya prioriza solo.

---

## 8. Cierre de la reunión — qué dejar prometido

Al terminar:
1. Resumir a Carolina las 3 cosas más importantes que ha dicho (validar que se entendió bien).
2. Decirle cuál vamos a arreglar **primero** y con qué plazo aproximado.
3. Si pide algo del backlog → decir "lo estábamos esperando, esto desbloquea X — lo arrancamos esta semana".
4. Si pide algo fuera de scope → "ahora no, vamos a estabilizar Captación primero, lo apuntamos".
5. Acordar fecha del próximo check-in (recomendado: 2 semanas).

---

## 9. Acción inmediata post-reunión (Juan / Cowork)

1. Volcar todas las fricciones a `docs/FEEDBACK_USO_REAL.md` (no parafrasear — frases literales).
2. Clasificar por severidad.
3. Si hay ≥1 P0 (bloqueante) → fix de emergencia mismo día.
4. Si hay 3+ P1 → sprint correctivo de 1-2 días.
5. Si el patrón es "no sé qué hacer hoy" → arrancar Pestaña "Hoy" (backlog `.cowork/backlog/agenda-captacion.md`).

---

## 10. Anexo — Vocabulario que Carolina ve en pantalla

| En pantalla | Lo que significa internamente |
|---|---|
| "Por llamar" | etapa_operativa = nuevo / contactado |
| "Esperando factura" | esperando_factura |
| "Propuestas para enviar" | propuesta_lista (lista para que Carolina A la envíe al cliente) |
| "Seguimientos" | propuesta_enviada / seguimiento |
| "Todos mis casos" | view cross-bandeja (incluye casos en handoff a Carolina M o asesor senior) |
| "Solo seguimiento" (badge azul) | el caso ya no es suyo; sólo lee y puede comentar |
| Semáforo vencimiento (rojo/naranja/amarillo/verde/gris) | semáforo basado en `fecha_vencimiento_contrato_prospecto` |
| "→ Llamar al cliente" | siguiente acción derivada de la etapa, con overlay urgencia |

Si Carolina no entiende una de estas etiquetas → es candidata #1 a rewrite de copy.

---

— Cowork, 2026-05-19. Buena reunión.
