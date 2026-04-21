import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../core/supabase/client'
import type { Contacto, ContactoInsert } from '../../../core/types/entities'

const schema = z.object({
  empresa_id: z.string().uuid('Empresa obligatoria'),
  nombre: z.string().min(1, 'Obligatorio').max(100),
  apellidos: z.string().max(255).or(z.literal('')).transform((v) => v || null),
  cargo: z.string().max(255).or(z.literal('')).transform((v) => v || null),
  departamento: z.string().max(255).or(z.literal('')).transform((v) => v || null),
  email: z.string().email('Email inválido').or(z.literal('')).transform((v) => v || null),
  telefono: z.string().max(50).or(z.literal('')).transform((v) => v || null),
  movil: z.string().max(50).or(z.literal('')).transform((v) => v || null),
  es_decisor: z.boolean(),
  es_firmante: z.boolean(),
  notas: z.string().or(z.literal('')).transform((v) => v || null),
})

export type ContactoFormValues = z.input<typeof schema>

interface Props {
  defaultValues?: Partial<Contacto>
  onSubmit: (values: ContactoInsert) => Promise<void> | void
  onCancel?: () => void
  submitting?: boolean
}

function useEmpresasOptions() {
  return useQuery({
    queryKey: ['empresas', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nombre')
        .is('deleted_at', null)
        .order('nombre')
      if (error) throw error
      return (data ?? []) as { id: string; nombre: string }[]
    },
  })
}

export default function ContactoForm({ defaultValues, onSubmit, onCancel, submitting }: Props) {
  const empresas = useEmpresasOptions()

  const form = useForm<ContactoFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      empresa_id: defaultValues?.empresa_id ?? '',
      nombre: defaultValues?.nombre ?? '',
      apellidos: defaultValues?.apellidos ?? '',
      cargo: defaultValues?.cargo ?? '',
      departamento: defaultValues?.departamento ?? '',
      email: defaultValues?.email ?? '',
      telefono: defaultValues?.telefono ?? '',
      movil: defaultValues?.movil ?? '',
      es_decisor: defaultValues?.es_decisor ?? false,
      es_firmante: defaultValues?.es_firmante ?? false,
      notas: defaultValues?.notas ?? '',
    },
  })

  useEffect(() => {
    if (empresas.data && defaultValues) {
      form.reset({
        ...form.getValues(),
        empresa_id: defaultValues.empresa_id ?? '',
      })
    }
  }, [empresas.data, defaultValues?.empresa_id])

  const handle = form.handleSubmit(async (raw) => {
    const v = raw as unknown as {
      empresa_id: string
      nombre: string
      apellidos: string | null
      cargo: string | null
      departamento: string | null
      email: string | null
      telefono: string | null
      movil: string | null
      es_decisor: boolean
      es_firmante: boolean
      notas: string | null
    }
    const insert: ContactoInsert = {
      empresa_id: v.empresa_id,
      nombre: v.nombre,
      apellidos: v.apellidos,
      cargo: v.cargo,
      departamento: v.departamento,
      email: v.email,
      telefono: v.telefono,
      movil: v.movil,
      es_decisor: v.es_decisor,
      es_firmante: v.es_firmante,
      notas: v.notas,
      tags: defaultValues?.tags ?? [],
      created_by: defaultValues?.created_by ?? null,
    }
    await onSubmit(insert)
  })

  const field = (name: keyof ContactoFormValues, label: string, type = 'text') => (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        {...form.register(name)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
      />
      {form.formState.errors[name] && (
        <span className="mt-1 block text-xs text-red-600">{String(form.formState.errors[name]?.message)}</span>
      )}
    </label>
  )

  return (
    <form onSubmit={handle} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">Empresa *</span>
          <select {...form.register('empresa_id')} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="">— Selecciona empresa —</option>
            {empresas.data?.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          {form.formState.errors.empresa_id && (
            <span className="mt-1 block text-xs text-red-600">{String(form.formState.errors.empresa_id?.message)}</span>
          )}
        </label>

        {field('nombre', 'Nombre *')}
        {field('apellidos', 'Apellidos')}
        {field('cargo', 'Cargo')}
        {field('departamento', 'Departamento')}
        {field('email', 'Email', 'email')}
        {field('telefono', 'Teléfono')}
        {field('movil', 'Móvil')}
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
          <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
        )}
        <button type="submit" disabled={submitting} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60">
          {submitting ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}