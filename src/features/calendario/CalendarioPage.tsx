import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react'
import { useEventosEnRango, type EventoConRelaciones } from './api'
import EventoForm from './components/EventoForm'

const TIPO_COLORS: Record<string, string> = {
  reunion: 'bg-blue-100 text-blue-800 border-blue-200',
  llamada: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  visita: 'bg-amber-100 text-amber-800 border-amber-200',
  tarea: 'bg-violet-100 text-violet-800 border-violet-200',
  vencimiento: 'bg-red-100 text-red-800 border-red-200',
  otro: 'bg-slate-100 text-slate-700 border-slate-200',
}

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 1) }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1) }
function isoDay(d: Date) {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildMonthGrid(refDate: Date): Date[] {
  const first = startOfMonth(refDate)
  const dow = (first.getDay() + 6) % 7 // lunes=0
  const start = new Date(first)
  start.setDate(first.getDate() - dow)
  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
}

export default function CalendarioPage() {
  const [refDate, setRefDate] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<EventoConRelaciones | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | undefined>(undefined)

  const desde = startOfMonth(refDate).toISOString()
  const hasta = endOfMonth(refDate).toISOString()
  const { data: eventos = [], isLoading } = useEventosEnRango({ desde, hasta })

  const grid = useMemo(() => buildMonthGrid(refDate), [refDate])
  const eventosByDay = useMemo(() => {
    const map = new Map<string, EventoConRelaciones[]>()
    for (const ev of eventos) {
      const key = isoDay(new Date(ev.fecha_inicio))
      const arr = map.get(key) ?? []
      arr.push(ev)
      map.set(key, arr)
    }
    return map
  }, [eventos])

  const monthLabel = refDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  const today = isoDay(new Date())

  const openCreate = (day?: string) => {
    setEditing(null)
    setSelectedDay(day)
    setShowForm(true)
  }
  const openEdit = (ev: EventoConRelaciones) => {
    setEditing(ev)
    setSelectedDay(undefined)
    setShowForm(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-slate-500" />
          <h1 className="text-3xl font-display font-bold text-valere-blue-dark">Calendario</h1>
        </div>
        <button
          type="button"
          onClick={() => openCreate(today)}
          className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" /> Nuevo evento
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={() => setRefDate((d) => addMonths(d, -1))}
            className="rounded-xl p-1 hover:bg-slate-100"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-medium capitalize text-slate-900">{monthLabel}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setRefDate(new Date())}
              className="rounded-xl border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setRefDate((d) => addMonths(d, 1))}
              className="rounded-xl p-1 hover:bg-slate-100"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
          {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {grid.map((d) => {
            const inMonth = d.getMonth() === refDate.getMonth()
            const dayKey = isoDay(d)
            const dayEvents = eventosByDay.get(dayKey) ?? []
            const isToday = dayKey === today
            return (
              <div
                key={dayKey}
                className={`min-h-[96px] border-b border-r border-slate-200 p-1 last:border-r-0 ${
                  inMonth ? 'bg-white' : 'bg-slate-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => openCreate(dayKey)}
                  className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    isToday ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  } ${inMonth ? '' : 'opacity-50'}`}
                  title="Crear evento"
                >
                  {d.getDate()}
                </button>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => openEdit(ev)}
                      className={`block w-full truncate rounded border px-1.5 py-0.5 text-left text-[11px] ${
                        TIPO_COLORS[ev.tipo] ?? TIPO_COLORS.otro
                      }`}
                      title={ev.titulo}
                    >
                      {ev.titulo}
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="px-1.5 text-[10px] text-slate-500">+{dayEvents.length - 3} más</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {isLoading && <p className="text-xs text-slate-500">Cargando eventos…</p>}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <h3 className="mb-3 text-base font-semibold text-slate-900">
              {editing ? 'Editar evento' : 'Nuevo evento'}
            </h3>
            <EventoForm
              evento={editing}
              defaultDate={selectedDay}
              onClose={() => { setShowForm(false); setEditing(null); setSelectedDay(undefined) }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
