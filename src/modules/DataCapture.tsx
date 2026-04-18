import React, { useState, useMemo } from 'react';
import {
  FileUp, Plus, Search, Loader2, Trash2, Save, Building2, Zap, Calendar, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import EmptyState from '@/components/EmptyState';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import type { Client, SupplyPoint, InvoiceHistory } from '@/types/database';
import { toast } from 'sonner';
import { getTariffConfig, validateCUPS, validatePowers } from '@/core/energia/tariffs';

export default function DataCapture() {
  const { data: clients } = useSupabaseQuery<Client>({
    table: 'clients',
    order: { column: 'company_name', ascending: true },
  });

  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const { data: supplyPoints, loading: loadingSP, refetch: refetchSP } = useSupabaseQuery<SupplyPoint>({
    table: 'supply_points',
    filters: selectedClientId ? [{ column: 'client_id', op: 'eq', value: selectedClientId }] : [],
    enabled: !!selectedClientId,
  });

  const [selectedSPId, setSelectedSPId] = useState<string>('');

  const { data: invoices, loading: loadingInv, refetch: refetchInv } = useSupabaseQuery<InvoiceHistory>({
    table: 'invoice_history',
    filters: selectedSPId ? [{ column: 'supply_point_id', op: 'eq', value: selectedSPId }] : [],
    order: { column: 'year', ascending: false },
    enabled: !!selectedSPId,
  });

  const spMutation = useSupabaseMutation('supply_points');
  const invMutation = useSupabaseMutation('invoice_history');

  // --- Supply Point Dialog ---
  const [spDialogOpen, setSpDialogOpen] = useState(false);
  const [spForm, setSpForm] = useState<Partial<SupplyPoint>>({});
  const [spErrors, setSpErrors] = useState<Record<string, string>>({});

  // Dynamic tariff config for SP form
  const spTariffConfig = useMemo(
    () => getTariffConfig(spForm.tariff || '2.0TD'),
    [spForm.tariff]
  );

  const openNewSP = () => {
    setSpForm({
      client_id: selectedClientId,
      tariff: '2.0TD',
      powers: { p1: 0, p2: 0 },
    });
    setSpErrors({});
    setSpDialogOpen(true);
  };

  const handleTariffChange = (newTariff: string) => {
    const config = getTariffConfig(newTariff);
    // Build powers object with only the relevant periods, reset hidden ones
    const newPowers: Record<string, number> = {};
    for (let i = 1; i <= config.potencia; i++) {
      const key = `p${i}`;
      newPowers[key] = (spForm.powers as any)?.[key] || 0;
    }
    // Reset energy fields beyond the new tariff's range
    const updates: Record<string, any> = { tariff: newTariff, powers: newPowers };
    for (let i = 1; i <= 6; i++) {
      const key = `e${i}_kwh`;
      if (i > config.energia) {
        updates[key] = 0;
      }
    }
    setSpForm(p => ({ ...p, ...updates }));
    setSpErrors({});
  };

  const saveSP = async () => {
    const errors: Record<string, string> = {};

    // Validate CUPS
    const cupsError = validateCUPS(spForm.cups || '');
    if (cupsError) errors.cups = cupsError;

    // Validate powers
    const powersError = validatePowers(
      spForm.tariff || '2.0TD',
      (spForm.powers as Record<string, number>) || {}
    );
    if (powersError) errors.powers = powersError;

    if (Object.keys(errors).length > 0) {
      setSpErrors(errors);
      // Also show first error as toast for visibility
      toast.error(Object.values(errors)[0]);
      return;
    }

    setSpErrors({});
    await spMutation.insert(spForm as any, 'Punto de suministro creado');
    setSpDialogOpen(false);
    refetchSP();
  };

  // --- Invoice Dialog ---
  const [invDialogOpen, setInvDialogOpen] = useState(false);
  const [invForm, setInvForm] = useState<Partial<InvoiceHistory>>({});
  // Per-period consumption and surplus arrays
  const [invConsumptionPeriods, setInvConsumptionPeriods] = useState<number[]>([]);
  const [invSurplusPeriods, setInvSurplusPeriods] = useState<number[]>([]);

  // Get tariff config for the currently selected supply point
  const selectedSP = useMemo(
    () => supplyPoints.find(sp => sp.id === selectedSPId),
    [supplyPoints, selectedSPId]
  );

  const invTariffConfig = useMemo(
    () => getTariffConfig(selectedSP?.tariff || '2.0TD'),
    [selectedSP?.tariff]
  );

  const openNewInv = () => {
    const numPeriods = invTariffConfig.energia;
    setInvConsumptionPeriods(new Array(numPeriods).fill(0));
    setInvSurplusPeriods(new Array(numPeriods).fill(0));
    setInvForm({
      supply_point_id: selectedSPId,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      billed_days: 30,
      consumption_kwh: 0,
      surplus_kwh: 0,
    });
    setInvDialogOpen(true);
  };

  // Auto-calculate totals from period arrays
  const totalConsumption = useMemo(
    () => invConsumptionPeriods.reduce((sum, v) => sum + (v || 0), 0),
    [invConsumptionPeriods]
  );

  const totalSurplus = useMemo(
    () => invSurplusPeriods.reduce((sum, v) => sum + (v || 0), 0),
    [invSurplusPeriods]
  );

  const updateConsumptionPeriod = (index: number, value: number) => {
    setInvConsumptionPeriods(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const updateSurplusPeriod = (index: number, value: number) => {
    setInvSurplusPeriods(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const saveInv = async () => {
    if (totalConsumption <= 0) {
      toast.error('El consumo total debe ser mayor que 0');
      return;
    }
    const payload = {
      ...invForm,
      consumption_kwh: totalConsumption,
      surplus_kwh: totalSurplus,
    };
    await invMutation.insert(payload as any, 'Factura registrada');
    setInvDialogOpen(false);
    refetchInv();
  };

  const deleteInv = async (id: string) => {
    if (!confirm('¿Eliminar esta factura?')) return;
    await invMutation.remove(id, 'Factura eliminada');
    refetchInv();
  };

  // --- Shared input class ---
  const inputClass = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue-medium/30';
  const inputErrorClass = 'w-full px-3 py-2 border border-red-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300/30';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-display font-bold text-valere-blue-dark">Captura de Datos</h1>
        <p className="text-valere-ink/50 mt-1">Registra puntos de suministro y facturas de tus clientes</p>
      </div>

      {/* Client selector */}
      <Card className="border-none shadow-md bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">
                Seleccionar Cliente
              </label>
              <select
                value={selectedClientId}
                onChange={e => { setSelectedClientId(e.target.value); setSelectedSPId(''); }}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue-medium/30 bg-white"
              >
                <option value="">— Elige un cliente —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>

            {selectedClientId && (
              <div className="flex-1">
                <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">
                  Punto de Suministro
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedSPId}
                    onChange={e => setSelectedSPId(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue-medium/30 bg-white"
                  >
                    <option value="">— Elige un CUPS —</option>
                    {supplyPoints.map(sp => (
                      <option key={sp.id} value={sp.id}>{sp.cups} ({sp.tariff})</option>
                    ))}
                  </select>
                  <button
                    onClick={openNewSP}
                    className="px-4 py-2.5 bg-valere-blue-dark text-white rounded-xl text-sm hover:bg-valere-blue-medium transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-4 h-4" /> CUPS
                  </button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoice history */}
      {selectedSPId && (
        <Card className="border-none shadow-md bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-display text-valere-blue-dark">Historial de Facturas</CardTitle>
              <CardDescription>Registra las facturas mensuales para generar comparativas precisas</CardDescription>
            </div>
            <button
              onClick={openNewInv}
              className="flex items-center gap-2 px-4 py-2 bg-valere-green-dark text-white rounded-xl text-sm hover:bg-valere-green-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Factura
            </button>
          </CardHeader>
          <CardContent className="p-0">
            {loadingInv ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-valere-blue-dark" />
              </div>
            ) : invoices.length === 0 ? (
              <EmptyState
                icon={<FileUp className="w-8 h-8" />}
                title="Sin facturas registradas"
                description="Añade facturas mensuales para poder realizar comparativas de ahorro."
                action={
                  <button onClick={openNewInv} className="flex items-center gap-2 px-4 py-2 bg-valere-green-dark text-white rounded-xl text-sm hover:bg-valere-green-medium transition-colors">
                    <Plus className="w-4 h-4" /> Añadir Factura
                  </button>
                }
              />
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="font-bold text-valere-blue-dark pl-6">Periodo</TableHead>
                    <TableHead className="font-bold text-valere-blue-dark">Consumo (kWh)</TableHead>
                    <TableHead className="font-bold text-valere-blue-dark">Excedentes (kWh)</TableHead>
                    <TableHead className="font-bold text-valere-blue-dark">Total Factura</TableHead>
                    <TableHead className="font-bold text-valere-blue-dark">Días</TableHead>
                    <TableHead className="text-right pr-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map(inv => (
                    <TableRow key={inv.id} className="border-slate-50 hover:bg-slate-50/30">
                      <TableCell className="pl-6 font-medium flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-valere-ink/30" />
                        {String(inv.month).padStart(2, '0')}/{inv.year}
                      </TableCell>
                      <TableCell>{(inv.consumption_kwh || 0).toLocaleString()} kWh</TableCell>
                      <TableCell>{(inv.surplus_kwh || 0).toLocaleString()} kWh</TableCell>
                      <TableCell className="font-semibold text-valere-blue-dark">
                        {(inv.total_amount_eur || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                      </TableCell>
                      <TableCell>{inv.billed_days || 30}</TableCell>
                      <TableCell className="text-right pr-6">
                        <button
                          onClick={() => deleteInv(inv.id)}
                          className="p-1.5 text-valere-ink/30 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedClientId && (
        <EmptyState
          icon={<Building2 className="w-8 h-8" />}
          title="Selecciona un cliente"
          description="Elige un cliente del selector para gestionar sus puntos de suministro y facturas."
        />
      )}

      {selectedClientId && !selectedSPId && supplyPoints.length > 0 && (
        <EmptyState
          icon={<Zap className="w-8 h-8" />}
          title="Selecciona un punto de suministro"
          description="Elige un CUPS para ver y registrar sus facturas."
        />
      )}

      {/* --- SP Dialog --- */}
      <Dialog open={spDialogOpen} onOpenChange={setSpDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-valere-blue-dark">Nuevo Punto de Suministro</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {/* CUPS with validation */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">CUPS *</label>
              <input
                value={spForm.cups || ''}
                onChange={e => {
                  setSpForm(p => ({ ...p, cups: e.target.value.toUpperCase() }));
                  if (spErrors.cups) setSpErrors(prev => ({ ...prev, cups: '' }));
                }}
                className={spErrors.cups ? inputErrorClass + ' font-mono' : inputClass + ' font-mono'}
                placeholder="ES0021000000000001AB"
              />
              {spErrors.cups && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {spErrors.cups}
                </p>
              )}
            </div>

            {/* Tariff selector */}
            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Tarifa</label>
              <select
                value={spForm.tariff || '2.0TD'}
                onChange={e => handleTariffChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
              >
                <option value="2.0TD">2.0TD</option>
                <option value="3.0TD">3.0TD</option>
                <option value="6.1TD">6.1TD</option>
                <option value="6.2TD">6.2TD</option>
                <option value="6.3TD">6.3TD</option>
                <option value="6.4TD">6.4TD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Dirección</label>
              <input
                value={spForm.supply_address || ''}
                onChange={e => setSpForm(p => ({ ...p, supply_address: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Comercializadora actual</label>
              <input
                value={spForm.current_retailer || ''}
                onChange={e => setSpForm(p => ({ ...p, current_retailer: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Potencia FV (kWp)</label>
              <input
                type="number"
                value={spForm.pv_power_kwp || ''}
                onChange={e => setSpForm(p => ({ ...p, pv_power_kwp: parseFloat(e.target.value) || 0 }))}
                className={inputClass}
              />
            </div>

            {/* Dynamic power values based on tariff */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">
                Potencias Contratadas (kW) — {spTariffConfig.potencia} periodo{spTariffConfig.potencia > 1 ? 's' : ''}
              </label>
              <div className={`grid gap-2 ${spTariffConfig.potencia <= 3 ? 'grid-cols-3' : 'grid-cols-3 md:grid-cols-6'}`}>
                {spTariffConfig.labels.potencia.map((label, i) => {
                  const pk = `p${i + 1}`;
                  return (
                    <div key={pk}>
                      <label className="block text-[10px] text-center text-valere-ink/40 mb-1">{label}</label>
                      <input
                        type="number"
                        value={(spForm.powers as any)?.[pk] || ''}
                        onChange={e => {
                          setSpForm(p => ({
                            ...p,
                            powers: { ...(p.powers as any || {}), [pk]: parseFloat(e.target.value) || 0 }
                          }));
                          if (spErrors.powers) setSpErrors(prev => ({ ...prev, powers: '' }));
                        }}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center"
                      />
                    </div>
                  );
                })}
              </div>
              {spErrors.powers && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {spErrors.powers}
                </p>
              )}
            </div>

            {/* Dynamic annual energy by period based on tariff */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">
                Consumo Anual por Periodo (kWh) — {spTariffConfig.energia} periodo{spTariffConfig.energia > 1 ? 's' : ''}
              </label>
              <div className={`grid gap-2 ${spTariffConfig.energia <= 3 ? 'grid-cols-3' : 'grid-cols-3 md:grid-cols-6'}`}>
                {spTariffConfig.labels.energia.map((label, i) => {
                  const ek = `e${i + 1}_kwh`;
                  return (
                    <div key={ek}>
                      <label className="block text-[10px] text-center text-valere-ink/40 mb-1">{label}</label>
                      <input
                        type="number"
                        value={(spForm as any)[ek] || ''}
                        onChange={e => setSpForm(p => ({ ...p, [ek]: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setSpDialogOpen(false)} className="px-4 py-2 text-sm text-valere-ink/60">Cancelar</button>
            <button
              onClick={saveSP}
              disabled={spMutation.loading}
              className="px-5 py-2 bg-valere-blue-dark text-white rounded-xl text-sm font-medium hover:bg-valere-blue-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {spMutation.loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear Punto
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Invoice Dialog --- */}
      <Dialog open={invDialogOpen} onOpenChange={setInvDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-valere-blue-dark">Nueva Factura</DialogTitle>
            {selectedSP && (
              <p className="text-xs text-valere-ink/40 mt-1">
                Tarifa: {selectedSP.tariff} — {invTariffConfig.energia} periodos de energía
              </p>
            )}
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Mes</label>
              <select
                value={invForm.month || 1}
                onChange={e => setInvForm(p => ({ ...p, month: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString('es-ES', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Año</label>
              <input
                type="number"
                value={invForm.year || new Date().getFullYear()}
                onChange={e => setInvForm(p => ({ ...p, year: parseInt(e.target.value) }))}
                className={inputClass}
              />
            </div>

            {/* Per-period consumption fields */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">
                Consumo por Periodo (kWh) *
              </label>
              <div className={`grid gap-2 ${invTariffConfig.energia <= 3 ? 'grid-cols-3' : 'grid-cols-3 md:grid-cols-6'}`}>
                {invTariffConfig.labels.energia.map((label, i) => (
                  <div key={`cons-${i}`}>
                    <label className="block text-[10px] text-center text-valere-ink/40 mb-1">{label}</label>
                    <input
                      type="number"
                      value={invConsumptionPeriods[i] || ''}
                      onChange={e => updateConsumptionPeriod(i, parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1.5 text-right">
                <span className="text-xs font-semibold text-valere-blue-dark">
                  Total consumo: {totalConsumption.toLocaleString()} kWh
                </span>
              </div>
            </div>

            {/* Per-period surplus fields */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">
                Excedentes por Periodo (kWh)
              </label>
              <div className={`grid gap-2 ${invTariffConfig.energia <= 3 ? 'grid-cols-3' : 'grid-cols-3 md:grid-cols-6'}`}>
                {invTariffConfig.labels.energia.map((label, i) => (
                  <div key={`surp-${i}`}>
                    <label className="block text-[10px] text-center text-valere-ink/40 mb-1">{label}</label>
                    <input
                      type="number"
                      value={invSurplusPeriods[i] || ''}
                      onChange={e => updateSurplusPeriod(i, parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1.5 text-right">
                <span className="text-xs font-semibold text-valere-green-dark">
                  Total excedentes: {totalSurplus.toLocaleString()} kWh
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Total Factura (€)</label>
              <input
                type="number"
                step="0.01"
                value={invForm.total_amount_eur || ''}
                onChange={e => setInvForm(p => ({ ...p, total_amount_eur: parseFloat(e.target.value) || 0 }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Días facturados</label>
              <input
                type="number"
                value={invForm.billed_days || 30}
                onChange={e => setInvForm(p => ({ ...p, billed_days: parseInt(e.target.value) || 30 }))}
                className={inputClass}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Comercializadora</label>
              <input
                value={invForm.retailer || ''}
                onChange={e => setInvForm(p => ({ ...p, retailer: e.target.value }))}
                className={inputClass}
              />
            </div>

            {/* Info note about per-period storage */}
            <div className="col-span-2 bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-blue-600">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                El consumo y excedentes totales se calculan automáticamente como la suma de los periodos.
                El desglose por periodo se almacenará en una futura actualización de la base de datos.
              </p>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setInvDialogOpen(false)} className="px-4 py-2 text-sm text-valere-ink/60">Cancelar</button>
            <button
              onClick={saveInv}
              disabled={invMutation.loading}
              className="px-5 py-2 bg-valere-green-dark text-white rounded-xl text-sm font-medium hover:bg-valere-green-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {invMutation.loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar Factura
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
