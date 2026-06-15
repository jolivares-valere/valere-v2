# Sesión 2026-06-15 — Fix Plantas FV credenciales (Fase 1)

## Qué se hizo

Chat dedicado al bug del módulo Plantas FV → Credenciales: "Nueva credencial" no guardaba.

**Diagnóstico (verificado contra BD viva):**
- Eran 2 bugs distintos: (A) guardado de credenciales, (B) login FusionSolar headless caído por WAF.
- Bug A — causa raíz: constraint `UNIQUE (plataforma, region_url, username)` rechazaba reutilizar el mismo login de instalador. Comportamiento errático porque `region_url` entraba a veces como NULL (NULL != NULL en UNIQUE). La EF tragaba el error y mostraba "Error interno" genérico. Había ya 2 credenciales (JOLIVARES, FOAM_RESIDENCIAS), no 1 → el fallo era intermitente, no total.
- Seguridad confirmada correcta (AES-GCM en fv_credenciales_secret, RLS, vista safe). No se tocó.

**Fase 1 implementada y desplegada:**
- Migración `20260615_fv_credenciales_fix_constraint.sql`: DROP constraint UNIQUE + normalizar region_url existentes + índice no único `idx_fv_credenciales_plataforma_username`. **APLICADA en Supabase.**
- EF `fv-create-credential`: normaliza region_url server-side (nunca NULL), chequeo de duplicado exacto → 409 con mensaje claro, propaga error real al toast. **DESPLEGADA v6 ACTIVE.**
- Front: sin cambios (api.ts ya renderiza err.error en el toast).
- PR #17 mergeado a main (commit 684d7d1). TSC 0 + 195 tests OK.

**Verificación en producción:**
- Constraint vieja eliminada (0). Índice nuevo presente (1). region_url de ambas credenciales normalizada a EU5. EF v6 ACTIVE.

## Qué quedó pendiente

- **Fase 3 — FusionSolar/cookies (Bug B):** login headless contra EU5 falla (TimeoutError esperando navegación a /uniportal/, WAF Huawei). Cookies de JOLIVARES caducaron 22/05; FOAM_RESIDENCIAS sin cookies. Investigación pendiente en `scripts/fv-sync/extract_cookies.py` + `fusionsolar_client.py`. Plan en `docs/PLAN_FIX_FV_CREDENCIALES.md` (Fase 3).
- **Fase 2 — UX formulario:** validación de duplicado en cliente, aclarar campos bloqueados al editar.
- QA manual de Juan: crear credencial con mismo usuario instalador + nombre distinto.

## Decisiones importantes

- Constraint: se eligió **eliminarla** (no UNIQUE sobre campos editables) — "la que menos problemas da a futuro". Integridad por id (PK) + aviso suave de duplicados en la EF.
- region_url nunca NULL: default por plataforma, server-side y en migración.

## Incidencias operativas

- Repo local volvió a quedar en rama fantasma `claud` (gremlin git) y con `.git/index.lock` huérfano. Requiere limpieza manual de Juan (sandbox no escribe en .git).
