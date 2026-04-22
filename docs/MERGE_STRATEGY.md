# Estrategia de merge — `claude/valere-crm-architecture-2vvEV` → `main`

> Propuesta para cerrar el PR #1. Revisar antes de ejecutar.

## Contexto

- Branch fuente: `claude/valere-crm-architecture-2vvEV`
- Branch destino: `main`
- **123 commits ahead** de main
- PR #1 abierto, actualizado al último commit
- 0 conflictos esperados (main está parado desde FASE 20 inicial)

## Qué contiene el branch (resumen ejecutivo)

Desde `main` actual (`807781a3`, abril 2026), este branch ha añadido:

- **Arquitectura feature-based completa** (`src/features/*`, `src/core/*`). Legacy `src/modules/`, `src/lib/`, `src/hooks/` eliminados.
- **CRM completo**: empresas, contactos, contratos, oportunidades (kanban energético), actividades, incidencias, renovaciones, documentos (Storage), calendario, informes, importador CSV, notificaciones, búsqueda global, custom fields, automatizaciones.
- **Calculadora integrada**: admin, datos, análisis, propuestas energía, tracking, chat IA (Gemini via Edge Function).
- **Schema unificado**: `clients`→`empresas`, `supply_points`→`cups`, `invoice_history`→`facturas`. DROPs de `clients`/`supply_points` ejecutados 2026-04-21.
- **RLS granular** por `comercial_id` (FASE 20.9 + 28.2 + 28.6).
- **Sprint 1 accesibilidad** + **Sprint 2 visual**: ConfirmDialog, aria-labels contextuales, focus-visible, rounded-xl unificado, StatusBadge genérico, toasts en mutaciones, skeletons.
- **Edge Function** `chat-consultor` (JWT + CORS + validación).
- **CI** GitHub Actions (tsc + test + build).
- **39 tests** (desde 0).
- **Documentación** completa en `docs/`.

## Opciones de merge

### A) Squash merge (1 commit en main)

```bash
# En GitHub UI:
# PR #1 → "Squash and merge" → mensaje:
```

**Título**:
```
feat: Valere v2 — CRM + Calculadora unificados (FASE 20-28)
```

**Mensaje**:
```
Refactor arquitectural completo + producto nuevo basado en la base FASE 13.

FASES incluidas:
- 20.0-20.10: Fusión CRM+Calculadora en arquitectura feature-based
- 21.a-21.c: Pipeline energético + alertas vencimiento + timelines
- 22: Incidencias · 23: Renovaciones · 24: Documentos/Storage
- 25: Notificaciones · 26: Exportación CSV + Informes · 27: Calendario
- 28 Ejes 1-3: Custom fields, Dashboards por rol, Automatizaciones
- 28.1-28.6: Hardening SQL, RLS granular, unificación visual,
  accesibilidad, DROP legacy

Stack: React 19 + Vite 6 + TS 5 + Tailwind 4 + Supabase + React Query.
Cobertura: 39 tests + CI activo + RLS granular multitenant.

Features: 20 dominios de negocio con feature-based architecture.
Ver README.md y docs/ para detalles.

https://github.com/jolivares-valere/valere-v2/pull/1
```

**Pros**:
- `main` queda con historial limpio (1 commit por PR grande).
- Fácil rollback (revert 1 commit).
- Tag `v2.0.0` directo sobre el merge commit.

**Contras**:
- Se pierde granularidad del trabajo por fase (pero queda en el branch y en el PR para consulta).

### B) Rebase merge (123 commits en main)

```bash
# En GitHub UI: PR #1 → "Rebase and merge"
```

**Pros**:
- Historial detallado en main.
- Cada FASE queda trazable con su commit original.

**Contras**:
- `git log --oneline main` muy largo.
- Rollback más complejo (¿qué commits revertir?).

### C) Merge commit clásico (`--no-ff`)

```bash
# En GitHub UI: PR #1 → "Create a merge commit"
```

**Pros**:
- Preserva historial completo.
- El merge commit marca claramente "aquí llegó FASE 20-28".

**Contras**:
- Historia menos lineal.

## Recomendación

**Opción A — Squash merge**.

Razonamiento:
1. El trabajo del branch es un **refactor + reescritura + features** — conceptualmente es un "v2 release", no una serie de fixes incrementales.
2. `main` hoy tiene solo FASE 13. El salto a FASE 28 es mejor representarlo como un solo hito.
3. Los ~42 commits individuales siguen accesibles en el PR cerrado si hay que investigar un cambio puntual.
4. Los tags de versión (`v2.0.0`) son más significativos sobre un único commit.

## Pasos para ejecutar el merge

### Pre-merge

1. **Verificar CI pasa** en el último commit del branch:
   - Debería estar verde si las dependencias están instaladas en el runner.
   - Si no hay CI configurado en GitHub todavía (esta infra se añadió 2026-04-20 pero puede no estar habilitado en el repo), correr localmente:
     ```bash
     npm install
     npx tsc --noEmit
     npm run test
     npm run build
     ```

2. **Supabase production en estado correcto**:
   - [ ] Migration `fase28.2` aplicada (RLS custom_fields + FKs user_profiles + get_user_rol)
   - [ ] DROP de `clients` + `supply_points` ejecutado
   - [ ] Migration `fase28.5` aplicada (FK `eventos_usuario_id_fkey`)
   - [ ] Migration `fase28.6` aplicada (policies granulares notificaciones + cleanup cfs duplicadas)
   - [ ] (opcional) Edge Function `chat-consultor` desplegada con secrets

3. **Environment variables en Vercel/hosting**:
   - [ ] `VITE_SUPABASE_URL`
   - [ ] `VITE_SUPABASE_ANON_KEY`

### Merge

1. En GitHub UI del PR #1: click "Squash and merge".
2. Pegar el título y mensaje de la opción A arriba.
3. Confirmar.
4. Borrar la branch `claude/valere-crm-architecture-2vvEV` (GitHub ofrece el botón tras el merge).

### Post-merge

1. **Tag de versión** en local:
   ```bash
   git checkout main
   git pull origin main
   git tag -a v2.0.0 -m "Valere v2 — CRM + Calculadora unificados"
   git push origin v2.0.0
   ```

2. **GitHub Release** opcional: desde el tag, añadir changelog resumido.

3. **Verificación en producción** (si ya hay Vercel):
   - Vercel auto-desplegará el merge a main. Esperar 2-3 min.
   - Recorrer el checklist de [`docs/DEPLOY.md#post-deploy-checklist`](./DEPLOY.md#post-deploy-checklist).

4. **Actualizar README de main**: ya viene incluido en el branch. No requiere acción extra.

5. **Archivar documentación transicional** (opcional, para limpieza):
   - `docs/ROADMAP_FUSION.md` → dejarlo como histórico; el producto ya está fusionado.
   - `docs/HANDOFF_*.md` → moverlos a `docs/SESIONES/` para que no queden en el root de `docs/`.
   - `docs/LEGACY_TABLES_KILL_LIST.md` → ya marcado como DONE, se puede archivar.

## Si algo se tuerce

- **Error en CI**: arreglar en branch, push, volver a intentar.
- **Error en Supabase tras merge**: las migrations son idempotentes; correr la que falte. Si falla, consultar `docs/LEGACY_TABLES_KILL_LIST.md` y `docs/ESTADO.md` para el estado esperado.
- **Rollback total**: `git revert <commit-del-merge>` en main. Recuperar el branch con `git checkout <branch>` si se había borrado (GitHub conserva ref por un tiempo).

---

**Nota sobre el orden**: este documento asume que `main` **no** tiene commits nuevos de Cowork u otros contribuyentes desde que se abrió el PR. Antes de mergear, verificar:

```bash
git fetch origin
git log --oneline origin/main | head -5
```

Si hay algo nuevo en `main` que no está en el branch, hacer rebase primero o planificar la integración.
