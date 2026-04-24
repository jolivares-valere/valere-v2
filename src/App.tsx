import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './core/hooks/useAuth'
import AppShell from './components/layout/AppShell'
import LoginPage from './features/auth/LoginPage'

const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'))
const EmpresasPage = lazy(() => import('./features/empresas/EmpresasPage'))
const EmpresaDetailPage = lazy(() => import('./features/empresas/EmpresaDetailPage'))
const ContactosPage = lazy(() => import('./features/contactos/ContactosPage'))
const ContratosPage = lazy(() => import('./features/contratos/ContratosPage'))
const ContratoDetailPage = lazy(() => import('./features/contratos/ContratoDetailPage'))
const OportunidadesPage = lazy(() => import('./features/oportunidades/OportunidadesPage'))
const ImportadorPage = lazy(() => import('./features/importador/ImportadorPage'))
const ActividadesPage = lazy(() => import('./features/actividades/ActividadesPage'))
const AdminPage = lazy(() => import('./features/admin/AdminPage'))
const DatosPage = lazy(() => import('./features/datos/DatosPage'))
const AnalisisPage = lazy(() => import('./features/analisis/AnalisisPage'))
const PropuestasEnergiaPage = lazy(() => import('./features/propuestas-energia/PropuestasEnergiaPage'))
const TrackingPage = lazy(() => import('./features/tracking/TrackingPage'))
const InformesPage = lazy(() => import('./features/informes/InformesPage'))
const IncidenciasPage = lazy(() => import('./features/incidencias/IncidenciasPage'))
const RenovacionesPage = lazy(() => import('./features/renovaciones/RenovacionesPage'))
const CalendarioPage = lazy(() => import('./features/calendario/CalendarioPage'))
const AsistentePanel = lazy(() => import('./features/asistente-crm/AsistentePanel'))

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">
      Cargando...
    </div>
  )
}

function AuthGuard({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, session, loading, profileLoaded } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!session || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  // Cuando la ruta depende del rol, esperamos a que el perfil real se haya cargado
  // (bootstrapFromSession mete role='client' por defecto; sin esta espera un master
  // sería redirigido en el primer render).
  if (roles && !profileLoaded) return <LoadingScreen />
  if (roles && (!user.role || !roles.includes(user.role))) {
    return <Navigate to="/dashboard" replace />
  }
  return (
    <AppShell>
      <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
      {/* Asistente del CRM — widget flotante en todas las páginas autenticadas */}
      <Suspense fallback={null}>
        <AsistentePanel />
      </Suspense>
    </AppShell>
  )
}

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

      <Route path="/actividades" element={<AuthGuard><ActividadesPage /></AuthGuard>} />

      <Route path="/calendario" element={<AuthGuard><CalendarioPage /></AuthGuard>} />

      <Route path="/informes" element={<AuthGuard><InformesPage /></AuthGuard>} />

      <Route path="/incidencias" element={<AuthGuard><IncidenciasPage /></AuthGuard>} />

      <Route path="/renovaciones" element={<AuthGuard><RenovacionesPage /></AuthGuard>} />

      <Route path="/importador" element={<AuthGuard><ImportadorPage /></AuthGuard>} />

      <Route path="/admin" element={<AuthGuard roles={['master', 'manager']}><AdminPage /></AuthGuard>} />
      <Route path="/datos" element={<AuthGuard><DatosPage /></AuthGuard>} />
      <Route path="/analisis" element={<AuthGuard><AnalisisPage /></AuthGuard>} />
      <Route path="/propuestas-energia" element={<AuthGuard><PropuestasEnergiaPage /></AuthGuard>} />
      <Route path="/tracking" element={<AuthGuard><TrackingPage /></AuthGuard>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
