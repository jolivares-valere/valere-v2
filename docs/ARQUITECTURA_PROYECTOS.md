# Arquitectura de proyectos — Valere

Mapa maestro de que app, que repo, que Supabase, y como convive todo. Actualizar cada vez que se cree o integre una app nueva.

> **Ultima actualizacion:** 2026-04-23 (noche, post-auditoria autonoma)

---

## 1. Inventario actual (auditado 2026-04-23)

**Cuenta canonica:** `jolivares@valereconsultores.com` — Google Workspace + GitHub `jolivares-valere` + Supabase org `luvkvsihgucimbqmqarf` + Vercel team `valere-consultores` (slug `jolivares-valere`).

### Apps activas

| App | Repo GitHub | Proyecto Supabase | Vercel | Auto-deploy |
|---|---|---|---|---|
| **CRM Valere** (CRM + Calculadora) | `jolivares-valere/valere-v2` (publico) | `gtphkowfcuiqbvfkwjxb` PROYECTO VALERE — **56 tablas reales** | `prj_LuE1NBS54FOT4ZJVsTsb0FKvo302` valere-v2 — valere-v2.vercel.app | Si (main) |
| **Valere Potencias** (era "excedentes") | `jolivares-valere/valere-gestion-potencias` (privado) | `alesfvxqtwlrwlmkoosg` valere-gestion-potencias — 18 tablas, datos reales (41 expedientes, 75 supplies, 30 clients) | `prj_597bgWdEAVcDs3nl7luHDTt3Kk8H` valere-gestion-potencias — valere-gestion-potencias.vercel.app | Si (main) — desde 2026-04-23 |

### Repos archivados
- `jolivares-valere/valere-gestion-energetica` — primer intento de excedentes (Apr 9), abandonado y archivado 2026-04-23.

### ⚠️ Hallazgo critico (2026-04-23 noche) — el CRM tiene 56 tablas, no 22

Al regenerar los tipos TypeScript del CRM se descubre que el schema real es **mucho mas grande** de lo documentado en CLAUDE.md. Hay modulos enteros en produccion sin documentar.

**Tablas core conocidas (~22):** user_profiles, empresas, contactos, contratos, cups, oportunidades, actividades, propuestas, custom_fields_schema, custom_fields_values, notificaciones, documentos, eventos, facturas, retailers, retailer_offers, proposals, global_config, precios_regulados_boe (renombrada desde boe_regulated_prices), incidencias, renovaciones, tareas.

**Tablas integracion potencias YA presentes en CRM (no documentado):**
- `expedientes`, `solicitudes_potencia`, `ciclos`, `comercializadora_docs`, `comercializadoras`, `comercializadora_ofertas`, `savings_calculations`, `email_templates`, `comunicaciones_cliente`, `status_log`, `excel_import_templates`, `alertas`
- 7 tablas auxiliares `_migration_*_map` (mapeo IDs legacy potencias -> IDs canonicos CRM): `_migration_ciclo_map`, `_migration_comercializadora_map`, `_migration_cups_map`, `_migration_empresa_map`, `_migration_expediente_map`, `_migration_request_map`, `_migration_user_map`.

→ **La integracion del proyecto potencias al CRM YA se preparo o ejecuto en el pasado.** Verificar con SELECT COUNT cuando se hizo y si hay datos reales en estas tablas o son zombi.

**Modulo FV (fotovoltaica) — 9 tablas, sin documentar en CLAUDE.md:**
- `fv_planta`, `fv_dispositivo`, `fv_credenciales`, `fv_alarma`, `fv_kpi_realtime`, `fv_kpi_diario`, `fv_resumen_semanal`, `fv_informe_mensual`, `fv_sync_log`.
→ Modulo de monitorizacion fotovoltaica (lectura inversores, KPIs generacion). Fuera de roadmap visible.

**Modulo Holded (ERP) — 5 tablas, sin documentar:**
- `holded_config`, `holded_conflicts`, `holded_integration_logs`, `holded_sync_queue`, `holded_sync_state`.
→ Integracion con Holded (ERP español). Pipeline sync con cola y conflictos.

**Modulo asistente RAG (mencionado en CLAUDE.md, confirmado):**
- `crm_help_embeddings`, `crm_asistente_log`, `audit_log`.

**Modulo Datadis (ya conocido):**
- `datadis_consumptions`, `datadis_tokens`.

### Acciones urgentes derivadas
- [ ] Revisar `git log` de `supabase/migrations/` para entender cuando se anadieron FV / Holded / `_migration_potencia_*`.
- [ ] Determinar si modulos FV / Holded estan activos (frontend que los consuma) o son tablas zombi.
- [ ] Si la integracion potencias→CRM ya se hizo, **el proyecto Supabase `alesfvxqtwlrwlmkoosg` puede estar obsoleto** o duplicar datos del CRM.
- [ ] Actualizar `CLAUDE.md` raiz con los modulos reales descubiertos.

### Decision Escenario 1 (2026-04-23)
Juan confirmo: **valere-gestion-potencias es UNA SOLA app** (no dos). Mantener nomenclatura actual. La feature de "excedentes" queda como sub-modulo dentro de la misma app (fase C del PLANNING). PR #1 mergeado, auto-deploy desde main activo. **PERO** dado el hallazgo de las 7 tablas `_migration_potencia_*` en el CRM, hay que verificar si la integracion (fase E del PLANNING) ya esta hecha o en curso.

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
