import React, { useState } from 'react';
import {
  ShieldCheck, Users, Plus, Loader2, Trash2, Edit2,
  Settings, DollarSign, Building2, Save, Sliders,
  UserPlus, Check, X, Upload
} from 'lucide-react';
import XLSXImportadorTarifas from './components/XLSXImportadorTarifas';
import AuditoriaTab from './components/AuditoriaTab';
import { useAuth } from '@/core/hooks/useAuth';
import CustomFieldsManager from './components/CustomFieldsManager';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/core/components/EmptyState';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { useSupabaseQuery, useSupabaseMutation } from '@/core/hooks/useSupabaseQuery';
import type { UserProfile, Retailer, RetailerOffer, SurplusModel, GlobalConfig } from '@/types/database';
import { supabase } from '@/core/supabase/client';
import { toast } from 'sonner';
import { getTariffConfig } from '@/core/energia/tariffs';

// ─── Tipos derivados para esta página ──────────────────────────────────────

/** Form de comercializadora (subset editable) */
type RetailerFormState = Partial<Retailer>;

/** Oferta con la relación a comercializadora resuelta por el join `select '*, comercializadoras(name)'` */
type OfferWithRetailer = RetailerOffer & {
  comercializadoras: Pick<Retailer, 'name'> | null;
};

/** Form para crear/editar una oferta. Igual que RetailerOffer pero sin id/created_at */
type OfferFormState = Omit<RetailerOffer, 'id' | 'created_at'>;

export default function AdminPanel() {
  const { user } = useAuth()
  const isMaster = user?.role === 'master'

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
          <TabsTrigger value="pendientes" className="data-[state=active]:bg-valere-blue-dark data-[state=active]:text-white rounded-lg gap-2">
            <UserPlus className="w-4 h-4" /> Pendientes
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
          <TabsTrigger value="campos" className="data-[state=active]:bg-valere-blue-dark data-[state=active]:text-white rounded-lg gap-2">
            <Sliders className="w-4 h-4" /> Campos
          </TabsTrigger>
          <TabsTrigger value="importar" className="data-[state=active]:bg-valere-blue-dark data-[state=active]:text-white rounded-lg gap-2">
            <Upload className="w-4 h-4" /> Importar tarifas
          </TabsTrigger>
          {isMaster && (
            <TabsTrigger value="auditoria" className="data-[state=active]:bg-valere-blue-dark data-[state=active]:text-white rounded-lg gap-2">
              <ShieldCheck className="w-4 h-4" /> Auditoría
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="pendientes"><PendientesTab /></TabsContent>
        <TabsContent value="retailers"><RetailersTab /></TabsContent>
        <TabsContent value="offers"><OffersTab /></TabsContent>
        <TabsContent value="config"><ConfigTab /></TabsContent>
        <TabsContent value="campos"><CustomFieldsManager /></TabsContent>
        <TabsContent value="importar"><XLSXImportadorTarifas /></TabsContent>
        {isMaster && <TabsContent value="auditoria"><AuditoriaTab /></TabsContent>}
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

  if (loading) return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-md">
      <table className="w-full">
        <tbody>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={4} />)}
        </tbody>
      </table>
    </div>
  );

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
    table: 'comercializadoras',
    order: { column: 'name', ascending: true },
  });
  const mutation = useSupabaseMutation('comercializadoras');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Retailer>>({ name: '', is_active: true, model: '', notes: '' });
  const [toDelete, setToDelete] = useState<Retailer | null>(null);

  const save = async () => {
    if (!form.name?.trim()) { toast.error('Nombre es obligatorio'); return; }
    // Excluir campos generados por la BD si vienen del registro en edición
    const { id: _id, created_at: _created, ...payload } = form;
    void _id; void _created;
    if (isEditing && editingId) {
      await mutation.update(editingId, payload as Record<string, unknown>, 'Comercializadora actualizada');
    } else {
      await mutation.insert(payload as Record<string, unknown>, 'Comercializadora creada');
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

  const confirmRemove = async () => {
    if (!toDelete) return;
    await mutation.remove(toDelete.id, 'Eliminada');
    setToDelete(null);
    refetch();
  };

  if (loading) return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-md">
      <table className="w-full">
        <tbody>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={4} />)}
        </tbody>
      </table>
    </div>
  );

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
                      <button onClick={() => startEdit(r)} aria-label={`Editar ${r.name}`} className="p-1.5 text-valere-ink/30 hover:text-valere-blue-dark rounded-lg hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-valere-blue-medium/40">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setToDelete(r)} aria-label={`Eliminar ${r.name}`} className="p-1.5 text-valere-ink/30 hover:text-red-500 rounded-lg hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40">
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

      <ConfirmDialog
        isOpen={!!toDelete}
        title="Eliminar comercializadora"
        message={toDelete ? `¿Seguro que quieres eliminar "${toDelete.name}"? Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        submitting={mutation.loading}
        onConfirm={confirmRemove}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}

function OffersTab() {
  const { data: offers, loading, refetch } = useSupabaseQuery<OfferWithRetailer>({
    table: 'comercializadora_ofertas',
    select: '*, comercializadoras(name)',
    order: { column: 'created_at', ascending: false },
  });
  const { data: retailers } = useSupabaseQuery<Retailer>({ table: 'comercializadoras' });
  const mutation = useSupabaseMutation('comercializadora_ofertas');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [offerToDelete, setOfferToDelete] = useState<OfferWithRetailer | null>(null);

  const buildEmptyForm = (tariff: string = '2.0TD'): OfferFormState => {
    const cfg = getTariffConfig(tariff);
    return {
      comercializadora_id: '',
      product_name: '',
      access_rate: tariff,
      surplus_model: 'compensacion_simple',
      energy_prices: Array(cfg.energia).fill(0),
      power_prices: Array(cfg.potencia).fill(0),
      surplus_price_per_kwh: 0,
      entry_fee_eur: 0,
      entry_fee_per_kw: 0,
      annual_management_fee_eur: 0,
      tender_fee_pct: 0,
      activation_fee_eur: 0,
      battery_fee_per_kwp_eur: 0,
      allow_zero_invoice: false,
      min_contract_months: 0,
      include_in_comparison: true,
      show_tolls_separately: false,
      notes: '',
      price_type: 'fijo' as const,
      spread_eur_kwh: 0,
    };
  };

  const [form, setForm] = useState<OfferFormState>(() => buildEmptyForm());

  const save = async () => {
    if (!form.comercializadora_id) { toast.error('Selecciona una comercializadora'); return; }
    if (isEditing && editingId) {
      await mutation.update(editingId, form as unknown as Record<string, unknown>, 'Oferta actualizada');
    } else {
      await mutation.insert(form as unknown as Record<string, unknown>, 'Oferta creada');
    }
    setDialogOpen(false);
    setIsEditing(false);
    setEditingId(null);
    refetch();
  };

  const startEditOffer = (o: OfferWithRetailer) => {
    const cfg = getTariffConfig(o.access_rate || '2.0TD');
    setForm({
      comercializadora_id: o.comercializadora_id ?? '',
      product_name: o.product_name ?? '',
      access_rate: o.access_rate ?? '2.0TD',
      surplus_model: (o.surplus_model ?? 'compensacion_simple') as SurplusModel,
      energy_prices: o.energy_prices ?? Array(cfg.energia).fill(0),
      power_prices: o.power_prices ?? Array(cfg.potencia).fill(0),
      surplus_price_per_kwh: o.surplus_price_per_kwh ?? 0,
      entry_fee_eur: o.entry_fee_eur ?? 0,
      entry_fee_per_kw: o.entry_fee_per_kw ?? 0,
      annual_management_fee_eur: o.annual_management_fee_eur ?? 0,
      tender_fee_pct: o.tender_fee_pct ?? 0,
      activation_fee_eur: o.activation_fee_eur ?? 0,
      battery_fee_per_kwp_eur: o.battery_fee_per_kwp_eur ?? 0,
      allow_zero_invoice: o.allow_zero_invoice ?? false,
      min_contract_months: o.min_contract_months ?? 0,
      include_in_comparison: o.include_in_comparison ?? true,
      show_tolls_separately: o.show_tolls_separately ?? false,
      notes: o.notes ?? '',
      price_type: (o.price_type ?? 'fijo') as 'fijo' | 'indexado',
      spread_eur_kwh: o.spread_eur_kwh ?? 0,
    });
    setIsEditing(true);
    setEditingId(o.id);
    setDialogOpen(true);
  };

  if (loading) return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-md">
      <table className="w-full">
        <tbody>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={4} />)}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <Card className="border-none shadow-md bg-white mt-4 overflow-hidden">
        <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-display text-valere-blue-dark">Ofertas de Comercializadoras</CardTitle>
          <button
            onClick={() => {
              setForm(buildEmptyForm('2.0TD'));
              setIsEditing(false);
              setEditingId(null);
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
                {offers.map((o) => (
                  <TableRow key={o.id} className="border-slate-50 hover:bg-slate-50/30">
                    <TableCell className="pl-6 font-semibold text-valere-blue-dark">{o.comercializadoras?.name || '—'}</TableCell>
                    <TableCell>{o.product_name || '—'}</TableCell>
                    <TableCell><Badge variant="outline">{o.access_rate}</Badge></TableCell>
                    <TableCell className="text-sm text-valere-ink/60">{o.surplus_model}</TableCell>
                    <TableCell>
                      <Badge variant={o.include_in_comparison ? 'default' : 'outline'} className={o.include_in_comparison ? 'bg-valere-green-dark' : ''}>
                        {o.include_in_comparison ? 'Sí' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6 space-x-1">
                      <button onClick={() => startEditOffer(o)} aria-label={`Editar oferta ${o.product_name}`} className="p-1.5 text-valere-ink/30 hover:text-valere-blue-dark rounded-lg hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-valere-blue-medium/40">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setOfferToDelete(o)} aria-label={`Eliminar oferta ${o.product_name}`} className="p-1.5 text-valere-ink/30 hover:text-red-500 rounded-lg hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40">
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
            <DialogTitle className="font-display text-valere-blue-dark">{isEditing ? 'Editar Oferta' : 'Nueva Oferta'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Comercializadora *</label>
              <select
                value={form.comercializadora_id}
                onChange={e => setForm((p) =>({ ...p, comercializadora_id: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
              >
                <option value="">— Seleccionar —</option>
                {retailers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Producto</label>
              <input value={form.product_name} onChange={e => setForm((p) =>({ ...p, product_name: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Tarifa</label>
              <select value={form.access_rate} onChange={e => {
                const newTariff = e.target.value;
                const cfg = getTariffConfig(newTariff);
                setForm((p) =>({
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
              <select value={form.surplus_model} onChange={e => setForm((p) =>({ ...p, surplus_model: e.target.value as SurplusModel }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
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
                        setForm((p) =>({ ...p, energy_prices: arr }));
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
                        setForm((p) =>({ ...p, power_prices: arr }));
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
              <input type="number" step="0.001" value={form.surplus_price_per_kwh} onChange={e => setForm((p) =>({ ...p, surplus_price_per_kwh: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Fee Batería (€/kWp/mes)</label>
              <input type="number" step="0.01" value={form.battery_fee_per_kwp_eur} onChange={e => setForm((p) =>({ ...p, battery_fee_per_kwp_eur: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Fee Licitación (%)</label>
              <input type="number" step="0.1" value={form.tender_fee_pct} onChange={e => setForm((p) =>({ ...p, tender_fee_pct: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.allow_zero_invoice} onChange={e => setForm((p) =>({ ...p, allow_zero_invoice: e.target.checked }))} className="rounded" />
                Factura a cero
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.include_in_comparison} onChange={e => setForm((p) =>({ ...p, include_in_comparison: e.target.checked }))} className="rounded" />
                Comparar
              </label>
            </div>
            <div>
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Tipo de precio</label>
              <select
                value={form.price_type}
                onChange={e => setForm((p) => ({ ...p, price_type: e.target.value as 'fijo' | 'indexado' }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
              >
                <option value="fijo">Precio fijo por periodo</option>
                <option value="indexado">Indexado al pool OMIE</option>
              </select>
            </div>
            {form.price_type === 'indexado' && (
              <div>
                <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Spread sobre pool (EUR/kWh)</label>
                <input
                  type="number" step="0.0001"
                  value={form.spread_eur_kwh}
                  onChange={e => setForm((p) => ({ ...p, spread_eur_kwh: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  placeholder="Ej: 0.0050"
                />
                <p className="text-[11px] text-valere-ink/40 mt-1">Margen de la comercializadora sobre el precio spot diario</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setDialogOpen(false)} className="px-4 py-2 text-sm text-valere-ink/60">Cancelar</button>
            <button onClick={save} disabled={mutation.loading} className="px-5 py-2 bg-valere-blue-dark text-white rounded-xl text-sm font-medium hover:bg-valere-blue-medium disabled:opacity-50 flex items-center gap-2">
              {mutation.loading && <Loader2 className="w-4 h-4 animate-spin" />} {isEditing ? 'Guardar' : 'Crear Oferta'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!offerToDelete}
        title="Eliminar oferta"
        message={offerToDelete ? `¿Seguro que quieres eliminar la oferta "${offerToDelete.product_name}"? Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        submitting={mutation.loading}
        onConfirm={async () => {
          if (!offerToDelete) return;
          await mutation.remove(offerToDelete.id, 'Oferta eliminada');
          setOfferToDelete(null);
          refetch();
        }}
        onCancel={() => setOfferToDelete(null)}
      />
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

// ─── Pendientes de aprobación ──────────────────────────────────────────────

interface PendingUserRow {
  id: string;
  email: string | null;
  nombre: string | null;
  apellidos: string | null;
  full_name: string | null;
  status: string | null;
  approved: boolean | null;
  created_at: string | null;
}

const NOTIFY_USER_FN = 'notify-user-approval-decision';

function PendientesTab() {
  const [rows, setRows] = useState<PendingUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rolesByUser, setRolesByUser] = useState<Record<string, string>>({});
  const [toReject, setToReject] = useState<PendingUserRow | null>(null);

  const fetchPendientes = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, nombre, apellidos, full_name, status, approved, created_at')
      .eq('approved', false)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Error al cargar pendientes');
      setRows([]);
    } else {
      const list = (data ?? []) as PendingUserRow[];
      setRows(list);
      setRolesByUser((prev) => {
        const next = { ...prev };
        for (const u of list) if (!next[u.id]) next[u.id] = 'client';
        return next;
      });
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void fetchPendientes();
  }, [fetchPendientes]);

  const aprobar = async (u: PendingUserRow) => {
    const role = rolesByUser[u.id] ?? 'client';
    setActingId(u.id);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ approved: true, status: 'active', role })
        .eq('id', u.id);
      if (error) throw error;
      toast.success(`Usuario aprobado como ${role}`);
      // Notificar al usuario (best effort)
      try {
        await supabase.functions.invoke(NOTIFY_USER_FN, {
          body: {
            userId: u.id,
            decision: 'approved',
            userEmail: u.email,
            userName: u.full_name ?? `${u.nombre ?? ''} ${u.apellidos ?? ''}`.trim(),
          },
        });
      } catch {
        toast.info('Aprobado. El email de notificación falló (revisa logs).');
      }
      await fetchPendientes();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al aprobar';
      toast.error(msg);
    } finally {
      setActingId(null);
    }
  };

  const rechazar = async () => {
    if (!toReject) return;
    const u = toReject;
    setActingId(u.id);
    try {
      // Capturamos email + nombre ANTES de borrar para poder mandar el email
      const userEmail = u.email;
      const userName = u.full_name ?? `${u.nombre ?? ''} ${u.apellidos ?? ''}`.trim();

      // admin_reject_user añadido en migration 20260426_signup_aprobacion_manual.
      // Cast a never porque los tipos Database no se han regenerado todavía
      // (próximo paso: supabase gen types). El cast es seguro: la fn existe en prod.
      const rpcFn = supabase.rpc as unknown as (
        name: string,
        args: Record<string, unknown>
      ) => Promise<{ error: { message: string } | null }>;
      const { error } = await rpcFn('admin_reject_user', { p_user_id: u.id });
      if (error) throw error;

      toast.success('Usuario rechazado');
      try {
        await supabase.functions.invoke(NOTIFY_USER_FN, {
          body: { userId: u.id, decision: 'rejected', userEmail, userName },
        });
      } catch {
        toast.info('Rechazado. El email de notificación falló (revisa logs).');
      }
      setToReject(null);
      await fetchPendientes();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al rechazar';
      toast.error(msg);
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-md">
        <table className="w-full">
          <tbody>
            {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={5} />)}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <Card className="border-none shadow-md bg-white mt-4 overflow-hidden">
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={<UserPlus className="w-8 h-8" />}
            title="No hay solicitudes pendientes"
            description="Cuando alguien solicite acceso desde /signup aparecerá aquí."
          />
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="font-bold text-valere-blue-dark pl-6">Nombre</TableHead>
                <TableHead className="font-bold text-valere-blue-dark">Email</TableHead>
                <TableHead className="font-bold text-valere-blue-dark">Solicitado</TableHead>
                <TableHead className="font-bold text-valere-blue-dark">Rol al aprobar</TableHead>
                <TableHead className="font-bold text-valere-blue-dark pr-6 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => {
                const composedName = `${u.nombre ?? ''} ${u.apellidos ?? ''}`.trim();
                const displayName = (u.full_name ?? composedName) || '—';
                const fecha = u.created_at
                  ? new Date(u.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
                  : '—';
                const isActing = actingId === u.id;
                return (
                  <TableRow key={u.id} className="border-slate-50 hover:bg-slate-50/30">
                    <TableCell className="pl-6 font-semibold text-valere-blue-dark">{displayName}</TableCell>
                    <TableCell className="text-valere-ink/70 text-sm">{u.email ?? '—'}</TableCell>
                    <TableCell className="text-valere-ink/60 text-xs">{fecha}</TableCell>
                    <TableCell>
                      <select
                        value={rolesByUser[u.id] ?? 'client'}
                        onChange={(e) => setRolesByUser((prev) => ({ ...prev, [u.id]: e.target.value }))}
                        disabled={isActing}
                        className="px-3 py-1 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                      >
                        <option value="client">Cliente</option>
                        <option value="consultant">Consultor</option>
                        <option value="manager">Manager</option>
                        <option value="master">Master</option>
                      </select>
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => aprobar(u)}
                          disabled={isActing}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-valere-green-dark text-white rounded-lg hover:bg-valere-green-medium disabled:opacity-50"
                        >
                          {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Aprobar
                        </button>
                        <button
                          onClick={() => setToReject(u)}
                          disabled={isActing}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50"
                        >
                          <X className="w-3 h-3" /> Rechazar
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <ConfirmDialog
        isOpen={!!toReject}
        title="Rechazar solicitud"
        message={`¿Seguro que quieres rechazar la solicitud de ${toReject?.email ?? 'este usuario'}? Se borrará la cuenta y se le enviará un email.`}
        confirmLabel="Rechazar"
        variant="danger"
        submitting={actingId === toReject?.id}
        onConfirm={rechazar}
        onCancel={() => setToReject(null)}
      />
    </Card>
  );
}
