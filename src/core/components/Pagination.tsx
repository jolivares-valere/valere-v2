import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

/**
 * Paginación completa reutilizable:
 * - Flechas primero / anterior / siguiente / último
 * - Números de página clicables con elipsis (1 2 3 … 12)
 * - Cuadro para saltar a una página concreta
 */
export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const [jumpValue, setJumpValue] = useState('')

  if (totalPages <= 1) return null

  const go = (p: number) => {
    const clamped = Math.min(Math.max(1, p), totalPages)
    if (clamped !== page) onPageChange(clamped)
  }

  const onJump = () => {
    const n = parseInt(jumpValue, 10)
    if (!Number.isNaN(n)) go(n)
    setJumpValue('')
  }

  // Números visibles: 1 … (page-1) page (page+1) … total
  const pages: (number | 'ellipsis')[] = []
  const delta = 2
  let last = 0
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      if (last && i - last > 1) pages.push('ellipsis')
      pages.push(i)
      last = i
    }
  }

  const btnBase =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
  const btnIdle = `${btnBase} border-slate-300 bg-white text-slate-600 hover:bg-slate-50`
  const btnActive = `${btnBase} border-slate-900 bg-slate-900 font-medium text-white`

  return (
    <nav aria-label="Paginación" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => go(1)} disabled={page <= 1} aria-label="Primera página" className={btnIdle}>
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Página anterior" className={btnIdle}>
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`e-${idx}`} className="px-1 text-slate-400" aria-hidden="true">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => go(p)}
              aria-label={`Página ${p}`}
              aria-current={p === page ? 'page' : undefined}
              className={p === page ? btnActive : btnIdle}
            >
              {p}
            </button>
          ),
        )}

        <button type="button" onClick={() => go(page + 1)} disabled={page >= totalPages} aria-label="Página siguiente" className={btnIdle}>
          <ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => go(totalPages)} disabled={page >= totalPages} aria-label="Última página" className={btnIdle}>
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span>
          Página {page} de {totalPages}
        </span>
        <label className="flex items-center gap-1">
          <span className="sr-only">Ir a la página</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onJump()
            }}
            placeholder="Nº"
            aria-label="Ir a la página"
            className="h-8 w-16 rounded-lg border border-slate-300 px-2 text-sm"
          />
        </label>
        <button type="button" onClick={onJump} className={btnIdle}>
          Ir
        </button>
      </div>
    </nav>
  )
}
