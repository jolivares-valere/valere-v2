import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../core/supabase/client'
import type { Contrato, ContratoInsert } from '../../../core/types/entities'
import { useComercializadorasCanal } from '../../comercializadoras/api'

const ESTADOS_CONTRATO = ['tramite', 'activo', 'vencido', 'incidencia', 'baja', 'cancelado', 'borrador'] as const

const schema = z.object({
  empresa_id: z.string().uuid('Empresa obligatoria'),
  comercializadora_id: z.string().uuid('Selecciona comercializadora del catálogo'),
  numero_contrato: z.string().optional().transform((v) => v || null),
  estado: z.enum(ESTADOS_CONTRATO),
  tipo_energia: z.enum(['electrica', 'gas', 'dual']).or(z.literal('')).transform((v) => v || null),
  tipo_precio: z.enum(['fijo', 'indexado', 'mixto']).or(z.literal('')).transform((v) => v || null),
  tarifa_acceso: z.string().optional().transform((v) => v || null),
  fecha_inicio: z.string().optional().transform((v) => v || null),
  fecha_fin: z.string().optional().transform((v) => v || null),
  observaciones: z.string().optional().transform((v) => v || null),
}).superRefine((v, ctx) => {
  // F1 (Julia, gate V3): un contrato ACTIVO necesita fecha de inicio;
  // en tramite puede no tenerla (depende del ATR).
  if (v.estado === 'activo' && !v.fecha_inicio) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fecha_inicio'], message: 'Un contrato activo necesita fecha de inicio; déjalo en trámite si aún no la sabes' })
  }
})

export type ContratoFormValues = z.input<typeof schema>

interface Props {
  defaultValues?: Partial<Contrato>
  onSubmit: (values: ContratoInsert) => Promise<void> | void
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

export default function ContratoForm({ defaultValues, onSubmit, onCancel, submitting }: Props) {
  const empresas = useEmpresasOptions()
  const canales = useComercializadorasCanal()

  const form = useForm<ContratoFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      empresa_id: defaultValues?.empresa_id ?? '',
      comercializadora_id: defaultValues?.comercializadora_id ?? '',
      numero_contrato: defaultValues?.numero_contrato ?? '',
      estado: (defaultValues?.estado as typeof ESTADOS_CONTRATO[number]) ?? 'tramite',
      tipo_energia: defaultValues?.tipo_energia ?? '',
      tipo_precio: defaultValues?.tipo_precio ?? '',
      tarifa_acceso: defaultValues?.tarifa_acceso ?? '',
      fecha_inicio: defaultValues?.fecha_inicio ?? '',
      fecha_fin: defaultValues?.fecha_fin ?? '',
      observaciones: defaultValues?.observaciones ?? '',
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
  // Contratos previos al catálogo (PR-3.1): resolver comercializadora por compania legacy
  useEffect(() => {
    if (canales.data && !form.getValues('comercializadora_id') && defaultValues?.compania) {
      const match = canales.data.find((c) => c.nombre_canonico === defaultValues.compania)
      if (match) form.setValue('comercializadora_id', match.id)
    }
  }, [canales.data, defaultValues?.compania])

  const handle = form.handleSubmit(async (raw) => {
    // F4: trazabilidad de altas hechas desde el modal
    const uid = (await supabase.auth.getUser()).data.user?.id ?? null
    const v = raw as unknown as {
      empresa_id: string
      comercializadora_id: string
      numero_contrato: string | null
      estado: typeof ESTADOS_CONTRATO[number]
      tipo_energia: 'electrica' | 'gas' | 'dual' | null
      tipo_precio: 'fijo' | 'indexado' | 'mixto' | null
      tarifa_acceso: string | null
      fecha_inicio: string | null
      fecha_fin: string | null
      observaciones: string | null
    }
    const insert: ContratoInsert = {
      empresa_id: v.empresa_id,
      contacto_firmante_id: defaultValues?.contacto_firmante_id ?? null,
      comercial_id: defaultValues?.comercial_id ?? null,
      numero_contrato: v.numero_contrato,
      comercializadora_id: v.comercializadora_id,
      compania: canales.data?.find((c) => c.id === v.comercializadora_id)?.nombre_canonico ?? defaultValues?.compania ?? '',
      tarifa_acceso: v.tarifa_acceso,
      tarifa_cliente: defaultValues?.tarifa_cliente ?? null,
      tipo_energia: v.tipo_energia,
      tipo_precio: v.tipo_precio,
      fecha_firma: defaultValues?.fecha_firma ?? null,
      fecha_inicio: v.fecha_inicio,
      fecha_fin: v.fecha_fin,
      duracion_meses: defaultValues?.duracion_meses ?? null,
      consumo_sips_kwh: defaultValues?.consumo_sips_kwh ?? null,
      consumo_po_kwh: defaultValues?.consumo_po_kwh ?? null,
      potencia_contratada: defaultValues?.potencia_contratada ?? null,
      comision_integra: defaultValues?.comision_integra ?? null,
      comision_comercial: defaultValues?.comision_comercial ?? null,
      comision_jefe: defaultValues?.comision_jefe ?? null,
      estado: v.estado,
      observaciones: v.observaciones,
      external_id: defaultValues?.external_id ?? null,
      created_by: defaultValues?.created_by ?? uid,
      updated_by: uid,
    }
    await onSubmit(insert)
  })

  const field = (name: keyof ContratoFormValues, label: string, type = 'text') => (
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

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Comercializadora *</span>
          <select {...form.register('comercializadora_id')} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="">— Selecciona del catálogo —</option>
            {canales.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre_canonico}{c.via === 'zoco' ? ' (vía Zoco)' : c.via === 'xentia' ? ' (vía Xentia)' : ''}
              </option>
            ))}
          </select>
          {form.formState.errors.comercializadora_id && (
            <span className="mt-1 block text-xs text-red-600">{String(form.formState.errors.comercializadora_id?.message)}</span>
          )}
        </label>
        {field('numero_contrato', 'Nº contrato')}

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Estado *</span>
          <select {...form.register('estado')} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="tramite">En trámite</option>
            <option value="activo">Activo</option>
            <option value="vencido">Vencido</option>
            <option value="incidencia">Incidencia</option>
            <option value="baja">Baja</option>
            <option value="cancelado">Cancelado</option>
            <option value="borrador">Borrador</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Tipo energía</span>
          <select {...form.register('tipo_energia')} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            <option value="electrica">Luz</option>
            <option value="gas">Gas</option>
            <option value="dual">Ambos</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Tipo precio</span>
          <select {...form.register('tipo_precio')} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            <option value="fijo">Fijo</option>
            <option value="indexado">Indexado</option>
            <option value="mixto">Mixto</option>
          </select>
        </label>

        {field('tarifa_acceso', 'Tarifa acceso')}
        {field('fecha_inicio', 'Fecha inicio', 'date')}
        {field('fecha_fin', 'Fecha fin', 'date')}
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Notas</span>
        <textarea {...form.register('observaciones')} rows={3} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
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