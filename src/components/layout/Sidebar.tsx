import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Activity, AlertTriangle, BarChart3, BookOpen, Building2, Calendar, ChevronDown,
  FileText, GitBranch, LayoutDashboard, Mail, RefreshCw, Settings, ShieldCheck,
  Upload, Users, X, Zap
} from 'lucide-react'
import { useAuth } from '../../core/hooks/useAuth'

type Item = { to: string; label: string; icon: typeof LayoutDashboard; roles?: string[] }
interface SidebarProps { onClose?: () => void }

const crmItems: Item[] = [
  { to: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/empresas',      label: 'Empresas',      icon: Building2 },
  { to: '/contactos',     label: 'Contactos',     icon: Users },
  { to: '/actividades',   label: 'Actividades',   icon: Activity },
  { to: '/calendario',    label: 'Calendario',    icon: Calendar },
  { to: '/contratos',     label: 'Contratos',     icon: FileText },
  { to: '/oportunidades', label: 'Oportunidades', icon: GitBranch },
  { to: '/informes',      label: 'Informes',      icon: BarChart3 },
  { to: '/incidencias',   label: 'Incidencias',   icon: AlertTriangle },
  { to: '/renovaciones',  label: 'Renovaciones',  icon: RefreshCw },
  { to: '/importador',    label: 'Importador',    icon: Upload },
]

const potenciasItems: Item[] = [
  { to: '/potencias',                label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/empresas',                 label: 'Clientes',       icon: Users },
  { to: '/datos',                    label: 'Suministros',    icon: Zap },
  { to: '/potencias/expedientes',    label: 'Expedientes',    icon: FileText },
  { to: '/calendario',               label: 'Calendario',     icon: Calendar },
  { to: '/potencias/comunicaciones', label: 'Comunicaciones', icon: Mail },
  { to: '/potencias/informes',       label: 'Informes',       icon: BarChart3 },
  { to: '/potencias/documentacion',  label: 'Documentacion',  icon: BookOpen },
  { to: '/potencias/configuracion',  label: 'Configuracion',  icon: Settings },
]

const adminItems: Item[] = [
  { to: '/admin', label: 'Admin', icon: ShieldCheck, roles: ['master', 'manager'] },
]

function NavItem({ to, label, icon: Icon, onClose }: Item & { onClose?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
          isActive ? 'bg-valere-blue-dark text-white' : 'text-slate-700 hover:bg-slate-100'
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </NavLink>
  )
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const isMasterOrManager = user?.role === 'master' || user?.role === 'manager'

  const isPotenciasActive =
    location.pathname === '/potencias' ||
    location.pathname.startsWith('/potencias/')

  const [potenciasOpen, setPotenciasOpen] = useState(isPotenciasActive)

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center px-5 pb-3 pt-6">
        <div className="flex flex-1 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-valere-blue-dark">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">Valere CRM</h1>
            <p className="text-[10px] text-slate-400 leading-tight">{user?.full_name ?? 'Usuario'}</p>
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden" aria-label="Cerrar menu">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="mb-1 mt-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">CRM Comercial</p>
        <div className="space-y-0.5">
          {crmItems.map(item => <NavItem key={item.to} {...item} onClose={onClose} />)}
        </div>

        <div className="mt-2 border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={() => setPotenciasOpen(o => !o)}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              isPotenciasActive ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Zap className="h-4 w-4 shrink-0 text-amber-500" />
            <span className="flex-1 text-left">Gestion de Potencias</span>
            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${potenciasOpen ? 'rotate-180' : ''}`} />
          </button>
          {potenciasOpen && (
            <div className="mt-1 space-y-0.5 pl-2">
              {potenciasItems.map(item => <NavItem key={item.to + item.label} {...item} onClose={onClose} />)}
            </div>
          )}
        </div>

        {isMasterOrManager && (
          <div className="mt-2 border-t border-slate-100 pt-2">
            <div className="space-y-0.5">
              {adminItems.map(item => <NavItem key={item.to} {...item} onClose={onClose} />)}
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs font-medium text-slate-700">{user?.full_name ?? 'Sin nombre'}</p>
          <p className="text-[10px] text-slate-400 capitalize">{user?.role ?? 'sin rol'}</p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          Cerrar sesion
        </button>
      </div>
    </aside>
  )
}
