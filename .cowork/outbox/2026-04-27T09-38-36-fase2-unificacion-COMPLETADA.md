# 🎉 Fase 2 Unificación Potencias COMPLETADA — handoff

**Fecha:** 2026-04-27 11:38 (hora local) / 09:38 UTC
**Agente:** Cowork (con Juan ejecutando PowerShell)
**Estado:** ✅ APLICADO EN PROD

---

## Resumen ejecutivo

Las 526 filas vivas del proyecto Supabase Potencias (`alesfvxqtwlrwlmkoosg`) están migradas al CRM canónico (`gtphkowfcuiqbvfkwjxb`) con dedupe inteligente y FK re-mapeadas. Cero huérfanos, integridad referencial 100%.

## Lo aplicado en prod CRM

| Tabla canónica | Antes | Ahora | Δ migrado | Notas dedupe |
|---|---|---|---|---|
| empresas | 3 | 27 | +24 | 30 clients Potencias → 24 únicos por CIF normalizado |
| cups | 1 | 73 | +72 | 75 supplies Potencias → 72 únicos por CUPS normalizado |
| expedientes | 0 | 41 | +41 | append directo |
| ciclos | 0 | 41 | +41 | append directo |
| solicitudes_potencia | 0 | 41 | +41 | append, FK ciclo/cups/empresa re-mapeadas |
| savings_calculations | 0 | 41 | +41 | append, FK request/ciclo re-mapeadas |
| comunicaciones_cliente | 0 | 31 | +31 | append, FK empresa/ciclo/expediente re-mapeadas |
| documentos | 0 | 98 | +98 | polimórfico: 70 client + 27 expediente + 1 documentación |
| comercializadora_docs | 0 | 1 | +1 | append |
| status_log | 91 | 91 | (sin solapamiento) | append |
| email_templates | 0 | 2 | +2 | append |
| comercializadoras | 6 | 8 | +2 | dedupe por nombre normalizado, 0 matches → 2 nuevas |
| precios_regulados_boe | 29 | 47 | +18 | dedupe por (period, tariff_type, valid_from) |

**Total: 526 filas migradas. Cero huérfanos confirmado.**

## Hitos del proceso

1. ✅ PostgreSQL CLI 17.9 instalado en Windows.
2. ✅ Passwords DB de los 2 proyectos reseteados + variables permanentes seteadas.
3. ✅ Backups full pre-Fase 2: `crm_pre_fase2_20260427_1110.sql` (2.65 MB), `potencias_pre_fase2_20260427_1110.sql` (0.87 MB) en `C:\Users\joliv\valere-backups\`.
4. ✅ Schema `_potencia_staging` creado en CRM via MCP.
5. ✅ pg_dump --data-only Potencias + transform `public.` → `_potencia_staging.` + carga en CRM (526 filas).
6. ✅ Verificación staging vs origen: 100% match en counts.
7. ✅ DRY-RUN del transform (BEGIN ... ROLLBACK) detectó 1 problema: `documentos_tipo_check` no incluía `email_enviado` ni `estudio_ahorro` (tipos de Potencias). Constraint extendido para soportar 10 valores en lugar de 8.
8. ✅ DRY-RUN final completo sin errores.
9. ✅ COMMIT real aplicado.
10. ✅ Verificación post-COMMIT: counts exactos al dry-run.
11. ✅ Verificación integridad: cero huérfanos en 9 FK críticas.
12. ✅ Schema `_potencia_staging` eliminado (ya no se necesita).

## Cambios de schema acumulados como side-effect

- `public.documentos.documentos_tipo_check`: extendido a `['contrato','factura','documentacion','otro','autorizacion','autorizacion_firmada','licencia','informe','estudio_ahorro','email_enviado']`.
- `public.documentos.documentos_entidad_tipo_check`: extendido a `['empresa','contrato','oportunidad','contacto','expediente','general']`.
- 7 tablas `_migration_*_map` creadas y persistidas en `public` para auditoría/re-run (no son temporales).

## Lo que NO se ha hecho (pendiente)

1. **Migrar PDFs en Storage**: ~100 PDFs (~15 MB) viven en buckets `documents` + `expediente-docs` del proyecto Potencias. No se han copiado al bucket `documentos` del CRM. Las filas en `documentos.ruta_storage` apuntan a paths relativos que asumen bucket Potencias. Si se quiere consolidar, hay que copiar los blobs entre proyectos via `supabase-storage-cp` o script Node.
2. **Consolidar tabla `proposals` legacy** (decisión Juan diferida).
3. **RLS hardening 8 tablas** Potencias-side: draft existe en `supabase/migrations/_pending_rls_hardening_8_tables.sql`. Aplicar tras Fase 2 (ahora ya se puede).
4. **Pausar el proyecto Potencias** (`alesfvxqtwlrwlmkoosg`): los datos están duplicados ahora. Antes de pausar, validar que la app `valere-gestion-potencias.pages.dev` ya apunta al CRM (cutover URL — pendiente decisión cuándo).

## Verificación post-Fase 2 — comandos para Juan

```sql
-- Smoke test rápido en SQL Editor del CRM:
-- (a) ver una empresa migrada con expediente y CUPS
SELECT e.nombre, e.nif, c.codigo_cups, exp.anio, exp.estado, exp.tipo_normativa
FROM public.empresas e
JOIN public.cups c ON c.empresa_id = e.id
JOIN public.expedientes exp ON exp.empresa_id = e.id AND exp.cups_id = c.id
WHERE e.legacy_potencia_id IS NOT NULL
LIMIT 5;

-- (b) ahorros migrados
SELECT SUM(ahorro_previsto_total) AS ahorro_previsto_eur,
       SUM(ahorro_real_total) AS ahorro_real_eur,
       COUNT(*) AS num_calculos
FROM public.savings_calculations;
```

## Smoke test UI pendiente Juan

1. Abre https://valere-v2.pages.dev/empresas
2. Verifica que ves 27 empresas (3 originales + 24 migradas).
3. Click en alguna migrada (las que tienen NIFs reales tipo B-XXXXXXXX).
4. Verifica que ves el expediente, CUPS y suministros vinculados.
5. Sin errores en consola del navegador.

## Pendientes acumulados del proyecto

Por orden de prioridad:

1. ⏳ **Smoke test UI Fase 2** (5 min, Juan).
2. ⏳ **Decidir cutover URL Potencias** → pages.dev/potencias o nueva app dentro de CRM.
3. ⏳ **Migrar PDFs Storage** (1 sprint corto, opcional).
4. ⏳ **Aplicar RLS hardening** post-Fase 2 (1 sprint).
5. ⏳ **Tomar 7 decisiones Holded** + generar API Key + lanzar nueva sesión Cowork con prompt `docs/COWORK_PROMPT_HOLDED_INTEGRATION.md`.
6. ⏳ **Push acumulado sprints 5-8** vía RUNBOOK.ps1 maestro original.
7. ⏳ **Vercel 301 redirect** (decisión Juan).
8. ⏳ **Rotar passwords DB Supabase** (los 2 que circularon por chat).

## Archivos generados

- `C:\Users\joliv\valere-backups\crm_pre_fase2_20260427_1110.sql` (2.65 MB)
- `C:\Users\joliv\valere-backups\potencias_pre_fase2_20260427_1110.sql` (0.87 MB)
- `C:\Users\joliv\valere-backups\potencias_data_only_20260427_1126.sql`
- `C:\Users\joliv\valere-backups\potencias_data_only_staged_20260427_1126.sql`
- Este outbox.

## Riesgo asumido conocido

- Los passwords DB de los 2 proyectos Supabase circularon en chat de Cowork. Recomendación: rotar otra vez **después** del smoke test UI exitoso. Variables actuales en `[Environment]::SetEnvironmentVariable('VALERE_*_DB_PASSWORD', ..., 'User')` y en 1Password — al rotar, actualizar ambas.
