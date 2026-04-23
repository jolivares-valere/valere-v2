# Arquitectura de proyectos — Valere

Mapa maestro de qué app, qué repo, qué Supabase, y cómo convive todo. Actualizar cada vez que se cree o integre una app nueva.

> **Última actualización:** 2026-04-23

---

## 1. Inventario actual

| App | Repo GitHub | Proyecto Supabase | Ubicación local | Estado |
|---|---|---|---|---|
| **CRM Valere** (CRM + Calculadora fusionados) | `jolivares-valere/valere-v2` | `gtphkowfcuiqbvfkwjxb` (PROYECTO VALERE) | `C:\Users\joliv\valere-v2` | ✅ En producción |
| **Gestión de Potencias** | ❓ [PENDIENTE CONFIRMAR con Juan] | `alesfvxqtwlrwlmkoosg` (valere-gestion-potencias) — 18 tablas, datos reales (41 expedientes, 75 supplies) | ❓ | 🚧 En desarrollo paralelo |
| **Gestión de Excedentes** | — no existe aún | — no existe aún | — | 💡 En evaluación (posible nueva app) |

---

## 2. Filosofía: apps satélite con integración progresiva

### Principio

Las funcionalidades nuevas **no se añaden directamente al CRM** — se desarrollan como apps independientes ("satélites") con su propio repo + Supabase. Sólo cuando la app madura y demuestra valor se integra al CRM.

### Por qué

- Evita saturar el schema del CRM con tablas experimentales que luego hay que borrar.
- Permite iterar rápido sin romper producción.
- Cada app puede probarse con un grupo piloto sin contaminar datos del CRM.
- Si la app no funciona, se mata el proyecto sin dejar deuda técnica en el CRM.

---

## 3. Procedimiento para crear una app satélite nueva

Cuando identificas una funcionalidad candidata (ej. "gestión de excedentes"):

### 3.1 Scaffold inicial
```bash
# 1. Repo nuevo
gh repo create jolivares-valere/valere-<nombre-app> --private --clone
cd valere-<nombre-app>

# 2. Mismo stack que el CRM (React 19 + TS + Vite + Supabase + Tailwind 4)
# Se puede copiar de un template interno (pendiente crear docs/TEMPLATE_APP.md).

# 3. Proyecto Supabase nuevo
# Crear en https://supabase.com/dashboard → proyecto nuevo, región eu-west-1,
# organization luvkvsihgucimbqmqarf (la misma que el CRM).

# 4. .env con las credenciales del nuevo proyecto
# 5. Primer push a GitHub
```

### 3.2 Convenciones obligatorias (mismas que el CRM)
- Arquitectura `src/features/` + `src/core/`
- TSC 0 errores antes de cada commit
- Tests mínimos 1 por feature
- Cowork + Claude Code CLI como agentes
- RLS activo desde el día 1 (no dejes `USING (true)` "temporal")

### 3.3 Naming
- Repo: `valere-<nombre-app>` (ej. `valere-gestion-potencias`, `valere-excedentes`)
- Supabase: mismo nombre
- Carpeta local: `C:\Users\joliv\valere-<nombre-app>`

### 3.4 Registrar en este doc
Añadir entrada en la tabla del §1. **No hacerlo se considera deuda técnica crítica**: significa que en 6 meses nadie sabe qué app pertenece a qué proyecto Supabase.

---

## 4. Criterios de integración al CRM

Cuando la app satélite esté lista para unirse al CRM, decide entre dos modos:

### Modo A — Migración completa (recomendado por defecto)
Las tablas se mueven al Supabase del CRM. Las features se copian al repo `valere-v2` bajo `src/features/<dominio>/`. El proyecto Supabase y el repo de la app satélite se archivan.

**Cuándo:**
- Las entidades de la app solapan con las del CRM (mismos `clients` / `empresas`, mismos `supplies` / `cups`).
- Volumen de datos moderado (< 1M filas por tabla).
- Los usuarios son los mismos del CRM.

### Modo B — Federación (multi-BDD)
La app sigue viviendo en su Supabase y su repo. El CRM la consume vía HTTP (Edge Functions, PostgREST REST API, o webhook).

**Cuándo:**
- Schema muy específico (ej. timeseries pesados que saturarían el CRM).
- Alta cardinalidad que escalaría mal en la BDD del CRM.
- Usuarios distintos (ej. clientes finales vs. comerciales).
- Necesidad de aislamiento operativo (si se cae la app, el CRM sigue funcionando).

### Proceso de integración (modo A — resumen)
1. Auditar overlap de schema (mapear `app.tabla` → `crm.tabla`).
2. Preparar migration que crea las tablas nuevas y migra los datos existentes.
3. Copiar features al repo CRM, adaptando imports.
4. Probar en rama `claude/integracion-<app>`.
5. Merge a main del CRM cuando TSC + tests pasan.
6. Archivar repo y proyecto Supabase de la app satélite.

---

## 5. Integración planificada para `valere-gestion-potencias`

**Schema actual (proyecto Supabase `alesfvxqtwlrwlmkoosg`):**
18 tablas con **datos reales**: clients (30), supplies (75), expedientes (41), power_requests (41), profiles (4), savings_calculations (41), documentacion (1), email_templates (2), comercializadoras (2), client_communications (31), status_log (91), regulated_rates (18), expediente_documents (27), comercializadora_docs (1), alerts (0), excel_import_templates (0), client_documents (70), ciclos (41).

**Overlap con CRM:**

| Tabla en gestión-potencias | Equivalente en CRM | Acción al integrar |
|---|---|---|
| `clients` (30 filas) | `empresas` (3 filas) | Fusionar; el CRM ya tiene `empresas`, migrar los 30 clientes |
| `profiles` (4) | `user_profiles` (1) | Fusionar, un solo `user_profiles` |
| `supplies` (75) | `cups` (1) | Fusionar en `cups` |
| `comercializadoras` (2) | `retailers` (?) | Fusionar en `retailers` |
| `regulated_rates` (18) | `boe_regulated_prices` (?) | Comparar y fusionar |
| `expedientes` (41) | **no existe** en CRM | Crear tabla nueva `expedientes` |
| `power_requests` (41) | **no existe** | Crear `solicitudes_potencia` |
| `savings_calculations` (41) | **no existe** (calculadora energética genera similar pero en memoria) | Crear o integrar con calculadora |
| `ciclos` (41), `status_log` (91) | — | Migrar directamente |
| `client_communications` (31) | `actividades` (1) | Fusionar en `actividades` |
| `client_documents` (70), `expediente_documents` (27), `documentacion` (1) | `documentos` (0) | Fusionar en `documentos` polimórfica |
| `email_templates` (2), `comercializadora_docs` (1), `excel_import_templates` (0), `alerts` (0) | — | Migrar directamente |

**Recomendación:** **Modo A — migración completa.** Hay mucho overlap (clients/empresas, supplies/cups, profiles/user_profiles) y volumen moderado. Pasar a federación no aporta aislamiento y duplica lógica.

**Orden sugerido del sprint de integración** (cuando se decida hacerlo):
1. Backup completo del proyecto Supabase actual `alesfvxqtwlrwlmkoosg`.
2. Migration CRM que crea las tablas nuevas (`expedientes`, `solicitudes_potencia`, `ciclos`, `savings_calculations`, `status_log`, `email_templates`, `alerts`, `excel_import_templates`) y adapta las existentes si hace falta.
3. Script ETL que copia datos (con transformaciones: `clients` → `empresas`, etc.).
4. Features al repo `valere-v2/src/features/potencias/` (expedientes, solicitudes, comunicaciones).
5. Archivar `alesfvxqtwlrwlmkoosg` (pausar, no borrar durante 3 meses).

---

## 6. Workspace Cowork

**Decisión actual:** un workspace compartido que contiene los repos de todas las apps en desarrollo paralelo (`valere-v2`, `valere-gestion-potencias`, futuras). Razón: mientras hay decisiones de integración pendientes (§4, §5), ver las apps juntas permite comparar schemas y detectar overlaps rápidamente.

**Cuando cambiar a workspaces separados:** cuando todas las apps estén integradas al CRM o estabilizadas como federaciones independientes. Entonces cada repo puede vivir en su sesión Cowork aislada.

**Acción pendiente:** el workspace actual sólo tiene `valere-v2/` montado. Para poder trabajar sobre `valere-gestion-potencias` también desde Cowork, Juan debe añadirlo al mount de la sesión (ver instrucciones en CLAUDE.md — o pedir a Claude que use `request_cowork_directory`).

---

## 7. Limpieza pendiente

- [ ] Carpeta `CRM VALERE/` en el mount de Cowork está vacía. **Borrar** o renombrar a algo útil. Es ruido visual.
- [ ] Confirmar dónde vive el código de `valere-gestion-potencias` (repo GitHub? local? otra cuenta?). Rellenar §1 cuando se sepa.
- [ ] Decidir si `gestion-excedentes` será una app satélite nueva o seguirá integrada dentro del CRM (hoy vive en `src/features/datos/` + `src/features/admin/` + `src/core/energia/`).

---

## 8. Referencias cruzadas

- `CLAUDE.md` — contexto del proyecto CRM
- `docs/ESTADO.md` — estado en tiempo real
- `docs/ROADMAP_FUSION.md` — roadmap de fusión histórica CRM + Calculadora
- `docs/MCP_SETUP.md` — MCPs de Supabase/Vercel
