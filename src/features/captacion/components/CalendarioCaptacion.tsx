import { useMemo, useState, useCallback } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer, type View } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { useEventosCalendario, useReagendarEvento, type EventoCalendario } from '../useCalendario'
import ProgramarLlamadaModal from './ProgramarLlamadaModal'

import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'

/**
 * Sprint 2026-05-19 tarde — Hallazgo #1 Capa A.
 *
 * Calendario interno del módulo Captación.
 *
 * Características:
 *   - Vistas: mes / semana / día / agenda.
 *   - Eventos: llamadas programadas (azul/ámbar) + vencimientos contrato (rojo).
 *   - Drag&drop para reagendar — actualiza la ficha del cliente automáticamente.
 *   - Click en evento → modal editar (reagendar, cambiar notas, cancelar).
 *   - Click en slot vacío → modal programar nueva llamada (pide cliente).
 *   - Bidireccional: cualquier cambio se refleja en la ficha del cliente.
 */

const locales = { es }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }), // Lunes
  getDay,
  locales,
})

const DnDCalendar = withDragAndDrop<EventoCalendario, object>(BigCalendar as any)

const MENSAJES = {
  date: 'Fecha',
  time: 'Hora',
  event: 'Evento',
  allDay: 'Todo el día',
  week: 'Semana',
  work_week: 'Semana laboral',
  day: 'Día',
  month: 'Mes',
  previous: 'Anterior',
  next: 'Siguiente',
  yesterday: 'Ayer',
  tomorrow: 'Mañana',
  today: 'Hoy',
  agenda: 'Agenda',
  noEventsInRange: 'No hay llamadas programadas en este rango.',
  showMore: (count: number) => `+${count} más`,
}

interface Props {
  onAbrirCliente?: (oportunidadId: string) => void
}

export default function CalendarioCaptacion({ onAbrirCliente }: Props) {
  const { data: eventos = [], isLoading } = useEventosCalendario()
  const reagendar = useReagendarEvento()

  const [view, setView] = useState<View>('week')
  const [date, setDate] = useState<Date>(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [modalEvento, setModalEvento] = useState<EventoCalendario | null>(null)
  const [modalFecha, setModalFecha] = useState<Date | null>(null)

  // BigCalendar usa los accessors (funciones) que apuntan a fecha_inicio/fecha_fin
  // del propio EventoCalendario. No hace falta adaptar.
  const eventosCalendario = useMemo(() => eventos, [eventos])

  const handleSelectEvent = useCallback((ev: any) => {
    // Click en evento existente → modal editar
    setModalEvento(ev as EventoCalendario)
    setModalFecha(null)
    setModalOpen(true)
  }, [])

  const handleSelectSlot = useCallback((slot: { start: Date }) => {
    // Click en hueco vacío → modal nuevo
    setModalEvento(null)
    setModalFecha(slot.start)
    setModalOpen(true)
  }, [])

  const handleEventDrop = useCallback(async (args: any) => {
    const ev = args.event as EventoCalendario
    const start = args.start as Date
    if (ev.tipo === 'vencimiento') {
      toast.error('Los vencimientos de contrato no se reagendan desde el calendario')
      return
    }
    try {
      await reagendar.mutateAsync({
        oportunidad_id: ev.oportunidad_id,
        fecha_siguiente_accion: start.toISOString(),
      })
      toast.success('Llamada reagendada', {
        description: `${ev.empresa_nombre} - ${start.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      toast.error('No se pudo reagendar', { description: msg })
    }
  }, [reagendar])

  // Estilo por tipo
  const eventPropGetter = useCallback((event: any) => {
    const tipo = (event as EventoCalendario).tipo
    if (tipo === 'vencimiento') {
      return {
        style: {
          backgroundColor: '#FEE2E2',
          color: '#991B1B',
          border: '1px solid #FECACA',
          borderRadius: 4,
        },
      }
    }
    if (tipo === 'recordatorio') {
      return {
        style: {
          backgroundColor: '#FEF3C7',
          color: '#92400E',
          border: '1px solid #FDE68A',
          borderRadius: 4,
        },
      }
    }
    // llamada
    return {
      style: {
        backgroundColor: '#DBEAFE',
        color: '#1E3A8A',
        border: '1px solid #BFDBFE',
        borderRadius: 4,
      },
    }
  }, [])

  if (isLoading) {
    return (
      <div className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500">
        Cargando calendario...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-3 mb-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: '#DBEAFE', border: '1px solid #BFDBFE' }} />
            Llamadas programadas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA' }} />
            Vencimientos de contrato
          </span>
          <span className="ml-auto text-[11px] text-slate-500">
            Arrastra una llamada para reagendarla. Doble click para editar.
          </span>
        </div>
        <div style={{ height: 600 }}>
          <DnDCalendar
            localizer={localizer}
            events={eventosCalendario as any}
            culture="es"
            messages={MENSAJES}
            view={view}
            date={date}
            onView={(v) => setView(v)}
            onNavigate={(d) => setDate(d)}
            selectable
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            onEventDrop={handleEventDrop as any}
            onEventResize={handleEventDrop as any}
            resizable
            eventPropGetter={eventPropGetter}
            popup
            startAccessor={(ev: any) => ev.fecha_inicio}
            endAccessor={(ev: any) => ev.fecha_fin}
            titleAccessor={(ev: any) => ev.empresa_nombre as string}
            allDayAccessor={(ev: any) => ev.tipo === 'vencimiento'}
            views={['month', 'week', 'day', 'agenda']}
            step={30}
            timeslots={2}
          />
        </div>
      </div>

      <ProgramarLlamadaModal
             open={modalOpen}
        onOpenChange={setModalOpen}
        evento={modalEvento}
        fechaInicial={modalFecha}
      />
    </div>
  )
}
