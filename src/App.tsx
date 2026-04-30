import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './core/hooks/useAuth'
import AppShell from './components/layout/AppShell'
import LoginPage from './features/auth/LoginPage'
import SignupPage from './features/auth/SignupPage'
import PendingApprovalPage from './features/auth/PendingApprovalPage'
import { ErrorBoundary } from './core/components/ErrorBoundary'

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
const PotenciasDashboardPage = lazy(() => import('./features/potencias/PotenciasDashboardPage'))
const ExpedientesPage = lazy(() => import('./features/potencias/ExpedientesPage'))
const ExpedienteDetailPage = lazy(() => import('./features/potencias/ExpedienteDetailPage'))
const ComunicacionesPage = lazy(() => import('./features/potencias/ComunicacionesPage'))
const InformesPotenciasPage = lazy(() => import('./features/potencias/InformesPotenciasPage'))
const DocumentacionPage = lazy(() => import('./features/potencias/DocumentacionPage'))
const ConfiguracionPotenciasPage = lazy(() => import('./features/potencias/ConfiguracionPotenciasPage'))
const SuministrosPotenciasPage = lazy(() => import('./features/potencias/SuministrosPotenciasPage'))
const InformesPage = lazy(() => import('./features/informes/InformesPage'))
const IncidenciasPage = lazy(() => import('./features/incidencias/IncidenciasPage'))
const RenovacionesPage = lazy(() => import('./features/renovaciones/RenovacionesPage'))
const CalendarioPage = lazy(() => import('./features/calendario/CalendarioPage'))
const AsistentePanel = lazy(() => import('./features/asistente-crm/AsistentePanel'))
const SeguimientoFVPage = lazy(() => import('./features/seguimiento-fv/SeguimientoFVPage'))
const DatadisPage = lazy(() => import('./features/datadis/DatadisPage'))
const SupplyDetailPage = lazy(() => import('./features/datadis/SupplyDetailPage'))

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
  if (profileLoaded && user.approved !== true) {
    return <Navigate to="/pending-approval" replace />
  }
  if (roles && !profileLoaded) return <LoadingScreen />
  if (roles && (!user.role || !roles.includes(user.role))) {
    return <Navigate to="/dashboard" replace />
  }
  return (
    <AppShell>
      <ErrorBoundary moduleName="esta seccion">
        <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
      </ErrorBoundary>
      <ErrorBoundary moduleName="el asistente">
        <Suspense fallback={null}>
          <AsistentePanel />
        </Suspense>
      </ErrorBoundary>
    </AppShell>
  )
}

function LoginRoute() {
  const { user, session, loading, profileLoaded } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (session && user) {
    if (profileLoaded && user.approved !== true) {
      return <Navigate to="/pending-approval" replace />
    }
    const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
    return <Navigate to={from} replace />
  }
  return <LoginPage />
}

function PendingApprovalRoute() {
  const { user, session, loading, profileLoaded } = useAuth()

  if (loading) return <LoadingScreen />
  if (!session || !user) {
    return <Navigate to="/login" replace />
  }
  if (profileLoaded && user.approved === true) {
    return <Navigate to="/dashboard" replace />
  }
  return <PendingApprovalPage />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/pending-approval" element={<PendingApprovalRoute />} />

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

      <Route path="/potencias" element={<AuthGuard><PotenciasDashboardPage /></AuthGuard>} />
      <Route path="/potencias/expedientes" element={<AuthGuard><ExpedientesPage /></AuthGuard>} />
      <Route path="/potencias/expedientes/:id" element={<AuthGuard><ExpedienteDetailPage /></AuthGuard>} />
      <Route path="/potencias/comunicaciones" element={<AuthGuard><ComunicacionesPage /></AuthGuard>} />
      <Route path="/potencias/informes" element={<AuthGuard><InformesPotenciasPage /></AuthGuard>} />
      <Route path="/potencias/documentacion" element={<AuthGuard><DocumentacionPage /></AuthGuard>} />
      <Route path="/potencias/configuracion" element={<AuthGuard><ConfiguracionPotenciasPage /></AuthGuard>} />
      <Route path="/potencias/suministros" element={<AuthGuard><SuministrosPotenciasPage /></AuthGuard>} />

      <Route path="/datos" element={<AuthGuard><DatosPage /></AuthGuard>} />
      <Route path="/analisis" element={<AuthGuard><AnalisisPage /></AuthGuard>} />
      <Route path="/propuestas-energia" element={<AuthGuard><PropuestasEnergiaPage /></AuthGuard>} />
      <Route path="/tracking" element={<AuthGuard><TrackingPage /></AuthGuard>} />
      <Route path="/seguimiento-fv" element={<AuthGuard><SeguimientoFVPage /></AuthGuard>} />
      <Route path="/datadis" element={<AuthGuard><DatadisPage /></AuthGuard>} />
      <Route path="/datadis/:cups" element={<AuthGuard><SupplyDetailPage /></AuthGuard>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
