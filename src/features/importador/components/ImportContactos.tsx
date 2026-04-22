import { useState } from 'react'
import { Check, AlertCircle } from 'lucide-react'
import { supabase } from '../../../core/supabase/client'
import { normalizarNIF } from '../../../core/utils/energy'
import CsvDropzone from './CsvDropzone'

interface RawRow { [k: string]: string | undefined }
interface MappedRow {
  nombre: string
  apellidos: string | null
  email: string | null
  telefono: string | null
  movil: string | null
  cargo: string | null
  es_decisor: boolean
  es_firmante: boolean
  empresa_nif: string | null
  _errors: string[]
}

function pick(r: RawRow, keys: string[]): string | null {
  for (const k of keys) {
    const v = r[k]?.trim()
    if (v) return v
  }
  return null
}

function pickBool(r: RawRow, keys: string[]): boolean {
  const v = pick(r, keys)?.toLowerCase()
  return v === 'true' || v === 'si' || v === 'sí' || v === '1' || v === 'x'
}

function mapRow(r: RawRow): MappedRow {
  const errors: string[] = []
  const nombre = pick(r, ['nombre', 'NOMBRE', 'Nombre']) ?? ''
  if (!nombre) errors.push('Falta nombre')
  const nifRaw = pick(r, ['empresa_nif', 'nif_empresa', 'NIF', 'CIF', 'CIF/NIF'])
  if (!nifRaw) errors.push('Falta NIF de empresa')
  return {
    nombre,
    apellidos: pick(r, ['apellidos', 'APELLIDOS', 'Apellidos']),
    email: pick(r, ['email', 'EMAIL', 'Email']),
    telefono: pick(r, ['telefono', 'TELEFONO', 'Telefono']),
    movil: pick(r, ['movil', 'MOVIL', 'Movil', 'móvil']),
    cargo: pick(r, ['cargo', 'CARGO', 'Cargo']),
    es_decisor: pickBool(r, ['es_decisor', 'decisor', 'DECISOR']),
    es_firmante: pickBool(r, ['es_firmante', 'firmante', 'FIRMANTE']),
    empresa_nif: nifRaw ? normalizarNIF(nifRaw) : null,
    _errors: errors,
  }
}

export default function ImportContactos() {
  const [rows, setRows] = useState<MappedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ creadas: number; errores: string[] } | null>(null)

  const validos = rows.filter((r) => r._errors.length === 0)
  const invalidos = rows.filter((r) => r._errors.length > 0)

  const onImport = async () => {
    setImporting(true)
    setResult(null)
    const errores: string[] = []
    let creadas = 0
    const nifs = Array.from(new Set(validos.map((r) => r.empresa_nif).filter(Boolean) as string[]))
    const empresaIdByNif = new Map<string, string>()
    if (nifs.length > 0) {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nif')
        .in('nif', nifs)
        .is('deleted_at', null)
      if (error) {
        setResult({ creadas: 0, errores: [`Lookup empresas: ${error.message}`] })
        setImporting(false)
        return
      }
      for (const e of (data ?? []) as { id: string; nif: string }[]) empresaIdByNif.set(e.nif, e.id)
    }
    for (const r of validos) {
      const empresaId = r.empresa_nif ? empresaIdByNif.get(r.empresa_nif) : null
      if (!empresaId) { errores.push(`${r.nombre}: empresa con NIF ${r.empresa_nif} no encontrada`); continue }
      const { _errors: _ignored, empresa_nif: _ignoredNif, ...data } = r
      const { error } = await supabase.from('contactos').insert({ ...data, empresa_id: empresaId })
      if (error) errores.push(`${r.nombre}: ${error.message}`)
      else creadas++
    }
    setResult({ creadas, errores })
    setImporting(false)
  }

  const reset = () => { setRows([]); setResult(null) }

  if (rows.length === 0 && !result) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          Columnas esperadas: <code>nombre, apellidos, email, telefono, movil, cargo, empresa_nif, es_decisor, es_firmante</code>. La empresa se vincula por NIF (debe existir previamente).
        </p>
        <CsvDropzone<RawRow> onParsed={(rs) => setRows(rs.map(mapRow))} />
      </div>
    )
  }

  if (result) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Check className="h-5 w-5 text-green-600" /> Importación completada
        </h2>
        <p className="text-sm text-slate-700">{result.creadas} contactos creados.</p>
        {result.errores.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-red-700">
              <AlertCircle className="mr-1 inline h-3.5 w-3.5" />
              {result.errores.length} errores
            </summary>
            <ul className="mt-2 space-y-1 text-xs text-red-800">
              {result.errores.slice(0, 20).map((e, i) => (<li key={i}>{e}</li>))}
            </ul>
          </details>
        )}
        <button type="button" onClick={reset} className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
          Importar otro CSV
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm">
        <span className="rounded bg-green-100 px-3 py-1 text-green-800">{validos.length} válidas</span>
        <span className="rounded bg-red-100 px-3 py-1 text-red-800">{invalidos.length} con errores</span>
      </div>
      {invalidos.length > 0 && (
        <div className="rounded-xl bg-red-50 p-4 text-sm">
          <h3 className="mb-2 font-medium text-red-900">Errores detectados</h3>
          <ul className="space-y-1 text-red-800">
            {invalidos.slice(0, 10).map((r, i) => (
              <li key={i}>{r.nombre || '(sin nombre)'}: {r._errors.join(', ')}</li>
            ))}
            {invalidos.length > 10 && <li>…y {invalidos.length - 10} más</li>}
          </ul>
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onImport} disabled={importing || validos.length === 0} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60">
          {importing ? 'Importando…' : `Importar ${validos.length} contactos`}
        </button>
        <button type="button" onClick={reset} className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
          Cancelar
        </button>
      </div>
    </div>
  )
}
