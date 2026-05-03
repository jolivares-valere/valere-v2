import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { initTelemetry } from './core/utils/telemetry'
import { initSentry, getReactErrorHandler } from './core/utils/sentry'
import './index.css'

// Telemetría ligera: errores no capturados, web vitals (FCP/LCP/TTFB) en buffer
// `window.__valereTelemetry`. Cuando exista la tabla `crm_telemetry`, este
// hook hará fire-and-forget a una Edge Function. Hoy ya sirve para QA local.
initTelemetry()

// Sentry: lazy. No-op si VITE_SENTRY_DSN no está definido.
// Se inicializa antes de montar React para registrar onUncaughtError/onRecoverableError
// del createRoot de React 19. La carga es no-bloqueante: si tarda, React monta primero
// y los handlers se registran sin Sentry hasta que initSentry resuelva.
void initSentry()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const sentryErrorHandler = getReactErrorHandler()

ReactDOM.createRoot(document.getElementById('root')!, {
  onUncaughtError: sentryErrorHandler,
  onRecoverableError: sentryErrorHandler,
}).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
