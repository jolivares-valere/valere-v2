/**
 * XLSXImportadorTarifas — Importador masivo de tarifas de comercializadoras
 * desde archivo XLSX. Usa SheetJS para parseo y Supabase para upsert.
 *
 * Formato XLSX esperado (cabeceras en fila 1):
 *   comercializadora | producto | tarifa | e1..e6 | p1..p6 |
 *   modelo_excedentes | precio_excedente | notas
 *
 * Columnas e/p dinámicas según tarifa:
 *   2.0TD → e1,e2,e3 / p1,p2
 *   3.0TD → e1..e6  / p1..p3
 *   6.1TD, 6.2TD → e1..e6 / p1..p6
 */
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../../core/supabase/client'
import { getTariffConfig } from '../../../core/energia/tariffs'

// ── Tipos ─────────────────────────────────────────────────────────────────

interface RawRow {
  comercializadora?: string
  producto?: string
  tarifa?: string
  e1?: number; e2?: number; e3?: number
  e4?: number; e5?: number; e6?: number
  p1?: number; p2?: number; p3?: number
  p4?: number; p5?: number; p6?: number
  modelo_excedentes?: string
  precio_excedente?: number
  notas?: string
  [key: string]: unknown
}

interface ParsedRow {
  rowNum: number
  comercializadora: string
  producto: string
  tarifa: string
  energyPrices: number[]
  powerPrices: number[]
  surplusModel: string
  surplusPrice: number
  notas: string
}

interface ValidationError {
  rowNum: number
  field: string
  message: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

const VALID_SURPLUS_MODELS = ['compensacion_simple', 'compensacion_a_precio_mercado', 'sin_excedentes']

function normalizeNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
  return isNaN(n) ? 0 : n
}

function parseRows(ws: XLSX.WorkSheet): RawRow[] {
  return XLSX.utils.sheet_to_json<RawRow>(ws, {
    header: undefined,
    defval: '',
    raw: false,
  })
}

function validateRow(raw: RawRow, rowNum: number): ValidationError[] {
  const errors: ValidationError[] = []
  if (!raw.comercializadora?.toString().trim())
    errors.push({ rowNum, field: 'comercializadora', message: 'Campo requerido' })
  if (!raw.producto?.toString().trim())
    errors.push({ rowNum, field: 'producto', message: 'Campo requerido' })
  if (!raw.tarifa?.toString().trim())
    errors.push({ rowNum, field: 'tarifa', message: 'Campo requerido' })
  return errors
}

function buildParsedRow(raw: RawRow, rowNum: number): ParsedRow {
  const tarifa = raw.tarifa?.toString().trim() ?? '2.0TD'
  const cfg = getTariffConfig(tarifa)

  const eVals = [raw.e1, raw.e2, raw.e3, raw.e4, raw.e5, raw.e6]
  const pVals = [raw.p1, raw.p2, raw.p3, raw.p4, raw.p5, raw.p6]

  const energyPrices = Array.from({ length: cfg.energia }, (_, i) => normalizeNum(eVals[i]))
  const powerPrices = Array.from({ length: cfg.potencia }, (_, i) => normalizeNum(pVals[i]))

  const surplusModelRaw = raw.modelo_excedentes?.toString().trim() ?? ''
  const surplusModel = VALID_SURPLUS_MODELS.includes(surplusModelRaw)
    ? surplusModelRaw
    : 'compensacion_simple'

  return {
    rowNum,
    comercializadora: raw.comercializadora?.toString().trim() ?? '',
    producto: raw.producto?.toString().trim() ?? '',
    tarifa,
    energyPrices,
    powerPrices,
    surplusModel,
    surplusPrice: normalizeNum(raw.precio_excedente),
    notas: raw.notas?.toString().trim() ?? '',
  }
}

// ── Componente ─────────────────────────────────────────────────────────────

type ImportStep = 'idle' | 'preview' | 'importing' | 'done'

interface ImportResult {
  importadas: number
  nuevasComercialiazadoras: number
  errores: string[]
}

export default function XLSXImportadorTarifas() {
  const [step, setStep] = useState<ImportStep>('idle')
  const [fileName, setFileName] = useState('')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)

  const reset = () => {
    setStep('idle')
    setFileName('')
    setParsedRows([])
    setValidationErrors([])
    setProgress(0)
    setResult(null)
  }

  // ── Dropzone ──────────────────────────────────────────────────────────────
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rawRows = parseRows(ws)

        const errors: ValidationError[] = []
        const parsed: ParsedRow[] = []

        rawRows.forEach((raw, idx) => {
          const rowNum = idx + 2 // +2 porque fila 1 es cabecera
          const rowErrors = validateRow(raw, rowNum)
          if (rowErrors.length > 0) {
            errors.push(...rowErrors)
          } else {
            parsed.push(buildParsedRow(raw, rowNum))
          }
        })

        setValidationErrors(errors)
        setParsedRows(parsed)
        setStep('preview')
      } catch {
        toast.error('No se pudo leer el archivo. Asegúrate de que es un .xlsx o .xls válido.')
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  })

  // ── Importación ───────────────────────────────────────────────────────────
  const runImport = async () => {
    setStep('importing')
    setProgress(0)

    const importResult: ImportResult = { importadas: 0, nuevasComercialiazadoras: 0, errores: [] }

    // Cache de comercializadora nombre → id
    const comerCache: Record<string, string> = {}

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i]
      setProgress(Math.round(((i + 1) / parsedRows.length) * 100))

      try {
        // 1. Resolver comercializadora_id
        const nombreNorm = row.comercializadora.toLowerCase()
        if (!comerCache[nombreNorm]) {
          const { data: existing } = await supabase
            .from('comercializadoras')
            .select('id')
            .ilike('name', row.comercializadora)
            .maybeSingle()

          if (existing) {
            comerCache[nombreNorm] = existing.id
          } else {
            const { data: created, error: createErr } = await supabase
              .from('comercializadoras')
              .insert({ name: row.comercializadora, is_active: true })
              .select('id')
              .single()
            if (createErr || !created) throw new Error(`No se pudo crear comercializadora: ${row.comercializadora}`)
            comerCache[nombreNorm] = created.id
            importResult.nuevasComercialiazadoras++
          }
        }
        const comercializadoraId = comerCache[nombreNorm]

        // 2. Upsert oferta por (comercializadora_id, product_name)
        const payload = {
          comercializadora_id: comercializadoraId,
          product_name: row.producto,
          access_rate: row.tarifa,
          energy_prices: row.energyPrices,
          power_prices: row.powerPrices,
          surplus_model: row.surplusModel,
          surplus_price_per_kwh: row.surplusPrice,
          notes: row.notas || null,
          include_in_comparison: true,
          // Fees default a 0
          entry_fee_eur: 0,
          entry_fee_per_kw: 0,
          annual_management_fee_eur: 0,
          tender_fee_pct: 0,
          activation_fee_eur: 0,
          battery_fee_per_kwp_eur: 0,
          allow_zero_invoice: false,
          min_contract_months: 0,
          show_tolls_separately: false,
        }

        const { error: upsertErr } = await supabase
          .from('comercializadora_ofertas')
          .upsert(payload, {
            onConflict: 'comercializadora_id,product_name',
            ignoreDuplicates: false,
          })

        if (upsertErr) throw upsertErr
        importResult.importadas++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        importResult.errores.push(`Fila ${row.rowNum}: ${msg}`)
      }
    }

    setResult(importResult)
    setStep('done')

    if (importResult.errores.length === 0) {
      toast.success(`Importación completada: ${importResult.importadas} tarifas`)
    } else {
      toast.warning(`Importación con ${importResult.errores.length} error(es)`)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="mt-4 space-y-6">
      {/* Cabecera con instrucciones de formato */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-sm font-semibold text-valere-blue-dark mb-1">Formato XLSX esperado</p>
        <p className="text-xs text-slate-600">
          Cabeceras en fila 1:{' '}
          <code className="rounded bg-white px-1 py-0.5 font-mono text-xs">
            comercializadora | producto | tarifa | e1 | e2 | e3 | e4 | e5 | e6 | p1 | p2 | p3 | p4 | p5 | p6 | modelo_excedentes | precio_excedente | notas
          </code>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Columnas e/p activas según tarifa: 2.0TD (e1-e3, p1-p2) · 3.0TD (e1-e6, p1-p3) · 6.1TD/6.2TD (e1-e6, p1-p6).
          Modelo excedentes: <code className="font-mono">compensacion_simple</code> (default),{' '}
          <code className="font-mono">compensacion_a_precio_mercado</code>, <code className="font-mono">sin_excedentes</code>.
        </p>
      </div>

      {/* Paso 1: Dropzone */}
      {step === 'idle' && (
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
            isDragActive
              ? 'border-valere-blue-dark bg-valere-blue-dark/5'
              : 'border-slate-300 hover:border-valere-blue-dark hover:bg-slate-50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          <p className="text-sm font-medium text-slate-700">
            {isDragActive ? 'Suelta el archivo aquí' : 'Arrastra un archivo .xlsx o haz clic para seleccionar'}
          </p>
          <p className="mt-1 text-xs text-slate-400">Solo .xlsx y .xls</p>
        </div>
      )}

      {/* Paso 2: Preview + validación */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-valere-blue-dark" />
              <span className="text-sm font-medium text-slate-700">{fileName}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {parsedRows.length} filas válidas
              </span>
            </div>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
            >
              <X className="h-3.5 w-3.5" /> Cambiar archivo
            </button>
          </div>

          {/* Errores de validación */}
          {validationErrors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-semibold text-red-700">
                  {validationErrors.length} errores de validación — corrígelos antes de importar
                </span>
              </div>
              {validationErrors.slice(0, 10).map((e, i) => (
                <p key={i} className="text-xs text-red-600">
                  Fila {e.rowNum}, columna <span className="font-mono">{e.field}</span>: {e.message}
                </p>
              ))}
              {validationErrors.length > 10 && (
                <p className="text-xs text-red-500">…y {validationErrors.length - 10} más</p>
              )}
            </div>
          )}

          {/* Preview de primeras filas */}
          {parsedRows.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Comercializadora</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Producto</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Tarifa</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Energía (€/kWh)</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Potencia (€/kW/d)</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 5).map((row) => (
                    <tr key={row.rowNum} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-700">{row.comercializadora}</td>
                      <td className="px-3 py-2 text-slate-600">{row.producto}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">{row.tarifa}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-500">
                        {row.energyPrices.map(p => p.toFixed(4)).join(' / ')}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-500">
                        {row.powerPrices.map(p => p.toFixed(4)).join(' / ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 5 && (
                <p className="px-3 py-2 text-xs text-slate-400 bg-slate-50 border-t border-slate-100">
                  …y {parsedRows.length - 5} filas más
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={runImport}
            disabled={parsedRows.length === 0 || validationErrors.length > 0}
            className="inline-flex items-center gap-2 rounded-xl bg-valere-blue-dark px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-valere-blue-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Upload className="h-4 w-4" />
            Importar {parsedRows.length} oferta{parsedRows.length !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Paso 3: Progreso */}
      {step === 'importing' && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-valere-blue-dark" />
          <p className="text-sm font-medium text-slate-700">Importando… {progress}%</p>
          <div className="mx-auto max-w-xs rounded-full bg-slate-100 h-2 overflow-hidden">
            <div
              className="h-2 rounded-full bg-valere-blue-dark transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">
            Procesando {Math.ceil((progress / 100) * parsedRows.length)} de {parsedRows.length} filas
          </p>
        </div>
      )}

      {/* Paso 4: Resultado */}
      {step === 'done' && result && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2 ${result.errores.length === 0 ? 'bg-green-100' : 'bg-amber-100'}`}>
              <CheckCircle2 className={`h-5 w-5 ${result.errores.length === 0 ? 'text-green-600' : 'text-amber-600'}`} />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Importación completada</p>
              <p className="text-xs text-slate-500">
                {result.importadas} oferta{result.importadas !== 1 ? 's' : ''} importada{result.importadas !== 1 ? 's' : ''} ·{' '}
                {result.nuevasComercialiazadoras} comercializadora{result.nuevasComercialiazadoras !== 1 ? 's' : ''} nueva{result.nuevasComercialiazadoras !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {result.errores.length > 0 && (
            <div className="rounded-lg border border-red-100 bg-red-50 p-3 space-y-1">
              <p className="text-xs font-semibold text-red-700">{result.errores.length} error(es) durante la importación:</p>
              {result.errores.map((e, i) => (
                <p key={i} className="text-xs text-red-600">{e}</p>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Importar otro archivo
          </button>
        </div>
      )}
    </div>
  )
}
