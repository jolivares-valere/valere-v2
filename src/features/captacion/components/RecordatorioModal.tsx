import { useState } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Textarea } from '../../../components/ui/textarea'
import { useRecordarAResponsable } from '../api'

/**
 * Sprint 2026-05-19 Hallazgo #2: modal para enviar recordatorio al responsable
 * actual de una oportunidad. Crea notificación CRM + email Resend.
 */

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  oportunidadId: string | null
  empresaNombre?: string
  responsableNombre?: string | null
}

export default function RecordatorioModal({
  open, onOpenChange, oportunidadId, empresaNombre, responsableNombre,
}: Props) {
  const [mensaje, setMensaje] = useState('')
  const recordar = useRecordarAResponsable()

  const handleEnviar = async () => {
    if (!oportunidadId) return
    const texto = mensaje.trim()
    if (!texto) {
      toast.error('Escribe un mensaje')
      return
    }
    try {
      await recordar.mutateAsync({ oportunidad_id: oportunidadId, mensaje: texto })
      toast.success('Recordatorio enviado', {
        description: responsableNombre
          ? `${responsableNombre} recibirá un email + notificación en el CRM`
          : 'El responsable recibirá un email + notificación en el CRM',
      })
      setMensaje('')
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message
        : (typeof err === 'object' && err !== null && 'message' in err
          && typeof (err as { message: unknown }).message === 'string')
          ? (err as { message: string }).message
          : 'Error desconocido'
      toast.error('No se pudo enviar el recordatorio', { description: msg })
    }
  }

  const handleCancel = () => {
    setMensaje('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-600" />
            Recordar a {responsableNombre ?? 'responsable'}
          </DialogTitle>
          <DialogDescription>
            {empresaNombre ? `Caso: ${empresaNombre}. ` : ''}
            Se enviará una notificación dentro del CRM y un email a {responsableNombre ?? 'la persona responsable'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <label className="text-xs font-medium text-slate-700" htmlFor="recordatorio-mensaje">
            Mensaje
          </label>
          <Textarea
            id="recordatorio-mensaje"
            value={mensaje}
            onChange={e => setMensaje(e.target.value)}
            placeholder="Ej: ¿Habéis revisado la factura? El cliente preguntó por la propuesta hoy."
            rows={5}
            maxLength={2000}
            autoFocus
          />
          <p className="text-[10px] text-slate-400 text-right">
            {mensaje.length} / 2000
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={recordar.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => void handleEnviar()}
            disabled={recordar.isPending || mensaje.trim().length === 0}
          >
            {recordar.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-1.5" />
                Enviar recordatorio
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
