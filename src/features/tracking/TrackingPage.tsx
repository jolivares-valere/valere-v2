import React, { useState } from 'react';
import {
  Search, TrendingUp, Euro, Clock, Loader2, Calendar,
  CheckCircle2, FileText, Download, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/core/components/StatCard';
import EmptyState from '@/core/components/EmptyState';
import { useSupabaseQuery } from '@/core/hooks/useSupabaseQuery';
import { formatEur, formatPct, generateCsv, downloadFile } from '@/core/utils/format';
import { formatDate } from '@/core/utils/dates';
import type { ProposalWithDetails } from '@/types/database';
import { toast } from 'sonner';

export default function Tracking() {
  const { data: proposals, loading } = useSupabaseQuery<ProposalWithDetails>({
    table: 'proposals',
    select: '*, supply_points(cups, clients(company_name))',
    order: { column: 'created_at', ascending: false },
    errorMessage: 'Error al cargar análisis',
  });

  const [search, setSearch] = useState('');

  const filtered = proposals.filter(p => {
    const name = p.supply_points?.clients?.company_name || '';
    const cups = p.supply_points?.cups || '';
    return [name, cups].some(s => s.toLowerCase().includes(search.toLowerCase()));
  });

  const totalSavings = proposals.reduce((a, p) => a + (p.best_offer_savings_eur || 0), 0);
  const avgPct = proposals.length > 0
    ? proposals.reduce((a, p) => a + (p.best_offer_savings_pct || 0), 0) / proposals.length
    : 0;

  const exportReport = () => {
    if (proposals.length === 0) { toast.info('No hay datos para exportar'); return; }
    const csv = generateCsv(
      ['CUPS', 'Cliente', 'Comercializadora', 'Ahorro (€)', 'Ahorro (%)', 'Fecha'],
      proposals.map(p => [
        p.supply_points?.cups || '',
        p.supply_points?.clients?.company_name || '',
        p.best_offer_retailer || '',
        (p.best_offer_savings_eur || 0).toFixed(2),
        (p.best_offer_savings_pct || 0).toFixed(1),
        formatDate(p.created_at),
      ])
    );
    downloadFile(csv, `Seguimiento_Valere_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Informe exportado');
  };

  // Next steps: proposals with >10% savings and no PDF
  const nextSteps = proposals.filter(p => (p.best_offer_savings_pct || 0) > 10 && !p.pdf_url);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-valere-blue-dark" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-valere-blue-dark">Seguimiento</h1>
          <p className="text-valere-ink/50 mt-1">Controla los ahorros identificados y el estado de las comparativas</p>
        </div>
        <button
          onClick={exportReport}
          className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-valere-blue-dark hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" /> Exportar Informe
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-valere-blue-dark" />}
          label="Análisis Realizados"
          value={proposals.length}
        />
        <StatCard
          icon={<Euro className="w-5 h-5 text-valere-green-dark" />}
          label="Ahorro Identificado"
          value={formatEur(totalSavings)}
          subtitle="Total acumulado"
          variant="green"
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-valere-green-light" />}
          label="Ahorro Medio"
          value={formatPct(avgPct)}
          subtitle="Porcentaje medio"
          variant="gradient"
        />
      </div>

      {/* Recent analyses table */}
      <Card className="border-none shadow-md bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-lg font-display text-valere-blue-dark">Análisis Recientes</CardTitle>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-valere-ink/30" />
              <input
                placeholder="Buscar por cliente o CUPS..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue-medium/30"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-8 h-8" />}
              title="Sin análisis registrados"
              description="Los análisis que generes aparecerán aquí para su seguimiento."
            />
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="font-bold text-valere-blue-dark pl-6">CUPS</TableHead>
                  <TableHead className="font-bold text-valere-blue-dark">Cliente</TableHead>
                  <TableHead className="font-bold text-valere-blue-dark">Mejor Oferta</TableHead>
                  <TableHead className="font-bold text-valere-blue-dark text-right">Ahorro Anual</TableHead>
                  <TableHead className="font-bold text-valere-blue-dark">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors">
                    <TableCell className="pl-6 font-mono text-xs text-valere-ink/50">{p.supply_points?.cups}</TableCell>
                    <TableCell className="font-semibold text-valere-blue-dark">{p.supply_points?.clients?.company_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-valere-blue-medium/5 text-valere-blue-dark border-valere-blue-medium/10">
                        {p.best_offer_retailer}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-valere-green-dark">{formatEur(p.best_offer_savings_eur)}</span>
                      <span className="block text-[10px] text-valere-green-medium font-bold">{formatPct(p.best_offer_savings_pct)} ahorro</span>
                    </TableCell>
                    <TableCell className="text-valere-ink/50 text-sm flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> {formatDate(p.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Activity + Next Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-display text-valere-blue-dark">Actividad Reciente</CardTitle>
            <CardDescription>Últimos análisis generados</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {proposals.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-8 h-8" />}
                title="No hay actividad reciente"
              />
            ) : (
              <div className="divide-y divide-slate-50">
                {proposals.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-valere-blue-medium/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-valere-blue-dark" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-valere-blue-dark truncate">
                        Análisis para {p.supply_points?.clients?.company_name}
                      </p>
                      <p className="text-xs text-valere-ink/40 truncate">
                        Ahorro de {formatEur(p.best_offer_savings_eur)} con {p.best_offer_retailer || 'N/A'}
                      </p>
                    </div>
                    <span className="text-xs text-valere-ink/30 shrink-0">{formatDate(p.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-display text-valere-blue-dark">Próximos Pasos</CardTitle>
            <CardDescription>Oportunidades de ahorro detectadas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextSteps.length > 0 ? (
              nextSteps.slice(0, 3).map(p => (
                <div key={p.id} className="p-4 rounded-xl bg-valere-blue-medium/5 border border-valere-blue-medium/10 space-y-2">
                  <div className="flex items-center gap-2 text-valere-blue-dark font-semibold text-sm">
                    <AlertCircle className="w-4 h-4 text-valere-cyan" />
                    Generar PDF
                  </div>
                  <p className="text-xs text-valere-ink/50 leading-relaxed">
                    {p.supply_points?.clients?.company_name} — ahorro potencial del {formatPct(p.best_offer_savings_pct)}.
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-sm text-valere-ink/40">
                No hay acciones urgentes pendientes
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
