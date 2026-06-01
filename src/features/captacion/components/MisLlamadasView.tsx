import { useMemo, useState } from 'react'
import { Phone, Download, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useMisLlamadas, type VLlamadaRow } from '../api'
import { useAuth } from '../../../core/hooks/useAuth'
import BuscadorCaptacion from './BuscadorCaptacion'
import { exportToExcel, type Column } from '../../../core/utils/exportToExcel'

/**
 * Sprint 2026-05-19 Hallazgo #3: log cronológico de llamadas.
 *
 * Lee `v_mis_llamadas` (todas las actividades tipo `llamada`).
 * Filtros: rango fechas, resultado, texto, toggle "Solo mías" vs "Equipo".
 * Export Excel.
 */

type RangoDias = 7 | 30 | 90 | 365

const RESULTADO_OPTIONS = [
  { value: 'todos',          label: 'Todos los resultados' },
  { value: 'positivo',       label: '✅ Positivo (contestó)' },
  { value: 'sin_respuesta',  label: '❌ Sin respuesta' },
  { value: 'negativo',       label: '⚠ Negativo' },
  { value: 'neutral',        label: '➖ Neutral' },
  { value: 'pospuesto',      label: '⏰ Pospuesto' },
]

const RESULTADO_LABELS: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  positivo:       { icon: CheckCircle2, color: 'text-green-600',  label: 'Contestó' },
  sin_respuesta:  { icon: XCircle,      color: 'text-red-500',    label: 'No contesta' },
  negativo:       { icon: AlertCircle,  color: 'text-amber-600',  label: 'Negativo' },
  neutral:        { icon: Phone,        color: 'text-slate-500',  label: 'Neutral' },
  pospuesto:      { icon: Clock,        color: 'text-blue-600',   label: 'Pospuesta' },
}

interface Props {
  onRowClick?: (oportunidadId: string) => void
}

export default function MisLlamadasView({ onRowClick }: Props) {
  const { user } = useAuth()
  const [rangoDias, setRangoDias] = useState<RangoDias>(30)
  const [resultado, setResultado] = useState<string>('todos')
  const [soloMias, setSoloMias] = useState(true)
  const [texto, setTexto] = useState('')

  const { data: llamadas = [], isLoading } = useMisLlamadas({
    rangoDias,
    resultado,
    soloMias,
    userId: user?.id,
    texto,
  })

  const stats = useMemo(() => {
    let total = 0
    let contestadas = 0
    let sinRespuesta = 0
    for (const l of llamadas) {
      total++
      if (l.resultado === 'positivo') contestadas++
      else if (l.resultado === 'sin_respuesta') sinRespuesta++
    }
    return { total, contestadas, sinRespuesta }
  }, [llamadas])

  const handleExport = () => {
    const columns: Column<VLlamadaRow>[] = [
      {
        header: 'Fecha', accessor: 'fecha_actividad',
        format: v => v ? new Date(v as string).toLocaleString('es-ES') : '',
      },
      { header: 'Empresa', accessor: 'empresa_nombre' },
      { header: 'NIF', accessor: 'empresa_nif' },
      { header: 'Teléfono', accessor: 'empresa_telefono' },
      {
        header: 'Resultado', accessor: 'resultado',
        format: v => v ? (RESULTADO_LABELS[v as string]?.label ?? String(v)) : '',
      },
      { header: 'Duración (min)', accessor: 'duracion_min' },
      { header: 'Notas', accessor: 'descripcion' },
      { header: 'Por', accessor: 'llamada_creada_por_nombre' },
    ]
    const fname = `mis_llamadas_${new Date().toISOString().slice(0, 10)}.xlsx`
    try {
      exportToExcel(llamadas, columns, fname, 'Llamadas')
      toast.success('Exportado', { description: `${llamadas.length} llamadas` })
    } catch (e) {
      toast.error('No se pudo exportar', {
        description: e instanceof Error ? e.message : 'Error desconocido',
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Header con stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Total llamadas</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-xs text-green-700">Contestadas</p>
          <p className="text-2xl font-bold text-green-900">{stats.contestadas}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-700">Sin respuesta</p>
          <p className="text-2xl font-bold text-red-900">{stats.sinRespuesta}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={rangoDias}
          onChange={e => setRangoDias(Number(e.target.value) as RangoDias)}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <option value={7}>Últimos 7 días</option>
          <option value={30}>Últimos 30 días</option>
          <option value={90}>Últimos 90 días</option>
          <option value={365}>Último año</option>
        </select>
        <select
          value={resultado}
          onChange={e => setResultado(e.target.value)}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {RESULTADO_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <label className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
          <input
            type="checkbox"
            checked={soloMias}
            onChange={e => setSoloMias(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Solo mías
        </label>
        <div className="flex-1 min-w-[200px]">
          <BuscadorCaptacion value={texto} onChange={setTexto} placeholder="Empresa o NIF..." />
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={llamadas.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          Excel
        </button>
      </div>

      {/* Tabla de llamadas */}
      {isLoading ? (
        <div className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500">
          Cargando llamadas...
        </div>
      ) : llamadas.length === 0 ? (
        <div className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500">
          No hay llamadas en este rango.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Cuando</th>
                <th className="px-3 py-2 text-left font-medium">Empresa</th>
                <th className="px-3 py-2 text-left font-medium">Teléfono</th>
                <th className="px-3 py-2 text-left font-medium">Resultado</th>
                <th className="px-3 py-2 text-left font-medium">Notas</th>
              </tr>
            </thead>
            <tbody>
              {llamadas.map(l => {
                const meta = l.resultado ? RESULTADO_LABELS[l.resultado] : null
                const Icon = meta?.icon ?? Phone
                return (
                  <tr
                    key={l.id}
                    onClick={() => onRowClick?.(l.oportunidad_id)}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(l.fecha_actividad).toLocaleString('es-ES', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {l.empresa_nombre ?? '—'}
                      {l.empresa_nif && (
                        <div className="text-[10px] text-slate-400">{l.empresa_nif}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{l.empresa_telefono ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${meta?.color ?? 'text-slate-500'}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {meta?.label ?? l.resultado ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 truncate max-w-[300px]">
                      {l.descripcion ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
