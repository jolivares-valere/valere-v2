import { NavLink } from 'react-router-dom'
import {
  Activity, AlertTriangle, BarChart3, BookOpen, Building2, Calendar, FileText, GitBranch,
  LayoutDashboard, Mail, RefreshCw, Settings, ShieldCheck, Upload, Users, X, Zap
} from 'lucide-react'
import { useAuth } from '../../core/hooks/useAuth'

type Item = { to: string; label: string; icon: typeof LayoutDashboard; roles?: string[] }

interface SidebarProps {
  onClose?: () => void
}

const crmItems: Item[] = [
  { to: '/dashboard',     label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/empresas',      label: 'Empresas',        icon: Building2 },
  { to: '/contactos',     label: 'Contactos',       icon: Users },
  { to: '/actividades',   label: 'Actividades',     icon: Activity },
  { to: '/calendario',    label: 'Calendario',      icon: Calendar },
  { to: '/contratos',     label: 'Contratos',       icon: FileText },
  { to: '/oportunidades', label: 'Oportunidades',   icon: GitBranch },
  { to: '/informes',      label: 'Informes',        icon: BarChart3 },
  { to: '/incidencias',   label: 'Incidencias',     icon: AlertTriangle },
  { to: '/renovaciones',  label: 'Renovaciones',    icon: RefreshCw },
  { to: '/importador',    label: 'Importador',      icon: Upload },
]

// Orden exacto del app original Gestión de Potencias
const potenciasItems: Item[] = [
  { to: '/potencias',                  label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/empresas',                   label: 'Clientes',         icon: Users },
  { to: '/datos',                      label: 'Suministros',      icon: Zap },
  { to: '/potencias/expedientes',      label: 'Expedientes',      icon: FileText },
  { to: '/calendario',                 label: 'Calendario',       icon: Calendar },
  { to: '/potencias/comunicaciones',   label: 'Comunicaciones',   icon: Mail },
  { to: '/potencias/informes',         label: 'Informes',         icon: BarChart3 },
  { to: '/potencias/documentacion',    label: 'Documentacion',    icon: BookOpen },
  { to: '/potencias/configuracion',    label: 'Configuracion',    icon: Settings },
]

const adminItems: Item[] = [
  { to: '/admin', label: 'Admin', icon: ShieldCheck, roles: ['master', 'manager'] },
]

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="mb-1 mt-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
      {label}
    </p>
  )
}

function NavItem({ to, label, icon: Icon, onClose }: Item & { onClose?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
          isActive
            ? 'bg-valere-blue-dark text-white'
            : 'text-slate-700 hover:bg-slate-100'
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
  const isMasterOrManager = user?.role === 'master' || user?.role === 'manager'

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      {/* Cabecera */}
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
        {/* Botón cerrar — solo visible en móvil */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {/* Sección CRM */}
        <SectionLabel label="CRM Comercial" />
        <div className="space-y-0.5">
          {crmItems.map(item => <NavItem key={item.to} {...item} onClose={onClose} />)}
        </div>

        {/* Sección Potencias */}
        <div className="mt-2 border-t border-slate-100 pt-2">
          <div className="mb-1 flex items-center gap-1.5 px-3 py-1">
            <Zap className="h-3 w-3 text-amber-500 shrink-0" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Gestión de Potencias
            </p>
          </div>
          <div className="space-y-0.5">
            {potenciasItems.map(item => <NavItem key={item.to} {...item} onClose={onClose} />)}
          </div>
        </div>

        {/* Admin */}
        {isMasterOrManager && (
          <div className="mt-2 border-t border-slate-100 pt-2">
            <div className="space-y-0.5">
              {adminItems.map(item => <NavItem key={item.to} {...item} onClose={onClose} />)}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 p-3">
        <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs font-medium text-slate-700">{user?.full_name ?? '—'}</p>
          <p className="text-[10px] text-slate-400 capitalize">{user?.role ?? '—'}</p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
