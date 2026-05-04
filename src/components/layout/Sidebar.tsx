import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Activity, AlertTriangle, BarChart3, BookOpen, Briefcase, Building2, Calendar, ChevronDown,
  ChevronLeft, ChevronRight, Database, FileSearch, FileText, GitBranch, LayoutDashboard, Mail,
  PhoneCall, RefreshCw, Settings, ShieldCheck, Sun, Upload, Users, X, Zap
} from 'lucide-react'
import { useAuth } from '../../core/hooks/useAuth'

type Item = { to: string; label: string; icon: typeof LayoutDashboard; roles?: string[] }

interface SidebarProps {
  onClose?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

const crmItems: Item[] = [
  { to: '/dashboard',      label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/empresas',       label: 'Empresas',      icon: Building2 },
  { to: '/contactos',      label: 'Contactos',     icon: Users },
  { to: '/actividades',    label: 'Actividades',   icon: Activity },
  { to: '/calendario',     label: 'Calendario',    icon: Calendar },
  { to: '/contratos',      label: 'Contratos',     icon: FileText },
  { to: '/oportunidades',  label: 'Oportunidades', icon: GitBranch },
  { to: '/informes',       label: 'Informes',      icon: BarChart3 },
  { to: '/incidencias',    label: 'Incidencias',   icon: AlertTriangle },
  { to: '/renovaciones',   label: 'Renovaciones',  icon: RefreshCw },
  { to: '/importador',     label: 'Importador',    icon: Upload },
  { to: '/seguimiento-fv', label: 'Plantas FV',    icon: Sun },
  { to: '/datadis',        label: 'Datadis',       icon: Database },
]

const captacionItems: Item[] = [
  { to: '/captacion',       label: 'Captación',    icon: PhoneCall, roles: ['telemarketing', 'admin'] },
  { to: '/analisis-captacion', label: 'Análisis facturas', icon: FileSearch, roles: ['analista', 'admin'] },
  { to: '/cartera-senior',  label: 'Cartera senior', icon: Briefcase, roles: ['asesor_senior', 'admin'] },
]

const potenciasItems: Item[] = [
  { to: '/potencias',                label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/empresas',                 label: 'Clientes',       icon: Users },
  { to: '/potencias/suministros',    label: 'Suministros',    icon: Zap },
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

function NavItem({ to, label, icon: Icon, onClose, collapsed }: Item & { onClose?: () => void; collapsed?: boolean }) {
  return (
    <NavLink
      to={to}
      onClick={onClose}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
          collapsed ? 'justify-center px-2' : ''
        } ${isActive ? 'bg-valere-blue-dark text-white' : 'text-slate-700 hover:bg-slate-100'}`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && label}
    </NavLink>
  )
}

export default function Sidebar({ onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const isMasterOrManager = user?.role === 'master' || user?.role === 'manager'

  const userFunciones = user?.funciones ?? []
  const isAdmin = userFunciones.includes('admin') || user?.role === 'master'
  const hasCaptacionAccess =
    userFunciones.includes('telemarketing') ||
    userFunciones.includes('analista') ||
    userFunciones.includes('asesor_senior') ||
    isAdmin

  // Capa A — bloques completos visibles solo a admin/asesor_senior.
  // Telemarketing y analista NO ven CRM Comercial ni Potencias en sidebar.
  const showCrmComercial = isAdmin || userFunciones.includes('asesor_senior')
  const showPotencias    = isAdmin // Potencias es módulo aparte; por ahora solo admin

  const isPotenciasActive =
    location.pathname === '/potencias' ||
    location.pathname.startsWith('/potencias/')

  const [potenciasOpen, setPotenciasOpen] = useState(isPotenciasActive)

  return (
    <aside
      className={`flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Cabecera */}
      <div className={`flex items-center border-b border-slate-100 px-3 pb-3 pt-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-valere-blue-dark">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">Valere CRM</h1>
              <p className="text-[10px] text-slate-400 leading-tight truncate">{user?.full_name ?? 'Usuario'}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-valere-blue-dark">
            <Zap className="h-4 w-4 text-white" />
          </div>
        )}
        <div className="flex items-center gap-1">
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title={collapsed ? 'Expandir menu' : 'Colapsar menu'}
              className="hidden lg:flex rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
              aria-label="Cerrar menu"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navegacion */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {/* Bloque CRM Comercial — solo admin/asesor_senior (Capa A permisos) */}
        {showCrmComercial && (
          <>
            {!collapsed && (
              <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                CRM Comercial
              </p>
            )}
            {collapsed && <div className="mb-1 mx-auto h-px w-8 bg-slate-200" />}
            <div className="space-y-0.5">
              {crmItems.map(item => (
                <NavItem key={item.to} {...item} onClose={onClose} collapsed={collapsed} />
              ))}
            </div>
          </>
        )}

        {/* Seccion Captacion */}
        {hasCaptacionAccess && (
          <div className="mt-2 border-t border-slate-100 pt-2">
            {!collapsed && (
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Captación
              </p>
            )}
            <div className="space-y-0.5">
              {captacionItems.map(item => {
                const roles = item.roles ?? []
                const itemVisible = roles.length === 0 || roles.some(r => userFunciones.includes(r))
                return itemVisible ? (
                  <NavItem key={item.to} {...item} onClose={onClose} collapsed={collapsed} />
                ) : null
              })}
            </div>
          </div>
        )}

        {/* Seccion Potencias — solo admin (Capa A permisos) */}
        {showPotencias && (
          <div className="mt-2 border-t border-slate-100 pt-2">
            {collapsed ? (
              <NavLink
                to="/potencias"
                onClick={onClose}
                title="Gestion de Potencias"
                className={({ isActive }) =>
                  `flex items-center justify-center rounded-xl px-2 py-2 transition-colors ${
                    isActive || isPotenciasActive
                      ? 'bg-amber-50 text-amber-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Zap className="h-4 w-4 text-amber-500" />
              </NavLink>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setPotenciasOpen(o => !o)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    isPotenciasActive ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Zap className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className="flex-1 text-left">Gestion de Potencias</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                      potenciasOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {potenciasOpen && (
                  <div className="mt-1 space-y-0.5 pl-2">
                    {potenciasItems.map(item => (
                      <NavItem key={item.to + item.label} {...item} onClose={onClose} collapsed={false} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Admin */}
        {isMasterOrManager && (
          <div className="mt-2 border-t border-slate-100 pt-2">
            <div className="space-y-0.5">
              {adminItems.map(item => (
                <NavItem key={item.to} {...item} onClose={onClose} collapsed={collapsed} />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Footer usuario */}
      <div className="border-t border-slate-200 p-2">
        {collapsed ? (
          <button
            type="button"
            onClick={() => void signOut()}
            title="Cerrar sesion"
            className="flex w-full items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <>
            <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium text-slate-700 truncate">{user?.full_name ?? 'Sin nombre'}</p>
              <p className="text-[10px] text-slate-400 capitalize">{user?.role ?? 'sin rol'}</p>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              Cerrar sesion
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
