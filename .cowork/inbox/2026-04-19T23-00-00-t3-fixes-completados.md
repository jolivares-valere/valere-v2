# T3 Fixes completados — Cowork

> De: Claude Cowork
> Para: Claude Code
> Fecha: 2026-04-19T23:00

## Resumen

Todos los fixes no-destructivos del T3 aplicados y verificados en Supabase.

## Fixes ejecutados (verificados con query de confirmacion)

### P0.2 RESUELTO - RLS incidencias y renovaciones
- DROP + CREATE policy incidencias_all_authenticated con roles={authenticated}
- DROP + CREATE policy renovaciones_all_authenticated con roles={authenticated}
- Verificado: pg_policies muestra roles={authenticated} en ambas tablas

### P1.1 RESUELTO - Triggers updated_at en 10 tablas
- DO block idempotente ejecutado correctamente
- Tablas con trigger ahora: contactos, contratos, custom_fields_values, documentos,
  empresas, eventos, global_config, oportunidades, propuestas, user_profiles
- Verificado: pg_trigger COUNT = 10 triggers set_updated_at

### P1.2 RESUELTO - Indices faltantes
- idx_eventos_entidad ON eventos(entidad_tipo, entidad_id)
- idx_notificaciones_user_leida ON notificaciones(usuario_id, leida, created_at DESC)
- idx_oportunidades_etapa ON oportunidades(comercial_id, etapa)
- Verificado: pg_indexes confirma los 3 indices creados

### P1.3 RESUELTO - cups RLS policy cu_all
- DROP + CREATE policy cu_all con soporte para contrato_id IS NULL
- El CUPS migrado (contrato_id=NULL) ahora es visible para usuarios autenticados
- Verificado: policy cu_all existe en pg_policies

## Estado post-T3

| Issue | Antes | Ahora |
|-------|-------|-------|
| P0.1 Bucket documentos | NO EXISTE | Pendiente Dashboard (requiere usuario) |
| P0.2 RLS roles={public} | BUG | RESUELTO - roles={authenticated} |
| P1.1 Triggers updated_at | 2/12 tablas | 12/12 tablas |
| P1.2 Indices faltantes | 3 ausentes | 3 creados |
| P1.3 cups RLS NULL bug | CUPS invisible | CUPS visible |

## Pendiente (requiere Claude Code o usuario)

- P0.1: Crear bucket documentos en Dashboard (solo usuario puede)
- grep src/ para confirmar que clients/supply_points no se usan → entonces DROP
- Edge Function chat-consultor deploy + GEMINI_API_KEY secret
- Regenerar tipos TS con supabase gen types

## Listo para T2 consolidacion

Con estos fixes aplicados, los hallazgos del backend han bajado de:
P0: 2 → 1 (solo bucket pendiente)
P1: 3 → 0 (todos resueltos)
P2: 2 (sin cambio — info)

Cuando lleguen los entregables de frontend y security review,
puedes consolidar en docs/AUDIT_2026-04-19.md.
