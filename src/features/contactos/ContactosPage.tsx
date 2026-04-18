import { useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useContactos, useCreateContacto, useUpdateContacto, useDeleteContacto, fetchContactosForExport, type ContactoConEmpresa } from './api'
import ContactoForm from './components/ContactoForm'
import ExportButton from '../../core/components/ExportButton'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { SkeletonRow, SkeletonCard } from '../../components/ui/Skeleton'
import type { Contacto, ContactoInsert } from '../../core/types/entities'

type EditingState = Contacto | 'new' | null

export default function ContactosPage() {
  const { data, isLoading } = useContactos()
  const createMut = useCreateContacto()
  const updateMut = useUpdateContacto()
  const deleteMut = useDeleteContacto()
  const [editing, setEditing] = useState<EditingState>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const onSubmit = async (values: ContactoInsert) => {
    if (editing && editing !== 'new') {
      await updateMut.mutateAsync({ id: editing.id, patch: values })
    } else {
      await createMut.mutateAsync(values)
    }
    setEditing(null)
  }

  const onDeleteConfirmed = async () => {
    if (!confirmDeleteId) return
    await deleteMut.mutateAsync(confirmDeleteId)
    setConfirmDeleteId(null)
  }

  const submitting = createMut.isPending || updateMut.isPending
  const lista = data?.data ?? []
  const aBorrar = lista.find((c) => c.id === confirmDeleteId)

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contactos</h1>
          <p className="text-sm text-slate-500">{lista.length} contactos</p>
        </div>
        <div className="flex gap-2">
          <ExportButton<ContactoConEmpresa>
            filename="contactos"
            fetchRows={() => fetchContactosForExport()}
            columns={[
              { header: 'Nombre', value: (c) => c.nombre },
              { header: 'Apellidos', value: (c) => c.apellidos },
              { header: 'Cargo', value: (c) => c.cargo },
              { header: 'Empresa', value: (c) => c.empresa?.nombre },
              { header: 'Email', value: (c) => c.email },
              { header: 'Teléfono', value: (c) => c.telefono },
              { header: 'Móvil', value: (c) => c.movil },
              { header: 'Decisor', value: (c) => c.es_decisor ? 'Sí' : 'No' },
              { header: 'Firmante', value: (c) => c.es_firmante ? 'Sí' : 'No' },
            ]}
          />
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" /> Nuevo contacto
          </button>
        </div>
      </div>

      {isLoading ? (
        <>
          <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </>
      ) : lista.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 p-8 text-center">
          <p className="mb-3 text-sm text-slate-500">Sin contactos registrados</p>
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" /> Añadir el primero
          </button>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((c) => {
                  const phones = [c.telefono, c.movil].filter(Boolean).join(' · ')
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {c.nombre}{c.apellidos ? ` ${c.apellidos}` : ''}
                        </div>
                        {c.cargo && <div className="text-xs text-slate-500">{c.cargo}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {c.empresa_id ? (
                          <Link to={`/empresas/${c.empresa_id}`} className="text-slate-600 hover:text-slate-900 hover:underline">
                            {c.empresa?.nombre ?? '—'}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{c.email ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{phones || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => setEditing(c)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => setConfirmDeleteId(c.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label="Eliminar">
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

          <ul className="md:hidden space-y-3">
            {lista.map((c) => {
              const phones = [c.telefono, c.movil].filter(Boolean).join(' · ')
              return (
                <li key={c.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">
                        {c.nombre}{c.apellidos ? ` ${c.apellidos}` : ''}
                      </p>
                      {c.cargo && <p className="text-xs text-slate-500">{c.cargo}</p>}
                      {c.empresa?.nombre && (
                        <Link to={`/empresas/${c.empresa_id}`} className="mt-1 block text-xs text-slate-600 hover:underline">
                          {c.empresa.nombre}
                        </Link>
                      )}
                      {(c.email || phones) && (
                        <p className="mt-1 text-xs text-slate-600">
                          {c.email ?? ''}{c.email && phones ? ' · ' : ''}{phones}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => setEditing(c)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setConfirmDeleteId(c.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
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

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Eliminar contacto"
        message={aBorrar ? `¿Seguro que quieres eliminar "${aBorrar.nombre}${aBorrar.apellidos ? ' ' + aBorrar.apellidos : ''}"? (soft delete)` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        submitting={deleteMut.isPending}
        onConfirm={onDeleteConfirmed}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
