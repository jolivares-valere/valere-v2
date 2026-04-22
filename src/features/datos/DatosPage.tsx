import React, { useState, useMemo } from 'react';
import {
  FileUp, Plus, Search, Loader2, Trash2, Save, Building2, Zap, Calendar, AlertCircle, Edit2
} from 'lucide-react';
import DatadisPanel from './components/DatadisPanel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/core/components/EmptyState';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { useSupabaseQuery, useSupabaseMutation } from '@/core/hooks/useSupabaseQuery';
import type { SupplyPoint, InvoiceHistory } from '@/types/database';
import type { Cups, Empresa } from '@/core/types/entities';
import { cupsToSupplyPoint, supplyPointFormToCupsPayload } from '@/core/energia/adapters';
import { toast } from 'sonner';
import { getTariffConfig, validateCUPS, validatePowers } from '@/core/energia/tariffs';

export default function DataCapture() {
  const { data: empresas } = useSupabaseQuery<Empresa>({
    table: 'empresas',
    filters: [{ column: 'deleted_at', op: 'eq', value: null }],
    order: { column: 'nombre', ascending: true },
  });

  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const { data: cupsRows, loading: loadingSP, refetch: refetchSP } = useSupabaseQuery<Cups>({
    table: 'cups',
    filters: selectedClientId
      ? [
          { column: 'empresa_id', op: 'eq', value: selectedClientId },
          { column: 'deleted_at', op: 'eq', value: null },
        ]
      : [],
    enabled: !!selectedClientId,
  });

  const supplyPoints = useMemo(() => cupsRows.map(cupsToSupplyPoint), [cupsRows]);

  const [selectedSPId, setSelectedSPId] = useState<string>('');

  const { data: invoices, loading: loadingInv, refetch: refetchInv } = useSupabaseQuery<InvoiceHistory>({
    table: 'facturas',
    filters: selectedSPId ? [{ column: 'cups_id', op: 'eq', value: selectedSPId }] : [],
    order: { column: 'year', ascending: false },
    enabled: !!selectedSPId,
  });

  const spMutation = useSupabaseMutation('cups');
  const invMutation = useSupabaseMutation('facturas');

  // --- Supply Point Dialog ---
  const [spDialogOpen, setSpDialogOpen] = useState(false);
  const [isEditingSP, setIsEditingSP] = useState(false);
  const [editingSPId, setEditingSPId] = useState<string | null>(null);
  const [spForm, setSpForm] = useState<Partial<SupplyPoint>>({});
  const [spErrors, setSpErrors] = useState<Record<string, string>>({});
  const [invToDelete, setInvToDelete] = useState<string | null>(null);

  // Dynamic tariff config for SP form
  const spTariffConfig = useMemo(
    () => getTariffConfig(spForm.tariff || '2.0TD'),
    [spForm.tariff]
  );

  const openNewSP = () => {
    setSpForm({
      client_id: selectedClientId,
      tariff: '2.0TD',
      powers: { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 },
    });
    setSpErrors({});
    setIsEditingSP(false);
    setEditingSPId(null);
    setSpDialogOpen(true);
  };

  const startEditSP = (sp: SupplyPoint) => {
    setSpForm({
      client_id: sp.client_id,
      cups: sp.cups,
      tariff: sp.tariff || '2.0TD',
      powers: sp.powers || { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 },
      supply_address: sp.supply_address || '',
      current_retailer: sp.current_retailer || '',
      pv_power_kwp: sp.pv_power_kwp || 0,
    });
    setSpErrors({});
    setIsEditingSP(true);
    setEditingSPId(sp.id);
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
      (spForm.powers as unknown as Record<string, number>) || {}
    );
    if (powersError) errors.powers = powersError;

    if (Object.keys(errors).length > 0) {
      setSpErrors(errors);
      // Also show first error as toast for visibility
      toast.error(Object.values(errors)[0]);
      return;
    }

    setSpErrors({});
    const payload = supplyPointFormToCupsPayload(spForm, selectedClientId);
    if (isEditingSP && editingSPId) {
      const { empresa_id: _empresaId, ...updateData } = payload;
      void _empresaId;
      await spMutation.update(editingSPId, updateData as never, 'Punto de suministro actualizado');
    } else {
      await spMutation.insert(payload as never, 'Punto de suministro creado');
    }
    setSpDialogOpen(false);
    setIsEditingSP(false);
    setEditingSPId(null);
    refetchSP();
  };

  // --- Invoice Dialog ---
  const [invDialogOpen, setInvDialogOpen] = useState(false);
  const [isEditingInv, setIsEditingInv] = useState(false);
  const [editingInvId, setEditingInvId] = useState<string | null>(null);
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
      cups_id: selectedSPId,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      billed_days: 30,
      consumption_kwh: 0,
      surplus_kwh: 0,
    });
    setIsEditingInv(false);
    setEditingInvId(null);
    setInvDialogOpen(true);
  };

  const startEditInv = (inv: InvoiceHistory) => {
    const numPeriods = invTariffConfig.energia;
    setInvConsumptionPeriods(
      Array.from({ length: numPeriods }, (_, i) => (inv as any)[`consumption_p${i + 1}`] || 0)
    );
    setInvSurplusPeriods(
      Array.from({ length: numPeriods }, (_, i) => (inv as any)[`surplus_p${i + 1}`] || 0)
    );
    setInvForm({
      cups_id: inv.cups_id ?? selectedSPId,
      month: inv.month,
      year: inv.year,
      billed_days: inv.billed_days || 30,
      consumption_kwh: inv.consumption_kwh || 0,
      surplus_kwh: inv.surplus_kwh || 0,
      total_amount_eur: inv.total_amount_eur || 0,
      retailer: inv.retailer || '',
    });
    setIsEditingInv(true);
    setEditingInvId(inv.id);
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
    if (isEditingInv && editingInvId) {
      const { id, created_at, cups_id, supply_point_id, ...updateData } = payload as any;
      void id; void created_at; void cups_id; void supply_point_id;
      await invMutation.update(editingInvId, updateData, 'Factura actualizada');
    } else {
      await invMutation.insert(payload as any, 'Factura registrada');
    }
    setInvDialogOpen(false);
    setIsEditingInv(false);
    setEditingInvId(null);
    refetchInv();
  };

  const confirmDeleteInv = async () => {
    if (!invToDelete) return;
    await invMutation.remove(invToDelete, 'Factura eliminada');
    setInvToDelete(null);
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
                {empresas.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
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
                  {selectedSPId && (() => {
                    const sp = supplyPoints.find(s => s.id === selectedSPId);
                    return sp ? (
                      <button
                        onClick={() => startEditSP(sp)}
                        className="px-3 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5 shrink-0"
                        title="Editar punto de suministro"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    ) : null;
                  })()}
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
              <table className="w-full">
                <tbody>
                  {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={6} />)}
                </tbody>
              </table>
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
                      <TableCell className="text-right pr-6 space-x-1">
                        <button
                          onClick={() => startEditInv(inv)}
                          className="p-1.5 text-valere-ink/30 hover:text-valere-blue-dark rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setInvToDelete(inv.id)}
                          aria-label="Eliminar factura"
                          className="p-1.5 text-valere-ink/30 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
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

      {/* Panel de integración Datadis — visible cuando hay CUPS seleccionado */}
      {selectedSPId && (() => {
        const cupsSeleccionado = cupsRows.find(c => c.id === selectedSPId);
        return cupsSeleccionado ? (
          <Card className="border-none shadow-md bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50">
              <CardTitle className="text-lg font-display text-valere-blue-dark flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                Datadis
                {cupsSeleccionado.datadis_sincronizado && (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800 ml-1">
                    Sincronizado
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Importa datos técnicos y consumos históricos automáticamente desde datadis.es
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <DatadisPanel cups={cupsSeleccionado} />
            </CardContent>
          </Card>
        ) : null;
      })()}

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
            <DialogTitle className="font-display text-valere-blue-dark">{isEditingSP ? 'Editar Punto de Suministro' : 'Nuevo Punto de Suministro'}</DialogTitle>
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
              {isEditingSP ? 'Guardar' : 'Crear Punto'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Invoice Dialog --- */}
      <Dialog open={invDialogOpen} onOpenChange={setInvDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-valere-blue-dark">{isEditingInv ? 'Editar Factura' : 'Nueva Factura'}</DialogTitle>
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
              {isEditingInv ? 'Guardar' : 'Guardar Factura'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!invToDelete}
        title="Eliminar factura"
        message="¿Eliminar esta factura? No se podrá recuperar."
        confirmLabel="Eliminar"
        variant="danger"
        submitting={invMutation.loading}
        onConfirm={confirmDeleteInv}
        onCancel={() => setInvToDelete(null)}
      />
    </div>
  );
}
