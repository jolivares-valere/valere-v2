# Smoke test runbook — Sprint Operativo Captación

> **Cuándo ejecutar**: tras commit del hotfix handoffs Y despliegue Cloudflare verificado.
>
> **Quién**: Juan, idealmente con Carolina A en pantalla compartida (5 min).
>
> **Tiempo estimado total**: 25-30 min con un PDF de prueba.
>
> **Material necesario**: 2 PDFs cualquiera (ej. uno para "factura de prueba", otro para "propuesta de prueba"). Pueden ser archivos vacíos o documentos sin datos sensibles.

---

## Pre-requisitos

- [ ] Commit hotfix `COMMIT_HOTFIX_HANDOFFS_2026-05-04.ps1` ejecutado
- [ ] `https://valere-v2.pages.dev` sirve el último bundle (verificar Network → assets/index-*.js)
- [ ] Las 4 cuentas pueden hacer login:
  - Juan: jolivares@valereconsultores.com
  - Antonio: arodriguez@valereconsultores.com
  - Carolina M: administracion@valereconsultores.com
  - Carolina A: info@valereconsultores.com (password temporal `Valere2026Temporal!`)
- [ ] Los 4 demos demo siguen en BD (Industria Textil, Hostal del Pino, Frigorífica Norte, Bodega Mediterránea)

---

## Test 1 — Carolina Aroca crea lead

**Preparación**: login como Carolina A.

**Pasos**:
1. Verificar que el sidebar SOLO muestra "Captación" (sin Empresas, Datadis, Importador, Potencias, Admin).
2. Click en "+ Nuevo lead" (botón en cabecera).
3. Modal: rellenar empresa nombre = "Smoke Test Lead 1", teléfono = "+34 600 000 001", contacto nombre = "Test Contacto".
4. Click "Crear lead".

**Resultado esperado**:
- Toast verde "Lead creado".
- Drawer abre automáticamente con detalle del lead nuevo.
- En la pestaña "Por llamar" aparece la card "Smoke Test Lead 1".
- En la pestaña "Todos mis casos" también aparece.

**Verificación BD** (opcional, para Juan):
```sql
SELECT o.id, e.nombre, o.etapa_operativa, o.responsable_actual_id, o.created_by
FROM public.oportunidades o
JOIN public.empresas e ON e.id = o.empresa_id
WHERE e.nombre = 'Smoke Test Lead 1';
-- responsable_actual_id y created_by deben ser el id de Carolina A
-- etapa_operativa = 'nuevo'
```

**Si falla**: anotar en `FEEDBACK_USO_REAL.md` con tag `[bug]` o `[hueco]`.

---

## Test 2 — Esperar factura

**Continuación del Test 1** (drawer aún abierto sobre Smoke Test Lead 1).

**Pasos**:
1. Click "Esperando factura" (botón primario azul).
2. Form: email donde envía = "test@example.com", fecha prevista = hoy + 3 días.
3. Click "Mover a Esperando factura".

**Resultado esperado**:
- Toast verde "Caso movido a Esperando factura".
- La card desaparece de "Por llamar" y aparece en "Esperando factura".
- En el drawer (si lo reabres), el bloque "Estado del caso" muestra "Factura prometida para [fecha]".
- Timeline tiene una nueva entrada "Cliente acepta enviar factura".

**Verificación BD**:
```sql
SELECT etapa_operativa, factura_fecha_prevista, decisor_identificado
FROM public.oportunidades WHERE id = '<id>';
-- etapa_operativa = 'esperando_factura'
-- factura_fecha_prevista = NOW() + 3d
-- decisor_identificado = true
```

---

## Test 3 — Subir factura (CRÍTICO)

**Preparación**: estar en card "Smoke Test Lead 1", drawer abierto, etapa_operativa=esperando_factura.

**Pasos**:
1. Click "Factura recibida" (botón primario verde).
2. Seleccionar archivo PDF/JPG/PNG < 15 MB.
3. Comprobar que muestra el nombre del archivo y tamaño en MB.
4. Fecha real: dejar por defecto (hoy).
5. Click "Subir factura".

**Resultado esperado**:
- Toast verde "Factura recibida y registrada" + descripción "Ahora pulsa Pasar a análisis".
- La card pasa a "Esperando factura" → desaparece, y reaparece en bandeja con etapa `factura_recibida`.
- El bloque "Estado del caso" muestra ahora "Factura recibida [fecha]" + un botón "Descargar propuesta" (con label rara, en realidad es el adjunto factura — confirmar UX).
- Click en el botón → se abre nueva tab con URL firmada de Supabase Storage. Se descarga / muestra el PDF.

**Pruebas de validación de fichero (mismo botón "Factura recibida")**:
- Subir un .docx → debe rechazar con mensaje "Tipo no permitido. Acepta: PDF, JPG, PNG (máx 15 MB)".
- Subir un PDF > 15 MB → debe rechazar con mensaje "Archivo demasiado grande".
- Subir un fichero de 0 bytes → debe rechazar con "Archivo vacío".

**Verificación BD**:
```sql
SELECT o.etapa_operativa, o.factura_recibida_at, o.factura_documento_id,
       d.nombre, d.tipo, d.ruta_storage, d.mime_type, d.tamano_bytes
FROM public.oportunidades o
JOIN public.documentos d ON d.id = o.factura_documento_id
WHERE o.id = '<id>';
-- factura_documento_id no null, factura_recibida_at = hoy
-- documento.tipo = 'factura', ruta_storage tiene path oportunidades/{id}/facturas/...
```

**Si el upload falla a mitad** (por ejemplo, network drop):
- Si falló el upload al bucket: toast.error con mensaje específico, no se registra nada.
- Si falló el INSERT en `documentos` tras upload OK: toast.error + cleanup best-effort del blob.
- Si falló el UPDATE etapa tras upload+INSERT OK: toast.warning "Factura subida pero falla al actualizar estado, reintenta". El documento queda en `documentos`. Carolina A puede reintentar pulsando el botón otra vez (subiría duplicado pero no pierde el original).

---

## Test 4 — Handoff a Carolina Maciñeiras (CRÍTICO post-hotfix)

**Continuación del Test 3** (etapa = factura_recibida, drawer abierto).

**Pasos**:
1. Click "Pasar a análisis (Carolina M)" (botón primario azul) o "Pasar a análisis" (Carolina M en selector si hay varios analistas).
2. Form: seleccionar Carolina Maciñeiras (debería ser default si solo hay una analista), nota opcional.
3. Click "Pasar a análisis".

**Resultado esperado**:
- Toast verde "Caso pasado a análisis".
- El drawer se cierra automáticamente (porque sale de la bandeja de Carolina A).
- La card desaparece de la bandeja "Esperando factura" y "Por llamar" de Carolina A.
- En la pestaña "Todos mis casos" SÍ sigue apareciendo (porque Carolina A creó/participó).

**Logout Carolina A. Login Carolina Maciñeiras**:
- Sidebar muestra solo "Análisis facturas".
- En "Facturas pendientes" aparece "Smoke Test Lead 1".
- Click en card → drawer con timeline que incluye: lead creado / cliente acepta enviar factura / factura subida / caso pasado a analista.

**Verificación BD**:
```sql
SELECT o.etapa_operativa, o.responsable_actual_id, up.full_name AS responsable_nombre,
       (SELECT COUNT(*) FROM public.oportunidad_handoffs h WHERE h.oportunidad_id = o.id) AS num_handoffs
FROM public.oportunidades o
LEFT JOIN public.user_profiles up ON up.id = o.responsable_actual_id
WHERE o.id = '<id>';
-- responsable_actual_id = id Carolina M
-- etapa_operativa = 'factura_recibida'
-- num_handoffs = 1 (no duplicado)
```

**Si el handoff falla** (post-hotfix, no debería): copiar error y registrar en FEEDBACK con tag `[bug]`.

---

## Test 5 — Propuesta estándar

**Continuación del Test 4** (logueado como Carolina M).

**Pasos**:
1. En la card de "Smoke Test Lead 1" (etapa factura_recibida), click "Empezar análisis (estándar)".
2. Form: nota opcional. Click "Confirmar".
3. La card pasa a pestaña "En análisis". Click en card → "Subir propuesta lista".
4. Form: seleccionar PDF de "propuesta de prueba". Click "Subir y devolver a captación".

**Resultado esperado**:
- Toast verde "Propuesta lista" con descripción "Devuelta a captación para envío al cliente".
- La card desaparece de las bandejas de Carolina M.

**Logout Carolina M. Login Carolina A**:
- En "Propuestas para enviar" aparece "Smoke Test Lead 1".
- Click → drawer.
- En "Estado del caso" hay ahora un botón "Descargar propuesta" → debe abrir el PDF que Carolina M subió.

**Verificación BD**:
```sql
SELECT o.etapa_operativa, o.propuesta_documento_id, o.responsable_actual_id, up.full_name
FROM public.oportunidades o
LEFT JOIN public.user_profiles up ON up.id = o.responsable_actual_id
WHERE o.id = '<id>';
-- propuesta_documento_id no null
-- etapa_operativa = 'propuesta_lista'
-- responsable_actual_id = id Carolina A (handoff de vuelta)
```

---

## Test 6 — Envío y seguimiento

**Continuación del Test 5** (logueado como Carolina A, drawer sobre Smoke Test Lead 1).

**Pasos**:
1. Click "Marcar propuesta enviada" (botón primario morado).
2. Form: email destinatario (autorrelleno con email del contacto, modificable). Click "Marcar enviada".
3. La card pasa a pestaña "Seguimientos".
4. Click en card → drawer → click "Cliente acepta" o "Cliente rechaza".
5. Si rechaza: form pide motivo (de catálogo simplificado de Carolina A) + detalle si "otro".
6. Click "Cerrar ganada" o "Cerrar rechazada".

**Resultado esperado**:
- Toast verde correspondiente.
- La card desaparece de todas las bandejas activas.
- Sigue visible en "Todos mis casos" pero con etapa `cerrado_ganada` o `cerrado_perdida`.

**Verificación BD**:
```sql
SELECT etapa, etapa_operativa, propuesta_enviada_at, motivo_perdida_codigo, motivo_perdida_detalle
FROM public.oportunidades WHERE id = '<id>';
-- propuesta_enviada_at relleno
-- etapa = 'cerrada_ganada' o 'cerrada_perdida'
-- Si perdida: motivo_perdida_codigo no null (UI lo asegura)
```

---

## Test 7 — Caso senior

**Crear lead nuevo o reutilizar Frigorífica Norte (que ya está en asignada_a_senior con Antonio)**:

**Opción A** (con Carolina M): tras Test 4, en lugar de "Empezar análisis estándar" → click "Asignar a senior" (caso complejo). Form: seleccionar Antonio + nota explicativa. Click "Enviar a senior".

**Opción B** (con Antonio directamente): login Antonio → ver Frigorífica Norte en "Asignados a mí" → click "Empezar a preparar propuesta".

**Pasos Antonio**:
1. Empezar preparar propuesta → caso pasa a `propuesta_en_preparacion`.
2. Click "Subir propuesta lista" → upload PDF → handoff de vuelta a Carolina A (si Carolina A es la creadora) o queda en Antonio (si la creó él).

**Verificación BD**: igual que Test 5.

---

## Tras los 7 tests

### Si TODOS pasan
- Anotar en `docs/FEEDBACK_USO_REAL.md` entrada con fecha, "Smoke test E2E completo OK", severidad N/A, tag `[validacion]`.
- Enviar onboarding al equipo con `docs/ONBOARDING_4_USERS_2026-05-04.md`.
- Empezar **uso real ≥1 semana SIN nuevas features**.

### Si alguno falla
- Anotar entrada en `FEEDBACK_USO_REAL.md` con detalle: qué test, qué pasó, qué esperabas.
- Severidad alta si bloquea el flujo, media si requiere rodeo, baja si es UX.
- Pasar a Cowork en próxima sesión para fix.
- NO enviar onboarding hasta tests verdes.

### Limpieza tras los tests
Las oportunidades "Smoke Test Lead 1" se quedan en BD. Para borrarlas:
```sql
DELETE FROM public.oportunidades WHERE empresa_id IN (
  SELECT id FROM public.empresas WHERE nombre LIKE 'Smoke Test%'
);
DELETE FROM public.empresas WHERE nombre LIKE 'Smoke Test%';
```

Los archivos test del bucket pueden borrarse desde el dashboard de Supabase Storage si quieres.
