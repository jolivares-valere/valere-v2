import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select'
import { validateCUPS } from '../../../core/utils/validators'
import { ALL_TARIFFS } from '../../../core/energia/tariffs'
import { useActualizarCups, type SuministroRow } from '../api'

/**
 * Modal "Editar suministro" — corrección de datos de un CUPS tras crearlo.
 *
 * Origen: hallazgo real de Julia en el ensayo del gate V3 (semana 3) —
 * "no puedo corregir el CUPS si me equivoco al darlo de alta" (F2, plan 4
 * semanas). Aplazado a la semana 4.
 *
 * Edita solo campos comerciales: CUPS, tarifa de acceso, dirección/ciudad
 * de suministro, comercializadora y estado. NO edita potencias contratadas,
 * datos FV ni datos Datadis — esos viven en sus propios módulos.
 */

const ESTADOS = ['activo', 'baja', 'pendiente'] as const

const schema = z.object({
  codigo_cups: z
    .string()
    .min(1, 'El CUPS es obligatorio')
    .refine((v) => validateCUPS(v), 'CUPS inválido (formato o dígito de control incorrecto)'),
  tarifa_acceso: z.string().optional().or(z.literal('')),
  direccion_suministro: z.string().optional().or(z.literal('')),
  ciudad_suministro: z.string().optional().or(z.literal('')),
  comercializadora_actual: z.string().optional().or(z.literal('')),
  estado: z.enum(ESTADOS),
})

type Form = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  suministro: SuministroRow
}

export default function EditarSuministroModal({ open, onOpenChange, suministro }: Props) {
  const actualizar = useActualizarCups()

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      codigo_cups: suministro.codigo_cups,
      tarifa_acceso: suministro.tarifa_acceso ?? '',
      direccion_suministro: suministro.direccion_suministro ?? '',
      ciudad_suministro: suministro.ciudad_suministro ?? '',
      comercializadora_actual: suministro.comercializadora_actual ?? '',
      estado: (suministro.estado as Form['estado']) ?? 'activo',
    },
  })

  // Reset cuando cambia el suministro (o se reabre el modal sin cerrar antes)
  useEffect(() => {
    if (open) {
      form.reset({
        codigo_cups: suministro.codigo_cups,
        tarifa_acceso: suministro.tarifa_acceso ?? '',
        direccion_suministro: suministro.direccion_suministro ?? '',
        ciudad_suministro: suministro.ciudad_suministro ?? '',
        comercializadora_actual: suministro.comercializadora_actual ?? '',
        estado: (suministro.estado as Form['estado']) ?? 'activo',
      })
    }
  }, [open, suministro, form])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await actualizar.mutateAsync({
        cupsId: suministro.id,
        empresaId: suministro.empresa_id,
        codigo_cups: values.codigo_cups.trim().toUpperCase(),
        tarifa_acceso: values.tarifa_acceso?.trim() || null,
        direccion_suministro: values.direccion_suministro?.trim() || null,
        ciudad_suministro: values.ciudad_suministro?.trim() || null,
        comercializadora_actual: values.comercializadora_actual?.trim() || null,
        estado: values.estado,
      })
      toast.success('Suministro actualizado')
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message
        : (typeof err === 'object' && err !== null && 'message' in err
          && typeof (err as { message: unknown }).message === 'string')
          ? (err as { message: string }).message
          : 'Error desconocido'
      toast.error('No se pudo actualizar el suministro', { description: msg })
    }
  })

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>Editar suministro</DialogTitle>
          <DialogDescription>
            Corrige el CUPS o cualquier otro dato del punto de suministro.
          </DialogDescription>
        </DialogHeader>

        <form id="editar-suministro-form" onSubmit={onSubmit} className="space-y-4 overflow-y-auto px-6 pb-2 flex-1">
          <div>
            <Label htmlFor="es_codigo_cups">CUPS <span className="text-red-500">*</span></Label>
            <Input
              id="es_codigo_cups"
              {...form.register('codigo_cups')}
              className="font-mono"
              aria-invalid={!!errors.codigo_cups}
            />
            {errors.codigo_cups && <p className="text-xs text-red-600 mt-0.5">{errors.codigo_cups.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="es_tarifa_acceso">Tarifa de acceso</Label>
              <Select
                value={form.watch('tarifa_acceso') || undefined}
                onValueChange={(v) => form.setValue('tarifa_acceso', v ?? '')}
              >
                <SelectTrigger id="es_tarifa_acceso"><SelectValue placeholder="Sin especificar" /></SelectTrigger>
                <SelectContent>
                  {ALL_TARIFFS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="es_estado">Estado</Label>
              <Select
                value={form.watch('estado')}
                onValueChange={(v) => form.setValue('estado', (v ?? 'activo') as Form['estado'])}
              >
                <SelectTrigger id="es_estado"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="es_direccion">Dirección de suministro</Label>
            <Input id="es_direccion" {...form.register('direccion_suministro')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="es_ciudad">Ciudad</Label>
              <Input id="es_ciudad" {...form.register('ciudad_suministro')} />
            </div>
            <div>
              <Label htmlFor="es_comercializadora">Comercializadora</Label>
              <Input id="es_comercializadora" {...form.register('comercializadora_actual')} />
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Las potencias contratadas, datos de autoconsumo FV y sincronización Datadis se gestionan
            desde sus propios módulos.
          </p>
        </form>

        <DialogFooter className="px-6 py-4 border-t border-slate-200 bg-white shrink-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="editar-suministro-form" disabled={actualizar.isPending}>
            {actualizar.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
