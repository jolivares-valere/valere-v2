import { NavLink } from 'react-router-dom'
import {
  Activity, AlertTriangle, BarChart3, Building2, Calendar, FileText, FileUp, GitBranch,
  LayoutDashboard, RefreshCw, Send, ShieldCheck, Upload, Users, Zap
} from 'lucide-react'
import { useAuth } from '../../core/hooks/useAuth'

type Item = { to: string; label: string; icon: typeof LayoutDashboard; roles?: string[] }

const items: Item[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/empresas', label: 'Empresas', icon: Building2 },
  { to: '/contactos', label: 'Contactos', icon: Users },
  { to: '/actividades', label: 'Actividades', icon: Activity },
  { to: '/calendario', label: 'Calendario', icon: Calendar },
  { to: '/contratos', label: 'Contratos', icon: FileText },
  { to: '/oportunidades', label: 'Oportunidades', icon: GitBranch },
  { to: '/informes', label: 'Informes', icon: BarChart3 },
  { to: '/incidencias', label: 'Incidencias', icon: AlertTriangle },
  { to: '/renovaciones', label: 'Renovaciones', icon: RefreshCw },
  { to: '/importador', label: 'Importador', icon: Upload },
  { to: '/datos', label: 'Datos Energía', icon: FileUp },
  { to: '/analisis', label: 'Análisis', icon: BarChart3 },
  { to: '/propuestas-energia', label: 'Propuestas Energía', icon: Zap },
  { to: '/tracking', label: 'Seguimiento', icon: Send },
  { to: '/admin', label: 'Admin', icon: ShieldCheck, roles: ['master', 'manager'] },
]

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const visibleItems = items.filter(it => !it.roles || (user?.role && it.roles.includes(user.role)))
  return (
    <aside className="flex h-screen w-60 flex-col border-r border-slate-200 bg-white">
      <div className="px-5 pb-3 pt-6">
        <h1 className="text-lg font-bold text-slate-900">Valere CRM</h1>
        <p className="text-xs text-slate-500">
          {user?.full_name ?? 'Usuario'} · {user?.role ?? '—'}
        </p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={() => void signOut()}
          className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}