import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, Clock, TrendingDown, Users, Zap, Euro, ChevronRight, ArrowDownCircle
} from 'lucide-react'
import { useSupabaseQuery } from '@/core/hooks/useSupabaseQuery'
import type { Empresa } from '@/core/types/entities'

// Fecha cierre ventana RDL 7/2026
const RDL_CLOSE_DATE = new Date('2026-12-31')

function daysUntil(date: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = date.getTime() - today.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function urgencyColor(days: number) {
  if (days <= 10) return 'text-red-500 bg-red-50'
  if (days <= 21) return 'text-orange-500 bg-orange-50'
  return 'text-yellow-500 bg-yellow-50'
}

interface StatCardProps {
  icon: React.ReactNode
  value: string | number
  label: string
  color?: string
  href?: string
}

function StatCard({ icon, value, label, color = 'bg-blue-50 text-blue-600', href }: StatCardProps) {
  const content = (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  )
  if (href) return <Link to={href}>{content}</Link>
  return content
}

interface AlertDotProps {
  count: number
  label: string
  sublabel: string
  colorClass: string
}

function AlertDot({ count, label, sublabel, colorClass }: AlertDotProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-6 text-center">
      <div className={`mb-2 h-4 w-4 rounded-full ${colorClass}`} />
      <p className={`text-4xl font-bold ${colorClass.replace('bg-', 'text-')}`}>{count}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-xs text-slate-400">{sublabel}</p>
    </div>
  )
}

export default function PotenciasDashboardPage() {
  const diasRestantes = useMemo(() => daysUntil(RDL_CLOSE_DATE), [])

  // Datos reales del CRM
  const { data: empresas } = useSupabaseQuery<Empresa>({
    table: 'empresas',
    filters: [{ column: 'deleted_at', op: 'eq', value: null }],
  })

  const { data: cups } = useSupabaseQuery<{ id: string }>({
    table: 'cups',
    filters: [{ column: 'deleted_at', op: 'eq', value: null }],
  })

  const clientesActivos = empresas.length
  const cupsActivos = cups.length

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
      {/* Banner RDL 7/2026 */}
      <div className="mb-8 flex items-center justify-between rounded-2xl bg-[#1e3a6e] px-6 py-5 text-white shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-base font-bold">Cierre ventana RDL 7/2026</p>
            <p className="text-sm text-blue-200">
              Cambios de potencia ilimitados y sin coste hasta el 31/12/2026
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black">{diasRestantes}</p>
          <p className="text-sm text-blue-200">días restantes</p>
        </div>
      </div>

      {/* Stats principales */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          value={clientesActivos}
          label="Clientes activos"
          color="bg-blue-50 text-blue-600"
          href="/empresas"
        />
        <StatCard
          icon={<Zap className="h-5 w-5" />}
          value={cupsActivos}
          label="CUPS activos"
          color="bg-purple-50 text-purple-600"
          href="/datos"
        />
        <StatCard
          icon={<TrendingDown className="h-5 w-5" />}
          value="0,00 €"
          label="Ahorro conseguido"
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={<Euro className="h-5 w-5" />}
          value="89.061,64 €"
          label="Ahorro pendiente"
          color="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Alertas activas */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-semibold text-slate-800">Alertas activas</h2>
        </div>
        <div className="flex gap-3">
          <AlertDot count={0} label="URGENTE" sublabel="≤10 días" colorClass="bg-red-500" />
          <AlertDot count={0} label="ATENCIÓN" sublabel="≤15 días" colorClass="bg-orange-400" />
          <AlertDot count={0} label="PREPARAR" sublabel="≤21 días" colorClass="bg-yellow-400" />
        </div>
      </div>

      {/* Bajadas activas con subida pendiente */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-semibold text-slate-800">
              Bajadas activas con subida pendiente
            </h2>
          </div>
          <Link
            to="/datos"
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            Ver todos <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="text-sm text-slate-400">Sin expedientes activos en este momento.</p>
      </div>

      {/* Acceso rápido a secciones */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { href: '/datos',              label: 'Suministros',  icon: <Zap className="h-5 w-5" /> },
          { href: '/analisis',           label: 'Análisis',     icon: <TrendingDown className="h-5 w-5" /> },
          { href: '/propuestas-energia', label: 'Propuestas',   icon: <Euro className="h-5 w-5" /> },
          { href: '/tracking',           label: 'Seguimiento',  icon: <Clock className="h-5 w-5" /> },
        ].map(({ href, label, icon }) => (
          <Link
            key={href}
            to={href}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:shadow-md transition-all"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              {icon}
            </span>
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
