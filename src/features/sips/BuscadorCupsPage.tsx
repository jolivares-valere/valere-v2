// ─────────────────────────────────────────────────────────────────────────────
// Buscador de CUPS (SIPS / Datadis) — feature F1
//
// Pega un CUPS → muestra titular, tarifa, potencias contratadas, maxímetros,
// consumo por periodo, consumo total y curva mensual (12 meses). Sin crear nada.
// Equivalente al "Buscador de CUPS" de Zocoenergía, integrado en el CRM.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Search, Zap, Building2, Calendar, Gauge, AlertTriangle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useResolverSips, isValidCups, type SipsResolveResult, type SipsPorPeriodo } from './api'
import StatCard from '../../core/components/StatCard'
import EmptyState from '../../core/components/EmptyState'

const PERIODOS: (keyof SipsPorPeriodo)[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']

function fmt(n: number | null, unidad = ''): string {
  if (n === null || n === undefined) return '—'
  return `${n.toLocaleString('es-ES', { maximumFractionDigits: 2 })}${unidad ? ' ' + unidad : ''}`
}

function PeriodoTable({ titulo, valores, unidad }: {
  titulo: string; valores: SipsPorPeriodo; unidad: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{titulo}</h3>
      <div className="grid grid-cols-6 gap-2">
        {PERIODOS.map((p) => (
          <div key={p} className="text-center">
            <div className="text-[11px] uppercase text-slate-400">{p.toUpperCase()}</div>
            <div className="text-sm font-medium text-slate-800">{fmt(valores[p])}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-right text-[11px] text-slate-400">{unidad}</div>
    </div>
  )
}

export default function BuscadorCupsPage() {
  const [cupsInput, setCupsInput] = useState('')
  const [nifInput, setNifInput] = useState('')
  const [resultado, setResultado] = useState<SipsResolveResult | null>(null)
  const resolver = useResolverSips()

  const cupsOk = isValidCups(cupsInput)

  function buscar() {
    if (!cupsOk) return
    resolver.mutate(
      { cups: cupsInput, authorizedNif: nifInput.trim() || undefined },
      { onSuccess: (data) => setResultado(data) },
    )
  }

  const chartData = (resultado?.consumo_mensual ?? []).map((m) => ({
    mes: m.mes.replace('/', '-'),
    kWh: m.consumo_kwh,
  }))

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Search className="h-6 w-6 text-slate-500" />
        <h1 className="text-2xl font-bold text-slate-800">Buscador de CUPS</h1>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">SIPS / Datadis</span>
      </div>

      {/* Formulario */}
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex-1 min-w-[260px]">
          <label className="mb-1 block text-xs font-medium text-slate-500">CUPS</label>
          <input
            value={cupsInput}
            onChange={(e) => setCupsInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
            placeholder="ES0000000000000000XX"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
          />
          {cupsInput && !cupsOk && (
            <p className="mt-1 text-xs text-amber-600">Formato CUPS no válido (ES + 18-20 caracteres).</p>
          )}
        </div>
        <div className="w-44">
          <label className="mb-1 block text-xs font-medium text-slate-500">NIF titular (opcional)</label>
          <input
            value={nifInput}
            onChange={(e) => setNifInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
            placeholder="B12345678"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
          />
        </div>
        <button
          onClick={buscar}
          disabled={!cupsOk || resolver.isPending}
          className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {resolver.isPending ? 'Buscando…' : 'Buscar'}
        </button>
      </div>

      {/* Estado vacío */}
      {!resultado && !resolver.isPending && (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title="Introduce un CUPS"
          description="Consulta titular, tarifa, potencias y consumo de cualquier punto de suministro desde Datadis."
        />
      )}

      {/* CUPS no encontrado */}
      {resultado && !resultado.encontrado && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">CUPS no encontrado en Datadis</span>
          </div>
          {resultado.avisos.map((a, i) => (
            <p key={i} className="mt-2 text-sm text-amber-700">{a}</p>
          ))}
        </div>
      )}

      {/* Resultado */}
      {resultado && resultado.encontrado && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard icon={<Zap className="h-5 w-5" />} label="Consumo total"
              value={fmt(resultado.consumo_total_kwh, 'kWh')} />
            <StatCard icon={<Gauge className="h-5 w-5" />} label="Tarifa de acceso"
              value={resultado.tarifa_acceso ?? '—'} />
            <StatCard icon={<Building2 className="h-5 w-5" />} label="Comercializadora"
              value={resultado.comercializadora_actual ?? '—'} />
            <StatCard icon={<Calendar className="h-5 w-5" />} label="Últ. cambio comerc."
              value={resultado.fecha_ultimo_cambio_comerc ?? '—'} />
          </div>

          {/* Ficha */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <div className="grid grid-cols-2 gap-y-1 md:grid-cols-3">
              <div><span className="text-slate-400">Titular (NIF): </span>{resultado.titular_nif ?? '—'}</div>
              <div><span className="text-slate-400">Distribuidor: </span>{resultado.distribuidor ?? '—'}</div>
              <div><span className="text-slate-400">Provincia: </span>{resultado.provincia ?? '—'}</div>
              <div className="col-span-2 md:col-span-3">
                <span className="text-slate-400">Dirección: </span>{resultado.direccion ?? '—'}
                {resultado.codigo_postal ? ` (${resultado.codigo_postal})` : ''}
              </div>
            </div>
          </div>

          {/* Potencias / consumos por periodo */}
          <div className="grid gap-3 md:grid-cols-3">
            <PeriodoTable titulo="Potencia contratada" valores={resultado.potencias_contratadas} unidad="kW" />
            <PeriodoTable titulo="Maxímetro (máx. demandado)" valores={resultado.maximetros} unidad="kW" />
            <PeriodoTable titulo="Consumo por periodo" valores={resultado.consumo_por_periodo_kwh} unidad="kWh" />
          </div>

          {/* Gráfica mensual */}
          {chartData.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Consumo mensual (kWh)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `${Number(v ?? 0).toLocaleString('es-ES')} kWh`} />
                  <Bar dataKey="kWh" fill="#475569" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Avisos parciales */}
          {resultado.parcial && resultado.avisos.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              <div className="mb-1 flex items-center gap-1 font-medium">
                <AlertTriangle className="h-4 w-4" /> Datos parciales
              </div>
              <ul className="list-inside list-disc">
                {resultado.avisos.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
