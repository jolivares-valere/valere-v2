import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, BookOpen, Building2, Zap, Calendar, FileText, Clock,
  CheckCircle2, Circle, ChevronDown, ChevronUp, RefreshCw, ChevronRight,
  Loader2, Save, Edit2, X, Plus
} from 'lucide-react'
import { supabase } from '@/core/supabase/client'
import { useSupabaseQuery } from '@/core/hooks/useSupabaseQuery'
import { toast } from 'sonner'
import { getNormativa, getNormativaOptions } from './normativas.config'

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

// ISO date "YYYY-MM-DD" para inputs type="date"
function toInputDate(d: string | null | undefined): string {
  if (!d) return ''
  return d.slice(0, 10)
}

// ── Stepper ───────────────────────────────────────────────────────────────────

function CicloStepper({ estado }: { estado: string }) {
  const idx = estadoIndex(estado)
  return (
    <div className="flex items-center gap-0 overflow-x-auto py-2">
      {CICLO_ESTADOS_STEPS.map((step, i) => {
        const done    = i < idx
        const current = i === idx
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

// ── Transiciones de estado ────────────────────────────────────────────────────

const TRANSICIONES: Record<string, { label: string; siguiente: string; color: string }> = {
  bajada_pendiente: { label: 'Enviar solicitud bajada →',    siguiente: 'bajada_activa',    color: 'bg-blue-600 text-white hover:bg-blue-700' },
  bajada_activa:    { label: 'Marcar bajada aprobada →',     siguiente: 'bajada_aprobada',   color: 'bg-green-600 text-white hover:bg-green-700' },
  bajada_aprobada:  { label: 'Iniciar subida de potencia →', siguiente: 'subida_pendiente',  color: 'bg-purple-600 text-white hover:bg-purple-700' },
  subida_pendiente: { label: 'Enviar solicitud subida →',    siguiente: 'subida_activa',     color: 'bg-amber-600 text-white hover:bg-amber-700' },
  subida_activa:    { label: 'Marcar ciclo completado ✓',    siguiente: 'completado',        color: 'bg-emerald-600 text-white hover:bg-emerald-700' },
}

// ── Tarjeta ciclo ─────────────────────────────────────────────────────────────

interface CicloCardProps {
  ciclo: CicloRow
  expedienteId: string
  empresaNombre: string
  cupsCodigo: string
  onEstadoCambiado: () => void
}

function CicloCard({ ciclo, expedienteId, empresaNombre, cupsCodigo, onEstadoCambiado }: CicloCardProps) {
  const [open, setOpen]         = useState(true)
  const [advancing, setAdvancing] = useState(false)
  const [editando, setEditando] = useState(false)
  const [saving, setSaving]     = useState(false)

  const solicitud = ciclo.solicitudes_potencia?.[0]
  const transicion = TRANSICIONES[ciclo.estado]

  // Estado local del formulario de edición
  const [formEdit, setFormEdit] = useState({
    ref_solicitud_distribuidora: solicitud?.ref_solicitud_distribuidora ?? '',
    fecha_solicitud_enviada:     toInputDate(solicitud?.fecha_solicitud_enviada),
    fecha_autorizacion:          toInputDate(solicitud?.fecha_autorizacion),
    fecha_ejecucion_real:        toInputDate(solicitud?.fecha_ejecucion_real),
    notas_internas:              solicitud?.notas_internas ?? '',
  })

  const avanzarEstado = async () => {
    if (!transicion) return
    setAdvancing(true)
    try {
      const { error } = await supabase
        .from('ciclos')
        .update({ estado: transicion.siguiente })
        .eq('id', ciclo.id)
      if (error) throw error

      // Notificar por email (best-effort)
      try {
        await supabase.functions.invoke('notify-expediente-estado', {
          body: {
            expediente_id:   expedienteId,
            ciclo_id:        ciclo.id,
            empresa_nombre:  empresaNombre,
            cups_codigo:     cupsCodigo,
            estado_anterior: ciclo.estado,
            estado_nuevo:    transicion.siguiente,
            p1_nueva:        solicitud?.p1_nueva ?? undefined,
            p2_nueva:        solicitud?.p2_nueva ?? undefined,
          },
        })
      } catch (emailErr) {
        console.warn('notify-expediente-estado falló (no crítico):', emailErr)
      }

      toast.success(`Estado actualizado: ${transicion.siguiente.replace(/_/g, ' ')}`)
      onEstadoCambiado()
    } catch {
      toast.error('Error al cambiar el estado')
    } finally {
      setAdvancing(false)
    }
  }

  const guardarEdicion = async () => {
    if (!solicitud) return
    setSaving(true)
    try {
      const payload = {
        ref_solicitud_distribuidora: formEdit.ref_solicitud_distribuidora || null,
        fecha_solicitud_enviada:     formEdit.fecha_solicitud_enviada || null,
        fecha_autorizacion:          formEdit.fecha_autorizacion || null,
        fecha_ejecucion_real:        formEdit.fecha_ejecucion_real || null,
        notas_internas:              formEdit.notas_internas || null,
      }
      const { error } = await (supabase as any)
        .from('solicitudes_potencia')
        .update(payload)
        .eq('id', solicitud.id)
      if (error) throw error
      toast.success('Solicitud actualizada')
      setEditando(false)
      onEstadoCambiado()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100'

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Cabecera del ciclo */}
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
            <>
              {/* Vista lectura */}
              {!editando ? (
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
                    <p className="text-xs text-slate-400">Ref. distribuidora</p>
                    <p className="text-sm font-medium text-slate-900">{solicitud.ref_solicitud_distribuidora ?? <span className="text-slate-300 italic">sin rellenar</span>}</p>
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
                  {solicitud.notas_internas && (
                    <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                      <p className="text-xs text-slate-400">Notas internas</p>
                      <p className="text-sm text-slate-700">{solicitud.notas_internas}</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Formulario de edición */
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Ref. distribuidora</label>
                      <input
                        type="text"
                        value={formEdit.ref_solicitud_distribuidora}
                        onChange={e => setFormEdit(f => ({ ...f, ref_solicitud_distribuidora: e.target.value }))}
                        placeholder="REF-IBER-2026-XXXXX"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Fecha solicitud enviada</label>
                      <input
                        type="date"
                        value={formEdit.fecha_solicitud_enviada}
                        onChange={e => setFormEdit(f => ({ ...f, fecha_solicitud_enviada: e.target.value }))}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Fecha autorización</label>
                      <input
                        type="date"
                        value={formEdit.fecha_autorizacion}
                        onChange={e => setFormEdit(f => ({ ...f, fecha_autorizacion: e.target.value }))}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Fecha ejecución real</label>
                      <input
                        type="date"
                        value={formEdit.fecha_ejecucion_real}
                        onChange={e => setFormEdit(f => ({ ...f, fecha_ejecucion_real: e.target.value }))}
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Notas internas</label>
                    <textarea
                      rows={2}
                      value={formEdit.notas_internas}
                      onChange={e => setFormEdit(f => ({ ...f, notas_internas: e.target.value }))}
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                </div>
              )}

              {/* Barra inferior: editar / guardar / avanzar estado */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2">
                  {!editando ? (
                    <button
                      type="button"
                      onClick={() => {
                        setFormEdit({
                          ref_solicitud_distribuidora: solicitud.ref_solicitud_distribuidora ?? '',
                          fecha_solicitud_enviada:     toInputDate(solicitud.fecha_solicitud_enviada),
                          fecha_autorizacion:          toInputDate(solicitud.fecha_autorizacion),
                          fecha_ejecucion_real:        toInputDate(solicitud.fecha_ejecucion_real),
                          notas_internas:              solicitud.notas_internas ?? '',
                        })
                        setEditando(true)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <Edit2 className="h-3 w-3" />
                      Editar solicitud
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={guardarEdicion}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditando(false)}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                      >
                        <X className="h-3 w-3" />
                        Cancelar
                      </button>
                    </>
                  )}
                </div>

                {!editando && transicion && (
                  <button
                    onClick={avanzarEstado}
                    disabled={advancing}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${transicion.color}`}
                  >
                    {advancing
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <ChevronRight className="h-4 w-4" />
                    }
                    {transicion.label}
                  </button>
                )}
              </div>
            </>
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

// ── NuevoCicloCard ────────────────────────────────────────────────────────────

interface NuevoCicloCardProps {
  expedienteId: string
  cupsId: string
  empresaId: string
  numeroCiclo: number
  p1ActualKw: number | null
  p2ActualKw: number | null
  p3ActualKw: number | null
  onCreado: () => void
}

function NuevoCicloCard({
  expedienteId, cupsId, empresaId, numeroCiclo,
  p1ActualKw, p2ActualKw, p3ActualKw, onCreado,
}: NuevoCicloCardProps) {
  const [abierto, setAbierto] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    p1_nueva: '',
    p2_nueva: '',
    p3_nueva: '',
    notas:    '',
  })

  const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100'

  const crearCiclo = async () => {
    const p1 = parseFloat(form.p1_nueva)
    const p2 = parseFloat(form.p2_nueva)
    if (!p1 || !p2 || p1 <= 0 || p2 <= 0) {
      toast.error('P1 y P2 nuevos son obligatorios y deben ser positivos')
      return
    }
    setCreating(true)
    try {
      // 1. Crear ciclo
      const { data: ciclo, error: e1 } = await supabase
        .from('ciclos')
        .insert({
          expediente_id:         expedienteId,
          numero_ciclo:          numeroCiclo,
          estado:                'bajada_pendiente',
          ahorro_previsto_total: null,
        })
        .select('id')
        .single()
      if (e1) throw e1

      // 2. Crear solicitud de bajada para el nuevo ciclo
      const { error: e2 } = await supabase
        .from('solicitudes_potencia')
        .insert({
          expediente_id: expedienteId,
          ciclo_id:      ciclo.id,
          cups_id:       cupsId,
          empresa_id:    empresaId,
          tipo:          'bajada',
          estado:        'pendiente',
          p1_actual:     p1ActualKw,
          p2_actual:     p2ActualKw,
          p3_actual:     p3ActualKw,
          p1_nueva:      p1,
          p2_nueva:      p2,
          p3_nueva:      form.p3_nueva ? parseFloat(form.p3_nueva) : null,
        })
      if (e2) throw e2

      // 3. Incrementar ciclos_realizados en expediente
      await supabase
        .from('expedientes')
        .update({ ciclos_realizados: numeroCiclo })
        .eq('id', expedienteId)

      toast.success(`Ciclo ${numeroCiclo} creado`)
      onCreado()
      setAbierto(false)
    } catch {
      toast.error('Error al crear el ciclo')
    } finally {
      setCreating(false)
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-5 py-4 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Iniciar ciclo {numeroCiclo}
      </button>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border-2 border-blue-200 bg-blue-50/30 shadow-sm">
      <div className="flex items-center justify-between px-5 py-3 border-b border-blue-100">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            {numeroCiclo}
          </span>
          <p className="text-sm font-semibold text-slate-900">Nuevo ciclo {numeroCiclo}</p>
        </div>
        <button type="button" onClick={() => setAbierto(false)} className="text-slate-400 hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-5 py-4 space-y-3">
        <p className="text-xs text-slate-500">
          Potencias actuales del CUPS (tras ciclo anterior): P1 {fmt(p1ActualKw)} · P2 {fmt(p2ActualKw)} · P3 {fmt(p3ActualKw)}
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">P1 nueva (kW) *</label>
            <input type="number" step="0.01" value={form.p1_nueva} onChange={e => setForm(f => ({ ...f, p1_nueva: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">P2 nueva (kW) *</label>
            <input type="number" step="0.01" value={form.p2_nueva} onChange={e => setForm(f => ({ ...f, p2_nueva: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">P3 nueva (kW)</label>
            <input type="number" step="0.01" value={form.p3_nueva} onChange={e => setForm(f => ({ ...f, p3_nueva: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Notas</label>
          <textarea rows={2} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} className={`${inputCls} resize-none`} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={() => setAbierto(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button
            type="button"
            onClick={crearCiclo}
            disabled={creating}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Crear ciclo {numeroCiclo}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ExpedienteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [normativaValue, setNormativaValue] = useState<string>('')
  const [savingNormativa, setSavingNormativa] = useState(false)

  async function cambiarNormativa(newVal: string) {
    if (!exp || newVal === exp.tipo_normativa) return
    setSavingNormativa(true)
    try {
      const { error } = await (supabase as any)
        .from('expedientes')
        .update({ tipo_normativa: newVal })
        .eq('id', exp.id)
      if (error) throw error
      toast.success('Normativa actualizada')
      refetch()
    } catch {
      toast.error('Error al cambiar la normativa')
    } finally {
      setSavingNormativa(false)
    }
  }

  const { data, loading, refetch } = useSupabaseQuery<ExpedienteDetail>({
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
  const ultimoCiclo     = ciclosOrdenados[ciclosOrdenados.length - 1]
  const puedeNuevoCiclo =
    exp.estado === 'activo' &&
    ultimoCiclo?.estado === 'completado' &&
    (exp.max_ciclos_permitidos == null || ciclosOrdenados.length < exp.max_ciclos_permitidos)

  // Potencias "actuales" para el nuevo ciclo = las de la última solicitud subida del último ciclo,
  // o si no existen, las del CUPS.
  const ultimaSolicitud = ultimoCiclo?.solicitudes_potencia?.[0]
  const p1Para = ultimaSolicitud?.p1_nueva ?? exp.cups?.p1_kw ?? null
  const p2Para = ultimaSolicitud?.p2_nueva ?? exp.cups?.p2_kw ?? null
  const p3Para = ultimaSolicitud?.p3_nueva ?? exp.cups?.p3_kw ?? null

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
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">{exp.anio}</span>
            <span className="text-slate-300">·</span>
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={normativaValue || exp.tipo_normativa}
                onChange={e => {
                  setNormativaValue(e.target.value)
                  void cambiarNormativa(e.target.value)
                }}
                disabled={savingNormativa}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-60 cursor-pointer"
              >
                {getNormativaOptions().map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {savingNormativa && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-400 italic">
            {getNormativa(normativaValue || exp.tipo_normativa).referenciaLegal}
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
              <CicloCard
                key={ciclo.id}
                ciclo={ciclo}
                expedienteId={exp.id}
                empresaNombre={exp.empresas?.nombre ?? ''}
                cupsCodigo={exp.cups?.codigo_cups ?? ''}
                onEstadoCambiado={refetch}
              />
            ))}

            {/* Botón nuevo ciclo (solo si el último está completado y hay margen) */}
            {puedeNuevoCiclo && exp.cups && (
              <NuevoCicloCard
                expedienteId={exp.id}
                cupsId={exp.cups.id}
                empresaId={exp.empresas?.id ?? ''}
                numeroCiclo={ciclosOrdenados.length + 1}
                p1ActualKw={p1Para}
                p2ActualKw={p2Para}
                p3ActualKw={p3Para}
                onCreado={refetch}
              />
            )}
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
