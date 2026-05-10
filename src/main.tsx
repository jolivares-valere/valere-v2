import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { initTelemetry } from './core/utils/telemetry'
import { initSentry, getReactErrorHandler } from './core/utils/sentry'
import { DemoBanner } from './core/demo/DemoBanner'
import './index.css'

initTelemetry()
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
      <DemoBanner />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
