# Sesión 2026-04-29 noche — Bugs críticos + mejoras ExpedienteDetail

## Commits
- `3614d96` — feat(potencias): SuministrosPotenciasPage + tipos Cups completos
- `a3d4a21` — fix: dashboard 0-clientes + asistente 500 + ExpedienteDetail mejoras

## Bugs corregidos

### 1. Dashboard Potencias — 0 Clientes activos / 0 CUPS activos
**Causa**: `useSupabaseQuery` usaba `.filter('deleted_at', 'eq', null)`. En PostgREST,
`eq.null` no hace `IS NULL` — devuelve 0 filas.
**Fix**: en el bucle de filtros, cuando `value === null` usar `.is(column, null)`.
Todos los componentes que filtran `deleted_at` (empresas, cups, expedientes, etc.) 
se benefician automáticamente.

### 2. Asistente RAG — 500 al hacer preguntas
**Causa**: `gemini-2.5-flash` es un thinking model. Su getter `.result.text` lanza
una excepción cuando la respuesta incluye partes de razonamiento (`thought`). El 
operador `??` no captura excepciones, así que el error subía al catch → 500.
Además, el catch devolvía 500, y el SDK de Supabase JS descarta el body en 500
→ el cliente nunca recibía el mensaje de error amigable.
**Fix doble**:
- `ai-adapter.ts`: 3 intentos de extracción de texto (`.text`, `candidates[0].content.parts` 
  filtrando `thought`, `.response.text()`). Desplegado como `ask-crm-docs` v18.
- `index.ts`: catch devuelve 200 en lugar de 500.

### 3. Archivos truncados (NTFS sandbox bug)
**Causa**: el sandbox Linux trunca archivos NTFS al editar si el contenido cambia de tamaño.
`App.tsx`, `Sidebar.tsx`, `EmpresaDetailPage.tsx` estaban incompletos.
**Fix**: restaurar desde `git show HEAD:archivo` + reescribir con Python.

## Mejoras entregadas

### ExpedienteDetailPage — edición inline + nuevo ciclo
- **Edición inline de solicitud**: botón ✏️ en cada CicloCard abre formulario con
  `ref_solicitud_distribuidora`, `fecha_solicitud_enviada`, `fecha_autorizacion`,
  `fecha_ejecucion_real`, `notas_internas`. Guarda con `.update()` en `solicitudes_potencia`.
- **Botón "Nuevo ciclo"**: aparece cuando `ultimo_ciclo.estado === 'completado'` y
  `ciclos.length < max_ciclos_permitidos`. Crea ciclo + solicitud_potencia de bajada
  usando las potencias nuevas del ciclo anterior como "actuales".

## Pendientes de Juan
- Registrar en Datadis como terciario (para integración API Datadis)
- Configurar `RESEND_API_KEY` en Supabase Edge Functions Secrets
- Guardar `FV_ENCRYPTION_KEY` en 1Password
- Añadir credenciales primer cliente FV (ver scripts/fv-sync/README.md)
