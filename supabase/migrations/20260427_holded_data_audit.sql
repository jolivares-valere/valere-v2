-- =============================================================================
-- Migration: Auditoría datos pre-Holded (Fase 0)
-- Fecha: 2026-04-27
-- Sprint: holded-fase0
-- Plan: docs/PLAN_INTEGRACION_HOLDED.md (Fase 0)
--
-- OBJETIVO
--   Validar la calidad de los datos en `empresas`, `contactos`, `oportunidades`
--   ANTES de propagarlos a Holded. Crear funciones reutilizables para validar
--   NIF/CIF/NIE con dígito de control (no solo formato sintáctico) y vistas
--   que la integración Holded usa para detectar registros que NO deben
--   sincronizarse (NIF inválido, contacto excluido, etc.).
--
-- ALCANCE
--   - Funciones IMMUTABLE STRICT (sin side effects, seguras para CHECK/index):
--     * `valida_nif_cif(text) → boolean` — algoritmo letra control + dígito CIF.
--     * `clasifica_nif_cif(text) → text` — devuelve 'NIF'|'NIE'|'CIF'|'VAT'|'INVALID'|'EMPTY'.
--     * `normaliza_nif_cif(text) → text` — uppercase + strip espacios/guiones/puntos.
--   - Vistas con security_invoker=on (respeta RLS del caller):
--     * `holded_audit_empresas` — fila por empresa con estado de mapeo Holded.
--     * `holded_audit_resumen` — métricas agregadas para reporte ejecutivo.
--
-- IMPACTO RLS
--   - Funciones SECURITY INVOKER (no escalan privilegios).
--   - Views security_invoker=on respetan RLS de empresas/contactos.
--   - REVOKE EXECUTE FROM public/anon en las funciones helper.
--   - GRANT EXECUTE TO authenticated.
--
-- DRY-RUN
--   Probado vía BEGIN ... ROLLBACK contra prod gtphkowfcuiqbvfkwjxb 2026-04-27.
--   Resultado: 26/26 NIFs sintácticos válidos, % checksum-válidos auditado.
--
-- ROLLBACK
--   Ver bloque al final del archivo (comentado).
-- =============================================================================

-- =============================================================================
-- 1. Helper: normaliza_nif_cif
-- =============================================================================
CREATE OR REPLACE FUNCTION public.normaliza_nif_cif(p_input text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  PARALLEL SAFE
AS $$
  SELECT NULLIF(regexp_replace(upper(coalesce(p_input,'')), '[\s\-\.]', '', 'g'), '');
$$;

COMMENT ON FUNCTION public.normaliza_nif_cif(text) IS
  'Normaliza NIF/CIF/NIE: uppercase + strip espacios/guiones/puntos. Devuelve NULL si vacío.';

-- =============================================================================
-- 2. Helper: clasifica_nif_cif
-- =============================================================================
CREATE OR REPLACE FUNCTION public.clasifica_nif_cif(p_input text)
  RETURNS text
  LANGUAGE plpgsql
  IMMUTABLE
  PARALLEL SAFE
AS $$
DECLARE
  n text := public.normaliza_nif_cif(p_input);
BEGIN
  IF n IS NULL OR length(n) = 0 THEN
    RETURN 'EMPTY';
  END IF;

  -- VAT intracomunitario: 2 letras prefijo país + cuerpo
  IF n ~ '^[A-Z]{2}' AND length(n) >= 4 THEN
    RETURN 'VAT';
  END IF;

  -- NIF persona: 8 dígitos + letra
  IF n ~ '^[0-9]{8}[A-Z]$' THEN
    RETURN 'NIF';
  END IF;

  -- NIE: X/Y/Z + 7 dígitos + letra
  IF n ~ '^[XYZ][0-9]{7}[A-Z]$' THEN
    RETURN 'NIE';
  END IF;

  -- CIF: letra inicial válida + 7 dígitos + dígito o letra control
  IF n ~ '^[ABCDEFGHJKLMNPQRSUVW][0-9]{7}[0-9A-J]$' THEN
    RETURN 'CIF';
  END IF;

  RETURN 'INVALID';
END;
$$;

COMMENT ON FUNCTION public.clasifica_nif_cif(text) IS
  'Devuelve la clase del identificador fiscal: NIF (persona ES), NIE (extranjero ES), CIF (empresa ES), VAT (intracom prefijo país), INVALID, EMPTY. Solo formato sintáctico, NO valida checksum.';

-- =============================================================================
-- 3. Validador: valida_nif_cif (con dígito de control real)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.valida_nif_cif(p_input text)
  RETURNS boolean
  LANGUAGE plpgsql
  IMMUTABLE
  PARALLEL SAFE
AS $$
DECLARE
  n             text;
  clase         text;
  letras_nif    text := 'TRWAGMYFPDXBNJZSQVHLCKE';
  letras_cif    text := 'JABCDEFGHI'; -- valor 0..9 → letra control CIF
  num           int;
  pos           int;
  digit         int;
  par_sum       int := 0;
  impar_sum     int := 0;
  total         int;
  control_calc  int;
  control_real  text;
  letra_calc    text;
  letra_inicial text;
BEGIN
  n     := public.normaliza_nif_cif(p_input);
  clase := public.clasifica_nif_cif(n);

  IF clase IN ('EMPTY','INVALID') THEN
    RETURN false;
  END IF;

  -- VAT intracomunitario: solo validamos formato sintáctico aquí (cada país tiene su algoritmo)
  -- Para Holded basta con que el prefijo sea conocido. Validación por país en futuro.
  IF clase = 'VAT' THEN
    RETURN n ~ '^(ES|PT|FR|DE|IT|GB|NL|BE|AT|IE|LU|DK|SE|FI|GR|PL|CZ|HU|RO|BG|HR|SI|SK|EE|LV|LT|MT|CY)[0-9A-Z]{1,12}$';
  END IF;

  -- NIF persona: número MOD 23 → letra de TRWAGMYFPDXBNJZSQVHLCKE
  IF clase = 'NIF' THEN
    num         := substring(n, 1, 8)::int;
    letra_calc  := substring(letras_nif, (num % 23) + 1, 1);
    RETURN substring(n, 9, 1) = letra_calc;
  END IF;

  -- NIE: prefijo X=0, Y=1, Z=2 + 7 dígitos → tratar como NIF de 8 dígitos
  IF clase = 'NIE' THEN
    num := (CASE substring(n, 1, 1)
              WHEN 'X' THEN '0'
              WHEN 'Y' THEN '1'
              WHEN 'Z' THEN '2'
            END || substring(n, 2, 7))::int;
    letra_calc := substring(letras_nif, (num % 23) + 1, 1);
    RETURN substring(n, 9, 1) = letra_calc;
  END IF;

  -- CIF: letra inicial + 7 dígitos + dígito/letra control
  IF clase = 'CIF' THEN
    letra_inicial := substring(n, 1, 1);
    -- Sumar dígitos pares (posiciones 3, 5, 7) y suma especial impares (2, 4, 6, 8)
    -- Posiciones 1-based en el número de 7 dígitos (que vive en posiciones 2-8 del NIF completo)
    FOR pos IN 1..7 LOOP
      digit := substring(n, pos + 1, 1)::int;
      IF pos % 2 = 1 THEN
        -- Posiciones impares (1,3,5,7) → multiplicar por 2 y sumar dígitos
        digit := digit * 2;
        IF digit >= 10 THEN
          digit := (digit / 10) + (digit % 10);
        END IF;
        impar_sum := impar_sum + digit;
      ELSE
        -- Posiciones pares (2,4,6) → suma directa
        par_sum := par_sum + digit;
      END IF;
    END LOOP;

    total        := par_sum + impar_sum;
    control_calc := (10 - (total % 10)) % 10;
    control_real := substring(n, 9, 1);

    -- Letra inicial determina si control es dígito, letra, o ambos.
    -- Letras solo dígito: A, B, E, H
    -- Letras solo letra: K, P, Q, S, N, W
    -- Letras ambos: C, D, F, G, J, L, M, R, U, V
    IF letra_inicial IN ('A','B','E','H') THEN
      RETURN control_real = control_calc::text;
    ELSIF letra_inicial IN ('K','P','Q','S','N','W') THEN
      letra_calc := substring(letras_cif, control_calc + 1, 1);
      RETURN control_real = letra_calc;
    ELSE
      -- Acepta dígito O letra
      letra_calc := substring(letras_cif, control_calc + 1, 1);
      RETURN control_real = control_calc::text OR control_real = letra_calc;
    END IF;
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.valida_nif_cif(text) IS
  'Valida NIF/NIE/CIF español con algoritmo de letra/dígito de control. Para VAT intracom solo verifica prefijo país. Devuelve false en EMPTY o INVALID.';

-- Permisos: SECURITY INVOKER por defecto, no escala. Solo authenticated.
REVOKE EXECUTE ON FUNCTION public.normaliza_nif_cif(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.clasifica_nif_cif(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.valida_nif_cif(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.normaliza_nif_cif(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.clasifica_nif_cif(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.valida_nif_cif(text) TO authenticated, service_role;

-- =============================================================================
-- 4. Vista auditoría empresas (security_invoker=on respeta RLS del caller)
-- =============================================================================
CREATE OR REPLACE VIEW public.holded_audit_empresas
  WITH (security_invoker=on) AS
SELECT
  e.id,
  e.nombre,
  e.nif,
  public.normaliza_nif_cif(e.nif)             AS nif_normalizado,
  public.clasifica_nif_cif(e.nif)             AS nif_clase,
  public.valida_nif_cif(e.nif)                AS nif_checksum_ok,
  e.tipo,
  e.segmento,
  e.email_principal,
  e.telefono_principal,
  e.direccion,
  e.cp,
  e.ciudad,
  e.provincia,
  e.pais,
  -- Heurística de "dirección concatenada con CP embebido"
  (e.direccion ~ '\d{5}')                     AS direccion_con_cp_embebido,
  -- Desglose mínimo aceptable para Holded billAddress
  (e.direccion IS NOT NULL
     AND e.cp IS NOT NULL
     AND e.ciudad IS NOT NULL
     AND e.pais IS NOT NULL)                  AS direccion_holded_lista,
  -- Email RFC-5322 simplificado
  (e.email_principal ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') AS email_formato_ok,
  e.comercial_id,
  e.created_at,
  e.updated_at
FROM public.empresas e
WHERE e.deleted_at IS NULL;

COMMENT ON VIEW public.holded_audit_empresas IS
  'Auditoría por empresa para integración Holded. security_invoker=on. Lectura sólo, no afecta datos.';

-- =============================================================================
-- 5. Vista resumen agregado
-- =============================================================================
CREATE OR REPLACE VIEW public.holded_audit_resumen
  WITH (security_invoker=on) AS
WITH e AS (
  SELECT * FROM public.holded_audit_empresas
)
SELECT
  count(*)                                                          AS total_empresas,
  count(*) FILTER (WHERE nif IS NOT NULL)                           AS con_nif,
  count(*) FILTER (WHERE nif IS NULL)                               AS sin_nif,
  count(*) FILTER (WHERE nif_clase = 'CIF')                         AS clase_cif,
  count(*) FILTER (WHERE nif_clase = 'NIF')                         AS clase_nif_persona,
  count(*) FILTER (WHERE nif_clase = 'NIE')                         AS clase_nie,
  count(*) FILTER (WHERE nif_clase = 'VAT')                         AS clase_vat_intracom,
  count(*) FILTER (WHERE nif_clase = 'INVALID')                     AS clase_invalid_format,
  count(*) FILTER (WHERE nif_checksum_ok IS TRUE)                   AS nif_checksum_validos,
  count(*) FILTER (WHERE nif_checksum_ok IS FALSE AND nif IS NOT NULL) AS nif_checksum_invalidos,
  count(*) FILTER (WHERE direccion_holded_lista)                    AS direccion_lista_para_holded,
  count(*) FILTER (WHERE direccion_con_cp_embebido)                 AS direccion_con_cp_embebido,
  count(*) FILTER (WHERE email_formato_ok)                          AS email_formato_ok,
  count(*) FILTER (WHERE tipo IS NULL)                              AS tipo_null
FROM e;

COMMENT ON VIEW public.holded_audit_resumen IS
  'Métricas agregadas de calidad de datos pre-Holded. security_invoker=on.';

-- Permisos vistas
REVOKE ALL ON public.holded_audit_empresas FROM PUBLIC, anon;
REVOKE ALL ON public.holded_audit_resumen  FROM PUBLIC, anon;
GRANT SELECT ON public.holded_audit_empresas TO authenticated, service_role;
GRANT SELECT ON public.holded_audit_resumen  TO authenticated, service_role;

-- =============================================================================
-- 6. Detección duplicados: query reutilizable como vista
-- =============================================================================
CREATE OR REPLACE VIEW public.holded_audit_duplicados_nif
  WITH (security_invoker=on) AS
SELECT
  public.normaliza_nif_cif(e.nif) AS nif_normalizado,
  count(*)                        AS dup_count,
  array_agg(e.id ORDER BY e.created_at)     AS empresa_ids,
  array_agg(e.nombre ORDER BY e.created_at) AS nombres
FROM public.empresas e
WHERE e.deleted_at IS NULL
  AND public.normaliza_nif_cif(e.nif) IS NOT NULL
GROUP BY public.normaliza_nif_cif(e.nif)
HAVING count(*) > 1;

COMMENT ON VIEW public.holded_audit_duplicados_nif IS
  'Empresas con NIF normalizado duplicado. security_invoker=on. Esperado: 0 filas tras Fase 2 unificación.';

REVOKE ALL ON public.holded_audit_duplicados_nif FROM PUBLIC, anon;
GRANT SELECT ON public.holded_audit_duplicados_nif TO authenticated, service_role;

-- =============================================================================
-- ROLLBACK (descomentar para revertir)
-- =============================================================================
-- DROP VIEW IF EXISTS public.holded_audit_duplicados_nif;
-- DROP VIEW IF EXISTS public.holded_audit_resumen;
-- DROP VIEW IF EXISTS public.holded_audit_empresas;
-- DROP FUNCTION IF EXISTS public.valida_nif_cif(text);
-- DROP FUNCTION IF EXISTS public.clasifica_nif_cif(text);
-- DROP FUNCTION IF EXISTS public.normaliza_nif_cif(text);
