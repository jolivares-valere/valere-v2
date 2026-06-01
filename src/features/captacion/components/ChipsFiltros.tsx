import { ChevronDown } from 'lucide-react'
import type { VHistoricoRow } from '../api'

/**
 * Sprint 2026-05-19: chips horizontales de filtro para vista tabla.
 * Activan filtros rápidos calculados sobre el dataset en memoria.
 */

export type ChipKey =
  | 'todos'
  | 'activos'
  | 'ganados'
  | 'perdidos'
  | 'mios'
  | 'equipo'
  | 'vence_30d'
  | 'vencidos'

interface Props {
  data: VHistoricoRow[]
  userId: string | null
  activos: Set<ChipKey>
  onToggle: (key: ChipKey) => void
  onMoreFilters?: () => void
}

function countByChip(data: VHistoricoRow[], userId: string | null): Record<ChipKey, number> {
  let activos = 0
  let ganados = 0
  let perdidos = 0
  let mios = 0
  let equipo = 0
  let vence30 = 0
  let vencidos = 0
  for (const r of data) {
    const etapa = r.etapa ?? ''
    const isGanada = etapa === 'cerrada_ganada' || etapa === 'ganada'
    const isPerdida = etapa === 'cerrada_perdida' || etapa === 'perdida'
    if (isGanada) ganados++
    else if (isPerdida) perdidos++
    else activos++
    if (userId && r.responsable_actual_id === userId) mios++
    else if (userId) equipo++
    if (r.dias_vencimiento != null) {
      if (r.dias_vencimiento < 0) vencidos++
      else if (r.dias_vencimiento <= 30) vence30++
    }
  }
  return {
    todos: data.length,
    activos,
    ganados,
    perdidos,
    mios,
    equipo,
    vence_30d: vence30,
    vencidos,
  }
}

const COLORS: Record<ChipKey, string> = {
  todos: 'bg-white border-slate-300 text-slate-900',
  activos: 'bg-green-50 border-green-200 text-green-900',
  ganados: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  perdidos: 'bg-red-50 border-red-200 text-red-900',
  mios: 'bg-white border-slate-200 text-slate-700',
  equipo: 'bg-white border-slate-200 text-slate-700',
  vence_30d: 'bg-amber-50 border-amber-200 text-amber-900',
  vencidos: 'bg-red-50 border-red-200 text-red-900',
}

const LABELS: Record<ChipKey, string> = {
  todos: 'Todos',
  activos: 'Activos',
  ganados: 'Ganados',
  perdidos: 'Perdidos',
  mios: 'Mios',
  equipo: 'Equipo',
  vence_30d: 'Vencen <30d',
  vencidos: 'Vencidos',
}

export default function ChipsFiltros({ data, userId, activos, onToggle, onMoreFilters }: Props) {
  const counts = countByChip(data, userId)
  const keys: ChipKey[] = ['todos', 'activos', 'ganados', 'perdidos', 'mios', 'equipo', 'vence_30d', 'vencidos']
  return (
    <div className="flex flex-wrap gap-1.5">
      {keys.map(k => {
        const isActive = activos.has(k)
        return (
          <button
            key={k}
            type="button"
            onClick={() => onToggle(k)}
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition ${COLORS[k]} ${isActive ? 'ring-2 ring-valere-blue-dark ring-offset-1' : ''}`}
          >
            {LABELS[k]} · {counts[k]}
          </button>
        )
      })}
      {onMoreFilters && (
        <button
          type="button"
          onClick={onMoreFilters}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          Más filtros
          <ChevronDown className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

/** Aplica los chips activos a un dataset en memoria */
export function aplicarChips(
  data: VHistoricoRow[],
  activos: Set<ChipKey>,
  userId: string | null,
): VHistoricoRow[] {
  if (activos.size === 0 || activos.has('todos')) return data
  return data.filter(r => {
    const etapa = r.etapa ?? ''
    const isGanada = etapa === 'cerrada_ganada' || etapa === 'ganada'
    const isPerdida = etapa === 'cerrada_perdida' || etapa === 'perdida'
    const isActivo = !isGanada && !isPerdida

    if (activos.has('activos') && !isActivo) return false
    if (activos.has('ganados') && !isGanada) return false
    if (activos.has('perdidos') && !isPerdida) return false
    if (activos.has('mios') && (!userId || r.responsable_actual_id !== userId)) return false
    if (activos.has('equipo') && (!userId || r.responsable_actual_id === userId)) return false
    if (activos.has('vencidos') && (r.dias_vencimiento == null || r.dias_vencimiento >= 0)) return false
    if (activos.has('vence_30d') && (r.dias_vencimiento == null || r.dias_vencimiento < 0 || r.dias_vencimiento > 30)) return false
    return true
  })
}
