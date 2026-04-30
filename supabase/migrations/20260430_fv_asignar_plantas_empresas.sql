-- Migración: asignar plantas FV a sus empresas del CRM
-- Ejecutar DESPUÉS del primer sync exitoso (cuando fv_planta tenga datos)
--
-- Empresa IDs confirmados en Supabase (verificados 2026-04-30):
--   FEDERACION DE ORGANIZACIONES ANDALUZA DE MAYORES → d117e5f5-4bba-485d-babf-0b6710e0f194
--   ASOC PAZ Y BIEN                                  → 84de3a0e-a74c-47a0-a12c-654a40b469ed
--   JUAN RUBIO                                       → 0a9d8e1a-0108-4395-ae5c-7563cfd80c6f
--   SIERRA MAYOR JABUGO SA                           → f40e3242-e35e-4cab-9bd5-5f118926f4c6

-- Ver plantas actualmente sin empresa asignada:
-- SELECT id, nombre, station_code, empresa_id FROM fv_planta WHERE empresa_id IS NULL;

-- Plantas FOAM → FEDERACION ANDALUZA MAYORES
UPDATE fv_planta
SET empresa_id = 'd117e5f5-4bba-485d-babf-0b6710e0f194'
WHERE empresa_id IS NULL
  AND (
    nombre ILIKE '%foam%'
    OR nombre ILIKE '%federacion%'
    OR nombre ILIKE '%mayores%'
  );

-- JUAN RUBIO CASA → JUAN RUBIO
UPDATE fv_planta
SET empresa_id = '0a9d8e1a-0108-4395-ae5c-7563cfd80c6f'
WHERE empresa_id IS NULL
  AND (
    nombre ILIKE '%juan rubio%'
    OR nombre ILIKE '%rubio casa%'
  );

-- PAZ Y BIEN HERMANA CLARA + HOTEL SIERRA LUZ → ASOC PAZ Y BIEN
UPDATE fv_planta
SET empresa_id = '84de3a0e-a74c-47a0-a12c-654a40b469ed'
WHERE empresa_id IS NULL
  AND (
    nombre ILIKE '%paz y bien%'
    OR nombre ILIKE '%hermana clara%'
    OR nombre ILIKE '%sierra luz%'
    OR nombre ILIKE '%hotel sierra%'
  );

-- Verificar resultado:
SELECT
  p.nombre,
  p.station_code,
  p.estado,
  e.nombre AS empresa,
  p.empresa_id
FROM fv_planta p
LEFT JOIN empresas e ON e.id = p.empresa_id
ORDER BY e.nombre NULLS LAST, p.nombre;
