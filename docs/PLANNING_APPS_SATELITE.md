# Planning — Ordenar apps satélite Valere (excedentes, potencias) e integración al CRM

**Fecha:** 2026-04-23
**Autor:** Cowork (con input de Juan)
**Objetivo:** Desmezclar las apps de "excedentes" y "potencias" que hoy comparten Supabase + organizarlas con el mismo sistema de memoria persistente que el CRM + plan de integración futura al CRM como features adicionales.

---

## 1. Situación actual (diagnóstico)

### Apps en juego
- **CRM Valere** (`valere-v2`): en producción, terminado, sistema de memoria persistente ya establecido (`CLAUDE.md`, `docs/ESTADO.md`, `docs/SESIONES/`, `.cowork/inbox/outbox`).
- **Excedentes** (Juan, iniciada primero): objetivo era aplicación para ofrecer propuestas de ahorro a clientes basadas en cómo gestionan los excedentes distintas comercializadoras. **Inacabada.**
- **Potencias** (Juan, iniciada después): reutilizó la misma BBDD que excedentes, por eso el Supabase `alesfvxqtwlrwlmkoosg` se llama `valere-gestion-potencias`. **En desarrollo.**

### Dónde vive cada cosa
| Pieza | Ubicación | Estado |
|---|---|---|
| CRM código | GitHub `jolivares-valere/valere-v2` | ✅ Repo limpio |
| CRM Supabase | `gtphkowfcuiqbvfkwjxb` (PROYECTO VALERE) | ✅ Schema propio |
| Excedentes código | `H:\Mi unidad\…\valere-consultores---gestión-de-excedentes\musing-kalam` (repo git local, sin push a GitHub) | ⚠️ Inacabada, sólo local |
| Potencias código | ❓ PENDIENTE LOCALIZAR (Juan aclarará) | ❓ |
| BBDD compartida | `alesfvxqtwlrwlmkoosg` (nombre engañoso: `valere-gestion-potencias`) con datos de AMBAS apps | ⚠️ Mezcla |

### Clasificación tablas por dominio (análisis semántico)
```
EXCEDENTES (4):     comercializadoras, comercializadora_docs, savings_calculations, regulated_rates
POTENCIAS (4):      expedientes, expediente_documents, power_requests, ciclos
COMPARTIDO (10):    clients, supplies, profiles, status_log, client_communications,
                    client_documents, email_templates, documentacion, alerts, excel_import_templates
```

Más de la mitad de tablas son compartidas → tiene sentido, ambas apps atienden a los mismos clientes y suministros.

---

## 2. Objetivo

1. Cada app en su propio repo GitHub privado.
2. Cada app con su sistema de memoria persistente (mismo template que el CRM).
3. BBDD común pero schemas lógicamente separados (mantener la BBDD actual, no reestructurar).
4. Cualquier sesión que se cuelgue puede retomarse leyendo `docs/ESTADO.md` de la app correspondiente.
5. Plan claro para integrar ambas al CRM cuando estén listas.

---

## 3. Arquitectura objetivo

```
┌─────────────────────────────────────────────────────────────────┐
│                         GitHub Remotes                           │
│                                                                  │
│   jolivares-valere/valere-v2         → CRM (producción)         │
│   jolivares-valere/valere-excedentes → Excedentes (privado)     │
│   jolivares-valere/valere-potencias  → Potencias (privado)      │
└─────────────────────────────────────────────────────────────────┘
                          │        │         │
                          ▼        ▼         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase (Valere org)                       │
│                                                                  │
│   gtphkowfcuiqbvfkwjxb (PROYECTO VALERE) → CRM                  │
│                                                                  │
│   alesfvxqtwlrwlmkoosg (renombrar) → Excedentes + Potencias     │
│     ├─ schema public     → tablas compartidas (clients,         │
│     │                       supplies, profiles, etc.)           │
│     ├─ schema excedentes → savings_calculations, comercial...   │
│     └─ schema potencias  → expedientes, power_requests, ...     │
└─────────────────────────────────────────────────────────────────┘
```

> **Nota:** la separación en schemas (`public` / `excedentes` / `potencias`) se hace en **fase 2**. Ahora mismo todas las tablas están en `public` y se documenta el dominio mediante `COMMENT ON TABLE`. La reestructuración a schemas es una migration no trivial y puede esperar a que cada app esté más madura.

---

## 4. Plan por fases

### FASE A — Sanar excedentes (próxima sesión, ~2 horas)

**Objetivo:** tener el repo de excedentes publicado en GitHub con el mismo sistema de memoria que el CRM, para no perder trabajo.

Checklist:
- [ ] Subir `musing-kalam` a GitHub como `jolivares-valere/valere-excedentes` (privado).
  ```powershell
  cd "H:\Mi unidad\06_IA_Y_AUTOMATIZACION\CLAUDE\valere-consultores---gestión-de-excedentes\musing-kalam"
  gh repo create jolivares-valere/valere-excedentes --private --source=. --push
  ```
- [ ] Copiar al repo los ficheros-plantilla de memoria del CRM, adaptándolos:
  - `CLAUDE.md` — contexto del proyecto (qué hace la app, tablas propias, estado)
  - `docs/ESTADO.md` — estado en tiempo real (qué quedó pendiente)
  - `docs/SESIONES/` — carpeta vacía, se irá rellenando
  - `.cowork/inbox/` y `.cowork/outbox/` — bus de mensajes
  - `.mcp.json` apuntando al mismo Supabase (`alesfvxqtwlrwlmkoosg`)
  - `.gitignore` con `.env` + `node_modules` + `dist`
- [ ] Documentar el schema actual: SQL `COMMENT ON TABLE` para clasificar las 18 tablas por dominio (excedentes / potencias / compartido). Queda en comentarios persistentes en Postgres, visibles con `\d+` o desde el MCP.
- [ ] Renombrar proyecto Supabase `valere-gestion-potencias` → `valere-back-office` (neutro, refleja que hospeda varias apps). El `project_ref` no cambia, sólo la etiqueta.
- [ ] Registrar en `valere-v2/docs/ARQUITECTURA_PROYECTOS.md` §1 la info final.

### FASE B — Sanar potencias (siguiente sesión)

Pregunta previa para Juan: ¿dónde está el código de potencias? Mismo procedimiento que excedentes:
- Repo GitHub privado `jolivares-valere/valere-potencias`
- Sistema de memoria estándar
- `.mcp.json` apuntando al mismo Supabase

### FASE C — Completar excedentes (cuando tengas tiempo)

Terminar el flujo inacabado (propuestas a clientes basadas en gestión de excedentes de las comercializadoras). Trabajo funcional, no arquitectónico.

**Output esperado:** app funcional que permite al comercial de Valere seleccionar un cliente + ver comparativa de comercializadoras + generar propuesta PDF.

### FASE D — Separar schemas en Supabase (opcional, cuando ambas apps estén estables)

Migration que mueve:
- `savings_calculations`, `comercializadoras`, `comercializadora_docs`, `regulated_rates` → schema `excedentes`
- `expedientes`, `power_requests`, `expediente_documents`, `ciclos` → schema `potencias`
- Las 10 tablas compartidas se quedan en `public`.

RLS se ajusta por schema.

**Beneficio:** cada app sólo "ve" sus tablas propias + las compartidas. Evita confusiones. Prepara el terreno para la fase E.

### FASE E — Integración al CRM (cuando cada app demuestre valor)

Sigue el procedimiento de `docs/ARQUITECTURA_PROYECTOS.md` §4 Modo A (migración completa):

Para excedentes:
1. Las entidades compartidas (`clients` → `empresas`, `supplies` → `cups`, `profiles` → `user_profiles`) se fusionan con las del CRM.
2. Las entidades propias (`savings_calculations`, `comercializadoras`, etc.) se migran al Supabase del CRM como tablas nuevas o integradas con `proposals`.
3. Las features de la UI se copian a `valere-v2/src/features/excedentes/`.
4. Se archiva el repo `valere-excedentes`.

Para potencias: idéntico procedimiento.

Resultado final: `valere-v2` tiene tres grandes bloques — CRM original + Calculadora (ya integrada) + Excedentes + Potencias.

---

## 5. Sistema de memoria persistente estandarizado (plantilla)

Todas las apps de Valere deben tener esta estructura de memoria, copiada del CRM:

```
mi-app/
├─ CLAUDE.md                           # Contexto del proyecto (objeto, stack, tablas, reglas)
├─ docs/
│  ├─ ESTADO.md                        # Estado en tiempo real (actualizar al cerrar sesión)
│  ├─ ROADMAP.md                       # Plan de alto nivel
│  ├─ SESIONES/                        # Resúmenes de sesiones (YYYY-MM-DD-resumen.md)
│  └─ ARQUITECTURA.md                  # Decisiones estructurales
├─ .cowork/
│  ├─ inbox/                           # Mensajes que recibe esta sesión
│  └─ outbox/                          # Mensajes que deja para la siguiente
├─ .mcp.json                           # MCP Supabase + Vercel
├─ .env.example                        # Plantilla sin secretos
├─ .gitignore                          # .env, node_modules, dist
└─ (código...)
```

### Protocolo obligatorio de sesión (mismo del CRM, aplicado a cada app)

**Al abrir sesión:**
```bash
git pull
cat CLAUDE.md docs/ESTADO.md
ls .cowork/inbox/
git log --oneline -5
```

**Al cerrar sesión (sin preguntar):**
1. Actualizar `docs/ESTADO.md` (fecha, commits, pendientes resueltos/nuevos).
2. Crear `docs/SESIONES/YYYY-MM-DD-resumen.md` si la sesión fue significativa.
3. Dejar handoff en `.cowork/outbox/YYYY-MM-DDTHH-MM-SS-cierre.md` con prioridades para la siguiente.
4. `git commit + push` (siempre en rama `claude/<descripcion>`, nunca directo a main).

Con esto, cualquier sesión que se cuelgue puede reabrirse leyendo `ESTADO.md` + `outbox` + últimos commits y retomar en 2 minutos.

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Divergencia de schemas entre repos al tocar tablas compartidas | En fase A, `COMMENT ON TABLE` que aclara qué app es "owner" de cada tabla. En fase D, schemas separados fuerzan la disciplina. |
| Dos repos tocan `clients` a la vez y se pisan | Convenir que la app "propietaria" de una tabla compartida es la primera que la creó (excedentes para casi todas). La otra app sólo lee. |
| Pérdida de trabajo al cambiar de app | Cada app tiene su ESTADO.md + outbox. Protocolo al cerrar sesión es obligatorio. |
| Integración al CRM arrastra bugs de la app satélite | Regla: no integrar app al CRM hasta que TSC + tests + uso piloto con usuarios reales durante 2 semanas. |
| Volver a mezclar BBDDs por descuido | Toda tabla nueva debe crearse en el schema correcto desde el día 1 (tras fase D). Hasta entonces, `COMMENT ON TABLE` con `-- app: excedentes` / `-- app: potencias`. |

---

## 7. Qué hago yo (Cowork) vs. qué haces tú

| Tarea | Agente |
|---|---|
| Generar el template de memoria (CLAUDE.md, ESTADO.md, .mcp.json) | Cowork |
| Clasificar las 18 tablas del Supabase con `COMMENT ON TABLE` | Cowork (via MCP) |
| Renombrar proyecto Supabase | Cowork (via MCP) |
| `gh repo create` y primer push a GitHub | Tú (PowerShell) |
| Copiar los ficheros de memoria al repo local | Tú (PowerShell — te los paso en un bloque) |
| Git commit + push en cada sesión | Tú |
| Escribir código funcional de las apps | Tú (con ayuda de Claude Code o Cowork) |
| Integración al CRM (migrations + copiar features) | Cowork |

---

## 8. Próxima acción concreta (cuando tengas 20 min)

Antes de arrancar la FASE A formalmente: **confirma estos dos puntos**:

1. ¿Procedemos a renombrar el proyecto Supabase `valere-gestion-potencias` → `valere-back-office` hoy (es seguro, no rompe nada, sólo cambia la etiqueta del dashboard)?
2. ¿Dónde está el código de potencias? Si aún no tiene repo, en la FASE A lo creamos también desde cero con el template de memoria.

Una vez confirmado esto, yo:
- Clasifico las 18 tablas del Supabase con `COMMENT ON TABLE` (desde Cowork vía MCP, 2 minutos).
- Genero el template completo de memoria (`CLAUDE.md`, `docs/ESTADO.md`, `.mcp.json`, etc.) para `valere-excedentes` — te lo paso en un bloque PowerShell para que lo pongas en `musing-kalam/` + hagas el `gh repo create` + push.
- Documento todo en `valere-v2/docs/ARQUITECTURA_PROYECTOS.md` §1 para cerrar el lazo.

---

## 9. Para la próxima sesión (si esta se cuelga)

Si esta sesión se corta antes de arrancar la FASE A, la siguiente puede retomar así:
1. Leer este doc (`valere-v2/docs/PLANNING_APPS_SATELITE.md`).
2. Leer `valere-v2/.cowork/outbox/` para ver el último estado.
3. Si Juan confirmó las preguntas del §8, ejecutar FASE A directamente.
4. Si no, esperar confirmación.
