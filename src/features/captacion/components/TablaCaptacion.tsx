import { useMemo, useState } from 'react'
import { ChevronUp, ChevronDown, Download } from 'lucide-react'
import { toast } from 'sonner'
import {
  useEditarCampoOportunidad,
  useEditarCampoEmpresa,
  ETAPA_LABELS,
  ESTADO_CLASSES,
  calcularSemaforoVencimiento,
  type VHistoricoRow,
} from '../api'
import { formatEur } from '../../../core/utils/format'
import { exportToExcel, type Column } from '../../../core/utils/exportToExcel'
import CeldaEditable from './CeldaEditable'
import PaginacionIncremental from './PaginacionIncremental'

/**
 * Sprint 2026-05-19 Hallazgo #3: tabla tipo Excel para vista Tabla.
 *
 * Features:
 *   - Columnas ordenables (clic en cabecera).
 *   - Edición inline en campos seguros (whitelist en RPC backend).
 *   - Paginación incremental (200 inicial → prompt cargar más).
 *   - Export Excel con todas las filas filtradas.
 *   - Click en empresa abre drawer.
 */

const ORIGEN_OPTIONS = [
  { value: 'cold', label: 'Cold call' },
  { value: 'web', label: 'Web' },
  { value: 'recomendacion', label: 'Recomendación' },
  { value: 'contacto_previo', label: 'Contacto previo' },
  { value: 'otro', label: 'Otro' },
]

type SortKey =
  | 'empresa_nombre'
  | 'etapa_operativa'
  | 'responsable_actual_nombre'
  | 'dias_vencimiento'
  | 'updated_at'

interface Props {
  data: VHistoricoRow[]
  onRowClick?: (oportunidadId: string) => void
}

export default function TablaCaptacion({ data, onRowClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('dias_vencimiento')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [limit, setLimit] = useState(200)
  const editarOportunidad = useEditarCampoOportunidad()
  const editarEmpresa = useEditarCampoEmpresa()

  const sorted = useMemo(() => {
    const arr = [...data]
    arr.sort((a, b) => {
      const av = (a as any)[sortKey]
      const bv = (b as any)[sortKey]
      // Nulls al final
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
    return arr
  }, [data, sortKey, sortDir])

  const visibles = sorted.slice(0, limit)

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }

  const handleExport = () => {
    const columns: Column<VHistoricoRow>[] = [
      { header: 'Empresa', accessor: 'empresa_nombre' },
      { header: 'NIF', accessor: 'empresa_nif' },
      { header: 'Teléfono', accessor: 'empresa_telefono' },
      { header: 'Email', accessor: 'empresa_email' },
      { header: 'Ciudad', accessor: 'empresa_ciudad' },
      {
        header: 'Estado', accessor: r => {
          const e = r.etapa_operativa ?? ''
          return ETAPA_LABELS[e] ?? e
        },
      },
      { header: 'Responsable', accessor: 'responsable_actual_nombre' },
      {
        header: 'Vencimiento', accessor: 'fecha_vencimiento_contrato_prospecto',
        format: v => v ? new Date(v as string).toLocaleDateString('es-ES') : '',
      },
      { header: 'Días al venc.', accessor: 'dias_vencimiento' },
      { header: 'Origen', accessor: 'origen' },
      {
        header: 'Valor (€)', accessor: 'valor_estimado_eur',
        format: v => v == null ? '' : Number(v),
      },
      {
        header: 'Ahorro anual (€)', accessor: 'ahorro_anual_estimado',
        format: v => v == null ? '' : Number(v),
      },
      { header: 'Siguiente acción', accessor: 'siguiente_accion' },
      {
        header: 'Última actividad', accessor: 'updated_at',
        format: v => v ? new Date(v as string).toLocaleString('es-ES') : '',
      },
      { header: 'Notas', accessor: 'notas' },
    ]
    const fname = `captacion_${new Date().toISOString().slice(0, 10)}.xlsx`
    try {
      exportToExcel(sorted, columns, fname, 'Captación')
      toast.success('Exportado', { description: `${sorted.length} filas` })
    } catch (e) {
      toast.error('No se pudo exportar', {
        description: e instanceof Error ? e.message : 'Error desconocido',
      })
    }
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg bg-slate-50 p-8 text-center">
        <p className="text-slate-500">No hay registros que mostrar.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-xs text-slate-600">
          {sorted.length} {sorted.length === 1 ? 'registro' : 'registros'}
        </p>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar Excel
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[5%]" />
            <col className="w-[18%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[13%]" />
            <col className="w-[11%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[11%]" />
          </colgroup>
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <Th>#</Th>
              <Th sortKey="empresa_nombre" sort={sortKey} dir={sortDir} onSort={handleSort}>Empresa</Th>
              <Th>Teléfono</Th>
              <Th sortKey="etapa_operativa" sort={sortKey} dir={sortDir} onSort={handleSort}>Estado</Th>
              <Th sortKey="responsable_actual_nombre" sort={sortKey} dir={sortDir} onSort={handleSort}>Responsable</Th>
              <Th sortKey="dias_vencimiento" sort={sortKey} dir={sortDir} onSort={handleSort}>Vence</Th>
              <Th>Origen</Th>
              <Th>Valor</Th>
              <Th sortKey="updated_at" sort={sortKey} dir={sortDir} onSort={handleSort}>Últ. act.</Th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((row, idx) => {
              const etapa = row.etapa_operativa ?? ''
              const etapaLabel = ETAPA_LABELS[etapa] ?? etapa
              const sem = calcularSemaforoVencimiento(row.fecha_vencimiento_contrato_prospecto ?? null)
              return (
                <tr
                  key={row.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-2 py-1.5 text-slate-400">{idx + 1}</td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => onRowClick?.(row.id)}
                      className="truncate text-left font-medium text-slate-900 hover:text-valere-blue-dark hover:underline"
                    >
                      {row.empresa_nombre ?? 'Sin empresa'}
                    </button>
                    {row.empresa_nif && (
                      <div className="truncate text-[10px] text-slate-400">{row.empresa_nif}</div>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <CeldaEditable
                      value={row.empresa_telefono}
                      onSave={v => editarEmpresa.mutateAsync({ empresa_id: row.empresa_id, campo: 'telefono_principal', valor: v })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-700 bg-slate-100">
                      {etapaLabel}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 truncate text-slate-700">{row.responsable_actual_nombre ?? '—'}</td>
                  <td className="px-2 py-1.5">
                    {sem.estado === 'sin_fecha' ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${ESTADO_CLASSES[sem.estado]}`}>
                        {sem.label}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <CeldaEditable
                      value={row.origen}
                      tipo="select"
                      options={ORIGEN_OPTIONS}
                      onSave={v => editarEmpresa.mutateAsync({ empresa_id: row.empresa_id, campo: 'origen_relacion', valor: v })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <CeldaEditable
                      value={row.valor_estimado_eur}
                      tipo="number"
                      onSave={v => editarOportunidad.mutateAsync({ oportunidad_id: row.id, campo: 'valor_estimado_eur', valor: v })}
                    />
                    {row.valor_estimado_eur != null && (
                      <div className="text-[10px] text-slate-400">{formatEur(row.valor_estimado_eur)}</div>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-slate-500">
                    {row.updated_at ? new Date(row.updated_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <PaginacionIncremental
        visibles={visibles.length}
        total={sorted.length}
        onCargarMas={n => setLimit(l => l + n)}
        onCargarTodas={() => setLimit(sorted.length)}
      />
    </div>
  )
}

interface ThProps {
  children: React.ReactNode
  sortKey?: SortKey
  sort?: SortKey
  dir?: 'asc' | 'desc'
  onSort?: (k: SortKey) => void
}

function Th({ children, sortKey, sort, dir, onSort }: ThProps) {
  const sortable = !!sortKey && !!onSort
  const isActive = sortable && sort === sortKey
  return (
    <th
      scope="col"
      className={`px-2 py-2 text-left font-medium ${sortable ? 'cursor-pointer select-none hover:bg-slate-100' : ''}`}
      onClick={sortable ? () => onSort!(sortKey!) : undefined}
    >
      <span className="inline-flex items-center gap-0.5">
        {children}
        {isActive && (dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </span>
    </th>
  )
}
