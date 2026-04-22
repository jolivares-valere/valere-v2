# Sistema de Agentes — Valere CRM v2

> Última actualización: 2026-04-22
> Este documento define cómo coordinan los agentes y qué hace cada uno.

---

## Los 4 agentes del proyecto

### 🧠 Agente 1 — Cowork (coordinador)
**Herramienta:** Claude Cowork (app de escritorio)
**Quién lo usa:** Juan abre Cowork y trabaja en el proyecto CRM VALERE

**Hace:**
- Planificación de sprints y features
- Implementación de features backend (hooks, API, SQL)
- Coordinación entre agentes
- Documentación y ESTADO.md
- Decisiones de arquitectura

**No hace:**
- Commits directos de código de producción sin TSC 0
- Diseño visual (lo delega al Agente Diseño)

**Prompt de arranque automático** (configurado en instrucciones del proyecto):
```
Lee CLAUDE.md, docs/ESTADO.md, inbox y git log. Dime en qué estamos.
```

---

### 💻 Agente 2 — Claude Code CLI (implementación + verificación)
**Herramienta:** Claude Code en terminal (`claude` command)
**Quién lo usa:** Juan abre terminal, va a ~/valere-v2, ejecuta `claude`

**Hace:**
- Implementar features que Cowork diseña
- Debugging interactivo (ver errores en tiempo real)
- Commits y push
- Verificar TSC + tests antes de cada PR
- Ejecutar el agente valere-auditor

**Prompt de arranque para Claude Code:**
```
cd ~/valere-v2
Lee CLAUDE.md y docs/ESTADO.md.
Skill: valere-session (inicio).
¿En qué estamos?
```

**Para lanzar el auditor desde Claude Code:**
```
Ejecuta el agente valere-auditor sobre el estado actual del repo.
```

---

### 🎨 Agente 3 — Claude Design (diseño visual)
**Herramienta:** Claude Design (app independiente de Anthropic) o Claude in Chrome
**Cuándo usarlo:** cuando hay trabajo de diseño visual — tokens, componentes, revisión UI

**Hace:**
- Analizar screenshots de la app (localhost:3000)
- Leer el branding de Valere desde Drive
- Generar especificación de tokens CSS
- Generar componentes HTML de referencia
- Proponer paleta de colores, tipografía, spacing

**No hace:**
- Commits al repositorio
- Cambios en código TypeScript/React

**Input que necesita:**
1. Screenshots de pantallas actuales (tomar con Claude in Chrome → localhost:3000)
2. Archivos del Drive de branding: https://drive.google.com/drive/folders/1JxJR7w2iuHnGJZXg4EQXr82r9g1-FoJe
3. El archivo `docs/DESIGN_REVIEW_2026-04-20.md` con los problemas documentados

**Output que produce:**
- `docs/DESIGN_TOKENS_<fecha>.md` — especificación de tokens
- `docs/design-reference.html` — componentes de referencia visual
- Lista de PRs a crear para implementar los cambios

**Cómo pasar el trabajo al Agente Cowork:**
Cowork lee el output del Agente Diseño y lo implementa en `src/index.css` + componentes.

---

### 🔍 Agente 4 — Auditor autónomo
**Herramienta:** Subagente `.claude/agents/valere-auditor.md`
**Cuándo usarlo:** antes de cada merge a main, después de cada feature

**Activación desde Cowork:**
```
Lanza el agente valere-auditor para verificar el estado actual.
```

**Activación desde Claude Code:**
```
/valere-auditor
```

**Output:** `docs/AUDIT_<fecha>.md` con estado del proyecto.

---

## Plan de sprints — Mejoras Valere CRM

### SPRINT DISEÑO (paralelo a todo lo demás)
**Responsable:** Agente Diseño (Claude Design)
**Prerequisito:** compartir logos desde Drive + screenshots de la app

| Tarea | Estado |
|---|---|
| Analizar branding Valere (Drive) | ⏳ Pendiente de acceso a logos |
| Screenshots de las 20 pantallas actuales | ⏳ Pendiente (necesita localhost:3000 activo) |
| Generar tokens CSS definitivos | ⏳ Pendiente |
| Generar componentes de referencia HTML | ⏳ Pendiente |
| Implementar tokens en src/index.css | ⏳ Pendiente (Agente Cowork implementa) |
| Unificar rounded-md → rounded-xl en CRM features | ⏳ Pendiente (Agente Code implementa) |

---

### SPRINT 3 — Backend ligero (esta semana, sin bloqueos)
**Responsable:** Agente Cowork + Agente Code
**Prerequisito:** ejecutar migración Datadis y fase28.6 en Supabase (Juan, via panel web)

| # | Mejora | Responsable | Rama |
|---|---|---|---|
| 3a | Precios BOE automáticos (ESIOS API cron) | Cowork diseña → Code implementa | `claude/boe-auto-prices` |
| 3b | Historial Chat IA (tabla chat_history) | Cowork diseña → Code implementa | `claude/chat-history` |
| 3c | Versionado contratos (trigger audit) | Cowork diseña → Code implementa | `claude/contract-versions` |
| 3d | Seguimiento comisiones | Cowork diseña → Code implementa | `claude/comisiones` |

---

### SPRINT 4 — Features de alto valor (siguiente semana)
**Responsable:** Agente Cowork + Agente Code

| # | Mejora | Notas |
|---|---|---|
| 4a | Alertas email/WhatsApp | Integración Resend o Twilio |
| 4b | PWA (manifest + service worker) | Sin app nativa |
| 4c | Dashboard ejecutivo dirección | KPIs agregados |
| 4d | Parser facturas PDF (Gemini Vision) | Alternativa a Datadis manual |

---

### SPRINT 5 — Portal cliente (cuando esté el diseño definido)
**Responsable:** Agente Cowork + Agente Code + Agente Diseño

| # | Mejora | Notas |
|---|---|---|
| 5a | Portal cliente (vistas de solo lectura) | El rol client ya existe en BD |
| 5b | Firma electrónica (Signaturit) | Integración API externa |

---

## Protocolo de trabajo diario

### Mañana (inicio de sesión)
1. Juan abre Cowork → el proyecto CRM VALERE carga el contexto automáticamente
2. Cowork ejecuta el protocolo de inicio (git pull + leer ESTADO.md + inbox)
3. Cowork resume la tarea donde se quedó

### Durante el trabajo
- Cada feature va en su propia rama `claude/<descripcion>`
- Cowork diseña y crea archivos → Code verifica y commitea
- Auditor se lanza antes de cada merge

### Final de sesión
- Cowork actualiza ESTADO.md
- Cowork hace commit + push del estado
- Cowork deja mensajes en .cowork/outbox/ si hay instrucciones para mañana

---

## Qué necesita Juan para activar el sistema

### Inmediato (hoy):
1. ✅ Ejecutar migración Datadis en Supabase (panel web → SQL Editor → pegar el archivo `supabase/migrations/20260422_datadis_integracion.sql`)
2. ✅ Ejecutar migración fase28.6 en Supabase (mismo proceso → `supabase/migrations/20260422_fase28_6_rls_policies_cleanup.sql`)
3. ⏳ Abrir Claude Design y compartir los archivos del Drive de logos

### Esta semana:
4. ⏳ Tener localhost:3000 activo para que Claude in Chrome pueda navegar la app
5. ⏳ Dar acceso a Claude Code CLI al directorio ~/valere-v2

### Configuración una sola vez:
6. ⏳ Añadir las variables de entorno de Supabase al `.env` local (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
