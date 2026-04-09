import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Layout from '@/components/Layout';
import LoginPage from '@/components/LoginPage';
import Dashboard from '@/modules/Dashboard';
import Clients from '@/modules/Clients';
import DataCapture from '@/modules/DataCapture';
import Analysis from '@/modules/Analysis';
import Proposals from '@/modules/Proposals';
import Tracking from '@/modules/Tracking';
import AdminPanel from '@/modules/AdminPanel';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-valere-paper flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-valere-blue-dark mx-auto" />
          <div>
            <p className="font-display font-bold text-xl text-valere-blue-dark">Valere</p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-valere-green-dark font-bold">Consultores</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const modules: Record<string, { component: React.ReactNode; label: string }> = {
    dashboard: { component: <Dashboard />, label: 'Dashboard' },
    admin: { component: <AdminPanel />, label: 'Administración' },
    clients: { component: <Clients />, label: 'Clientes' },
    'data-capture': { component: <DataCapture />, label: 'Captura de Datos' },
    analysis: { component: <Analysis />, label: 'Análisis' },
    proposals: { component: <Proposals />, label: 'Propuestas' },
    tracking: { component: <Tracking />, label: 'Seguimiento' },
    config: { component: <div className="p-8 text-center text-valere-ink/60"><h2 className="text-2xl font-display font-bold text-valere-blue-dark mb-2">Configuración del sistema</h2><p>En desarrollo</p></div>, label: 'Configuración' },
  };

  const current = modules[activeTab] || modules.dashboard;

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <ErrorBoundary moduleName={current.label}>
        {current.component}
      </ErrorBoundary>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
