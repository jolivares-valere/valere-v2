import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select'
import { usePosponerLlamada, type MotivoPosponer } from '../api'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  oportunidadId: string
  empresaNombre?: string | null
}

const MOTIVOS: Array<{ value: MotivoPosponer; label: string }> = [
  { value: 'vacaciones',       label: 'Cliente de vacaciones' },
  { value: 'llamar_mas_tarde', label: 'Llamar más tarde' },
  { value: 'no_disponible',    label: 'No disponible ahora' },
  { value: 'otro',             label: 'Otro motivo' },
]

/**
 * Sprint E1 2026-05-05 — Posponer llamada con motivo + fecha próxima.
 * Origen: caso real Carolina "está de vacaciones, llamar el lunes 11 mayo".
 *
 * UX para perfil no técnico:
 *  - Motivo en dropdown con frases en lenguaje natural.
 *  - Fecha obligatoria. Hora opcional (algunos clientes solo dicen "el lunes").
 *  - Notas libres opcionales.
 *  - Validación: fecha no puede ser pasada.
 */
export default function PosponerLlamadaModal({
  open, onOpenChange, oportunidadId, empresaNombre,
}: Props) {
  const posponer = usePosponerLlamada(oportunidadId)
  const [motivo, setMotivo] = useState<MotivoPosponer>('llamar_mas_tarde')
  const [fecha, setFecha] = useState<string>('')   // 'YYYY-MM-DD'
  const [hora, setHora] = useState<string>('')     // 'HH:mm' opcional
  const [notas, setNotas] = useState<string>('')

  const handleSubmit = async () => {
    if (!fecha) {
      toast.error('Pon la fecha de la próxima llamada')
      return
    }
    // Construir timestamp local (Madrid). Si no hay hora, asume 10:00.
    const horaFinal = hora || '10:00'
    const fechaProxima = new Date(`${fecha}T${horaFinal}:00`)
    if (Number.isNaN(fechaProxima.getTime())) {
      toast.error('Fecha u hora inválidas')
      return
    }
    const ahora = new Date()
    if (fechaProxima.getTime() < ahora.getTime() - 60 * 60 * 1000) {
      toast.error('La fecha no puede estar en el pasado')
      return
    }

    try {
      await posponer.mutateAsync({
        motivo,
        fecha_proxima: fechaProxima.toISOString(),
        notas: notas.trim() || undefined,
      })
      toast.success('Llamada pospuesta', {
        description: `${empresaNombre ?? 'Caso'} · próxima llamada ${fecha} ${horaFinal}`,
      })
      // Reset y cerrar
      setMotivo('llamar_mas_tarde')
      setFecha('')
      setHora('')
      setNotas('')
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message
        : (typeof err === 'object' && err !== null && 'message' in err
          && typeof (err as { message: unknown }).message === 'string')
          ? (err as { message: string }).message
          : 'Error desconocido'
      toast.error('No se pudo posponer', { description: msg })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Posponer llamada</DialogTitle>
          <DialogDescription>
            {empresaNombre ?? 'Caso'} — el cliente atendió pero hay que volver a llamar.
            El sistema te lo recordará el día que indiques.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="pll_motivo">Motivo</Label>
            <Select
              value={motivo}
              onValueChange={v => setMotivo((v ?? 'llamar_mas_tarde') as MotivoPosponer)}
            >
              <SelectTrigger id="pll_motivo">
                <SelectValue>
                  {MOTIVOS.find(m => m.value === motivo)?.label ?? 'Seleccionar'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pll_fecha">Volver a llamar el <span className="text-red-500">*</span></Label>
              <Input
                id="pll_fecha"
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="pll_hora">Hora (opcional)</Label>
              <Input
                id="pll_hora"
                type="time"
                value={hora}
                onChange={e => setHora(e.target.value)}
                placeholder="10:00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="pll_notas">Notas (opcional)</Label>
            <Textarea
              id="pll_notas"
              rows={3}
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder='Ej: "vuelve el lunes, está de vacaciones en Cádiz"'
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={posponer.isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={posponer.isPending || !fecha}>
            {posponer.isPending ? 'Guardando…' : 'Posponer llamada'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
