import { useEffect, useState } from 'react'
import { Calendar, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { Label } from '../../../components/ui/label'
import { useReagendarEvento, useCancelarEvento, type EventoCalendario } from '../useCalendario'

/**
 * Sprint 2026-05-19 tarde — Hallazgo #1 Capa A.
 *
 * Modal para crear o editar un evento del calendario. Bidireccional:
 *   - Cualquier cambio aquí actualiza inmediatamente la ficha del cliente.
 *   - Si el cliente edita la "próxima llamada" desde su ficha, este modal lo
 *     refleja también (cache compartido).
 */

function toLocalDatetimeInput(date: Date): string {
  // Convierte Date a string formato YYYY-MM-DDTHH:mm para input type=datetime-local
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Si se pasa, modal en modo edición */
  evento?: EventoCalendario | null
  /** Si se pasa (sin evento), modal en modo creación con fecha pre-rellenada */
  fechaInicial?: Date | null
  /** Si se pasa, modal en modo creación para una oportunidad concreta */
  oportunidadId?: string | null
  empresaNombre?: string
}

export default function ProgramarLlamadaModal({
  open, onOpenChange, evento, fechaInicial, oportunidadId, empresaNombre,
}: Props) {
  const reagendar = useReagendarEvento()
  const cancelar = useCancelarEvento()

  const [fecha, setFecha] = useState('')
  const [notas, setNotas] = useState('')

  // Inicializa estado al abrir
  useEffect(() => {
    if (!open) return
    if (evento) {
      setFecha(toLocalDatetimeInput(evento.fecha_inicio))
      setNotas(evento.notas ?? '')
    } else if (fechaInicial) {
      setFecha(toLocalDatetimeInput(fechaInicial))
      setNotas('')
    } else {
      setFecha('')
      setNotas('')
    }
  }, [open, evento, fechaInicial])

  const idOportunidad = evento?.oportunidad_id ?? oportunidadId ?? null
  const nombre = evento?.empresa_nombre ?? empresaNombre ?? 'el cliente'
  const esEdicion = !!evento

  const handleGuardar = async () => {
    if (!idOportunidad) {
      toast.error('Falta identificar el cliente')
      return
    }
    if (!fecha) {
      toast.error('Falta la fecha de la llamada')
      return
    }
    try {
      // Convierte de "YYYY-MM-DDTHH:mm" local a ISO con timezone
      const fechaIso = new Date(fecha).toISOString()
      await reagendar.mutateAsync({
        oportunidad_id: idOportunidad,
        fecha_siguiente_accion: fechaIso,
        siguiente_accion: notas.trim() || null,
      })
      toast.success(esEdicion ? 'Llamada reagendada' : 'Llamada programada', {
        description: `${nombre} - ${new Date(fechaIso).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
      })
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      toast.error('No se pudo guardar', { description: msg })
    }
  }

  const handleCancelarEvento = async () => {
    if (!idOportunidad) return
    if (!window.confirm(`¿Borrar la llamada programada con ${nombre}?`)) return
    try {
      await cancelar.mutateAsync(idOportunidad)
      toast.success('Llamada cancelada')
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      toast.error('No se pudo cancelar', { description: msg })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-valere-blue-dark" />
            {esEdicion ? 'Reagendar llamada' : 'Programar llamada'}
          </DialogTitle>
          <DialogDescription>
            {esEdicion
              ? `Cambios sincronizan con la ficha de ${nombre}.`
              : `Programa una llamada con ${nombre}. Aparecerá en su ficha automáticamente.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="programar-fecha" className="text-xs font-medium text-slate-700">
              Fecha y hora
            </Label>
            <Input
              id="programar-fecha"
              type="datetime-local"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="programar-notas" className="text-xs font-medium text-slate-700">
              Motivo / notas
            </Label>
            <Textarea
              id="programar-notas"
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Ej: seguimiento propuesta enviada, recordar oferta especial..."
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {esEdicion && (
            <Button
              variant="outline"
              onClick={() => void handleCancelarEvento()}
              disabled={cancelar.isPending || reagendar.isPending}
              className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Cancelar llamada
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={reagendar.isPending}>
            Cerrar
          </Button>
          <Button
            onClick={() => void handleGuardar()}
            disabled={reagendar.isPending || !fecha}
          >
            {reagendar.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Guarda              </>
            ) : esEdicion ? 'Guardar cambios' : 'Programar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
