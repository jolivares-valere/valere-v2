import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { initTelemetry } from './core/utils/telemetry'
import './index.css'

// Telemetría ligera: errores no capturados, web vitals (FCP/LCP/TTFB) en buffer
// `window.__valereTelemetry`. Cuando exista la tabla `crm_telemetry`, este
// hook hará fire-and-forget a una Edge Function. Hoy ya sirve para QA local.
initTelemetry()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
