import React, { useState, useMemo } from 'react';
import {
  BarChart3, Loader2, Play, Save,
  TrendingDown, Euro, Zap, CheckCircle2, XCircle, AlertTriangle, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { calculateSimulatedInvoice, distributeConsumption } from '@/lib/calculator';
import { formatEur, formatPct, safeNum } from '@/lib/utils';
import { getTariffConfig } from '@/lib/tariffs';
import type {
  Client, SupplyPoint, InvoiceHistory, RetailerOffer,
  BoeRegulatedPrice, GlobalConfig, RetailerOfferWithName
} from '@/types/database';
import { supabase } from '@/core/supabase/client';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

interface ComparisonResult {
  offerName: string;
  retailerName: string;
  annualCost: number;
  savings: number;
  savingsPct: number;
  surplusModel: string;
}

export default function Analysis() {
  const { data: clients } = useSupabaseQuery<Client>({ table: 'clients', order: { column: 'company_name', ascending: true } });
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedSPId, setSelectedSPId] = useState('');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [historicalCost, setHistoricalCost] = useState(0);

  const { data: supplyPoints } = useSupabaseQuery<SupplyPoint>({
    table: 'supply_points',
    filters: selectedClientId ? [{ column: 'client_id', op: 'eq', value: selectedClientId }] : [],
    enabled: !!selectedClientId,
  });

  const { data: invoices } = useSupabaseQuery<InvoiceHistory>({
    table: 'invoice_history',
    filters: selectedSPId ? [{ column: 'supply_point_id', op: 'eq', value: selectedSPId }] : [],
    enabled: !!selectedSPId,
  });

  const selectedSP = supplyPoints.find(sp => sp.id === selectedSPId) || null;

  // === VALIDATION CHECKS ===
  const validationChecks = useMemo(() => {
    if (!selectedSP) return [];

    const checks: { label: string; status: 'ok' | 'warn' | 'error'; detail: string }[] = [];
    const tariffConfig = getTariffConfig(selectedSP.tariff);

    // Check 1: Powers configured
    const powers = selectedSP.powers || {};
    const powersConfigured = Array.from({ length: tariffConfig.potencia }, (_, i) =>
      safeNum((powers as any)[`p${i + 1}`])
    );
    const hasPowers = powersConfigured.some(p => p > 0);
    checks.push({
      label: 'Potencias contratadas',
      status: hasPowers ? 'ok' : 'error',
      detail: hasPowers
        ? powersConfigured.map((p, i) => `P${i + 1}: ${p} kW`).join(', ')
        : 'No hay potencias configuradas. Edítalas en Captura de Datos.',
    });

    // Check 2: Energy distribution
    const energyPeriods = [
      safeNum(selectedSP.e1_kwh), safeNum(selectedSP.e2_kwh), safeNum(selectedSP.e3_kwh),
      safeNum(selectedSP.e4_kwh), safeNum(selectedSP.e5_kwh), safeNum(selectedSP.e6_kwh),
    ];
    const hasEnergyDist = energyPeriods.some(e => e > 0);
    checks.push({
      label: 'Distribución energética (E1-E6)',
      status: hasEnergyDist ? 'ok' : 'warn',
      detail: hasEnergyDist
        ? energyPeriods.slice(0, tariffConfig.energia).map((e, i) => `E${i + 1}: ${e} kWh`).join(', ')
        : 'Sin distribución. Se asumirá todo el consumo en P1 (menos preciso).',
    });

    // Check 3: Number of invoices
    const numInv = invoices.length;
    checks.push({
      label: 'Facturas cargadas',
      status: numInv >= 6 ? 'ok' : numInv >= 1 ? 'warn' : 'error',
      detail: numInv === 0
        ? 'Sin facturas. Carga al menos 1 factura en Captura de Datos.'
        : numInv < 6
          ? `${numInv} factura${numInv > 1 ? 's' : ''} — se recomienda mínimo 6 (medio año) para mayor precisión.`
          : `${numInv} factura${numInv > 1 ? 's' : ''} cargadas`,
    });

    // Check 4: Invoices have amounts
    const invoicesWithAmount = invoices.filter(i => safeNum(i.total_amount_eur) > 0);
    if (numInv > 0) {
      checks.push({
        label: 'Importes facturados',
        status: invoicesWithAmount.length === numInv ? 'ok' : invoicesWithAmount.length > 0 ? 'warn' : 'error',
        detail: invoicesWithAmount.length < numInv
          ? `${numInv - invoicesWithAmount.length} factura(s) sin importe total. El coste histórico será impreciso.`
          : `Coste histórico: ${formatEur(invoices.reduce((a, i) => a + safeNum(i.total_amount_eur), 0))}`,
      });
    }

    return checks;
  }, [selectedSP, invoices]);

  const canRunAnalysis = selectedSP && invoices.length > 0 &&
    validationChecks.some(c => c.label === 'Potencias contratadas' && c.status === 'ok');

  const runAnalysis = async () => {
    if (!selectedSPId || !selectedSP) {
      toast.error('Selecciona un punto de suministro');
      return;
    }
    if (invoices.length === 0) {
      toast.error('No hay facturas registradas. Ve a Captura de Datos para cargarlas.');
      return;
    }

    const powers = selectedSP.powers || {};
    const tariffConfig = getTariffConfig(selectedSP.tariff);
    const hasPowers = Array.from({ length: tariffConfig.potencia }, (_, i) =>
      safeNum((powers as any)[`p${i + 1}`])
    ).some(p => p > 0);

    if (!hasPowers) {
      toast.error('Las potencias contratadas son 0. Configúralas en Captura de Datos antes de analizar.');
      return;
    }

    setRunning(true);
    try {
      // Fetch offers — FILTER BY MATCHING TARIFF
      const { data: offers } = await supabase
        .from('retailer_offers')
        .select('*, retailers(name)')
        .eq('include_in_comparison', true)
        .eq('access_rate', selectedSP.tariff);

      // Fetch BOE prices
      const { data: boePrices } = await supabase
        .from('boe_regulated_prices')
        .select('*')
        .eq('tariff', selectedSP.tariff);

      // Fetch global config
      const { data: configRows } = await supabase.from('global_config').select('*');
      const globalConfig: Record<string, number> = {};
      if (configRows && configRows.length > 0) {
        globalConfig.vat_pct = configRows[0].vat_pct || 21;
        globalConfig.iee_pct = configRows[0].iee_pct || 5.1127;
      }

      if (!offers || offers.length === 0) {
        toast.error(`No hay ofertas para tarifa ${selectedSP.tariff} marcadas para comparar. Añádelas en Administración → Ofertas.`);
        setRunning(false);
        return;
      }

      if (!boePrices || boePrices.length === 0) {
        toast.warning(`No hay precios BOE regulados para tarifa ${selectedSP.tariff}. Los costes regulados serán 0.`);
      }

      // Calculate historical annual cost
      const totalHistorical = invoices.reduce((acc, inv) => acc + safeNum(inv.total_amount_eur), 0);
      setHistoricalCost(totalHistorical);

      if (totalHistorical <= 0) {
        toast.warning('El coste histórico total es 0€. Comprueba que las facturas tengan el importe total rellenado.');
      }

      // For each offer, simulate all invoices and sum annual cost
      const compResults: ComparisonResult[] = [];

      for (const offer of (offers as RetailerOfferWithName[])) {
        let annualCost = 0;

        for (const inv of invoices) {
          const consumption_p = distributeConsumption(safeNum(inv.consumption_kwh), selectedSP);

          const result = calculateSimulatedInvoice({
            supplyPoint: selectedSP,
            invoiceData: {
              consumption_p,
              surplus_kwh: safeNum(inv.surplus_kwh),
              billed_days: safeNum(inv.billed_days) || 30,
            },
            offer,
            boePrices: (boePrices || []) as BoeRegulatedPrice[],
            globalConfig,
          });

          annualCost += result.total_eur;
        }

        const savings = totalHistorical - annualCost;
        const savingsPct = totalHistorical > 0 ? (savings / totalHistorical) * 100 : 0;

        compResults.push({
          offerName: offer.product_name || 'Sin nombre',
          retailerName: offer.retailers?.name || 'Desconocido',
          annualCost,
          savings,
          savingsPct,
          surplusModel: offer.surplus_model || '',
        });
      }

      // Sort by savings descending
      compResults.sort((a, b) => b.savings - a.savings);
      setResults(compResults);
      toast.success(`Análisis completado: ${compResults.length} oferta${compResults.length !== 1 ? 's' : ''} comparada${compResults.length !== 1 ? 's' : ''} para tarifa ${selectedSP.tariff}`);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Error inesperado al ejecutar el análisis. Revisa la consola para más detalles.');
    } finally {
      setRunning(false);
    }
  };

  const saveProposal = async () => {
    if (results.length === 0 || !selectedSPId) return;
    const best = results[0];

    const { error } = await supabase.from('proposals').insert({
      supply_point_id: selectedSPId,
      current_annual_cost_eur: historicalCost,
      best_offer_annual_cost_eur: best.annualCost,
      best_offer_retailer: best.retailerName,
      best_offer_savings_eur: best.savings,
      best_offer_savings_pct: best.savingsPct,
      included_offers: results,
      comparison_results: results,
    });

    if (error) {
      toast.error('Error al guardar la propuesta');
    } else {
      toast.success('Propuesta guardada correctamente');
    }
  };

  const chartData = useMemo(() => {
    if (results.length === 0) return [];
    return [
      { name: 'Coste Actual', cost: historicalCost, fill: '#ef4444' },
      ...results.slice(0, 5).map((r, i) => ({
        name: r.retailerName,
        cost: r.annualCost,
        fill: ['#284e8f', '#13753c', '#2780ba', '#529525', '#0d9488'][i],
      })),
    ];
  }, [results, historicalCost]);

  const surplusModelLabel = (m: string) => {
    const labels: Record<string, string> = {
      compensacion_simple: 'Comp. Simplificada',
      bateria_virtual_kwh: 'Batería Virtual',
      gestion_silver: 'Gestión Silver',
      indexado_pool: 'Indexado Pool',
    };
    return labels[m] || m;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-valere-blue-dark">Análisis y Comparador</h1>
          <p className="text-valere-ink/50 mt-1">Compara ofertas y calcula el ahorro potencial</p>
        </div>
      </div>

      {/* Selectors */}
      <Card className="border-none shadow-md bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Cliente</label>
              <select
                value={selectedClientId}
                onChange={e => { setSelectedClientId(e.target.value); setSelectedSPId(''); setResults([]); }}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-valere-blue-medium/30"
              >
                <option value="">— Seleccionar —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">CUPS</label>
              <select
                value={selectedSPId}
                onChange={e => { setSelectedSPId(e.target.value); setResults([]); }}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-valere-blue-medium/30"
                disabled={!selectedClientId}
              >
                <option value="">— Seleccionar —</option>
                {supplyPoints.map(sp => <option key={sp.id} value={sp.id}>{sp.cups} ({sp.tariff})</option>)}
              </select>
            </div>
            <button
              onClick={runAnalysis}
              disabled={running || !canRunAnalysis}
              className="px-6 py-2.5 bg-valere-blue-dark text-white rounded-xl text-sm font-medium hover:bg-valere-blue-medium transition-colors disabled:opacity-40 flex items-center gap-2 shrink-0"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Ejecutar Análisis
            </button>
          </div>

          {/* Tariff info */}
          {selectedSP && (
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="outline" className="text-xs">{selectedSP.tariff}</Badge>
              <span className="text-xs text-valere-ink/40">
                {getTariffConfig(selectedSP.tariff).potencia} periodos potencia · {getTariffConfig(selectedSP.tariff).energia} periodos energía
              </span>
              {selectedSP.autoconsumption_model && (
                <Badge className="bg-valere-green-dark/10 text-valere-green-dark text-[10px]">
                  {selectedSP.autoconsumption_model === 'compensacion_simple' ? 'Comp. Simplificada' :
                   selectedSP.autoconsumption_model === 'bateria_virtual_kwh' ? 'Batería Virtual' :
                   selectedSP.autoconsumption_model === 'gestion_silver' ? 'Gestión Silver' :
                   selectedSP.autoconsumption_model}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Panel */}
      {selectedSP && validationChecks.length > 0 && results.length === 0 && (
        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display text-valere-blue-dark flex items-center gap-2">
              <Info className="w-4 h-4" /> Verificación de datos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {validationChecks.map((check, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {check.status === 'ok' ? (
                    <CheckCircle2 className="w-4 h-4 text-valere-green-dark shrink-0 mt-0.5" />
                  ) : check.status === 'warn' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className={
                      check.status === 'ok' ? 'text-valere-ink/70 font-medium' :
                      check.status === 'warn' ? 'text-amber-700 font-medium' :
                      'text-red-600 font-medium'
                    }>
                      {check.label}
                    </span>
                    <p className="text-xs text-valere-ink/40 mt-0.5">{check.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            {!canRunAnalysis && (
              <p className="text-xs text-red-500 mt-3 font-medium">
                ⚠ Corrige los errores marcados en rojo antes de ejecutar el análisis.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              icon={<Euro className="w-5 h-5 text-valere-blue-dark" />}
              label="Coste Actual"
              value={formatEur(historicalCost)}
            />
            <StatCard
              icon={<TrendingDown className="w-5 h-5 text-valere-green-dark" />}
              label="Mejor Oferta"
              value={formatEur(results[0].annualCost)}
              subtitle={results[0].retailerName}
              variant="green"
            />
            <StatCard
              icon={<Zap className="w-5 h-5 text-valere-green-light" />}
              label="Ahorro Máximo"
              value={`${formatEur(results[0].savings)} (${formatPct(results[0].savingsPct)})`}
              variant="gradient"
            />
          </div>

          {/* Chart */}
          <Card className="border-none shadow-md bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-display text-valere-blue-dark">Comparativa de Costes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k€`} />
                  <Tooltip formatter={(v) => formatEur(Number(v))} />
                  <Bar dataKey="cost" name="Coste Anual" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Results table */}
          <Card className="border-none shadow-md bg-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50">
              <div>
                <CardTitle className="text-lg font-display text-valere-blue-dark">Detalle de Ofertas</CardTitle>
                <CardDescription>{results.length} ofertas comparadas</CardDescription>
              </div>
              <button
                onClick={saveProposal}
                className="flex items-center gap-2 px-4 py-2 bg-valere-green-dark text-white rounded-xl text-sm hover:bg-valere-green-medium transition-colors"
              >
                <Save className="w-4 h-4" /> Guardar Propuesta
              </button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="text-left font-bold text-valere-blue-dark py-3 px-6">#</th>
                    <th className="text-left font-bold text-valere-blue-dark">Comercializadora</th>
                    <th className="text-left font-bold text-valere-blue-dark">Producto</th>
                    <th className="text-left font-bold text-valere-blue-dark">Modelo</th>
                    <th className="text-right font-bold text-valere-blue-dark">Coste Anual</th>
                    <th className="text-right font-bold text-valere-blue-dark pr-6">Ahorro</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className={`border-t border-slate-50 ${i === 0 ? 'bg-valere-green-light/5' : 'hover:bg-slate-50/30'}`}>
                      <td className="py-3 px-6">
                        {i === 0 ? (
                          <Badge className="bg-valere-green-dark text-white text-[10px]">MEJOR</Badge>
                        ) : (
                          <span className="text-valere-ink/30">{i + 1}</span>
                        )}
                      </td>
                      <td className="font-semibold text-valere-blue-dark">{r.retailerName}</td>
                      <td className="text-valere-ink/60">{r.offerName}</td>
                      <td>
                        <Badge variant="outline" className="text-[10px]">{surplusModelLabel(r.surplusModel)}</Badge>
                      </td>
                      <td className="text-right font-semibold">{formatEur(r.annualCost)}</td>
                      <td className="text-right pr-6">
                        <span className={r.savings > 0 ? 'text-valere-green-dark font-bold' : 'text-red-500'}>
                          {r.savings > 0 ? '+' : ''}{formatEur(r.savings)}
                        </span>
                        <span className="block text-[10px] text-valere-ink/40">{formatPct(r.savingsPct)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {results.length === 0 && !running && (
        <EmptyState
          icon={<BarChart3 className="w-8 h-8" />}
          title="Ejecuta un análisis"
          description="Selecciona un cliente y punto de suministro, luego pulsa 'Ejecutar Análisis' para comparar ofertas."
        />
      )}
    </div>
  );
}
