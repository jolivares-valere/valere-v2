import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Contacto, ContactoInsert } from '../../../core/types/entities'

const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  apellidos: z.string().optional().transform((v) => v || null),
  email: z.string().email('Email inválido').optional().or(z.literal('')).transform((v) => v || null),
  telefono: z.string().optional().transform((v) => v || null),
  movil: z.string().optional().transform((v) => v || null),
  cargo: z.string().optional().transform((v) => v || null),
  dni: z.string().optional().transform((v) => v || null),
  departamento: z.string().optional().transform((v) => v || null),
  es_decisor: z.boolean().default(false),
  es_firmante: z.boolean().default(false),
  notas: z.string().optional().transform((v) => v || null),
})

export type ContactoFormValues = z.input<typeof schema>

interface Props {
  empresaId: string
  defaultValues?: Partial<Contacto>
  onSubmit: (values: ContactoInsert) => Promise<void> | void
  onCancel?: () => void
  submitting?: boolean
}

export default function ContactoForm({ empresaId, defaultValues, onSubmit, onCancel, submitting }: Props) {
  const form = useForm<ContactoFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: defaultValues?.nombre ?? '',
      apellidos: defaultValues?.apellidos ?? '',
      email: defaultValues?.email ?? '',
      telefono: defaultValues?.telefono ?? '',
      movil: defaultValues?.movil ?? '',
      cargo: defaultValues?.cargo ?? '',
      dni: (defaultValues as { dni?: string | null })?.dni ?? '',
      departamento: defaultValues?.departamento ?? '',
      es_decisor: defaultValues?.es_decisor ?? false,
      es_firmante: defaultValues?.es_firmante ?? false,
      notas: defaultValues?.notas ?? '',
    },
  })

  const handle = form.handleSubmit(async (values) => {
    const insert: ContactoInsert = {
      empresa_id: empresaId,
      nombre: values.nombre,
      apellidos: (values as unknown as { apellidos: string | null }).apellidos ?? null,
      email: (values as unknown as { email: string | null }).email ?? null,
      telefono: (values as unknown as { telefono: string | null }).telefono ?? null,
      movil: (values as unknown as { movil: string | null }).movil ?? null,
      cargo: (values as unknown as { cargo: string | null }).cargo ?? null,
      dni: (values as unknown as { dni: string | null }).dni ?? null,
      departamento: (values as unknown as { departamento: string | null }).departamento ?? null,
      es_decisor: values.es_decisor ?? false,
      es_firmante: values.es_firmante ?? false,
      notas: (values as unknown as { notas: string | null }).notas ?? null,
      tags: defaultValues?.tags ?? [],
      created_by: defaultValues?.created_by ?? null,
    }
    await onSubmit(insert)
  })

  const input = (name: keyof ContactoFormValues, label: string, type = 'text') => (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        {...form.register(name)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
      />
      {form.formState.errors[name] && (
        <span className="mt-1 block text-xs text-red-600">
          {String(form.formState.errors[name]?.message)}
        </span>
      )}
    </label>
  )

  return (
    <form onSubmit={handle} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {input('nombre', 'Nombre *')}
        {input('apellidos', 'Apellidos')}
        {input('email', 'Email', 'email')}
        {input('telefono', 'Teléfono')}
        {input('movil', 'Móvil')}
        {input('cargo', 'Cargo')}
        {input('dni', 'DNI / NIE')}
        {input('departamento', 'Departamento')}
      </div>
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register('es_decisor')} />
          Es decisor
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register('es_firmante')} />
          Es firmante
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Notas</span>
        <textarea {...form.register('notas')} rows={3} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
        )}
        <button type="submit" disabled={submitting} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60">
          {submitting ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
