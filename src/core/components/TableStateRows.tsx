/**
 * Filas de estado para tablas de lista (PR-2.1): cargando, error con
 * reintento y vacío honesto. Extraídas de EmpresasPage para que todas las
 * listas cuenten la verdad igual (sin spinners eternos ni vacíos mudos).
 */

export function LoadingRow({ colSpan, label = 'Cargando…' }: { colSpan: number; label?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-6 text-center text-slate-500">{label}</td>
    </tr>
  )
}

export function ErrorRow({
  colSpan,
  message,
  onRetry,
  retrying,
}: {
  colSpan: number
  message: string
  onRetry: () => void
  retrying: boolean
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-6 text-center">
        <div className="inline-flex flex-col items-center gap-2 text-red-600">
          <span>{message}</span>
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="rounded-xl border border-red-300 bg-white px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {retrying ? 'Reintentando…' : 'Reintentar'}
          </button>
        </div>
      </td>
    </tr>
  )
}

export function EmptyRow({ colSpan, label = 'Sin resultados' }: { colSpan: number; label?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-6 text-center text-slate-500">{label}</td>
    </tr>
  )
}
