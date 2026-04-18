import React, { useState } from 'react';
import {
  ShieldCheck, Users, Plus, Loader2, Trash2, Edit2,
  Settings, DollarSign, Building2, Save
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import EmptyState from '@/components/EmptyState';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import type { UserProfile, Retailer, RetailerOffer, GlobalConfig } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getTariffConfig } from '@/lib/tariffs';

export default function AdminPanel() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-display font-bold text-valere-blue-dark">Administración</h1>
        <p className="text-valere-ink/50 mt-1">Gestiona usuarios, comercializadoras y configuración global</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-white rounded-xl shadow-sm border border-slate-100 p-1">
          <TabsTrigger value="users" className="data-[state=active]:bg-valere-blue-dark data-[state=active]:text-white rounded-lg gap-2">
            <Users className="w-4 h-4" /> Usuarios
          </TabsTrigger>
          <TabsTrigger value="retailers" className="data-[state=active]:bg-valere-blue-dark data-[state=active]:text-white rounded-lg gap-2">
            <Building2 className="w-4 h-4" /> Comercializadoras
          </TabsTrigger>
          <TabsTrigger value="offers" className="data-[state=active]:bg-valere-blue-dark data-[state=active]:text-white rounded-lg gap-2">
            <DollarSign className="w-4 h-4" /> Ofertas
          </TabsTrigger>
          <TabsTrigger value="config" className="data-[state=active]:bg-valere-blue-dark data-[state=active]:text-white rounded-lg gap-2">
            <Settings className="w-4 h-4" /> Config
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="retailers"><RetailersTab /></TabsContent>
        <TabsContent value="offers"><OffersTab /></TabsContent>
        <TabsContent value="config"><ConfigTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function UsersTab() {
  const { data: users, loading, refetch } = useSupabaseQuery<UserProfile>({
    table: 'user_profiles',
    order: { column: 'created_at', ascending: false },
  });

  const roleColor: Record<string, string> = {
    master: 'bg-purple-100 text-purple-700',
    manager: 'bg-blue-100 text-blue-700',
    consultant: 'bg-green-100 text-green-700',
    client: 'bg-slate-100 text-slate-600',
  };

  const changeRole = async (userId: string, role: string) => {
    const { error } = await supabase.from('user_profiles').update({ role }).eq('id', userId);
    if (error) toast.error('Error al cambiar rol');
    else { toast.success('Rol actualizado'); refetch(); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-valere-blue-dark" /></div>;

  return (
    <Card className="border-none shadow-md bg-white mt-4 overflow-hidden">
      <CardContent className="p-0">
        {users.length === 0 ? (
          <EmptyState icon={<Users className="w-8 h-8" />} title="Sin usuarios registrados" />
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="font-bold text-valere-blue-dark pl-6">Nombre</TableHead>
                <TableHead className="font-bold text-valere-blue-dark">Email</TableHead>
                <TableHead className="font-bold text-valere-blue-dark">Rol</TableHead>
                <TableHead className="font-bold text-valere-blue-dark">Estado</TableHead>
                <TableHead className="pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id} className="border-slate-50 hover:bg-slate-50/30">
                  <TableCell className="pl-6 font-semibold text-valere-blue-dark">{u.full_name || '—'}</TableCell>
                  <TableCell className="text-valere-ink/60 text-sm">{u.email}</TableCell>
                  <TableCell>
                    <select
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border-0 cursor-pointer ${roleColor[u.role] || ''}`}
                    >
                      <option value="client">Cliente</option>
                      <option value="consultant">Consultor</option>
                      <option value="manager">Manager</option>
                      <option value="master">Master</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.approved ? 'default' : 'outline'} className={u.approved ? 'bg-valere-green-dark' : ''}>
                      {u.approved ? 'Aprobado' : 'Pendiente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-6">
                    {!u.approved && (
                      <button
                        onClick={async () => {
                          await supabase.from('user_profiles').update({ approved: true }).eq('id', u.id);
                          toast.success('Usuario aprobado');
                          refetch();
                        }}
                        className="text-xs px-3 py-1 bg-valere-green-dark text-white rounded-lg hover:bg-valere-green-medium"
                      >
                        Aprobar
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function RetailersTab() {
  const { data: retailers, loading, refetch } = useSupabaseQuery<Retailer>({
    table: 'retailers',
    order: { column: 'name', ascending: true },
  });
  const mutation = useSupabaseMutation('retailers');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Retailer>>({ name: '', is_active: true, model: '', notes: '' });

  const save = async () => {
    if (!form.name?.trim()) { toast.error('Nombre es obligatorio'); return; }
    if (isEditing && editingId) {
      const { id, created_at, ...updateData } = form as any;
      await mutation.update(editingId, updateData, 'Comercializadora actualizada');
    } else {
      await mutation.insert(form as any, 'Comercializadora creada');
    }
    setDialogOpen(false);
    setIsEditing(false);
    setEditingId(null);
    refetch();
  };

  const startEdit = (r: Retailer) => {
    setForm({ name: r.name, is_active: r.is_active, model: r.model || '', notes: r.notes || '' });
    setIsEditing(true);
    setEditingId(r.id);
    setDialogOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar?')) return;
    await mutation.remove(id, 'Eliminada');
    refetch();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <>
      <Card className="border-none shadow-md bg-white mt-4 overflow-hidden">
        <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-display text-valere-blue-dark">Comercializadoras</CardTitle>
          <button
            onClick={() => { setForm({ name: '', is_active: true, model: '', notes: '' }); setIsEditing(false); setEditingId(null); setDialogOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-valere-blue-dark text-white rounded-xl text-sm hover:bg-valere-blue-medium"
          >
            <Plus className="w-4 h-4" /> Añadir
          </button>
        </CardHeader>
        <CardContent className="p-0">
          {retailers.length === 0 ? (
            <EmptyState icon={<Building2 className="w-8 h-8" />} title="Sin comercializadoras" description="Añade las comercializadoras con las que trabajas." />
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="font-bold text-valere-blue-dark pl-6">Nombre</TableHead>
                  <TableHead className="font-bold text-valere-blue-dark">Modelo</TableHead>
                  <TableHead className="font-bold text-valere-blue-dark">Estado</TableHead>
                  <TableHead className="pr-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {retailers.map(r => (
                  <TableRow key={r.id} className="border-slate-50 hover:bg-slate-50/30">
                    <TableCell className="pl-6 font-semibold text-valere-blue-dark">{r.name}</TableCell>
                    <TableCell className="text-sm text-valere-ink/60">{r.model || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={r.is_active ? 'default' : 'outline'} className={r.is_active ? 'bg-valere-green-dark' : ''}>
                        {r.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6 space-x-1">
                      <button onClick={() => startEdit(r)} className="p-1.5 text-valere-ink/30 hover:text-valere-blue-dark rounded-lg hover:bg-blue-50">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove(r.id)} className="p-1.5 text-valere-ink/30 hover:text-red-500 rounded-lg hover:bg-red-50">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-valere-blue-dark">{isEditing ? 'Editar Comercializadora' : 'Nueva Comercializadora'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Nombre *</label>
              <input
                value={form.name || ''}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                placeholder="Ej: Iberdrola"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Modelo</label>
              <input
                value={form.model || ''}
                onChange={e => setForm(p => ({ ...p, model: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                placeholder="Ej: Batería Virtual"
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setDialogOpen(false)} className="px-4 py-2 text-sm text-valere-ink/60">Cancelar</button>
            <button onClick={save} disabled={mutation.loading} className="px-5 py-2 bg-valere-blue-dark text-white rounded-xl text-sm font-medium hover:bg-valere-blue-medium disabled:opacity-50 flex items-center gap-2">
              {mutation.loading && <Loader2 className="w-4 h-4 animate-spin" />} {isEditing ? 'Guardar' : 'Crear'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function OffersTab() {
  const { data: offers, loading, refetch } = useSupabaseQuery<any>({
    table: 'retailer_offers',
    select: '*, retailers(name)',
    order: { column: 'created_at', ascending: false },
  });
  const { data: retailers } = useSupabaseQuery<Retailer>({ table: 'retailers' });
  const mutation = useSupabaseMutation('retailer_offers');

  const [dialogOpen, setDialogOpen] = useState(false);
  const defaultTariff = '2.0TD';
  const defaultCfg = getTariffConfig(defaultTariff);
  const [form, setForm] = useState<any>({
    retailer_id: '', product_name: '', access_rate: defaultTariff, surplus_model: 'compensacion_simple',
    energy_prices: Array(defaultCfg.energia).fill(0), power_prices: Array(defaultCfg.potencia).fill(0),
    surplus_price_per_kwh: 0, battery_fee_per_kwp_eur: 0, tender_fee_pct: 0,
    allow_zero_invoice: false, include_in_comparison: true,
  });

  const save = async () => {
    if (!form.retailer_id) { toast.error('Selecciona una comercializadora'); return; }
    await mutation.insert(form, 'Oferta creada');
    setDialogOpen(false);
    refetch();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <>
      <Card className="border-none shadow-md bg-white mt-4 overflow-hidden">
        <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-display text-valere-blue-dark">Ofertas de Comercializadoras</CardTitle>
          <button
            onClick={() => {
              const cfg = getTariffConfig('2.0TD');
              setForm({
                retailer_id: '', product_name: '', access_rate: '2.0TD', surplus_model: 'compensacion_simple',
                energy_prices: Array(cfg.energia).fill(0), power_prices: Array(cfg.potencia).fill(0),
                surplus_price_per_kwh: 0, battery_fee_per_kwp_eur: 0, tender_fee_pct: 0,
                allow_zero_invoice: false, include_in_comparison: true,
              });
              setDialogOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-valere-blue-dark text-white rounded-xl text-sm hover:bg-valere-blue-medium"
          >
            <Plus className="w-4 h-4" /> Nueva Oferta
          </button>
        </CardHeader>
        <CardContent className="p-0">
          {offers.length === 0 ? (
            <EmptyState icon={<DollarSign className="w-8 h-8" />} title="Sin ofertas" description="Añade ofertas de comercializadoras para poder realizar comparativas." />
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="font-bold text-valere-blue-dark pl-6">Comercializadora</TableHead>
                  <TableHead className="font-bold text-valere-blue-dark">Producto</TableHead>
                  <TableHead className="font-bold text-valere-blue-dark">Tarifa</TableHead>
                  <TableHead className="font-bold text-valere-blue-dark">Modelo</TableHead>
                  <TableHead className="font-bold text-valere-blue-dark">Comparar</TableHead>
                  <TableHead className="pr-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((o: any) => (
                  <TableRow key={o.id} className="border-slate-50 hover:bg-slate-50/30">
                    <TableCell className="pl-6 font-semibold text-valere-blue-dark">{o.retailers?.name || '—'}</TableCell>
                    <TableCell>{o.product_name || '—'}</TableCell>
                    <TableCell><Badge variant="outline">{o.access_rate}</Badge></TableCell>
                    <TableCell className="text-sm text-valere-ink/60">{o.surplus_model}</TableCell>
                    <TableCell>
                      <Badge variant={o.include_in_comparison ? 'default' : 'outline'} className={o.include_in_comparison ? 'bg-valere-green-dark' : ''}>
                        {o.include_in_comparison ? 'Sí' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <button onClick={async () => { await mutation.remove(o.id, 'Oferta eliminada'); refetch(); }} className="p-1.5 text-valere-ink/30 hover:text-red-500 rounded-lg hover:bg-red-50">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-valere-blue-dark">Nueva Oferta</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Comercializadora *</label>
              <select
                value={form.retailer_id}
                onChange={e => setForm((p: any) => ({ ...p, retailer_id: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
              >
                <option value="">— Seleccionar —</option>
                {retailers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Producto</label>
              <input value={form.product_name} onChange={e => setForm((p: any) => ({ ...p, product_name: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Tarifa</label>
              <select value={form.access_rate} onChange={e => {
                const newTariff = e.target.value;
                const cfg = getTariffConfig(newTariff);
                setForm((p: any) => ({
                  ...p,
                  access_rate: newTariff,
                  energy_prices: Array.from({ length: cfg.energia }, (_, i) => p.energy_prices[i] ?? 0),
                  power_prices: Array.from({ length: cfg.potencia }, (_, i) => p.power_prices[i] ?? 0),
                }));
              }} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="2.0TD">2.0TD</option>
                <option value="3.0TD">3.0TD</option>
                <option value="6.1TD">6.1TD</option>
                <option value="6.2TD">6.2TD</option>
                <option value="6.3TD">6.3TD</option>
                <option value="6.4TD">6.4TD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Modelo excedentes</label>
              <select value={form.surplus_model} onChange={e => setForm((p: any) => ({ ...p, surplus_model: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                <option value="compensacion_simple">Compensación Simplificada</option>
                <option value="bateria_virtual_kwh">Batería Virtual</option>
                <option value="gestion_silver">Gestión Silver</option>
                <option value="indexado_pool">Indexado Pool</option>
              </select>
            </div>

            {(() => { const cfg = getTariffConfig(form.access_rate); return (<>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Precios Energía (€/kWh) — {cfg.labels.energia.join(', ')}</label>
              <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cfg.energia}, minmax(0, 1fr))` }}>
                {cfg.labels.energia.map((label, i) => (
                  <div key={i}>
                    <label className="block text-[10px] text-center text-valere-ink/40 mb-1">{label}</label>
                    <input
                      type="number" step="0.001"
                      value={form.energy_prices[i] ?? 0}
                      onChange={e => {
                        const arr = [...form.energy_prices];
                        arr[i] = parseFloat(e.target.value) || 0;
                        setForm((p: any) => ({ ...p, energy_prices: arr }));
                      }}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Precios Potencia (€/kW/año) — {cfg.labels.potencia.join(', ')}</label>
              <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cfg.potencia}, minmax(0, 1fr))` }}>
                {cfg.labels.potencia.map((label, i) => (
                  <div key={i}>
                    <label className="block text-[10px] text-center text-valere-ink/40 mb-1">{label}</label>
                    <input
                      type="number" step="0.001"
                      value={form.power_prices[i] ?? 0}
                      onChange={e => {
                        const arr = [...form.power_prices];
                        arr[i] = parseFloat(e.target.value) || 0;
                        setForm((p: any) => ({ ...p, power_prices: arr }));
                      }}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center"
                    />
                  </div>
                ))}
              </div>
            </div>
            </>); })()}

            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Precio Excedente (€/kWh)</label>
              <input type="number" step="0.001" value={form.surplus_price_per_kwh} onChange={e => setForm((p: any) => ({ ...p, surplus_price_per_kwh: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Fee Batería (€/kWp/mes)</label>
              <input type="number" step="0.01" value={form.battery_fee_per_kwp_eur} onChange={e => setForm((p: any) => ({ ...p, battery_fee_per_kwp_eur: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Fee Licitación (%)</label>
              <input type="number" step="0.1" value={form.tender_fee_pct} onChange={e => setForm((p: any) => ({ ...p, tender_fee_pct: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.allow_zero_invoice} onChange={e => setForm((p: any) => ({ ...p, allow_zero_invoice: e.target.checked }))} className="rounded" />
                Factura a cero
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.include_in_comparison} onChange={e => setForm((p: any) => ({ ...p, include_in_comparison: e.target.checked }))} className="rounded" />
                Comparar
              </label>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setDialogOpen(false)} className="px-4 py-2 text-sm text-valere-ink/60">Cancelar</button>
            <button onClick={save} disabled={mutation.loading} className="px-5 py-2 bg-valere-blue-dark text-white rounded-xl text-sm font-medium hover:bg-valere-blue-medium disabled:opacity-50 flex items-center gap-2">
              {mutation.loading && <Loader2 className="w-4 h-4 animate-spin" />} Crear Oferta
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConfigTab() {
  const { data: configs, refetch } = useSupabaseQuery<GlobalConfig>({ table: 'global_config' });
  const [vatPct, setVatPct] = useState(21);
  const [ieePct, setIeePct] = useState(5.1127);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (configs.length > 0) {
      setVatPct(configs[0].vat_pct || 21);
      setIeePct(configs[0].iee_pct || 5.1127);
    }
  }, [configs]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      if (configs.length > 0) {
        await supabase.from('global_config').update({ vat_pct: vatPct, iee_pct: ieePct }).eq('id', configs[0].id);
      } else {
        await supabase.from('global_config').insert({ vat_pct: vatPct, iee_pct: ieePct });
      }
      toast.success('Configuración guardada');
      refetch();
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-none shadow-md bg-white mt-4">
      <CardHeader>
        <CardTitle className="text-lg font-display text-valere-blue-dark">Configuración Global</CardTitle>
        <CardDescription>Impuestos aplicados a las simulaciones de factura</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div>
            <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">IVA (%)</label>
            <input type="number" step="0.01" value={vatPct} onChange={e => setVatPct(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">IEE (%)</label>
            <input type="number" step="0.0001" value={ieePct} onChange={e => setIeePct(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
          </div>
        </div>
        <button onClick={saveConfig} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-valere-blue-dark text-white rounded-xl text-sm hover:bg-valere-blue-medium disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
        </button>
      </CardContent>
    </Card>
  );
}
