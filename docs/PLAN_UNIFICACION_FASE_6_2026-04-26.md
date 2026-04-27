# Unificación Supabase — Plan Fase 6 (Cutover real + decommissioning)

> Generado por sprint domingo 2026-04-26, lane 3 (docs/proceso).
> Continuación de `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` (Fases 4 y 5 ya planeadas).
> Prerequisitos: Fases 1+3 ✅ aplicadas, Fase 2 datos ⏳ pendiente Juan, Fase 4 deploy + smoke ⏳ pendiente, Fase 5 cleanup ⏳ pendiente.

---

## Posición en el roadmap

| Fase | Qué hace | Estado |
|---|---|---|
| 1 | Renames schema en CRM (`comercializadoras`, etc.) | ✅ aplicada (sprint 7) |
| 2 | Import 408 filas Potencias→CRM via `pg_dump+psql` | ⏳ Juan |
| 3 | Refactor FE a nombres canónicos | ✅ aplicada (sprint 7+8) |
| 4 | Deploy CRM + smoke + apps satélite con compat views | ⏳ pendiente |
| 5 | Cleanup: drop compat views, RLS hardening, pausa Potencias | ⏳ pendiente |
| **6** | **Cutover real al CRM unificado + decommissioning gradual** | **este doc** |
| 7 (futuro) | Absorción UX completa Potencias→CRM (opción B largo plazo) | sin fecha |

**Fase 6 ≠ Fase 5**: Fase 5 es housekeeping técnico (drop views, RLS), Fase 6 es **decisión de negocio + apagado controlado de infra satélite**. La línea divisoria es: tras Fase 5 todo "podría apagarse"; tras Fase 6 el equipo opera en una sola URL y los proyectos viejos están borrados.

---

## Objetivo

Pasar el equipo entero de Valere a operar contra el CRM unificado como **única fuente de verdad operativa**, completar el archivo definitivo de los proyectos viejos, y dejar el sistema preparado para la siguiente épica (Auth Google, Datadis a escala, etc.) sin deuda de unificación.

Output esperado al final de Fase 6:
- 1 sola URL de operación (`https://valere-v2.pages.dev`).
- 1 solo proyecto Supabase (`gtphkowfcuiqbvfkwjxb`).
- 0 proyectos satélite vivos en la org Supabase.
- 0 código del repo apuntando a URLs/keys legacy.
- Backups inmutables del proyecto Potencias en disco frío + cloud.
- Equipo formado y comunicación sellada.

---

## Subfases

### 6.A — Pre-cutover: comunicación + ventana (1-2 días lead time)

**Por qué primero**: el cutover real no es técnico, es organizativo. Si el equipo no sabe qué cambia, qué URL usar, y a quién escalar, cualquier rotura técnica se amplifica.

#### 6.A.1 — Anunciar ventana de cutover

Borrador del email/Slack ya existe en `docs/COMUNICADO_NUEVO_URL_CRM.md`. Adaptar con:
- Fecha y hora exacta (recomendado **viernes tarde** o **sábado mañana**: menor tráfico, ventana de recovery hasta lunes).
- URL nueva única (`https://valere-v2.pages.dev`).
- URL vieja(s) que dejarán de funcionar y cuándo (Potencias-app, Excedentes-app si aplica).
- Persona de guardia (Juan).
- Plan B si algo va mal (volver a la URL vieja durante 48h — requiere que apps satélite sigan operativas).

#### 6.A.2 — Sesión de formación express (30 min)

Para el equipo (probablemente 2-5 personas):
- Login en URL nueva.
- Tour rápido: empresas, CUPS, expedientes, ofertas, asistente RAG.
- Cómo reportar incidencias durante la ventana (Slack canal dedicado, o respuesta al email).

Si el equipo lleva tiempo usando ambos sistemas, basta con un screencast de 5 min.

#### 6.A.3 — Freeze de cambios

Durante la ventana de cutover (idealmente 24-48h):
- **No deploys** de FE ni de Edge Functions.
- **No migrations** Supabase.
- **No cambios de schema** ni añadir columnas.
- **Sí permitido**: hotfix crítico documentado, con rollback inmediato planeado.

Esto reduce variables si algo falla y aporta determinismo al rollback.

---

### 6.B — Cutover real: apuntar el mundo a CRM (15 min de switching)

#### 6.B.1 — Verificación pre-cutover (final go/no-go)

Ejecutar **inmediatamente antes** del switch (no más de 1 hora antes):

```sql
-- Counts de tablas críticas (deben coincidir con post-Fase 2):
SELECT 'empresas' as t, count(*) FROM empresas
UNION ALL SELECT 'cups', count(*) FROM cups
UNION ALL SELECT 'expedientes', count(*) FROM expedientes
UNION ALL SELECT 'ciclos', count(*) FROM ciclos
UNION ALL SELECT 'solicitudes_potencia', count(*) FROM solicitudes_potencia;

-- 0 orphans en FK (vía scripts/unificacion_fase2_c_verificacion.sql)
```

```bash
# Smoke test E2E del CRM (manual, 5 min):
# 1. Login.
# 2. Abrir 1 empresa con datos reales (legacy_potencia_id IS NOT NULL).
# 3. Abrir 1 CUPS asociado.
# 4. Abrir 1 expediente.
# 5. Crear actividad de prueba sobre la empresa.
# 6. Verificar asistente RAG responde.
# 7. Borrar la actividad de prueba.
```

```bash
# Estado de las apps satélite (deben estar apuntando a CRM ya, según Fase 4):
# Inspeccionar env vars de cada deploy:
#   - Potencias-app  →  VITE_SUPABASE_URL == https://gtphkowfcuiqbvfkwjxb.supabase.co
#   - Excedentes-app →  idem (si aplica)
# Si NO, abortar cutover hasta resolverlo.
```

**Criterio go/no-go**: ver `docs/CHECKLIST_RELEASE_CUTOVER.md` (mismo sprint).

#### 6.B.2 — Switch de DNS / dominios principales

Si Valere tiene un dominio personalizado (ej. `crm.valereconsultores.com`):

```bash
# Cloudflare DNS:
# 1. Asegurarse que el record CNAME apunta a valere-v2.pages.dev (ya debería estar de Fase 4).
# 2. TTL bajar a 60s 24h antes del cutover (preparar rollback rápido).
# 3. Tras cutover estable, subir TTL a 3600s.
```

Si NO hay dominio custom, este paso es no-op. Las apps satélite ya apuntan al backend correcto y los usuarios se conectan via la URL Pages directamente.

#### 6.B.3 — Notificación "ahora estamos cutover-LIVE"

Mensaje corto al canal del equipo: "Cutover en marcha. URL única ahora: <URL>. Reportad cualquier raro a este hilo".

#### 6.B.4 — Smoke test post-cutover (10 min)

Repetir el smoke test E2E con un usuario REAL del equipo (no Juan), idealmente un comercial. Lo que detecta un comercial es lo que detectaremos en producción al día siguiente.

Si pasa: cutover declarado **exitoso**, comunicar al equipo.
Si falla: ver §6.G (rollback).

---

### 6.C — Vigilancia activa (72 horas)

#### 6.C.1 — Métricas a vigilar

```bash
# Logs Edge Function (cada 4h primeras 24h):
mcp__get_logs --service edge-function --project gtphkowfcuiqbvfkwjxb
# Buscar: 5xx, errores Gemini, timeouts.

# Logs Postgres (idem):
mcp__get_logs --service postgres
# Buscar: deadlocks, RLS violations, slow queries (>1s).

# Logs Auth:
mcp__get_logs --service auth
# Buscar: failed_login spikes, signup spam.
```

Threshold para escalar a alerta:
- > 10 errores 5xx en Edge Function en 1h.
- > 5 RLS violations distintas (probablemente una policy pendiente de hardening que aplica con datos reales).
- Cualquier query > 5s en hot path.

#### 6.C.2 — Canal de soporte abierto

Slack/email/WhatsApp dedicado durante 72h. Cada incidencia se documenta:

```
Hora — Usuario — Acción — Esperado — Observado — Severity (S1/S2/S3)
```

Plantilla en `docs/PLANTILLA_INCIDENCIA_CUTOVER.md` (crear si no existe — sprint 6 deliverable opcional).

#### 6.C.3 — Pausa de las apps satélite (NO borrar todavía)

Tras 24-48h sin S1/S2:

```bash
# Cloudflare Pages (apps satélite):
# Dashboard → Pages → <project> → Settings → Pause deployment
```

Esto las saca del aire pero conserva el código. Si en las próximas 2 semanas hay que volver, basta con `Resume`.

Comunicar al equipo: "Las URL viejas de Potencias / Excedentes ya no funcionan. Si seguís usándolas, redirigid a la URL nueva".

---

### 6.D — Decommissioning gradual de proyectos satélite (semanas 2-4)

#### 6.D.1 — Backup definitivo del proyecto Potencias

**Antes** de pausar/borrar nada en Supabase:

```powershell
# Ejecutado por Juan desde PowerShell con passwords ya conocidos:
$Stamp = Get-Date -Format 'yyyyMMdd_HHmm'
$BackupDir = "$HOME\valere-backups\potencias_archive_$Stamp"
mkdir $BackupDir

# Schema completo + datos:
pg_dump $ConnPot --no-owner --no-acl `
  > "$BackupDir\potencias_full.sql"

# Solo datos (más portable):
pg_dump $ConnPot --no-owner --no-acl --data-only --column-inserts `
  > "$BackupDir\potencias_data_only.sql"

# Storage buckets (si los PDFs se han copiado al CRM en F.2 de Fase 4-5, esto es backup secundario;
# si NO se han copiado y mantenemos Potencias como CDN, NO borrar todavía — ver 6.E):
# Comando depende de la decisión storage. Documentar resultado.

# Hash + checksums para integridad:
Get-FileHash "$BackupDir\*.sql" -Algorithm SHA256 > "$BackupDir\sha256.txt"

# Comprimir + cifrar opcional:
Compress-Archive "$BackupDir\*" "$BackupDir.zip"
# Subir a Drive personal o Cloudflare R2 como cold storage.
```

Política: **conservar backup ≥ 7 años** (régimen contable + RGPD). Documentar ubicación en `docs/SEGURIDAD.md` y `docs/CREDENCIALES_1PASSWORD.csv`.

#### 6.D.2 — Pausar proyecto Supabase Potencias (semana 2)

```
Dashboard → https://supabase.com/dashboard/project/alesfvxqtwlrwlmkoosg/settings/general
→ Pause project
```

- Datos quedan preservados.
- Sin coste activo (free tier).
- Reversible en cualquier momento.

Si hay alguna referencia residual viva, fallará en este paso → revisar logs y resolver antes de borrar definitivamente.

#### 6.D.3 — Espera de validación (2 semanas)

No hacer nada destructivo durante 2 semanas tras pausar. Cualquier dependencia oculta se manifiesta en este periodo.

#### 6.D.4 — Borrar proyecto Potencias (semana 4-5)

```
Dashboard → Pause project (estado actual)
→ Settings → General → Delete project
```

**Solo proceder si**:
- Backups verificados (`pg_restore --list` sobre el dump).
- 0 referencias en logs en las últimas 2 semanas.
- Backups subidos a cold storage externo (no solo en disco local Juan).
- Confirmación escrita Juan ("OK borrar Potencias definitivamente").

**Acción irreversible** — no hay rollback más allá de re-crear desde el backup, lo cual lleva >1h y los project_refs cambiarán.

#### 6.D.5 — Apps satélite en Cloudflare Pages

```bash
# Cloudflare Pages:
# Dashboard → Pages → potencias-app → Settings → Delete project
# Idem excedentes-app si aplica
```

Repos de código (GitHub):
- Si están en orgs separados, archivar (no borrar) los repos: `Settings → Archive this repository`.
- Documentar en README del repo archivado: "Funcionalidad migrada a https://github.com/jolivares-valere/valere-v2— fecha YYYY-MM-DD."

---

### 6.E — Storage buckets (decisión que debe estar resuelta antes de 6.D.2)

Bloqueante crítico para el decommissioning: `documentos.ruta_storage` puede apuntar a buckets del proyecto Potencias.

Tres caminos (decisión Juan, con preferencia documentada en sprint 8 = Opción A):

| Opción | Descripción | Antes de 6.D.4 |
|---|---|---|
| **A. Copiar buckets Potencias→CRM** | Script Storage API (Supabase JS) o `rclone`. Reescribir `documentos.ruta_storage` con nuevas URLs. | ✅ Bucket Potencias borrable. |
| **B. CDN compartida (Potencias vivo solo como bucket)** | Mantener proyecto Potencias **pausado pero NO borrado** indefinidamente. Storage sigue accesible por URL pública firmada. | ❌ NO borrar Potencias nunca. |
| **C. Asumir pérdida de PDFs viejos** | Solo si se decide que documentos pre-fusión no son críticos. | ✅ Bucket Potencias borrable. |

**Recomendación Cowork (consistente con sprint 8)**: A. Tiempo: 1-2h con script.

Borrador del script de copia (no ejecutar todavía — pertenece a sprint dedicado):

```ts
// scripts/copy_buckets_potencias_to_crm.ts
import { createClient } from "@supabase/supabase-js";

const SRC = createClient(POTENCIAS_URL, POTENCIAS_SERVICE_KEY);
const DST = createClient(CRM_URL, CRM_SERVICE_KEY);

const BUCKETS = ["expediente-docs", "client-docs", "comercializadora-docs"]; // ajustar

for (const bucket of BUCKETS) {
  let cursor = "";
  while (true) {
    const { data: files } = await SRC.storage.from(bucket).list(cursor, { limit: 100 });
    if (!files?.length) break;
    for (const f of files) {
      const { data: blob } = await SRC.storage.from(bucket).download(f.name);
      await DST.storage.from(bucket).upload(f.name, blob!, { upsert: true });
      // Re-escribir documentos.ruta_storage en CRM si la URL completa estaba apuntando al bucket viejo:
      // (si ruta_storage es solo la key dentro del bucket, no hace falta reescribir)
    }
    cursor = files[files.length - 1].name;
  }
}
```

Verificación post-copia:
```sql
SELECT count(*) FROM documentos WHERE ruta_storage LIKE '%alesfvxqtwlrwlmkoosg%';
-- Debe ser 0
```

---

### 6.F — Limpieza final del repo + tagging

#### 6.F.1 — Limpieza código

Ya enumerada en Fase 5 (`docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` §5.D), pero verificar cierre:

```bash
# Archivos legacy esperados como ya borrados:
git ls-files src/features/chat-ia/
git ls-files supabase/functions/chat-consultor/
git ls-files src/types/database_canonical_2026-04-26.ts
# Cada uno debe devolver vacío.
```

Si quedan, ejecutar `git rm` desde PowerShell de Juan (sandbox no puede).

#### 6.F.2 — Búsqueda de strings legacy

```bash
# Sin refs a:
grep -r "alesfvxqtwlrwlmkoosg" .   # project ref Potencias
grep -r "POTENCIAS_URL"           # variables env legacy
grep -r "from('retailers')"       # tabla legacy
grep -r "from('retailer_offers')" # tabla legacy
grep -r "from('boe_regulated_prices')" # tabla legacy
```

Tras 0 hits, drop compat views:
```sql
-- Ya documentado en Fase 5.A. Re-confirmar pre-drop con grep en src/.
DROP VIEW IF EXISTS public.retailers CASCADE;
DROP VIEW IF EXISTS public.retailer_offers CASCADE;
DROP VIEW IF EXISTS public.boe_regulated_prices CASCADE;
DROP FUNCTION IF EXISTS public.legacy_retailers_insert();
DROP FUNCTION IF EXISTS public.legacy_retailer_offers_insert();
```

#### 6.F.3 — Tag de release

```bash
git tag -a v2.0.0-unificacion-completa -m "Cierre épica unificación Supabase. 1 proyecto, 1 URL."
git push origin v2.0.0-unificacion-completa
```

Convención semver: bump major porque es un cambio breaking conceptual (las URLs viejas ya no existen). Documentar en `CHANGELOG.md` (si existe) o crear.

#### 6.F.4 — Post-mortem

Crear `docs/POST_MORTEM_UNIFICACION.md`:
- Cronología (sprints 4–9 + Fases 1–6).
- Qué fue bien (compat views, dry-run BEGIN/ROLLBACK, MCP `apply_migration`).
- Qué fue mal (sandbox `.git/` corruption, scripts PS 5.1 fragility, decisiones diferidas en cadena).
- Lecciones para la próxima épica grande (Auth Google, Datadis a escala).
- Métricas: días estimados vs reales, líneas SQL, líneas FE refactor, # incidencias post-cutover.

---

### 6.G — Rollback express (si falla algo en 6.B o 6.C)

#### 6.G.1 — Tipo 1: rotura DNS (custom domain)

```bash
# Cloudflare DNS:
# Cambiar CNAME a la URL vieja inmediatamente. TTL bajo (60s) ya estaba puesto en 6.B.2.
# Comunicar al equipo: "URL vieja restaurada, investigando".
```

ETA: < 5 min con TTL=60s.

#### 6.G.2 — Tipo 2: rotura datos (Fase 2 import corrupto, manifestado en producción)

Usar el dump pre-Fase-2 generado en F.1:

```powershell
# Restaurar el dump pre-Fase-2 sobre el CRM. PIERDE cualquier dato post-cutover.
# Esto requiere downtime — anunciar antes.
psql $ConnCrm < $HOME\valere-backups\crm_pre_fase2_<stamp>.sql
```

ETA: 30-60 min. Riesgo: pérdida de datos creados durante el cutover (mitigar con freeze §6.A.3).

#### 6.G.3 — Tipo 3: rotura RLS (usuarios reales con roles que descubrieron edge cases)

Si los hardenings de RLS rompen flujos legítimos, restaurar las policies weak temporalmente:

```sql
-- Re-aplicar las policies USING(true) sobre las tablas afectadas.
-- Plantillas en _draft_rls_hardening_8_tables.sql (los DROP están al inicio — invertirlos).
```

ETA: 5 min. Después analizar y re-aplicar el hardening con la regla correcta.

#### 6.G.4 — Tipo 4: Edge Function rota

```bash
# Re-deploy de versión anterior conocida buena:
mcp__deploy_edge_function --name ask-crm-docs --files <contenido pre-cutover>
```

ETA: 2 min. El versionado de Supabase mantiene historial — recuperar la versión N-1 si la actual es N.

#### 6.G.5 — Tipo 5: rotura UX general (FE roto)

```bash
# Cloudflare Pages mantiene historial de deploys.
# Dashboard → Pages → valere-v2 → Deployments → click on previous deployment → Rollback to this version
```

ETA: 1 min. Inmediato.

---

## Riesgos y mitigaciones

| Riesgo | P | Impacto | Mitigación |
|---|---|---|---|
| Incumplimiento de la ventana de freeze (alguien deploya un fix mid-cutover) | Media | Alto | Anuncio explícito + bloqueo de PRs en GitHub Actions durante la ventana. |
| Backup Potencias ilegible cuando se necesita en rollback | Baja | Crítico | `pg_restore --list` antes de declarar backup válido. Doble copia: local + cloud. |
| Storage bucket sin migrar y proyecto borrado prematuramente | Media | Crítico | Decisión 6.E **bloqueante** para 6.D.4. No borrar Potencias hasta resolver. |
| Apps satélite quedaron en cache/PWA y siguen apuntando a URL vieja tras cutover | Media | Medio | Service Worker invalidation: en el deploy de Fase 4, bumpear versión + cache-bust. Mensaje al equipo: "limpiar cache si veis algo raro". |
| Equipo sigue usando URL vieja por costumbre tras pausar apps satélite | Alta | Bajo | Proxy temporal (Cloudflare Worker) que redirija URL vieja → nueva con un mensaje "URL ha cambiado". |
| Hardening RLS rompe flujo de un rol específico (ej. `comercial` no puede ver expedientes que sí debería) | Media | Alto | Aplicar hardening **DESPUÉS** de cutover, no durante (Fase 5/6). Test con cuentas de cada rol antes de aplicar. |
| Decisión Opción A vs B de apps satélite no tomada y bloquea Fase 6.D.5 | Media | Medio | Si no se decide en Fase 6.A: por defecto Opción A (compat views) y dejar Opción B para una Fase 7 futura. |

---

## Estimación

| Subfase | Tiempo elapsed | Tiempo Juan | Tiempo Cowork |
|---|---|---|---|
| 6.A — Comunicación + freeze | 1-2 días | 1-2h | 0.5h (templates) |
| 6.B — Cutover real | 30 min | 30 min | 0 (Cowork pasivo) |
| 6.C — Vigilancia 72h | 72h | 1-2h spread | 0.5h logs review |
| 6.D — Decommissioning gradual | 2-4 semanas calendar | 2-3h spread | 0 |
| 6.E — Storage | 1-2h | 1-2h | 1h script |
| 6.F — Limpieza repo + tag + post-mortem | 0.5 día | 1h | 1-2h post-mortem |
| 6.G — Rollback (si necesario) | <30 min | <30 min | 0 |
| **Total efectivo** | **3-5 semanas calendar** | **~10h** | **~4h** |

---

## Dependencias bloqueantes

- ✅ Fase 1 (DDL) aplicada.
- ✅ Fase 3 (FE refactor) aplicada.
- ⏳ Fase 2 (datos) — bloqueante directo. Sin esto no hay datos reales en CRM.
- ⏳ Fase 4 (deploy + smoke + apps satélite con compat views) — bloqueante directo.
- ⏳ Fase 5 (cleanup técnico) — recomendado pero no bloqueante (puede pisarse con 6.F).
- ⏳ Decisión storage (Opción A/B/C) — bloqueante para 6.D.4 borrado Potencias.
- ⏳ Decisión apps satélite Opción A vs B — bloqueante para 6.D.5 borrado repos.

---

## Checklist de cierre Fase 6

- [ ] Comunicación enviada (6.A.1).
- [ ] Equipo entrenado (6.A.2).
- [ ] Freeze activo durante ventana (6.A.3).
- [ ] Verificación pre-cutover OK (6.B.1).
- [ ] DNS / dominio apunta a CRM (6.B.2).
- [ ] Smoke post-cutover OK (6.B.4).
- [ ] 72h sin S1/S2 (6.C).
- [ ] Apps satélite pausadas (6.C.3).
- [ ] Backup Potencias verificado (6.D.1).
- [ ] Storage decisión + ejecución (6.E).
- [ ] Proyecto Potencias pausado (6.D.2) → 2 semanas espera → borrado (6.D.4).
- [ ] Repos satélite archivados (6.D.5).
- [ ] Compat views CRM dropeadas (6.F.2).
- [ ] Tag `v2.0.0-unificacion-completa` (6.F.3).
- [ ] Post-mortem escrito (6.F.4).
- [ ] `docs/ESTADO.md` actualizado declarando épica cerrada.
- [ ] `docs/ARQUITECTURA_PROYECTOS.md` reflejando 1 proyecto.

Cuando todo lo anterior esté `[x]`, **épica unificación Supabase = CERRADA**.

---

## Para Juan (TL;DR ejecutable)

1. Termina Fases 2, 4, 5 según planes existentes.
2. Cuando estés listo para cutover: lee `docs/CHECKLIST_RELEASE_CUTOVER.md` y ejecuta § "Pre-cutover" + § "Cutover".
3. Vigila 72h (logs MCP + Slack).
4. Pausa apps satélite tras 24-48h estables.
5. Resuelve storage (Opción A recomendada — script en 6.E).
6. Tras 2 semanas: backup definitivo + pausar proyecto Potencias.
7. Tras 4 semanas: borrar proyecto Potencias + archivar repos.
8. Drop compat views CRM, tag `v2.0.0`, escribe post-mortem.
9. Cierra épica.

---

> Sprint domingo, lane 3 (docs/proceso). Doc generado, NO ejecutado. Aplica cuando Fases 4-5 estén cerradas.
