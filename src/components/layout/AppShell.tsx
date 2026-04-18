import type { ReactNode } from 'react'
import { Toaster } from 'sonner'
import Sidebar from './Sidebar'
import GlobalSearch from '../search/GlobalSearch'
import NotificationBell from '../../features/notificaciones/NotificationBell'

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4">
          <GlobalSearch />
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
