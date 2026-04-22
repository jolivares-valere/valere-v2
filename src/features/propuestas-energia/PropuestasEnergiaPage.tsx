import React, { useState } from 'react';
import {
  FileText, Search, Download, Loader2, Euro, TrendingDown,
  Calendar, MoreVertical, Eye, Mail, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import StatCard from '@/core/components/StatCard';
import EmptyState from '@/core/components/EmptyState';
import { SkeletonRow, SkeletonCard } from '@/components/ui/Skeleton';
import { useSupabaseQuery, useSupabaseMutation } from '@/core/hooks/useSupabaseQuery';
import { formatEur, formatPct, generateCsv, downloadFile } from '@/core/utils/format';
import { formatDate } from '@/core/utils/dates';
import type { ProposalWithDetails } from '@/types/database';
import { toast } from 'sonner';

export default function Proposals() {
  const { data: proposals, loading, refetch } = useSupabaseQuery<ProposalWithDetails>({
    table: 'proposals',
    select: '*, cups_rel:cups!proposals_cups_id_fkey(codigo_cups, empresas(nombre))',
    order: { column: 'created_at', ascending: false },
    errorMessage: 'Error al cargar propuestas',
  });
  const mutation = useSupabaseMutation('proposals');

  const [search, setSearch] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<ProposalWithDetails | null>(null);
  const [toDelete, setToDelete] = useState<ProposalWithDetails | null>(null);

  const clienteOf = (p: ProposalWithDetails) =>
    p.cups_rel?.empresas?.nombre || '';
  const cupsOf = (p: ProposalWithDetails) =>
    p.cups_rel?.codigo_cups || '';

  const filtered = proposals.filter(p => {
    const name = clienteOf(p);
    const cups = cupsOf(p);
    const retailer = p.best_offer_retailer || '';
    return [name, cups, retailer].some(s => s.toLowerCase().includes(search.toLowerCase()));
  });

  const totalSavings = proposals.reduce((a, p) => a + (p.best_offer_savings_eur || 0), 0);
  const avgPct = proposals.length > 0
    ? proposals.reduce((a, p) => a + (p.best_offer_savings_pct || 0), 0) / proposals.length
    : 0;

  const exportCsv = () => {
    if (proposals.length === 0) { toast.info('No hay datos para exportar'); return; }
    const csv = generateCsv(
      ['CUPS', 'Cliente', 'Comercializadora', 'Coste Actual €', 'Mejor Oferta €', 'Ahorro €', 'Ahorro %', 'Fecha'],
      proposals.map(p => [
        cupsOf(p),
        clienteOf(p),
        p.best_offer_retailer || '',
        (p.current_annual_cost_eur || 0).toFixed(2),
        (p.best_offer_annual_cost_eur || 0).toFixed(2),
        (p.best_offer_savings_eur || 0).toFixed(2),
        (p.best_offer_savings_pct || 0).toFixed(1),
        formatDate(p.created_at),
      ])
    );
    downloadFile(csv, `Propuestas_Valere_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Informe exportado');
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    await mutation.remove(toDelete.id, 'Propuesta eliminada');
    setToDelete(null);
    refetch();
  };

  const viewDetail = (p: ProposalWithDetails) => {
    setSelectedProposal(p);
    setDetailOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-md">
          <table className="w-full">
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-valere-blue-dark">Propuestas</h1>
          <p className="text-valere-ink/50 mt-1">Gestiona y consulta tus propuestas comerciales</p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-valere-blue-dark hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          icon={<FileText className="w-5 h-5 text-valere-blue-dark" />}
          label="Propuestas"
          value={proposals.length}
        />
        <StatCard
          icon={<Euro className="w-5 h-5 text-valere-green-dark" />}
          label="Ahorro Total"
          value={formatEur(totalSavings)}
          variant="green"
        />
        <StatCard
          icon={<TrendingDown className="w-5 h-5 text-valere-green-light" />}
          label="Ahorro Medio"
          value={formatPct(avgPct)}
          variant="gradient"
        />
      </div>

      {/* Search + Table */}
      <Card className="border-none shadow-md bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-lg font-display text-valere-blue-dark">Listado de Propuestas</CardTitle>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-valere-ink/30" />
              <input
                placeholder="Buscar por cliente, CUPS o comercializadora..."
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
              title={proposals.length === 0 ? 'Sin propuestas' : 'Sin resultados'}
              description={proposals.length === 0
                ? 'Genera tu primer análisis para crear una propuesta.'
                : 'No se encontraron propuestas con esos criterios.'}
            />
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="font-bold text-valere-blue-dark pl-6">CUPS</TableHead>
                  <TableHead className="font-bold text-valere-blue-dark">Cliente</TableHead>
                  <TableHead className="font-bold text-valere-blue-dark">Mejor Oferta</TableHead>
                  <TableHead className="font-bold text-valere-blue-dark text-right">Ahorro</TableHead>
                  <TableHead className="font-bold text-valere-blue-dark">Fecha</TableHead>
                  <TableHead className="pr-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors">
                    <TableCell className="pl-6 font-mono text-xs text-valere-ink/50">
                      {cupsOf(p) || '—'}
                    </TableCell>
                    <TableCell className="font-semibold text-valere-blue-dark">
                      {clienteOf(p) || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-valere-blue-medium/5 text-valere-blue-dark border-valere-blue-medium/10">
                        {p.best_offer_retailer || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-valere-green-dark">{formatEur(p.best_offer_savings_eur)}</span>
                      <span className="block text-[10px] text-valere-green-medium font-bold">{formatPct(p.best_offer_savings_pct)}</span>
                    </TableCell>
                    <TableCell className="text-valere-ink/50 text-sm flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {formatDate(p.created_at)}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger aria-label="Opciones de la propuesta" className="p-2 hover:bg-slate-50 rounded-xl text-valere-ink/40 hover:text-valere-blue-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-valere-blue-medium/40">
                          <MoreVertical className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl w-44">
                          <DropdownMenuItem onClick={() => viewDetail(p)} className="gap-2">
                            <Eye className="w-4 h-4" /> Ver Detalle
                          </DropdownMenuItem>
                          {p.pdf_url && (
                            <DropdownMenuItem onClick={() => window.open(p.pdf_url, '_blank')} className="gap-2">
                              <Download className="w-4 h-4" /> Descargar PDF
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setToDelete(p)} className="gap-2 text-red-500 focus:text-red-500">
                            <Trash2 className="w-4 h-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-valere-blue-dark">Detalle de Propuesta</DialogTitle>
          </DialogHeader>
          {selectedProposal && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-valere-ink/40 uppercase tracking-wider">Cliente</p>
                  <p className="text-sm font-semibold text-valere-blue-dark mt-1">
                    {clienteOf(selectedProposal)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-valere-ink/40 uppercase tracking-wider">CUPS</p>
                  <p className="text-sm font-mono text-valere-ink/60 mt-1">
                    {cupsOf(selectedProposal)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-valere-ink/40 uppercase tracking-wider">Coste Actual</p>
                  <p className="text-lg font-bold text-valere-ink mt-1">
                    {formatEur(selectedProposal.current_annual_cost_eur)}
                  </p>
                </div>
                <div className="bg-valere-green-light/10 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-valere-green-dark/60 uppercase tracking-wider">Mejor Oferta</p>
                  <p className="text-lg font-bold text-valere-green-dark mt-1">
                    {formatEur(selectedProposal.best_offer_annual_cost_eur)}
                  </p>
                  <p className="text-xs text-valere-green-medium font-bold">
                    {selectedProposal.best_offer_retailer} · Ahorro {formatPct(selectedProposal.best_offer_savings_pct)}
                  </p>
                </div>
              </div>

              {/* Comparison results */}
              {Array.isArray(selectedProposal.comparison_results) && (
                <div>
                  <h4 className="text-sm font-bold text-valere-blue-dark mb-3">Todas las ofertas comparadas</h4>
                  <div className="space-y-2">
                    {(selectedProposal.comparison_results as any[]).map((r: any, i: number) => (
                      <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${i === 0 ? 'bg-valere-green-light/10 border border-valere-green-medium/20' : 'bg-slate-50'}`}>
                        <div>
                          <span className="font-semibold text-sm">{r.retailerName}</span>
                          <span className="text-xs text-valere-ink/40 ml-2">{r.offerName}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-sm">{formatEur(r.annualCost)}</span>
                          <span className={`block text-xs font-bold ${r.savings > 0 ? 'text-valere-green-dark' : 'text-red-500'}`}>
                            {r.savings > 0 ? '+' : ''}{formatEur(r.savings)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!toDelete}
        title="Eliminar propuesta"
        message={toDelete ? `¿Eliminar la propuesta para ${toDelete.cups_rel?.empresas?.nombre ?? 'este cliente'}? No se podrá recuperar.` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
