# Checklist de release y rollback — Cutover CRM unificado

> Documento operativo para usar **el día del cutover** (Fase 6.B). Imprimible o seguible en split-screen.
> Generado por sprint domingo 2026-04-26, lane 3 (docs/proceso).
> Complementa `docs/PLAN_UNIFICACION_FASE_6_2026-04-26.md` con el detalle de comandos copy-paste y go/no-go criteria.

---

## Cómo usar este documento

1. **24h antes del cutover**: lee §1 (preparación) y deja todo listo.
2. **Inmediatamente antes**: ejecuta §2 (go/no-go) — si algo es 🔴, **abortar y reprogramar**.
3. **Durante**: §3 (cutover) en orden estricto, sin saltarte pasos.
4. **Inmediatamente después**: §4 (smoke). Si rojo, salta a §6 (rollback).
5. **72h después**: §5 (vigilancia).
6. **Si algo va mal en cualquier momento**: §6 (rollback express).

---

## §1 — Preparación (T-24h)

### 1.A — Comunicación enviada

- [ ] Email/Slack al equipo enviado (template en `docs/COMUNICADO_NUEVO_URL_CRM.md`, adaptar fecha).
- [ ] Confirmaciones recibidas de al menos 1 comercial + Juan + cualquier admin.
- [ ] Canal de soporte abierto (Slack hilo dedicado o WhatsApp).
- [ ] Persona de guardia identificada (Juan o backup): _______________.

### 1.B — Backups previos

- [ ] Dump de CRM completo: `pg_dump $ConnCrm > $HOME\valere-backups\crm_pre_cutover_$Stamp.sql`
- [ ] Dump de Potencias completo (último): `pg_dump $ConnPot > $HOME\valere-backups\potencias_pre_cutover_$Stamp.sql`
- [ ] Backup verificado: `pg_restore --list $HOME\valere-backups\crm_pre_cutover_$Stamp.sql | head -20` — debe mostrar tablas válidas.
- [ ] Backups copiados a cold storage (Drive personal o R2).
- [ ] Hash registrado: `Get-FileHash <backup> -Algorithm SHA256 >> $HOME\valere-backups\sha256_$Stamp.txt`

### 1.C — Estado del repo y deploy

- [ ] `git status` → working tree limpio en `main` (o rama de release).
- [ ] CI verde en último commit a la rama de release.
- [ ] Cloudflare Pages del CRM con último deploy operativo (verificar `Status: Active` en dashboard).
- [ ] DNS / dominio custom (si aplica): TTL bajado a 60s 24h antes.

### 1.D — Freeze comunicado

- [ ] Mensaje en canal: "Freeze de deploys/migrations entre [HH:MM ventana]. Solo hotfix S1."
- [ ] PR draft "DO NOT MERGE — freeze cutover" abierto en GitHub para visibilidad.

### 1.E — Documentos y herramientas a mano

- [ ] Este checklist abierto.
- [ ] `docs/PLAN_UNIFICACION_FASE_6_2026-04-26.md` abierto.
- [ ] Acceso al dashboard Supabase (CRM y Potencias).
- [ ] Acceso al dashboard Cloudflare Pages.
- [ ] Acceso a GitHub.
- [ ] Connection strings y passwords en 1Password (verificar).
- [ ] Sandbox Cowork accesible (para queries MCP en vivo).

---

## §2 — Go/No-Go criteria (T-1h)

Bloquear el cutover si **CUALQUIERA** de estos criterios es 🔴.

### 2.A — Estado del CRM (Supabase)

```sql
-- Counts de tablas críticas. Esperado: ~30 empresas, ~75 cups, 41 expedientes, 41 ciclos, 41 solicitudes.
SELECT 'empresas' as t, count(*) FROM empresas
UNION ALL SELECT 'cups', count(*) FROM cups
UNION ALL SELECT 'contactos', count(*) FROM contactos
UNION ALL SELECT 'oportunidades', count(*) FROM oportunidades
UNION ALL SELECT 'expedientes', count(*) FROM expedientes
UNION ALL SELECT 'ciclos', count(*) FROM ciclos
UNION ALL SELECT 'solicitudes_potencia', count(*) FROM solicitudes_potencia
UNION ALL SELECT 'comercializadoras', count(*) FROM comercializadoras
ORDER BY t;
```

| Criterio | Esperado | Real | Estado |
|---|---|---|---|
| empresas count | ≥ 24 (24 únicos Potencias + 3 test pre-existentes) | ___ | 🟢/🔴 |
| cups count | ≥ 72 | ___ | 🟢/🔴 |
| expedientes count | ≥ 41 | ___ | 🟢/🔴 |
| ciclos count | ≥ 41 | ___ | 🟢/🔴 |
| solicitudes_potencia count | ≥ 41 | ___ | 🟢/🔴 |
| comercializadoras count | ≥ 6 | ___ | 🟢/🔴 |

**Si rojo**: investigar por qué los datos no están donde se espera. Probable causa: Fase 2 incompleta o ROLLBACK accidental. NO seguir.

### 2.B — Integridad referencial

```sql
-- 0 orphans esperados:
SELECT 'cups orphan empresa' as t, count(*) FROM cups c WHERE NOT EXISTS (SELECT 1 FROM empresas e WHERE e.id = c.empresa_id) AND c.empresa_id IS NOT NULL
UNION ALL
SELECT 'contactos orphan empresa', count(*) FROM contactos c WHERE NOT EXISTS (SELECT 1 FROM empresas e WHERE e.id = c.empresa_id) AND c.empresa_id IS NOT NULL
UNION ALL
SELECT 'expedientes orphan empresa', count(*) FROM expedientes ex WHERE NOT EXISTS (SELECT 1 FROM empresas e WHERE e.id = ex.empresa_id) AND ex.empresa_id IS NOT NULL
UNION ALL
SELECT 'ciclos orphan expediente', count(*) FROM ciclos ci WHERE NOT EXISTS (SELECT 1 FROM expedientes ex WHERE ex.id = ci.expediente_id) AND ci.expediente_id IS NOT NULL
UNION ALL
SELECT 'solicitudes orphan ciclo', count(*) FROM solicitudes_potencia s WHERE NOT EXISTS (SELECT 1 FROM ciclos c WHERE c.id = s.ciclo_id) AND s.ciclo_id IS NOT NULL;
```

| Criterio | Esperado | Real | Estado |
|---|---|---|---|
| cups orphan empresa | 0 | ___ | 🟢/🔴 |
| contactos orphan empresa | 0 | ___ | 🟢/🔴 |
| expedientes orphan empresa | 0 | ___ | 🟢/🔴 |
| ciclos orphan expediente | 0 | ___ | 🟢/🔴 |
| solicitudes orphan ciclo | 0 | ___ | 🟢/🔴 |

**Si > 0**: ejecutar `scripts/unificacion_fase2_c_verificacion.sql` completo y reportar antes de continuar.

### 2.C — Build y tests CRM

- [ ] `cd $HOME\valere-v2; npx tsc --noEmit` → 0 errores.
- [ ] `npm test -- --run` → 39/39 verde.
- [ ] `npm run build` → build OK, sin warnings críticos.

### 2.D — Asistente RAG operativo

```bash
# Edge Function activa:
mcp__list_edge_functions --project gtphkowfcuiqbvfkwjxb
# Esperado: ask-crm-docs ACTIVE.

# Embeddings cargados:
SELECT count(*) FROM crm_help_embeddings;
# Esperado: > 200.

# Smoke query (manual desde la app autenticado):
# Abrir asistente flotante → "¿Cómo creo una empresa?" → debe responder en <10s.
```

| Criterio | Esperado | Estado |
|---|---|---|
| Edge function ACTIVE | sí | 🟢/🔴 |
| Embeddings count | > 200 | 🟢/🔴 |
| Query manual responde | sí, <10s | 🟢/🔴 |

### 2.E — Apps satélite ya apuntan al CRM (de Fase 4)

- [ ] Potencias-app `.env`: `VITE_SUPABASE_URL=https://gtphkowfcuiqbvfkwjxb.supabase.co` ✅
- [ ] Excedentes-app (si aplica): idem.
- [ ] Compat views activas en CRM (de Fase 4.C): `SELECT count(*) FROM clients;` debe responder.
- [ ] Smoke de cada app satélite: login OK, listado principal OK.

### 2.F — Equipo disponible

- [ ] Juan disponible próximas 4h.
- [ ] Al menos 1 comercial disponible para smoke post-cutover.
- [ ] No hay ausencias planeadas que bloqueen rollback (vacaciones, viaje, etc.).

### 2.G — Resumen go/no-go

| Sección | Estado |
|---|---|
| 2.A — Counts datos | 🟢/🔴 |
| 2.B — Integridad FK | 🟢/🔴 |
| 2.C — Build + tests | 🟢/🔴 |
| 2.D — Asistente RAG | 🟢/🔴 |
| 2.E — Apps satélite | 🟢/🔴 |
| 2.F — Equipo | 🟢/🔴 |

**Decisión**: si **todo verde** → GO. **Cualquier rojo** → NO-GO, reprogramar.

---

## §3 — Cutover (T=0)

### 3.A — Notificación inicio

```
[CANAL EQUIPO]
🚀 Cutover iniciado. ETA 30 min. URL durante este periodo: <URL>.
Cualquier raro → este hilo.
```

Hora inicio registrada: ___:___ del ____-____-____.

### 3.B — Switch DNS (solo si dominio custom)

- [ ] Cloudflare DNS: confirmar CNAME apunta a `valere-v2.pages.dev`.
- [ ] TTL = 60s confirmado.
- [ ] Propagación verificada: `dig <dominio>` desde varios puntos (`dig @1.1.1.1`, `dig @8.8.8.8`).

### 3.C — Verificación de que las apps satélite redirigen / pausan

Si Opción A (compat views, apps siguen vivas con backend nuevo):
- [ ] Cada app satélite responde a su URL antigua, conectada al CRM.

Si Opción B+ (apps absorbidas, URLs viejas se apagan):
- [ ] Configurar redirect 301 en Cloudflare Worker / Page Rules → URL nueva.
- [ ] Verificar redirect funciona desde browser.

### 3.D — Marcador en logs

```sql
-- Marcador para localizar el momento exacto del cutover en logs futuros:
INSERT INTO public.crm_asistente_log (pregunta, respuesta_resumen, similarity_max, tokens_usados, latency_ms, source)
VALUES ('__CUTOVER_MARKER__', 'Cutover iniciado a las ' || now()::text, 0, 0, 0, 'system')
ON CONFLICT DO NOTHING;
-- (Solo si crm_asistente_log existe; ajustar nombre cols según schema real.)
```

Alternativa más simple sin tocar tabla:
```bash
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Cutover marker" >> $HOME\valere-backups\cutover_log.txt
```

### 3.E — Hora finalización

Hora finalización cutover técnico: ___:___.

---

## §4 — Smoke post-cutover (T+15 min)

Ejecutar **un comercial real** (no Juan), guiado por Juan en pantalla compartida si conviene.

### 4.A — Login

- [ ] Abrir URL nueva en browser limpio (o ventana incógnito).
- [ ] Login con cuenta del comercial → redirige al dashboard.
- [ ] Tiempo de carga login < 5s.

### 4.B — Lectura datos reales

- [ ] Listado de empresas: ver al menos 20 (datos reales Potencias importados).
- [ ] Abrir 1 empresa con `legacy_potencia_id IS NOT NULL` → datos completos visibles.
- [ ] Listado de CUPS de esa empresa: ver al menos 1.
- [ ] Abrir el CUPS: campos `p1_kw..p6_kw` visibles.
- [ ] Listado de expedientes: ver al menos 1.
- [ ] Abrir un expediente: ciclos visibles, solicitudes_potencia visibles.

### 4.C — Escritura

- [ ] Crear actividad sobre la empresa abierta → guarda OK.
- [ ] Editar la actividad → guarda OK.
- [ ] Borrar la actividad de prueba → desaparece.

### 4.D — Asistente RAG

- [ ] Abrir asistente → preguntar "¿Cómo importo una factura?" → respuesta en <10s con contenido relevante.

### 4.E — Admin (con cuenta admin)

- [ ] Admin → Comercializadoras: ver listado completo (≥6 + 2 importadas).
- [ ] Admin → Ofertas: crear oferta de prueba → guardar → editar → borrar.

### 4.F — Resumen smoke

| Test | Estado | Tiempo |
|---|---|---|
| 4.A Login | 🟢/🔴 | __s |
| 4.B Lectura | 🟢/🔴 | __s |
| 4.C Escritura | 🟢/🔴 | __s |
| 4.D RAG | 🟢/🔴 | __s |
| 4.E Admin | 🟢/🔴 | __s |

**Decisión**:
- Todo 🟢 → declarar **CUTOVER EXITOSO**, comunicar al equipo, pasar a §5.
- Cualquier 🔴 → ir a §6 (rollback) inmediatamente.

### 4.G — Comunicación post-smoke

```
[CANAL EQUIPO]
✅ Cutover completado. La URL única ahora es: <URL>.
Las URLs de Potencias/Excedentes seguirán funcionando 24-48h por si acaso.
Reportad cualquier raro a este hilo durante las próximas 72h.
Gracias 🙏
```

---

## §5 — Vigilancia 72h

### 5.A — Cada 4h durante primeras 24h, luego cada 12h hasta 72h

- [ ] `mcp__get_logs --service edge-function` — buscar 5xx, errores Gemini.
- [ ] `mcp__get_logs --service postgres` — buscar deadlocks, RLS denials, slow queries.
- [ ] `mcp__get_logs --service auth` — failed_login spikes.
- [ ] `mcp__get_advisors --type security` — 0 ERRORs nuevos.
- [ ] `mcp__get_advisors --type performance` — 0 nuevos críticos.

### 5.B — Threshold para alertar

| Métrica | Threshold | Acción |
|---|---|---|
| Errores 5xx Edge Function | > 10/h | Investigar logs, escalar si persistente. |
| RLS violations distintas | > 5 | Revisar policies, posible regresión de Fase 5. |
| Slow queries (>5s) en hot path | > 3 | Revisar índices, escalar. |
| Failed logins de mismo usuario | > 5/min | Posible problema con Auth, contactar al usuario. |

### 5.C — Incidencias del equipo

Plantilla por cada incidencia reportada:
```
Hora: ___:___
Usuario: _______________
Acción: _______________
Esperado: _______________
Observado: _______________
Severidad: S1 (bloqueante) / S2 (workaround) / S3 (cosmético)
Resolución: _______________
```

### 5.D — Decisión a las 72h

- 0 S1, ≤ 2 S2 sin patrón → seguir con §6.D del plan Fase 6 (pausar apps satélite).
- 1+ S1 sin resolver → reabrir cutover, posible rollback parcial.

---

## §6 — Rollback express

> 5 tipos de rollback según qué se rompa. Cada uno tiene su procedimiento aislado para no agravar el problema.

### 6.A — Rollback DNS (si custom domain)

```powershell
# Cambiar CNAME al destino viejo.
# Cloudflare → DNS → editar registro → Save.
# TTL=60s (puesto en 1.C) garantiza propagación rápida.
```

ETA: < 5 min. Comunicar inmediatamente al equipo.

### 6.B — Rollback Cloudflare Pages (FE roto)

```
Dashboard Cloudflare → Pages → valere-v2 → Deployments
→ Encontrar el deploy "Active" anterior al cutover
→ Click "..." → "Rollback to this deployment"
```

ETA: 1-2 min. **Atención**: Cloudflare Pages puede mantener la URL pero servir el código viejo, lo cual restaura el FE pero NO el backend. Útil solo si la rotura es de FE puro.

### 6.C — Rollback Edge Function

```bash
# Listar versiones disponibles:
mcp__list_edge_functions --project gtphkowfcuiqbvfkwjxb
# Re-deploy versión N-1 con su contenido (mantenido en git):
mcp__deploy_edge_function --project gtphkowfcuiqbvfkwjxb --name ask-crm-docs --files <contenido_pre_cutover>
```

ETA: 2-3 min. Mantener el archivo `supabase/functions/ask-crm-docs/index.ts` versionado en git permite recuperar fácilmente.

### 6.D — Rollback datos (CRÍTICO)

**Solo si la corrupción es severa y los usuarios no pueden trabajar**. Causa pérdida de datos creados desde el cutover.

```powershell
# 1. Anunciar downtime al equipo.
[CANAL] ⚠️ Restaurando backup. URL no disponible 30-60 min.

# 2. Restaurar dump pre-cutover.
$ConnCrm = "<connection string CRM>"
psql $ConnCrm -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql $ConnCrm < $HOME\valere-backups\crm_pre_cutover_$Stamp.sql

# 3. Verificar:
psql $ConnCrm -c "SELECT count(*) FROM empresas;"

# 4. Re-deploy Edge Functions (las funciones no van en el dump):
mcp__deploy_edge_function --name ask-crm-docs --files <último contenido>
```

ETA: 30-60 min. **Mitigación de pérdida**: durante el freeze (§1.D) NO se debería haber creado nada → la pérdida idealmente es 0.

### 6.E — Rollback RLS (policies se rompieron post-aplicar hardening)

```sql
-- Re-aplicar las policies USING(true) sobre las tablas que estaban dando RLS denial:
-- Plantilla por tabla afectada:
DROP POLICY IF EXISTS <nueva_policy> ON public.<tabla>;
CREATE POLICY <tabla>_authenticated_all ON public.<tabla>
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

ETA: 5 min. Después analizar fuera de banda y re-aplicar el hardening con la regla correcta (probablemente requiere ajustar `get_user_rol()` o JOIN).

### 6.F — Rollback apps satélite (apuntar de vuelta a Potencias)

Solo si la opción es "abortar todo el cutover por 48h, retomar otro día":

```bash
# En cada app satélite, revertir env vars al estado pre-cutover:
# .env (production):
VITE_SUPABASE_URL=https://alesfvxqtwlrwlmkoosg.supabase.co  # vuelve a Potencias
VITE_SUPABASE_ANON_KEY=<anon key Potencias>

# Re-deploy.
```

ETA: 10-15 min por app. Requiere que el proyecto Potencias siga vivo (no pausado todavía).

### 6.G — Rollback total (catastrophic — última opción)

Si todo lo demás falla:
1. Revertir Cloudflare Pages al deploy anterior (§6.B).
2. Restaurar dump pre-cutover (§6.D).
3. Re-apuntar apps satélite a Potencias (§6.F).
4. Anunciar al equipo: cutover abortado, fecha nueva pendiente.
5. Post-mortem inmediato dentro de 48h.

ETA total: 1-2h.

---

## §7 — Comunicación al equipo

### 7.A — Templates

#### Pre-cutover (T-24h)

```
Hola equipo 👋

Mañana <DÍA HH:MM> migramos al CRM unificado. Detalles:
• URL nueva única: <URL>
• Las URLs antiguas seguirán activas 48h por si acaso.
• Durante la ventana <HH:MM-HH:MM> habrá freeze de cambios.
• Cualquier incidencia → este hilo / WhatsApp.

¿Alguna duda? Dejádmela aquí antes de las HH:MM.
Gracias 🙏 — Juan
```

#### Inicio cutover (T=0)

```
🚀 Cutover en marcha. ETA 30 min.
Si necesitáis trabajar urgente, esperad a la confirmación final por aquí.
```

#### Cutover OK (T+30 min)

```
✅ Cutover completado. Podéis usar la URL nueva: <URL>
Todo verificado: login, listados, escritura, asistente.
Reportad cualquier raro estos próximos 3 días.
Gracias por la paciencia 🙏
```

#### Rollback (si pasa)

```
⚠️ Hemos detectado X. Estamos restaurando la versión anterior.
ETA: <X min>. Disculpad las molestias.
Os aviso en cuanto vuelva a estar operativo.
```

#### Post-rollback (si pasa)

```
✅ Sistema restaurado a versión anterior.
La migración se reprogramará para <fecha>.
Causa raíz: <X>. Detalle en post-mortem en docs/.
```

### 7.B — Stakeholders adicionales

- Cliente externo si comparte CRM (raro): notificar con 48h.
- Soporte/atención al cliente: brief sobre dónde redirigir consultas.
- Compañeros que usen integraciones (Datadis, etc.): notificar si hay endpoints externos.

---

## §8 — Post-cutover housekeeping (próximas 4 semanas)

Ver `docs/PLAN_UNIFICACION_FASE_6_2026-04-26.md` §6.D para detalle.

Resumen:
- Día +2: pausar apps satélite si todo estable.
- Semana +2: backup definitivo + pausar proyecto Potencias.
- Semana +4: borrar proyecto Potencias.
- Tag `v2.0.0-unificacion-completa` + post-mortem.

---

## §9 — Checklist de Juan al cerrar el día del cutover

- [ ] Hora inicio y fin documentadas en este checklist.
- [ ] Smoke completado (§4) — todos verde.
- [ ] Comunicación post-cutover enviada (§4.G).
- [ ] Logs primeras 4h revisados (§5.A primer ciclo).
- [ ] `docs/ESTADO.md` actualizado: "Sesión cutover YYYY-MM-DD — completado / fallido / parcial".
- [ ] Si rollback: documentado en `docs/ESTADO.md` + post-mortem programado.
- [ ] Backup pre-cutover preservado (no borrar todavía).
- [ ] Próximo paso programado: vigilancia +24h, +48h, +72h.

---

> Sprint domingo, lane 3 (docs/proceso). Documento estable, lo edita Juan solo el día del cutover.
