import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useEmpresas, useCreateEmpresa, fetchEmpresasForExport } from './api'
import EmpresaForm from './components/EmpresaForm'
import ExportButton from '../../core/components/ExportButton'
import { formatDate } from '../../core/utils/dates'
import type { Empresa, EmpresaInsert } from '../../core/types/entities'

export default function EmpresasPage() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? '1')
  const pageSize = 20
  const search = params.get('q') ?? ''
  const tipo = params.get('tipo') ?? ''
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading, error } = useEmpresas({
    page,
    pageSize,
    filter: { search, tipo: tipo || undefined },
    sort: { field: 'created_at', direction: 'desc' },
  })

  const createMut = useCreateEmpresa()
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / pageSize))

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.set('page', '1')
    setParams(next)
  }

  const onCreate = async (values: EmpresaInsert) => {
    await createMut.mutateAsync(values)
    setShowForm(false)
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Empresas</h1>
          <p className="text-sm text-slate-500">{data?.count ?? 0} en total</p>
        </div>
        <div className="flex gap-2">
          <ExportButton<Empresa>
            filename="empresas"
            fetchRows={() => fetchEmpresasForExport({ search, tipo: tipo || undefined })}
            columns={[
              { header: 'Nombre', value: (e) => e.nombre },
              { header: 'NIF', value: (e) => e.nif },
              { header: 'Tipo', value: (e) => e.tipo },
              { header: 'Segmento', value: (e) => e.segmento },
              { header: 'Email', value: (e) => e.email_principal },
              { header: 'Teléfono', value: (e) => e.telefono_principal },
              { header: 'Dirección', value: (e) => e.direccion },
              { header: 'CP', value: (e) => e.cp },
              { header: 'Ciudad', value: (e) => e.ciudad },
              { header: 'Provincia', value: (e) => e.provincia },
              { header: 'Alta', value: (e) => formatDate(e.created_at) },
            ]}
          />
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" /> Nueva empresa
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-3">
        <input
          type="search"
          defaultValue={search}
          onChange={(e) => {
            const v = e.target.value
            setTimeout(() => updateParam('q', v), 300)
          }}
          placeholder="Buscar por nombre o NIF…"
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={tipo}
          onChange={(e) => updateParam('tipo', e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los tipos</option>
          <option value="empresa">Empresa</option>
          <option value="autonomo">Autónomo</option>
          <option value="comunidad_propietarios">Comunidad</option>
          <option value="cooperativa">Cooperativa</option>
          <option value="asociacion">Asociación</option>
        </select>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Nueva empresa</h2>
          <EmpresaForm
            onSubmit={onCreate}
            onCancel={() => setShowForm(false)}
            submitting={createMut.isPending}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">NIF</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Segmento</th>
              <th className="px-4 py-3">Ciudad</th>
              <th className="px-4 py-3">Alta</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Cargando…</td></tr>
            )}
            {error && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-red-600">Error al cargar</td></tr>
            )}
            {!isLoading && data?.data.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Sin resultados</td></tr>
            )}
            {data?.data.map((e) => (
              <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link to={`/empresas/${e.id}`} className="font-medium text-slate-900 hover:underline">
                    {e.nombre}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{e.nif ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{e.tipo ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{e.segmento ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{e.ciudad ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(e.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => updateParam('page', String(page - 1))}
            className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50"
          >
            Anterior
          </button>
          <span>Página {page} de {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => updateParam('page', String(page + 1))}
            className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}
