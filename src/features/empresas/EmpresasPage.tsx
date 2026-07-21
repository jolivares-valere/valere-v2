import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { useEmpresas, useCreateEmpresa, useUpdateEmpresa, useComerciales, fetchEmpresasForExport } from './api'
import { useCreateContacto } from '../contactos/api'
import EmpresaForm from './components/EmpresaForm'
import ContactoForm from '../contactos/components/ContactoForm'
import ExportButton from '../../core/components/ExportButton'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Pagination from '../../core/components/Pagination'
import SortableTh from '../../core/components/SortableTh'
import { LoadingRow, ErrorRow, EmptyRow } from '../../core/components/TableStateRows'
import useListParams from '../../core/hooks/useListParams'
import { formatDate } from '../../core/utils/dates'
import { TIPO_EMPRESA_OPTIONS, tipoEmpresaLabel } from './tipos'
import type { Empresa, EmpresaInsert, ContactoInsert } from '../../core/types/entities'

type EmpresaRow = Empresa & { comercial?: { id: string; full_name: string | null } | null }

const SORTABLE_FIELDS = ['nombre', 'nif', 'tipo', 'ciudad', 'created_at'] as const
type SortField = (typeof SORTABLE_FIELDS)[number]

export default function EmpresasPage() {
  const {
    page, search, sortField, sortDir,
    getFilter, updateParam, setSearch, toggleSort,
  } = useListParams<SortField>({
    sortFields: SORTABLE_FIELDS,
    defaultSort: 'created_at',
    defaultDir: 'desc',
    // Texto empieza ascendente; fechas, descendente (lo más reciente primero).
    descFirstFields: ['created_at'],
  })
  const pageSize = 20
  const tipo = getFilter('tipo')
  const comercialFiltro = getFilter('comercial')
  const [showForm, setShowForm] = useState(false)
  const [wizardStep, setWizardStep] = useState<'empresa' | 'contacto'>('empresa')
  const [newEmpresa, setNewEmpresa] = useState<Empresa | null>(null)
  const [confirmSkipContacto, setConfirmSkipContacto] = useState(false)

  const { data, isLoading, error, refetch, isFetching } = useEmpresas({
    page,
    pageSize,
    filter: { search, tipo: tipo || undefined, comercial_id: comercialFiltro || undefined },
    sort: { field: sortField, direction: sortDir },
  })

  const createEmpresaMut = useCreateEmpresa()
  const updateEmpresaMut = useUpdateEmpresa()
  const createContactoMut = useCreateContacto()
  const { data: comerciales } = useComerciales()
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / pageSize))

  const onChangeComercial = (empresaId: string, comercialId: string) => {
    updateEmpresaMut.mutate({ id: empresaId, patch: { comercial_id: comercialId || null } })
  }

  const resetWizard = () => {
    setShowForm(false)
    setWizardStep('empresa')
    setNewEmpresa(null)
    setConfirmSkipContacto(false)
  }

  const onCreate = async (values: EmpresaInsert) => {
    const empresa = await createEmpresaMut.mutateAsync(values)
    setNewEmpresa(empresa)
    setWizardStep('contacto')
  }

  const onSkipContacto = () => {
    toast.warning('Empresa creada sin contacto decisor. Recuerda añadir uno antes de avanzar en el pipeline.')
    resetWizard()
  }

  const onContactoCreated = async (values: ContactoInsert) => {
    if (!newEmpresa) return
    try {
      await createContactoMut.mutateAsync({ ...values, empresa_id: newEmpresa.id })
      toast.success('Empresa creada con contacto decisor')
      resetWizard()
    } catch {
      // Error ya fue mostrado por useCreateContacto.onError
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-valere-blue-dark">Empresas</h1>
          <p className="text-sm text-slate-500">{data?.count ?? 0} en total</p>
        </div>
        <div className="flex gap-2">
          <ExportButton<Empresa>
            filename="empresas"
            sortByHeader="Nombre"
            fetchRows={() => fetchEmpresasForExport({ search, tipo: tipo || undefined, comercial_id: comercialFiltro || undefined })}
            columns={[
              { header: 'Nombre', value: (e) => e.nombre },
              { header: 'NIF', value: (e) => e.nif },
              { header: 'Tipo', value: (e) => tipoEmpresaLabel(e.tipo) },
              { header: 'Segmento', value: (e) => e.segmento },
              { header: 'Comercial', value: (e) => (e as EmpresaRow).comercial?.full_name ?? '' },
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
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" /> Nueva empresa
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-3">
        <input
          type="search"
          defaultValue={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o NIF…"
          aria-label="Buscar empresas por nombre o NIF"
          className="w-full max-w-sm rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={tipo}
          onChange={(e) => updateParam('tipo', e.target.value)}
          aria-label="Filtrar por tipo de empresa"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los tipos</option>
          {TIPO_EMPRESA_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={comercialFiltro}
          onChange={(e) => updateParam('comercial', e.target.value)}
          aria-label="Filtrar por comercial asignado"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los comerciales</option>
          <option value="sin_asignar">Sin asignar</option>
          {comerciales?.map((c) => (
            <option key={c.id} value={c.id}>{c.full_name ?? c.id}</option>
          ))}
        </select>
      </div>

      {showForm && wizardStep === 'empresa' && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Paso 1: Datos de la empresa</h2>
          <EmpresaForm
            onSubmit={onCreate}
            onCancel={() => resetWizard()}
            submitting={createEmpresaMut.isPending}
          />
        </div>
      )}

      {showForm && wizardStep === 'contacto' && newEmpresa && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setConfirmSkipContacto(true)} />
          <div role="dialog" aria-modal="true" aria-label="Primer contacto decisor" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-200 p-4">
                <h2 className="text-lg font-semibold text-slate-900">Paso 2: Primer contacto</h2>
                <button
                  type="button"
                  onClick={() => setConfirmSkipContacto(true)}
                  aria-label="Cerrar"
                  className="rounded p-1 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <p className="mb-4 text-sm text-slate-600">
                  Por favor, añade al menos un contacto decisor para {newEmpresa.nombre}. Es necesario para avanzar en el pipeline.
                </p>
                <ContactoForm
                  defaultValues={{ empresa_id: newEmpresa.id, es_decisor: true }}
                  onSubmit={onContactoCreated}
                  onCancel={() => setConfirmSkipContacto(true)}
                  submitting={createContactoMut.isPending}
                />
              </div>
            </div>
          </div>

          <ConfirmDialog
            isOpen={confirmSkipContacto}
            title="Crear sin contacto"
            message={`¿Seguro que quieres crear la empresa sin un contacto decisor? Podrás añadirlo después en la ficha de la empresa.`}
            confirmLabel="Crear sin contacto"
            cancelLabel="Volver"
            variant="warning"
            submitting={false}
            onConfirm={onSkipContacto}
            onCancel={() => setConfirmSkipContacto(false)}
          />
        </>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <SortableTh field="nombre" label="Nombre" activeField={sortField} dir={sortDir} onSort={toggleSort} />
              <SortableTh field="nif" label="NIF" activeField={sortField} dir={sortDir} onSort={toggleSort} />
              <SortableTh field="tipo" label="Tipo" activeField={sortField} dir={sortDir} onSort={toggleSort} />
              <SortableTh field="ciudad" label="Ciudad" activeField={sortField} dir={sortDir} onSort={toggleSort} />
              <th className="px-4 py-3">Comercial</th>
              <SortableTh field="created_at" label="Alta" activeField={sortField} dir={sortDir} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {isLoading && <LoadingRow colSpan={6} />}
            {error && (
              <ErrorRow
                colSpan={6}
                message={`Error al cargar empresas: ${(error as Error).message}`}
                onRetry={() => refetch()}
                retrying={isFetching}
              />
            )}
            {!isLoading && data?.data.length === 0 && <EmptyRow colSpan={6} />}
            {(data?.data as EmpresaRow[] | undefined)?.map((e) => (
              <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link to={`/empresas/${e.id}`} className="font-medium text-slate-900 hover:underline">
                    {e.nombre}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{e.nif ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{tipoEmpresaLabel(e.tipo)}</td>
                <td className="px-4 py-3 text-slate-600">{e.ciudad ?? '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={e.comercial_id ?? ''}
                    onChange={(ev) => onChangeComercial(e.id, ev.target.value)}
                    disabled={updateEmpresaMut.isPending}
                    aria-label={`Comercial asignado a ${e.nombre}`}
                    className="w-full max-w-45 rounded-lg border border-slate-200 bg-transparent px-2 py-1 text-sm text-slate-700 hover:border-slate-400 focus:border-slate-900 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">Sin asignar</option>
                    {comerciales?.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name ?? c.id}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(e.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={(p) => updateParam('page', String(p))} />
    </div>
  )
}
