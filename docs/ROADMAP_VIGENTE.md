# Roadmap vigente Valere CRM (1 mayo 2026)

> Vista condensada del roadmap. La fuente extensa es `ROADMAP_FUSION.md` (FASES 20-33). Este resume lo VIVO + lo INMEDIATO.

## Histórico de fases ya cerradas (resumen)

- **FASE 20.x — Fusión CRM + Calculadora** (10 sub-fases): ✅ cerradas. Arquitectura feature-based unificada, `src/modules/` eliminado.
- **FASE 21.a — Pipeline energético**: ✅ cerrada parcialmente, finalizada en FASE 30.3 hoy.
- **FASE 21.b — Alertas vencimiento**: ✅.
- **FASE 22 — Incidencias**: ✅.
- **FASE 23 — Renovaciones**: ✅ (tabla creada pero ahora deprecada en favor de `oportunidades.tipo='renovacion'`).
- **FASE 24 — Documentos/Storage**: ✅.
- **FASE 25 — Notificaciones**: ✅.
- **FASE 26 — Exportaciones e informes**: ✅.
- **FASE 27 — Calendario**: ✅.
- **FASE 28 — Personalización CRM Valere**: ✅ (multi-sub-fase).

## Sprint A — FASE 30 (en curso, 6/10 sub-fases)

### Aplicado autónomamente 1 mayo 2026

| Sub-fase | Estado | Detalle |
|---|---|---|
| 30.1 | ✅ aplicado prod | `run_daily_contract_check()` SQL + cron 04:00 UTC + REVOKE security |
| 30.3 | ✅ aplicado prod | UPDATE etapas legacy + CHECK 8 etapas + EtapaOportunidad TS limpio |
| 30.4 | ✅ frontend | Importes en Kanban (working tree) |
| 30.5 | ✅ frontend | Wizard contacto decisor en alta empresa (working tree) |
| 30.6 | ✅ frontend | Botón "Asociar a empresa" en DatadisPage (working tree) |
| 30.8 | ✅ aplicado prod | `incidencias.cups_id` aditiva (FK + index + populate) |
| 30.10 | ✅ frontend | Sentry SDK lazy con DSN opcional (working tree) |

### Pendientes Sprint A

| Sub-fase | Estado | Bloqueador |
|---|---|---|
| 30.2 | ❌ pendiente | Decidir: DROP `renovaciones` (vacía) o mantener como vista. **Requiere refactor `renovaciones/api.ts` + RenovacionesPage** para apuntar a `oportunidades`. |
| 30.7 | ❌ pendiente | Vinculación masiva Datadis↔Empresa por NIF — Edge Function nueva. |
| 30.9 | ❌ pendiente | Aplicar RLS granular FASE 20.9 — sesión coordinada con observación tabla a tabla (riesgo timeout). |

## Sprint Release 1 captación — próximo gran sprint (11 días)

Ver `RELEASE_1_CAPTACION_2026-05-01.md`. Resumen:

Cabina manual asistida para Carolina (telemarketing). NO Gmail API auto, NO CTI, NO SIPS pilar, CON motivos pérdida estructurados, CON compliance LOPDGDD desde día 1.

Orden:
1. Schema (1d): motivos_perdida + origen_canal + auditoria_contacto + flag no_llamar.
2. UI lista priorizada `/captacion` (2d).
3. UI ficha llamada activa con outcomes (2d).
4. Wizard alta empresa+contacto+oportunidad unificado (1d).
5. PDF diagnóstico inicial con disclaimers (1d).
6. Plantilla email + botón "Copiar a Gmail draft" (1d).
7. Compliance LOPDGDD (1d).
8. Dashboard mínimo Carolina + supervisor (1d).
9. QA con Carolina + ajustes (1d).

## Sprint B — FASE 31 (modelo energético, 5 días)

Posterior a Release 1. Schema de campos ricos:

- 31.1: Precios P1-P6 €/kWh y €/kW·año en `contratos`.
- 31.2: Detalle económico en `oportunidades` (consumo_anual_kwh, precio_actual, precio_ofertado, fee_valere_pct, plazo_meses).
- 31.3: Tabla `oportunidad_cups` (N:M).
- 31.4: `historial_precios_contrato` con trigger snapshot.
- 31.5: Subsegmento + tamaño + consumo estimado en `empresas`.
- 31.6: `rol_energetico` y `canal_preferido` en `contactos`.
- 31.7: Hook `useAhorroEstimado(oportunidad_id)` calculando contra Datadis.
- 31.8: 5 informes energéticos (ahorro 12m, distribución tarifaria, top consumidores, vencimientos vs OMIE, reactiva).

## Sprint C — FASE 32 (servicios diferenciadores, 5 días)

- 32.1: Edge Function `datadis-incidencias-detector` cron diario.
- 32.2: Validador de facturas v0 (3 reglas críticas, híbrido LLM+reglas).
- 32.3: Portal cliente v0 (depende RLS 30.9).
- 32.4: Generador autorización Datadis desde CRM.

## Sprints sectoriales — FASES 34-40 (post-FASE 32)

Ver `AUDIT_2026-05-01_PROFESIONAL_SECTOR.md` y `RELEASE_1_CAPTACION_2026-05-01.md` Releases 2-3:

- **34**: Datos públicos sector — SIPS lookup (con regulación CNMC), OMIE diario, eSIOS factor emisiones, BOE peajes/cargos.
- **35**: Auditoría inicial automatizada por CUPS (lanza al asociar CUPS a empresa).
- **36**: Validador de facturas profesional (10 reglas, motor configurable).
- **37**: Alertas inteligentes (14 reglas: Datadis + mercado + comerciales).
- **38**: Dashboard estratégico (KPIs CAC/LTV/NRR, "€ recuperados", vista `/suministros`).
- **39**: Reporting cliente automatizado mensual.
- **40**: Servicios adyacentes (FV calculator, CAEs detector, auditoría obligatoria, CSRD, PPA).

## Diferidos — FASE 33 (cuando haya bandwidth)

- 33.1: Firma digital (Signaturit/DocuSign).
- 33.2: Convergencia visual completa (CRIT-1, CRIT-2 design review).
- 33.3: Tests a 30% cobertura dominio.
- 33.4: Limpieza `as never` legados (~111 ocurrencias, ya 1 retirado en FASE 30.3).
- 33.5: Tabla móvil responsive.
- 33.6: Modo oscuro.

## Pre-requisitos críticos

1. **Cerrar TSC sprint Potencias** (`docs/SPRINT3_TSC_PENDIENTE.md`, ~2.5h) antes de cualquier merge a main.
2. **Sanity check + commit Sprint A** (`docs/CHECKLIST_QA_SPRINT_A_2026-05-01.md`, ~30-45 min).
3. Decisiones Juan: ver `PLAN_DEPURACION_2026-05-01.md` sección 7.

## Reglas operativas

- **70% nueva funcionalidad / 30% depuración** (proporción mínima saludable).
- **No abrir sprint nuevo sin cerrar el anterior** (commit + TSC verde + tests + sanity).
- **No más de 1 sprint abierto + 1 rama experimental simultáneos**.
- **Nunca dejar trabajo importante en working tree sin push**.
- **Compliance LOPDGDD desde día 1** (no "lo añadimos después").

## KPIs de éxito por release

### Release 1 captación (criterios para iniciar Release 2)

| Métrica | Threshold |
|---|---|
| % llamadas Carolina registradas en CRM | ≥ 80% |
| Tiempo medio llamada → propuesta | ≤ 24h (vs 5-10d actual) |
| Llamadas/día promedio | ≥ 40 |
| Motivos pérdida estructurados | ≥ 90% (vs "otro") |
| Carolina prefiere CRM a Excel | sí cualitativo |

### KPIs de negocio que el CRM debe mover

- Ratio llamada → propuesta enviada (objetivo 5-15%, sector típico).
- Ratio propuesta → cliente (objetivo 10-25%).
- Tiempo medio llamada → propuesta (objetivo <24h).
- € recuperados a clientes 12m (métrica trofeo).
- Tasa renovación cartera (objetivo >70%).
