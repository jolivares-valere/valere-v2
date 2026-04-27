# Auditoría de Seguridad Valere CRM — 2026-04-27

**Contexto**: Juan ha pedido auditoría completa antes de continuar con integración Holded. CRM gestiona datos de clientes (NIFs, IBANs, datos energéticos, contratos). RGPD aplicable como responsable de tratamiento.

**Alcance**: Supabase backend, RLS, Edge Functions, Auth, frontend, código fuente, infraestructura, gestión de secretos, backups.

---

## 🔴 HALLAZGOS CRÍTICOS (acción esta semana)

### C-01 — Passwords DB Supabase circularon por chat de Cowork

- **Severidad original**: ALTA. Vector: los passwords iniciales `6GXTWmUuvcyWRCWj` y `80qkw0RsaQoSTMUX` pasaron por chat de Cowork.
- **Estado verificado 2026-04-27**: ✅ RESUELTO. Durante el debug de conexión Fase 2 unificación Potencias, Juan reseteó AMBOS passwords desde Supabase Dashboard porque los originales fallaban (auth failed). Los nuevos passwords (los actualmente activos en variables `VALERE_CRM_DB_PASSWORD` / `VALERE_POTENCIAS_DB_PASSWORD`) NUNCA pasaron por chat — Juan los metió directamente en `[Environment]::SetEnvironmentVariable(..., 'User')`. Los anteriores quedaron automáticamente invalidados desde el reset (Supabase invalida el anterior al generar uno nuevo).
- **Riesgo residual**: cero. Recomendación: guardar los actuales en 1Password si todavía no está hecho.

### C-02 — RLS débil en `incidencias` y `renovaciones`

- **Severidad**: ALTA. Una sola policy `FOR ALL` con `auth.role() = 'authenticated'` → cualquier usuario autenticado puede leer/insertar/modificar/borrar TODAS las incidencias y renovaciones, sin filtrar por rol ni por propiedad.
- **Vector**: un comercial podría borrar incidencias de otros, modificar renovaciones que no son suyas.
- **Datos afectados**: incidencias (datos de clientes, problemas con suministros), renovaciones (datos comerciales sensibles).
- **Acción**: aplicar el patrón granular (SELECT abierto authed, INSERT/UPDATE creador-o-manager+, DELETE manager+). Mismo patrón que el RLS hardening que aplicamos hoy a las 8 tablas Potencias-side.
- **Estimación**: 15 min via MCP `apply_migration`.
- **Estado**: pendiente.
- **Documento previo**: `docs/AUDIT_RLS_DEBIL_2026-04-26.md` ya identifica este problema.

### C-03 — Inconsistencia de nomenclatura de roles

- **Severidad**: ALTA por riesgo de bypass.
- Algunas tablas (`documentos`, `eventos`) usan roles textuales: `'admin'`, `'jefe_equipo'`, `'comercial'`, `'visor'`.
- Otras tablas y `user_profiles` usan: `'master'`, `'manager'`, `'consultant'`, `'client'`.
- **Vector**: si se crea un user con rol `'comercial'` (no existe en el sistema actual de roles), las policies de documentos/eventos lo aceptarían y el AuthGuard frontend probablemente no, creando inconsistencia. Y al revés, un user con `'master'` no encaja en las policies de documentos.
- **Acción**: decidir UNA nomenclatura canónica + migration que unifique todas las policies. Recomendación: mantener `master`/`manager`/`consultant`/`client` (ya en `user_profiles`) y migrar policies de documentos/eventos.
- **Estimación**: 30 min análisis + 15 min migration.
- **Estado**: pendiente decisión Juan.

### C-04 — Riesgo futuro Datadis: passwords clientes en texto plano

- **Severidad**: CRÍTICA cuando se active.
- `useDatadis.ts:231` acepta `password_enc.startsWith('plain:')` → un password de cliente Datadis puede guardarse sin encriptar.
- **Estado actual**: tabla `datadis_tokens` vacía, NO HAY passwords todavía. Pero en cuanto el equipo empiece a usarlo, podrían guardar plain.
- **Datos afectados (futuro)**: credenciales de clientes para acceder a Datadis (consumos eléctricos personales). Brecha RGPD si se filtra.
- **Acción**: rechazar `plain:` en el código. Forzar encriptación AES-256 con clave en Supabase Vault. Función `encrypt_datadis_password()` SECURITY DEFINER que solo acepta texto y devuelve cifrado.
- **Estimación**: 1-2h (función SQL + refactor frontend + migration).
- **Estado**: pendiente.

### C-05 — Tablas `documentos` y `eventos` con policies para role `{public}` en lugar de `{authenticated}`

- **Severidad**: MEDIA (defensa en profundidad).
- Las policies actualmente protegen vía `get_user_rol() = ANY(...)` que devuelve null para anon, así que no hay leak. Pero el role en la policy debería ser `{authenticated}` explícitamente.
- **Acción**: re-crear las 8 policies (4 de documentos + 4 de eventos) con `to authenticated`.
- **Estimación**: 5 min via MCP.
- **Estado**: pendiente.

---

## 🟡 HALLAZGOS MEDIOS (siguiente sprint)

### M-01 — MFA no obligatorio en Supabase Dashboard

- Cualquier admin con email + password puede acceder al Dashboard. Sin segundo factor.
- **Acción**: forzar MFA en cuenta organización Supabase. Cada admin (Juan + futuros) debe tener TOTP/passkey.
- **Estimación**: 5 min Juan + cada admin.

### M-02 — Sin Network Restrictions en Supabase

- La DB acepta conexiones desde cualquier IP del mundo si tiene credenciales válidas.
- **Acción**: en Supabase Dashboard → Settings → Database → Network restrictions → whitelist IPs de oficina + IPs de Cloudflare Pages workers + IP estática personal de Juan. Bloquear el resto.
- **Estimación**: 15 min análisis + 5 min config. Cuidado: los pooler endpoints (que la app usa) suelen ser internos a Supabase y no se ven afectados — verificar.

### M-03 — Sin audit log de operaciones sensibles

- No registramos quién hizo qué cuándo (login, exports CSV, cambios de rol, borrado de empresas, etc.).
- **Acción**: tabla `audit_log` con triggers en tablas críticas (user_profiles para cambios de rol, empresas/documentos para borrados). Página `/admin/auditoria` solo master.
- **Estimación**: 1 sprint corto (1 día).

### M-04 — Logs Supabase con retención 7 días (plan Free)

- Si pasa algo y nos enteramos a 8 días, no hay logs.
- **Acción**: o bien upgradar a plan Pro (retención 30d) o crear Edge Function que exporte logs críticos a Cloudflare R2 / S3 cada noche.
- **Estimación**: 4h si propio.

### M-05 — Sin backup offsite

- Backups Supabase son automáticos diarios pero quedan en su infra. Si Supabase tiene incidente nuestro, perdemos todo.
- **Acción**: cron diario que hace `pg_dump` y sube a R2 Cloudflare (gratis hasta 10GB) cifrado con key del usuario. Retención 30d.
- **Estimación**: 1 día (Edge Function + R2 + verificación restore).

### M-06 — `auth_leaked_password_protection` desactivado

- Supabase ofrece comprobar contra HaveIBeenPwned al hacer signup (rechaza passwords filtrados). Está OFF.
- **Estado verificado 2026-04-27**: feature requiere **Plan Pro Supabase ($25/mes)**. NO se puede activar en Free. Toggle ubicado en Authentication → Sign In / Providers → Email → "Prevent use of leaked passwords".
- **Mitigación parcial activa (Free)**:
  - Min password length 12 chars ✅
  - Required complexity: lowercase + uppercase + digits + symbols ✅
  - Secure email change + secure password change + require current password ✅
  - Estas medidas hacen los passwords muy difíciles de adivinar; HIBP solo añade comprobación contra leaks conocidos.
- **Decisión 2026-04-27**: NO upgrade a Pro solo por HIBP. Riesgo residual aceptable. Reevaluar cuando se necesite Pro por otras razones (PITR backups, retención logs 30d, branching).

### M-07 — `crm_help_embeddings` lectura abierta a authenticated

- Embeddings de docs internos del CRM accesibles a cualquier user. Probablemente OK (son docs internos de ayuda) pero documentar.
- **Acción**: revisar si los docs contienen alguna info sensible. Si no, mantener; si sí, restringir a manager+.

### M-08 — Funciones SECURITY DEFINER expuestas a anon

- `admin_reject_user`, `cleanup_pending_users_older_than_7_days`, `get_user_rol`, `handle_new_user`, `is_approved`, `is_manager_or_above`.
- Cada función valida internamente, pero exponer superficie no es ideal.
- **Acción**: REVOKE EXECUTE FROM anon en las que NO necesite ser pública. Mantener handle_new_user (auth) y otras solo para authenticated.
- **Estimación**: 10 min.

---

## 🟢 LO QUE ESTÁ BIEN

- ✅ Todas las tablas tienen RLS habilitado (43 tablas verificadas).
- ✅ 0 policies abiertas explícitamente a `anon`.
- ✅ RLS hardening de 8 tablas Potencias-side aplicado hoy.
- ✅ Tablas `_migration_*_map` cerradas a manager+.
- ✅ API keys (Resend, Gemini, Holded) en Edge Function Secrets, NO en repo.
- ✅ Service role key NO usada en frontend (solo en Edge Functions Deno).
- ✅ HTTPS forzado en Supabase (toggle "Enforce SSL").
- ✅ AuthGuard frontend bloquea `approved=false` → /pending-approval.
- ✅ Signup público con aprobación manual del admin (no auto-acceso).
- ✅ Cron pg_cron diario que borra signups pendientes >7d.
- ✅ Edge Functions verify_jwt=true (excepto las públicas que validan internamente).
- ✅ Backups automáticos Supabase activos (diario, 7d retención).

---

## 📋 PLAN DE ACCIÓN PRIORIZADO

### Esta sesión (1h, AHORA antes de Holded)

1. **C-01** Rotar passwords DB Supabase (Juan + Browser, 5 min)
2. **C-02** RLS hardening incidencias + renovaciones (Cowork via MCP, 15 min)
3. **C-05** Cambiar `{public}` → `{authenticated}` en documentos/eventos (Cowork via MCP, 5 min)
4. **M-06** Toggle leaked password protection (Juan en Dashboard, 1 min)
5. **M-08** REVOKE EXECUTE de funciones SECURITY DEFINER expuestas a anon (Cowork via MCP, 10 min)

### Próxima sesión (esta semana)

6. **C-03** Decidir nomenclatura única de roles + migration (Juan decide + Cowork, 1h)
7. **C-04** Forzar encriptación passwords Datadis (Cowork sprint, 2h)
8. **M-01** MFA obligatorio Supabase (Juan, 5 min)
9. **M-02** Network restrictions Supabase (Juan + análisis IPs, 30 min)

### Próximo sprint dedicado (1-2 días)

10. **M-03** Audit log de operaciones sensibles
11. **M-05** Backup offsite cifrado a R2 Cloudflare

### Backlog (mes)

12. **M-04** Retención logs >7d (decisión upgrade Pro vs export propio)
13. Política RGPD escrita: registro de tratamientos, consentimientos, derechos ARSULIPO documentados.
14. Plan de incident response (qué hacer si hay brecha).

---

## 🔐 RECOMENDACIÓN PARA INTEGRACIÓN HOLDED

**ANTES** de arrancar Fase 0 Holded, completar acciones 1-5 de "Esta sesión" (1h total). Razones:

1. La nueva sesión Cowork Holded recibirá datos de clientes para sincronizar con Holded. Si las RLS de incidencias/renovaciones están débiles, cualquier comercial puede ver datos que no le corresponden.
2. Holded API Key se va a meter en Edge Function Secrets — el patrón está validado pero merece confirmar que sigue siendo seguro post-rotación passwords.
3. La integración Holded añadirá nuevas tablas (`holded_*`) que deben nacer YA con RLS granular desde el inicio (estará en el plan).

---

## Notas RGPD

Como responsable de tratamiento de datos personales (clientes B2B+B2C españoles), Valere Consultores debe:

- Mantener registro de tratamientos.
- Tener documentado encargado de tratamiento (Holded como sub-encargado al activar la integración).
- Permitir derechos ARSULIPO (acceso, rectificación, supresión, limitación, portabilidad, oposición).
- Notificar brechas en 72h al regulador (AEPD).
- Cifrar datos sensibles en reposo y tránsito.
- Política de retención clara.

**Estado actual**: ninguno de estos puntos está formalmente documentado. Recomendación: redactar `docs/RGPD_REGISTRO_TRATAMIENTOS.md` y `docs/RGPD_POLITICA_PRIVACIDAD.md` antes de integrar Holded (que añade flujo de datos a tercero).

---

## Resumen ejecutivo

- **Estado actual**: nivel de seguridad MEDIO. Buena base (RLS habilitado, secretos fuera del repo) pero con huecos serios (passwords clientes potencialmente en plano, RLS débil en 2 tablas, sin MFA, sin audit log).
- **Acciones inmediatas**: 5 acciones críticas que cierran ~70% del riesgo en 1h.
- **Esta semana**: 4 acciones medias que cierran otro ~20%.
- **Próximo sprint**: audit log + backup offsite (~10% restante).
- **RGPD compliance**: pendiente documentación formal antes de Holded.
