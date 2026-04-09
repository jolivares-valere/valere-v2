import React from 'react';
import { TrendingUp, Euro, Users, FileText, Clock, CheckCircle2, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import ConsultantChat from '@/components/ConsultantChat';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { formatEur, formatPct, formatDate } from '@/lib/utils';
import type { Client, ProposalWithDetails } from '@/types/database';

export default function Dashboard() {
  const { data: clients } = useSupabaseQuery<Client>({
    table: 'clients',
    select: 'id',
    errorMessage: 'Error al cargar clientes',
  });

  const { data: proposals } = useSupabaseQuery<ProposalWithDetails>({
    table: 'proposals',
    select: '*, supply_points(cups, clients(company_name))',
    order: { column: 'created_at', ascending: false },
    errorMessage: 'Error al cargar propuestas',
  });

  const totalSavings = proposals.reduce((acc, p) => acc + (p.best_offer_savings_eur || 0), 0);
  const avgSavingsPct = proposals.length > 0
    ? proposals.reduce((acc, p) => acc + (p.best_offer_savings_pct || 0), 0) / proposals.length
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-display font-bold text-valere-blue-dark">Dashboard</h1>
        <p className="text-valere-ink/50 mt-1">Resumen de tu actividad de gestión energética</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          icon={<Users className="w-5 h-5 text-valere-blue-dark" />}
          label="Clientes"
          value={clients.length}
        />
        <StatCard
          icon={<FileText className="w-5 h-5 text-valere-blue-dark" />}
          label="Análisis"
          value={proposals.length}
        />
        <StatCard
          icon={<Euro className="w-5 h-5 text-valere-green-dark" />}
          label="Ahorro Identificado"
          value={formatEur(totalSavings)}
          variant="green"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-valere-green-light" />}
          label="Ahorro Medio"
          value={formatPct(avgSavingsPct)}
          variant="gradient"
          subtitle="Porcentaje medio"
        />
      </div>

      {/* Activity + Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent activity */}
        <Card className="border-none shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-display text-valere-blue-dark">Actividad Reciente</CardTitle>
            <CardDescription>Últimos análisis generados</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {proposals.length === 0 ? (
              <EmptyState
                icon={<BarChart3 className="w-8 h-8" />}
                title="Sin actividad aún"
                description="Cuando generes tu primer análisis, aparecerá aquí."
              />
            ) : (
              <div className="divide-y divide-slate-50">
                {proposals.slice(0, 6).map((p, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-valere-blue-medium/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-valere-blue-dark" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-valere-blue-dark truncate">
                        {p.supply_points?.clients?.company_name || 'Cliente'}
                      </p>
                      <p className="text-xs text-valere-ink/40 truncate">
                        Ahorro de {formatEur(p.best_offer_savings_eur)} con {p.best_offer_retailer || 'N/A'}
                      </p>
                    </div>
                    <span className="text-xs text-valere-ink/30 shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(p.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Consultant */}
        <ConsultantChat />
      </div>
    </div>
  );
}
