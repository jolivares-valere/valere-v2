import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, X, Pencil, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../core/supabase/client'
import { useContactos, useCreateContacto, useUpdateContacto, useDeleteContacto } from './api'
import type { ContactoConEmpresa } from './api'
import ContactoForm from './components/ContactoForm'
import type { ContactoInsert } from '../../core/types/entities'

type EditingState = ContactoConEmpresa | 'new' | null

export default function ContactosPage() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? '1')
  const search = params.get('q') ?? ''
  const empresaId = params.get('empresa_id') ?? ''
  const [editing, setEditing] = useState<EditingState>(null)

  const { data, isLoading } = useContactos({
    page,
    pageSize: 50,
    filter: { search, empresa_id: empresaId || undefined },
    sort: { field: 'nombre', direction: 'asc' },
  })

  const createMut = useCreateContacto()
  const updateMut = useUpdateContacto()
  const deleteMut = useDeleteContacto()

  const empresas = useQuery({
    queryKey: ['empresas', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas').select('id, nombre').is('deleted_at', null).order('nombre')
      if (error) throw error
      return (data ?? []) as { id: string; nombre: string }[]
    },
  })

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / 50))

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.set('page', '1')
    setParams(next)
  }

  const onSubmit = async (values: ContactoInsert) => {
    if (editing && editing !== 'new') {
      await updateMut.mutateAsync({ id: editing.id, patch: values as Partial<ContactoInsert> })
    } else {
      await createMut.mutateAsync(values)
    }
    setEditing(null)
  }

  const onDelete = (c: ContactoConEmpresa) => {
    const full = `${c.nombre}${c.apellidos ? ' ' + c.apellidos : ''}`
    if (window.confirm(`¿Eliminar el contacto "${full}"?`)) {
      deleteMut.mutate(c.id)
    }
  }

  const submitting = createMut.isPending || updateMut.isPending

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contactos</h1>
          <p className="text-sm text-slate-500">{data?.count ?? 0} en total</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" /> Nuevo contacto
        </button>
      </div>

      <div className="mb-4 flex gap-3">
        <input
          type="search"
          defaultValue={search}
          onChange={(e) => {
            const v = e.target.value
            setTimeout(() => updateParam('q', v), 300)
          }}
          placeholder="Buscar por nombre, apellidos o email…"
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={empresaId}
          onChange={(e) => updateParam('empresa_id', e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todas las empresas</option>
          {empresas.data?.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Cargo</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Teléfono / Móvil</th>
              <th className="px-4 py-3">Decisor</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Cargando…</td></tr>}
            {!isLoading && data?.data.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Sin resultados</td></tr>}
            {data?.data.map((c) => {
              const phone = [c.telefono, c.movil].filter(Boolean).join(' / ') || '—'
              return (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {c.nombre}{c.apellidos ? ` ${c.apellidos}` : ''}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.empresa?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.cargo ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{phone}</td>
                  <td className="px-4 py-3">
                    {c.es_decisor && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Sí</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        aria-label="Editar"
                        className="rounded p-1 text-slate-500 hover:bg-slate-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(c)}
                        aria-label="Eliminar"
                        className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <button type="button" disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50">Anterior</button>
          <span>Página {page} de {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => updateParam('page', String(page + 1))} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50">Siguiente</button>
        </div>
      )}

      {editing && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setEditing(null)} />
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editing === 'new' ? 'Nuevo contacto' : 'Editar contacto'}
              </h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Cerrar" className="rounded p-1 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <ContactoForm
                defaultValues={editing === 'new' ? undefined : editing}
                onSubmit={onSubmit}
                onCancel={() => setEditing(null)}
                submitting={submitting}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}