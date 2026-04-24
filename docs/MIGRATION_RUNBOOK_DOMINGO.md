# Runbook migración datos Potencias → CRM (domingo noche)

> **Fecha ejecución**: domingo 2026-04-27 noche (ventana 22:00 - 01:00 aprox.)
> **Operador**: Cowork (Claude) vía Supabase MCP + Juan validando.
> **Ventana de corte**: 1-2h donde Potencias Cloudflare no se debe usar.
> **Rollback**: cambiar env vars Cloudflare Potencias para volver al proyecto Supabase viejo. 15 min.

---

## Pre-requisitos (verificar SÁBADO antes de la noche)

### Usuarios existentes

Antes del domingo, los 3 usuarios Potencias nuevos deben existir en `auth.users` del proyecto CRM:

- Antonio Rodriguez (`arodriguez@valereconsultores.com`)
- Carolina Maciñeiras (`administracion@valereconsultores.com`)
- Julia Ruiz (`soporte@valereconsultores.com`)

**Acción de Juan SÁBADO**:

1. Supabase Dashboard CRM → Authentication → Users → **Invite user** (x3).
2. Introducir los 3 emails.
3. Cada uno recibe magic link → puede entrar cuando quiera. No hace falta que entren antes del domingo.

Alternativa si no tienen email disponible: "Add user" + contraseña temporal, y que la cambien luego.

**Verificación pre-run**:

```sql
SELECT id, email FROM auth.users WHERE email IN (
  'arodriguez@valereconsultores.com',
  'administracion@valereconsultores.com',
  'soporte@valereconsultores.com'
);
-- Debe devolver 3 filas.
```

### Cloudflare Potencias apuntando al CRM

Verificado sábado tras el deploy del agente browser:

- `valere-gestion-potencias.pages.dev` existe.
- Env vars apuntan a CRM unificado (`gtphkowfcuiqbvfkwjxb`).
- Refactor `VITE_GEMINI_API_KEY` → server-side completado.
- Bundle limpio (sin key en JS).

### Snapshot final del viernes

Ver `docs/SNAPSHOT_PRE_UNIFICACION_2026-04-25.md`.

---

## FASE 0 — Ventana de corte (22:00 domingo)

### 0.1 Comunicación al equipo

Mensaje WhatsApp/Slack (Juan):

> **Potencias no disponible de 22:00 a 01:00 hoy** para migración de backend. Volverá en nuevo URL: `valere-gestion-potencias.pages.dev`. Si había algo urgente hoy, hacerlo antes de las 22:00. Gracias.

### 0.2 Snapshot final Potencias (contadores)

Cowork ejecuta contra Potencias:

```sql
-- En alesfvxqtwlrwlmkoosg
SELECT 'clients' as t, count(*) n FROM clients
UNION ALL SELECT 'supplies', count(*) FROM supplies
UNION ALL SELECT 'expedientes', count(*) FROM expedientes
UNION ALL SELECT 'ciclos', count(*) FROM ciclos
UNION ALL SELECT 'power_requests', count(*) FROM power_requests
UNION ALL SELECT 'savings_calculations', count(*) FROM savings_calculations
UNION ALL SELECT 'client_communications', count(*) FROM client_communications
UNION ALL SELECT 'client_documents', count(*) FROM client_documents
UNION ALL SELECT 'expediente_documents', count(*) FROM expediente_documents
UNION ALL SELECT 'status_log', count(*) FROM status_log
UNION ALL SELECT 'alerts', count(*) FROM alerts
UNION ALL SELECT 'email_templates', count(*) FROM email_templates
UNION ALL SELECT 'comercializadoras', count(*) FROM comercializadoras
UNION ALL SELECT 'comercializadora_docs', count(*) FROM comercializadora_docs
UNION ALL SELECT 'documentacion', count(*) FROM documentacion
UNION ALL SELECT 'regulated_rates', count(*) FROM regulated_rates
UNION ALL SELECT 'profiles', count(*) FROM profiles
ORDER BY t;
```

Comparar con snapshot viernes. Anotar diferencias (datos creados en sábado).

---

## FASE 1 — Migrar users, retailers, precios BOE (catálogos, 15 min)

### 1.1 user_profiles — 3 nuevos + legacy mapping

**Pre-requisito**: auth.users CRM tiene las 3 filas nuevas (verificado pre-run).

```sql
-- En CRM (gtphkowfcuiqbvfkwjxb)
-- Obtener IDs reales de auth.users para los 3 nuevos
SELECT id, email FROM auth.users WHERE email IN (
  'arodriguez@valereconsultores.com',
  'administracion@valereconsultores.com',
  'soporte@valereconsultores.com'
);
```

Con los IDs obtenidos, insertar sus user_profiles:

```sql
-- Antonio Rodriguez
INSERT INTO public.user_profiles (id, email, full_name, nombre, apellidos, role, status, approved, legacy_potencia_id)
VALUES (
  '<auth_user_id_antonio>',
  'arodriguez@valereconsultores.com',
  'Antonio Rodriguez',
  'Antonio',
  'Rodriguez',
  'master',  -- admin en Potencias → master en CRM
  'approved',
  true,
  '8de092df-95bf-4652-9fe6-c50d69da85cb'
) ON CONFLICT (id) DO UPDATE SET legacy_potencia_id = EXCLUDED.legacy_potencia_id;

-- Carolina Maciñeiras
INSERT INTO public.user_profiles (id, email, full_name, nombre, apellidos, role, status, approved, legacy_potencia_id)
VALUES (
  '<auth_user_id_carolina>',
  'administracion@valereconsultores.com',
  'Carolina Maciñeiras',
  'Carolina',
  'Maciñeiras',
  'master',
  'approved',
  true,
  'df8638f2-57b1-4417-96b8-60cca089f02c'
) ON CONFLICT (id) DO UPDATE SET legacy_potencia_id = EXCLUDED.legacy_potencia_id;

-- Julia Ruiz
INSERT INTO public.user_profiles (id, email, full_name, nombre, apellidos, role, status, approved, legacy_potencia_id)
VALUES (
  '<auth_user_id_julia>',
  'soporte@valereconsultores.com',
  'Julia Ruiz',
  'Julia',
  'Ruiz',
  'comercial',  -- gestor en Potencias → comercial en CRM (ajustable después)
  'approved',
  true,
  '3497758b-96fd-4780-aa60-92665b0cd418'
) ON CONFLICT (id) DO UPDATE SET legacy_potencia_id = EXCLUDED.legacy_potencia_id;

-- Juan ya tiene legacy_potencia_id asignado (hecho en FASE B2).
```

**Verificación**:

```sql
SELECT id, email, role, legacy_potencia_id FROM public.user_profiles ORDER BY email;
-- Debe devolver 4 filas con legacy_potencia_id no-null (excepto si hay otros CRM users sin Potencias).
```

### 1.2 Retailers / comercializadoras — merge por nombre

```sql
-- En CRM
-- Obtener las 2 comercializadoras de Potencias vía execute_sql en alesfvxqtwlrwlmkoosg
SELECT id, nombre, activa, created_at FROM public.comercializadoras;
```

Insertar en retailers si no existe nombre normalizado equivalente:

```sql
-- Script idempotente:
WITH comercializadoras_potencia AS (
  -- Sustituir por los valores reales obtenidos
  SELECT
    '<uuid_1>'::uuid AS legacy_id,
    'NOMBRE_1' AS nombre,
    public.normalizar_nombre_retailer('NOMBRE_1') AS nombre_norm,
    true AS activa,
    TIMESTAMPTZ '2026-XX-XX' AS created_at
  UNION ALL
  SELECT '<uuid_2>'::uuid, 'NOMBRE_2', public.normalizar_nombre_retailer('NOMBRE_2'), true, '2026-XX-XX'
)
INSERT INTO public.retailers (id, name, nombre_normalizado, activa, legacy_potencia_com_id, created_at)
SELECT
  gen_random_uuid(),
  cp.nombre,
  cp.nombre_norm,
  cp.activa,
  cp.legacy_id,
  cp.created_at
FROM comercializadoras_potencia cp
WHERE NOT EXISTS (
  SELECT 1 FROM public.retailers r WHERE r.nombre_normalizado = cp.nombre_norm
);

-- Para los que SÍ coinciden (mismo nombre en ambos): actualizar legacy_potencia_com_id en la fila CRM
UPDATE public.retailers r
SET legacy_potencia_com_id = cp.legacy_id
FROM (
  SELECT '<uuid_1>'::uuid AS legacy_id, public.normalizar_nombre_retailer('NOMBRE_1') AS nombre_norm
  UNION ALL SELECT '<uuid_2>'::uuid, public.normalizar_nombre_retailer('NOMBRE_2')
) cp
WHERE r.nombre_normalizado = cp.nombre_norm
  AND r.legacy_potencia_com_id IS NULL;
```

**Verificación**:

```sql
SELECT count(*) FROM public.retailers;  -- esperado: 6-8 (6 existentes + hasta 2 nuevas según dedup)
SELECT count(*) FROM public.retailers WHERE legacy_potencia_com_id IS NOT NULL;  -- esperado: 2
```

### 1.3 Precios BOE — merge regulated_rates

Obtener 18 filas de Potencias regulated_rates:

```sql
-- En alesfvxqtwlrwlmkoosg
SELECT id, period, tariff_type, rate_eur_kw_day, valid_from, valid_to, updated_at
FROM public.regulated_rates;
```

Insertar en CRM si no existe combinación (period, tariff_type, valid_from):

```sql
-- En CRM
-- Nota: el schema CRM actual de boe_regulated_prices no tiene valid_from/valid_to
-- Se añadirán si hacen falta, pero por ahora solo fusionamos lo imprescindible:
-- period, tariff_type, price

INSERT INTO public.boe_regulated_prices (id, period, tariff, price, created_at)
SELECT
  gen_random_uuid(),
  p.period,
  p.tariff_type,
  p.rate_eur_kw_day,
  now()
FROM (
  -- Valores de la query extractora anterior
  VALUES
    ('P1', '2.0TD', 0.1234, '2025-01-01'::date),
    -- ...
) AS p(period, tariff_type, rate_eur_kw_day, valid_from)
WHERE NOT EXISTS (
  SELECT 1 FROM public.boe_regulated_prices b
  WHERE b.period = p.period AND b.tariff = p.tariff_type
);
```

---

## FASE 2 — Migrar empresas con dedupe CIF (15 min)

### 2.1 Obtener clients de Potencias

```sql
-- En alesfvxqtwlrwlmkoosg
SELECT
  id,
  public.normalizar_cif_nif(cif) AS cif_norm,  -- usar función si existe, o inline
  nombre_fiscal,
  cif,
  persona_contacto,
  email_contacto,
  telefono,
  direccion_fiscal,
  codigo_postal,
  ciudad,
  notas,
  activo,
  gestor_id,        -- → comercial_id canonical
  asesor_id,
  created_by,
  created_at
FROM public.clients;
```

Si la función `normalizar_cif_nif` no existe en Potencias, calcular inline:
`UPPER(REGEXP_REPLACE(COALESCE(cif, ''), '[\s\-\.]', '', 'g'))`.

### 2.2 Asegurar función normalizar_cif en CRM

```sql
-- En CRM
CREATE OR REPLACE FUNCTION public.normalizar_cif(input text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT upper(regexp_replace(coalesce(input, ''), '[\s\-\.]', '', 'g'));
$$;
```

### 2.3 Insertar clients nuevos (dedup por CIF normalizado)

```sql
-- Para cada fila de clients_potencia, INSERT si no existe en empresas con mismo CIF normalizado.
-- Pattern (usando un VALUES temporal con los datos extraídos):

INSERT INTO public.empresas (
  id, nif, nombre, persona_contacto, email_principal,
  telefono_principal, direccion, cp, ciudad, notas, activo,
  comercial_id, asesor_id, legacy_potencia_id, created_by, created_at
)
SELECT
  gen_random_uuid(),
  cp.cif,
  cp.nombre_fiscal,
  cp.persona_contacto,
  cp.email_contacto,
  cp.telefono,
  cp.direccion_fiscal,
  cp.codigo_postal,
  cp.ciudad,
  cp.notas,
  cp.activo,
  cp.gestor_id_canonical,    -- ya re-mapeado al UUID del CRM
  cp.asesor_id_canonical,
  cp.legacy_id,
  cp.created_by_canonical,
  cp.created_at
FROM (
  VALUES
    -- Lista de valores extraídos de Potencias
    -- ('legacy_uuid', 'B12345678', 'NOMBRE SL', ...)
) AS cp(legacy_id, cif, nombre_fiscal, persona_contacto, email_contacto,
        telefono, direccion_fiscal, codigo_postal, ciudad, notas, activo,
        gestor_id_canonical, asesor_id_canonical, created_by_canonical, created_at)
WHERE NOT EXISTS (
  SELECT 1 FROM public.empresas e
  WHERE public.normalizar_cif(e.nif) = public.normalizar_cif(cp.cif)
    AND public.normalizar_cif(cp.cif) != ''
);

-- Actualizar legacy_potencia_id en empresas CRM que ya existen (coincidencia CIF)
UPDATE public.empresas e
SET legacy_potencia_id = cp.legacy_id
FROM (
  VALUES -- mismos valores
) AS cp(legacy_id, cif, ...)
WHERE public.normalizar_cif(e.nif) = public.normalizar_cif(cp.cif)
  AND e.legacy_potencia_id IS NULL;
```

### 2.4 Crear tabla temporal de mapping empresa

```sql
-- En CRM
CREATE TEMP TABLE _migration_empresa_map AS
SELECT
  legacy_potencia_id,
  id AS canonical_id
FROM public.empresas
WHERE legacy_potencia_id IS NOT NULL;

-- Verificar:
SELECT count(*) FROM _migration_empresa_map;  -- debería ser ~30 (clients Potencias)
```

---

## FASE 3 — Migrar CUPS con dedupe código (15 min)

### 3.1 Obtener supplies de Potencias (75 filas)

```sql
-- En alesfvxqtwlrwlmkoosg
SELECT
  id, cups, client_id, activo, channel, ciudad_suministro,
  comercializadora, comercializadora_id, denominacion,
  direccion_suministro, distribuidora,
  p1_kw, p2_kw, p3_kw, p4_kw, p5_kw, p6_kw,
  potencia_maxima_disponible, tariff_type, tension_kv,
  notas, created_by, created_at
FROM public.supplies;
```

### 3.2 Insert con dedupe por codigo_cups normalizado

```sql
-- En CRM
INSERT INTO public.cups (
  id, codigo_cups, empresa_id, estado, channel,
  ciudad_suministro, comercializadora_actual,
  denominacion, direccion_suministro, distribuidor,
  p1_kw, p2_kw, p3_kw, p4_kw, p5_kw, p6_kw,
  potencia_maxima_disponible, tarifa_acceso, tension_kv,
  legacy_potencia_id, created_at
)
SELECT
  gen_random_uuid(),
  upper(trim(s.cups)),
  em.canonical_id,          -- re-mapeo empresa
  CASE WHEN s.activo THEN 'activo' ELSE 'baja' END,
  s.channel,
  s.ciudad_suministro,
  s.comercializadora,
  s.denominacion,
  s.direccion_suministro,
  s.distribuidora,
  s.p1_kw, s.p2_kw, s.p3_kw, s.p4_kw, s.p5_kw, s.p6_kw,
  s.potencia_maxima_disponible,
  s.tariff_type,
  s.tension_kv,
  s.legacy_id,
  s.created_at
FROM (
  VALUES
    -- supplies de Potencias
) AS s(legacy_id, cups, legacy_client_id, activo, channel, ciudad_suministro,
       comercializadora, denominacion, direccion_suministro, distribuidora,
       p1_kw, p2_kw, p3_kw, p4_kw, p5_kw, p6_kw,
       potencia_maxima_disponible, tariff_type, tension_kv, created_at)
JOIN _migration_empresa_map em ON em.legacy_potencia_id = s.legacy_client_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.cups c WHERE upper(trim(c.codigo_cups)) = upper(trim(s.cups))
);

-- Mapping CUPS
CREATE TEMP TABLE _migration_cups_map AS
SELECT legacy_potencia_id, id AS canonical_id
FROM public.cups
WHERE legacy_potencia_id IS NOT NULL;

SELECT count(*) FROM _migration_cups_map;  -- esperado: 75 (todos nuevos)
```

---

## FASE 4 — Entidades dependientes (45 min)

### 4.1 Mapping usuarios

```sql
CREATE TEMP TABLE _migration_user_map AS
SELECT legacy_potencia_id, id AS canonical_id
FROM public.user_profiles
WHERE legacy_potencia_id IS NOT NULL;
```

### 4.2 Expedientes (41)

```sql
-- Extracción (Potencias):
SELECT id, client_id, supply_id, anio, estado, tipo_normativa,
  ciclos_realizados, max_ciclos_permitidos, notas,
  created_by, created_at, updated_at
FROM public.expedientes;

-- Insert (CRM):
INSERT INTO public.expedientes (
  id, empresa_id, cups_id, anio, estado, tipo_normativa,
  ciclos_realizados, max_ciclos_permitidos, notas,
  legacy_potencia_id, created_by, created_at, updated_at
)
SELECT
  gen_random_uuid(), em.canonical_id, cm.canonical_id,
  e.anio, e.estado, e.tipo_normativa,
  e.ciclos_realizados, e.max_ciclos_permitidos, e.notas,
  e.legacy_id,
  um.canonical_id,
  e.created_at, e.updated_at
FROM (VALUES -- expedientes Potencias) AS e(legacy_id, legacy_client, legacy_supply, anio, estado, ...)
JOIN _migration_empresa_map em ON em.legacy_potencia_id = e.legacy_client
JOIN _migration_cups_map cm ON cm.legacy_potencia_id = e.legacy_supply
LEFT JOIN _migration_user_map um ON um.legacy_potencia_id = e.created_by;

CREATE TEMP TABLE _migration_expediente_map AS
SELECT legacy_potencia_id, id AS canonical_id FROM public.expedientes WHERE legacy_potencia_id IS NOT NULL;
```

### 4.3 Ciclos (41), FK a expediente

Pattern idéntico con `_migration_expediente_map`.

### 4.4 Solicitudes_potencia (power_requests → 41)

Pattern idéntico con `_migration_ciclo_map`, `_migration_expediente_map`, `_migration_cups_map`, `_migration_empresa_map`.

### 4.5 Savings_calculations (41)

Pattern idéntico con `_migration_solicitudes_map`, `_migration_ciclo_map`.

### 4.6 Comunicaciones_cliente (31 from client_communications)

Pattern con empresa_map, ciclo_map, expediente_map, user_map.

### 4.7 Status_log (91)

Pattern con expediente_map, ciclo_map, solicitudes_map, user_map.

### 4.8 Documentos — consolidación 3 tablas → documentos

```sql
-- Fusionar client_documents (70) + expediente_documents (27) + documentacion (1) en documentos

INSERT INTO public.documentos (
  id, entidad_tipo, entidad_id, empresa_id, cups_id, expediente_id, ciclo_id,
  nombre, nombre_archivo, nombre_original, tipo, descripcion, mime_type,
  tamano_bytes, ruta_storage, metadata, notas, legacy_source, legacy_potencia_id,
  subido_por, created_at
)
-- client_documents → entidad_tipo='empresa', empresa_id=canonical
SELECT
  gen_random_uuid(), 'empresa', em.canonical_id, em.canonical_id, cm.canonical_id, exm.canonical_id, clm.canonical_id,
  cd.nombre, cd.nombre_archivo, cd.nombre_original, cd.tipo, cd.descripcion, cd.mime_type,
  cd.tamano_bytes, cd.storage_path, cd.metadata, NULL, 'client_documents', cd.legacy_id,
  um.canonical_id, cd.created_at
FROM (VALUES ...) AS cd(legacy_id, legacy_client, legacy_supply, legacy_expediente, legacy_ciclo, ...)
JOIN _migration_empresa_map em ON em.legacy_potencia_id = cd.legacy_client
LEFT JOIN _migration_cups_map cm ON cm.legacy_potencia_id = cd.legacy_supply
-- ... etc
-- UNION ALL con expediente_documents y documentacion
;
```

### 4.9 Email_templates, excel_import_templates, comercializadora_docs

Copias directas con FK re-mapeadas.

---

## FASE 5 — Verificación integridad (30 min)

```sql
-- 1. Contadores esperados
SELECT 'empresas' as tabla, count(*) as filas FROM public.empresas
UNION ALL SELECT 'cups', count(*) FROM public.cups
UNION ALL SELECT 'expedientes', count(*) FROM public.expedientes
UNION ALL SELECT 'ciclos', count(*) FROM public.ciclos
UNION ALL SELECT 'solicitudes_potencia', count(*) FROM public.solicitudes_potencia
UNION ALL SELECT 'savings_calculations', count(*) FROM public.savings_calculations
UNION ALL SELECT 'comunicaciones_cliente', count(*) FROM public.comunicaciones_cliente
UNION ALL SELECT 'status_log', count(*) FROM public.status_log
UNION ALL SELECT 'documentos', count(*) FROM public.documentos
ORDER BY tabla;

-- Expectativas aprox:
-- empresas: 30-33 (según dedup)
-- cups: 75-76
-- expedientes: 41
-- ciclos: 41
-- solicitudes_potencia: 41
-- savings_calculations: 41
-- comunicaciones_cliente: 31
-- status_log: 91
-- documentos: 98

-- 2. Duplicados por CIF (debe ser 0)
SELECT cif_norm, count(*) FROM (
  SELECT public.normalizar_cif(nif) cif_norm FROM public.empresas WHERE nif IS NOT NULL AND nif != ''
) s GROUP BY cif_norm HAVING count(*) > 1;

-- 3. Duplicados CUPS (debe ser 0)
SELECT upper(trim(codigo_cups)), count(*) FROM public.cups
GROUP BY upper(trim(codigo_cups)) HAVING count(*) > 1;

-- 4. Orphans (debe ser 0)
SELECT count(*) FROM public.expedientes ex
WHERE NOT EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = ex.empresa_id);

SELECT count(*) FROM public.expedientes ex
WHERE NOT EXISTS (SELECT 1 FROM public.cups c WHERE c.id = ex.cups_id);

-- 5. Top 5 empresas con más expedientes (sanity check)
SELECT e.nombre, count(ex.id) expedientes
FROM public.empresas e
JOIN public.expedientes ex ON ex.empresa_id = e.id
GROUP BY e.nombre
ORDER BY count(ex.id) DESC
LIMIT 5;
```

---

## FASE 6 — Switch (15 min)

### 6.1 Verificación manual con login

Juan entra a `valere-gestion-potencias.pages.dev` con su cuenta:

- Login exitoso.
- Dashboard muestra expedientes.
- Click en un expediente → muestra datos.
- Click en un cliente → muestra sus CUPS y expedientes.

Si algo no se ve o hay errores: rollback (sección final).

### 6.2 Avisar al equipo

```
✅ Potencias operativo en nuevo URL.

Nuevo URL (guardar): https://valere-gestion-potencias.pages.dev
Email para login: el mismo de siempre.

Antonio, Carolina, Julia: os llegará un email para establecer contraseña si no 
os ha llegado ya. Revisad SPAM.

Si veis algo raro o falta algún dato, escribidme ya.
```

---

## ROLLBACK — si algo falla

**Disparadores**:
- Verificación falla (contadores fuera de rango, orphans, etc.).
- Login no funciona.
- Datos esperados no aparecen.
- Cualquier error inesperado.

**Pasos rollback (~15 min)**:

1. En Cloudflare Pages → valere-gestion-potencias → Settings → Environment Variables.
2. Cambiar `VITE_SUPABASE_URL` al proyecto viejo (`https://alesfvxqtwlrwlmkoosg.supabase.co`).
3. Cambiar `VITE_SUPABASE_ANON_KEY` a la anon key del proyecto viejo.
4. Save → redeploy (puede tardar 1-2 min).
5. Verificar login y datos en el URL → vuelve al estado pre-migración.
6. Proyecto Supabase viejo intacto — no se ha tocado nada.
7. Compañeros pueden seguir trabajando con Potencias como si nada hubiera pasado.
8. Cowork analiza qué falló en migración y se vuelve a intentar otro día.

---

## Checklist de ejecución

- [ ] **Pre-sábado**: Juan invita 3 usuarios nuevos en Supabase CRM admin.
- [ ] **Sábado**: agente browser sube Potencias a Cloudflare + refactor Gemini.
- [ ] **Sábado tarde**: Juan verifica que Cloudflare URL responde y anuncia ventana.
- [ ] **Domingo 22:00**: Juan envía mensaje ventana corte.
- [ ] **22:15**: Cowork snapshot final Potencias.
- [ ] **22:30-23:30**: Cowork ejecuta migración en fases 1-4.
- [ ] **23:30**: Verificación completa (fase 5).
- [ ] **00:00**: Juan verifica login + UX básica.
- [ ] **00:30**: Comunicación al equipo, nuevo URL operativo.
- [ ] **Lunes mañana**: compañeros trabajando normalmente.

## Post-migración (lunes+)

- **Lunes**: monitor Supabase logs + advisors.
- **Lunes-miércoles**: cualquier incidencia, investigar rápido.
- **Viernes siguiente**: si todo estable, borrar proyecto Supabase viejo `alesfvxqtwlrwlmkoosg` y cancelar Vercel Potencias.
- **Lunes +2 semanas**: hacer la migración definitiva del código a nomenclatura canónica (renombrar columnas, etc.) — refactor limpio que no toca datos.
