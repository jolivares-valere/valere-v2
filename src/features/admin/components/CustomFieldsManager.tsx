import React, { useState } from 'react'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import EmptyState from '@/core/components/EmptyState'
import {
  useCustomFieldsSchemaAdmin,
  useCreateCustomFieldSchema,
  useUpdateCustomFieldSchema,
  useDeleteCustomFieldSchema,
} from '@/core/hooks/useCustomFields'
import type { CustomFieldSchema, EntidadTipo, TipoDatoCustom } from '@/core/types/entities'
import { toast } from 'sonner'

const ENTIDADES: { value: EntidadTipo; label: string }[] = [
  { value: 'empresa', label: 'Empresas' },
  { value: 'oportunidad', label: 'Oportunidades' },
  { value: 'contacto', label: 'Contactos' },
  { value: 'contrato', label: 'Contratos' },
]

const TIPOS: { value: TipoDatoCustom; label: string }[] = [
  { value: 'texto', label: 'Texto libre' },
  { value: 'numero', label: 'Número' },
  { value: 'fecha', label: 'Fecha' },
  { value: 'booleano', label: 'Sí / No' },
  { value: 'lista', label: 'Lista (una opción)' },
  { value: 'multiselect', label: 'Multiselección' },
]

const tipoBadge: Record<TipoDatoCustom, string> = {
  texto: 'bg-slate-100 text-slate-600',
  numero: 'bg-blue-50 text-blue-700',
  fecha: 'bg-purple-50 text-purple-700',
  booleano: 'bg-yellow-50 text-yellow-700',
  lista: 'bg-green-50 text-green-700',
  multiselect: 'bg-orange-50 text-orange-700',
}

interface FieldForm {
  etiqueta: string
  nombre_campo: string
  tipo_dato: TipoDatoCustom
  opciones_lista: string
  obligatorio: boolean
  orden: number
}

const emptyForm = (): FieldForm => ({
  etiqueta: '',
  nombre_campo: '',
  tipo_dato: 'texto',
  opciones_lista: '',
  obligatorio: false,
  orden: 0,
})

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 50)
}

export default function CustomFieldsManager() {
  const { data: allFields = [], isLoading } = useCustomFieldsSchemaAdmin()
  const createMutation = useCreateCustomFieldSchema()
  const updateMutation = useUpdateCustomFieldSchema()
  const deleteMutation = useDeleteCustomFieldSchema()

  const [activeTab, setActiveTab] = useState<EntidadTipo>('empresa')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CustomFieldSchema | null>(null)
  const [form, setForm] = useState<FieldForm>(emptyForm())
  const [slugManualmenteEditado, setSlugManualmenteEditado] = useState(false)

  const fields = allFields.filter(f => f.entidad_tipo === activeTab)

  const openCreate = () => {
    const maxOrden = fields.reduce((m, f) => Math.max(m, f.orden), 0)
    setEditing(null)
    setForm({ ...emptyForm(), orden: maxOrden + 10 })
    setSlugManualmenteEditado(false)
    setDialogOpen(true)
  }

  const openEdit = (f: CustomFieldSchema) => {
    setEditing(f)
    setForm({
      etiqueta: f.etiqueta,
      nombre_campo: f.nombre_campo,
      tipo_dato: f.tipo_dato,
      opciones_lista: Array.isArray(f.opciones_lista) ? (f.opciones_lista as string[]).join('\n') : '',
      obligatorio: f.obligatorio,
      orden: f.orden,
    })
    setSlugManualmenteEditado(true)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.etiqueta.trim()) { toast.error('La etiqueta es obligatoria'); return }
    const nombre = form.nombre_campo.trim() || slugify(form.etiqueta)
    const opciones = ['lista', 'multiselect'].includes(form.tipo_dato)
      ? form.opciones_lista.split('\n').map(s => s.trim()).filter(Boolean)
      : null

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          etiqueta: form.etiqueta.trim(),
          nombre_campo: nombre,
          tipo_dato: form.tipo_dato,
          opciones_lista: opciones as never,
          obligatorio: form.obligatorio,
          orden: form.orden,
        })
        toast.success('Campo actualizado')
      } else {
        await createMutation.mutateAsync({
          entidad_tipo: activeTab,
          etiqueta: form.etiqueta.trim(),
          nombre_campo: nombre,
          tipo_dato: form.tipo_dato,
          opciones_lista: opciones as never,
          obligatorio: form.obligatorio,
          orden: form.orden,
          activo: true,
        })
        toast.success('Campo creado')
      }
      setDialogOpen(false)
    } catch {
      toast.error('Error guardando el campo')
    }
  }

  const toggleActivo = async (f: CustomFieldSchema) => {
    try {
      await updateMutation.mutateAsync({ id: f.id, activo: !f.activo })
      toast.success(f.activo ? 'Campo desactivado' : 'Campo activado')
    } catch {
      toast.error('Error actualizando campo')
    }
  }

  const handleDelete = async (f: CustomFieldSchema) => {
    if (!confirm(`¿Eliminar el campo "${f.etiqueta}"? Se perderán todos los valores guardados.`)) return
    try {
      await deleteMutation.mutateAsync(f.id)
      toast.success('Campo eliminado')
    } catch {
      toast.error('Error eliminando campo')
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <Card className="border-none shadow-md bg-white">
      <CardHeader className="border-b border-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-display text-valere-blue-dark">Campos personalizados</CardTitle>
            <p className="text-sm text-valere-ink/50 mt-0.5">Define campos extra para cada tipo de entidad</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-valere-blue-dark px-4 py-2 text-sm font-medium text-white hover:bg-valere-blue-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> Nuevo campo
          </button>
        </div>

        {/* Entity type tabs */}
        <div className="mt-4 flex gap-1 border-b border-slate-100 pb-0">
          {ENTIDADES.map(e => (
            <button
              key={e.value}
              onClick={() => setActiveTab(e.value)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === e.value
                  ? 'border-valere-blue-dark text-valere-blue-dark'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {e.label}
              {allFields.filter(f => f.entidad_tipo === e.value).length > 0 && (
                <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                  {allFields.filter(f => f.entidad_tipo === e.value).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : fields.length === 0 ? (
          <EmptyState
            icon={<Plus className="h-8 w-8" />}
            title="Sin campos personalizados"
            description={`No hay campos definidos para ${ENTIDADES.find(e => e.value === activeTab)?.label ?? activeTab}. Crea el primero.`}
          />
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="pl-6 font-bold text-valere-blue-dark">Etiqueta</TableHead>
                <TableHead className="font-bold text-valere-blue-dark">Clave interna</TableHead>
                <TableHead className="font-bold text-valere-blue-dark">Tipo</TableHead>
                <TableHead className="font-bold text-valere-blue-dark">Orden</TableHead>
                <TableHead className="font-bold text-valere-blue-dark">Obligatorio</TableHead>
                <TableHead className="font-bold text-valere-blue-dark">Estado</TableHead>
                <TableHead className="pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map(f => (
                <TableRow key={f.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors">
                  <TableCell className="pl-6 font-semibold text-valere-blue-dark">{f.etiqueta}</TableCell>
                  <TableCell className="font-mono text-xs text-valere-ink/50">{f.nombre_campo}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${tipoBadge[f.tipo_dato]}`}>
                      {TIPOS.find(t => t.value === f.tipo_dato)?.label ?? f.tipo_dato}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">{f.orden}</TableCell>
                  <TableCell>
                    {f.obligatorio
                      ? <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100 text-xs">Sí</Badge>
                      : <span className="text-xs text-slate-400">No</span>}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleActivo(f)}
                      className="flex items-center gap-1 text-xs transition-colors"
                      title={f.activo ? 'Desactivar' : 'Activar'}
                    >
                      {f.activo
                        ? <><ToggleRight className="h-4 w-4 text-green-500" /><span className="text-green-600">Activo</span></>
                        : <><ToggleLeft className="h-4 w-4 text-slate-400" /><span className="text-slate-400">Inactivo</span></>}
                    </button>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(f)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(f)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-valere-blue-dark">
              {editing ? 'Editar campo' : 'Nuevo campo personalizado'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Etiqueta (visible en UI) *</span>
              <input
                type="text"
                value={form.etiqueta}
                onChange={e => {
                  const et = e.target.value
                  setForm(f => ({
                    ...f,
                    etiqueta: et,
                    nombre_campo: slugManualmenteEditado ? f.nombre_campo : slugify(et),
                  }))
                }}
                placeholder="Ej: Tarifa habitual"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue-medium/30"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Clave interna</span>
              <input
                type="text"
                value={form.nombre_campo}
                onChange={e => {
                  setSlugManualmenteEditado(true)
                  setForm(f => ({ ...f, nombre_campo: slugify(e.target.value) }))
                }}
                placeholder="Ej: tarifa_habitual (auto)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue-medium/30"
              />
              <p className="mt-0.5 text-[11px] text-slate-400">Sin espacios. Se genera automáticamente desde la etiqueta.</p>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Tipo de dato *</span>
              <select
                value={form.tipo_dato}
                onChange={e => setForm(f => ({ ...f, tipo_dato: e.target.value as TipoDatoCustom }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue-medium/30"
              >
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>

            {(form.tipo_dato === 'lista' || form.tipo_dato === 'multiselect') && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Opciones (una por línea) *</span>
                <textarea
                  value={form.opciones_lista}
                  onChange={e => setForm(f => ({ ...f, opciones_lista: e.target.value }))}
                  rows={4}
                  placeholder={'Opción A\nOpción B\nOpción C'}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue-medium/30"
                />
              </label>
            )}

            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.obligatorio}
                  onChange={e => setForm(f => ({ ...f, obligatorio: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-slate-700">Obligatorio</span>
              </label>
              <label className="block">
                <span className="text-sm text-slate-700">Orden</span>
                <input
                  type="number"
                  value={form.orden}
                  onChange={e => setForm(f => ({ ...f, orden: parseInt(e.target.value) || 0 }))}
                  className="ml-2 w-20 rounded-xl border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-valere-blue-medium/30"
                />
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button
              onClick={() => setDialogOpen(false)}
              className="rounded-xl px-4 py-2 text-sm text-slate-500 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-valere-blue-dark px-5 py-2 text-sm font-medium text-white hover:bg-valere-blue-medium disabled:opacity-60"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editing ? 'Actualizar' : 'Crear campo'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
