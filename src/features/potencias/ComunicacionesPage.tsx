import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Mail, Clock, CheckCircle2, AlertTriangle, Send,
  RefreshCw, ChevronRight, Inbox
} from 'lucide-react'
import { useSupabaseQuery } from '@/core/hooks/useSupabaseQuery'
import { SkeletonRow } from '@/components/ui/Skeleton'
import { getNormativa } from './normativas.config'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ExpedienteRow {
  id: string
  estado: string
  anio: number
  tipo_normativa: string
  empresas: { nombre: string } | null
  cups: { codigo_cups: string; ciudad_suministro: string | null } | null
  ciclos: { id: string; estado: string; numero_ciclo: number; created_at: string }[]
}

// ── Config acciones por estado ─────────────────────────────────────────────

interface AccionConfig {
  titulo: string
  descripcion: string
  urgencia: 'alta' | 'media' | 'baja'
  icono: React.ReactNode
  colorBadge: string
  colorBg: string
}

const ACCIONES: Record<string, AccionConfig> = {
  bajada_pendiente: {
    titulo:      'Enviar solicitud de bajada',
    descripcion: 'Comunicar a la distribuidora la solicitud de reducción de potencia contratada.',
    urgencia:    'alta',
    icono:       <Send className="h-4 w-4" />,
    colorBadge:  'bg-blue-100 text-blue-800',
    colorBg:     'border-l-4 border-l-blue-500',
  },
  bajada_activa: {
    titulo:      'Seguimiento bajada en tramitación',
    descripcion: 'Solicitud enviada a la distribuidora. Verificar estado de resolución.',
    urgencia:    'media',
    icono:       <Clock className="h-4 w-4" />,
    colorBadge:  'bg-amber-100 text-amber-800',
    colorBg:     'border-l-4 border-l-amber-400',
  },
  bajada_aprobada: {
    titulo:      'Iniciar solicitud de subida',
    descripcion: 'Bajada aprobada por la distribuidora. Comunicar al cliente e iniciar el proceso de subida.',
    urgencia:    'alta',
    icono:       <AlertTriangle className="h-4 w-4" />,
    colorBadge:  'bg-green-100 text-green-800',
    colorBg:     'border-l-4 border-l-green-500',
  },
  subida_pendiente: {
    titulo:      'Enviar solicitud de subida',
    descripcion: 'Comunicar a la distribuidora la solicitud de recuperación de potencia.',
    urgencia:    'alta',
    icono:       <Send className="h-4 w-4" />,
    colorBadge:  'bg-purple-100 text-purple-800',
    colorBg:     'border-l-4 border-l-purple-500',
  },
  subida_activa: {
    titulo:      'Seguimiento subida en tramitación',
    descripcion: 'Solicitud de subida enviada. Verificar estado de resolución con la distribuidora.',
    urgencia:    'media',
    icono:       <Clock className="h-4 w-4" />,
    colorBadge:  'bg-orange-100 text-orange-800',
    colorBg:     'border-l-4 border-l-orange-400',
  },
  completado: {
    titulo:      'Ciclo completado',
    descripcion: 'El ciclo de bajada/subida ha sido completado satisfactoriamente.',
    urgencia:    'baja',
    icono:       <CheckCircle2 className="h-4 w-4" />,
    colorBadge:  'bg-emerald-100 text-emerald-800',
    colorBg:     'border-l-4 border-l-emerald-500',
  },
}

const URGENCIA_ORDER = { alta: 0, media: 1, baja: 2 }

// ── Subcomponente fila ────────────────────────────────────────────────────────

function AccionRow({ exp, cicloEstado }: { exp: ExpedienteRow; cicloEstado: string }) {
  const cfg = ACCIONES[cicloEstado] ?? {
    titulo: cicloEstado, descripcion: '', urgencia: 'baja' as const,
    icono: null, colorBadge: 'bg-slate-100 text-slate-700', colorBg: 'border-l-4 border-l-slate-300',
  }
  return (
    <div className={`flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center ${cfg.colorBg}`}>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.colorBadge}`}>
            {cfg.icono}
            {cfg.titulo}
          </span>
          {cfg.urgencia === 'alta' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
              <AlertTriangle className="h-3 w-3" /> Acción requerida
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-900 truncate">{exp.empresas?.nombre ?? '—'}</p>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
            {getNormativa(exp.tipo_normativa).label}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          {exp.cups?.codigo_cups ?? '—'} · {exp.cups?.ciudad_suministro ?? ''} · {exp.anio}
        </p>
        <p className="mt-1 text-xs text-slate-500">{cfg.descripcion}</p>
      </div>
      <Link
        to={`/potencias/expedientes/${exp.id}`}
        className="inline-flex items-center gap-1.5 self-end rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors sm:self-auto flex-shrink-0"
      >
        Abrir expediente <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function ComunicacionesPage() {
  const { data, loading, refetch } = useSupabaseQuery<ExpedienteRow>({
    table: 'expedientes',
    select: `
      id, estado, anio, tipo_normativa,
      empresas ( nombre ),
      cups ( codigo_cups, ciudad_suministro ),
      ciclos ( id, estado, numero_ciclo, created_at )
    `,
    filters: [{ column: 'estado', op: 'eq', value: 'activo' }],
    order: { column: 'created_at', ascending: false },
  })

  // Asociar último ciclo a cada expediente y ordenar por urgencia
  const items = useMemo(() => {
    return data
      .map(exp => {
        const ultimo = [...(exp.ciclos ?? [])].sort((a, b) => b.numero_ciclo - a.numero_ciclo)[0]
        return { exp, cicloEstado: ultimo?.estado ?? 'sin_ciclo' }
      })
      .sort((a, b) => {
        const ua = (ACCIONES[a.cicloEstado]?.urgencia ?? 'baja') as keyof typeof URGENCIA_ORDER
        const ub = (ACCIONES[b.cicloEstado]?.urgencia ?? 'baja') as keyof typeof URGENCIA_ORDER
        return URGENCIA_ORDER[ua] - URGENCIA_ORDER[ub]
      })
  }, [data])

  const pendientesAlta = items.filter(i => ACCIONES[i.cicloEstado]?.urgencia === 'alta').length
  const completados    = items.filter(i => i.cicloEstado === 'completado').length

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Comunicaciones</h1>
            <p className="text-sm text-slate-500">
              Acciones pendientes y seguimiento de expedientes activos
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            title="Actualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Resumen */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
            <AlertTriangle className="h-3 w-3" />
            {pendientesAlta} acción{pendientesAlta !== 1 ? 'es' : ''} urgente{pendientesAlta !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            <Mail className="h-3 w-3" />
            {items.length} expediente{items.length !== 1 ? 's' : ''} activo{items.length !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            {completados} completado{completados !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                <SkeletonRow />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <Inbox className="h-8 w-8 text-slate-400" />
            </div>
            <p className="mt-4 text-base font-semibold text-slate-700">Sin expedientes activos</p>
            <p className="mt-1 text-sm text-slate-400">
              Cuando haya expedientes en curso aparecerán aquí las acciones pendientes.
            </p>
            <Link
              to="/potencias/expedientes"
              className="mt-4 flex items-center gap-2 rounded-xl bg-[#1e3a6e] px-4 py-2 text-sm font-medium text-white hover:bg-[#162d58] transition-colors"
            >
              Ver expedientes
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Acciones urgentes primero */}
            {pendientesAlta > 0 && (
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-red-500">
                Acción requerida
              </p>
            )}
            {items
              .filter(i => ACCIONES[i.cicloEstado]?.urgencia === 'alta')
              .map(({ exp, cicloEstado }) => (
                <AccionRow key={exp.id} exp={exp} cicloEstado={cicloEstado} />
              ))
            }

            {items.filter(i => ACCIONES[i.cicloEstado]?.urgencia === 'media').length > 0 && (
              <p className="mb-1 mt-5 text-xs font-bold uppercase tracking-wide text-amber-500">
                En tramitación
              </p>
            )}
            {items
              .filter(i => ACCIONES[i.cicloEstado]?.urgencia === 'media')
              .map(({ exp, cicloEstado }) => (
                <AccionRow key={exp.id} exp={exp} cicloEstado={cicloEstado} />
              ))
            }

            {completados > 0 && (
              <p className="mb-1 mt-5 text-xs font-bold uppercase tracking-wide text-emerald-600">
                Completados recientemente
              </p>
            )}
            {items
              .filter(i => i.cicloEstado === 'completado')
              .map(({ exp, cicloEstado }) => (
                <AccionRow key={exp.id} exp={exp} cicloEstado={cicloEstado} />
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}
