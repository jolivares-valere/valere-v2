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
import { useCrearLead, type CrearLeadInput, type ContactoInput, type FuenteVencimiento } from '../api'
import ContactosForm from './ContactosForm'
import VencimientoContratoForm from './VencimientoContratoForm'

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
  const [contactos, setContactos] = useState<ContactoInput[]>([
    { nombre: '', cargo: '', telefono: '', email: '', es_principal: true },
  ])
  const [vencFecha, setVencFecha] = useState<string>('')
  const [vencFuente, setVencFuente] = useState<FuenteVencimiento | ''>('')
  const [vencNotas, setVencNotas] = useState<string>('')
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
      contactos: contactos
        .filter(c => !c._eliminar)
        .map(c => ({
          nombre: c.nombre?.trim() || undefined,
          cargo: c.cargo?.trim() || undefined,
          telefono: c.telefono?.trim() || undefined,
          email: c.email?.trim() || undefined,
          es_principal: c.es_principal ?? false,
        })),
      origen: values.origen,
      notas: values.notas?.trim() || undefined,
      fecha_vencimiento_contrato: vencFecha || undefined,
      fuente_vencimiento: vencFuente || undefined,
      notas_vencimiento: vencNotas?.trim() || undefined,
    }
    try {
      const oportunidadId = await crearLead.mutateAsync(input)
      toast.success('Lead creado', {
        description: `${input.empresa_nombre} aparecerá en "Por llamar".`,
      })
      form.reset()
      setContactos([{ nombre: '', cargo: '', telefono: '', email: '', es_principal: true }])
      setVencFecha('')
      setVencFuente('')
      setVencNotas('')
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
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>Nuevo lead</DialogTitle>
          <DialogDescription>
            Datos mínimos para empezar. Puedes completar el resto después desde el detalle del caso.
          </DialogDescription>
        </DialogHeader>

        <form id="nuevo-lead-form" onSubmit={onSubmit} className="space-y-4 overflow-y-auto px-6 pb-2 flex-1">
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
          </section>

          {/* Contactos (lista dinámica con rol y principal) */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">Contactos</h3>
            <p className="text-xs text-slate-500">
              Añade todos los interlocutores que conozcas (Compras, Mantenimiento, Gerencia…). Marca uno como principal con la estrella.
            </p>
            <ContactosForm contactos={contactos} onChange={setContactos} idPrefix="nl" />
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

              <div>
                <Label htmlFor="notas">Notas iniciales</Label>
                <Textarea
                  id="notas"
                  rows={3}
                  placeholder="Contexto, referencia, etc."
                  {...form.register('notas')}
                />
              </div>

              <div className="border-t border-slate-200 pt-3">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                  Vencimiento contrato actual del prospecto
                </h4>
                <p className="text-[11px] text-slate-500 mb-2">
                  Si el cliente ya te ha dicho cuándo le vence el contrato actual, anótalo. Activa los semáforos de seguimiento (90/60/30 días).
                </p>
                <VencimientoContratoForm
                  fecha={vencFecha}
                  fuente={vencFuente}
                  notas={vencNotas}
                  onChange={({ fecha, fuente, notas }) => {
                    setVencFecha(fecha)
                    setVencFuente(fuente)
                    setVencNotas(notas)
                  }}
                  idPrefix="nl_venc"
                />
              </div>
            </section>
          )}
        </form>

        <DialogFooter className="px-6 py-4 border-t border-slate-200 bg-white shrink-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="nuevo-lead-form" disabled={crearLead.isPending}>
            {crearLead.isPending ? 'Creando...' : 'Crear lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
