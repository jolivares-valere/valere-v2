import { useState, type ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { Toaster } from 'sonner'
import Sidebar from './Sidebar'
import GlobalSearch from '../search/GlobalSearch'
import NotificationBell from '../../features/notificaciones/NotificationBell'

const STORAGE_KEY = 'valere_sidebar_collapsed'

function getInitialCollapsed(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true' } catch { return false }
}

export default function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(getInitialCollapsed)

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem(STORAGE_KEY, String(next)) } catch {}
      return next
    })
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — móvil: drawer fijo; desktop: estático con ancho variable */}
      <div
        className={`fixed inset-y-0 left-0 z-30 transition-all duration-300 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'lg:w-16' : 'lg:w-64'}`}
      >
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          onClose={() => setMobileOpen(false)}
        />
      </div>

      {/* Contenido principal */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
          {/* Botón hamburguesa — solo móvil */}
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1">
            <GlobalSearch />
          </div>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      {/* Hotfix Sprint C 2026-05-05: toast a bottom-right + 5s para no
          tapar el botón "+ Nuevo lead" ni el botón cerrar del drawer.
          Duración 5s queda dentro del rango 4-6s pedido por feedback Carolina. */}
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{ duration: 5000 }}
      />
    </div>
  )
}
