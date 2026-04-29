import { useState, type ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { Toaster } from 'sonner'
import Sidebar from './Sidebar'
import GlobalSearch from '../search/GlobalSearch'
import NotificationBell from '../../features/notificaciones/NotificationBell'

export default function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Contenido principal */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
          {/* Botón hamburguesa — solo móvil */}
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(true)}
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

      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{ duration: 3500 }}
      />
    </div>
  )
}
