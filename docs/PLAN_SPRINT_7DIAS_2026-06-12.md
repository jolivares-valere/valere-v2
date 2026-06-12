# Plan Sprint 7 días — Cerrar el circuito y subir de nivel (2026-06-12 → 2026-06-19)

> Aprobado por Juan 2026-06-12. Basado en: ANALISIS_ESTRATEGICO_2026-06-10.md, ANALISIS_MATERIAL_2026-06-12.md,
> PLAN_FASE2_PROPUESTAS_PPTX.md, auditoría técnica del código (12/06), advisors Supabase en vivo,
> y resumen ejecutivo ChatGPT 12/06.
> **Este plan manda durante el sprint.** Equivalencias: S1≈Fase 0 (hecha), S3≈Fase 2 PPTX, S2≈Fase 4 SIPS, S4≈Día 7.

## Decisiones de Juan (12/06)

1. **Tabla canónica de propuestas**: delegado a Cowork → **unificar en `propuestas`** (ambas a 0 filas, coste cero ahora; Fase 2 escribirá en `propuestas`, las 3 features que usan `proposals` se migran el día 1-2).
2. **Tablas `_migration_*` y `*_backup_20260511`**: **NO borrar** todavía.
3. **Alcance**: todo el plan, por orden, sin recortes.
4. **Backfill Visalia**: ejecutado 12/06 → 43 tarifas en `tariff_staging` (`pendiente_revision`). Pipeline validado end-to-end (con 3 fixes en caliente, ver §Hecho).

## Objetivo del sprint

Que una factura/SIPS entre en el CRM, se analice, salga como propuesta PPTX de marca,
se envíe y se trackee — sobre una base segura (RLS real), rápida y testeada.

## Plan día a día

| Día | Bloque | Tareas | Hecho cuando |
|---|---|---|---|
| **1** (12-13/06) | Base limpia | Merge+deploy Fase 1 (PS1 listo) · commit fix EF gemini-2.5-flash + migration backfill · `.gitattributes` anti-CRLF · unificación `proposals`→`propuestas` (migración de las 3 features) · borrar feature fantasma chat-ia y tipos triplicados · CLAUDE.md al día (141 tests, Gemini en Edge, 83 tablas) | Deploy verde con Fase 1; una sola tabla de propuestas; TSC 0 |
| **2-3** | Salida del circuito (Fase 2 PPTX) | F2.1 tipar `ClienteJson` · F2.2 builder desde tablas CRM · F2.3 EF `generar-propuesta-pptx` (port generador LOWFIT) · F2.4 botón en /analisis + Storage bucket `propuestas` · F2.5 QA fee invisible (test CI "fee|margen|comisión") | Desde /analisis sale un .pptx de marca en 1 click |
| **3-4** | Fiabilidad y velocidad | Tests `calculateSimulatedInvoice` (fijo/indexado, SSAA, excedentes, 2.0/3.0/6.1TD) · des-skip test versionado ofertas · fix `.limit(10000)` empresas/contratos con `.range()` · aviso UI truncado captación 500 · upgrade `xlsx`≥0.20.2 (CVEs) + import dinámico (−425 KB) | Motor testeado; bundle inicial < 600 KB |
| **4-5** | Seguridad RGPD | RLS real 1ª tanda: `user_profiles`, `empresas`, `contactos`, `cups` (rol+`is_approved()`) · drop firmas viejas duplicadas de RPCs (`crear_lead_captacion` ×3, `actualizar_lead_captacion` ×3) · fix policies always-true (`alertas`, `datadis_supply_price_terms`) · poblar `crm_help_embeddings` (workflow RAG, está a 0) | Advisor sin WARNs accionables; RAG responde |
| **5-6** | Entrada del circuito | Parser SIPS distribuidora (formato A, detección por firma de cabecera) → upsert `cups`+`facturas(origen='sips')` · validación en /analisis con Excel real | Excel SIPS real entra sin teclear |
| **6** | Adopción | Cerrar Sprint Carolina: vista tabla + tab Enviados + MisLlamadas en CaptacionPage (backend ya en prod) · menú por rol (grupos Comercial/Datos/Operación/Admin) | Carolina trabaja en vista tabla |
| **7** | Cierre del lazo + QA | Envío propuesta vía Resend + webhook tracking apertura · pantalla revisión `tariff_staging` (Verificar/Rechazar) si da tiempo · auditoría final: TSC, tests, advisors, E2E navegador, bundle · docs/sesión/outbox | Circuito completo demostrado con 1 caso real |

## Hecho ya (12/06, esta sesión)

- Backfill Visalia real: 43 tarifas en staging (16 elec + 9 gas dom. + 18 gas PYME), confianza 0.90, decision NUEVA.
- Pipeline tarifas reparado: EF v4 con `gemini-2.5-flash` (1.5 retirado → 404), migrations `tariff_extractions` (document_id/model_name nullable, status check +valid/invalid). Registrado en `supabase/migrations/20260612_tariff_extractions_fix_backfill.sql`.
- Dato nuevo (doc ChatGPT): plataformas telemedida = **Telegest, Linkener, CGNET** (+FusionSolar FV) → responde parcialmente punto 3 de la sección 8.

## Riesgos del sprint

- Commits dependen del PowerShell de Juan (sandbox no escribe `.git`) → preparar PS1 por bloque, pedir ejecución al cierre de cada día.
- Drift repo↔prod: verificar en navegador tras cada deploy (lección C3 incidencias).
- `leaked_password_protection` requiere plan Pro Supabase → fuera del sprint, anotado.
- Las 14 firmas SECURITY DEFINER restantes son RPCs intencionales (capa B permisos); solo se dropean las firmas viejas duplicadas.
