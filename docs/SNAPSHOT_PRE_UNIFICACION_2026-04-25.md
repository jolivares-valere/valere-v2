# Snapshot pre-unificación Supabase — 2026-04-25 viernes noche

Contadores de referencia ANTES de la unificación. Servirán para verificar integridad post-migración (contadores deben coincidir o cuadrar con las reglas de dedupe).

## CRM (gtphkowfcuiqbvfkwjxb) — destino canónico

| Tabla | Filas |
|---|---|
| empresas | 3 |
| contactos | 1 |
| contratos | 2 |
| cups | 1 |
| oportunidades | 4 |
| actividades | 1 |
| retailers | 6 |
| retailer_offers | 0 |
| facturas | 0 |
| boe_regulated_prices | 29 |
| user_profiles | 1 |
| propuestas | 0 |
| documentos | 0 |
| incidencias | 0 |
| renovaciones | 0 |
| tareas | 0 |
| custom_fields_schema | 2 |
| custom_fields_values | 2 |
| eventos | 0 |
| notificaciones | 0 |

## Potencias (alesfvxqtwlrwlmkoosg) — origen a migrar

| Tabla | Filas | Destino canónico |
|---|---|---|
| clients | 30 | empresas (dedup por CIF) |
| supplies | 75 | cups (dedup por código) |
| comercializadoras | 2 | comercializadoras (catálogo unificado) |
| expedientes | 41 | expedientes (copia directa) |
| ciclos | 41 | ciclos (copia directa) |
| power_requests | 41 | solicitudes_potencia (renombrada) |
| savings_calculations | 41 | savings_calculations (copia directa) |
| status_log | 91 | status_log (copia directa) |
| client_communications | 31 | comunicaciones_cliente (renombrada) |
| client_documents | 70 | documentos (polimórfica consolidada) |
| expediente_documents | 27 | documentos (polimórfica consolidada) |
| comercializadora_docs | 1 | comercializadora_docs (copia) |
| documentacion | 1 | documentos (polimórfica consolidada) |
| profiles | 4 | user_profiles (fusión por email) |
| regulated_rates | 18 | boe_regulated_prices (fusión) |
| email_templates | 2 | email_templates (copia) |
| excel_import_templates | 0 | excel_import_templates (copia) |
| alerts | 0 | alertas (renombrada) |

Total Potencias: **520 filas activas**.

## Objetivo post-unificación (CRM unificado)

| Tabla | Filas esperadas | Notas |
|---|---|---|
| empresas | ~30-33 | 30 Potencias + 3 CRM con posible overlap → ~30-33 según duplicados CIF |
| cups | 75-76 | 75 Potencias + 1 CRM → 75 o 76 según overlap |
| comercializadoras | ~7-8 | 6 retailers CRM + 2 Potencias → dedup por nombre normalizado |
| boe_regulated_prices | 29-47 | 29 CRM + 18 Potencias → según overlap |
| user_profiles | ~5 | 1 CRM + 4 Potencias → fusión por email |
| expedientes, ciclos, power_requests, savings | 41 cada | Copia directa |
| status_log | 91 | Copia directa |
| documentos (consolidada) | 99 | 70 client + 27 expediente + 1 documentacion + 1 comercializadora |
| communications | 31 | Copia directa |
| email_templates | 2 | Copia directa |

## Verificación post-migración

Tras ejecutar migración, los contadores del CRM unificado deben ser: contadores CRM originales + contadores Potencias tras dedupe. Script de verificación en `docs/PLAN_UNIFICACION_SUPABASE_FASE_0.md` §"Scripts de verificación post-migración".

## Rollback (si algo falla)

- Apps siguen apuntando a sus proyectos originales durante toda la fase de preparación.
- Solo en el switch final (domingo noche) se cambia el frontend Potencias para apuntar al CRM.
- Si falla el switch: revertir env vars Cloudflare Potencias → vuelve a Potencias viejo → datos allí intactos.
- Coste de rollback: 30 min (cambio env + redeploy).
