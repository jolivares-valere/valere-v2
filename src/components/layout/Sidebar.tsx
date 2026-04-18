import { NavLink } from 'react-router-dom'
import { Activity, Building2, FileText, GitBranch, LayoutDashboard, Upload, Users } from 'lucide-react'
import { useAuth } from '../../core/hooks/useAuth'

const items = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/empresas', label: 'Empresas', icon: Building2 },
  { to: '/contactos', label: 'Contactos', icon: Users },
  { to: '/actividades', label: 'Actividades', icon: Activity },
  { to: '/contratos', label: 'Contratos', icon: FileText },
  { to: '/oportunidades', label: 'Oportunidades', icon: GitBranch },
  { to: '/importador', label: 'Importador', icon: Upload },
]

export default function Sidebar() {
  const { user, signOut } = useAuth()
  return (
    <aside className="flex h-screen w-60 flex-col border-r border-slate-200 bg-white">
      <div className="px-5 pb-3 pt-6">
        <h1 className="text-lg font-bold text-slate-900">Valere CRM</h1>
        <p className="text-xs text-slate-500">
          {user?.full_name ?? 'Usuario'} · {user?.role ?? '—'}
        </p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map(({ to, label, icon: Icon }) => (
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