# Auditoría módulos CRM — 2026-06-12

Sprint domingo · Pulido módulos principales. Foco: ocho módulos en `src/features/`. NO se han tocado en esta auditoría módulos paralelos (analisis, propuestas-energia, esios/datadis, auth, admin/pending, dashboard, informes).

## Resumen ejecutivo

| Módulo         | Loading | Error visible | Empty state | Confirm destructivo | Validaciones formulario | Paginación/filtros | Hallazgos críticos |
|---|---|---|---|---|---|---|---|
| empresas       | OK plano | OK + retry | "Sin resultados" plano | Sí (wizard skip) | NIF normaliza, no valida; sin teléfono | Sí + filtro tipo + búsqueda | NIF se acepta inválido; teléfono libre; loading sin skeleton |
| contactos      | Skeleton | NO mostrado | Empty con CTA | Sí (delete) | Email zod; tel libre | NO paginación, NO filtros | Cargado completo; sin paginación con > 200 contactos |
| oportunidades  | Plano "Cargando…" | NO | NO (kanban sin guidance) | Cierre auto-dispara contrato sin confirm | Schema básico | NO | Sin loading skeleton, sin empty state, sin confirm al ganar |
| contratos      | Skeleton | NO mostrado | Empty con CTA | Sí (delete) | NIF libre, CUPS validateCUPS existe pero no usado en form | Filtro vencimiento, sin paginación | CUPS no validado en formulario; sin paginación |
| actividades    | Skeleton (rows) | NO | "Sin resultados" plano | Sí (delete) | Schema básico | Paginación 30 + filtros tipo | Faltan estados error/skeleton card; toggle tarea sin optimistic |
| calendario     | "Cargando eventos…" plano | NO | NO (grid vacío sin mensaje) | EventoForm hace borrado con confirm(window) | Schema básico | NO | window.confirm no consistente; sin error state |
| incidencias    | Skeleton | NO | Empty con CTA | Sí (delete) | Schema básico | Filtros estado/prioridad/tipo, sin paginación | Bien estructurado; falta error state |
| renovaciones   | Skeleton | NO | Empty con CTA | Sí (delete) | Schema básico | Filtros, sin paginación | Igual que incidencias; falta error state |

## Hallazgos transversales

1. **Error state de queries**: solo `EmpresasPage` lo muestra. El resto deja que React Query devuelva `undefined` y muestra "0 registros" sin pista de que hubo error de red/permiso.
2. **Sin componente `ErrorState` reutilizable** — cada página lo resolvería de manera distinta. Conviene crear uno único.
3. **`EmptyState` existe en `core/components/EmptyState.tsx` pero NO se usa en ninguno de los 8 módulos auditados**. Cada módulo tiene su propio markup ad-hoc.
4. **Validaciones de identificadores fiscales**: `normalizarNIF()` solo limpia caracteres, no aplica el algoritmo oficial de letra de control. `validateCUPS()` solo regex de formato (no dígito control real). Cualquiera teclea "B12345678" mal formado y pasa.
5. **Optimistic updates**: la única mutación que cierra-y-vuelve rápido sin optimistic es `useToggleTareaCompletada` en actividades. Se siente lenta tras click.
6. **Confirmaciones destructivas**: bien resueltas con `ConfirmDialog` excepto:
   - `EventoForm.tsx` (calendario) usa `window.confirm` nativo.
   - El paso "cerrar oportunidad ganada" dispara creación automática de contrato sin advertir al usuario.
   - No hay confirm para "anular contrato" (cambiar estado a `anulado`).
7. **Paginación**: solo empresas y actividades. Si contactos, contratos, incidencias o renovaciones crecen > 200 filas el render se ralentiza.
8. **Accesibilidad**:
   - aria-labels presentes en botones de acción de tabla (✅).
   - Los focus rings nativos están suprimidos en algunos inputs con `focus:outline-none` sin reemplazo explícito (riesgo de fallo WCAG).
   - `dialog` con `role="dialog"` solo en wizard de empresas; los side panels son `div` sin role.
9. **Telemetría existente**: `core/utils/telemetry.ts` ya inicializa LCP/FCP/TTFB y captura errores no manejados, pero solo bufferea en memoria. NO se envía a backend. No traza cambios de ruta automáticamente.
10. **ErrorBoundary**: muy básico — muestra `error.message` directo (riesgo en prod), sin reset por ruta, sin reportar.

## Bugs funcionales detectados (NO se arreglan en este sprint — registrar)

- **Oportunidades · drop a `cerrada_ganada` auto-crea contrato silenciosamente** (`OportunidadesPage.tsx:74`). Riesgo de duplicados si el comercial drag-drop sin querer.
- **Contratos · CUPS no validado en formulario** — se acepta cualquier string. `validateCUPS()` existe en `core/utils/energy.ts` pero el form no lo invoca.
- **Calendario · `EventoForm.tsx` usa `window.confirm` para borrar evento** — inconsistente con el resto del CRM.
- **Contactos `useContactos` carga lista completa sin paginación** — verificar `api.ts` ; en cuentas reales con > 500 contactos el frontend lo sufrirá.

## Plan de pulido aplicado en este sprint

1. **Crear `ErrorState`, `FieldError`, validadores `validateNIF/validateCIF/validateTelefonoES` + `validateCUPS` reforzado**.
2. **Aplicar `<ErrorState/>` consistente en todas las queries** (al menos en los 4 módulos que faltan: oportunidades, calendario, incidencias, renovaciones; y los demás que también lo necesitan en su query principal).
3. **Validar NIF/CIF en `EmpresaForm`, teléfono donde haya, CUPS en `ContratoForm`**.
4. **Confirm dialog ANTES de auto-crear contrato al cerrar oportunidad ganada**.
5. **Reemplazar `window.confirm` en `EventoForm` por `ConfirmDialog`**.
6. **Optimistic update en `useToggleTareaCompletada`**.
7. **Telemetría con backend**: nueva tabla `client_telemetry` + Edge Function `client-telemetry-ingest` + tracking de rutas/queries Supabase. Pantalla `/admin/telemetria`.
8. **ErrorBoundary mejorado**: reset por ruta, botón reportar, mensaje enmascarado en prod, correlation id.
9. **Smoke tests sintéticos** para cada módulo tocado.

## Fuera de scope (registrar en docs/PULIDO_MODULOS_2026-06-12.md)

- Paginación en contactos/contratos/incidencias/renovaciones — requiere refactor api.ts en cada uno; lo dejamos a un sprint dedicado.
- Virtual scroll: ningún módulo lo necesita aún en producción real (volúmenes < 200).
- Reemplazo de focus-outline supresso → tokens accesibles. Es un cambio de design tokens (territorio de Agente 3 Design).
- Refactor side panels a `role="dialog"` con focus trap completo — mejora a/11y futura.
- Migración tabla `users_profile` → `user_profiles` (ya en CLAUDE.md, fuera de este sprint).
