# Seguridad — Valere CRM

Registro de decisiones de seguridad tomadas conscientemente. Complementa los advisors de Supabase: si un advisor sigue marcado, aquí queda documentada la razón y la mitigación aplicada.

> **Última revisión:** 2026-04-23

---

## Estado de advisors Supabase

Tras sprint 28.6 + 28.7a + 28.7b + 28.7c:

| Advisor | Estado | Comentario |
|---|---|---|
| security_definer_view (ERROR) | 0 restantes | Fase 28.7a cambió las 8 vistas a SECURITY INVOKER |
| rls_policy_always_true (WARN) | 0 restantes | Fase 28.6 + 28.7b granularizaron las policies |
| function_search_path_mutable (WARN) | 0 restantes | Fase 28.7c fijó search_path = public, pg_temp en 6 funciones |
| auth_leaked_password_protection (WARN) | 1 restante | No resoluble sin Pro plan. Ver paragraph 1 abajo. |

---

## Paragraph 1 — Leaked Password Protection (WARN persistente por decisión)

**Estado:** El toggle "Prevent use of leaked passwords" (HaveIBeenPwned API) está disponible solo en Supabase Pro plan (~25 USD/mes). El proyecto corre en plan Free, por lo que no se activa.

**Decisión tomada (2026-04-23):** no upgradear a Pro todavía. Mitigar con controles gratuitos en la configuracion de Auth.

**Mitigaciones aplicadas** en el dashboard (Authentication -> Providers -> Email):
- Minimum password length = 12 (subido desde 6)
- Password requirements = Lowercase, uppercase letters, digits and symbols
- Secure password change activo
- Require current password when updating activo

**Cobertura estimada:** ~90% de los passwords de HaveIBeenPwned son cortos (menos de 10 chars) o no cumplen requisitos mixtos. La mitigacion atrapa la mayoria.

**Cuando revisar la decision:**
- Al migrar a produccion con datos reales de clientes externos.
- Si se activa modulo de self-service de signup abierto (hoy los usuarios son internos y aprobados manualmente - ver handle_new_user()).
- Al superar 50 usuarios activos, el upgrade a Pro vale la pena por PITR + soporte, no solo por este toggle.

---

## Paragraph 2 — RLS activo en todas las tablas

Todas las tablas del schema public tienen RLS habilitado. Policies granulares por rol (admin, master, manager, client) verificadas en pg_policies. No queda ninguna policy con USING(true)/WITH CHECK(true) salvo las de SELECT (lectura general a authenticated, intencionada).

**Funcion helper:** public.is_manager_or_above() - usada en policies de escritura para tablas compartidas (facturas, proposals). public.get_user_rol() - devuelve rol canonico (master/manager se mapean a admin para compatibilidad).

---

## Paragraph 3 — Tokens y secretos

- .env en .gitignore. Contiene VITE_SUPABASE_* (publicos para cliente SDK) y SUPABASE_ACCESS_TOKEN (privado, solo para MCP desde Cowork / Claude Code CLI).
- Access tokens Supabase rotables desde https://supabase.com/dashboard/account/tokens.
- **Regla del proyecto:** no pegar tokens en chat (ni Cowork ni Claude Code). Pegarlos directamente en .env desde el terminal.

---

## Paragraph 4 — Edge Functions

- chat-consultor - ACTIVE. verify_jwt = true (requiere token de usuario autenticado).
- daily-contract-check - programable por cron, read-only.

---

## Paragraph 5 — Deuda tecnica residual (baja prioridad)

Items que no son advisor pero conviene no olvidar:

- handle_new_user() tiene hardcodeado jolivares@valereconsultores.com como master auto-aprobado. Razonable mientras sea proyecto interno; revisar si se abre a mas dominios.
- get_user_rol() colapsa master y manager en admin. Si en futuro se necesita distinguirlos a nivel de policy, cambiar el mapeo.
- Vista supply_points_compat es un shim de compatibilidad legacy (cups -> supply_points). Eliminable cuando el codigo no la referencie - verificar con grep.
