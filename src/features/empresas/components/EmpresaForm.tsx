import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Empresa, EmpresaInsert } from '../../../core/types/entities'
import { normalizarNIF } from '../../../core/utils/energy'

const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  nif: z.string().optional().transform((v) => (v ? normalizarNIF(v) : null)),
  tipo: z.enum(['empresa', 'autonomo', 'comunidad_propietarios', 'cooperativa', 'asociacion']).nullable().optional().or(z.literal('')).transform((v) => v || null),
  segmento: z.enum(['industrial', 'comercial', 'servicios', 'agricola', 'residencial_colectivo']).nullable().optional().or(z.literal('')).transform((v) => v || null),
  email_principal: z.string().email('Email inválido').optional().or(z.literal('')).transform((v) => v || null),
  telefono_principal: z.string().optional().transform((v) => v || null),
  web: z.string().optional().transform((v) => v || null),
  direccion: z.string().optional().transform((v) => v || null),
  cp: z.string().optional().transform((v) => v || null),
  ciudad: z.string().optional().transform((v) => v || null),
  provincia: z.string().optional().transform((v) => v || null),
  notas: z.string().optional().transform((v) => v || null),
})

export type EmpresaFormValues = z.input<typeof schema>

interface Props {
  defaultValues?: Partial<Empresa>
  onSubmit: (values: EmpresaInsert) => Promise<void> | void
  onCancel?: () => void
  submitting?: boolean
}

export default function EmpresaForm({ defaultValues, onSubmit, onCancel, submitting }: Props) {
  const form = useForm<EmpresaFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: defaultValues?.nombre ?? '',
      nif: defaultValues?.nif ?? '',
      tipo: defaultValues?.tipo ?? undefined,
      segmento: defaultValues?.segmento ?? undefined,
      email_principal: defaultValues?.email_principal ?? '',
      telefono_principal: defaultValues?.telefono_principal ?? '',
      web: defaultValues?.web ?? '',
      direccion: defaultValues?.direccion ?? '',
      cp: defaultValues?.cp ?? '',
      ciudad: defaultValues?.ciudad ?? '',
      provincia: defaultValues?.provincia ?? '',
      notas: defaultValues?.notas ?? '',
    },
  })

  const handle = form.handleSubmit(async (values) => {
    const insert: EmpresaInsert = {
      nombre: values.nombre,
      nif: (values as unknown as { nif: string | null }).nif ?? null,
      tipo: (values.tipo || null) as EmpresaInsert['tipo'],
      segmento: (values.segmento || null) as EmpresaInsert['segmento'],
      email_principal: (values as unknown as { email_principal: string | null }).email_principal ?? null,
      telefono_principal: (values as unknown as { telefono_principal: string | null }).telefono_principal ?? null,
      web: (values as unknown as { web: string | null }).web ?? null,
      direccion: (values as unknown as { direccion: string | null }).direccion ?? null,
      cp: (values as unknown as { cp: string | null }).cp ?? null,
      ciudad: (values as unknown as { ciudad: string | null }).ciudad ?? null,
      provincia: (values as unknown as { provincia: string | null }).provincia ?? null,
      pais: defaultValues?.pais ?? 'ES',
      comercial_id: defaultValues?.comercial_id ?? null,
      notas: (values as unknown as { notas: string | null }).notas ?? null,
      tags: defaultValues?.tags ?? [],
      external_id: defaultValues?.external_id ?? null,
      created_by: defaultValues?.created_by ?? null,
      updated_by: defaultValues?.updated_by ?? null,
    }
    await onSubmit(insert)
  })

  const field = (name: keyof EmpresaFormValues, label: string, type = 'text') => (
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
        {field('nombre', 'Nombre *')}
        {field('nif', 'NIF')}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Tipo</span>
          <select {...form.register('tipo')} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            <option value="empresa">Empresa</option>
            <option value="autonomo">Autónomo</option>
            <option value="comunidad_propietarios">Comunidad propietarios</option>
            <option value="cooperativa">Cooperativa</option>
            <option value="asociacion">Asociación</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Segmento</span>
          <select {...form.register('segmento')} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            <option value="industrial">Industrial</option>
            <option value="comercial">Comercial</option>
            <option value="servicios">Servicios</option>
            <option value="agricola">Agrícola</option>
            <option value="residencial_colectivo">Residencial colectivo</option>
          </select>
        </label>
        {field('email_principal', 'Email principal', 'email')}
        {field('telefono_principal', 'Teléfono')}
        {field('web', 'Web')}
        {field('direccion', 'Dirección')}
        {field('cp', 'CP')}
        {field('ciudad', 'Ciudad')}
        {field('provincia', 'Provincia')}
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