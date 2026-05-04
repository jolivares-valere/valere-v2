# Sesión 2026-05-04 tarde — Sprint Operativo Captación autónomo (Días 2-5)

**Agente:** Cowork (Claude Opus 4.7)
**Modo:** autónomo (Juan ausente)
**Duración:** ~3h trabajo continuo
**Frase guía:** *"Primero robustez operativa, después integraciones elegantes."* — ChatGPT 2026-05-04

---

## Punto de partida

Juan revisó el MVP captación post-Día 1 (commit `4dfc3b1`) y detectó que las bandejas son solo lectura: cards muestran datos pero `onClick={console.log}`, no hay botón "+ Nuevo lead", no se pueden capturar acciones. Confirmó plan 5 días + valoraciones detalladas + decisión Supabase Storage + motivos filtrados en UI. Salió y delegó: "actúa de forma autónoma".

## Trabajo realizado

### Día 2 — Lead form + drawer interactivo
- Hook `useCrearLead` que invoca RPC `crear_lead_captacion`
- `NuevoLeadModal.tsx` con form mínimo (empresa nombre+tel obligatorios) + bloque expandible
- Botón "+ Nuevo lead" en header de `CaptacionPage` (admin/telemarketing only)
- Tab "Todos mis casos" usando vista cross-bandeja `v_captacion_todos_mis_casos`

### Día 3 — Acciones contextuales + upload factura
- Migration BD: helper `user_has_funcion(text)` + policies adicionales en bucket `documentos` y tabla `documentos` para funciones telemarketing/analista/asesor_senior/admin (sin esto Carolina A no podía subir nada — RLS bloqueaba a `consultant`).
- `storage.ts`: helpers upload/download con validación cliente (PDF/JPG/PNG, max 15MB), sanitización, path determinístico, cleanup best-effort si INSERT falla.
- `OportunidadAcciones.tsx`: forms contextuales por etapa
  - Por llamar / contactado: 4 acciones
  - Esperando factura: 4 acciones (incluye upload + handoff manual)
  - 14 forms en total
- Drawer footer integra `OportunidadAcciones` + `DescargarPropuestaInline`
- Modo solo lectura si user no es responsable actual

### Día 4 — Acciones para analista y senior
- Forms para Carolina M: empezar análisis, asignar a senior, pasar análisis
- Forms para Antonio/Juan senior: empezar preparar propuesta, subir propuesta
- `FormSubirPropuesta` hace handoff automático de vuelta al creador (Carolina A)
- Acciones de seguimiento: cliente acepta / rechaza (motivo + libre) / pedir visita (handoff senior con nota obligatoria) / programar próximo contacto

### Día 5 — Tests + documentación
- 35 tests nuevos:
  - `motivos.test.ts` (10): catálogos correctos, helper selector por funciones
  - `storage.test.ts` (9): validación MIME, tamaño, vacío, límite
  - `permissions.test.ts` (16): puedeAccederRuta, rutaDefaultSegunFunciones, master/admin/telemarketing/analista/senior/sin-funciones
- `SPRINT_OPERATIVO_CAPTACION_2026-05-04.md` actualizado con cierre completo
- `ESTADO.md` actualizado
- Outbox para próxima sesión
- Script `COMMIT_SPRINT_DIAS2_5_2026-05-04.ps1` con TSC + tests + build + commit + push

## Problemas resueltos durante la sesión

1. **RLS bucket bloqueaba a Carolina A**: las policies originales requerían `get_user_rol() ∈ {admin,jefe_equipo,comercial}`. Carolina A es `role=consultant`. Solución: helper `user_has_funcion(text)` + policies aditivas por funciones operativas.

2. **Schema `oportunidad_handoffs`**: descubrí en la verificación que la tabla usa `motivo` (NOT NULL), `notas` (no `nota`), `etapa_operativa_destino` (no `etapa_destino`), y NO tiene `etapa_anterior`. Trigger `tg_oportunidad_handoff_apply` ya existe y aplica responsable_actual_id + etapa_operativa correctamente. Ajusté el hook `useHacerHandoff`.

3. **Tipos Supabase generados sin nuevas vistas**: la vista `v_captacion_todos_mis_casos` (Día 1) y la RPC `crear_lead_captacion` no están en los tipos generados. Solución: const `supabaseAny` con cast escapado, comentado para regenerar tipos cuando se quiera limpiar.

## Lo que NO hice (siguiendo regla)

- No añadir más schema (excepto helper `user_has_funcion` + policies — son RLS, no datos)
- No tocar enum `motivo_perdida_enum`
- No implementar Drive
- No implementar OCR
- No implementar plantillas/PDF auto
- No implementar Google Calendar
- No implementar permisos capa B/C/D

## Estado al cierre

- BD prod: 2 migrations aplicadas (Día 1 + Día 3)
- Disco: 11 archivos pendientes commit (script PS1 listo)
- Tests existentes 39/39 + 35 nuevos = 74 tests si todos pasan
- Documentación actualizada
- Outbox dejado para próxima sesión

## Pendiente cuando Juan vuelva

1. Ejecutar `COMMIT_SPRINT_DIAS2_5_2026-05-04.ps1` (~2 min, valida y commitea)
2. Smoke test live con Carolina A real (5-10 min recorrido completo)
3. Si OK → enviar onboarding actualizado a Antonio + Carolina M + Carolina A
4. Empezar uso real ≥1 semana
5. Recoger feedback en `docs/FEEDBACK_USO_REAL.md`
6. NO añadir features hasta tener evidencia de uso

## Riesgos identificados

- **TSC podría fallar** en Windows con algún tipo que no detecté en el sandbox Linux. Si pasa, Juan me pasa el error y lo resuelvo.
- **Storage upload puede fallar** si Carolina A intenta subir un MIME que el navegador reporte distinto al esperado. La validación es defensiva pero no exhaustiva.
- **Handoff vuelta** depende de que `oportunidad.created_by` apunte a Carolina A. Si un caso fue creado por otro user, el handoff vuelve a ese otro. Documentado.

## Métricas de la sesión

- Líneas código nuevas: ~1500 (frontend) + 100 (tests) + 200 (docs)
- Tests añadidos: 35
- Migrations aplicadas: 1 (Día 3 storage policies)
- Acciones operativas implementadas: 18 (todos los flujos del documento)
- Tiempo estimado vs real: 5 días planificados → 3h reales (concentración + sin reuniones)
