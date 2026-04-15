import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useEmpresaById, useUpdateEmpresa, useDeleteEmpresa } from './api'
import EmpresaForm from './components/EmpresaForm'
import ActividadTimeline from '../actividades/components/ActividadTimeline'
import { formatDate } from '../../core/utils/dates'
import type { EmpresaUpdate } from '../../core/types/entities'

type Tab = 'resumen' | 'contactos' | 'contratos' | 'actividades' | 'propuestas'

export default function EmpresaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: empresa, isLoading } = useEmpresaById(id)
  const updateMut = useUpdateEmpresa()
  const deleteMut = useDeleteEmpresa()
  const [editing, setEditing] = useState(false)
  const [tab, setTab] = useState<Tab>('resumen')

  if (isLoading) return <div className="p-8 text-slate-500">Cargando…</div>
  if (!empresa) return <div className="p-8 text-slate-500">Empresa no encontrada</div>

  const onSave = async (values: EmpresaUpdate) => {
    await updateMut.mutateAsync({ id: empresa.id, patch: values })
    setEditing(false)
  }

  const onDelete = async () => {
    if (!confirm(`¿Eliminar "${empresa.nombre}"? (soft delete)`)) return
    await deleteMut.mutateAsync(empresa.id)
    window.location.href = '/empresas'
  }

  return (
    <div className="p-8">
      <Link to="/empresas" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Empresas
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{empresa.nombre}</h1>
          <p className="text-sm text-slate-500">
            {empresa.nif ?? 'Sin NIF'} · {empresa.tipo ?? 'Sin tipo'}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing(!editing)} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            <Pencil className="h-3.5 w-3.5" /> {editing ? 'Cancelar' : 'Editar'}
          </button>
          <button type="button" onClick={onDelete} className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" /> Eliminar
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          {editing ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
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
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                {tab === 'resumen' && <Resumen empresa={empresa} />}
                {tab === 'actividades' && (
                  <ActividadTimeline entidadTipo="empresa" entidadId={empresa.id} />
                )}
                {(tab === 'contactos' || tab === 'contratos' || tab === 'propuestas') && (
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
    </div>
  )
}

function TabsNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const tabs: Tab[] = ['resumen', 'contactos', 'contratos', 'actividades', 'propuestas']
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
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
