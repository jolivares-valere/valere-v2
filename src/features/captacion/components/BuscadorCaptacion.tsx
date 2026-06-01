import { Search, X } from 'lucide-react'

/**
 * Sprint 2026-05-19 Hallazgo #2: buscador inline arriba de la bandeja.
 * Filtra el tab activo por empresa/NIF/teléfono/email.
 */

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export default function BuscadorCaptacion({ value, onChange, placeholder }: Props) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? 'Buscar empresa, NIF, teléfono...'}
        className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-9 pr-9 text-sm placeholder:text-slate-400 focus:border-valere-blue-dark focus:outline-none focus:ring-1 focus:ring-valere-blue-dark"
        aria-label="Buscar en captación"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Limpiar búsqueda"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
