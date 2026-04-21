import { useEffect, useRef, useState } from 'react'
import { Bell, Check, CheckCheck, AlertTriangle, FileText, Target, X } from 'lucide-react'
import { useAuth } from '../../core/hooks/useAuth'
import { formatDate } from '../../core/utils/dates'
import {
  useNotificacionesNoLeidas,
  useNotificacionesRecientes,
  useMarcarLeida,
  useMarcarTodasLeidas,
  useGenerarNotificaciones,
} from './api'
import type { Notificacion } from '../../core/types/entities'

const TIPO_ICON: Record<string, typeof AlertTriangle> = {
  tarea_vencida: AlertTriangle,
  contrato_por_vencer: FileText,
  oportunidad_estancada: Target,
}

const TIPO_COLOR: Record<string, string> = {
  tarea_vencida: 'text-red-600 bg-red-50',
  contrato_por_vencer: 'text-orange-600 bg-orange-50',
  oportunidad_estancada: 'text-amber-600 bg-amber-50',
}

function NotifItem({
  notif,
  onMarcar,
}: {
  notif: Notificacion
  onMarcar: (id: string) => void
}) {
  const Icon = TIPO_ICON[notif.tipo ?? ''] ?? Bell
  const color = TIPO_COLOR[notif.tipo ?? ''] ?? 'text-slate-600 bg-slate-50'

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 ${
        notif.leida ? 'opacity-60' : 'bg-white'
      } border-b border-slate-100 last:border-0`}
    >
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{notif.titulo}</p>
        {notif.cuerpo && (
          <p className="text-xs text-slate-500 truncate">{notif.cuerpo}</p>
        )}
        <p className="mt-0.5 text-xs text-slate-400">{formatDate(notif.created_at, 'relative')}</p>
      </div>
      {!notif.leida && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onMarcar(notif.id) }}
          className="mt-1 shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          title="Marcar como leída"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

export default function NotificationBell() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const noLeidas = useNotificacionesNoLeidas(user?.id)
  const recientes = useNotificacionesRecientes(user?.id)
  const marcarLeida = useMarcarLeida()
  const marcarTodas = useMarcarTodasLeidas()
  const generar = useGenerarNotificaciones(user?.id)

  const count = noLeidas.data?.length ?? 0

  useEffect(() => {
    if (user?.id) generar.mutate()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        aria-label={count > 0 ? `Notificaciones (${count} sin leer)` : 'Notificaciones'}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Notificaciones {count > 0 && <span className="text-slate-500">({count})</span>}
            </h3>
            <div className="flex items-center gap-1">
              {count > 0 && (
                <button
                  type="button"
                  onClick={() => { if (user?.id) marcarTodas.mutate(user.id) }}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Todas leídas
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {(recientes.data ?? []).length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                Sin notificaciones
              </div>
            ) : (
              (recientes.data ?? []).map((n) => (
                <NotifItem key={n.id} notif={n} onMarcar={(id) => marcarLeida.mutate(id)} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
