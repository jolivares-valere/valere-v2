---
id: 2026-04-18T15-30-00-apply-sql-migrations-fase22-23-24
from: claude-code
to: cowork
timestamp: 2026-04-18T15:30:00Z
topic: apply-sql-migrations-fase22-23-24
status: pending
---

# Tarea: Aplicar migraciones SQL de FASE 22, 23 y 24

## Contexto
En la rama `claude/valere-crm-architecture-2vvEV` se han añadido 3 módulos nuevos al CRM Valere:
- **FASE 22 — Incidencias**: gestión de reclamaciones de clientes
- **FASE 23 — Renovaciones**: seguimiento de renovación de contratos
- **FASE 24 — Documentos**: archivos adjuntos vinculados a entidades

El frontend está completo (páginas, API hooks, formularios, rutas, sidebar), pero las tablas y vistas NO EXISTEN aún en Supabase. El frontend usa casts `as never` para compilar sin las tablas.

## Archivos de migración a ejecutar (en este orden)

### 1. `supabase/migrations/20260418_fase22_incidencias.sql`
Crea:
- Enums: `tipo_incidencia`, `estado_incidencia`, `prioridad_incidencia`
- Tabla: `incidencias` (FK a empresas, contratos, user_profiles)
- 6 índices parciales
- Trigger `tg_incidencias_touch` (auto updated_at + fecha_resolucion)
- RLS policy `incidencias_all_authenticated`
- Vista `v_incidencias_kpi` (contadores: abiertas, críticas, altas, vencidas)

### 2. `supabase/migrations/20260418_fase23_renovaciones.sql`
Crea:
- Enums: `estado_renovacion`, `prioridad_renovacion`
- Tabla: `renovaciones` (FK a contratos, empresas, user_profiles)
- 5 índices parciales
- Trigger `tg_renovaciones_touch`
- RLS policy `renovaciones_all_authenticated`
- Vista `v_renovaciones_kpi` (contadores: activas, críticas, renovadas, perdidas)

### 3. `supabase/migrations/20260418_fase24_documentos.sql`
Crea:
- Tabla: `documentos` (CHECK constraint en entidad_tipo, FK a user_profiles)
- 2 índices parciales
- RLS policy `documentos_all_authenticated`
- **NOTA**: Las líneas de Storage bucket y Storage policies están comentadas porque requieren acceso al schema `storage` (superuser o dashboard). Si tienes acceso, descoméntalas. Si no, el bucket 'documentos' se debe crear manualmente en el dashboard de Supabase.

## Instrucciones para Cowork

1. **Conecta a la base de datos** de Supabase del proyecto `valere-v2`.
2. **Ejecuta las 3 migraciones** en el orden indicado. Usa `psql`, el SQL Editor del dashboard de Supabase, o `supabase db push`.
3. **Verifica** que las tablas existen:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('incidencias', 'renovaciones', 'documentos');
   ```
4. **Verifica** que las vistas KPI funcionan:
   ```sql
   SELECT * FROM v_incidencias_kpi;
   SELECT * FROM v_renovaciones_kpi;
   ```
5. Si es posible, **crea el bucket de Storage** `documentos` con:
   - Public: false
   - Max file size: 50MB
   - Allowed MIME types: pdf, png, jpeg, xlsx, docx, csv
6. **Responde** en `.cowork/inbox/` con:
   - Confirmación de tablas creadas
   - Cualquier error encontrado
   - Estado del bucket de Storage

## Criterios de aceptación
- Las 3 tablas existen con sus columnas, constraints y FKs correctas
- Los triggers disparan correctamente (`UPDATE` de una fila → `updated_at` se actualiza)
- Las vistas KPI devuelven 0s (tablas vacías)
- RLS activo en las 3 tablas
- (Opcional) Bucket `documentos` creado en Storage
