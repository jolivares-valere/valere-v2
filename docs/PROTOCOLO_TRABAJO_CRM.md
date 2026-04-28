# Protocolo de trabajo continuo del CRM Valere

> **Propósito**: organizar la inspección, actuaciones, pruebas y mejoras del CRM como un flujo sostenible que no satura ningún chat individual ni interrumpe el uso productivo del CRM.
>
> **Audiencia**: Juan (usuario real + product owner), agentes Claude (Cowork, Browser, Code CLI), futuros colaboradores.
>
> **Última actualización**: 2026-04-27 por Cowork.

---

## Principios

1. **Cada chat tiene un foco único**. Si un chat se vuelve denso, se cierra y se abre otro con el contexto mínimo necesario.
2. **El estado vive en el repo, no en los chats**. Los archivos `.md` del repo son la memoria persistente.
3. **Nada bloquea el CRM en producción**. Todo el trabajo va en ramas + PR + deploy gradual.
4. **Juan es el oráculo final**. Las decisiones de producto las toma él. Los agentes proponen, no imponen.
5. **El backlog se prioriza, no se acumula**. Si una idea no entra en los próximos 3 meses, se mueve a "Futuro" o se descarta.

---

## Archivos de trabajo (memoria persistente)

| Archivo | Propósito | Frecuencia de actualización |
|---|---|---|
| `docs/BACKLOG_CRM.md` | Lista priorizada de mejoras pendientes. Bugs + features + ideas. | Continua (Juan añade ideas, agentes resuelven) |
| `docs/INSPECCIONES/<fecha>.md` | Informe de auditoría visual o funcional del CRM en uso real. | Quincenal o on-demand |
| `docs/SESIONES/<fecha>-<tipo>.md` | Resumen de cada sesión de trabajo significativa. | Por sesión |
| `docs/ESTADO.md` | Estado global del proyecto (ya existe). | Al cerrar cada sprint |
| `.cowork/inbox/` y `.cowork/outbox/` | Bus de mensajes entre sesiones de agentes. | Por sesión cuando hay handoff |

---

## Organización en 1 chat Driver + sub-agentes (modelo recomendado)

**Una sola sesión Cowork "Driver"** orquesta toda la semana. Dentro de esa sesión, el Driver lanza **sub-agentes** con la herramienta `Agent` (cada uno aislado en su git worktree para que no se pisen) que ejecutan tareas concretas y vuelven con resultado. Tú solo lees el chat Driver.

```
┌─────────────────────────────────────────────────────────────┐
│  Chat Cowork "Driver" (única sesión)                        │
│                                                             │
│  ├─ Sub-agente Implementador "kanban-oportunidades"        │
│  │  (worktree aislado, rama claude/kanban-oportunidades)   │
│  │                                                          │
│  ├─ Sub-agente Implementador "importador-xlsx-tarifas"     │
│  │  (worktree aislado, rama claude/importador-xlsx-tarifas)│
│  │                                                          │
│  ├─ Sub-agente Implementador "audit-log"                    │
│  │  (worktree aislado, rama claude/audit-log)              │
│  │                                                          │
│  ├─ Sub-agente Implementador "back-button-contextual"      │
│  │  (worktree aislado, rama claude/back-button-contextual) │
│  │                                                          │
│  ├─ Sub-agente Tester (verifica TSC + tests + smoke prod)  │
│  ├─ Sub-agente Auditor seguridad (advisors + RLS check)    │
│  └─ Sub-agente Plan / Explore (investigación puntual)      │
└─────────────────────────────────────────────────────────────┘

Excepciones que SÍ requieren chat aparte:
  • Inspector → chat Browser (Claude in Chrome) cuando hay que
    navegar UI logueada para auditoría visual quincenal.
  • Code CLI → chat aparte solo para debugging interactivo
    pesado o dev server local. Raro.
```

### Tipos de actor (qué hace cada uno)

#### 1. Driver Cowork (chat principal de la semana)

**Cuándo**: cualquier momento que haya trabajo que hacer.
**Plantilla de arranque** (única que necesitas copiar):

```
Soy Driver Cowork del CRM Valere. Lee CLAUDE.md, docs/ESTADO.md,
docs/BACKLOG_CRM.md y docs/PROTOCOLO_TRABAJO_CRM.md. Trabajamos
con el modelo "1 chat Driver + sub-agentes" del protocolo.

Tu primer turno:
  1. Resume estado del proyecto en 3 líneas.
  2. Lee la sección "🔥 Esta semana" del BACKLOG_CRM.md.
  3. Lee la sección "🆕 Sin priorizar (entrada rápida)" y
     procesa lo que haya entrado desde la última sesión.
  4. Propón orden de trabajo.

A partir de ahí, cuando yo apruebe el plan, tú orquestas los
sub-agentes con la herramienta Agent (isolation: worktree)
para los Implementadores, y ejecutas tú directamente Tester
y Auditor de seguridad cuando toque.
```

#### 2. Implementador (sub-agente lanzado por el Driver)

**Cuándo**: el Driver decide arrancar un ítem. NO lo lanza el usuario manualmente.
**Cómo el Driver lo lanza** (referencia técnica, no necesitas copiar):

```javascript
Agent({
  description: "Implementador <nombre-corto>",
  subagent_type: "general-purpose",
  isolation: "worktree",
  prompt: `Eres Implementador del CRM Valere. Mejora a resolver:
  [TÍTULO Y DESCRIPCIÓN COMPLETA DEL ÍTEM DEL BACKLOG].

  Reglas:
  - Trabaja en este worktree aislado, rama claude/<descripcion>.
  - Implementa end-to-end: schema (si toca) + backend + frontend + tests.
  - TSC 0 errores antes de terminar.
  - Tests Vitest pasando, añade nuevos para la mejora.
  - Si añades tabla nueva: RLS + 4 policies granulares con roles canónicos.
  - Si tocas migration: dry-run BEGIN/ROLLBACK antes de apply.
  - Output: rama lista para PR. NO mergear.
  - Reporta en una sola respuesta cuando termines: archivos modificados,
    tests añadidos, comandos para que el Driver merge.`
})
```

#### 3. Tester (función del Driver, no sub-agente separado)

**Cuándo**: antes de cada merge + semanal antes de cierre.
**Qué hace**: el Driver mismo ejecuta `npx tsc --noEmit`, `npm test -- --run`, `npm run build`, smoke prod con MCP Supabase. Reporta verde/rojo. Si rojo, no arregla — añade a `BACKLOG_CRM.md` sección "🆕 Sin priorizar".

#### 4. Auditor seguridad (función del Driver)

**Cuándo**: mensual + después de cambios en RLS / auth / secrets.
**Qué hace**: el Driver consulta `mcp__supabase__get_advisors`, compara con `docs/AUDIT_SEGURIDAD_2026-04-27.md`, escribe nuevo audit en `docs/AUDIT_SEGURIDAD_<fecha>.md`.

#### 5. Inspector (chat Browser aparte, NO sub-agente)

**Cuándo**: cada 2 semanas o cuando detectas varios bugs de golpe.
**Por qué chat aparte**: necesita login real en `valere-v2.pages.dev` con tu sesión, lo cual solo Browser/Claude-in-Chrome puede hacer.
**Plantilla de arranque** (la única que copias tú manualmente para esto):

```
Soy Inspector del CRM Valere. Tendré la pestaña de
valere-v2.pages.dev abierta y logueada. Revisa los 12 módulos
en orden, prioriza flujos críticos (oportunidades, contratos,
calculadora). Reglas: solo lectura, anonimiza capturas, no
modifiques datos. Output:
docs/INSPECCIONES/<YYYY-MM-DD>-inspeccion.md con secciones
[Bugs / Mejoras UX / Performance / Responsive / Hallazgos
seguridad]. Añade los accionables al final de
docs/BACKLOG_CRM.md sección "🆕 Sin priorizar (entrada rápida)".
```

---

## Flujo continuo de feedback (cómo Juan reporta)

### Canal A — Bajo esfuerzo (durante uso real)

Cuando estás usando el CRM y detectas algo, añade una línea al final de `docs/BACKLOG_CRM.md` sección "🆕 Sin priorizar (entrada rápida)".

Sintaxis simple:
```
- [bug | feature | idea] <descripción una línea> — <fecha entrada>
```

Ejemplo:
```
- [bug] El selector de comercializadora en /admin se queda colgado al cargar +50 ofertas — 2026-04-28
- [feature] Quiero filtrar oportunidades por comercial asignado en el Kanban — 2026-04-29
- [idea] Botón "Generar PDF de la oportunidad" en cada card del Kanban — 2026-04-30
```

Esto lo puedes hacer:
- Editando el archivo en VSCode/cualquier editor.
- Desde tu móvil con un editor markdown (Working Copy si tienes Mac, Markor en Android, GitHub mobile).
- Diciéndoselo al chat de Cowork rápido: *"Apunta al backlog: [bug] X"*.

La próxima sesión de Driver Cowork procesa estas entradas y las prioriza.

### Canal B — Detallado (planning)

Cuando una idea es lo bastante grande para discutir o tienes varias a la vez, abre una sesión Driver Cowork con el prompt de arranque y conversa. Output: el Driver actualiza `BACKLOG_CRM.md` con las entradas priorizadas.

### Canal C — Crítico/urgente

Si algo está roto en producción y bloquea trabajo:
1. Abre chat directo con Cowork.
2. Pega el error / describe el bloqueo.
3. Cowork prioriza inmediatamente, lanza Implementador o resuelve.
4. Hotfix con commit + push directo a main si es trivial; rama dedicada si toca BD.

### Canal D — Futuro (módulo Feedback nativo)

Idea para sprint posterior: añadir botón flotante "Feedback" al CRM (bottom-right, mismo patrón que el AsistenteRAG actual). Al pulsarlo:
- Captura screenshot automático.
- Captura URL actual + nombre del usuario.
- Abre formulario corto (1 campo "qué pasa", 1 toggle "bug/feature/idea").
- Inserta en tabla `crm_feedback` (a crear).
- El Driver Cowork la lee directamente desde Supabase y la mueve al backlog.

Lo dejo apuntado al backlog como `[feature] Módulo Feedback nativo en CRM`.

---

## Cadencia recomendada

| Día | Actividad | Quién |
|---|---|---|
| Lunes | Driver Cowork: planning de la semana, prioriza backlog | Cowork |
| Martes-jueves | Implementadores trabajan en mejoras (1 mejora = 1 chat) | Cowork x N |
| Viernes | Tester: corre TSC/tests/build/smoke producción | Cowork |
| Cada 2 semanas | Inspector: recorrido CRM completo | Browser |
| Mensual | Auditor seguridad: review completa | Cowork |
| On-demand | Hotfix crítico, decisiones grandes | Cualquiera |

> **No es obligatorio seguir esta cadencia al pie de la letra.** Es el "modo crucero". Si un sprint pide más Implementadores en paralelo, adelante. Si una semana no hay nada urgente, se respeta.

---

## Reglas de oro

1. **Un chat denso es un chat que termina pronto**. Si superan ~50 turnos, cerrar y abrir nuevo Driver con resumen.
2. **Las decisiones de producto se documentan en `docs/`**. No en mi memoria, no en tu memoria — en el repo.
3. **Toda mejora pasa por PR antes de merge**. Smoke test en preview deploy de Cloudflare antes de mergear.
4. **No tocar `main` directamente**. Excepto hotfix crítico documentado.
5. **Cada Implementador resuelve UN ítem**. Si descubre que se le encadena otro, lo añade al backlog y termina el suyo.
6. **El backlog se cierra**: ítems implementados se marcan ✅ y se mueven a "Hecho" al final del archivo. Cada 3 meses, archivar "Hecho" en `docs/BACKLOG_HISTORICO_<año>.md`.

---

## Anti-patrones a evitar

- ❌ "Ya que estás aquí, hazme también X". Si X no estaba en el alcance del Implementador, va al backlog.
- ❌ "Esto que me has hecho es genial, ¿puedes mejorarlo un poco?". Mejora = nueva entrada del backlog.
- ❌ Chats que duran 200 turnos cubriendo 5 temas distintos. Síntoma de falta de protocolo.
- ❌ Memoria oral (*"el otro día me dijiste que..."*). Si no está en `docs/`, no existe.
- ❌ Empezar nuevo sprint sin cerrar el anterior (sin actualizar `ESTADO.md`).

---

## Cómo se conecta con los sprints actuales

Hoy hay **3 sprints en marcha o en preparación**:

| Sprint | Estado | Tipo de sesiones |
|---|---|---|
| **Holded Fase 0+1** | ✅ Cerrado en prod | Cierre + handoff a Fase 2 |
| **Sprint A — Quick Wins Zoco** | 📋 En backlog, próximo | 4 Implementadores en paralelo (Kanban, XLSX, audit log, botón atrás) |
| **Datadis-as-a-Service** | 📋 Spec en redacción | 1 Driver para spec + trámite Juan + Implementador en 4-6 sem |
| **Holded Fase 2** | 📋 Plan ya existe | 1 Implementador cuando se priorice |

Todo en paralelo, ninguno bloquea al otro porque cada uno trabaja en su rama propia.

---

## Cómo arrancar a partir de ahora

1. **Cierra este chat actual** después de leer este protocolo. Ya tiene todo el contexto Holded + Zoco que necesitabas. Está pesado, mejor archivar.

2. **Abre el primer chat con protocolo**: tipo Driver Cowork con la plantilla de arranque. Le das el OK al plan D que ya acordamos:
   - Redactar `docs/PLAN_INTEGRACION_DATADIS.md` (yo lo hago en esa sesión).
   - Identificar el papeleo Datadis para que tú arranques el trámite.
   - Lanzar Sprint A Quick Wins en paralelo (4 Implementadores).

3. **Cuando estés usando el CRM**, añade entradas al `BACKLOG_CRM.md` con sintaxis simple. La próxima sesión Driver las procesa.

4. **Cada 2 semanas**, lanza Inspector con la plantilla. 1 hora de auditoría visual produce informe que alimenta el backlog.

5. **Cada viernes**, lanza Tester. 15 minutos para confirmar verde.

---

## Métricas de éxito del protocolo

A revisar trimestralmente:

- ✅ Tiempo promedio entre que Juan reporta un bug y se cierra el PR (objetivo: < 1 semana para no críticos, < 24 h para críticos).
- ✅ % del backlog procesado vs acumulado (objetivo: ratio neto > 1, es decir cerramos más de lo que entra).
- ✅ Número de chats > 100 turnos (objetivo: 0).
- ✅ Cobertura tests Vitest (objetivo: + 5 tests nuevos por sprint mínimo).
- ✅ Advisors Supabase limpios (objetivo: 0 ERROR, < 15 WARN intencionales).
- ✅ Lighthouse score producción (objetivo: > 90 mobile, > 95 desktop).
