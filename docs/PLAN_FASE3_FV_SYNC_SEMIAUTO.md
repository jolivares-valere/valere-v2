# Plan Fase 3 — Sincronización FV semi-automática desde el CRM

> **Estado:** PROPUESTA para aprobación de Juan. NO se ha tocado código.
> **Fecha:** 2026-06-15
> **Autor:** Cowork (Agente 1)
> **Continúa:** `docs/PLAN_FIX_FV_CREDENCIALES.md` (Fase 1 ya desplegada).

---

## 1. La restricción que manda (no es código)

FusionSolar EU5 está tras el **CloudWAF de Huawei**. Con **cuenta de usuario final** (la que tiene Valere):

- El login **headless automatizado está bloqueado** (timeout esperando `/uniportal/`).
- Las cookies de sesión caducan en **~7–30 días**.
- Renovarlas exige un **login real con navegador visible** (posible CAPTCHA). Eso no puede correr en CI.

→ **Sincronización 100% automática y perpetua NO es posible** por scraping con esta cuenta. La única vía 100% automática es la **API Northbound oficial de Huawei**, que requiere **cuenta de organización/instalador** (gestión comercial con el instalador/Huawei, no código). Esto ya estaba documentado en `docs/ANALISIS_MATERIAL_2026-06-12.md` y `docs/DISENO_FV_MULTIPLATAFORMA_2026-06-14.md`.

**Decisión (Juan, 2026-06-15):** semi-automático robusto, manejado desde el CRM. Datadis aún no está resuelto, así que de momento se sigue con FusionSolar. La renovación de cookies la harán los usuarios del equipo (Juan, y más adelante Julia, Antonio, Carolina) **desde su propio PC**, con el mínimo esfuerzo posible.

---

## 2. Lo que ya existe (no rehacer)

- Cron diario: `.github/workflows/fv-sync.yml` (07:00 UTC) + `workflow_dispatch`.
- Edge Function `trigger-fv-sync`: el CRM ya puede disparar el sync (botón "Sincronizar" en `CredencialesTab`).
- `sync_job.py`: usa storage state de cookies (StorageStateClient) si es válido; si caduca, marca `estado_sesion='caducada'` y pide renovar.
- `extract_cookies.py`: renueva cookies con navegador visible y las sube cifradas a `fv_credenciales_secret`.
- El front YA detecta `caducada/error` y muestra el comando `python extract_cookies.py --cred <id>` como texto.

**El gap:** ese texto críptico exige saber Python, tener el `.venv` montado y las variables de entorno. No lo puede hacer cualquiera del equipo. Fase 3 lo convierte en **un botón + un lanzador de doble clic**.

---

## 3. Diseño objetivo

### 3.1 En el CRM (módulo Plantas FV → Credenciales)

Por cada credencial, dos acciones claras:

- **"Sincronizar ahora"** (ya existe) → dispara `trigger-fv-sync`. Solo tiene sentido si la sesión está activa.
- **"Actualizar sesión"** (NUEVO) → cuando la cookie caducó o falla:
  1. Marca la credencial `estado_sesion='renovando'` (estado nuevo).
  2. Muestra un panel con instrucciones **para humanos**: "Descarga/abre el Renovador Valere FV, se abrirá un navegador, inicia sesión en FusionSolar. Al terminar, vuelve aquí y pulsa Sincronizar."
  3. Opcional: botón "He renovado → Sincronizar" que dispara el sync.

### 3.2 El "Renovador Valere FV" (lo que hace fácil la renovación en cualquier PC)

Un **lanzador de doble clic** (`.bat`/`.ps1` o ejecutable) que envuelve `extract_cookies.py`:

- El usuario hace doble clic → se abre un navegador → inicia sesión en FusionSolar (resuelve CAPTCHA si sale).
- Las cookies se cifran (AES-256-GCM) y suben a `fv_credenciales_secret` en Supabase. **Nada sensible queda en el PC.**
- No requiere saber Python ni comandos. El setup inicial (instalar Python + Playwright + la clave) se hace una vez por PC con un script de instalación guiado.
- **Multiusuario:** funciona en el PC de Julia/Antonio/Carolina con el mismo instalador. La clave `FV_ENCRYPTION_KEY` y la `SUPABASE_SERVICE_KEY` se entregan de forma segura (1Password), no se hardcodean.

> ⚠️ **Seguridad a decidir:** el renovador necesita la clave de cifrado y una key de Supabase con permiso de escritura en `fv_credenciales_secret`. Repartir la `SERVICE_KEY` a varios PCs es un riesgo. Alternativa más segura: una Edge Function o key restringida que solo permita subir cookies de una credencial concreta (no acceso total). Se evalúa en la implementación.

### 3.3 Avisos automáticos (para no enterarse tarde)

- El cron, al detectar cookies que caducan en ≤3 días o ya caducadas, envía email (Resend, ya configurado) al equipo y marca rojo en el CRM.
- Así alguien renueva **antes** de que el sync se rompa.

---

## 4. Fases de implementación

### F3.1 — Estado `renovando` + botón en el CRM
- Añadir `renovando` al check de `estado_sesion` (migración pequeña).
- Botón "Actualizar sesión" en `CredencialesTab` que marca el estado y muestra el panel de instrucciones humanas.
- Sin tocar el flujo de cookies todavía. **Requiere aprobación SQL.**

### F3.2 — Renovador de doble clic (multiusuario)
- `scripts/fv-sync/renovar_sesion.bat` (o `.ps1`) que: activa el venv, lee credencial por id, lanza `extract_cookies.py` con navegador visible.
- `scripts/fv-sync/INSTALAR_RENOVADOR.ps1`: setup guiado por PC (Python + Playwright + Chromium + clave en variable de entorno de usuario).
- Guía `docs/help/RENOVAR_SESION_FV.md` con capturas para el equipo (la consume también el asistente RAG).

### F3.3 — Seguridad de la renovación multiusuario
- Decidir: ¿SERVICE_KEY en cada PC (simple, menos seguro) o Edge Function `fv-upload-cookies` con key restringida (más trabajo, más seguro)?
- Recomendación inicial: Edge Function dedicada que reciba el storage state, lo cifre server-side y lo escriba — el PC nunca tiene la SERVICE_KEY ni la FV_ENCRYPTION_KEY. Espejo de cómo `fv-create-credential` ya protege el password.

### F3.4 — Avisos de caducidad
- Lógica en `sync_job.py` (o un cron ligero) que avise por email cuando falten ≤3 días.
- Reusar el patrón Resend de las EF de auth.

### F3.5 — Verificación
- Renovar la sesión de JOLIVARES desde cero con el renovador → sync trae datos de las 7 plantas → KPIs en el CRM.
- Probar el flujo completo de botón → renovador → sincronizar.

---

## 5. Lo que NO resuelve este plan (honestidad)

- **No elimina la renovación manual periódica.** Cada 1–4 semanas alguien tendrá que renovar (2 min). Es inherente a la cuenta de usuario final + WAF.
- **La solución definitiva sin intervención humana** es la API Northbound oficial → requiere cuenta de organización del instalador. Recomendado tramitarlo en paralelo (gestión, no código). Cuando llegue, se añade como adaptador y se jubila el scraping.

---

## 6. Aprobaciones requeridas

1. ✅ Camino: semi-automático robusto desde el CRM (decidido).
2. ✅ Renovación desde el PC del usuario, multiusuario (decidido).
3. ⏳ Diseño de seguridad de la renovación (SERVICE_KEY en PC vs Edge Function dedicada) — recomiendo Edge Function.
4. ⏳ Migración `estado_sesion='renovando'` en Supabase.
5. ⏳ Empezar por F3.1 (botón + estado) o por F3.2 (renovador) — a tu preferencia.
