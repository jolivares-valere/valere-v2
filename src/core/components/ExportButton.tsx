import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { generateCsv, downloadFile } from '../utils/format'

interface ExportColumn<T> {
  header: string
  value: (row: T) => string | number | null | undefined
}

interface Props<T> {
  filename: string
  fetchRows: () => Promise<T[]>
  columns: ExportColumn<T>[]
}

export default function ExportButton<T>({ filename, fetchRows, columns }: Props<T>) {
  const [loading, setLoading] = useState(false)

  const onClick = async () => {
    try {
      setLoading(true)
      const rows = await fetchRows()
      if (rows.length === 0) {
        toast.info('No hay datos para exportar')
        return
      }
      const csv = generateCsv(
        columns.map((c) => c.header),
        rows.map((r) =>
          columns.map((c) => {
            const v = c.value(r)
            return v == null ? '' : String(v)
          })
        )
      )
      const stamp = new Date().toISOString().slice(0, 10)
      downloadFile('\uFEFF' + csv, `${filename}_${stamp}.csv`)
      toast.success(`${rows.length} filas exportadas`)
    } catch (e) {
      toast.error('Error al exportar', { description: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Exportar CSV
    </button>
  )
}
