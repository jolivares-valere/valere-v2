# Handoff 2026-04-24 noche → siguiente sesión

## Estado al cierre

- **Rama**: `claude/docs-cierre-2026-04-23` → PR #6 abierto contra main, ampliado con 4 docs nuevos.
- **Sesión maratón** ~5h: migración CRM a Cloudflare + 2ª fuga credencial cerrada + mapa estratégico v4 + 4 docs entregables.
- **Working tree**: limpio.

## Lo más importante para próxima sesión

### 1. Lee el mapa estratégico ANTES de cualquier cosa

Está como artifact persistente en Cowork: **"valere-mapa-estrategico"**. Versión 4. Tiene 11 pestañas:

- 📊 Resumen
- 🔥 Arsys (urgente)
- 🧩 Apps
- 💾 Supabase
- 🧠 IA Stack
- ☁️ Hosting
- 🤖 Agentes
- 🔐 Credenciales
- 🎯 Decisiones
- 🎯 TO-BE
- 📋 Plan

Es el contexto consolidado del ecosistema Valere. **Si pierdes contexto, el mapa lo recupera.**

### 2. 4 docs nuevos en `docs/` que debes conocer

- `docs/INFORME_VALERE_GESTION_ENERGETICA.md` — informe del repo misterioso (no tiene Supabase, candidato a archivar).
- `docs/PLAN_UNIFICACION_SUPABASE.md` — plan exhaustivo 6 fases con mapeo campo a campo de tablas duplicadas. Para el sprint dedicado de unificación.
- `docs/COMUNICADO_NUEVO_URL_CRM.md` — email/Slack listo para enviar al equipo Valere.
- `docs/CREDENCIALES_1PASSWORD.csv` — 21 entradas importables.

### 3. Pendientes urgentes

1. **Verificar progreso rescate Arsys** — Juan lo gestiona con Claude web (otro agente). Pregúntale al arrancar.
2. **Mergear PR #6** cuando CI verde.
3. **Inventario Gemini cross-app** ahora con confianza alta de que las 2 keys son huérfanas (ninguna app activa las usa según análisis).
4. **Mandar comunicado** del nuevo URL CRM (`docs/COMUNICADO_NUEVO_URL_CRM.md`).
5. **Adoptar 1Password vault Valere** e importar el CSV.

### 4. Reglas clave aprendidas hoy

- **NUNCA revocar credenciales sin inventario cross-app** en proyectos con múltiples apps. Hoy casi se revocan 2 keys Gemini sin saber si Potencias/Excedentes/Energética las usan.
- **CRLF/LF noise tras merge en Cowork**: verificar con `git diff --numstat` antes de asumir cambios reales.
- **`mcp__cowork__allow_cowork_file_delete`** para lock files git huérfanos que el sandbox no puede borrar normalmente.
- **Workspace Business INCLUYE Gemini Advanced + NotebookLM Plus + Gemini API GRATIS** desde enero 2025. Si la empresa tiene Workspace, no pagar Gemini aparte sin necesidad.
- **OpenClaw + suscripción ChatGPT Empresa** = agentes batch sin coste por token.

### 5. Insights estratégicos consolidados

- **3 apps reales** (CRM + Potencias + Excedentes), no 1 + 3 dudosas.
- **2 proyectos Supabase con duplicidad masiva** que requieren sprint dedicado de unificación.
- **Cuenta Vercel suspendida**: CRM ya migrado a Cloudflare, Potencias pendiente de migrar.
- **Workspace AI infrautilizado**: 80€/mes con features ricas que nadie del equipo usa.
- **ChatGPT Empresa con Workspace Agents disponibles** (corrección de análisis previo).
- **`valere-gestion-energetica`** → archivar candidato (sin Supabase asociado).

## Cosas que NO hacer

- NO revocar las 2 keys Gemini de Google AI Studio sin antes inventario cross-app (potencias, excedentes, energética).
- NO reactivar Vercel sin revisar si compensa frente a Cloudflare Pages free.
- NO improvisar la unificación Supabase — seguir las 6 fases del plan.
- NO mergear PR a main sin CI verde + revisión.
- NO confundir las 2 cuentas ChatGPT que Juan va a reducir a 1 (Plus) — para verificar que OpenClaw siga activo.

## Mensaje para Juan al arrancar

"He leído el estado y el mapa estratégico v4. Recuerdo: hoy 24/04 hicimos migración a Cloudflare + 2ª fuga Gemini cerrada + mapa completo del ecosistema con 4 docs entregables. Lo más urgente sigue siendo el rescate Arsys (~17 días). ¿Cómo va el backup que estaba gestionando Claude web?"
