/**
 * Sprint 2026-05-19: paginación incremental con prompt al llegar al límite.
 * Decisión Juan: empezar con scroll directo; al llegar a 200, preguntar.
 */

interface Props {
  visibles: number
  total: number
  pageSize?: number
  onCargarMas: (cuanto: number) => void
  onCargarTodas: () => void
}

export default function PaginacionIncremental({
  visibles, total, pageSize = 200, onCargarMas, onCargarTodas,
}: Props) {
  if (visibles >= total) return null
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-200 bg-slate-50 px-3 py-2.5">
      <span className="text-xs text-slate-600">
        Has visto {visibles} de {total}
      </span>
      <button
        type="button"
        onClick={() => onCargarMas(pageSize)}
        className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Cargar {Math.min(pageSize, total - visibles)} más
      </button>
      <button
        type="button"
        onClick={onCargarTodas}
        className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Cargar todas
      </button>
    </div>
  )
}
