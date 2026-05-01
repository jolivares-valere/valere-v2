# Índice del proyecto Valere CRM v2

> Punto de entrada para cualquier agente (Claude, ChatGPT, humano) que llegue al repo. Si vas a auditar, leer en este orden:
> 1. Este `INDEX`
> 2. `HANDOFF_CHATGPT_AUDITOR_VALERE_2026-05-01.md` (visión completa)
> 3. `ESTADO_TECNICO_ACTUAL.md`
> 4. `ROADMAP_VIGENTE.md`
> 5. `DEUDA_TECNICA_PRIORIZADA.md`

---

## Qué es Valere CRM

**Valere Consultores** es una **consultora energética B2B española** pequeña-mediana. CRM propio (`valere-v2`) que funciona como herramienta interna y cara al cliente. Hosteado en Cloudflare Pages con backend Supabase.

Cartera actual: **27 empresas, 72 CUPS, 4 oportunidades, 2 contratos, 1 contacto, 41 expedientes Potencias**.

## Una sola frase

> *Plataforma vertical para consultoría energética B2B con integración Datadis nativa, módulo de tramitación de potencias (RDL 17/2021), seguimiento fotovoltaico y gestión comercial completa.*

## Repositorio

- **GitHub**: https://github.com/jolivares-valere/valere-v2 (privado)
- **Supabase**: proyecto `gtphkowfcuiqbvfkwjxb` (PROYECTO VALERE, eu-west-1, Postgres 17)
- **Hosting**: https://valere-v2.pages.dev (Cloudflare Pages)
- **Local**: `npm run dev` → http://localhost:3000 (puerto fijo)

## Estado en 1 línea

Tras sesión 1 mayo 2026: **6 sub-fases del Sprint A aplicadas autónomamente** (BD prod + frontend en working tree pendiente commit). Pre-requisito merge a main: cerrar TSC del sprint Potencias (~60 errores). Roadmap vivo: FASES 30-33 + Release 1 captación (módulo Carolina) en preparación.

## Mapas

- Arquitectura: ver `ESTADO_TECNICO_ACTUAL.md`.
- Tech stack: ver `ESTADO_TECNICO_ACTUAL.md`.
- Roadmap próximos sprints: ver `ROADMAP_VIGENTE.md`.
- Deuda técnica: ver `DEUDA_TECNICA_PRIORIZADA.md`.
- Schema BD: `HANDOFF_CHATGPT_AUDITOR_VALERE_2026-05-01.md` sección 4.
- Estado git: `HANDOFF_CHATGPT_AUDITOR_VALERE_2026-05-01.md` sección 2.

## Documentos clave en `/docs`

### Vivos (referencia de la sesión actual)
- `ESTADO.md` — punto de entrada universal con encabezamiento de la sesión más reciente.
- `HANDOFF_CHATGPT_AUDITOR_VALERE_2026-05-01.md` — paquete handoff completo para auditoría externa.
- `INDEX_PROYECTO_VALERE.md` — este documento.
- `ESTADO_TECNICO_ACTUAL.md` — arquitectura y stack.
- `ROADMAP_VIGENTE.md` — roadmap condensado.
- `DEUDA_TECNICA_PRIORIZADA.md` — deuda priorizada.
- `INDICE_2026-05-01.md` — mapa de los 12 docs creados el 1 mayo.

### Auditorías (referencia permanente)
- `AUDIT_2026-05-01_MEJORAS_CRM.md` — auditoría técnica vs código.
- `AUDIT_2026-05-01_PROFESIONAL_SECTOR.md` — auditoría sectorial.
- `COMPARATIVA_COWORK_VS_CHATGPT_2026-05-01.md` — comparativa de análisis.
- `AUDIT_2026-04-19.md` — auditoría previa pre-personalización.
- `AUDIT_SEGURIDAD_2026-04-24.md` — auditoría seguridad.
- `AUDITORIA_FE_2026-04-25_SPRINT_PARALELO_B.md` — auditoría frontend.
- `AUDITORIA_POTENCIAS_VS_CRM.md` — gap análisis Potencias.

### Planes operativos (vigentes)
- `RELEASE_1_CAPTACION_2026-05-01.md` — plan ejecutable módulo Carolina (próximo sprint).
- `PLAN_DEPURACION_2026-05-01.md` — regla 70/30 + inventario loose ends.
- `CHECKLIST_QA_SPRINT_A_2026-05-01.md` — checklist commit Sprint A.

### Planes específicos por dominio
- `PLAN_INTEGRACION_DATADIS.md` — plan completo Datadis (parcialmente aplicado).
- `PLAN_ASISTENTE_RAG_CRM.md` — plan RAG asistente (aplicado).
- `PLAN_UNIFICACION_SUPABASE.md` — plan unificación de los 2 Supabase (futuro).
- `PLAN_MIGRACION_AUTH_GOOGLE_IDENTITY.md` — plan SSO Google.
- `PLAN_MIGRACION_POTENCIAS_CLOUDFLARE.md` — plan migrar Potencias web.

### Históricos / superados (consultar solo si interesa retrospectiva)
- `PLAN_CAROLINA_ENGINE_2026-05-01.md` — insight inicial Carolina (superado por RELEASE_1).
- `PLAN_CAPTACION_PROFESIONAL_2026-05-01.md` — referencia técnica call center (superado por RELEASE_1).
- `PROMPT_CHATGPT_SECOND_OPINION_2026-05-01.md` — prompt one-shot ya consumido.
- `ROADMAP_FUSION.md` — roadmap original CRM+Calculadora (FASES 20-29 cerradas; FASES 30-33 vigentes).
- `LEGACY_TABLES_KILL_LIST.md` — tablas pendientes drop.

### Sesiones (logs)
- `SESIONES/2026-05-01-resumen.md`
- `SESIONES/2026-05-01-tarde-sprint-a-autonomo.md`
- `SESIONES/2026-04-30-resumen.md`
- (resto del histórico de sesiones desde abril)

### Help / RAG asistente
- `help/*.md` — documentación funcional consumida por embeddings del asistente RAG.

## Convenciones del repo

- **Lenguaje código**: español para entidades de negocio (`empresas`, `contratos`, `comercial_id`); inglés para primitivos técnicos (`isLoading`, `onSubmit`).
- **Lenguaje UI**: español (castellano).
- **Idioma docs**: español.
- **Commits**: `<tipo>(fase<n>.<sub>): <desc>`. Ejemplo: `feat(fase30.1): programar cron daily-contract-check`.
- **Branch principal**: `main`. Trabajo en `claude/<descripcion>`.
- **Test runner**: Vitest. Verificación TSC: `npx tsc --noEmit`.

## Cómo arrancar local (PowerShell)

```powershell
cd C:\Users\joliv\valere-v2
git pull
npm install
cp .env.example .env  # rellenar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev           # http://localhost:3000
```

## Quién toca qué

Sistema de agentes (ver `CLAUDE.md`):

- **Cowork** (Claude desktop): coordinación, planes, features backend, hooks, SQL, docs.
- **Code** (Claude Code CLI): builds, tests, commits, push, debugging.
- **Design**: visual review (no toca código).
- **Auditor** (skill): TSC verde + tests + RLS + sin regresiones.
