import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Building2, Zap, Calendar, FileText, Clock,
  CheckCircle2, Circle, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react'
import { useSupabaseQuery } from '@/core/hooks/useSupabaseQuery'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface SolicitudRow {
  id: string
  tipo: string
  estado: string
  p1_actual: number | null
  p1_nueva: number | null
  p2_actual: number | null
  p2_nueva: number | null
  p3_actual: number | null
  p3_nueva: number | null
  fecha_solicitud_enviada: string | null
  fecha_autorizacion: string | null
  fecha_ejecucion_real: string | null
  ref_solicitud_distribuidora: string | null
  notas_internas: string | null
}

interface CicloRow {
  id: string
  numero_ciclo: number
  estado: string
  ahorro_previsto_total: number | null
  ahorro_real_total: number | null
  created_at: string
  solicitudes_potencia: SolicitudRow[]
}

interface ExpedienteDetail {
  id: string
  anio: number
  estado: string
  tipo_normativa: string
  ciclos_realizados: number
  max_ciclos_permitidos: number | null
  notas: string | null
  created_at: string
  empresas: { id: string; nombre: string; nif: string | null } | null
  cups: { id: string; codigo_cups: string; ciudad_suministro: string | null; tarifa_acceso: string | null; p1_kw: number | null; p2_kw: number | null; p3_kw: number | null } | null
  ciclos: CicloRow[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CICLO_ESTADOS_STEPS = [
  { key: 'bajada_pendiente', label: 'Bajada pendiente',  short: 'Solicitud bajada' },
  { key: 'bajada_activa',    label: 'Bajada activa',     short: 'Tramitando bajada' },
  { key: 'bajada_aprobada',  label: 'Bajada aprobada',   short: 'Bajada OK' },
  { key: 'subida_pendiente', label: 'Subida pendiente',  short: 'Solicitud subida' },
  { key: 'subida_activa',    label: 'Subida activa',     short: 'Tramitando subida' },
  { key: 'completado',       label: 'Completado',        short: 'Completado' },
]

function estadoIndex(estado: string): number {
  return CICLO_ESTADOS_STEPS.findIndex(s => s.key === estado)
}

function fmt(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' kW'
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtEur(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

// ── Stepper ───────────────────────────────────────────────────────────────────

function CicloStepper({ estado }: { estado: string }) {
  const idx = estadoIndex(estado)
  return (
    <div className="flex items-center gap-0 overflow-x-auto py-2">
      {CICLO_ESTADOS_STEPS.map((step, i) => {
        const done    = i < idx
        const current = i === idx
        const pending = i > idx
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center min-w-[72px]">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ring-2 transition-all ${
                done    ? 'bg-blue-600 text-white ring-blue-600'
                : current ? 'bg-amber-500 text-white ring-amber-500 ring-offset-2'
                : 'bg-white text-slate-400 ring-slate-200'
              }`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : current ? i + 1 : <Circle className="h-4 w-4" />}
              </div>
              <span className={`mt-1 text-center text-[9px] font-semibold leading-tight max-w-[68px] ${
                current ? 'text-amber-600' : done ? 'text-blue-600' : 'text-slate-400'
              }`}>
                {step.short}
              </span>
            </div>
            {i < CICLO_ESTADOS_STEPS.length - 1 && (
              <div className={`h-0.5 w-8 flex-shrink-0 -mt-4 ${i < idx ? 'bg-blue-400' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Tarjeta ciclo ─────────────────────────────────────────────────────────────

function CicloCard({ ciclo }: { ciclo: CicloRow }) {
  const [open, setOpen] = useState(true)
  const solicitud = ciclo.solicitudes_potencia?.[0]

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
            {ciclo.numero_ciclo}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Ciclo {ciclo.numero_ciclo}</p>
            <p className="text-xs text-slate-500">{fmtDate(ciclo.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CicloStepper estado={ciclo.estado} />
          {open ? <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-4">
          {solicitud ? (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              <div>
                <p className="text-xs text-slate-400">Tipo</p>
                <p className="text-sm font-medium capitalize text-slate-900">{solicitud.tipo ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Estado solicitud</p>
                <p className="text-sm font-medium text-slate-900">{solicitud.estado ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">P1 actual → nueva</p>
                <p className="text-sm font-medium text-slate-900">{fmt(solicitud.p1_actual)} → <span className="text-blue-700 font-bold">{fmt(solicitud.p1_nueva)}</span></p>
              </div>
              <div>
                <p className="text-xs text-slate-400">P2 actual → nueva</p>
                <p className="text-sm font-medium text-slate-900">{fmt(solicitud.p2_actual)} → <span className="text-blue-700 font-bold">{fmt(solicitud.p2_nueva)}</span></p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Fecha solicitud</p>
                <p className="text-sm font-medium text-slate-900">{fmtDate(solicitud.fecha_solicitud_enviada)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Fecha autorización</p>
                <p className="text-sm font-medium text-slate-900">{fmtDate(solicitud.fecha_autorizacion)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Fecha ejecución</p>
                <p className="text-sm font-medium text-slate-900">{fmtDate(solicitud.fecha_ejecucion_real)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Ref. distribuidora</p>
                <p className="text-sm font-medium text-slate-900">{solicitud.ref_solicitud_distribuidora ?? '—'}</p>
              </div>
              {solicitud.notas_internas && (
                <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                  <p className="text-xs text-slate-400">Notas internas</p>
                  <p className="text-sm text-slate-700">{solicitud.notas_internas}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sin solicitud registrada para este ciclo.</p>
          )}

          {(ciclo.ahorro_previsto_total != null || ciclo.ahorro_real_total != null) && (
            <div className="mt-4 flex gap-6 border-t border-slate-100 pt-4">
              <div>
                <p className="text-xs text-slate-400">Ahorro previsto</p>
                <p className="text-sm font-bold text-slate-900">{fmtEur(ciclo.ahorro_previsto_total)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Ahorro real</p>
                <p className="text-sm font-bold text-green-700">{fmtEur(ciclo.ahorro_real_total)}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ExpedienteDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data, loading } = useSupabaseQuery<ExpedienteDetail>({
    table: 'expedientes',
    select: `
      id, anio, estado, tipo_normativa, ciclos_realizados,
      max_ciclos_permitidos, notas, created_at,
      empresas ( id, nombre, nif ),
      cups ( id, codigo_cups, ciudad_suministro, tarifa_acceso, p1_kw, p2_kw, p3_kw ),
      ciclos (
        id, numero_ciclo, estado, ahorro_previsto_total, ahorro_real_total, created_at,
        solicitudes_potencia (
          id, tipo, estado, p1_actual, p1_nueva, p2_actual, p2_nueva, p3_actual, p3_nueva,
          fecha_solicitud_enviada, fecha_autorizacion, fecha_ejecucion_real,
          ref_solicitud_distribuidora, notas_internas
        )
      )
    `,
    filters: id ? [{ column: 'id', op: 'eq', value: id }] : [],
    enabled: !!id,
  })

  const exp = data[0]

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!exp) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 p-8">
        <p className="text-slate-500">Expediente no encontrado.</p>
        <Link to="/potencias/expedientes" className="text-sm text-blue-600 hover:underline">
          ← Volver a Expedientes
        </Link>
      </div>
    )
  }

  const ciclosOrdenados = [...(exp.ciclos ?? [])].sort((a, b) => a.numero_ciclo - b.numero_ciclo)

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6">
      {/* Back */}
      <Link
        to="/potencias/expedientes"
        className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Expedientes
      </Link>

      {/* Cabecera */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {exp.empresas?.nombre ?? 'Expediente'}
          </h1>
          <p className="text-sm text-slate-500">
            {exp.tipo_normativa} · {exp.anio}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
            exp.estado === 'activo'    ? 'bg-blue-100 text-blue-800'
            : exp.estado === 'cancelado' ? 'bg-red-100 text-red-800'
            : 'bg-green-100 text-green-800'
          }`}>
            {exp.estado}
          </span>
        </div>
      </div>

      {/* Info cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Empresa</p>
            <p className="text-sm font-semibold text-slate-900">{exp.empresas?.nombre ?? '—'}</p>
            <p className="text-xs text-slate-400">{exp.empresas?.nif ?? ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
            <Zap className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-slate-400">CUPS</p>
            <p className="font-mono text-xs font-semibold text-slate-900">{exp.cups?.codigo_cups ?? '—'}</p>
            <p className="text-xs text-slate-400">{exp.cups?.ciudad_suministro ?? ''} · {exp.cups?.tarifa_acceso ?? ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
            <Clock className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Ciclos</p>
            <p className="text-sm font-semibold text-slate-900">
              {exp.ciclos_realizados} realizados
              {exp.max_ciclos_permitidos != null && ` / ${exp.max_ciclos_permitidos} máx.`}
            </p>
            <p className="text-xs text-slate-400">Creado {new Date(exp.created_at).toLocaleDateString('es-ES')}</p>
          </div>
        </div>
      </div>

      {/* Potencias actuales del CUPS */}
      {exp.cups && (exp.cups.p1_kw != null || exp.cups.p2_kw != null) && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
            <FileText className="inline h-3 w-3 mr-1" />
            Potencias contratadas actuales (CUPS)
          </p>
          <div className="flex flex-wrap gap-4">
            {(['p1_kw', 'p2_kw', 'p3_kw'] as const).map((p, i) =>
              exp.cups?.[p] != null ? (
                <div key={p}>
                  <p className="text-xs text-slate-400">P{i + 1}</p>
                  <p className="text-sm font-bold text-slate-900">{fmt(exp.cups[p])}</p>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Ciclos */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">
            <Calendar className="inline h-4 w-4 mr-1 text-slate-400" />
            Ciclos del expediente
          </h2>
        </div>

        {ciclosOrdenados.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-400">
            Sin ciclos registrados
          </div>
        ) : (
          <div className="space-y-3">
            {ciclosOrdenados.map(ciclo => (
              <CicloCard key={ciclo.id} ciclo={ciclo} />
            ))}
          </div>
        )}
      </div>

      {/* Notas */}
      {exp.notas && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Notas</p>
          <p className="mt-1 text-sm text-slate-700">{exp.notas}</p>
        </div>
      )}
    </div>
  )
}
