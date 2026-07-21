import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

/**
 * Cabecera de tabla ordenable (PR-2.1). Estilo y semántica extraídos de
 * EmpresasPage: campo activo en negrita con flecha de dirección; inactivo
 * con flecha doble atenuada. aria-label anuncia la dirección resultante.
 */
export default function SortableTh<F extends string>({
  field,
  label,
  activeField,
  dir,
  onSort,
}: {
  field: F
  label: string
  activeField: F
  dir: 'asc' | 'desc'
  onSort: (field: F) => void
}) {
  const active = activeField === field
  return (
    <th className="px-4 py-3">
      <button
        type="button"
        onClick={() => onSort(field)}
        aria-label={`Ordenar por ${label} ${active && dir === 'asc' ? 'descendente' : 'ascendente'}`}
        className={`inline-flex items-center gap-1 hover:text-slate-900 ${active ? 'text-slate-900 font-semibold' : ''}`}
      >
        {label}
        {active ? (
          dir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </th>
  )
}
