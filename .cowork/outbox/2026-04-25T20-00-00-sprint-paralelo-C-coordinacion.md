# Handoff sprint paralelo C → próxima sesión

**Fecha:** 2026-04-25 (noche, sesión Cowork)
**Tema:** Coordinación cross-app — apps satélite + comunicación + runbook + onboarding agentes.
**Tipo:** Sprint paralelo (no toca `supabase/`, no toca `src/`, no toca `docs/PLAN_*`).
**Restricciones cumplidas:** ✅ no commits ✅ no escrituras `.git` ✅ no toca capas A (backend) ni B (frontend).

---

## Resumen ejecutivo

Sprint dedicado a **dejar lista la capa de coordinación** mientras los sprints A (backend) y B (frontend) trabajan en paralelo. Cuatro entregables, todos bajo `docs/`, `scripts/` o `.cowork/`. Cero código de aplicación tocado, cero migrations, cero commits.

- ✅ **Inventario apps satélite — script + plantilla**: Cowork no tiene mounted los repos `valere-gestion-potencias`, `valere-excedentes`, `valere-gestion-energetica`. Sin esa foto, las compat views de Fase 4 se diseñan a ciegas. Script PowerShell autónomo + plantilla para rellenar.
- ✅ **Borrador comunicado unificación**: tres versiones (email largo, Slack corto, recordatorio). Listo para enviar cuando Fase 4 cierre.
- ✅ **Runbook consolidado pendientes Juan**: 8 bloques con orden de ejecución, dependencias y tiempos. Sustituye releer 4 handoffs separados.
- ✅ **Agent playbook**: convenciones aprendidas + workarounds + anti-patrones para futuros sprints autónomos.

---

## Entregables

### 1. `scripts/inventario_apps_satelite.ps1` (340 líneas)

Script PowerShell autónomo que escanea los 3 repos satélite y extrae:

- **Identidad**: ruta, git remote, branch, último commit.
- **Stack**: `@supabase/supabase-js`, `@google/genai`, react, vite, express.
- **Env vars**: `VITE_*` (frontend, peligrosas si tienen secretos) + `process.env`/`Deno.env` (server) + archivos `.env*` con sus keys.
- **Tablas Supabase**: detecta `from('xxx')` y `.table('xxx')`, mapea a equivalente CRM canónico (sabe que `clients`→`empresas`, `supplies`→`cups`, etc.).
- **URLs Supabase hardcoded**: detecta y clasifica si apunta a CRM o Potencias.
- **Uso de Gemini**: file + line + snippet de cada hit (`GEMINI`, `GoogleGenerativeAI`, `@google/genai`, `generativelanguage`).
- **Diagnóstico automático**: 🔴 si `VITE_GEMINI_API_KEY` (riesgo seguridad), 🟡 si apunta a Potencias, 🟡 si usa tablas legacy.

Output: `$HOME\valere-backups\inventario-apps-satelite-<stamp>.md` (legible) + `.json` (raw).

Filtra `node_modules`, `.git`, `dist`, `build`, `.next`, `.vercel`, `.turbo`, `coverage`. Tolerante a apps inexistentes (avisa, no falla).

### 2. `docs/INVENTARIO_APPS_SATELITE_TEMPLATE.md`

Plantilla complementaria al script. Estructura por app con secciones: identidad, stack, env vars (frontend/server/locales), tablas Supabase con mapeo a canónico, URLs, uso Gemini, riesgos identificados, estimación refactor.

Incluye una **decisión Opción A vs B** explícita para que Juan tome posición antes del cutover Fase 4.

Útil incluso si el script no se ejecuta — sirve de checklist para llenar manualmente.

### 3. `docs/COMUNICADO_UNIFICACION_DRAFT.md`

Tres versiones del anuncio al equipo Valere:

- **Email largo** (formal): asunto, cuerpo con secciones "qué cambia / qué NO cambia / ventajas / acciones / timeline / soporte". Usa el tono del comunicado anterior (`docs/COMUNICADO_NUEVO_URL_CRM.md`) — informal pero estructurado.
- **Slack/Teams corto** (1 párrafo).
- **Banner muy corto** (1 frase).
- **Versión cliente externo** (plantilla por si se necesita en el futuro).

Plus: **notas para Juan** (cuándo enviar, recomendación de timing, plantilla de seguimiento 1 semana después).

`<FECHA_CUTOVER>` queda como placeholder — rellenar cuando se sepa.

### 4. `docs/RUNBOOK_PENDIENTE_JUAN.md`

Documento que sustituye releer los 4 handoffs sprints 5+6+7+8.

**8 bloques**, ordenados por dependencias:

1. Cierre PR #6 (commits + cleanup) — 10 min.
2. Fase 2 datos prod — 30-60 min.
3. Smoke tests post-Fase 2 — 30 min.
4. Inventario apps satélite (script PowerShell) — 15 min.
5. Cutover apps satélite — 1.5h.
6. Decisión storage PDFs — 30 min discusión.
7. RLS hardening — 50 min.
8. Cleanup Supabase Dashboard — 10 min.

Plus: **mapa de dependencias** ASCII al inicio + **TL;DR** por horas disponibles (30min / 2-3h / medio día) + **tabla de estado** con quién hace qué.

### 5. `.cowork/AGENT_PLAYBOOK.md`

Memoria operativa compartida para futuros sprints autónomos. 11 secciones:

1. Lo primero — orden de lectura al arrancar.
2. Restricciones del sandbox (lo que NO funciona).
3. Cosas que SÍ funcionan bien.
4. Patrón de handoff (cómo cerrar un sprint).
5. Convenciones código y arquitectura.
6. Patrones específicos del proyecto.
7. Modelos Gemini en este proyecto.
8. Decisiones arquitectónicas vivas.
9. Anti-patrones y errores ya cometidos.
10. Cuando estás bloqueado.
11. Mantén este playbook vivo.

Condensa el aprendizaje de los 10+ sprints autónomos previos. Cada sección es accionable, no narrativa.

Doc vivo: la última sección instruye a futuros agentes a actualizarlo cuando aprendan algo nuevo.

---

## Lo que NO hizo este sprint (por restricción explícita)

- ❌ **No tocó `supabase/`** — sprint paralelo A se encarga.
- ❌ **No tocó `src/`** — sprint paralelo B se encarga.
- ❌ **No tocó `docs/PLAN_*`** — son docs vivas de los otros sprints.
- ❌ **No commits, no push, no `git rm`** — sandbox no escribe a `.git`. Todo se commitea por Juan vía script en handoff.
- ❌ **No ejecutó el script PowerShell** — porque no se puede desde el sandbox; lo ejecuta Juan en su máquina.
- ❌ **No actualizó `docs/ESTADO.md`** — para no pisar lo que estén escribiendo los sprints A y B en paralelo. La actualización del ESTADO va con el commit final consolidado.

---

## Cosas que requieren mano de Juan

1. **Ejecutar el script PowerShell de cierre acumulado** del Bloque 1 del runbook (incluye los entregables de este sprint paralelo C).
2. **Ejecutar `scripts/inventario_apps_satelite.ps1`** desde su PowerShell para rellenar el inventario real (cuando tenga 15 min).
3. **Tomar decisión Opción A vs B** para apps satélite (impacta sprint A futuro).
4. **Decidir qué hacer con storage bucket Potencias** (Bloque 6 del runbook).

Los 4 puntos están detallados en `docs/RUNBOOK_PENDIENTE_JUAN.md`.

---

## Bloqueos / decisiones requeridas Juan

Ningún bloqueo crítico. Las decisiones pendientes (Opción A vs B, storage bucket) ya estaban pendientes de sprints anteriores — este sprint solo las consolida en un documento más legible.

Si Cowork necesita seguir avanzando autónomo y los sprints A/B no están listos, próximas tareas autónomas posibles:

- Habilitar features Potencias en CRM (`src/features/expedientes/`, `src/features/solicitudes-potencia/`) — depende de decisión Opción B.
- Drop tabla `proposals` + consolidar 3 features bajo `propuestas` — sprint dedicado de FE.
- Aplicar las views CRM para apps satélite — depende del inventario (Bloque 4) y decisión Opción A.

---

## Script PowerShell de cierre (sprint paralelo C, parte del Bloque 1 acumulado)

Los add específicos de este sprint paralelo C ya están incluidos en el script unificado del Bloque 1 del runbook. Como referencia, los archivos nuevos a `git add` son:

```powershell
git add docs/INVENTARIO_APPS_SATELITE_TEMPLATE.md
git add scripts/inventario_apps_satelite.ps1
git add docs/COMUNICADO_UNIFICACION_DRAFT.md
git add docs/RUNBOOK_PENDIENTE_JUAN.md
git add .cowork/AGENT_PLAYBOOK.md
git add .cowork/outbox/2026-04-25T20-00-00-sprint-paralelo-C-coordinacion.md
```

(El commit message del Bloque 1 del runbook ya menciona el sprint paralelo C — copy-paste directo).

---

## Mensaje al retomar

"Sprint paralelo C cerrado — capa de coordinación lista mientras los lanes A y B avanzan. Cuatro entregables: (1) **inventario apps satélite** con script PowerShell autónomo + plantilla rellena-tú, (2) **borrador comunicado unificación** en 3 versiones (email largo/Slack/banner), (3) **runbook consolidado** con 8 bloques ordenados por dependencias para que Juan tenga un solo doc, (4) **agent playbook** con convenciones + anti-patrones de los 10+ sprints autónomos previos para que futuros agentes arranquen rápido. Cero código tocado, cero `git`, cero `.git`. Todo en `docs/`, `scripts/`, `.cowork/`. Próximo paso recomendado para Juan: ejecutar Bloque 1 del runbook (≈10 min, cierra commits acumulados); siguiente paso recomendado para Cowork: cuando los sprints A/B cierren, usar el inventario para diseñar las compat views de Fase 4."

---

## Reglas aprendidas (añadidas al playbook §3 y §9)

- **Sprints paralelos como organización autónoma**: cuando hay áreas de trabajo desacopladas y restricciones de "no toques X" claras, lanzar A/B/C/... en paralelo evita pisarse y deja un trazo limpio en outbox.
- **Plantillas + scripts como combo**: el script PowerShell genera el output, la plantilla documenta qué se espera. Si el script falla o el usuario prefiere rellenar a mano, sigue siendo útil. Si se ejecuta, el output es directamente conforme.
- **Runbook consolidado vs handoffs sueltos**: pasados 3-4 handoffs sin ejecución, vale la pena un documento que los una con orden + dependencias. Reduce fricción para el usuario que retoma el trabajo.
- **Playbook vivo > docs estáticas**: condensar aprendizajes operativos en un solo `.md` accesible al inicio de cada sprint reduce la curva de redescubrimiento. Marcar explícitamente "actualízame cuando aprendas algo nuevo" lo mantiene vivo.
