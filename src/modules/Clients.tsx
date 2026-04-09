import React, { useState } from 'react';
import {
  Plus, Search, MoreVertical, Building2, MapPin, Phone, Mail,
  Edit2, Trash2, Users, Loader2, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import EmptyState from '@/components/EmptyState';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import type { Client } from '@/types/database';
import { toast } from 'sonner';

const emptyClient: Partial<Client> = {
  company_name: '', nif: '', fiscal_address: '', contact_person: '',
  contact_email: '', contact_phone: '', fiscal_city: '', fiscal_zip: '', fiscal_province: '', notes: '',
};

export default function Clients() {
  const { data: clients, loading, refetch } = useSupabaseQuery<Client>({
    table: 'clients',
    order: { column: 'created_at', ascending: false },
    errorMessage: 'Error al cargar clientes',
  });
  const mutation = useSupabaseMutation('clients');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<Client>>(emptyClient);
  const [isEditing, setIsEditing] = useState(false);

  const filtered = clients.filter(c =>
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    c.nif.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_person.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditingClient({ ...emptyClient });
    setIsEditing(false);
    setDialogOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditingClient({ ...c });
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingClient.company_name?.trim()) {
      toast.error('El nombre de la empresa es obligatorio');
      return;
    }
    const { company_name, nif, fiscal_address, contact_person, contact_email, contact_phone, fiscal_city, fiscal_zip, fiscal_province, notes } = editingClient;
    const payload = { company_name, nif, fiscal_address, contact_person, contact_email, contact_phone, fiscal_city, fiscal_zip, fiscal_province, notes };

    if (isEditing && editingClient.id) {
      await mutation.update(editingClient.id, payload as any, 'Cliente actualizado');
    } else {
      await mutation.insert(payload as any, 'Cliente creado');
    }
    setDialogOpen(false);
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return;
    await mutation.remove(id, 'Cliente eliminado');
    refetch();
  };

  const updateField = (field: string, value: string) => {
    setEditingClient(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-valere-blue-dark" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-valere-blue-dark">Clientes</h1>
          <p className="text-valere-ink/50 mt-1">Gestiona tu cartera de clientes</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-valere-blue-dark text-white rounded-xl text-sm font-medium hover:bg-valere-blue-medium transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" /> Nuevo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-valere-ink/30" />
        <input
          placeholder="Buscar por empresa, NIF o contacto..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue-medium/30 focus:border-valere-blue-medium transition-all"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card className="border-none shadow-md bg-white overflow-hidden">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Users className="w-8 h-8" />}
              title={clients.length === 0 ? 'Sin clientes aún' : 'Sin resultados'}
              description={clients.length === 0
                ? 'Añade tu primer cliente para comenzar a gestionar su energía.'
                : 'No se encontraron clientes con esos criterios de búsqueda.'}
              action={clients.length === 0 && (
                <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-valere-blue-dark text-white rounded-xl text-sm hover:bg-valere-blue-medium transition-colors">
                  <Plus className="w-4 h-4" /> Añadir Cliente
                </button>
              )}
            />
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="font-bold text-valere-blue-dark pl-6">Empresa</TableHead>
                  <TableHead className="font-bold text-valere-blue-dark">NIF</TableHead>
                  <TableHead className="font-bold text-valere-blue-dark">Contacto</TableHead>
                  <TableHead className="font-bold text-valere-blue-dark">Ciudad</TableHead>
                  <TableHead className="text-right pr-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-valere-blue-medium/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-valere-blue-dark" />
                        </div>
                        <span className="font-semibold text-valere-blue-dark">{c.company_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50 font-mono text-xs">{c.nif || '—'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{c.contact_person || '—'}</p>
                        {c.contact_email && (
                          <p className="text-xs text-valere-ink/40 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {c.contact_email}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-valere-ink/60 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {c.fiscal_city || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <button className="p-2 hover:bg-slate-50 rounded-xl text-valere-ink/40 hover:text-valere-blue-dark transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl w-44">
                          <DropdownMenuItem onClick={() => openEdit(c)} className="gap-2">
                            <Edit2 className="w-4 h-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(c.id)}
                            className="gap-2 text-red-500 focus:text-red-500"
                          >
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-valere-blue-dark">
              {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {[
              { key: 'company_name', label: 'Empresa *', span: 2 },
              { key: 'nif', label: 'NIF' },
              { key: 'contact_person', label: 'Persona de contacto' },
              { key: 'contact_email', label: 'Email', type: 'email' },
              { key: 'contact_phone', label: 'Teléfono', type: 'tel' },
              { key: 'fiscal_address', label: 'Dirección fiscal', span: 2 },
              { key: 'fiscal_city', label: 'Ciudad' },
              { key: 'fiscal_province', label: 'Provincia' },
              { key: 'fiscal_zip', label: 'Código postal' },
            ].map(field => (
              <div key={field.key} className={field.span === 2 ? 'col-span-2' : ''}>
                <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">
                  {field.label}
                </label>
                <input
                  type={field.type || 'text'}
                  value={(editingClient as any)[field.key] || ''}
                  onChange={e => updateField(field.key, e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue-medium/30 focus:border-valere-blue-medium transition-all"
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-valere-ink/50 uppercase tracking-wider mb-1.5">Notas</label>
              <textarea
                value={editingClient.notes || ''}
                onChange={e => updateField('notes', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue-medium/30 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setDialogOpen(false)}
              className="px-4 py-2 text-sm text-valere-ink/60 hover:text-valere-ink transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={mutation.loading}
              className="px-5 py-2 bg-valere-blue-dark text-white rounded-xl text-sm font-medium hover:bg-valere-blue-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {mutation.loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Guardar Cambios' : 'Crear Cliente'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
