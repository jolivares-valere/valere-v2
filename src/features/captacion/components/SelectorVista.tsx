import { useEffect, useState } from 'react'
import { LayoutGrid, Table as TableIcon, ChevronDown } from 'lucide-react'

/**
 * Sprint 2026-05-19: dropdown de modo de visualización Fichas / Tabla.
 * Persiste en localStorage('captacion:viewMode').
 *
 * Decisión Juan 2026-05-19: en vez de toggle binario, dropdown extensible
 * (Fichas / Tabla hoy; futuras: Lista compacta, Kanban). Cada persona elige.
 */

export type ViewMode = 'fichas' | 'tabla'

const STORAGE_KEY = 'captacion:viewMode'

export function loadViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'fichas'
  const v = window.localStorage.getItem(STORAGE_KEY)
  return v === 'tabla' || v === 'fichas' ? v : 'fichas'
}

export function saveViewMode(mode: ViewMode): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, mode)
}

interface Props {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

export default function SelectorVista({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-selector-vista]')) setOpen(false)
    }
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [open])

  const label = value === 'fichas' ? 'Fichas' : 'Tabla'
  const Icon = value === 'fichas' ? LayoutGrid : TableIcon

  return (
    <div data-selector-vista className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Icon className="h-4 w-4" />
        Vista: {label}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-1 w-44 rounded-md border border-slate-200 bg-white shadow-lg"
        >
          <li>
            <button
              type="button"
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${value === 'fichas' ? 'font-semibold text-valere-blue-dark' : 'text-slate-700'}`}
              onClick={() => { onChange('fichas'); setOpen(false) }}
            >
              <LayoutGrid className="h-4 w-4" />
              Fichas
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${value === 'tabla' ? 'font-semibold text-valere-blue-dark' : 'text-slate-700'}`}
              onClick={() => { onChange('tabla'); setOpen(false) }}
            >
              <TableIcon className="h-4 w-4" />
              Tabla tipo Excel
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
