import { useState } from 'react'
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
import { useCrearLead, type CrearLeadInput } from '../api'

/**
 * Modal "+ Nuevo lead" para Carolina Aroca.
 *
 * Form mínimo viable: solo nombre de empresa y un teléfono son obligatorios.
 * El resto puede completarse después desde el drawer (editor inline).
 *
 * Origen: docs/SPRINT_OPERATIVO_CAPTACION_2026-05-04.md (Día 2)
 */

const schema = z.object({
  empresa_nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  empresa_telefono: z.string().min(6, 'Teléfono mínimo 6 dígitos'),
  empresa_nif: z.string().optional(),
  empresa_email: z.string().email('Email inválido').optional().or(z.literal('')),
  empresa_ciudad: z.string().optional(),
  empresa_segmento: z.enum(['industrial', 'comercial', 'servicios', 'agricola', 'residencial_colectivo']).optional(),
  contacto_nombre: z.string().optional(),
  contacto_cargo: z.string().optional(),
  contacto_telefono: z.string().optional(),
  contacto_email: z.string().email('Email inválido').optional().or(z.literal('')),
  origen: z.enum(['cold', 'web', 'recomendacion', 'contacto_previo', 'otro']).optional(),
  notas: z.string().optional(),
})

type Form = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Llamado tras crear el lead, recibe el id de la oportunidad creada */
  onCreated?: (oportunidadId: string) => void
}

export default function NuevoLeadModal({ open, onOpenChange, onCreated }: Props) {
  const [extraOpen, setExtraOpen] = useState(false)
  const crearLead = useCrearLead()

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      empresa_nombre: '',
      empresa_telefono: '',
      empresa_nif: '',
      empresa_email: '',
      empresa_ciudad: '',
      empresa_segmento: 'comercial',
      contacto_nombre: '',
      contacto_cargo: '',
      contacto_telefono: '',
      contacto_email: '',
      origen: 'cold',
      notas: '',
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    const input: CrearLeadInput = {
      empresa_nombre: values.empresa_nombre.trim(),
      empresa_telefono: values.empresa_telefono.trim(),
      empresa_nif: values.empresa_nif?.trim() || undefined,
      empresa_email: values.empresa_email?.trim() || undefined,
      empresa_ciudad: values.empresa_ciudad?.trim() || undefined,
      empresa_segmento: values.empresa_segmento,
      contacto_nombre: values.contacto_nombre?.trim() || undefined,
      contacto_cargo: values.contacto_cargo?.trim() || undefined,
      contacto_telefono: values.contacto_telefono?.trim() || undefined,
      contacto_email: values.contacto_email?.trim() || undefined,
      origen: values.origen,
      notas: values.notas?.trim() || undefined,
    }
    try {
      const oportunidadId = await crearLead.mutateAsync(input)
      toast.success('Lead creado', {
        description: `${input.empresa_nombre} aparecerá en "Por llamar".`,
      })
      form.reset()
      setExtraOpen(false)
      onOpenChange(false)
      onCreated?.(oportunidadId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      toast.error('No se pudo crear el lead', { description: msg })
    }
  })

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Nuevo lead</DialogTitle>
          <DialogDescription>
            Datos mínimos para empezar. Puedes completar el resto después desde el detalle del caso.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Bloque obligatorio */}
          <section className="space-y-3">
            <div>
              <Label htmlFor="empresa_nombre">Empresa <span className="text-red-500">*</span></Label>
              <Input
                id="empresa_nombre"
                placeholder="Razón social"
                {...form.register('empresa_nombre')}
                aria-invalid={!!errors.empresa_nombre}
              />
              {errors.empresa_nombre && (
                <p className="text-xs text-red-600 mt-0.5">{errors.empresa_nombre.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="empresa_telefono">Teléfono <span className="text-red-500">*</span></Label>
                <Input
                  id="empresa_telefono"
                  placeholder="+34 600 00 00 00"
                  {...form.register('empresa_telefono')}
                  aria-invalid={!!errors.empresa_telefono}
                />
                {errors.empresa_telefono && (
                  <p className="text-xs text-red-600 mt-0.5">{errors.empresa_telefono.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="empresa_nif">NIF/CIF</Label>
                <Input id="empresa_nif" placeholder="B12345678" {...form.register('empresa_nif')} />
              </div>
            </div>

            <div>
              <Label htmlFor="contacto_nombre">Contacto</Label>
              <Input
                id="contacto_nombre"
                placeholder="Persona con la que hablas"
                {...form.register('contacto_nombre')}
              />
            </div>
          </section>

          {/* Bloque expandible */}
          <button
            type="button"
            onClick={() => setExtraOpen(o => !o)}
            className="text-sm text-valere-blue-dark hover:underline"
          >
            {extraOpen ? '− Ocultar' : '+ Datos adicionales'}
          </button>

          {extraOpen && (
            <section className="space-y-3 rounded-lg bg-slate-50 px-3 py-3 border border-slate-100">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="empresa_email">Email empresa</Label>
                  <Input id="empresa_email" type="email" placeholder="info@..." {...form.register('empresa_email')} />
                  {errors.empresa_email && <p className="text-xs text-red-600 mt-0.5">{errors.empresa_email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="empresa_ciudad">Ciudad</Label>
                  <Input id="empresa_ciudad" placeholder="Madrid" {...form.register('empresa_ciudad')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="empresa_segmento">Segmento</Label>
                  <Select
                    value={form.watch('empresa_segmento') ?? 'comercial'}
                    onValueChange={v => form.setValue('empresa_segmento', (v ?? 'comercial') as Form['empresa_segmento'])}
                  >
                    <SelectTrigger id="empresa_segmento"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="industrial">Industrial</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="servicios">Servicios</SelectItem>
                      <SelectItem value="agricola">Agrícola</SelectItem>
                      <SelectItem value="residencial_colectivo">Residencial colectivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="origen">Origen</Label>
                  <Select
                    value={form.watch('origen') ?? 'cold'}
                    onValueChange={v => form.setValue('origen', (v ?? 'cold') as Form['origen'])}
                  >
                    <SelectTrigger id="origen"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cold">Base fría</SelectItem>
                      <SelectItem value="web">Web</SelectItem>
                      <SelectItem value="recomendacion">Recomendación</SelectItem>
                      <SelectItem value="contacto_previo">Contacto previo</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="contacto_cargo">Cargo del contacto</Label>
                  <Input id="contacto_cargo" placeholder="Director, Gerente..." {...form.register('contacto_cargo')} />
                </div>
                <div>
                  <Label htmlFor="contacto_telefono">Teléfono contacto</Label>
                  <Input id="contacto_telefono" {...form.register('contacto_telefono')} />
                </div>
              </div>

              <div>
                <Label htmlFor="contacto_email">Email contacto</Label>
                <Input id="contacto_email" type="email" {...form.register('contacto_email')} />
                {errors.contacto_email && <p className="text-xs text-red-600 mt-0.5">{errors.contacto_email.message}</p>}
              </div>

              <div>
                <Label htmlFor="notas">Notas iniciales</Label>
                <Textarea
                  id="notas"
                  rows={3}
                  placeholder="Contexto, referencia, etc."
                  {...form.register('notas')}
                />
              </div>
            </section>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crearLead.isPending}>
              {crearLead.isPending ? 'Creando...' : 'Crear lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
