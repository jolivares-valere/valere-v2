# Arquitectura de proyectos — Valere

Mapa maestro de que app, que repo, que Supabase, y como convive todo. Actualizar cada vez que se cree o integre una app nueva.

> **Ultima actualizacion:** 2026-04-23

---

## 1. Inventario actual

| App | Repo GitHub | Proyecto Supabase | Ubicacion local | Estado |
|---|---|---|---|---|
| **CRM Valere** (CRM + Calculadora fusionados) | jolivares-valere/valere-v2 | gtphkowfcuiqbvfkwjxb (PROYECTO VALERE) | C:\Users\joliv\valere-v2 | En produccion |
| **Gestion de Potencias** | PENDIENTE CONFIRMAR | alesfvxqtwlrwlmkoosg (valere-gestion-potencias) — 18 tablas, datos reales (41 expedientes, 75 supplies) | ? | En desarrollo paralelo |
| **Gestion de Excedentes** | — no existe aun | — no existe aun | — | En evaluacion (posible nueva app) |

---

## 2. Filosofia: apps satelite con integracion progresiva

### Principio

Las funcionalidades nuevas **no se anaden directamente al CRM** — se desarrollan como apps independientes (satelites) con su propio repo + Supabase. Solo cuando la app madura y demuestra valor se integra al CRM.

### Por que

- Evita saturar el schema del CRM con tablas experimentales que luego hay que borrar.
- Permite iterar rapido sin romper produccion.
- Cada app puede probarse con un grupo piloto sin contaminar datos del CRM.
- Si la app no funciona, se mata el proyecto sin dejar deuda tecnica en el CRM.

---

## 3. Procedimiento para crear una app satelite nueva

Cuando identificas una funcionalidad candidata (ej. "gestion de excedentes"):

### 3.1 Scaffold inicial
- Repo nuevo: gh repo create jolivares-valere/valere-NOMBRE --private --clone
- Mismo stack que el CRM (React 19 + TS + Vite + Supabase + Tailwind 4)
- Proyecto Supabase nuevo en region eu-west-1, organization luvkvsihgucimbqmqarf
- .env con credenciales del nuevo proyecto
- Primer push a GitHub

### 3.2 Convenciones obligatorias (mismas que el CRM)
- Arquitectura src/features/ + src/core/
- TSC 0 errores antes de cada commit
- Tests minimos 1 por feature
- Cowork + Claude Code CLI como agentes
- RLS activo desde el dia 1 (no dejar USING(true) "temporal")

### 3.3 Naming
- Repo: valere-NOMBRE (ej. valere-gestion-potencias, valere-excedentes)
- Supabase: mismo nombre
- Carpeta local: C:\Users\joliv\valere-NOMBRE

### 3.4 Registrar en este doc
Anadir entrada en la tabla del paragraph 1. No hacerlo se considera deuda tecnica critica.

---

## 4. Criterios de integracion al CRM

Cuando la app satelite este lista para unirse al CRM, decide entre dos modos:

### Modo A — Migracion completa (recomendado por defecto)
Las tablas se mueven al Supabase del CRM. Las features se copian al repo valere-v2 bajo src/features/DOMINIO/. El proyecto Supabase y el repo de la app satelite se archivan.

**Cuando:**
- Las entidades de la app solapan con las del CRM (mismos clients/empresas, supplies/cups).
- Volumen de datos moderado (menos de 1M filas por tabla).
- Los usuarios son los mismos del CRM.

### Modo B — Federacion (multi-BDD)
La app sigue viviendo en su Supabase y su repo. El CRM la consume via HTTP (Edge Functions, PostgREST REST API, o webhook).

**Cuando:**
- Schema muy especifico (ej. timeseries pesados que saturarian el CRM).
- Alta cardinalidad que escalaria mal en la BDD del CRM.
- Usuarios distintos (ej. clientes finales vs. comerciales).
- Necesidad de aislamiento operativo.

### Proceso de integracion (modo A — resumen)
1. Auditar overlap de schema (mapear app.tabla -> crm.tabla).
2. Preparar migration que crea tablas nuevas y migra datos.
3. Copiar features al repo CRM, adaptando imports.
4. Probar en rama claude/integracion-APP.
5. Merge a main cuando TSC + tests pasan.
6. Archivar repo y proyecto Supabase de la app satelite.

---

## 5. Integracion planificada para valere-gestion-potencias

**Schema actual (proyecto alesfvxqtwlrwlmkoosg):**
18 tablas con datos reales. Principales: clients (30), supplies (75), expedientes (41), power_requests (41), profiles (4), savings_calculations (41), status_log (91), client_documents (70), expediente_documents (27), client_communications (31), regulated_rates (18), ciclos (41), comercializadoras (2), email_templates (2).

**Overlap con CRM (decision por tabla):**

| Tabla en gestion-potencias | Equivalente en CRM | Accion al integrar |
|---|---|---|
| clients (30) | empresas (3) | Fusionar; el CRM ya tiene empresas, migrar los 30 clientes |
| profiles (4) | user_profiles (1) | Fusionar, un solo user_profiles |
| supplies (75) | cups (1) | Fusionar en cups |
| comercializadoras (2) | retailers (?) | Fusionar en retailers |
| regulated_rates (18) | boe_regulated_prices (?) | Comparar y fusionar |
| expedientes (41) | no existe | Crear tabla nueva expedientes |
| power_requests (41) | no existe | Crear solicitudes_potencia |
| savings_calculations (41) | no existe (calculadora genera en memoria) | Crear o integrar con calculadora |
| ciclos (41), status_log (91) | — | Migrar directamente |
| client_communications (31) | actividades (1) | Fusionar en actividades |
| client_documents (70), expediente_documents (27) | documentos (0) | Fusionar en documentos polimorfica |
| email_templates (2), comercializadora_docs (1), alerts (0), excel_import_templates (0) | — | Migrar directamente |

**Recomendacion:** Modo A — migracion completa. Hay mucho overlap y volumen moderado.

**Orden sugerido del sprint de integracion:**
1. Backup completo del proyecto Supabase actual alesfvxqtwlrwlmkoosg.
2. Migration CRM que crea las tablas nuevas.
3. Script ETL que copia datos (con transformaciones: clients -> empresas, etc.).
4. Features al repo valere-v2/src/features/potencias/ (expedientes, solicitudes, comunicaciones).
5. Archivar alesfvxqtwlrwlmkoosg (pausar, no borrar durante 3 meses).

---

## 6. Workspace Cowork

**Decision actual:** un workspace compartido que contiene los repos de todas las apps en desarrollo paralelo (valere-v2, valere-gestion-potencias, futuras). Razon: mientras hay decisiones de integracion pendientes, ver las apps juntas permite comparar schemas y detectar overlaps.

**Cuando cambiar a workspaces separados:** cuando todas las apps esten integradas al CRM o estabilizadas como federaciones independientes.

**Accion pendiente:** el workspace actual solo tiene valere-v2/ montado. Para poder trabajar sobre valere-gestion-potencias desde Cowork, Juan debe anadirlo al mount de la sesion.

---

## 7. Limpieza pendiente

- Carpeta CRM VALERE/ en el mount de Cowork esta vacia. Borrar o renombrar a algo util.
- Confirmar donde vive el codigo de valere-gestion-potencias. Rellenar paragraph 1 cuando se sepa.
- Decidir si gestion-excedentes sera una app satelite nueva o seguira integrada dentro del CRM (hoy vive en src/features/datos/ + src/features/admin/ + src/core/energia/).

---

## 8. Referencias cruzadas

- CLAUDE.md — contexto del proyecto CRM
- docs/ESTADO.md — estado en tiempo real
- docs/ROADMAP_FUSION.md — roadmap de fusion historica CRM + Calculadora
- docs/MCP_SETUP.md — MCPs de Supabase/Vercel
- docs/SEGURIDAD.md — decisiones y advisors
