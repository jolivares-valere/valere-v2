# Schema MVP captación — versión final aplicada (1 mayo 2026)

> Tras feedback ChatGPT al modelo multi-rol, aplicado a BD producción vía MCP los ajustes de simplicidad. Este documento es la verdad de campo para implementación.

---

## 1. Decisiones tras feedback ChatGPT

### Aceptado integralmente

**1. Reducir estados operativos.** 17 era excesivo — riesgo de "demasiado clic" para Carolina.

**Mi versión final: 10 estados** (intermedio entre 17 y los 9 propuestos por ChatGPT). Justificación: necesito distinguir `factura_recibida` (factura llegó pero nadie la mira) de `en_analisis` (Carolina M. trabajando), porque son cuellos de botella distintos.

**2. Tracking de emails.** ChatGPT identifica concepto crítico que faltaba: "decisión vs ejecución". Carolina M. decide que se manda email a Antonio, Carolina A. ejecuta el envío. Ambas personas merecen quedar registradas. Tabla nueva `oportunidad_emails`.

**3. "Cada usuario ve solo lo que le toca AHORA"** como principio rector. Vista `v_mis_oportunidades` es el corazón del producto.

### Aceptado con matiz

**Eliminar `tipo_atencion`.** ChatGPT dice "se infiere del responsable_actual". Tiene razón en producción pero hay 2 casos donde aporta:

- **Histórico**: oportunidad cerrada, nadie es responsable_actual, no se puede inferir si fue estándar/senior salvo mirando handoffs.
- **Decisión vs ejecución**: cuando Carolina M. decide "será senior" pero aún no ha hecho el handoff (porque está terminando otra propuesta), durante esa hora la oportunidad ya tiene la decisión tomada pero el responsable_actual aún es ella.

**Mi compromiso**: NO añado `tipo_atencion` al schema MVP. Si Carolina M. necesita tomar la decisión antes del handoff, lo registra como nota en el handoff con motivo `asignacion_a_senior`. La derivación post-cierre se hace consultando handoffs históricos. Si más adelante hace falta el campo, se añade.

### Discrepancia parcial

**"Menos triggers"**. ChatGPT sugiere lógica en backend, no en SQL. Acepto en general PERO mantengo 2 triggers críticos:

- **Trigger handoff_apply** (al insertar handoff actualiza `responsable_actual_id` y `etapa_operativa`): integridad básica. Sin él, riesgo grande de inconsistencia si el frontend olvida actualizar tras crear handoff. **Mantengo**.
- ~~**Trigger motivo_perdida obligatorio**~~ → **DECISIÓN FINAL: NO se aplica trigger.** La obligatoriedad de `motivo_perdida_codigo` al cerrar oportunidad como `cerrada_perdida` se gestiona en **UI/backend**, no en BD. La BD solo define el ENUM `motivo_perdida_enum`, las columnas `motivo_perdida_codigo` y `motivo_perdida_detalle`, y la vista analítica `v_motivos_perdida_familia`. Decisión validada por ChatGPT en auditoría post-fixes (1 mayo 2026 noche): para MVP, mejor que la UI impida cerrar sin motivo que añadir lógica SQL prematura. Ver `docs/SCHEMA_MVP_CAPTACION_FINAL_2026-05-01.md` y migration `supabase/migrations/20260501_mvp_captacion_fixes_post_audit_chatgpt.sql`.

Los CHECK constraints (etapa_operativa, motivos_perdida) son zero-coste y previenen bugs. **Mantengo**.

Lo que NO incluyo: triggers de auto-asignación, validaciones cruzadas complejas, recalculos de campos derivados. Esos en backend.

---

## 2. Schema MVP final (lo aplicado en BD)

### 2.1 Cambios en `oportunidades`

```sql
-- Etapa operativa: 10 estados micro
ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS etapa_operativa text;

ALTER TABLE public.oportunidades
  ADD CONSTRAINT oportunidades_etapa_operativa_check CHECK (
    etapa_operativa IS NULL OR etapa_operativa IN (
      'nuevo',                      -- lead recién creado, sin tocar
      'contactado',                 -- Carolina Aroca llamó al menos una vez
      'esperando_factura',          -- mandó presentación, pidió factura, espera
      'factura_recibida',           -- factura subida al CRM, pendiente análisis
      'en_analisis',                -- Carolina M. o asesor analizando
      'propuesta_en_preparacion',   -- alguien construyendo propuesta
      'propuesta_lista',            -- propuesta lista para enviar al cliente
      'propuesta_enviada',          -- email con propuesta enviado
      'seguimiento',                -- esperando respuesta o llamando seguimiento
      'cerrado'                     -- ganada o perdida (etapa macro lo distingue)
    )
  );

-- Quién es el responsable AHORA (cambia con cada handoff)
ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS responsable_actual_id uuid
    REFERENCES public.user_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_oportunidades_responsable_actual
  ON public.oportunidades(responsable_actual_id) WHERE deleted_at IS NULL;

-- Booleanos rápidos para info que NO merece su propia etapa
ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS decisor_identificado boolean NOT NULL DEFAULT false;

-- Hitos de documentos
ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS factura_recibida_at timestamptz,
  ADD COLUMN IF NOT EXISTS factura_documento_id uuid REFERENCES public.documentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS propuesta_documento_id uuid REFERENCES public.documentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS propuesta_enviada_at timestamptz,
  ADD COLUMN IF NOT EXISTS visita_programada_at timestamptz;

-- (NO se añade tipo_atencion según feedback ChatGPT — se deriva de roles del responsable)
```

### 2.2 Nueva tabla `oportunidad_handoffs`

```sql
CREATE TABLE IF NOT EXISTS public.oportunidad_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidad_id uuid NOT NULL REFERENCES public.oportunidades(id) ON DELETE CASCADE,
  from_user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  to_user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  motivo text NOT NULL CHECK (motivo IN (
    'factura_recibida',         -- Carolina A → Carolina M
    'asignacion_a_senior',      -- Carolina M → Antonio/Juan
    'propuesta_lista',          -- Carolina M → Carolina A
    'devuelta_para_revision',   -- vuelta atrás (ej: propuesta mal hecha)
    'reasignacion_manual',      -- vacaciones, redistribución
    'otro'
  )),
  notas text,
  etapa_operativa_destino text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_handoffs_oportunidad
  ON public.oportunidad_handoffs(oportunidad_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_handoffs_to_user
  ON public.oportunidad_handoffs(to_user_id, created_at DESC);

-- Trigger: aplica handoff al insertar (actualiza responsable + etapa_operativa de la oportunidad)
CREATE OR REPLACE FUNCTION public.tg_oportunidad_handoff_apply()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  UPDATE public.oportunidades
     SET responsable_actual_id = NEW.to_user_id,
         etapa_operativa = COALESCE(NEW.etapa_operativa_destino, etapa_operativa),
         updated_at = now()
   WHERE id = NEW.oportunidad_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_handoff_apply ON public.oportunidad_handoffs;
CREATE TRIGGER tg_handoff_apply
  AFTER INSERT ON public.oportunidad_handoffs
  FOR EACH ROW EXECUTE FUNCTION public.tg_oportunidad_handoff_apply();

-- Hardening: no exponer función a anon/authenticated (ya aprendido en FASE 30.1)
REVOKE EXECUTE ON FUNCTION public.tg_oportunidad_handoff_apply() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_oportunidad_handoff_apply() FROM anon;
REVOKE EXECUTE ON FUNCTION public.tg_oportunidad_handoff_apply() FROM authenticated;

-- RLS
ALTER TABLE public.oportunidad_handoffs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS handoffs_all_authenticated ON public.oportunidad_handoffs;
CREATE POLICY handoffs_all_authenticated ON public.oportunidad_handoffs
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

COMMENT ON TABLE public.oportunidad_handoffs IS
  'Trazabilidad de cambios de responsable en oportunidades. Trigger actualiza oportunidad.responsable_actual_id automáticamente.';
```

### 2.3 Nueva tabla `oportunidad_emails` (aporte ChatGPT)

```sql
CREATE TABLE IF NOT EXISTS public.oportunidad_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidad_id uuid NOT NULL REFERENCES public.oportunidades(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN (
    'presentacion',         -- email inicial Carolina A. con presentación Valere
    'solicitud_factura',    -- recordatorio para que el cliente envíe factura
    'propuesta',            -- email con la propuesta adjunta
    'introduccion_asesor',  -- email cuando Carolina A. presenta el caso a Antonio/Juan
    'seguimiento',          -- emails follow-up posteriores
    'otro'
  )),
  enviado_por uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  decidido_por uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  destinatario_email text,
  destinatario_user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  asunto text,
  cuerpo_resumen text,
  enviado_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emails_oportunidad
  ON public.oportunidad_emails(oportunidad_id, enviado_at DESC);

CREATE INDEX IF NOT EXISTS idx_emails_tipo
  ON public.oportunidad_emails(tipo, enviado_at DESC);

ALTER TABLE public.oportunidad_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS emails_all_authenticated ON public.oportunidad_emails;
CREATE POLICY emails_all_authenticated ON public.oportunidad_emails
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

COMMENT ON TABLE public.oportunidad_emails IS
  'Emails enviados a clientes o entre miembros del equipo en el contexto de una oportunidad. Distingue decisor (quién decidió mandarlo) de ejecutor (quién lo envió físicamente).';
```

### 2.4 Vista `v_mis_oportunidades`

```sql
CREATE OR REPLACE VIEW public.v_mis_oportunidades AS
SELECT
  o.id,
  o.empresa_id,
  e.nombre AS empresa_nombre,
  e.nif AS empresa_nif,
  o.tipo,
  o.etapa,
  o.etapa_operativa,
  o.decisor_identificado,
  o.responsable_actual_id,
  o.factura_recibida_at,
  o.factura_documento_id,
  o.propuesta_documento_id,
  o.propuesta_enviada_at,
  o.visita_programada_at,
  o.valor_estimado_eur,
  o.ahorro_anual_estimado,
  o.created_at,
  o.updated_at
FROM public.oportunidades o
JOIN public.empresas e ON e.id = o.empresa_id
WHERE o.deleted_at IS NULL
  AND o.responsable_actual_id = auth.uid();

COMMENT ON VIEW public.v_mis_oportunidades IS
  'Vista filtrada para que cada usuario vea solo las oportunidades de las que es responsable AHORA. Núcleo del producto multi-rol.';
```

### 2.5 ALTER `user_profiles` con funciones

```sql
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS funciones text[] NOT NULL DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN public.user_profiles.funciones IS
  'Funciones operativas del usuario: telemarketing | analista | asesor_senior | admin. Múltiples permitidas (Juan = master+asesor_senior).';
```

### 2.6 Mapeo etapa_operativa → etapa macro (referencia)

```
etapa_operativa             → etapa (macro)
-----------------------------------------------
nuevo                       → prospecto
contactado                  → prospecto
esperando_factura           → prospecto
factura_recibida            → auditoria_consumo
en_analisis                 → auditoria_consumo
propuesta_en_preparacion    → auditoria_consumo
propuesta_lista             → oferta_presentada
propuesta_enviada           → oferta_presentada
seguimiento                 → negociacion
cerrado                     → cerrada_ganada o cerrada_perdida (lo decide el frontend al cerrar)
```

El frontend / backend debe mantener consistencia entre los 2 niveles. NO se añade trigger automático para esto en MVP — se gestiona en backend al hacer transiciones.

---

## 3. Roles y funciones por usuario

Configuración propuesta para los users:

| Persona | role | funciones |
|---|---|---|
| Juan Olivares | master | `['admin', 'asesor_senior']` |
| Antonio | manager | `['asesor_senior']` |
| Carolina Aroca | consultant | `['telemarketing']` |
| Carolina Maciñeiras | consultant | `['analista']` |

Filtrado UI:
- Tab "Por llamar" en `/captacion` → solo si `'telemarketing' = ANY(funciones)`.
- Tab "Facturas pendientes" en `/analisis` → solo si `'analista' = ANY(funciones)`.
- Tab "Mis clientes complejos" → solo si `'asesor_senior' = ANY(funciones)`.

---

## 4. Estado tras aplicar (verificación)

Tras aplicar via MCP, BD prod tiene:

- `oportunidades.etapa_operativa text` (NULL en las 4 oportunidades existentes).
- `oportunidades.responsable_actual_id uuid` (NULL).
- `oportunidades.decisor_identificado boolean DEFAULT false`.
- `oportunidades.factura_recibida_at timestamptz` (NULL).
- `oportunidades.factura_documento_id uuid` (NULL).
- `oportunidades.propuesta_documento_id uuid` (NULL).
- `oportunidades.propuesta_enviada_at timestamptz` (NULL).
- `oportunidades.visita_programada_at timestamptz` (NULL).
- `oportunidad_handoffs` tabla creada, vacía, con trigger.
- `oportunidad_emails` tabla creada, vacía.
- `v_mis_oportunidades` vista creada.
- `user_profiles.funciones text[] DEFAULT '{}'`.

---

## 5. Lo que NO se hace todavía

- **Crear users de Carolina Maciñeiras y Antonio**: necesito sus emails. Pendiente input Juan.
- **Asignar funciones a users existentes**: Juan = `['admin','asesor_senior']`, Carolina A. = `['telemarketing']` cuando estén creados.
- **Construir UI**: NO se construye nada de UI hasta TSC verde + commit Sprint A.
- **Datos seed**: las 4 oportunidades existentes mantienen `responsable_actual_id = comercial_id` (su comercial actual) cuando se haga seeding manual, o se reasignan cuando Juan lo decida.

---

## 6. Cambios futuros previsibles

Dejo apuntado para no olvidar:

- **Cuando se confirme criterio "alto consumo / cliente complejo"** (pendiente respuesta Juan), añadir hook `useDeterminarTipoAtencion(empresa_id, factura)` que sugiere automáticamente.
- **Cuando se confirme N intentos antes de marcar `cerrada_perdida` motivo `no_envia_factura`**, añadir job pg_cron que aplique la regla automáticamente tras N días.
- **Multi-CUPS por oportunidad** (pendiente decisión): si se elige 1:N, añadir tabla `oportunidad_cups` (ya planeada en FASE 31.3).
- **Reasignaciones por vacaciones**: campo `responsable_secundario_id` (backup) o función `reassign_oportunidades_de_user(from_id, to_id)`.

---

## 7. Próximo paso ejecutable

Cuando TSC esté verde y Sprint A commiteado:

1. Crear users en `user_profiles` para Carolina Maciñeiras + Antonio (cuando Juan dé emails).
2. Asignar funciones a los 4 users.
3. Aplicar seeding de las 4 oportunidades existentes con `responsable_actual_id`.
4. Construir UI día 2-7 según `FLUJO_REAL_CAPTACION_VALERE_2026-05-01.md` MVP redimensionado.

— Cowork, 1 mayo 2026.
