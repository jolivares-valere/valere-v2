import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import BackButton from '../../core/components/BackButton'
import { useEmpresaById, useUpdateEmpresa, useDeleteEmpresa } from './api'
import EmpresaForm from './components/EmpresaForm'
import ActividadTimeline from '../actividades/components/ActividadTimeline'
import DocumentosTab from '../documentos/components/DocumentosTab'
import { useContactosPorEmpresa, useCreateContacto } from '../contactos/api'
import ContactoForm from '../contactos/components/ContactoForm'
import { formatDate } from '../../core/utils/dates'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import CustomFieldsPanel from '../../core/components/CustomFieldsPanel'
import type { EmpresaUpdate, ContactoInsert } from '../../core/types/entities'

type Tab = 'resumen' | 'contactos' | 'contratos' | 'actividades' | 'documentos' | 'propuestas' | 'campos'

export default function EmpresaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: empresa, isLoading } = useEmpresaById(id)
  const updateMut = useUpdateEmpresa()
  const deleteMut = useDeleteEmpresa()
  const [editing, setEditing] = useState(false)
  const [tab, setTab] = useState<Tab>('resumen')
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (isLoading) return <div className="p-8 text-slate-500">Cargando…</div>
  if (!empresa) return <div className="p-8 text-slate-500">Empresa no encontrada</div>

  const onSave = async (values: EmpresaUpdate) => {
    await updateMut.mutateAsync({ id: empresa.id, patch: values })
    setEditing(false)
  }

  const onDeleteConfirmed = async () => {
    await deleteMut.mutateAsync(empresa.id)
    setConfirmDelete(false)
    navigate('/empresas')
  }

  return (
    <div className="p-8">
      <BackButton to="/empresas" label="Volver a Empresas" />

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-valere-blue-dark">{empresa.nombre}</h1>
          <p className="text-sm text-slate-500">
            {empresa.nif ?? 'Sin NIF'} · {empresa.tipo ?? 'Sin tipo'}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing(!editing)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            <Pencil className="h-3.5 w-3.5" /> {editing ? 'Cancelar' : 'Editar'}
          </button>
          <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" /> Eliminar
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          {editing ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <EmpresaForm
                defaultValues={empresa}
                onSubmit={onSave}
                onCancel={() => setEditing(false)}
                submitting={updateMut.isPending}
              />
            </div>
          ) : (
            <>
              <TabsNav tab={tab} setTab={setTab} />
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                {tab === 'resumen' && <Resumen empresa={empresa} />}
                {tab === 'actividades' && (
                  <div className="space-y-4">
                    <ActividadTimeline entidadTipo="empresa" entidadId={empresa.id} />
                    <Link
                      to={`/actividades?entidad_tipo=empresa&entidad_id=${empresa.id}`}
                      className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                    >
                      Ver todas las actividades de esta empresa →
                    </Link>
                  </div>
                )}
                {tab === 'contactos' && <ContactosSection empresaId={empresa.id} />}
                {tab === 'documentos' && <DocumentosTab entidadTipo="empresa" entidadId={empresa.id} />}
                {tab === 'campos' && <CustomFieldsPanel entidad_tipo="empresa" entidad_id={empresa.id} />}
                {(tab === 'contratos' || tab === 'propuestas') && (
                  <p className="text-sm text-slate-500">
                    Sección "{tab}" — próximas iteraciones.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <InfoCard title="Datos rápidos">
            <InfoRow label="Email" value={empresa.email_principal ?? '—'} />
            <InfoRow label="Teléfono" value={empresa.telefono_principal ?? '—'} />
            <InfoRow label="Web" value={empresa.web ?? '—'} />
            <InfoRow label="Segmento" value={empresa.segmento ?? '—'} />
            <InfoRow label="Creada" value={formatDate(empresa.created_at, 'long')} />
          </InfoCard>
        </aside>
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Eliminar empresa"
        message={`¿Seguro que quieres eliminar "${empresa.nombre}"? (soft delete)`}
        confirmLabel="Eliminar"
        variant="danger"
        submitting={deleteMut.isPending}
        onConfirm={onDeleteConfirmed}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function TabsNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const tabs: Tab[] = ['resumen', 'contactos', 'contratos', 'actividades', 'documentos', 'propuestas', 'campos']
  return (
    <div className="mb-4 flex gap-1 border-b border-slate-200">
      {tabs.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTab(t)}
          className={`px-4 py-2 text-sm capitalize ${
            tab === t ? 'border-b-2 border-slate-900 font-medium text-slate-900' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

function Resumen({ empresa }: { empresa: NonNullable<ReturnType<typeof useEmpresaById>['data']> }) {
  return (
    <dl className="grid grid-cols-2 gap-4 text-sm">
      <InfoRow label="Dirección" value={empresa.direccion ?? '—'} />
      <InfoRow label="CP / Ciudad" value={`${empresa.cp ?? '—'} · ${empresa.ciudad ?? '—'}`} />
      <InfoRow label="Provincia" value={empresa.provincia ?? '—'} />
      <InfoRow label="País" value={empresa.pais ?? 'ES'} />
      <InfoRow label="Tags" value={empresa.tags?.join(', ') || '—'} />
      <InfoRow label="Notas" value={empresa.notas ?? '—'} />
    </dl>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      <dl className="space-y-2 text-sm">{children}</dl>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-slate-900">{value}</dd>
    </div>
  )
}

function ContactosSection({ empresaId }: { empresaId: string }) {
  const contactos = useContactosPorEmpresa(empresaId)
  const createMut = useCreateContacto()
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!adding) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAdding(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [adding])

  const onSubmit = async (values: ContactoInsert) => {
    await createMut.mutateAsync({ ...values, empresa_id: empresaId })
    setAdding(false)
  }

  const lista = contactos.data ?? []

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Contactos de la empresa</h3>
        {lista.length > 0 && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" /> Añadir contacto
          </button>
        )}
      </div>

      {contactos.isLoading && <p className="text-sm text-slate-500">Cargando…</p>}

      {!contactos.isLoading && lista.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
          <p className="mb-3 text-sm text-slate-500">Sin contactos registrados</p>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" /> Añadir el primero
          </button>
        </div>
      )}

      {lista.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {lista.map((c) => {
            const phones = [c.telefono, c.movil].filter(Boolean).join(' · ')
            return (
              <li key={c.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {c.nombre}{c.apellidos ? ` ${c.apellidos}` : ''}
                    </p>
                    {c.cargo && <p className="text-xs text-slate-500">{c.cargo}</p>}
                    {(c.email || phones) && (
                      <p className="mt-1 text-xs text-slate-600">
                        {c.email ?? ''}{c.email && phones ? ' · ' : ''}{phones}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {c.es_decisor && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">Decisor</span>
                    )}
                    {c.es_firmante && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800">Firmante</span>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {adding && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setAdding(false)} />
          <div role="dialog" aria-modal="true" aria-label="Nuevo contacto" className="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900">Nuevo contacto</h2>
              <button type="button" onClick={() => setAdding(false)} aria-label="Cerrar" className="rounded p-1 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <ContactoForm
                defaultValues={{ empresa_id: empresaId }}
                onSubmit={onSubmit}
                onCancel={() => setAdding(false)}
                submitting={createMut.isPending}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}