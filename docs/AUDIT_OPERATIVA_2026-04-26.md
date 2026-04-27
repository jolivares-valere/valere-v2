# Auditoría operativa pre-producción — Lunes 2026-04-27

> Fecha: domingo 2026-04-26 ~mediodía. Autor: Cowork (auditoría autónoma vía MCP).
> Alcance: CRM Valere (`valere-v2.pages.dev`) + BBDD CRM (`gtphkowfcuiqbvfkwjxb`) + BBDD Potencias (`alesfvxqtwlrwlmkoosg`) + app Gestión de Potencias (verificada indirectamente).
> Tipo: lectura — sin commits, sin DDL, sin operaciones destructivas.

---

## 0 · Veredicto top

**🟡 ÁMBAR — se puede operar mañana, pero solo si la operativa es la actual (CRM-Valere + Potencias-app como dos apps separadas), NO si la expectativa es que CRM-Valere ya tenga absorbidos los expedientes/clients/supplies de Potencias.**

- 🟢 **CRM Valere** (`valere-v2.pages.dev`) — vivo, asistente RAG operativo, schema unificado en BBDD, compat views funcionando.
- 🟢 **Gestión de Potencias** (Supabase `alesfvxqtwlrwlmkoosg`) — datos íntegros, 30 clients / 75 supplies / 41 expedientes / 100 PDFs en storage.
- 🔴 **Fase 2 datos** sin migrar: las tablas Potencias-side del CRM están vacías. Si alguien espera ver los expedientes en CRM-Valere mañana, no estarán.
- 🔴 **Commit `b9eaff3` no pushed** — el código del repo y el código en producción de Cloudflare Pages están desincronizados (prod va por delante en algunas cosas y por detrás en otras).
- 🔴 **Doble dominio vivo**: `valere-v2.pages.dev` (200 OK) y `valere-v2.vercel.app` (200 OK con build distinto). El equipo está aún logueando via Vercel.
- 🟡 **RLS débil** en 11 tablas (8 confirmadas por advisors + 3 detectadas en draft sprint 8). Aceptable durante operativa interna; no para un cutover público.
- 🟡 **Email rate-limit de Supabase** ya saturó ayer al invitar a 3 usuarios. Si se invitan más cuentas mañana, el flujo de bienvenida puede romperse.

---

## 1 · Bloqueantes hard ordenados por severidad

### 🔴 H1 · Doble URL viva — `valere-v2.pages.dev` y `valere-v2.vercel.app` sirven la app
**Severidad:** alta · **Tiempo:** 30 min · **Owner:** Juan (Cloudflare DNS + Supabase Dashboard)

**Evidencia.** `web_fetch` a ambas URLs devuelve 200, con assets distintos (`index-BXcT9RYg.js` en Vercel vs `index-jX1GLA2-.js` en Pages). Los logs auth de Supabase muestran que **TODO el equipo está aún logueando via `https://valere-v2.vercel.app`** durante las últimas 48h (Juan Olivares 2026-04-25 13:25, soporte@/administracion@/arodriguez@ invitados desde la URL Vercel, signup `cowork-test-1777194191@gmail.com` 2026-04-26 09:03). CLAUDE.md afirma que Vercel está suspendida desde 2026-04-24 — falso o desactualizado: sigue sirviendo. Los dos builds NO están sincronizados (hashes distintos).

**Riesgos concretos.**
1. Si Juan confirma a su equipo "ya estamos en pages.dev" y un comercial entra por bookmark a vercel.app, ve un build distinto.
2. Si un email de invitación / reset password lleva al dominio guardado en Supabase Auth → Site URL, puede llevar a uno mientras el equipo opera en el otro.
3. Si Vercel se cae de verdad mañana (cuenta suspendida), el equipo que entre por bookmark a vercel.app pierde acceso.

**Acción mínima para hoy.**
1. Supabase Dashboard → Authentication → URL Configuration → confirmar que `Site URL` apunta a `https://valere-v2.pages.dev` y la lista de Redirect URLs no contiene `vercel.app` (o que contiene ambas hasta cutover formal).
2. Comunicado al equipo (`docs/COMUNICADO_NUEVO_URL_CRM.md` — ya redactado, falta enviarlo): URL única `valere-v2.pages.dev`. Borrar bookmarks viejos.
3. Decidir si se apaga Vercel hoy (redirect 301 → pages.dev) o se deja correr en paralelo otra semana. Si se deja, **forzar CI Vercel a desplegar el mismo commit que Pages** o aceptar el desfase explícitamente.

---

### 🔴 H2 · Commit `b9eaff3` local, no pushed a `origin/main`
**Severidad:** alta · **Tiempo:** 5–60 min según se ejecute o se aplaque · **Owner:** Juan (PowerShell / `RUNBOOK.ps1`)

**Evidencia.** `git log origin/main..HEAD --oneline` → `b9eaff3 feat(unificacion): sprints 5+6+7+8 + paralelos A/B/C - cierre acumulado`. Working tree con muchos archivos modificados (mezcla de cambios reales + ruido CRLF/LF en .cowork/ por el mount Windows).

**Implicaciones.**
- Lo que ESTÁ en producción (Cloudflare Pages) corresponde al commit anterior (`63312e6` o predecesor que disparase build). Es decir: la FE refactor de `comercializadoras`/`comercializadora_ofertas` y el resto de los sprints 5-8 **no están desplegados**.
- Las **compat views** (`retailers`, `retailer_offers`, `boe_regulated_prices`) están en BBDD y absorben las llamadas legacy del frontend antiguo → **el CRM funciona** sin push, gracias a la red de seguridad. Confirmado por counts (retailers=6, boe=29).
- Si Juan pushea sin tests, Cloudflare hará deploy automático del refactor + Edge function v10 + drop de policies viejas → posibilidad de regresión visible al usuario.

**Recomendación.** No pushear hoy. Mañana operar con la versión actualmente desplegada (que funciona). Pushear el martes/miércoles después de smoke test guiado por Juan en local con `npm run build && npm run preview`.

Si el push es inevitable hoy: ejecutar `RUNBOOK.ps1` en modo `-DryRun` primero, luego `-SkipPush`, validar tsc + tests, y solo entonces quitar el flag.

---

### 🔴 H3 · Fase 2 datos NO migrada — CRM-Valere muestra 0 expedientes / 0 ciclos / 0 power_requests
**Severidad:** alta si la operativa de mañana asume CRM unificado · **Tiempo:** 30-90 min vía `pg_dump` + `psql` siguiendo `scripts/unificacion_fase2_protocolo.md` · **Owner:** Juan (PowerShell con connection strings)

**Evidencia (counts via MCP).**

| Tabla en CRM (gtphkowfcuiqbvfkwjxb) | Filas | Tabla en Potencias (alesfvxqtwlrwlmkoosg) | Filas |
|---|---|---|---|
| `expedientes` | 0 | `expedientes` | 41 |
| `ciclos` | 0 | `ciclos` | 41 |
| `solicitudes_potencia` | 0 | `power_requests` | 41 |
| `savings_calculations` (CRM-side) | 0 | `savings_calculations` | 41 |
| `comunicaciones_cliente` | 0 | `client_communications` | 31 |
| `comercializadora_docs` | 0 | `comercializadora_docs` | 1 |
| `documentos` (polimórfico) | 0 | `client_documents` + `expediente_documents` | 70 + 27 = 97 |
| `status_log` (CRM) | 0 | `status_log` | 91 |

**Total ≈ 410 filas** que NO han migrado al CRM. Storage Potencias bucket `documents` (71 obj / 2.3 MB) y `expediente-docs` (29 obj / 13 MB) = 100 PDFs sin contraparte en CRM bucket `documentos` (vacío).

**Impacto operativo.**
- Si el lunes Juan o el equipo abre CRM-Valere → módulo Expedientes/Ciclos: **vacío**. Si el flujo del lunes es "abrir expediente del cliente X y avanzar de ciclo a propuesta", no se puede hacer desde el CRM.
- Si el flujo es "operar Potencias-app contra `alesfvxqtwlrwlmkoosg`" (status quo pre-fusión): **funciona perfectamente**. Los 30 clientes / 75 supplies / 41 expedientes / 100 PDFs están vivos en el proyecto Potencias.

**Recomendación.** Confirmar con Juan el escenario de mañana:
- **Escenario A (status quo, recomendado):** seguir operando Potencias-app contra su Supabase + CRM-Valere para el comercial-CRM normal (empresas, contactos, oportunidades, contratos). Cero acción técnica hoy. La Fase 2 datos se puede ejecutar en una ventana low-traffic durante la semana.
- **Escenario B (cutover unificado mañana):** ejecutar Fase 2 hoy o esta noche siguiendo `scripts/unificacion_fase2_protocolo.md` (~60 min). Backups previos obligatorios. Tras la migración, smoke test manual. Si falla, rollback con backup. **Riesgo:** primera vez que se ejecuta Fase 2 contra prod, sin staging Pro.

---

### 🟠 H4 · `valere-gestion-potencias` Supabase: 0 edge functions, RLS débil estructural, 18 advisors performance
**Severidad:** media-alta para producción · **Tiempo:** sin acción si se sigue Escenario A · **Owner:** —

**Evidencia.**
- `list_edge_functions` → vacío. La app Gestión-Potencias no tiene backend serverless aquí; depende de operaciones cliente directas + RLS.
- 18 policies con patrón `"Authenticated users full access" USING auth.role()='authenticated'` (auth_rls_initplan WARN) → re-evaluación auth() per row. No bloqueante con datos pequeños (75 supplies, 41 expedientes).
- 16 unindexed FKs (`alerts.ciclo_id_fkey`, `client_documents.ciclo_id_fkey`, etc.). Tampoco bloqueante a este volumen.
- Migrations applied = 1 (`classify_tables_by_domain`). Todo el resto del schema fue creado fuera del flujo `supabase migration` → drift contra cualquier IaC futuro.

**Recomendación.** No tocar para mañana. Documentar el drift en `docs/PLAN_MIGRACION_POTENCIAS_CLOUDFLARE.md` o `PLAN_UNIFICACION_FASE_6_2026-04-26.md` para que cuando se haga el decommission de este Supabase no se pierda la auditoría.

---

## 2 · Bloqueantes blandos (rompen experiencia, no impiden operar)

### 🟡 B1 · 11 tablas con RLS efectivamente abierta a `authenticated`
Detalle vía `pg_policies`:

- **8 confirmadas en advisors** (USING(true) WITH CHECK(true) ALL): `alertas`, `ciclos`, `comercializadora_docs`, `comunicaciones_cliente`, `excel_import_templates`, `expedientes`, `savings_calculations`, `solicitudes_potencia`.
- **3 detectadas en sprint 8 sin advisor (porque la advisor solo cuenta WITH_CHECK ALL)**: `incidencias` (1 policy `incidencias_all_authenticated`), `renovaciones` (1 policy `renovaciones_all_authenticated`), `documentos` (4 policies granulares — OK, listada por error en draft sprint 8).

**Riesgo.** Cualquier usuario autenticado en CRM-Valere puede leer/escribir/borrar todas las filas de esas tablas. Si mañana entra el equipo y cada comercial actúa sobre los expedientes/ciclos del otro sin querer, no hay barrera.

**Mitigación inmediata.** Ninguna técnica si la confianza interna del equipo es alta. Aplicar `supabase/migrations/_pending_rls_hardening_8_tables.sql` después de Fase 2 datos para tener usuarios reales con `comercial_id` poblado y poder testear las policies granulares.

### 🟡 B2 · Email rate-limit Supabase saturado
Logs auth muestran 2 × `429: email rate limit exceeded` el 2026-04-25 11:19-11:20 invitando a `soporte@valereconsultores.com`. Otras 2 invitaciones a `arodriguez@` y `administracion@` SI llegaron (200 OK + `mail.send`).

**Implicación.** Supabase free tier limita emails a ~4/h. Si Juan invita 5+ comerciales mañana en bloque, las últimas no recibirán email.

**Mitigación.** Invitar en bloques pequeños (2-3 cada 30 min) o configurar SMTP propio en Supabase Dashboard → Authentication → SMTP Settings (Resend, SendGrid, Postmark...).

### 🟡 B3 · Edge function `chat-consultor` huérfana en CRM
Versión 7 ACTIVE, JWT verify ON. ESTADO.md sprint 5 marcaba "eliminar" — sin imports en `src/`. Sigue desplegada. No rompe nada (`verify_jwt=true` impide llamadas anónimas) pero acumula bloat.

**Mitigación.** En la próxima sesión: `supabase functions delete chat-consultor`. No bloquea mañana.

### 🟡 B4 · Working tree con mucha modificación legítima sin commitear
El `git status -sb` muestra ~30 archivos `M` (mayoría en `.cowork/inbox`/`.cowork/outbox`, `.claude/agents/`, `.claude/skills/`). Mezcla de ruido CRLF/LF + cambios reales (AGENT_PLAYBOOK actualizado, RUNBOOK.ps1, etc.). Ya está incluido en el commit `b9eaff3` no pushed (ver H2).

### 🟡 B5 · `proposals` table viva con 0 filas
Decisión Juan en sprint 7. No estorba pero AnalisisPage hace `.insert('proposals')` y eso seguirá funcionando si alguien analiza facturas mañana. Verificar que el FE no se queja por la coexistencia con `propuestas` (CRM canónico).

---

## 3 · Riesgos de operación y plan de respuesta

| Riesgo | Probabilidad | Impacto | Plan de respuesta |
|---|---|---|---|
| Push accidental de `b9eaff3` dispara deploy roto | media | alto | Si Cloudflare Pages tiene auto-deploy de `main` activado, considerar deshabilitarlo hoy. Re-habilitar tras smoke test. |
| Email de invitación lleva al dominio equivocado | media | medio | Revisar Site URL en Supabase **antes** de mandar invitaciones mañana. |
| Equipo entra por bookmark `valere-v2.vercel.app` y ve build viejo | alta | medio | Comunicado urgente con la URL nueva. Idealmente, redirect 301 desde Vercel. |
| Concurrent CRUD de varios comerciales pisa registros (RLS débil) | baja al volumen actual | medio | Hardening RLS post Fase 2. Hoy: confiar en disciplina de equipo. |
| Caída Supabase eu-west-1 | muy baja | crítico | Sin SLA en free tier. Asumir riesgo. No hay plan B operativo. |
| `ask-crm-docs` cae | baja | bajo | El CRM sigue funcionando sin asistente. UI degradación gracioso (verificar que el panel no rompe la ruta). |

---

## 4 · Estado por componente — cuadro de mandos

### 4.1 · CRM Valere FE (`valere-v2.pages.dev`)
- ✅ HTTP 200 con CSP correcta (script-src self, supabase.co + generativelanguage permitidos para connect-src).
- ✅ Assets servidos: `index-jX1GLA2-.js`, `vendor-react`, `vendor-query`, `vendor-supabase`, `index-DlKyyeub.css`.
- ⚠️ Hash distinto al build de `valere-v2.vercel.app` (que sirve `index-BXcT9RYg.js`).
- 🔵 No verificado: rutas internas (login, dashboard, kanban). Requiere sesión auth → fuera de alcance de auditoría sin credenciales.

### 4.2 · CRM Supabase BBDD (`gtphkowfcuiqbvfkwjxb`)
- **Estado proyecto:** `ACTIVE_HEALTHY`, region eu-west-1, postgres 17.6.
- **37 tablas en public** (las 13 CRM clásicas + 9 Calculadora canónicas + 10 Potencias añadidas en sprint 4 + 3 RAG + 2 datadis + facturas).
- **Datos test mínimos:** empresas=3, contactos=1, contratos=2, cups=1, oportunidades=4, actividades=1, custom_fields_schema=2, custom_fields_values=2.
- **Datos canónicos sí cargados:** comercializadoras=6, precios_regulados_boe=29, user_profiles=3, global_config=1, crm_help_embeddings=232, crm_asistente_log=12.
- **Tablas Potencias añadidas pero VACÍAS** (Fase 2 pendiente): expedientes, ciclos, solicitudes_potencia, savings_calculations, comercializadora_docs, comunicaciones_cliente, alertas, email_templates, excel_import_templates, status_log → 0/0/0…
- **Compat views vivas y funcionales:** `retailers`, `retailer_offers`, `boe_regulated_prices` → SELECT cuadra con counts canónicos.
- **Migrations aplicadas:** 16 (la última `initplan_optimization_remaining_2026_04_26`).
- **Migrations pendientes en repo:** `_pending_rls_hardening_8_tables.sql` (intencional, post Fase 2).
- **Edge functions:** `ask-crm-docs` v10 ACTIVE (saludable), `chat-consultor` v7 ACTIVE (huérfana).
- **Storage buckets:** `documentos` (privado, vacío).
- **Advisors security:** 0 ERROR · 10 WARN (8 RLS USING(true) + 1 leaked_password + 1 sin clasificar).
- **Advisors performance:** muchos INFO de unindexed_foreign_keys + algunos auth_rls_initplan; aceptable a este volumen.
- **Logs api últimas 24h:** 2 × 401 (test sin auth header), 14 × POST 200 al asistente con latencia 1.8-10s, 1 × POST 500 en versión v9 (ya superada). 0 errores en v10. ✅
- **Logs auth últimas 48h:** 8 logins legítimos de Juan, 3 invites de equipo (administracion, arodriguez, soporte — éste 429), 1 signup test Cowork.

### 4.3 · CRM Supabase Edge functions
- `ask-crm-docs/v10`: `POST 200` consistente, latencias normales. `GET 401` esperado (rechaza GET sin token). **Operativo.**
- `chat-consultor/v7`: huérfano, sin invocaciones recientes en logs.

### 4.4 · Potencias Supabase BBDD (`alesfvxqtwlrwlmkoosg`)
- **Estado proyecto:** `ACTIVE_HEALTHY`, region eu-central-1, postgres 17.6.
- **18 tablas, datos prod íntegros:**
  - clients=30 (24 CIFs únicos, 6 dups internos esperados)
  - supplies=75 (72 CUPS únicos, 3 dups esperados)
  - expedientes=41, ciclos=41, power_requests=41, savings_calculations=41 (1:1:1:1 — pipeline coherente)
  - client_communications=31, status_log=91, profiles=4
  - client_documents=70, expediente_documents=27
  - comercializadoras=2, comercializadora_docs=1, regulated_rates=18, email_templates=2
  - documentacion=1, alerts=0, excel_import_templates=0
- **Storage:** bucket `documents` (privado, 71 objetos, 2.27 MB) + `expediente-docs` (privado, 29 objetos, 13 MB) = **100 PDFs operativos**.
- **0 expedientes huérfanos**, 0 CIFs vacíos, 0 CUPS vacíos. Datos limpios para la migración Fase 2.
- **Migrations aplicadas:** 1 (`classify_tables_by_domain`). Resto del schema sin trace en `supabase migration` (drift documentado).
- **Edge functions:** **0**. App contra Supabase directo.
- **Advisors security:** 0 ERROR · 3 WARN (2 funciones search_path + leaked_password). ✅
- **Advisors performance:** 16 unindexed_foreign_keys (INFO) + 18 auth_rls_initplan (WARN) + 17 unused_index (INFO). No crítico al volumen.
- **Logs postgres últimas 24h:** solo conexiones mgmt-api (Cowork via MCP) + 1 `Connection reset by peer` (cliente que cerró TCP, normal). Sin errores postgres reales.
- **Logs auth últimas 24h:** 0 entradas (free tier no almacena auth si app usa anon-key; o no hubo accesos).

### 4.5 · App Gestión de Potencias (verificación indirecta)
- Sin acceso a su repo desde el sandbox; no se conoce su URL pública desde aquí.
- Está apuntada a Supabase `alesfvxqtwlrwlmkoosg`, que está sano y con datos íntegros (ver 4.4).
- Confirmaciones implícitas: los 41 expedientes/ciclos/power_requests/savings con cardinalidad 1:1:1:1 sugieren que el pipeline de la app está funcionando consistentemente.
- **Riesgo no cuantificado:** estado de Vercel para esa app. ESTADO.md / CLAUDE.md afirman cuenta Vercel suspendida 2026-04-24. La URL pública de la app potencias no fue testeada en esta auditoría — Juan debería abrir un navegador en limpio mañana antes de operar y confirmar que carga.

---

## 5 · Plan de monitoring 24-72h post-lunes

### Hoy domingo (acción de Juan, 30 min)
1. Confirmar Site URL y Redirect URLs en Supabase Dashboard → Authentication.
2. Decidir status de `valere-v2.vercel.app` (apagar / redirect / paralelo).
3. Comunicado al equipo con URL única (usar `docs/COMUNICADO_NUEVO_URL_CRM.md`).
4. Decidir Escenario A (dos apps separadas) o B (cutover Fase 2 esta noche).
5. Backup `pg_dump` ambos proyectos (preventivo, independientemente del escenario).

### Lunes 27 mañana (primera media hora)
1. Smoke test pre-equipo: login de Juan → dashboard → kanban oportunidades → admin/comercializadoras → admin/ofertas → análisis.
2. Verificar asistente RAG con pregunta on-topic ("¿cómo creo una empresa?") y off-topic ("¿qué tiempo hace?") — segundas debe declinar correctamente.
3. Confirmar que `valere-v2.pages.dev` carga assets sin errores en consola del navegador.
4. Si Fase 2 ejecutada, contar filas: `expedientes` debería = ~41.

### Durante el lunes (vigilancia continua)
- Pestaña abierta en Supabase Dashboard → Logs → api/edge-function/auth filtrando por errores (level=error o status>=500).
- Pestaña abierta en Cloudflare Pages → Functions logs (si hay).
- Slack/Teams del equipo: triaje de "no me deja entrar / no veo X / da error".

### Martes-miércoles
- Decidir push del `b9eaff3` (con tests + preview local).
- Si Fase 2 quedó pendiente: ejecutarla.
- Sprint corto: borrar `chat-consultor` huérfana, aplicar `_pending_rls_hardening_8_tables.sql`, decidir storage cutover.

### Alertas a configurar (recomendación, no bloqueante)
- Supabase Dashboard → Settings → Logs → custom log alert: 5xx en `ask-crm-docs` en ventana 5min.
- Cloudflare Pages → Notifications: deploy failed.
- Uptime monitor externo (Uptime Robot free) sobre `valere-v2.pages.dev` y `alesfvxqtwlrwlmkoosg.supabase.co/rest/v1/`.

---

## 6 · Quick reference

### 6.1 · Smoke tests post-deploy (copiar-pegar)
```bash
# 1. Frontend Pages vivo
curl -sS -o /dev/null -w "%{http_code}\n" https://valere-v2.pages.dev/
# Esperado: 200

# 2. Asistente RAG sin token (debe ser 401)
curl -sS -o /dev/null -w "%{http_code}\n" \
  https://gtphkowfcuiqbvfkwjxb.supabase.co/functions/v1/ask-crm-docs
# Esperado: 401

# 3. Asistente RAG con token (sustituir <ANON_KEY>)
curl -sS -X POST \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"question":"¿cómo creo una empresa?"}' \
  https://gtphkowfcuiqbvfkwjxb.supabase.co/functions/v1/ask-crm-docs
# Esperado: 200, JSON con "answer"

# 4. SQL sanity (vía MCP o Dashboard)
SELECT 'empresas',COUNT(*) FROM empresas
UNION ALL SELECT 'oportunidades',COUNT(*) FROM oportunidades
UNION ALL SELECT 'embeddings',COUNT(*) FROM crm_help_embeddings
UNION ALL SELECT 'asistente_log_24h',COUNT(*) FROM crm_asistente_log WHERE created_at>now()-interval '24 hours';
```

### 6.2 · Rollback express por tipo de incidencia

**Caso A — `valere-v2.pages.dev` muestra error tras deploy.**
- Cloudflare Pages → Deployments → encontrar último deploy estable → "Rollback to this deployment". Sin tocar BBDD.

**Caso B — Fase 1 schema rompe queries del FE legacy.**
- Las compat views (`retailers`, `retailer_offers`, `boe_regulated_prices`) son la red. Si una query se cae, lo más probable es bug específico — debug puntual.
- Rollback nuclear: re-ejecutar `apply_migration` de los renames inversos. Documentado en `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md`.

**Caso C — Fase 2 datos corrompió CRM.**
- `psql ... -f restore_crm_<TIMESTAMP>.dump` con el backup tomado antes de la migración. Ver `scripts/unificacion_fase2_protocolo.md`.

**Caso D — Asistente RAG `500`.**
- `chat-consultor` es huérfana — si un usuario intenta usarla, devolverá 401. Nada que rollbackear.
- `ask-crm-docs` v10: si falla, redeploy v9 desde repo (`supabase/functions/ask-crm-docs/`). Versión v9 también daba 200 los días previos.

**Caso E — Email de invitación no llega.**
- Throttling Supabase. Esperar 1h o configurar SMTP propio en Supabase Dashboard → Authentication → SMTP. Plan B: invitar manualmente vía SQL `auth.admin.create_user` desde Dashboard → SQL Editor.

**Caso F — Login con error CORS o "Invalid URL".**
- Probable Site URL / Redirect URLs mal en Auth Config. Supabase Dashboard → Authentication → URL Configuration → corregir, esperar 1 min, reintentar.

**Caso G — Storage 403 al abrir un PDF.**
- Buckets de Potencias son privados. La signed URL caduca. Re-pedir desde la app. Si la app no maneja refresh, desactivar TTL en bucket o usar signed URL más largo.

### 6.3 · Comandos de información rápida (durante incidencia)
```sql
-- Latencia del asistente últimas 1h
SELECT
  date_trunc('minute', created_at) AS minuto,
  COUNT(*) AS preguntas,
  COUNT(*) FILTER (WHERE error IS NOT NULL) AS errores
FROM crm_asistente_log
WHERE created_at > now() - interval '1 hour'
GROUP BY 1 ORDER BY 1 DESC;

-- Usuarios activos hoy en CRM
SELECT email, last_sign_in_at
FROM auth.users
WHERE last_sign_in_at > now() - interval '24 hours'
ORDER BY last_sign_in_at DESC;

-- Conteos de tablas críticas
SELECT 'empresas',COUNT(*) FROM empresas UNION ALL
SELECT 'oportunidades_abiertas',COUNT(*) FROM oportunidades WHERE estado != 'cerrada' UNION ALL
SELECT 'contratos_activos',COUNT(*) FROM contratos UNION ALL
SELECT 'expedientes',COUNT(*) FROM expedientes;
```

---

## 7 · Acciones inmediatas para Juan (priorizadas)

1. **🔴 Elegir Escenario A vs B** (operación dual o cutover unificado). Decisión que condiciona todo lo demás.
2. **🔴 Confirmar Site URL en Supabase Auth** que apunta a `valere-v2.pages.dev` (no a Vercel).
3. **🔴 Decidir destino de `valere-v2.vercel.app`** (apagar / redirect / paralelo controlado).
4. **🔴 Comunicado al equipo** con URL única (no enviar invitaciones nuevas hasta haber decidido lo anterior).
5. **🟡 Backups `pg_dump`** de ambos proyectos como red de seguridad.
6. **🟡 Decidir si pushear `b9eaff3`** hoy (con tests previos) o aplazar a martes.
7. **🟢 Sprint posterior:** Fase 2 datos (si Escenario A) + RLS hardening + drop `chat-consultor` + storage cutover.

---

## 8 · Lo que NO necesita acción para mañana

- Performance advisors (unindexed FKs, unused indexes) — volumen pequeño, no escala todavía.
- Compat views legacy — funcionan, pueden seguir vivas semanas.
- Edge function `chat-consultor` huérfana — no rompe nada.
- `proposals` table viva con 0 filas — decisión Juan, sin impacto.
- Migration drift de Potencias — irrelevante hasta el decommission.

---

*Auditoría sin commits, sin DDL, sin operaciones destructivas. Todo lo verificado se hizo con `list_*`, `get_*`, `execute_sql` (SELECT-only) y `web_fetch` (GET).*
