# Smoke test CRM Valere — Captación multi-rol

## Fecha
2026-05-04

## Versión probada
- Commit final: `04d3245` (sobre el tag `v0.1-captacion-mvp` + 6 hotfixes durante smoke)
- Entorno: Cloudflare Pages — `https://valere-v2.pages.dev`

## Resultado global
**APTO para onboarding interno** (4 personas, equipo Valere)

## Resumen ejecutivo
El CRM ejecuta el flujo multi-rol completo end-to-end: Carolina Aroca capta y pide factura, Carolina Maciñeiras analiza y decide, Antonio gestiona casos complejos. Los handoffs cambian responsable_actual_id correctamente, los documentos suben y se descargan, las acciones registran timeline trazable y los permisos por función impiden fugas entre roles. Durante el smoke se detectaron y resolvieron 6 P0; al cierre quedan 1 P1 y 2 P2 no bloqueantes.

## Tests

| Test | Resultado | Evidencia | Incidencias |
|---|---|---|---|
| 1. Crear lead | ✅ OK | TEST SMOKE INDUSTRIAL SL creado, etapa nuevo, responsable Carolina A, timeline | P0 inicial RLS 403 → resuelto con SECURITY DEFINER + policies funciones |
| 2. Esperar factura | ✅ OK | etapa esperando_factura, factura_fecha_prevista relleno, timeline | P0 actividades enum violado → resuelto con mapeo tipo/resultado a enum BD + helper errMsg |
| 3. Subir factura | ✅ OK | factura_documento_id vinculado, factura_recibida_at, descarga abre URL firmada, timeline tipo documento | P2 formato MB para archivos pequeños |
| 4. Handoff a Carolina M. | ✅ OK | responsable_actual_id cambia, etapa factura_recibida, timeline registra handoff con nota, Carolina M solo ve "Análisis facturas" | P0 motivo handoff fuera de CHECK → resuelto pre-smoke; P1 selector muestra UUID |
| 5. Propuesta estándar | ✅ OK | propuesta_documento_id vinculado, etapa propuesta_lista, handoff vuelta a Carolina A automático | P0 documentos_tipo_check → resuelto con 'estudio_ahorro' |
| 6. Envío/seguimiento/cierre | ✅ OK | propuesta_enviada_at relleno, etapa cerrada_perdida con motivo_perdida_codigo='otro' + detalle obligatorio funcional | — |
| 7. Caso senior | ✅ OK | TEST SMOKE SENIOR SL con secuencia 3 handoffs (factura_recibida → asignacion_a_senior → propuesta_lista), Antonio ve solo sus casos, redirecciones correctas | — |

## Incidencias P0
**Activos al cierre: 0**

Resueltos durante el smoke (6 hotfixes):
1. `commit 8e9ee33` — null guard `contactos.length/.map` en Drawer + RLS funciones operativas (RPC SECURITY DEFINER + policies aditivas en 4 tablas)
2. `commit 51912c1` — null guard `detalle.contactos?.[0]?.email` en FormEsperandoFactura/FormMarcarPropuestaEnviada
3. `commit b087486` — mapeo actividades.tipo y resultado a enum BD válido + helper errMsg para errores PostgrestError
4. `commit 04d3245` — tipo documento propuesta = 'estudio_ahorro' (alineado con CHECK constraint)
5. (anterior al smoke) `commit 71e880a` — motivos handoff alineados con CHECK constraint oportunidad_handoffs
6. (anterior al smoke) `commit f4a4d07` — Sprint Días 2-5 (operativa completa que el smoke validó)

Adicional: setup auth.users (Carolina A creada vía SQL, password reset para los 4, email_confirmed_at para Carolina M y Antonio).

## Incidencias P1
1. **Selector analista/senior muestra UUID en lugar de nombre** — el componente `Select` de Base UI puede estar pasando el `value` directamente como visual cuando no hay `SelectValue` formateado. Carolina A/M no podrían operar este selector con personas reales en producción. Arreglo: revisar render del `SelectTrigger`/`SelectValue` en `FormPasarAAnalisis` y `FormPedirVisita`. Esfuerzo estimado: 30 min.

## Incidencias P2
1. **Label "Descargar propuesta"** aparece en el botón de factura también (componente `DescargarPropuestaInline` se reutiliza para ambos). Conviene parametrizar el label según `tipoDocumento`.
2. **Formato tamaño archivo "0.00 MB"** para archivos pequeños (<1KB). Mostrar B/KB/MB según escala.
3. **Timeline con menos entradas de las esperadas** — algunas acciones (cambio simple de etapa) no generan actividad propia. Funcional OK pero la cuenta puede sorprender.
4. **`documentos.tipo='estudio_ahorro'`** para propuestas — interno BD, semánticamente cercano (Valere vende estudios) pero conceptualmente "propuesta" sería más claro. No visible al usuario, no afecta flujo.

## Permisos
- Carolina Aroca (`telemarketing`): ✅ solo "Captación", redirige `/cartera-senior` → `/captacion`
- Carolina Maciñeiras (`analista`): ✅ solo "Análisis facturas"
- Antonio Rodriguez (`asesor_senior`): ✅ Cartera senior + items de CRM Comercial; `/admin`→`/dashboard`, `/captacion`→`/cartera-senior`, `/analisis-captacion`→`/cartera-senior`; solo ve sus 2 casos en "Asignados a mí"
- Juan Olivares (`admin`+`asesor_senior`): ✅ acceso total como master

**Nota deuda conocida**: las policies del bucket Storage permiten SELECT a cualquier authenticated; cualquier user con función telemarketing/analista/asesor_senior/admin puede SELECT cualquier fila de `documentos` (no filtrado por oportunidad propia). Aceptado para MVP interno (4 personas que se conocen). Tightening cuando se amplíe equipo o se exponga a clientes externos. Documentado en `docs/AUDITORIA_SPRINT_CAPTACION_2026-05-04.md` y `docs/BACKLOG_PERMISOS_GRANULARES_2026-05-03.md`.

## Documentos
- Subida factura: ✅ OK (PDF/JPG/PNG <15MB, validación cliente, path determinístico, vinculación `factura_documento_id`, descarga URL firmada 1h)
- Descarga factura: ✅ OK
- Subida propuesta: ✅ OK (mismo patrón, `tipo='estudio_ahorro'`, vinculación `propuesta_documento_id`)
- Descarga propuesta: ✅ OK
- 1 huérfano de Storage queda por intento fallido pre-fix #5: `oportunidades/6a4e92f1-553f-4158-ac29-902b3c43d406/propuestas/20260504_1777904593724_propuesta_dummy.pdf` (312 bytes). Limpieza manual desde Supabase Dashboard.

## Decisión
**Onboarding interno: SÍ**

## Condiciones para onboarding
1. Resolver P1 selector UUID antes de la primera sesión real con Carolina A/M (no operativo verlo).
2. Comunicar a los 3 nuevos users (Antonio, Carolina M, Carolina A) las credenciales y el flujo.
3. Borrar el huérfano de Storage manualmente.
4. Limpiar leads de prueba (`TEST SMOKE *`) tras onboarding o al final de la primera semana de uso.

## Qué NO construir todavía (regla validada)
- SIPS / Datadis profundo
- Gmail API / Drive integración
- OCR / Validador automático de facturas
- CTI / Cadencias automáticas / Scoring
- Dashboards de gestión
- Portal cliente
- Plantillas/generación PDF de propuestas

Espera de feedback ≥1 semana de uso real antes de añadir cualquier feature.

## Próximo paso recomendado
1. Hotfix P1 selector UUID (30 min)
2. Crear/borrar huérfano Storage
3. Comunicar onboarding al equipo
4. Iniciar 1 semana de uso real, recoger feedback en `docs/FEEDBACK_USO_REAL.md`

---

**Frase guía vigente**:
> *El CRM ya puede ejecutar el flujo. Ahora hay que demostrar que el equipo lo puede usar sin volver a WhatsApp, Excel o email suelto.*
> — ChatGPT, dictamen 2026-05-04
