import { useState } from 'react'
import Papa from 'papaparse'
import { Upload, Check, AlertCircle } from 'lucide-react'
import { supabase } from '../../core/supabase/client'
import { validateCUPS, normalizarNIF } from '../../core/utils/energy'
import { parseCSVDate } from '../../core/utils/dates'
import { logError } from '../../core/utils/logger'

interface RawRow {
  [key: string]: string | undefined
}

interface ValidRow {
  nombre: string
  nif: string | null
  compania: string
  tarifa_acceso: string | null
  tarifa_cliente: string | null
  estado: string
  fecha_firma: string | null
  fecha_inicio: string | null
  comision_integra: number | null
  cups: string | null
  _errors: string[]
}

function mapRow(r: RawRow): ValidRow {
  const errors: string[] = []
  const nombre = (r['CLIENTE'] ?? r['Cliente'] ?? r['cliente'] ?? '').trim()
  if (!nombre) errors.push('Falta CLIENTE')
  const nifRaw = (r['CIF/NIF'] ?? r['NIF'] ?? r['CIF'] ?? '').trim()
  const nif = nifRaw ? normalizarNIF(nifRaw) : null
  const cups = (r['CUPS'] ?? '').trim() || null
  if (cups && !validateCUPS(cups)) errors.push(`CUPS inválido: ${cups}`)
  const estadoRaw = (r['ESTADO'] ?? '').trim().toUpperCase()
  const estadoMap: Record<string, string> = {
    ACTIVADO: 'activo', BAJA: 'baja', INCIDENCIA: 'incidencia', TRAMITE: 'tramite',
  }
  const estado = estadoMap[estadoRaw] ?? 'borrador'
  const comisionRaw = (r['COMISIÓN INTEGRA'] ?? r['COMISION INTEGRA'] ?? '').replace(/[€\s.]/g, '').replace(',', '.')
  const comision = comisionRaw ? Number(comisionRaw) : null
  if (comisionRaw && Number.isNaN(comision)) errors.push(`Comisión inválida: ${comisionRaw}`)
  return {
    nombre,
    nif,
    compania: (r['COMPAÑÍA'] ?? r['COMPANIA'] ?? '').trim(),
    tarifa_acceso: (r['TARIFA DE ACCESO'] ?? '').trim() || null,
    tarifa_cliente: (r['TARIFA CLIENTE'] ?? '').trim() || null,
    estado,
    fecha_firma: parseCSVDate(r['fecha'] ?? r['FECHA']),
    fecha_inicio: parseCSVDate(r['FECHA ACTIVACION'] ?? r['FECHA ACTIVACIÓN']),
    comision_integra: comision,
    cups,
    _errors: errors,
  }
}

export default function ImportadorPage() {
  const [rows, setRows] = useState<ValidRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ creadas: number; errores: string[] } | null>(null)

  const onFile = (file: File) => {
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      delimitersToGuess: [',', ';', '\t'],
      complete: ({ data }) => setRows(data.map(mapRow)),
      error: (e) => logError(e, 'papaparse'),
    })
  }

  const validos = rows.filter((r) => r._errors.length === 0)
  const invalidos = rows.filter((r) => r._errors.length > 0)

  const onImport = async () => {
    setImporting(true)
    setResult(null)
    const errores: string[] = []
    let creadas = 0
    const byNif = new Map<string, ValidRow[]>()
    for (const r of validos) {
      const key = r.nif ?? r.nombre
      const arr = byNif.get(key) ?? []
      arr.push(r)
      byNif.set(key, arr)
    }
    for (const [, group] of byNif) {
      const head = group[0]
      const { data: emp, error } = await supabase
        .from('empresas')
        .upsert({ nombre: head.nombre, nif: head.nif, pais: 'ES' }, { onConflict: 'nif' })
        .select('id')
        .single()
      if (error) { errores.push(`${head.nombre}: ${error.message}`); continue }
      creadas++
      if (head.compania) {
        const { data: cont, error: e2 } = await supabase.from('contratos').insert({
          empresa_id: (emp as { id: string }).id,
          compania: head.compania,
          tarifa_acceso: head.tarifa_acceso,
          tarifa_cliente: head.tarifa_cliente,
          fecha_firma: head.fecha_firma,
          fecha_inicio: head.fecha_inicio,
          comision_integra: head.comision_integra,
          estado: head.estado,
        }).select('id').single()
        if (e2) { errores.push(`${head.nombre} contrato: ${e2.message}`); continue }
        for (const r of group) {
          if (!r.cups) continue
          const { error: e3 } = await supabase.from('cups').insert({
            contrato_id: (cont as { id: string }).id,
            empresa_id: (emp as { id: string }).id,
            codigo_cups: r.cups,
            estado: 'activo',
          })
          if (e3) errores.push(`${r.cups}: ${e3.message}`)
        }
      }
    }
    setResult({ creadas, errores })
    setImporting(false)
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Importador CSV</h1>

      {rows.length === 0 && !result && (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white p-12 text-slate-500 hover:border-slate-400">
          <Upload className="h-10 w-10" />
          <span className="text-sm">Selecciona o arrastra un CSV (separador ; o ,)</span>
          <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      )}

      {rows.length > 0 && !result && (
        <div className="space-y-4">
          <div className="flex gap-4 text-sm">
            <span className="rounded bg-green-100 px-3 py-1 text-green-800">{validos.length} válidas</span>
            <span className="rounded bg-red-100 px-3 py-1 text-red-800">{invalidos.length} con errores</span>
          </div>
          {invalidos.length > 0 && (
            <div className="rounded-md bg-red-50 p-4 text-sm">
              <h3 className="mb-2 font-medium text-red-900">Errores detectados</h3>
              <ul className="space-y-1 text-red-800">
                {invalidos.slice(0, 10).map((r, i) => (
                  <li key={i}>{r.nombre}: {r._errors.join(', ')}</li>
                ))}
                {invalidos.length > 10 && <li>…y {invalidos.length - 10} más</li>}
              </ul>
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onImport} disabled={importing || validos.length === 0} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60">
              {importing ? 'Importando…' : `Importar ${validos.length} filas válidas`}
            </button>
            <button type="button" onClick={() => setRows([])} className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Check className="h-5 w-5 text-green-600" /> Importación completada
          </h2>
          <p className="text-sm text-slate-700">{result.creadas} empresas creadas/actualizadas.</p>
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
          <button type="button" onClick={() => { setRows([]); setResult(null) }} className="mt-4 rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
            Importar otro CSV
          </button>
        </div>
      )}
    </div>
  )
}
