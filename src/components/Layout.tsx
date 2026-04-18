import React, { useState, useEffect } from 'react';
import {
  Users,
  FileUp,
  BarChart3,
  FileText,
  Send,
  Settings,
  Menu,
  ChevronLeft,
  LogOut,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { Toaster } from '@/components/ui/sonner';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const allSidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, minRole: 'client' as const },
  { id: 'admin', label: 'Administración', icon: ShieldCheck, minRole: 'manager' as const },
  { id: 'clients', label: 'Clientes', icon: Users, minRole: 'manager' as const },
  { id: 'data-capture', label: 'Captura de Datos', icon: FileUp, minRole: 'manager' as const },
  { id: 'analysis', label: 'Análisis', icon: BarChart3, minRole: 'client' as const },
  { id: 'proposals', label: 'Propuestas', icon: FileText, minRole: 'client' as const },
  { id: 'tracking', label: 'Seguimiento', icon: Send, minRole: 'client' as const },
  { id: 'config', label: 'Configuración', icon: Settings, minRole: 'manager' as const },
];

const roleHierarchy = { master: 4, manager: 3, consultant: 2, client: 1 };

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { profile, logout } = useAuth();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const userRoleLevel = roleHierarchy[profile?.role || 'client'] || 1;
  const sidebarItems = allSidebarItems.filter(
    item => userRoleLevel >= roleHierarchy[item.minRole]
  );

  const roleLabel = profile?.role === 'master' ? 'MASTER' :
    profile?.role === 'manager' ? 'MANAGER' :
    profile?.role === 'consultant' ? 'CONSULTOR' : 'CLIENTE';

  return (
    <div className="flex h-screen bg-valere-paper text-valere-ink overflow-hidden font-sans">
      {/* Mobile overlay */}
      {isMobile && !collapsed && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 bg-white border-r border-slate-100 transition-all duration-300 flex flex-col z-40 shadow-xl md:shadow-sm md:relative",
        collapsed
          ? "-translate-x-full md:translate-x-0 md:w-20"
          : "translate-x-0 w-64"
      )}>
        {/* Logo */}
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          {(!collapsed || isMobile) && (
            <div className="flex flex-col">
              <span className="font-display font-bold text-2xl leading-tight text-valere-blue-dark">Valere</span>
              <span className="text-[9px] uppercase tracking-[0.25em] text-valere-green-dark font-bold -mt-1">Consultores</span>
            </div>
          )}
          {isMobile && (
            <button onClick={() => setCollapsed(true)} className="text-valere-blue-dark p-1.5 hover:bg-slate-50 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              data-tab={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (isMobile) setCollapsed(true);
              }}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative",
                activeTab === item.id
                  ? "bg-valere-blue-dark/5 text-valere-blue-dark font-semibold"
                  : "hover:bg-valere-green-dark/5 text-valere-ink/50 hover:text-valere-green-dark"
              )}
            >
              {activeTab === item.id && (
                <div className="absolute left-0 w-1 h-6 bg-valere-blue-dark rounded-r-full" />
              )}
              <item.icon className={cn(
                "w-5 h-5 shrink-0",
                activeTab === item.id ? "text-valere-blue-dark" : "text-valere-ink/30 group-hover:text-valere-green-dark"
              )} />
              {(!collapsed || isMobile) && (
                <span className="text-sm truncate">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 space-y-1">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-valere-ink/50 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {(!collapsed || isMobile) && <span className="text-sm">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 md:h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 md:px-8 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-valere-blue-dark hover:bg-slate-50 p-2 rounded-xl transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg md:text-xl font-display font-bold text-valere-blue-dark truncate max-w-[200px] md:max-w-none">
                {sidebarItems.find(i => i.id === activeTab)?.label || 'Dashboard'}
              </h2>
              <p className="hidden md:block text-[10px] text-valere-ink/30 font-bold uppercase tracking-wider">
                Valere Consultores · Gestión Energética
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-bold text-valere-blue-dark">
                {profile?.full_name || profile?.email || 'Usuario'}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-valere-green-dark font-bold">
                {roleLabel}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-valere-blue-medium to-valere-blue-dark flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-valere-blue-dark/20">
              {(profile?.full_name?.[0] || profile?.email?.[0] || 'U').toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 md:p-8 relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-valere-blue-light/5 rounded-full blur-3xl -z-10 -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-valere-green-light/5 rounded-full blur-3xl -z-10 -ml-48 -mb-48" />
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      <Toaster position="top-right" richColors />
    </div>
  );
}
