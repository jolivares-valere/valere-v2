import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './core/hooks/useAuth'
import AppShell from './components/layout/AppShell'
import LoginPage from './features/auth/LoginPage'
import DashboardPage from './features/dashboard/DashboardPage'
import EmpresasPage from './features/empresas/EmpresasPage'
import EmpresaDetailPage from './features/empresas/EmpresaDetailPage'
import ContactosPage from './features/contactos/ContactosPage'
import ContratosPage from './features/contratos/ContratosPage'
import ContratoDetailPage from './features/contratos/ContratoDetailPage'
import OportunidadesPage from './features/oportunidades/OportunidadesPage'
import ImportadorPage from './features/importador/ImportadorPage'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">
      Cargando...
    </div>
  )
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!session || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <AppShell>{children}</AppShell>
}

// Si ya hay sesion, redirige a la pagina previa o al dashboard.
// Centraliza la redireccion post-login en el router, reactiva al store.
function LoginRoute() {
  const { user, session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (session && user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
    return <Navigate to={from} replace />
  }
  return <LoginPage />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />

      <Route path="/" element={<AuthGuard><Navigate to="/dashboard" replace /></AuthGuard>} />
      <Route path="/dashboard" element={<AuthGuard><DashboardPage /></AuthGuard>} />

      <Route path="/empresas" element={<AuthGuard><EmpresasPage /></AuthGuard>} />
      <Route path="/empresas/:id" element={<AuthGuard><EmpresaDetailPage /></AuthGuard>} />

      <Route path="/contactos" element={<AuthGuard><ContactosPage /></AuthGuard>} />

      <Route path="/contratos" element={<AuthGuard><ContratosPage /></AuthGuard>} />
      <Route path="/contratos/:id" element={<AuthGuard><ContratoDetailPage /></AuthGuard>} />

      <Route path="/oportunidades" element={<AuthGuard><OportunidadesPage /></AuthGuard>} />

      <Route path="/importador" element={<AuthGuard><ImportadorPage /></AuthGuard>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}