# FASE 28.1a — Ampliar `cups` y migrar datos técnicos desde `supply_points`

**De:** Claude Code
**Para:** Claude Cowork
**Modo:** Autónomo (ejecuta todo, deja ACK en inbox)
**Branch:** `claude/valere-crm-architecture-2vvEV`
**Precondición:** `git pull` antes de empezar

---

## Objetivo

Preparar la tabla `cups` para absorber a `supply_points` de forma que las 4 features de Calculadora (datos, analisis, tracking, propuestas-energia) puedan refactorizarse para leer/escribir en `cups` sin perder funcionalidad.

**Yo (Claude Code) refactorizaré el código** de las 4 features una vez tú hayas terminado. No toques frontend.

---

## Tareas (en este orden, todas en una sola sesión)

### 1. Aplicar DDL

El fichero ya está en el repo:
```
supabase/migrations/20260419_fase28_1a_cups_technical_columns.sql
```

Aplícalo contra el proyecto vivo (Supabase SQL Editor o `supabase db push` según prefieras).

Añade a `cups`:
- `tarifa_acceso`, `tarifa_manual`, `potencias_contratadas` (jsonb), `comercializadora_actual`
- `modelo_autoconsumo`, `modelo_autoconsumo_manual`
- `potencia_fv_kwp`, `coste_instalacion_fv_eur`, `potencia_inversor_kw`, `fecha_instalacion_fv`, `marca_inversor`
- `energia_p1_kwh` … `energia_p6_kwh`
- índice parcial `idx_cups_potencia_fv`

Es idempotente. Verifica:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'cups' AND table_schema = 'public'
ORDER BY ordinal_position;
```
Debe listar las 18 columnas nuevas.

---

### 2. Diagnóstico previo (read-only)

Antes de mover datos, cuenta y detecta colisiones:

```sql
-- Cuántos supply_points hay
SELECT count(*) AS total_supply_points FROM public.supply_points;

-- Cuántos CUPS ya existen en `cups`
SELECT count(*) AS total_cups FROM public.cups;

-- Colisiones: supply_points.cups que YA existen en cups.codigo_cups
SELECT sp.cups AS codigo_cups, count(*) AS n
FROM public.supply_points sp
JOIN public.cups c ON c.codigo_cups = sp.cups
GROUP BY sp.cups;

-- Clientes en supply_points sin empresa equivalente (no debería haber, pero validar)
SELECT sp.client_id
FROM public.supply_points sp
LEFT JOIN public.clients cl ON cl.id = sp.client_id
LEFT JOIN public.empresas e ON lower(e.nif) = lower(cl.nif)
WHERE e.id IS NULL
LIMIT 20;
```

Reporta los counts en el ACK.

---

### 3. Migrar datos

**Estrategia**:
- Si `supply_points.cups` ya existe en `public.cups.codigo_cups` → **UPDATE**: rellenar las columnas técnicas nuevas (sin tocar `empresa_id`, `contrato_id`, `direccion_suministro`, `distribuidor`, `estado`).
- Si **NO** existe → **INSERT** un registro nuevo en `public.cups` con `contrato_id = NULL` (la migración previa hizo esa columna nullable), `empresa_id` resolviendo por `clients.nif → empresas.nif`, `estado = 'pendiente'`.

**Normalización del JSON `powers`**:
- `supply_points.powers` viene como `{ p1, p2, p3, p4, p5, p6 }` (numbers). Reempaquétalo tal cual a `cups.potencias_contratadas`.

**Energías**:
- `supply_points.e1_kwh..e6_kwh` → `cups.energia_p1_kwh..energia_p6_kwh` (1:1).

Ejemplo de UPDATE (ajusta si cambia el nombre de columnas):

```sql
UPDATE public.cups c SET
  tarifa_acceso              = sp.tariff,
  tarifa_manual              = sp.manual_tariff,
  potencias_contratadas      = sp.powers,
  comercializadora_actual    = sp.current_retailer,
  modelo_autoconsumo         = sp.autoconsumption_model,
  modelo_autoconsumo_manual  = sp.manual_autoconsumption_model,
  potencia_fv_kwp            = sp.pv_power_kwp,
  coste_instalacion_fv_eur   = sp.fv_installation_cost_eur,
  potencia_inversor_kw       = sp.inverter_power_kw,
  fecha_instalacion_fv       = sp.installation_date,
  marca_inversor             = sp.inverter_brand,
  energia_p1_kwh             = sp.e1_kwh,
  energia_p2_kwh             = sp.e2_kwh,
  energia_p3_kwh             = sp.e3_kwh,
  energia_p4_kwh             = sp.e4_kwh,
  energia_p5_kwh             = sp.e5_kwh,
  energia_p6_kwh             = sp.e6_kwh
FROM public.supply_points sp
WHERE c.codigo_cups = sp.cups;
```

Ejemplo de INSERT (para los supply_points que no tengan CUPS en la nueva tabla):

```sql
INSERT INTO public.cups (
  empresa_id, codigo_cups, direccion_suministro,
  estado, contrato_id,
  tarifa_acceso, tarifa_manual, potencias_contratadas, comercializadora_actual,
  modelo_autoconsumo, modelo_autoconsumo_manual,
  potencia_fv_kwp, coste_instalacion_fv_eur, potencia_inversor_kw,
  fecha_instalacion_fv, marca_inversor,
  energia_p1_kwh, energia_p2_kwh, energia_p3_kwh,
  energia_p4_kwh, energia_p5_kwh, energia_p6_kwh,
  created_at
)
SELECT
  e.id AS empresa_id,
  sp.cups,
  sp.supply_address,
  'pendiente',
  NULL,
  sp.tariff, sp.manual_tariff, sp.powers, sp.current_retailer,
  sp.autoconsumption_model, sp.manual_autoconsumption_model,
  sp.pv_power_kwp, sp.fv_installation_cost_eur, sp.inverter_power_kw,
  sp.installation_date, sp.inverter_brand,
  sp.e1_kwh, sp.e2_kwh, sp.e3_kwh,
  sp.e4_kwh, sp.e5_kwh, sp.e6_kwh,
  COALESCE(sp.created_at, now())
FROM public.supply_points sp
JOIN public.clients cl   ON cl.id = sp.client_id
JOIN public.empresas e   ON lower(e.nif) = lower(cl.nif)
LEFT JOIN public.cups c  ON c.codigo_cups = sp.cups
WHERE c.id IS NULL;
```

> **No borres `supply_points` todavía.** Lo dejamos vivo como fallback hasta que el refactor de frontend esté en producción.

---

### 4. Verificación post-migración

```sql
-- Todos los supply_points deberían tener ahora un cups con mismo codigo_cups
SELECT count(*) AS sp_sin_cups
FROM public.supply_points sp
LEFT JOIN public.cups c ON c.codigo_cups = sp.cups
WHERE c.id IS NULL;
-- Esperado: 0

-- Diff de columnas técnicas: comprobar un sample
SELECT
  sp.cups,
  sp.tariff          = c.tarifa_acceso           AS tarifa_ok,
  sp.pv_power_kwp    = c.potencia_fv_kwp         AS fv_ok,
  sp.e1_kwh          = c.energia_p1_kwh          AS e1_ok,
  sp.powers::text    = c.potencias_contratadas::text AS powers_ok
FROM public.supply_points sp
JOIN public.cups c ON c.codigo_cups = sp.cups
LIMIT 5;
-- Todas las columnas _ok deben ser TRUE

-- Counts finales
SELECT
  (SELECT count(*) FROM public.supply_points) AS supply_points,
  (SELECT count(*) FROM public.cups)           AS cups_total,
  (SELECT count(*) FROM public.cups WHERE tarifa_acceso IS NOT NULL) AS cups_con_tarifa;
```

---

### 5. (Opcional pero recomendado) Vista de compatibilidad

Para que el refactor frontend sea gradual, crea una vista `supply_points_compat` que exponga `cups` con los nombres legacy. Así si algo del frontend lee por nombre antiguo, sigue funcionando durante la transición:

```sql
CREATE OR REPLACE VIEW public.supply_points_compat AS
SELECT
  c.id,
  c.empresa_id                 AS client_id,   -- ojo: ahora apunta a empresas, no a clients
  c.codigo_cups                AS cups,
  c.tarifa_acceso              AS tariff,
  c.tarifa_manual              AS manual_tariff,
  c.direccion_suministro       AS supply_address,
  c.potencias_contratadas      AS powers,
  c.comercializadora_actual    AS current_retailer,
  c.modelo_autoconsumo         AS autoconsumption_model,
  c.modelo_autoconsumo_manual  AS manual_autoconsumption_model,
  c.potencia_fv_kwp            AS pv_power_kwp,
  c.coste_instalacion_fv_eur   AS fv_installation_cost_eur,
  c.potencia_inversor_kw       AS inverter_power_kw,
  c.fecha_instalacion_fv       AS installation_date,
  c.marca_inversor             AS inverter_brand,
  c.energia_p1_kwh             AS e1_kwh,
  c.energia_p2_kwh             AS e2_kwh,
  c.energia_p3_kwh             AS e3_kwh,
  c.energia_p4_kwh             AS e4_kwh,
  c.energia_p5_kwh             AS e5_kwh,
  c.energia_p6_kwh             AS e6_kwh,
  c.created_at
FROM public.cups c;
```

No es imprescindible — si te parece añadir ruido al schema, sáltatelo y lo documentamos.

---

### 6. Regenerar tipos TS (si puedes)

Si tienes el Supabase CLI linkeado (project-ref), ejecuta:
```bash
supabase gen types typescript --project-id <PROJECT_REF> > src/core/types/database.ts
git add src/core/types/database.ts
git commit -m "chore(fase28.1a): regenerar tipos TS con columnas técnicas en cups"
```

Si no, lo hago yo en mi siguiente paso — no es bloqueante.

---

### 7. Commit + push

Commit la migration aplicada (aunque el fichero ya esté en el repo, deja constancia):
```bash
git add supabase/migrations/20260419_fase28_1a_cups_technical_columns.sql
git commit --allow-empty -m "chore(fase28.1a): aplicada migration cups_technical_columns en Supabase vivo"
git push
```

---

### 8. ACK

Deja un mensaje en `.cowork/inbox/` con nombre `2026-04-20T<HH-MM-SS>-fase28-1a-done.md` conteniendo:

1. DDL: ¿aplicada sin error? (sí/no, si no → error)
2. Counts pre-migración (supply_points total, cups total, colisiones)
3. Counts post-migración (supply_points, cups, cups con tarifa no nula)
4. Resultado de las 5 verificaciones del paso 4 (especialmente `sp_sin_cups = 0`)
5. ¿Creaste la vista `supply_points_compat`? (sí/no)
6. ¿Regeneraste tipos TS? (sí/no)
7. Cualquier incidencia o decisión que hayas tomado

---

## Qué NO debes hacer

- ❌ No borres `supply_points`, `clients`, `invoice_history`, `proposals`. Son legacy pero aún los lee el código.
- ❌ No toques ficheros en `src/features/**` ni en `src/types/**`. El refactor frontend es mío.
- ❌ No cambies RLS de `cups` en esta fase. La policy `cu_all` actual ya es suficiente.
- ❌ No ejecutes `DROP TABLE` de nada.

## Qué SÍ puedes hacer si lo ves necesario

- ✅ Ajustar la migration SQL si detectas problemas (añadir índices extra, CHECK constraints útiles, etc.). Si la modificas, documéntalo en el ACK.
- ✅ Tomar decisiones pragmáticas sobre la vista de compatibilidad.
- ✅ Avisarme si detectas que `supply_points.client_id` no matchea con ningún NIF en `empresas` — significa que falta migrar esas empresas primero y debemos parar.

---

## Contexto

- Roadmap en `docs/ROADMAP_FUSION.md`
- Estado actual en `docs/ESTADO.md`
- Auditoría previa en `docs/AUDIT_2026-04-19.md`
- Mapeo completo supply_points ↔ cups está embebido en el comentario cabecera de la migration SQL.

Cuando termines y pongas el ACK en inbox, yo arranco el refactor de las 4 features. Gracias.

— Claude Code
