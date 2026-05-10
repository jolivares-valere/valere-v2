import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle, Clock, FileText, Phone, Send, TrendingUp,
  CheckCircle2, ArrowRightCircle, GitBranch,
} from 'lucide-react'
import { supabase } from '../../core/supabase/client'
import { useAuth } from '../../core/hooks/useAuth'

// Tipos mínimos locales — no introducimos arquitectura nueva.
type Opp = {
  id: string
  titulo: string | null
  etapa: string | null
  etapa_operativa?: string | null
  contexto?: string | null
  tipo: string | null
  valor_estimado_eur?: number | null
  valor_estimado?: number | null
  fecha_siguiente_accion?: string | null
  siguiente_accion?: string | null
  fecha_vencimiento_contrato_prospecto?: string | null
  responsable_actual_id: string | null
  comercial_id: string | null
  updated_at: string
  created_at: string
  deleted_at: string | null
  empresa?: { id: string; nombre: string } | null
}

type Contrato = {
  id: string
  empresa_id: string
  numero_contrato: string | null
  fecha_fin: string | null
  estado: string
  deleted_at: string | null
}

type Profile = { id: string; full_name: string | null; funciones: string[] | null }

const ETAPA_LABEL: Record<string, string> = {
  prospecto: 'Prospecto',
  auditoria_consumo: 'Auditoría',
  oferta_presentada: 'Oferta',
  negociacion: 'Negociación',
  contrato_firmado: 'Firmado',
  cerrada_ganada: 'Ganada',
  cerrada_perdida: 'Perdida',
  contactado: 'Contactado',
  analisis: 'Análisis',
  cierre: 'Cierre',
}

function fmtEur(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function diasEntre(iso: string | null | undefined): number | null {
  if (!iso) return null
  const target = new Date(iso).getTime()
  const today = Date.now()
  return Math.round((target - today) / (24 * 60 * 60 * 1000))
}

function fmtRelative(iso: string | null | undefined): string {
  const d = diasEntre(iso)
  if (d == null) return '—'
  if (d === 0) return 'hoy'
  if (d > 0) return `en ${d}d`
  return `hace ${Math.abs(d)}d`
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
}

// ─── KPI strip ──────────────────────────────────────────────────────────────
function KPI({
  label, value, subtitle, icon: Icon, tone, to,
}: {
  label: string
  value: number | string
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  tone: 'red' | 'orange' | 'amber' | 'blue' | 'slate'
  to?: string
}) {
  const tones: Record<string, { ring: string; bg: string; text: string }> = {
    red:    { ring: 'ring-red-200',    bg: 'bg-red-50',    text: 'text-red-700' },
    orange: { ring: 'ring-orange-200', bg: 'bg-orange-50', text: 'text-orange-700' },
    amber:  { ring: 'ring-amber-200',  bg: 'bg-amber-50',  text: 'text-amber-700' },
    blue:   { ring: 'ring-blue-200',   bg: 'bg-blue-50',   text: 'text-blue-700' },
    slate:  { ring: 'ring-slate-200',  bg: 'bg-slate-50',  text: 'text-slate-700' },
  }
  const t = tones[tone]
  const inner = (
    <div className={`flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ${t.ring} hover:ring-2 transition`}>
      <span className={`inline-flex items-center justify-center rounded-lg ${t.bg} p-2`}>
        <Icon className={`h-5 w-5 ${t.text}`} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold leading-none text-slate-900 tabular-nums">{value}</p>
        {subtitle ? <p className="mt-1 truncate text-xs text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  )
  return to ? <Link to={to} className="block">{inner}</Link> : inner
}

// ─── Prioridad / acción recomendada (heurística client-side) ────────────────
type Prioridad = 'critica' | 'alta' | 'media' | 'baja'

function calcularPrioridad(opp: Opp): { prioridad: Prioridad; razon: string } {
  const dVenc = diasEntre(opp.fecha_vencimiento_contrato_prospecto)
  const dProx = diasEntre(opp.fecha_siguiente_accion)
  const dUpd  = diasEntre(opp.updated_at)
  if (dVenc != null && dVenc <= 7)  return { prioridad: 'critica', razon: 'Vencimiento ≤7d' }
  if (dProx != null && dProx < 0)   return { prioridad: 'critica', razon: 'Seguimiento vencido' }
  if (dVenc != null && dVenc <= 30) return { prioridad: 'alta',    razon: 'Vencimiento ≤30d' }
  if (dProx != null && dProx <= 2)  return { prioridad: 'alta',    razon: 'Próx. acción inminente' }
  if (dUpd  != null && dUpd  < -30) return { prioridad: 'alta',    razon: 'Sin actividad >30d' }
  if (dProx != null && dProx <= 7)  return { prioridad: 'media',   razon: 'Próx. acción semana' }
  return { prioridad: 'baja', razon: '—' }
}

const ETAPA_ACCION_DEFAULT: Record<string, string> = {
  prospecto: 'Llamar para cualificar',
  auditoria_consumo: 'Solicitar facturas',
  oferta_presentada: 'Reclamar respuesta',
  negociacion: 'Cerrar firma',
  cerrada_ganada: 'Convertir a CRM',
  contactado: 'Programar visita',
  analisis: 'Generar propuesta',
  cierre: 'Reunión cierre',
}

function accionRecomendada(opp: Opp): string {
  if (opp.siguiente_accion && opp.siguiente_accion.trim()) return opp.siguiente_accion
  if (opp.etapa && ETAPA_ACCION_DEFAULT[opp.etapa]) return ETAPA_ACCION_DEFAULT[opp.etapa]
  return 'Revisar caso'
}

const PRIORIDAD_PILL: Record<Prioridad, string> = {
  critica: 'bg-red-100 text-red-700 ring-1 ring-red-200',
  alta:    'bg-orange-100 text-orange-700 ring-1 ring-orange-200',
  media:   'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  baja:    'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
}

const PRIORIDAD_RANK: Record<Prioridad, number> = { critica: 0, alta: 1, media: 2, baja: 3 }

// ─── Hooks locales (mínimos, sin nuevo módulo de api) ───────────────────────
function useOportunidadesActivas() {
  return useQuery({
    queryKey: ['hoy', 'oportunidades-activas'],
    queryFn: async (): Promise<Opp[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q = (supabase as any)
        .from('oportunidades')
        .select('*, empresa:empresas(id, nombre)')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
      const { data, error } = await q
      if (error) throw error
      const all = (data ?? []) as Opp[]
      // Excluimos cerradas (perdidas/ganadas pasadas) — solo casos vivos.
      return all.filter((o) => o.etapa !== 'cerrada_perdida')
    },
  })
}

function useContratosVencimiento() {
  return useQuery({
    queryKey: ['hoy', 'contratos-vencimiento'],
    queryFn: async (): Promise<Contrato[]> => {
      const { data, error } = await supabase
        .from('contratos')
        .select('id, empresa_id, numero_contrato, fecha_fin, estado, deleted_at')
        .is('deleted_at', null)
      if (error) throw error
      return (data ?? []) as Contrato[]
    },
  })
}

function useUserProfiles() {
  return useQuery({
    queryKey: ['hoy', 'user-profiles-min'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, funciones')
      if (error) throw error
      return (data ?? []) as Profile[]
    },
  })
}

// ─── Página ─────────────────────────────────────────────────────────────────
export default function HoyPage() {
  const { user } = useAuth()
  const oppQ = useOportunidadesActivas()
  const ctrQ = useContratosVencimiento()
  const userQ = useUserProfiles()

  const oportunidades = oppQ.data ?? []
  const contratos = ctrQ.data ?? []
  const usuarios = userQ.data ?? []

  const userMap = useMemo(() => {
    const m = new Map<string, Profile>()
    usuarios.forEach((u) => m.set(u.id, u))
    return m
  }, [usuarios])

  // ─ KPIs ───
  const seguimientosVencidos = oportunidades.filter((o) => {
    const d = diasEntre(o.fecha_siguiente_accion)
    return d != null && d < 0
  }).length

  const propuestasPendientes = oportunidades.filter((o) =>
    o.etapa === 'oferta_presentada' || o.etapa === 'cierre',
  ).length

  const facturasPendientes = oportunidades.filter((o) =>
    o.etapa_operativa === 'pendiente_factura' || o.etapa === 'auditoria_consumo',
  ).length

  const sinActividad30d = oportunidades.filter((o) => {
    const d = diasEntre(o.updated_at)
    return d != null && d < -30
  }).length

  const contratosPorVencer = contratos.filter((c) => {
    const d = diasEntre(c.fecha_fin)
    return d != null && d >= 0 && d <= 90 && c.estado !== 'cancelado' && c.estado !== 'baja'
  }).length

  // ─ Filas tabla con prioridad + ordenación ───
  const filas = useMemo(() => {
    return oportunidades
      .map((o) => {
        const { prioridad, razon } = calcularPrioridad(o)
        return {
          opp: o,
          empresa: o.empresa?.nombre ?? '—',
          empresaId: o.empresa?.id,
          etapa: o.etapa ? (ETAPA_LABEL[o.etapa] ?? o.etapa) : '—',
          responsable: o.responsable_actual_id
            ? (userMap.get(o.responsable_actual_id)?.full_name ?? 'Sin asignar')
            : 'Sin asignar',
          ultimoContacto: o.updated_at,
          proximoContacto: o.fecha_siguiente_accion ?? null,
          prioridad,
          razon,
          accion: accionRecomendada(o),
          valor: o.valor_estimado_eur ?? o.valor_estimado ?? null,
        }
      })
      .sort((a, b) => {
        // Primero por prioridad
        const r = PRIORIDAD_RANK[a.prioridad] - PRIORIDAD_RANK[b.prioridad]
        if (r !== 0) return r
        // Luego por próximo contacto (más cerca primero / vencidos primero)
        const aNext = diasEntre(a.proximoContacto)
        const bNext = diasEntre(b.proximoContacto)
        if (aNext == null && bNext == null) return 0
        if (aNext == null) return 1
        if (bNext == null) return -1
        return aNext - bNext
      })
  }, [oportunidades, userMap])

  const isLoading = oppQ.isLoading || ctrQ.isLoading || userQ.isLoading

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-valere-blue-dark">Hoy</h1>
        <p className="text-sm text-slate-500">
          Acciones del día — {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          {user?.full_name ? <> · <span className="text-slate-700">{user.full_name}</span></> : null}
        </p>
      </div>

      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <KPI
          label="Seguimientos vencidos"
          value={seguimientosVencidos}
          icon={AlertTriangle}
          tone="red"
          subtitle="con fecha pasada"
        />
        <KPI
          label="Propuestas pendientes"
          value={propuestasPendientes}
          icon={FileText}
          tone="orange"
          subtitle="enviadas o en cierre"
        />
        <KPI
          label="Facturas pendientes"
          value={facturasPendientes}
          icon={Send}
          tone="amber"
          subtitle="auditoría de consumo"
        />
        <KPI
          label="Sin actividad 30d"
          value={sinActividad30d}
          icon={Clock}
          tone="blue"
          subtitle="oportunidades frías"
        />
        <KPI
          label="Contratos a vencer 90d"
          value={contratosPorVencer}
          icon={TrendingUp}
          tone="slate"
          subtitle="renovación próxima"
          to="/contratos"
        />
      </div>

      {/* Tabla */}
      <div className="rounded-xl bg-white ring-1 ring-slate-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Casos que requieren acción</h2>
            <p className="text-xs text-slate-500">
              {filas.length} oportunidad{filas.length === 1 ? '' : 'es'} ordenada{filas.length === 1 ? '' : 's'} por prioridad
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-500">Cargando…</div>
        ) : filas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-sm font-medium text-slate-900">Sin pendientes hoy</p>
            <p className="text-xs text-slate-500">No hay oportunidades activas que requieran acción.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Empresa</th>
                  <th className="px-4 py-2 text-left font-medium">Etapa</th>
                  <th className="px-4 py-2 text-left font-medium">Responsable</th>
                  <th className="px-4 py-2 text-left font-medium">Último</th>
                  <th className="px-4 py-2 text-left font-medium">Próximo</th>
                  <th className="px-4 py-2 text-left font-medium">Prioridad</th>
                  <th className="px-4 py-2 text-left font-medium">Acción recomendada</th>
                  <th className="px-4 py-2 text-right font-medium">Acciones rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filas.map((f) => (
                  <tr key={f.opp.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      {f.empresaId ? (
                        <Link to={`/empresas/${f.empresaId}`} className="font-medium text-slate-900 hover:text-valere-blue-dark">
                          {f.empresa}
                        </Link>
                      ) : (
                        <span className="font-medium text-slate-900">{f.empresa}</span>
                      )}
                      {f.valor != null ? (
                        <p className="text-xs text-slate-500 tabular-nums">{fmtEur(f.valor)}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{f.etapa}</td>
                    <td className="px-4 py-3 text-slate-700">{f.responsable}</td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums whitespace-nowrap" title={f.ultimoContacto}>
                      {fmtRelative(f.ultimoContacto)}
                    </td>
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                      {f.proximoContacto ? (
                        <span
                          className={
                            (diasEntre(f.proximoContacto) ?? 0) < 0
                              ? 'text-red-700 font-medium'
                              : (diasEntre(f.proximoContacto) ?? 0) <= 2
                              ? 'text-orange-700 font-medium'
                              : 'text-slate-600'
                          }
                          title={f.proximoContacto}
                        >
                          {fmtDate(f.proximoContacto)} · {fmtRelative(f.proximoContacto)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORIDAD_PILL[f.prioridad]}`}
                        title={f.razon}
                      >
                        {f.prioridad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs">
                      <p className="truncate" title={f.accion}>{f.accion}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/oportunidades`}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                          title="Registrar actividad"
                        >
                          <Phone className="h-3.5 w-3.5" /> <span className="hidden lg:inline">Actividad</span>
                        </Link>
                        <Link
                          to={`/oportunidades`}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                          title="Cambiar etapa"
                        >
                          <ArrowRightCircle className="h-3.5 w-3.5" /> <span className="hidden lg:inline">Etapa</span>
                        </Link>
                        <Link
                          to={`/captacion`}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                          title="Pasar a otro responsable"
                        >
                          <GitBranch className="h-3.5 w-3.5" /> <span className="hidden lg:inline">Handoff</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
