import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { useContratos, useCreateContrato } from './api'
import EstadoBadge from './components/EstadoBadge'
import PrioridadBadge from './components/PrioridadBadge'
import ContratoForm from './components/ContratoForm'
import { calcDiasVencimiento, calcPrioridad } from '../../core/utils/energy'
import { formatDate } from '../../core/utils/dates'
import type { EstadoContrato, ContratoInsert } from '../../core/types/entities'

const ESTADOS: EstadoContrato[] = ['activo', 'tramite', 'vencido', 'incidencia', 'baja', 'cancelado', 'borrador']

export default function ContratosPage() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? '1')
  const estado = params.get('estado') ?? ''
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useContratos({
    page,
    pageSize: 20,
    filter: { estado: estado || undefined },
    sort: { field: 'fecha_fin', direction: 'asc' },
  })

  const createMut = useCreateContrato()
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / 20))

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.set('page', '1')
    setParams(next)
  }

  const onCreate = async (values: ContratoInsert) => {
    await createMut.mutateAsync(values)
    setShowForm(false)
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contratos</h1>
          <p className="text-sm text-slate-500">{data?.count ?? 0} en total</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" /> Nuevo contrato
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => updateParam('estado', '')}
          className={`rounded px-3 py-1 text-xs ${!estado ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          Todos
        </button>
        {ESTADOS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => updateParam('estado', s)}
            className={`rounded px-3 py-1 text-xs capitalize ${estado === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Nº contrato</th>
              <th className="px-4 py-3">Compañía</th>
              <th className="px-4 py-3">Tarifa</th>
              <th className="px-4 py-3">Vence</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Prioridad</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Cargando…</td></tr>}
            {!isLoading && data?.data.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Sin resultados</td></tr>}
            {data?.data.map((c) => {
              const dias = calcDiasVencimiento(c.fecha_fin)
              const prioridad = calcPrioridad(dias)
              const rowBg = prioridad === 'critica' ? 'bg-red-50' : prioridad === 'alta' ? 'bg-orange-50' : ''
              return (
                <tr key={c.id} className={`border-t border-slate-100 hover:bg-slate-50 ${rowBg}`}>
                  <td className="px-4 py-3">
                    <Link to={`/contratos/${c.id}`} className="font-medium text-slate-900 hover:underline">
                      {c.empresa?.nombre ?? '—'}
                    </Link>
                    <p className="text-xs text-slate-500">{c.empresa?.nif ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.numero_contrato ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.compania}</td>
                  <td className="px-4 py-3 text-slate-600">{c.tarifa_acceso ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(c.fecha_fin)}
                    {c.fecha_fin && <span className="ml-2 text-xs text-slate-400">({dias}d)</span>}
                  </td>
                  <td className="px-4 py-3"><EstadoBadge estado={c.estado} /></td>
                  <td className="px-4 py-3"><PrioridadBadge prioridad={prioridad} /></td>
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

      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowForm(false)} />
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900">Nuevo contrato</h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar" className="rounded p-1 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <ContratoForm
                onSubmit={onCreate}
                onCancel={() => setShowForm(false)}
                submitting={createMut.isPending}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
