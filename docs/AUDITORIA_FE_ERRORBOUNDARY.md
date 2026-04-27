# Auditoría — `ErrorBoundary` global

> Sprint domingo lane 2 — 2026-04-26 (Cowork)
> Archivo auditado: `src/core/components/ErrorBoundary.tsx`
> Consumidor: `src/App.tsx` (dos instancias)

## TL;DR

El `ErrorBoundary` actual es **correcto y suficiente para el 80% de los crashes de UI**. Cubre lo que la API de React permite cubrir: errores síncronos durante el render, ciclo de vida y constructor de cualquier descendiente. No cubre handlers, código async, SSR ni errores arrojados por sí mismo — esos deben absorberlos `telemetry.ts` (window.error + unhandledrejection) o `try/catch` locales en los handlers.

## Implementación actual

```tsx
class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, errorInfo) { console.error(...) }
  render() { return hasError ? <FallbackUI/> : children }
}
```

Hooks de React aplicados:
- `getDerivedStateFromError` → marca el árbol como roto y dispara re-render del fallback.
- `componentDidCatch` → side-effect de logging (sólo `console.error` por ahora).

UI de fallback: tarjeta centrada con icono, mensaje, `error.message` en `<pre>`, botón "Reintentar" que resetea `hasError`.

Wiring en `App.tsx`:
- `<ErrorBoundary moduleName="esta sección">` envuelve el `<Suspense>` con la página activa.
- `<ErrorBoundary moduleName="el asistente">` envuelve `<AsistentePanel />` por separado — si el asistente RAG cae, no tira la página.

## Casos sintéticos cubiertos (tests mentales)

### ✅ Captura — funciona

| Escenario | Resultado | Justificación |
|---|---|---|
| Componente descendiente lanza `throw` en su `render()` | Fallback se muestra con `error.message` | `getDerivedStateFromError` recibe el error |
| Hijo lanza en `componentDidMount` (clase) o `useEffect` síncrono | Fallback | Mismo flujo via React reconciler |
| Hook que lanza durante el primer render (ej. `useQuery({ throwOnError: true })`) | Fallback | React arroja el error como render-time |
| Crash en hijo de `<Suspense>` durante el resolve | Fallback | Suspense delega errores al boundary más cercano |
| Crash dentro del `AsistentePanel` | Sólo cae el asistente, página principal sigue viva | Boundaries anidados independientes |
| Botón "Reintentar" tras un crash transitorio | Re-render limpio del subárbol | `setState({ hasError:false })` revisita children |

### ❌ NO captura — limitaciones conocidas de React

| Escenario | Comportamiento | Quién debe capturarlo |
|---|---|---|
| Error dentro de un `onClick` / event handler | El error escapa al `window.error` y no actualiza `hasError` | `try/catch` local + `telemetry.ts` (window.error) |
| `Promise` rechazada en `useEffect` async sin await/catch | `unhandledrejection` global | `telemetry.ts` (unhandledrejection) ✓ |
| `setTimeout`/`setInterval` que lanza | `window.error` global | `telemetry.ts` ✓ |
| Crash en el propio `ErrorBoundary.render()` o en su `<FallbackUI>` | Se propaga al boundary superior; si no hay → pantalla en blanco | Mantener fallback simple (lo está) |
| SSR / hidratación — N/A | El proyecto es 100% SPA Vite, no aplica | — |

## Riesgos / Mejoras sugeridas (no bloqueantes)

1. **`componentDidCatch` sólo loguea a consola.** Cuando exista la tabla `crm_telemetry` (sprint pendiente), encadenar:
   ```tsx
   componentDidCatch(error, errorInfo) {
     console.error(...)
     // futuro:
     emitTelemetry({ kind: 'react_boundary', message, stack, componentStack })
   }
   ```
   Hoy se loguea por consola y `window.error` lo recoge — duplicación aceptable.

2. **El botón "Reintentar" solo limpia el state local.** Si el crash es por datos corruptos en una query cacheada de React Query, recargar el subárbol no ayuda. Considerar exponer un `onReset` opcional desde props para limpiar la query relevante.

3. **Falta `key` reset.** Patrón típico: pasar una `resetKey` al boundary y, cuando cambia, resetear hasError automáticamente. Útil para reset al cambiar de ruta. Propuesta para sprint futuro:
   ```tsx
   componentDidUpdate(prevProps) {
     if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
       this.setState({ hasError: false, error: null })
     }
   }
   ```
   Y desde App.tsx: `<ErrorBoundary resetKey={location.pathname}>...`

4. **Errores en `<AsistentePanel />` no se notifican al usuario** (no aparece toast cuando el asistente cae). Aceptable porque el panel es accesorio, pero documentado aquí.

5. **El `error.message` se muestra al usuario.** En desarrollo está bien, en prod podría exponer detalles internos (rutas, tokens en stack traces). Considerar enmascarar en build prod:
   ```tsx
   {!import.meta.env.PROD && error && <pre>{error.message}</pre>}
   ```

## Cobertura de defensas combinada

```
┌──────────── Render error ────────────┐  → ErrorBoundary (✓)
┌──────── Async / handler error ───────┐  → telemetry.window.error (✓)
┌─────── Promise rejection global ─────┐  → telemetry.unhandledrejection (✓)
┌──────── Edge Function failure ───────┐  → toast.error en cada hook (✓ en useDatadis, useAutomatizaciones, useSupabaseQuery)
```

Conclusión: la red está sana. Las mejoras 1–5 quedan como deuda cosmética/observabilidad, no bloqueantes.

## Verificación recomendada (manual, no automatizable hoy)

Antes del sprint de RLS hardening, simular en localhost:
1. `throw new Error('test')` en `DashboardPage` → debe verse fallback "esta sección".
2. `throw` en handler de un botón → fallback NO debe aparecer; se ve `[ErrorBoundary]` en consola desde `telemetry.ts`.
3. `Promise.reject(new Error('async'))` sin catch en un useEffect → idem, debe aparecer en `window.__valereTelemetry`.
4. `throw` en el render del AsistentePanel → debe ver fallback "el asistente"; el resto de la página opera con normalidad.
