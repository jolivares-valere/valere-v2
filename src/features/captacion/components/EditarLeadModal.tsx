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
import { Textarea } from '../../../components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select'
import { useActualizarLead, type ActualizarLeadInput, type OportunidadDetalle } from '../api'

/**
 * Modal "Editar datos del lead" — corrección de errores tras crear.
 *
 * Origen: feedback uso real Carolina A 2026-05-04 — "no puedo editar
 * datos si me equivoco al crear el lead" (P0 funcional).
 *
 * Edita: empresa (nombre + datos) + contacto principal + notas oportunidad.
 * NO edita etapa (eso lo hacen los botones de acción del drawer).
 */

const schema = z.object({
  empresa_nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  empresa_telefono: z.string().optional().or(z.literal('')),
  empresa_nif: z.string().optional().or(z.literal('')),
  empresa_email: z.string().email('Email inválido').optional().or(z.literal('')),
  empresa_ciudad: z.string().optional().or(z.literal('')),
  empresa_segmento: z.enum(['industrial', 'comercial', 'servicios', 'agricola', 'residencial_colectivo']).optional(),
  contacto_nombre: z.string().optional().or(z.literal('')),
  contacto_cargo: z.string().optional().or(z.literal('')),
  contacto_telefono: z.string().optional().or(z.literal('')),
  contacto_email: z.string().email('Email inválido').optional().or(z.literal('')),
  notas: z.string().optional().or(z.literal('')),
})

type Form = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  detalle: OportunidadDetalle
}

export default function EditarLeadModal({ open, onOpenChange, detalle }: Props) {
  const actualizar = useActualizarLead()

  // Contacto principal: el más antiguo de la lista (mismo criterio que la RPC)
  const contactoPrincipal = (detalle.contactos ?? [])[0]

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      empresa_nombre: detalle.empresa?.nombre ?? '',
      empresa_telefono: detalle.empresa?.telefono_principal ?? '',
      empresa_nif: detalle.empresa?.nif ?? '',
      empresa_email: detalle.empresa?.email_principal ?? '',
      empresa_ciudad: detalle.empresa?.ciudad ?? '',
      empresa_segmento: (detalle.empresa?.segmento as Form['empresa_segmento']) ?? 'comercial',
      contacto_nombre: contactoPrincipal?.nombre ?? '',
      contacto_cargo: contactoPrincipal?.cargo ?? '',
      contacto_telefono: contactoPrincipal?.telefono ?? '',
      contacto_email: contactoPrincipal?.email ?? '',
      notas: detalle.notas ?? '',
    },
  })

  // Reset cuando cambia el detalle (cambias de caso sin cerrar el modal)
  useEffect(() => {
    if (open) {
      form.reset({
        empresa_nombre: detalle.empresa?.nombre ?? '',
        empresa_telefono: detalle.empresa?.telefono_principal ?? '',
        empresa_nif: detalle.empresa?.nif ?? '',
        empresa_email: detalle.empresa?.email_principal ?? '',
        empresa_ciudad: detalle.empresa?.ciudad ?? '',
        empresa_segmento: (detalle.empresa?.segmento as Form['empresa_segmento']) ?? 'comercial',
        contacto_nombre: contactoPrincipal?.nombre ?? '',
        contacto_cargo: contactoPrincipal?.cargo ?? '',
        contacto_telefono: contactoPrincipal?.telefono ?? '',
        contacto_email: contactoPrincipal?.email ?? '',
        notas: detalle.notas ?? '',
      })
    }
  }, [open, detalle, contactoPrincipal, form])

  const onSubmit = form.handleSubmit(async (values) => {
    const input: ActualizarLeadInput = {
      oportunidadId: detalle.id,
      empresa_nombre: values.empresa_nombre.trim(),
      empresa_telefono: values.empresa_telefono?.trim() || undefined,
      empresa_nif: values.empresa_nif?.trim() || undefined,
      empresa_email: values.empresa_email?.trim() || undefined,
      empresa_ciudad: values.empresa_ciudad?.trim() || undefined,
      empresa_segmento: values.empresa_segmento,
      contacto_nombre: values.contacto_nombre?.trim() || undefined,
      contacto_cargo: values.contacto_cargo?.trim() || undefined,
      contacto_telefono: values.contacto_telefono?.trim() || undefined,
      contacto_email: values.contacto_email?.trim() || undefined,
      notas: values.notas?.trim() || undefined,
    }
    try {
      await actualizar.mutateAsync(input)
      toast.success('Datos actualizados')
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message
        : (typeof err === 'object' && err !== null && 'message' in err
          && typeof (err as { message: unknown }).message === 'string')
          ? (err as { message: string }).message
          : 'Error desconocido'
      toast.error('No se pudo actualizar', { description: msg })
    }
  })

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>Editar datos del lead</DialogTitle>
          <DialogDescription>
            Corrige nombre de empresa, contacto, teléfono o cualquier dato. La etapa se gestiona desde los botones del drawer.
          </DialogDescription>
        </DialogHeader>

        <form id="editar-lead-form" onSubmit={onSubmit} className="space-y-4 overflow-y-auto px-6 pb-2 flex-1">
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Empresa</h3>
            <div>
              <Label htmlFor="ed_empresa_nombre">Nombre <span className="text-red-500">*</span></Label>
              <Input id="ed_empresa_nombre" {...form.register('empresa_nombre')} aria-invalid={!!errors.empresa_nombre} />
              {errors.empresa_nombre && <p className="text-xs text-red-600 mt-0.5">{errors.empresa_nombre.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ed_empresa_telefono">Teléfono</Label>
                <Input id="ed_empresa_telefono" {...form.register('empresa_telefono')} />
              </div>
              <div>
                <Label htmlFor="ed_empresa_nif">NIF/CIF</Label>
                <Input id="ed_empresa_nif" {...form.register('empresa_nif')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ed_empresa_email">Email empresa</Label>
                <Input id="ed_empresa_email" type="email" {...form.register('empresa_email')} />
                {errors.empresa_email && <p className="text-xs text-red-600 mt-0.5">{errors.empresa_email.message}</p>}
              </div>
              <div>
                <Label htmlFor="ed_empresa_ciudad">Ciudad</Label>
                <Input id="ed_empresa_ciudad" {...form.register('empresa_ciudad')} />
              </div>
            </div>

            <div>
              <Label htmlFor="ed_empresa_segmento">Segmento</Label>
              <Select
                value={form.watch('empresa_segmento') ?? 'comercial'}
                onValueChange={v => form.setValue('empresa_segmento', (v ?? 'comercial') as Form['empresa_segmento'])}
              >
                <SelectTrigger id="ed_empresa_segmento"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="servicios">Servicios</SelectItem>
                  <SelectItem value="agricola">Agrícola</SelectItem>
                  <SelectItem value="residencial_colectivo">Residencial colectivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Contacto principal</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ed_contacto_nombre">Nombre</Label>
                <Input id="ed_contacto_nombre" {...form.register('contacto_nombre')} />
              </div>
              <div>
                <Label htmlFor="ed_contacto_cargo">Cargo</Label>
                <Input id="ed_contacto_cargo" {...form.register('contacto_cargo')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ed_contacto_telefono">Teléfono</Label>
                <Input id="ed_contacto_telefono" {...form.register('contacto_telefono')} />
              </div>
              <div>
                <Label htmlFor="ed_contacto_email">Email</Label>
                <Input id="ed_contacto_email" type="email" {...form.register('contacto_email')} />
                {errors.contacto_email && <p className="text-xs text-red-600 mt-0.5">{errors.contacto_email.message}</p>}
              </div>
            </div>
          </section>

          <section className="space-y-2 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Notas</h3>
            <Textarea id="ed_notas" rows={4} {...form.register('notas')} placeholder="Contexto, observaciones..." />
          </section>
        </form>

        <DialogFooter className="px-6 py-4 border-t border-slate-200 bg-white shrink-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="editar-lead-form" disabled={actualizar.isPending}>
            {actualizar.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
