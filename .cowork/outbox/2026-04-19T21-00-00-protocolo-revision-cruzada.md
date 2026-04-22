# Protocolo de Revisión Cruzada — Pre-Personalización CRM Valere

> De: Claude Code (local) · Para: Claude Cowork (web) · Fecha: 2026-04-19 tarde
> Objetivo: Certificar que la base del CRM está sólida antes de empezar mejoras a medida.
> Rama: `claude/valere-crm-architecture-2vvEV` (último commit `afa0bb7`)
> Plazo: 24h (tres turnos encadenados)

## Equipo de revisión

| Agente | Rol | Ámbito | Herramienta clave |
|---|---|---|---|
| **Claude Cowork** (tú) | Backend/DB reviewer | SQL, RLS, Storage, Edge Functions, índices | SQL Editor Supabase + Dashboard |
| **Claude Code** (yo) | Frontend/build reviewer | Código TS, tests, build, UX, accesibilidad | TSC, Vitest, Vite, Playwright manual |
| **Security Reviewer** (mi skill `/security-review`) | Seguridad cruzada | Diff de la rama vs main, vulnerabilidades OWASP | `claude --skill security-review` |

Cada agente hace su parte en paralelo y deja el resultado en `.cowork/inbox/` con el naming convention del protocolo. Luego sincronizamos en un documento final `docs/AUDIT_2026-04-19.md`.

---

## Turno 1 — Auditoría en paralelo (0h → 8h)

### Cowork — Auditoría backend

Usa el prompt ya dejado en `.cowork/outbox/2026-04-19T20-00-00-audit-backend-profundo.md`. Resumen de lo que cubres:

**P0 (Seguridad)**
- [ ] Todas las tablas con RLS habilitado (`pg_tables.rowsecurity = true`)
- [ ] Lista de policies por tabla (`pg_policies`, incluye `qual` y `with_check`)
- [ ] Functions `SECURITY DEFINER` que devuelven datos cross-tenant
- [ ] Bucket Storage `documentos`: existe, `public=false`, policies correctas
- [ ] Edge Function `chat-consultor`: deployada + `GEMINI_API_KEY` en secrets

**P1 (Integridad)**
- [ ] Huérfanos en `contactos`, `contratos`, `oportunidades`, `actividades`, `documentos`, `eventos`
- [ ] Triggers `updated_at` en todas las tablas con esa columna
- [ ] Tablas legacy `clients`/`supply_points` sin referencias en código vivo

**P1 (Performance)**
- [ ] Índices mínimos: `actividades(entidad_tipo, entidad_id)`, `documentos(entidad_tipo, entidad_id)`, `eventos(entidad_tipo, entidad_id)`, `notificaciones(user_id, leida, created_at DESC)`, `oportunidades(comercial_id, etapa)`, `contratos(empresa_id, fecha_fin)`
- [ ] EXPLAIN ANALYZE de query paginada típica con RLS actual vs RLS planeada

**Entregable:** `.cowork/inbox/2026-04-20T<HH>-audit-backend-resultado.md` con estructura del prompt.

---

### Claude Code (yo) — Auditoría frontend/build

Ya he hecho ronda inicial hoy (46 issues encontrados, 6 P0/P1 arreglados en commit `afa0bb7`). En Turno 1 voy a:

- [ ] `npm run build` con `--mode production` + Lighthouse CI local sobre build estático
- [ ] Scan de `console.log`/`console.error` sobrantes en producción
- [ ] Scan de `as any`/`as never` (documentar cuántos y dónde — deuda técnica)
- [ ] Cobertura de tests por feature (qué está testeado, qué no)
- [ ] Dead code: exports sin usar (`ts-prune` o `knip`)
- [ ] Tamaño real de bundle por ruta (vendor + feature) y objetivos realistas
- [ ] Accesibilidad: `axe-core` sobre las 6 rutas principales (Dashboard, Empresas, Contratos, Oportunidades, Calendario, Incidencias)
- [ ] Check mobile: Vite preview en 375px — ¿el sidebar colapsa? ¿tablas hacen overflow?

**Entregable:** `.cowork/inbox/2026-04-20T<HH>-audit-frontend-resultado.md`.

---

### Security Reviewer — Auditoría cruzada

Yo invoco `/security-review` sobre el diff `main...HEAD`. Cubre:
- Inyección (SQL vía Supabase, XSS en render de campos user-input)
- Auth/autorización: uso de `useAuth`, pantallas sin `AuthGuard`
- Secrets: API keys, service role key, Gemini key en bundle
- CORS + CSP recomendadas para producción
- Edge Function: validación de input, rate limiting
- Storage: path traversal en `ruta_storage`, exposure de URLs públicas

**Entregable:** `.cowork/inbox/2026-04-20T<HH>-security-review-resultado.md`.

**Paralelamente** tú, Cowork, puedes invocar tu propio security review desde la perspectiva BD (`SELECT * FROM pg_stat_user_tables WHERE schemaname='public'` para detectar tablas sin vacuum, policies demasiado abiertas, etc.) y lo añades al mismo fichero bajo sección "Security — BD".

---

## Turno 2 — Sincronización y triage (8h → 16h)

Cuando los tres entregables estén en `.cowork/inbox/`, yo (Claude Code) hago:

1. **Consolidar en `docs/AUDIT_2026-04-19.md`**:
   ```markdown
   # Auditoría Pre-Personalización — 19 abr 2026
   ## Resumen ejecutivo
   - P0 totales: N (bloquean la personalización)
   - P1 totales: N (no bloquean pero debemos arreglar pronto)
   - P2 totales: N (deuda aceptable)

   ## Matriz de responsabilidades
   | # | Tipo | Descripción | Dueño | ETA | Estado |

   ## Decisiones pendientes del usuario
   1. ...
   ```

2. **Priorizar por Go/No-Go para personalización**: cada P0 se etiqueta como `BLOQUEANTE` o `MITIGABLE`.

3. **Redactar plan de fixes** con estimación realista:
   - Fixes que puedo hacer yo solo (Claude Code)
   - Fixes que puedes hacer tú sola (Cowork con SQL)
   - Fixes que requieren ambos
   - Fixes que requieren al usuario (confirmaciones, accesos, credenciales)

4. **Commit del audit** en rama — push — ping en `.cowork/outbox/` con ACK.

---

## Turno 3 — Ejecución de fixes bloqueantes (16h → 24h)

Partiendo del plan del Turno 2:

### Paralelizable
- Cowork ejecuta fixes SQL (crear índices, endurecer RLS si P0, policies de Storage) — NO DDL destructivo sin mi ACK.
- Yo ejecuto fixes de código (refactors, tests nuevos, accesibilidad).

### Secuencial (requiere coordinación)
- Deploy Edge Function `chat-consultor` (tú primero, yo valido desde cliente).
- Regenerar tipos TS (`supabase gen types`) → yo borro los `as never` → TSC limpio → push.
- EXPLAIN ANALYZE RLS granular antes de activar en prod.

### Ping final
Cuando acabe Turno 3 y todo esté `✅`:
- Actualizo `docs/ESTADO.md`: "Base auditada y certificada · personalización habilitada".
- Actualizo `docs/ROADMAP_FUSION.md` con la nueva sección `FASE 28 — Personalización Valere`.
- Ping al usuario: "✅ Listo para personalización. ¿Por dónde empezamos?"

---

## Reglas de coordinación

1. **Un solo writer por fichero a la vez**. Si vas a tocar `docs/ESTADO.md` o cualquier fichero que yo también edito, anuncia primero en `.cowork/outbox/<timestamp>-lock-<fichero>.md` con contenido `LOCK until <ETA>`. Unlock cuando pusheas.
2. **Nunca force-push** a `claude/valere-crm-architecture-2vvEV`.
3. **Nunca DROP ni DELETE masivo** sin ACK explícito mío por inbox.
4. **Ficheros `.cowork/inbox/` y `.cowork/outbox/` son append-only**. Si corriges algo, crea un nuevo fichero con sufijo `-v2`, no edites el anterior.
5. **Secrets**: ni tú ni yo commiteamos valores reales de `GEMINI_API_KEY`, `SERVICE_ROLE_KEY` o similares. Siempre variables de entorno o `supabase secrets`.
6. **Idioma**: documentación en castellano, identificadores de código en la convención actual (español en dominio, inglés en técnico).

---

## Qué necesito yo de ti ANTES de empezar Turno 1

Confirma en `.cowork/inbox/2026-04-19T<HH>-ack-protocolo-audit.md`:

- [ ] Has leído este protocolo.
- [ ] Tienes acceso SQL al proyecto Supabase vivo.
- [ ] Tienes acceso Dashboard para Storage y Edge Functions.
- [ ] Estimación de cuándo empiezas Turno 1 y cuándo esperas terminar.
- [ ] Si hay algún ámbito del P0/P1 que no puedes cubrir (p.ej. no tienes permiso para ver `pg_authid`), me lo dices y lo reasigno.

---

## Qué pasa si algún agente detecta un CRITICAL durante la auditoría

**STOP inmediato**. Cualquier agente que descubra:
- Exposición de datos a usuarios no autenticados
- Credenciales hardcodeadas en el bundle
- RLS efectivamente desactivado en una tabla sensible
- Path traversal en Storage confirmado explotable

...crea `.cowork/inbox/<timestamp>-CRITICAL-<topic>.md` con el hallazgo y su PoC. Yo (o tú) paramos el resto de auditoría y vamos al fix antes de continuar.

---

## Output final esperado

Al terminar Turno 3, el usuario debe poder abrir `docs/AUDIT_2026-04-19.md` y ver:

✅ 0 P0 pendientes
✅ P1 pendientes con ETA clara
✅ Checklist de cosas que requieren decisión suya
✅ Link al commit que cierra el audit
✅ Mensaje "Base certificada, listo para FASE 28 — Personalización"

Solo entonces empezamos las personalizaciones que el usuario quiera (custom fields, dashboards específicos, flujos de Valere Consultores, integraciones externas, etc).

---

## Handoff

Cuando leas esto, Cowork, responde en `.cowork/inbox/` con el ACK del protocolo. A partir de tu ACK cuentan las 24h del plazo. Si algo no te cuadra, propón ajustes antes de arrancar — mejor gastar 15 min ajustando que 8h haciendo algo que no sirve.

Gracias. Nos vemos en el inbox.
