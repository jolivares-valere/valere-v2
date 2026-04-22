import Papa from 'papaparse'
import { Upload } from 'lucide-react'
import { logError } from '../../../core/utils/logger'

interface Props<T> {
  label?: string
  onParsed: (rows: T[]) => void
}

export default function CsvDropzone<T>({ label, onParsed }: Props<T>) {
  const handle = (file: File) => {
    Papa.parse<T>(file, {
      header: true,
      skipEmptyLines: true,
      delimitersToGuess: [',', ';', '\t'],
      complete: ({ data }) => onParsed(data),
      error: (e) => logError(e, 'papaparse'),
    })
  }
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-slate-500 hover:border-slate-400">
      <Upload className="h-10 w-10" />
      <span className="text-sm">{label ?? 'Selecciona o arrastra un CSV (separador ; o ,)'}</span>
      <input
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])}
      />
    </label>
  )
}
