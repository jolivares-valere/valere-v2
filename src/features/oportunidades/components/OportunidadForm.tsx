import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../core/supabase/client'
import type { Oportunidad, OportunidadInsert } from '../../../core/types/entities'

const TIPOS = ['nueva_venta', 'renovacion', 'ampliacion', 'recuperacion'] as const
const ETAPAS = ['prospecto', 'contactado', 'analisis', 'propuesta_enviada', 'negociacion', 'ganada', 'perdida'] as const

const optNum = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
  z.number().nullable(),
)

const schema = z.object({
  empresa_id: z.string().uuid('Empresa obligatoria'),
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  tipo: z.enum(TIPOS),
  etapa: z.enum(ETAPAS),
  probabilidad_pct: optNum.refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 100), 'Entre 0 y 100'),
  valor_estimado_eur: optNum.refine((v) => v === null || v >= 0, 'Importe inválido'),
  fecha_cierre_prevista: z.string().optional().transform((v) => v || null),
  notas: z.string().optional().transform((v) => v || null),
})

export type OportunidadFormValues = z.input<typeof schema>

interface Props {
  defaultValues?: Partial<Oportunidad>
  onSubmit: (values: OportunidadInsert) => Promise<void> | void
  onCancel?: () => void
  submitting?: boolean
}

export default function OportunidadForm({ defaultValues, onSubmit, onCancel, submitting }: Props) {
  const empresas = useQuery({
    queryKey: ['empresas', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas').select('id, nombre').is('deleted_at', null).order('nombre')
      if (error) throw error
      return (data ?? []) as { id: string; nombre: string }[]
    },
  })

  const form = useForm<OportunidadFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      empresa_id: defaultValues?.empresa_id ?? '',
      nombre: defaultValues?.nombre ?? '',
      tipo: defaultValues?.tipo ?? 'nueva_venta',
      etapa: defaultValues?.etapa ?? 'prospecto',
      probabilidad_pct: defaultValues?.probabilidad_pct?.toString() ?? '',
      valor_estimado_eur: defaultValues?.valor_estimado_eur?.toString() ?? '',
      fecha_cierre_prevista: defaultValues?.fecha_cierre_prevista ?? '',
      notas: defaultValues?.notas ?? '',
    },
  })

  const handle = form.handleSubmit(async (values) => {
    const v = values as unknown as {
      empresa_id: string
      nombre: string
      tipo: typeof TIPOS[number]
      etapa: typeof ETAPAS[number]
      probabilidad_pct: number | null
      valor_estimado_eur: number | null
      fecha_cierre_prevista: string | null
      notas: string | null
    }
    const insert: OportunidadInsert = {
      empresa_id: v.empresa_id,
      contrato_origen_id: defaultValues?.contrato_origen_id ?? null,
      comercial_id: defaultValues?.comercial_id ?? null,
      tipo: v.tipo,
      nombre: v.nombre,
      etapa: v.etapa,
      probabilidad_pct: v.probabilidad_pct ?? 20,
      valor_estimado_eur: v.valor_estimado_eur,
      fecha_cierre_prevista: v.fecha_cierre_prevista,
      motivo_perdida: defaultValues?.motivo_perdida ?? null,
      notas: v.notas,
      tags: defaultValues?.tags ?? [],
      external_id: defaultValues?.external_id ?? null,
      created_by: defaultValues?.created_by ?? null,
    }
    await onSubmit(insert)
  })

  const field = (name: keyof OportunidadFormValues, label: string, type = 'text') => (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input type={type} {...form.register(name)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none" />
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
          <select {...form.register('empresa_id')} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">— Selecciona empresa —</option>
            {empresas.data?.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          {form.formState.errors.empresa_id && (
            <span className="mt-1 block text-xs text-red-600">{String(form.formState.errors.empresa_id?.message)}</span>
          )}
        </label>
        {field('nombre', 'Nombre *')}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Tipo *</span>
          <select {...form.register('tipo')} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="nueva_venta">Nueva venta</option>
            <option value="renovacion">Renovación</option>
            <option value="ampliacion">Ampliación</option>
            <option value="recuperacion">Recuperación</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Etapa *</span>
          <select {...form.register('etapa')} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="prospecto">Prospecto</option>
            <option value="contactado">Contactado</option>
            <option value="analisis">Análisis</option>
            <option value="propuesta_enviada">Propuesta enviada</option>
            <option value="negociacion">Negociación</option>
            <option value="ganada">Ganada</option>
            <option value="perdida">Perdida</option>
          </select>
        </label>
        {field('probabilidad_pct', 'Probabilidad (%)', 'number')}
        {field('valor_estimado_eur', 'Valor estimado (€)', 'number')}
        {field('fecha_cierre_prevista', 'Fecha cierre prevista', 'date')}
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Notas</span>
        <textarea {...form.register('notas')} rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
        )}
        <button type="submit" disabled={submitting} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60">
          {submitting ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}