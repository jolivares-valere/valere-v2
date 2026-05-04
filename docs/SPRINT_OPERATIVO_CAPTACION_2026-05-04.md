# Sprint Operativo Captación — 2026-05-04

> **Origen:** primera revisión de Juan al MVP captación detectó que las 3 bandejas son solo lectura (cards muestran datos pero no permiten capturar nada). Las acciones de Carolina Aroca (lead → llamar → factura → propuesta → seguimiento → cierre) no están implementadas.
>
> **Estado anterior:** "no más features hasta uso real" (directriz ChatGPT). **Este sprint la sustituye** porque el feedback real válido (de Juan, fundador) llegó antes incluso del primer login del equipo. La directriz era no añadir features sin evidencia; ya hay evidencia.
>
> **Objetivo:** Carolina Aroca puede operar end-to-end en producción al final del sprint. El resto del equipo (Carolina M, Antonio) recibe lo justo para no romperse.

---

## Decisiones del producto (validadas con Juan, 2026-05-04)

1. **Carolina Aroca trabaja exclusivamente en bloque Captación**. No ve `/empresas`, `/contactos`, `/contratos`, `/oportunidades`, `/datadis`, `/importador`, ni la sección "Gestión de Potencias". Sidebar y rutas filtradas por funciones.

2. **Lead se crea desde Captación**, NO desde `/empresas`. Modal con form mínimo viable (empresa + contacto + oportunidad en una sola transacción). Datos pueden estar incompletos al inicio y completarse después en el drawer del caso.

3. **Motivos de pérdida simplificados** (5-6 típicos para captación) + opción "Otro" editable en campo libre. El detalle libre se guarda en `motivo_perdida_detalle` para análisis posterior.

4. **Fechas factura: doble captura**. Cuando cliente promete factura → `factura_fecha_prevista`. Cuando Carolina A recibe la factura → `factura_recibida_at` (real). La diferencia mide tiempo de promesa vs cumplimiento.

5. **Handoff factura recibida → analista: MANUAL**, no trigger automático. Carolina A pulsa "He pasado factura a Carolina M" y validamos cómo funciona en uso. Si todo va bien, automatizamos en futuro sprint.

6. **Visibilidad cross-bandeja para Carolina A**: aunque haga handoff, debe seguir viendo el caso (en estado read-only) en una pestaña "Todos mis casos en seguimiento" para responder al cliente si llama. La vista `v_mis_oportunidades` filtra por responsable_actual_id, así que se necesita una vista nueva o pestaña adicional que use `oportunidad_handoffs` como fuente de "casos donde Carolina A fue parte alguna vez".

7. **Trazabilidad completa de actividades**: todas las llamadas (contestadas o no), emails, recordatorios y cambios de etapa quedan en tabla `actividades` y se muestran en timeline en el drawer.

8. **Etapa 6 propuesta enviada**: solo botón de marcar enviada por ahora. Imagen, redacción de propuestas, plantillas → futuro sprint.

9. **Etapa 7 seguimiento + cierre**: botones "Acepta / Rechaza / Pedir visita / Programar contacto" se crean ahora.

10. **Google Calendar compartido para visitas**: deuda futura. Por ahora "Pedir visita" solo crea handoff a senior + nota; integración con Calendar viene en sprint posterior.

11. **Storage de facturas**: Supabase Storage bucket `documentos`. Si en el futuro quieres migrar a Drive Valere, está aislado en una capa de servicio que se puede swappear.

---

## Refinamiento ChatGPT 2026-05-04 (validado por Juan)

ChatGPT revisó las 2 decisiones pendientes y dejó criterio claro. Aplicado al plan:

### Storage — Supabase como fuente de verdad. Drive diferido.

- **Bucket**: usar el existente `documentos` (privado, creado 2026-04-19). NO crear bucket nuevo.
- **Tabla**: usar `documentos` existente (polimórfica con `entidad_tipo` + `entidad_id` + `ruta_storage` + `nombre`, `nombre_original`, `mime_type`, `tamano_bytes`, `subido_por`, `metadata jsonb`). NO crear tabla nueva ni columnas nuevas.
- **Path en bucket**:
  - `oportunidades/{oportunidad_id}/facturas/{YYYYMMDD}_{filename}`
  - `oportunidades/{oportunidad_id}/propuestas/{YYYYMMDD}_{filename}`
- **Tipo en `documentos.tipo`**: `'factura'` o `'oferta'`/`'propuesta'`.
- **Vinculación**: tras INSERT en `documentos`, actualizar `oportunidades.factura_documento_id` o `propuesta_documento_id`.
- **NO**: OCR, extracción automática, firma digital, clasificación inteligente, Drive.

### Motivos — enum BD intacto, UI filtrada

- **BD**: `motivo_perdida_enum` se queda con 21 valores. Cero modificación de schema.
- **UI**: filtrado por rol en `src/features/captacion/motivos.ts`:
  - **Telemarketing** (Carolina A): 7 motivos típicos + `otro` (`no_contesta`, `numero_erroneo`, `no_es_decisor`, `ya_tiene_consultor`, `no_quiere_mover`, `no_envia_factura`, `lista_robinson`).
  - **Avanzado** (analista/senior/admin): los 7 anteriores + 9 específicos (`no_autoriza_datadis`, `precio_insuficiente`, `contrato_con_penalizacion`, `empresa_fuera_perfil`, `insolvente`, `sector_excluido`, `satisfecho_comercializadora`, `acaba_de_renovar`, `cierre_empresa`, `geografia_excluida`).
- Cuando elige `otro`, se rellena `motivo_perdida_detalle` (campo texto ya existente).

### Robustez del upload (Día 3)

Antes de implementar la subida:
- **Tamaño máximo**: 15 MB.
- **Tipos aceptados**: PDF, JPG, PNG.
- **Error claro** si falla la subida.
- **Resilient**: guardar fila en `documentos` aunque la transición de etapa falle. Si el upload va OK pero el handoff falla, mostrar aviso y permitir reintentar handoff sin volver a subir.
- **NO bloquear** la UI durante el upload — feedback visible (progreso o spinner contextual).

### Veredicto de proceso (ChatGPT)

> *"Para crear un CRM profesional y estable, decidir siempre contra esta regla: primero robustez operativa, después integraciones elegantes."*

Aplica a este sprint y a todos los siguientes.

---

## Plan por días

### Día 1 — Permisos + drawer base + migration BD (~5h)

**Migration BD aditiva:**
- `oportunidades.factura_fecha_prevista timestamptz NULL`
- (verificar que `motivo_perdida_codigo` y `motivo_perdida_detalle` ya existen — sí, post-audit ChatGPT)

**Permisos (Capa A backlog):**
- Crear `src/core/auth/permissions.ts` con whitelist por función:
  ```ts
  export const FUNCION_RUTAS_DEFAULT: Record<string, string> = {
    telemarketing: '/captacion',
    analista:      '/analisis-captacion',
    asesor_senior: '/cartera-senior',
  }
  export const FUNCION_RUTAS_PERMITIDAS: Record<string, RegExp[]> = {
    telemarketing: [/^\/captacion/, /^\/login/, /^\/pending-approval/],
    analista:      [/^\/analisis-captacion/, /^\/empresas\/[^/]+$/, /^\/login/, /^\/pending-approval/],
    asesor_senior: [/^\/cartera-senior/, /^\/empresas/, /^\/contactos/, /^\/contratos/, /^\/oportunidades/, /^\/dashboard/, /^\/login/, /^\/pending-approval/],
    admin:         [/.*/],
  }
  ```
- `AuthGuard` extendido: si user no es admin, comprueba ruta actual contra whitelist; si no permitida, redirige a `FUNCION_RUTAS_DEFAULT[primera_funcion]`.
- `Sidebar.tsx` filtra bloque "CRM Comercial" entero y bloque "Potencias" entero por función.

**Drawer base sin acciones:**
- `src/features/captacion/components/OportunidadDrawer.tsx`
- Slide-over derecho, ancho ~480px, ESC cierra
- Muestra: empresa nombre/NIF/teléfono, contacto principal, etapa actual + badge color, importes, notas, timeline actividades (placeholder).
- Click en BandejaCard abre el drawer (reemplaza el `console.log` placeholder)
- Hook `useOportunidadDetalle(id)` que une oportunidad + empresa + contacto + actividades.

### Día 2 — Lead form + drawer interactivo (~6h)

**Modal "+ Nuevo lead":**
- Botón en header de `CaptacionPage` (visible solo a telemarketing+admin)
- `src/features/captacion/components/NuevoLeadModal.tsx`
- Form con campos:
  - **Empresa**: nombre*, NIF (opcional), teléfono*, email, ciudad, sector simplificado (industrial/comercial/servicios/agrícola/otros)
  - **Contacto**: nombre*, cargo, teléfono*, email
  - **Origen**: select (web/recomendación/base fría/contacto previo) — guarda en `notas` o nuevo campo
- Validación zod + react-hook-form
- Hook `useCrearLeadCaptacion()` → tx en backend (RPC `crear_lead_captacion(...)`):
  ```sql
  CREATE FUNCTION crear_lead_captacion(...)
    -- inserta empresa, contacto, oportunidad(etapa_operativa='nuevo')
    -- responsable_actual_id = auth.uid()
    -- crea actividad inicial tipo='lead_creado'
  ```

**Drawer interactivo (sin acciones aún, solo navegación):**
- Tabs internos del drawer: Resumen / Actividad / Notas
- Tab "Actividad" muestra `actividades` ordenadas DESC con icono por tipo
- Botón "Editar datos" abre form embebido para completar campos faltantes (mínimo viable, no perfecto)

### Día 3 — Acciones por-llamar + esperando-factura (~6h)

**Catálogo motivos pérdida (UI filtrada — ya creado en `src/features/captacion/motivos.ts`):**
- `MOTIVOS_TELEMARKETING` — 7 visibles a Carolina A + `otro`.
- `MOTIVOS_AVANZADO` — 16 visibles a analista/senior/admin + `otro`.
- Helper `motivosParaUsuario(funciones)` selecciona automáticamente.
- Códigos coinciden con valores reales del enum BD `motivo_perdida_enum`.
- Cuando elige `otro`, se rellena `motivo_perdida_detalle` obligatorio.

**Acciones drawer "Por llamar":**
- Botones: `[No contesta]` `[No es decisor]` `[Esperando factura]` `[No interesa →]`
- Cada uno abre mini-form en bottom sheet:
  - **No contesta**: nota opcional, programar siguiente llamada (date+time picker, sugerencia auto: hoy+3d). Crea actividad tipo='llamada_sin_respuesta'.
  - **No es decisor**: nuevo contacto (nombre, teléfono), pasa a contactado, crea actividad.
  - **Esperando factura**: email donde envía + `factura_fecha_prevista` (date picker, sugerencia auto: hoy+3d). Cambia etapa_operativa='esperando_factura'. Crea actividad tipo='compromiso_factura'.
  - **No interesa**: select motivos + textarea condicional. cierra como `cerrado_perdida` con motivo. Crea actividad tipo='cierre'.

**Acciones drawer "Esperando factura":**
- Botones: `[Recordatorio enviado]` `[Factura recibida 📎]` `[No envía, cerrar]`
- **Recordatorio enviado**: opciones (llamada / email), nota. Crea actividad. No cambia etapa.
- **Factura recibida**: file upload (PDF/JPG, max 10MB) → Supabase Storage bucket `documentos` con path `oportunidad/{id}/factura/{timestamp}_{filename}`. Marca `factura_recibida_at = NOW()`, `factura_documento_id = <doc>`, `etapa_operativa='factura_recibida'`. Crea actividad tipo='factura_subida'. **NO** dispara handoff aún — eso es la siguiente acción.
- **Pasar a análisis (Carolina M)**: aparece solo si `etapa_operativa='factura_recibida'`. Inserta en `oportunidad_handoffs(from=ella, to=Carolina M, etapa_anterior, etapa_destino='analizar')`. Trigger BD existente actualiza `responsable_actual_id`. Crea actividad tipo='handoff_a_analista'. La card desaparece de bandeja "Esperando factura" pero queda visible en pestaña "Todos mis casos".
- **No envía, cerrar**: motivo `C_sin_factura` o `OTRO`, cierra como perdida.

### Día 4 — Propuestas, seguimiento, cross-bandeja (~6h)

**Acciones drawer "Propuestas para enviar":**
- Cuando un caso vuelve a Carolina A en etapa `propuesta_lista` (porque analista/senior la marcó así), aparece en pestaña "Propuestas para enviar".
- Botón **[Descargar propuesta]**: si `propuesta_documento_id` existe, link directo Supabase Storage. Si no, mensaje "El analista aún no ha subido la propuesta".
- Botón **[Marcar enviada]**: form con email destinatario (autorrelleno con email contacto), fecha de envío (auto: NOW). Marca `propuesta_enviada_at`, `etapa_operativa='propuesta_enviada'`. Crea actividad tipo='propuesta_enviada'.

**Acciones drawer "Seguimientos":**
- Botones: `[Cliente acepta]` `[Cliente rechaza]` `[Pedir visita →]` `[Programar próximo contacto]`
- **Cliente acepta**: nota opcional con detalles del cierre. Marca `etapa='cerrada_ganada'`, `etapa_operativa='cerrado'`. Crea actividad tipo='cierre_ganado'.
- **Cliente rechaza**: motivos rechazo (subset diferente: `precio_no_competitivo`, `ya_renovo`, `cambio_de_idea`, `OTRO`). Marca `cerrada_perdida`. Crea actividad tipo='cierre_perdido'.
- **Pedir visita**: select asesor senior (Antonio / Juan), nota explicativa para el senior. Inserta handoff. Cambia `responsable_actual_id` y `etapa_operativa='asignada_a_senior'`. Crea actividad tipo='handoff_a_senior'.
- **Programar próximo contacto**: date+time picker, nota. NO cambia etapa. Crea actividad tipo='callback_programado'.

**Pestaña "Todos mis casos en seguimiento":**
- Nueva pestaña en `CaptacionPage` (la 5ª).
- Hook `useTodosMisCasosCaptacion()`:
  ```sql
  CREATE OR REPLACE VIEW v_captacion_todos_mis_casos AS
  SELECT DISTINCT ON (o.id)
    o.id, e.nombre AS empresa_nombre, e.nif, o.etapa_operativa, o.tipo,
    up_actual.full_name AS responsable_actual,
    o.valor_estimado_eur, o.ahorro_anual_estimado, o.created_at, o.updated_at
  FROM oportunidades o
  JOIN empresas e ON e.id = o.empresa_id
  LEFT JOIN user_profiles up_actual ON up_actual.id = o.responsable_actual_id
  WHERE o.deleted_at IS NULL
    AND (
      o.responsable_actual_id = auth.uid()
      OR o.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM oportunidad_handoffs h
        WHERE h.oportunidad_id = o.id
          AND (h.from_user_id = auth.uid() OR h.to_user_id = auth.uid())
      )
    )
  ORDER BY o.id, o.updated_at DESC;
  ```
- Lista todos los casos donde Carolina A ha sido parte alguna vez. Card simplificada en read-only (no acciones, solo info y "ver detalle").
- Click → drawer en modo lectura sin botones de acción.

### Día 5 — QA + smoke + push (~4h)

- Tests:
  - `useCrearLeadCaptacion` con mock supabase
  - Transiciones de etapa: smoke por cada acción
  - Vista `v_captacion_todos_mis_casos`
- Smoke live (Chrome MCP):
  - Login Carolina Aroca → solo ve Captación ✓
  - Crear lead Bodega Test → aparece en "Por llamar" ✓
  - Marcar contactado, esperando factura, recibir factura ✓
  - Pasar a análisis (Carolina M) → desaparece de su bandeja, aparece en "Todos mis casos" ✓
- TSC 0 errores
- Tests 39/39 + nuevos
- Doc actualizada: ESTADO.md, ROADMAP_FUSION.md
- Commit + push + deploy

---

## Cambios de schema BD

**Migration nueva**: `supabase/migrations/20260504_sprint_operativo_captacion.sql`

```sql
-- 1. Fecha prevista de factura (cuando cliente promete enviar)
ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS factura_fecha_prevista timestamptz NULL;

COMMENT ON COLUMN public.oportunidades.factura_fecha_prevista IS
  'Fecha en que el cliente prometió enviar factura. Comparar con factura_recibida_at para medir tiempo de cumplimiento.';

-- 2. Vista cross-bandeja para Captación
CREATE OR REPLACE VIEW public.v_captacion_todos_mis_casos
  WITH (security_invoker = true) AS
SELECT ...;  -- (ver Día 4)

GRANT SELECT ON public.v_captacion_todos_mis_casos TO authenticated;

-- 3. RPC crear lead en una transacción
CREATE OR REPLACE FUNCTION public.crear_lead_captacion(
  p_empresa_nombre text,
  p_empresa_nif text,
  p_empresa_telefono text,
  p_empresa_email text,
  p_empresa_ciudad text,
  p_empresa_segmento text,
  p_contacto_nombre text,
  p_contacto_cargo text,
  p_contacto_telefono text,
  p_contacto_email text,
  p_origen text DEFAULT 'cold'
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_empresa_id uuid;
  v_oportunidad_id uuid;
BEGIN
  -- Validar funcion
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = v_user_id
      AND ('telemarketing' = ANY(funciones) OR 'admin' = ANY(funciones))
  ) THEN
    RAISE EXCEPTION 'Usuario sin función telemarketing/admin';
  END IF;

  INSERT INTO public.empresas (nombre, nif, telefono_principal, email_principal, ciudad, segmento, comercial_id, asesor_id, created_by)
  VALUES (p_empresa_nombre, NULLIF(p_empresa_nif, ''), p_empresa_telefono, p_empresa_email, p_empresa_ciudad, p_empresa_segmento, v_user_id, v_user_id, v_user_id)
  RETURNING id INTO v_empresa_id;

  INSERT INTO public.contactos (empresa_id, nombre, cargo, telefono, email, es_decisor, created_by)
  VALUES (v_empresa_id, p_contacto_nombre, p_contacto_cargo, p_contacto_telefono, p_contacto_email, false, v_user_id);

  INSERT INTO public.oportunidades (empresa_id, tipo, nombre, etapa, etapa_operativa, responsable_actual_id, comercial_id, created_by, decisor_identificado, notas)
  VALUES (v_empresa_id, 'nueva_venta', 'Lead inicial captación', 'prospecto', 'nuevo', v_user_id, v_user_id, v_user_id, false, 'Origen: ' || p_origen)
  RETURNING id INTO v_oportunidad_id;

  INSERT INTO public.actividades (entidad_tipo, entidad_id, tipo, titulo, fecha, usuario_id)
  VALUES ('oportunidad', v_oportunidad_id, 'lead_creado', 'Lead creado desde Captación', NOW(), v_user_id);

  RETURN v_oportunidad_id;
END;
$$;
```

---

## Out of scope (no en este sprint)

- Plantillas de propuestas / generación PDF (sprint imagen+propuestas)
- Google Calendar integración
- Permisos capa B (RLS por entidad) — el filtrado actual es sidebar+rutas (capa A); cualquier usuario authenticated todavía puede CRUD vía SQL directo. Asumimos confianza intra-equipo.
- Permisos capa C (campo) y D (RPC con check función para acciones críticas) — los RPCs nuevos sí validan función internamente, pero el resto del CRUD sigue abierto.
- Auto-handoff por trigger BD — manual por decisión de Juan
- Notificaciones push/email cuando un caso te llega a tu bandeja

---

## Riesgos

1. **Carolina M / Antonio NO tienen ciclo completo aún** — si un caso llega a su bandeja, ven datos pero no pueden marcar "propuesta lista". Mitigación: en Día 4, añadir 1 acción mínima en sus bandejas: "Marcar propuesta lista para enviar" (handoff vuelta a Carolina A). Si no da tiempo, doc en sprint siguiente.
2. **Storage Supabase puede saturar** si suben facturas grandes — mitigar con límite 10MB en upload + compresión opcional en futuro.
3. **Test e2e Chrome** puede romper si UI cambia; usar `data-testid` desde el inicio.
4. **Onboarding al equipo NO se manda hasta que sprint cierre.** Actualizar `docs/ONBOARDING_4_USERS_2026-05-04.md` para reflejar la operativa real, no la de hoy.

---

## Cierre del sprint = onboarding al equipo

Al final del Día 5:
1. Actualizar borradores onboarding con nueva funcionalidad real.
2. Smoke test live con Carolina A real (5 min de pantalla compartida con ella).
3. Enviar onboarding y arrancar uso real.
