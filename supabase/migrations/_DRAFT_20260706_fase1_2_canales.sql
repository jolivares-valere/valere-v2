-- ============================================================================
-- DRAFT — fase1_2_canales — Consolidación Comerciales / Canales (Tiempo 1)
-- ============================================================================
-- ESTADO: PROPUESTA. **NO EJECUTAR** hasta:
--   (1) veredicto del auditor sobre el bloque auth.users (sus 5 condiciones), y
--   (2) OK de Juan.
-- El nombre lleva prefijo "_DRAFT_" para que NO lo recoja ningún deploy.
--
-- Qué hace, en orden:
--   A. Amplía el CHECK de user_profiles.role para admitir 'channel' (Variante B).
--   B. Crea 7 cuentas-cáscara en auth.users (SIN login) — bloque a auditar.
--   C. Crea 7 perfiles en user_profiles con role='channel', email NULL.
--   D. Re-vincula contratos (210) y empresas (101) de cada canal.
--   E. Recuentos antes/después.
--
-- Reversible: todo lo tocado se identifica por role='channel' (perfiles) y por
-- el external_id 'LV:%' de contratos/empresas. Ver bloque REVERT al final.
--
-- Los 7 canales (bucket ampliado 4->7 por decisión de Juan 2026-07-06):
--   Joaquin Llorente · Jose Ignacio · Herquesa · Damaris
--   Juan Rodriguez · Emilio · Pedro Lanuza (= canal Lanuza, direccion@lanuza.es)
-- ANTONIO -> ya mapeado a Antonio Rodriguez (nada que hacer).
-- RENOVACION / TACITA / null (19 contratos, 27 empresas) -> quedan sin comercial.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- A. Ampliar CHECK de role para admitir 'channel'  (Variante B, recomendada)
--    'channel' queda FUERA de is_staff() y is_manager_or_above() por omisión.
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles DROP CONSTRAINT user_profiles_role_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role = ANY (ARRAY['master','manager','consultant','client','channel']));

-- ---------------------------------------------------------------------------
-- B. Cuentas-cáscara en auth.users  *** BLOQUE A AUDITAR CONDICIÓN POR CONDICIÓN ***
--    Obligatorio por la FK user_profiles.id -> auth.users(id).
--    Garantías de "sin login" propuestas por Cowork (el auditor valida/ajusta):
--      1. banned_until = 'infinity'  -> un usuario baneado NO puede autenticarse.
--      2. encrypted_password = NULL   -> sin credencial de contraseña.
--      3. email = NULL                -> sin login por email ni recuperación posible.
--      4. sin fila en auth.identities -> sin proveedores OAuth/externos.
--      5. is_sso_user = false, is_anonymous = false, aud='authenticated'.
--    Se marca raw_app_meta_data.valere_canal=true para trazabilidad y revert.
-- ---------------------------------------------------------------------------
WITH nuevos(full_name, canal_email_ref) AS (
  VALUES
    ('Joaquin Llorente', NULL),
    ('Jose Ignacio',     NULL),
    ('Herquesa',         NULL),
    ('Damaris',          NULL),
    ('Juan Rodriguez',   NULL),
    ('Emilio',           NULL),
    ('Pedro Lanuza',     'direccion@lanuza.es')  -- ref de contacto, NO se usa para login
)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, banned_until, raw_app_meta_data, raw_user_meta_data,
  is_sso_user, is_anonymous, created_at, updated_at
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated', 'authenticated',
  NULL,                    -- email NULL (condición 3)
  NULL,                    -- sin contraseña (condición 2)
  NULL,
  'infinity',              -- baneado (condición 1)
  jsonb_build_object('provider','none','providers',ARRAY[]::text[],
                     'valere_canal', true, 'canal_contacto', canal_email_ref),
  jsonb_build_object('full_name', full_name),
  false, false,            -- condición 5
  now(), now()
FROM nuevos;

-- ---------------------------------------------------------------------------
-- C. Perfiles en user_profiles (role='channel', email NULL, no aprobado)
-- ---------------------------------------------------------------------------
INSERT INTO public.user_profiles (id, email, full_name, role, status, approved)
SELECT u.id, NULL, (u.raw_user_meta_data->>'full_name'), 'channel', 'inactivo', false
FROM auth.users u
WHERE (u.raw_app_meta_data->>'valere_canal') = 'true'
  AND NOT EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.id = u.id);

-- Mapa auxiliar canal -> profile_id (por full_name), para D.
-- ---------------------------------------------------------------------------
-- D. Re-vinculación de contratos y empresas
--    Canonicalización idéntica a la del inventario.
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE _canal_map ON COMMIT DROP AS
SELECT p.id AS profile_id, p.full_name AS canal
FROM public.user_profiles p WHERE p.role='channel';

-- D.1 contratos (solo los hoy sin comercial que casan con un canal)
WITH lk AS (
  SELECT c.id AS contrato_id,
    CASE
      WHEN upper(trim(s.comercial)) IN ('JOAQUIN LLORENTE','JOAQUIN') THEN 'Joaquin Llorente'
      WHEN upper(trim(s.comercial)) = 'JOSE IGNACIO' THEN 'Jose Ignacio'
      WHEN upper(trim(s.comercial)) = 'HERQUESA' THEN 'Herquesa'
      WHEN upper(trim(s.comercial)) = 'DAMARIS' THEN 'Damaris'
      WHEN upper(trim(s.comercial)) = 'JUAN RODRIGUEZ' THEN 'Juan Rodriguez'
      WHEN upper(trim(s.comercial)) = 'EMILIO' THEN 'Emilio'
      WHEN upper(trim(s.comercial)) IN ('PEDRO LANUZA','LANUZA') THEN 'Pedro Lanuza'
      ELSE NULL
    END AS canal
  FROM staging_fase1_libro s
  JOIN contratos c ON c.external_id='LV:'||s.libro||':'||s.hoja||':'||s.fila
)
UPDATE contratos c
SET comercial_id = m.profile_id, updated_at = now()
FROM lk JOIN _canal_map m ON m.canal = lk.canal
WHERE c.id = lk.contrato_id AND c.comercial_id IS NULL;

-- D.2 empresas (solo NULL y con un único canal; las 27 solo-bandeja NO se tocan)
WITH lk AS (
  SELECT c.empresa_id,
    CASE
      WHEN upper(trim(s.comercial)) IN ('JOAQUIN LLORENTE','JOAQUIN') THEN 'Joaquin Llorente'
      WHEN upper(trim(s.comercial)) = 'JOSE IGNACIO' THEN 'Jose Ignacio'
      WHEN upper(trim(s.comercial)) = 'HERQUESA' THEN 'Herquesa'
      WHEN upper(trim(s.comercial)) = 'DAMARIS' THEN 'Damaris'
      WHEN upper(trim(s.comercial)) = 'JUAN RODRIGUEZ' THEN 'Juan Rodriguez'
      WHEN upper(trim(s.comercial)) = 'EMILIO' THEN 'Emilio'
      WHEN upper(trim(s.comercial)) IN ('PEDRO LANUZA','LANUZA') THEN 'Pedro Lanuza'
      ELSE NULL
    END AS canal
  FROM staging_fase1_libro s
  JOIN contratos c ON c.external_id='LV:'||s.libro||':'||s.hoja||':'||s.fila
),
emp AS (
  SELECT lk.empresa_id, array_agg(DISTINCT lk.canal) FILTER (WHERE lk.canal IS NOT NULL) AS canales
  FROM lk GROUP BY lk.empresa_id
)
UPDATE empresas e
SET comercial_id = m.profile_id, updated_at = now()
FROM emp JOIN _canal_map m ON m.canal = emp.canales[1]
WHERE e.id = emp.empresa_id
  AND e.comercial_id IS NULL
  AND array_length(emp.canales,1) = 1;

-- ---------------------------------------------------------------------------
-- E. Recuentos de control (deben cuadrar con el inventario)
--    contratos esperados: 210  ·  empresas esperadas: 101
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_contratos int; v_empresas int; v_perfiles int;
BEGIN
  SELECT count(*) INTO v_perfiles  FROM user_profiles WHERE role='channel';
  SELECT count(*) INTO v_contratos FROM contratos  c JOIN user_profiles p ON p.id=c.comercial_id AND p.role='channel';
  SELECT count(*) INTO v_empresas  FROM empresas   e JOIN user_profiles p ON p.id=e.comercial_id AND p.role='channel';
  RAISE NOTICE 'perfiles channel=% (esperado 7) · contratos=% (esperado 210) · empresas=% (esperado 101)',
    v_perfiles, v_contratos, v_empresas;
END $$;

COMMIT;

-- ============================================================================
-- REVERT (si el auditor lo pide) — ejecutar por separado:
-- ============================================================================
-- BEGIN;
--   UPDATE contratos SET comercial_id=NULL
--     WHERE comercial_id IN (SELECT id FROM user_profiles WHERE role='channel');
--   UPDATE empresas  SET comercial_id=NULL
--     WHERE comercial_id IN (SELECT id FROM user_profiles WHERE role='channel');
--   DELETE FROM user_profiles WHERE role='channel';
--   DELETE FROM auth.users WHERE (raw_app_meta_data->>'valere_canal')='true';  -- CASCADE limpia perfil
--   -- (opcional) revertir el CHECK a la lista de 4 roles.
-- COMMIT;
