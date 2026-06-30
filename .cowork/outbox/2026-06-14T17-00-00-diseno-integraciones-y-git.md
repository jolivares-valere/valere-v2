# Outbox · 2026-06-14 · Sesión de DISEÑO (docs) + aviso git

> Sesión Cowork **de análisis estratégico y diseño** (chat separado del sprint técnico, por la regla de aislamiento:
> nunca dos sesiones tocando los mismos archivos). Esta sesión SOLO ha escrito `.md` en `docs/`. **No tocó código ni git.**

## 1. ⚠️ GIT NECESITA REPARACIÓN (no lo arregló esta sesión)

Al arrancar, el repo estaba en mal estado (mismo "gremlin" del Día 2):
- `.git/HEAD` apunta a `refs/heads/claud` → **rama fantasma sin commits** (`fatal: branch 'claud' does not have any commits yet`).
- Hay un lock colgado: `.git/next-index-3.lock`.
- **`main` está INTACTO** (`74c6f76` = PR #12 menú Energía + anualización; PR #11 antes). No se ha perdido nada.

**Causa probable:** un `git checkout`/escritura a medias dejó HEAD en una rama vacía. El sandbox NO puede arreglar
`.git` (mount Windows). **Lo arregla Juan en PowerShell** con el script preparado: `REPARAR_GIT_CLAUD_2026-06-14.ps1`
(en la raíz del repo). Resumen de lo que hace: backup de `.git`, borra el lock, `git checkout main`, verifica que
`main`=74c6f76 y que `git status` queda limpio.

> Mientras HEAD esté en `claud`, NO commitees: los .md nuevos aparecen como "staged en rama vacía". Tras `checkout main`,
> los .md de docs/ quedarán como *untracked* normales, listos para commitear.

## 2. Entregables de esta sesión (5 docs de diseño + índice)

Todos en `docs/`, listos-para-construir (SQL = propuestas, nada ejecutado en Supabase):

- `00_INDICE_DISENO_2026-06-14.md` — índice + hilo conductor + prioridades + decisiones pendientes de Juan.
- `DISENO_DATADIS_PUENTE_2026-06-14.md` — consentimiento + sync + **puente a `facturas`** (lo que faltaba).
- `DISENO_TELEMEDIDA_2026-06-14.md` — Telegest/Linkener/CGNET, tabla `curvas_carga`, `telemetry-ingest`, maxímetros.
- `DISENO_FV_MULTIPLATAFORMA_2026-06-14.md` — `FVAdapter`, SolarEdge/GoodWe, **cruce autoconsumo FV×Datadis×pool**.
- `DISENO_MODULO_PROPUESTAS_2026-06-14.md` — unificar `propuestas`, `cliente.json` completo, 8 componentes, optimización potencia.
- `DISENO_REESTRUCTURACION_CRM_2026-06-14.md` — **menú por rol**, vínculos de datos, features huérfanas, higiene.

## 3. Para la siguiente sesión

1. Juan ejecuta `REPARAR_GIT_CLAUD_2026-06-14.ps1` → repo en `main` limpio.
2. Commitear estos 6 docs (rama `claude/docs-diseno-2026-06-14` + PR, o directo a docs según prefiera Juan).
3. **Actualizar `docs/ESTADO.md`** — esta sesión NO lo tocó a propósito (lo posee la sesión técnica; evitar choque).
   Añadir: "2026-06-14 sesión diseño: 6 docs de integraciones/reestructuración en docs/. Git reparado (claud→main)."
4. Responder a las **decisiones pendientes de Juan** del índice (D1 Datadis, T1 telemedida, F1/F2 FV, P2 logo, R1-R3 reestructuración).

## 4. Verificado en vivo (Supabase, solo lectura)

88 tablas reales (CLAUDE.md dice 22 — deuda documental). Claves: `facturas` 0, `propuestas`/`proposals` 0,
`datadis_consumptions`/`consentimientos_datadis` 0, `datadis_proxy_cache` 44, `cups` 73, `empresas` 53,
`fv_planta` 7, `precios_pool_horarios` 105.776, `tariff_staging` 43. Confirma el diagnóstico: cañería sin extremos conectados.
