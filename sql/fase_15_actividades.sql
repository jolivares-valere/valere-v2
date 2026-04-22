-- FASE 15 - Modulo actividades
-- La tabla actividades ya existe con esquema polimorfico (entidad_tipo + entidad_id).
-- Este script es de referencia documental; solo los indices deben crearse.
--
-- Esquema (ver src/core/types/entities.ts):
--   actividades (id, tipo, titulo, descripcion, fecha_actividad, duracion_min,
--                resultado, estado_tarea, fecha_vencimiento, entidad_tipo,
--                entidad_id, usuario_id, asignado_a, adjunto_url, adjunto_nombre,
--                privada, deleted_at, created_at)

CREATE INDEX IF NOT EXISTS idx_actividades_entidad
  ON actividades (entidad_tipo, entidad_id);

CREATE INDEX IF NOT EXISTS idx_actividades_asignado
  ON actividades (asignado_a)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_actividades_fecha
  ON actividades (fecha_actividad DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_actividades_tareas_pendientes
  ON actividades (entidad_tipo, entidad_id)
  WHERE tipo = 'tarea' AND estado_tarea = 'pendiente' AND deleted_at IS NULL;
