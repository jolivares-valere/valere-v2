# Plan de corrección — Módulo Plantas FV (credenciales + sync + FusionSolar)

> **Estado:** PROPUESTA para aprobación de Juan. NO se ha tocado código todavía.
> **Fecha:** 2026-06-15
> **Autor:** Cowork (Agente 1)
> **Ámbito:** `src/features/seguimiento-fv/`, `supabase/functions/fv-create-credential/`, `scripts/fv-sync/`, migración SQL nueva.
> **Regla operativa:** parche `.cjs` idempotente + PS1 (ASCII, TSC+tests, abort si falla) que ejecuta Juan. Rama `claude/fix-fv-credenciales` + PR. Nada en Supabase sin aprobación explícita.

---

## 1. Resumen ejecutivo

El módulo Plantas FV tiene **dos bugs independientes** que se estaban mezclando:

- **Bug A — Guardado de credenciales.** No se pueden guardar varias credenciales que reutilizan el mismo usuario instalador. La constraint `UNIQUE (plataforma, region_url, username)` las rechaza, la Edge Function hace `throw`, y el front muestra un toast genérico inútil. El comportamiento es **errático** porque `region_url` a veces entra como `NULL` (y `NULL != NULL` en UNIQUE, así que esas no chocan nunca).
- **Bug B — Comunicación con FusionSolar.** El login headless contra FusionSolar EU5 está fallando (timeout esperando navegación a `/uniportal/`), por el WAF de Huawei. Las credenciales existen pero sus sesiones están caducadas/erróneas, así que no llegan datos. Esto **no es el bug de guardado**.

La **arquitectura de seguridad es correcta** y no se toca salvo para mantenerla.

---

## 2. Evidencia verificada contra la BD viva (gtphkowfcuiqbvfkwjxb)

### 2.1 Hay 2 credenciales, no 1

| username | region_url | tipo | estado_sesion | cookies |
|---|---|---|---|---|
| `JOLIVARES` | `https://uni003eu5.fusionsolar.huawei.com` | instalador_multicliente | error | caducadas 2026-05-22 |
| `FOAM_RESIDENCIAS` | **`NULL`** | cliente_multiplanta | error | sin cookies (creada 2026-06-15 12:15) |

→ La Edge Function **sí** guardó una segunda credencial. El síntoma "solo hay una" es realmente "algunos intentos chocan con la constraint y otros no".

### 2.2 La constraint confirmada

```
fv_credenciales_plataforma_region_username_key  →  UNIQUE (plataforma, region_url, username)
```

- Índice: `fv_credenciales_plataforma_region_username_key`.
- Origen: migración `20260430_fv_schema_redesign.sql` (sustituyó la antigua `(empresa_id, plataforma, username)`).

### 2.3 El mecanismo exacto del fallo

1. **Con URL rellena** (lo normal en FusionSolar, autocompletada a `uni003eu5...`): dos credenciales del mismo instalador → clave `(fusionsolar, uni003eu5, JOLIVARES)` repetida → **constraint la rechaza** → la EF hace `throw credError` → el `catch` devuelve `{ error: 'Error interno del servidor' }` (500) → toast genérico.
2. **Con URL vacía** → `region_url = NULL` → `NULL != NULL` → nunca colisiona → **se guarda** (caso `FOAM_RESIDENCIAS`).
3. Resultado: fallo impredecible para el usuario, sin mensaje útil.

### 2.4 El error de FusionSolar (Bug B)

Ambas credenciales:
```
TimeoutError: Timeout 25000ms exceeded — waiting for navigation to "**/uniportal/**"
```
El flujo de `extract_cookies.py` busca la cookie `roarand` y espera navegación a `/uniportal/`. El WAF bloquea el login headless. Cookies de `JOLIVARES` caducaron el 22/05; `FOAM_RESIDENCIAS` nunca las tuvo. Documentado ya en `scripts/fv-sync/README.md` y en el propio código (`FusionSolarAuthError`).

### 2.5 La seguridad está bien (no se toca)

- Password cifrado **AES-256-GCM** en `fv_credenciales_secret` (tabla separada).
- `REVOKE ALL ON fv_credenciales_secret FROM authenticated, anon` + RLS sin policies → solo `service_role`.
- EF `fv-create-credential` valida JWT + rol `admin`/`master` antes de operar.
- Vista `fv_credenciales_safe` expone solo columnas no sensibles (verificado: no incluye `password_enc` ni `session_cookies`).
- El front nunca escribe `password_enc`; siempre pasa por la EF que cifra server-side.

---

## 3. Decisión de diseño: la constraint

**Decisión tomada con Juan (2026-06-15): "la que menos problemas genere en el futuro".**

Recomendación aplicada: **eliminar la constraint UNIQUE sobre campos de negocio editables**.

- **Quitar** `UNIQUE (plataforma, region_url, username)`.
- **No** poner `nombre` en ninguna constraint (es editable → renombrar rompería flujos).
- Permitir N credenciales con el mismo login instalador (caso real y legítimo: 1 login → N propósitos/clientes).
- Prevenir solo el **duplicado accidental exacto** mediante chequeo informativo en la EF (no constraint rígida): si ya existe `(plataforma, username, region_url normalizada)` con el mismo `nombre`, avisar — no bloquear a la fuerza.
- **Normalizar `region_url`:** nunca guardar `NULL`. Si el campo va vacío → URL por defecto de la plataforma. Elimina el comportamiento errático y deja la columna consistente.

**Justificación:** las UNIQUE sobre username/nombre/URL son las que rompen meses después al cambiar la URL del portal o renombrar. El modelo `1 credencial → N plantas` no necesita esa rigidez; la integridad la garantiza el `id` (PK artificial) y un aviso suave de duplicados.

---

## 4. Plan por fases

### FASE 1 — Desbloquear el guardado (prioridad máxima)

**1.1 Migración SQL** (`supabase/migrations/20260615_fv_credenciales_fix_constraint.sql`)
- `ALTER TABLE fv_credenciales DROP CONSTRAINT IF EXISTS fv_credenciales_plataforma_region_username_key;`
- Backfill: `UPDATE fv_credenciales SET region_url = 'https://uni003eu5.fusionsolar.huawei.com' WHERE plataforma='fusionsolar' AND region_url IS NULL;` (y equivalente por plataforma para el resto, usando los `urlDefault` del front).
- (Opcional, salvaguarda suave) índice **no único** sobre `(plataforma, username)` para acelerar el chequeo de duplicados de la EF.
- Idempotente y reversible (incluye nota de rollback).
- **Requiere aprobación de Juan antes de aplicar en Supabase.**

**1.2 Edge Function `fv-create-credential/index.ts`**
- Normalizar `region_url` server-side: si viene vacío/null → URL por defecto de la plataforma (tabla de defaults dentro de la EF, espejo del front).
- Antes del insert: chequeo informativo de duplicado exacto `(plataforma, username, region_url, nombre)`. Si existe → devolver `409` con mensaje claro: *"Ya existe una credencial con ese nombre para ese usuario y portal."*
- **Propagar el error real**: en el `catch`, si es violación de constraint o duplicado, devolver el mensaje útil (no "Error interno del servidor"). Mantener: nunca loguear username/password.
- Redeploy de la EF (nueva versión). **Requiere aprobación.**

**1.3 Front `api.ts` + `CredencialFormModal.tsx`**
- Mostrar en el toast el mensaje real que devuelve la EF (ya pasa por `err.error`; verificar que el 409 se renderiza bien).
- (UX) chequeo opcional de duplicado antes de enviar, con feedback inmediato.

**1.4 Verificación Fase 1**
- TSC 0 + tests verdes.
- Prueba manual: guardar 3+ credenciales con el mismo usuario instalador y nombres distintos → todas se guardan.
- Confirmar que la seguridad sigue intacta (vista safe, RLS, cifrado).

### FASE 2 — UX del formulario
- Edición: aclarar por qué `username`/`plataforma` están bloqueados al editar (o permitir cambiarlos con cuidado).
- Validación de duplicado en cliente con mensaje antes del submit.
- Pulir el aviso de seguridad y los estados de error.

### FASE 3 — Comunicación FusionSolar / cookies (Bug B)
- Auditar `extract_cookies.py` + `fusionsolar_client.py` (flujo headless vs no-headless, espera a `/uniportal/`, detección de `roarand`).
- Diseñar flujo robusto de **renovación de cookies** (probablemente sesión asistida no-headless, como ya está documentado) y su disparo desde el CRM.
- Revisar el timeout (25s) y la detección de WAF/redirect a login.
- Es investigación con final incierto: se aborda **después** de que guardar funcione.

### FASE 4 — Verificación global
- TSC 0 + tests, build OK.
- Auditoría de seguridad del cambio (subagente `valere-auditor` si procede).
- Prueba end-to-end: guardar credencial → renovar cookies → sync → datos en UI.
- Actualizar `docs/ESTADO.md`, `docs/SESIONES/`, outbox.

---

## 5. Ficheros que se tocarán

| Fichero | Cambio | Fase |
|---|---|---|
| `supabase/migrations/20260615_fv_credenciales_fix_constraint.sql` | NUEVO — drop constraint + backfill region_url | 1 |
| `supabase/functions/fv-create-credential/index.ts` | Normalizar region_url, chequeo duplicado, error real | 1 |
| `src/features/seguimiento-fv/api.ts` | Render del mensaje 409, (opc) chequeo previo | 1-2 |
| `src/features/seguimiento-fv/components/CredencialFormModal.tsx` | UX duplicado, mensajes | 2 |
| `scripts/fv-sync/extract_cookies.py` | Robustez login/cookies | 3 |
| `scripts/fv-sync/fusionsolar_client.py` | Timeout, detección WAF | 3 |

---

## 6. Lo que NO se toca

- Tablas `clients`, `supply_points`, `users_profile` (no existen).
- Arquitectura de cifrado AES-GCM ni `fv_credenciales_secret`.
- RLS de `fv_credenciales` / `fv_credenciales_secret`.
- Modelo `1 credencial → N plantas` (`fv_planta.credencial_id`).

---

## 7. Aprobaciones requeridas antes de aplicar

1. ✅ Diseño de constraint (decidido: eliminarla + normalizar region_url).
2. ✅ Orden: guardado primero, luego FusionSolar.
3. ⏳ **Aplicar migración SQL en Supabase** — pendiente OK de Juan.
4. ⏳ **Redeploy de la Edge Function** — pendiente OK de Juan.
