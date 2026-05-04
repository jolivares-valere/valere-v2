# Auditoría post-sprint Captación — 2026-05-04

> **Origen**: dictamen ChatGPT 2026-05-04 — "Sprint aceptado técnicamente, NO aceptado todavía como listo para uso real. Auditar 5 puntos críticos antes de exponerlo al equipo."
>
> **Resultado global**: 1 bug bloqueante encontrado y corregido. 2 deudas conocidas documentadas. Smoke test runbook producido. NO se programa nada nuevo.

---

## Punto 1 — Policies Storage / `documentos`

### Hallazgo

Las policies sobre `public.documentos` y `storage.objects` (bucket `documentos`) NO restringen por **propiedad de la oportunidad asociada**. Cualquier user con función `telemarketing`/`analista`/`asesor_senior`/`admin` puede:

- `SELECT` cualquier fila de `public.documentos` (no solo las de sus oportunidades)
- `SELECT` cualquier objeto del bucket `documentos` (policy `documentos_select_authenticated` ya permitía esto a cualquier authenticated)
- `INSERT` documentos con cualquier `entidad_tipo` / `entidad_id`
- `UPDATE` cualquier fila

### ¿Las policies que añadí HOY agravan algo?

No. Las nuevas policies (con check de `funciones`) coexisten con las antiguas (con check de `role`). Antes ya cualquier `consultant` autenticado podía leer todo. Las nuevas solo añaden la posibilidad de **escribir** a usuarios con `funciones`, lo que no estaba abierto antes.

### Riesgo real

- **MVP interno (4 personas que se conocen)**: bajo. El riesgo es que Carolina A pueda DESCARGAR un documento de Antonio si conoce el path. La UI no le da ese path.
- **Producción con clientes externos / equipo más grande**: alto. Cualquier user logueado podría minar el bucket.

### Mitigación inmediata

Ninguna fixeada. La regla **"primero robustez operativa, después integraciones elegantes"** + **"no más schema/permisos hasta que el equipo use el sistema"** apunta a que esto va al backlog, NO se cambia ahora.

### Deuda registrada

Añadir a `docs/BACKLOG_PERMISOS_GRANULARES_2026-05-03.md` (capa B/C):

```sql
-- Diseño futuro: SELECT solo si user es responsable, creador o aparece en handoff
CREATE POLICY documentos_select_propios ON public.documentos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.oportunidades o
      WHERE o.id = documentos.entidad_id
        AND documentos.entidad_tipo = 'oportunidad'
        AND (
          o.responsable_actual_id = auth.uid()
          OR o.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.oportunidad_handoffs h
            WHERE h.oportunidad_id = o.id
              AND (h.from_user_id = auth.uid() OR h.to_user_id = auth.uid())
          )
        )
    )
    OR public.user_has_funcion('admin')
  );

-- Para storage.objects requiere parsear path con regex
-- y derivar oportunidad_id desde 'oportunidades/{id}/...'
```

**Pre-requisito antes de aplicarlo**: añadir cliente externo o ampliar equipo.

---

## Punto 2 — Handoffs cambian responsable_actual_id sin duplicidades

### Hallazgo BLOQUEANTE (corregido)

La tabla `oportunidad_handoffs` tiene CHECK constraint sobre `motivo`:

```sql
motivo IN (
  'factura_recibida',
  'asignacion_a_senior',
  'propuesta_lista',
  'devuelta_para_revision',
  'reasignacion_manual',
  'otro'
)
```

Pero el código `useHacerHandoff` pasaba 3 valores INCORRECTOS:

| Código antes | Código corregido | Acción |
|---|---|---|
| `'pasar_a_analisis'` | `'factura_recibida'` | Carolina A → Carolina M |
| `'pedir_visita'` | `'asignacion_a_senior'` | Carolina A → Antonio/Juan (escalar) |
| `'propuesta_lista_para_enviar'` | `'propuesta_lista'` | Analista/Senior → Carolina A |

**Sin este fix**, Carolina A no podía pasar facturas a análisis (BD rechazaba el INSERT con check_violation). Bug bloqueante del flujo principal.

✅ Corregido en `src/features/captacion/components/OportunidadAcciones.tsx` (3 ediciones).

### Trigger BD verificado

`tg_oportunidad_handoff_apply()` es SECURITY DEFINER, search_path explícito (`public, pg_temp`), hace UPDATE atómico de `responsable_actual_id` + `etapa_operativa`. Correcto.

### Riesgo de duplicidad

NO hay constraint UNIQUE sobre `(oportunidad_id, from_user_id, to_user_id, created_at)`. Si Carolina A pulsa dos veces "Pasar a análisis" rápido:

- Se insertan 2 filas en `oportunidad_handoffs`
- Trigger ejecuta UPDATE 2 veces (al mismo valor — idempotente, no rompe)
- Timeline registra 2 actividades

**Mitigación frontend**: cada `FormFooter` tiene `disabled={mutation.isPending}`. El botón se bloquea mientras la mutación está en vuelo.

**Riesgo residual**: doble click muy rápido antes de que `isPending=true` propage. Probabilidad baja, daño bajo. Documentar como mejora futura.

---

## Punto 3 — Upload + handoff resilient (no perder archivo si falla)

### Diseño revisado

`storage.ts/subirDocumentoOportunidad`:
1. Validar fichero (tamaño, mime, no vacío)
2. Upload al bucket → si falla, error claro, fin
3. INSERT en tabla `documentos` → si falla, **cleanup best-effort** del blob subido + error
4. Devolver `documentoId` + metadatos

Si llega aquí, el documento está guardado en BD y bucket consistentes.

`FormSubirFactura` (en `OportunidadAcciones.tsx`):
1. Llama a `subirDocumentoOportunidad`
2. Try/catch alrededor de `cambiar.mutateAsync` (etapa + factura_documento_id)
3. Si la transición falla:
   - `toast.warning('Factura subida pero falla al actualizar estado, reintenta')`
   - Registra actividad de tipo `factura_subida` con resultado `factura_recibida_pendiente_estado` y referencia al `ruta_storage`
   - **Documento NO se pierde**
4. Si todo OK, registra actividad final con resultado `factura_recibida`

`FormSubirPropuesta` similar:
1. Upload + INSERT documentos
2. Lookup `created_by` (Carolina A original)
3. Try/catch sobre cambiar etapa
4. Try/catch sobre handoff
5. Si etapa OK pero handoff falla, propuesta queda con `propuesta_documento_id` vinculada y etapa `propuesta_lista`. **Pero el responsable_actual_id NO cambia** — la card sigue en la bandeja del analista/senior, no vuelve a Carolina A.

### Hueco residual del Punto 3

**No hay UI para reintentar handoff manualmente desde la card en estado intermedio**. Si el handoff de vuelta falla, alguien tiene que:
- Volver a abrir el caso (sigue en bandeja del analista/senior)
- ¿Hacer qué? El botón "Subir propuesta" volvería a subir un duplicado.

**Mitigación inmediata**: si pasa, Juan ejecuta SQL manual:
```sql
INSERT INTO public.oportunidad_handoffs (oportunidad_id, from_user_id, to_user_id, motivo, etapa_operativa_destino)
VALUES ('<id>', '<analista_id>', '<creador_id>', 'reasignacion_manual', 'propuesta_lista');
```

**Mejora futura**: botón "Reasignar manualmente" disponible cuando `etapa_operativa = propuesta_lista` pero `responsable_actual_id != created_by`.

---

## Punto 4 — `motivo_perdida_codigo` obligatorio en UI al cerrar perdida

### BD

`motivo_perdida_codigo` es **NULLABLE** en la tabla. NO hay constraint que lo exija al pasar a `etapa = 'cerrada_perdida'`. Una operación SQL directa puede crear una `cerrada_perdida` sin código.

### Frontend

✅ `FormCerrarPerdida` (no interesa) y `FormClienteRechaza`:
- Default: primer motivo del catálogo (`motivos[0]?.codigo` o `'precio_insuficiente'`)
- Si elige `'otro'`, valida que `motivo_perdida_detalle.trim()` no esté vacío
- Siempre envía `motivo_perdida_codigo` no null

✅ `FormNoEnviaFactura`:
- Hardcodea `motivo_perdida_codigo = 'no_envia_factura'`
- Detalle opcional

**Conclusión**: la UI siempre rellena el código. Pero la BD lo permite null por SQL directa.

### Decisión

ChatGPT pidió antes "no más schema". Añadir constraint sería schema. Decisión:
- **NO añadir constraint BD** ahora
- **Documentar** como riesgo de bypass por SQL
- Si en uso real aparece una `cerrada_perdida` sin código (vía bug o operación manual), añadir constraint en sprint correctivo

---

## Punto 5 — Smoke test runbook (separado en `docs/SMOKE_TEST_RUNBOOK.md`)

Producido. Ver fichero.

---

## Resumen de riesgos al exponer al equipo

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Telemarketing puede ver docs ajenos vía URL directa | Media | Equipo interno de confianza. Backlog para fix. |
| Doble click rápido en handoff genera 2 filas | Baja | `isPending` bloquea botón. Daño bajo. |
| Handoff de vuelta falla, propuesta queda atrapada | Baja | Mitigación SQL manual documentada |
| `cerrada_perdida` sin código por SQL directa | Muy baja | Solo posible con acceso BD directo |

**Veredicto**: APTO para uso real con equipo interno de 4 personas. NO apto para clientes externos ni equipo ampliado sin tighten previo.

---

## Hotfix necesario (deploy inmediato)

Las 3 correcciones de motivos handoff son **bloqueantes del flujo**. Necesitan llegar a `main` antes de cualquier smoke test real.

Script: `COMMIT_HOTFIX_HANDOFFS_2026-05-04.ps1`

---

## Cambio de proceso registrado

A partir de aquí, cada sprint debe entregar **4 salidas explícitas** (regla validada con ChatGPT):

1. **Resultado técnico**: TSC + tests + build + commit + deploy
2. **Resultado operativo**: qué puede hacer cada rol después
3. **Smoke test manual**: lista de pasos con resultado esperado
4. **Decisión de producto**: qué NO se va a construir hasta tener feedback

Y autonomía limitada: **máximo 1 bloque funcional por sesión sin checkpoint humano**.

---

## Frase guía actualizada

> *El CRM ya puede ejecutar el flujo. Ahora hay que demostrar que el equipo lo puede usar sin volver a WhatsApp, Excel o email suelto.*
> — ChatGPT, dictamen 2026-05-04

---

## Deuda anotada (NO implementar ahora)

Para el futuro, cuando llegue el momento, hay que distinguir tres conceptos de ownership:

```
responsable_actual_id     → quién tiene la pelota AHORA
creado_por                → quién originó el lead (Carolina A típicamente)
propietario_comercial_id  → quién se queda la relación si se gana (gestor de cartera)
```

Hoy todo se basa en `responsable_actual_id`. Suficiente para el flujo táctico (4 etapas). Cuando aparezca cartera comercial post-cierre y crossover entre comerciales, hace falta el tercero. NO añadirlo ahora.
