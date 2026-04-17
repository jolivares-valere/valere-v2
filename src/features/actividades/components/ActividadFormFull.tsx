import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../core/supabase/client'
import { useAuth } from '../../../core/hooks/useAuth'
import { useContactosPorEmpresa } from '../../contactos/api'
import type {
  Actividad,
  ActividadInsert,
  EntidadTipo,
  TipoActividad,
} from '../../../core/types/entities'

const TIPOS: TipoActividad[] = ['nota', 'llamada', 'email', 'reunion', 'tarea', 'whatsapp', 'visita', 'documento']
const RESULTADOS = ['positivo', 'neutral', 'negativo', 'sin_respuesta'] as const

const optNum = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
  z.number().nullable(),
)

const schema = z.object({
  tipo: z.enum(['nota', 'llamada', 'email', 'reunion', 'tarea', 'whatsapp', 'visita', 'documento']),
  titulo: z.string().min(2, 'Mínimo 2 caracteres').max(200),
  descripcion: z.string().optional().transform((v) => v || null),
  fecha_actividad: z.string().min(1, 'Fecha obligatoria'),
  duracion_min: optNum.refine((v) => v === null || v >= 0, 'Duración inválida'),
  resultado: z.enum(['positivo', 'neutral', 'negativo', 'sin_respuesta']).or(z.literal('')).transform((v) => v || null),
  estado_tarea: z.enum(['pendiente', 'completada', 'cancelada']).or(z.literal('')).transform((v) => v || null),
  fecha_vencimiento: z.string().optional().transform((v) => v || null),
  entidad_tipo: z.enum(['empresa', 'contacto', 'contrato', 'oportunidad']),
  empresa_id: z.string().uuid('Empresa obligatoria'),
  entidad_id: z.string().uuid('Entidad obligatoria'),
  asignado_a: z.string().uuid().or(z.literal('')).transform((v) => v || null),
  privada: z.boolean(),
})

export type ActividadFormValues = z.input<typeof schema>

interface Props {
  defaultValues?: Partial<Actividad> & { empresa_id?: string | null }
  lockedEntidad?: { tipo: EntidadTipo; id: string; empresaId?: string }
  onSubmit: (values: ActividadInsert) => Promise<void> | void
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

function useOportunidadesPorEmpresa(empresaId: string | null | undefined) {
  return useQuery({
    queryKey: ['oportunidades', 'por-empresa-options', empresaId],
    enabled: Boolean(empresaId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('oportunidades')
        .select('id, nombre, etapa')
        .eq('empresa_id', empresaId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as { id: string; nombre: string; etapa: string }[]
    },
  })
}

function useContratosPorEmpresa(empresaId: string | null | undefined) {
  return useQuery({
    queryKey: ['contratos', 'por-empresa-options', empresaId],
    enabled: Boolean(empresaId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contratos')
        .select('id, numero_contrato, compania')
        .eq('empresa_id', empresaId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as { id: string; numero_contrato: string | null; compania: string }[]
    },
  })
}

function useUsuariosOptions() {
  return useQuery({
    queryKey: ['users_profile', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users_profile')
        .select('id, nombre_completo')
        .eq('activo', true)
        .order('nombre_completo')
      if (error) throw error
      return (data ?? []) as { id: string; nombre_completo: string }[]
    },
  })
}

function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ActividadFormFull({ defaultValues, lockedEntidad, onSubmit, onCancel, submitting }: Props) {
  const { user } = useAuth()
  const empresas = useEmpresasOptions()
  const usuarios = useUsuariosOptions()

  const form = useForm<ActividadFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo: (defaultValues?.tipo as TipoActividad | undefined) ?? 'nota',
      titulo: defaultValues?.titulo ?? '',
      descripcion: defaultValues?.descripcion ?? '',
      fecha_actividad: toDateTimeLocal(defaultValues?.fecha_actividad) || toDateTimeLocal(new Date().toISOString()),
      duracion_min: defaultValues?.duracion_min?.toString() ?? '',
      resultado: (defaultValues?.resultado as typeof RESULTADOS[number] | undefined) ?? '',
      estado_tarea: defaultValues?.estado_tarea ?? '',
      fecha_vencimiento: toDateTimeLocal(defaultValues?.fecha_vencimiento),
      entidad_tipo: lockedEntidad?.tipo ?? (defaultValues?.entidad_tipo as EntidadTipo | undefined) ?? 'empresa',
      empresa_id: lockedEntidad?.empresaId ?? defaultValues?.empresa_id ?? (lockedEntidad?.tipo === 'empresa' ? lockedEntidad.id : ''),
      entidad_id: lockedEntidad?.id ?? defaultValues?.entidad_id ?? (defaultValues?.entidad_tipo === 'empresa' ? defaultValues?.entidad_id ?? '' : ''),
      asignado_a: defaultValues?.asignado_a ?? '',
      privada: defaultValues?.privada ?? false,
    },
  })

  const tipoWatched = form.watch('tipo')
  const entidadTipoWatched = form.watch('entidad_tipo')
  const empresaIdWatched = form.watch('empresa_id')

  const contactos = useContactosPorEmpresa(empresaIdWatched)
  const oportunidades = useOportunidadesPorEmpresa(empresaIdWatched)
  const contratos = useContratosPorEmpresa(empresaIdWatched)

  const isTarea = tipoWatched === 'tarea'
  const isReunionOLlamada = tipoWatched === 'reunion' || tipoWatched === 'llamada'
  const entidadLocked = Boolean(lockedEntidad)

  const secondLevelOptions = useMemo(() => {
    if (entidadTipoWatched === 'empresa') return null
    if (entidadTipoWatched === 'contacto') return contactos.data?.map((c) => ({
      id: c.id,
      label: `${c.nombre}${c.apellidos ? ' ' + c.apellidos : ''}${c.cargo ? ' — ' + c.cargo : ''}`,
    })) ?? []
    if (entidadTipoWatched === 'oportunidad') return oportunidades.data?.map((o) => ({
      id: o.id,
      label: `${o.nombre} · ${o.etapa}`,
    })) ?? []
    if (entidadTipoWatched === 'contrato') return contratos.data?.map((c) => ({
      id: c.id,
      label: `${c.compania}${c.numero_contrato ? ' · ' + c.numero_contrato : ''}`,
    })) ?? []
    return []
  }, [entidadTipoWatched, contactos.data, oportunidades.data, contratos.data])

  useEffect(() => {
    if (empresas.data && defaultValues && !lockedEntidad) {
      form.reset({
        ...form.getValues(),
        empresa_id: defaultValues.empresa_id ?? form.getValues('empresa_id') ?? '',
        entidad_id: defaultValues.entidad_id ?? '',
      })
    }
  }, [empresas.data, defaultValues?.empresa_id, defaultValues?.entidad_id])

  useEffect(() => {
    if (entidadTipoWatched === 'empresa') {
      if (empresaIdWatched && form.getValues('entidad_id') !== empresaIdWatched) {
        form.setValue('entidad_id', empresaIdWatched)
      }
    }
  }, [entidadTipoWatched, empresaIdWatched])

  const handle = form.handleSubmit(async (raw) => {
    const v = raw as unknown as {
      tipo: TipoActividad
      titulo: string
      descripcion: string | null
      fecha_actividad: string
      duracion_min: number | null
      resultado: string | null
      estado_tarea: string | null
      fecha_vencimiento: string | null
      entidad_tipo: EntidadTipo
      empresa_id: string
      entidad_id: string
      asignado_a: string | null
      privada: boolean
    }
    const esTarea = v.tipo === 'tarea'
    const insert: ActividadInsert = {
      tipo: v.tipo,
      titulo: v.titulo.trim(),
      descripcion: v.descripcion,
      fecha_actividad: new Date(v.fecha_actividad).toISOString(),
      duracion_min: v.duracion_min,
      resultado: (v.resultado as ActividadInsert['resultado']) ?? null,
      estado_tarea: esTarea
        ? ((v.estado_tarea as ActividadInsert['estado_tarea']) ?? 'pendiente')
        : null,
      fecha_vencimiento: esTarea && v.fecha_vencimiento ? new Date(v.fecha_vencimiento).toISOString() : null,
      entidad_tipo: v.entidad_tipo,
      entidad_id: v.entidad_tipo === 'empresa' ? v.empresa_id : v.entidad_id,
      usuario_id: defaultValues?.usuario_id ?? user?.id ?? null,
      asignado_a: esTarea ? (v.asignado_a ?? user?.id ?? null) : null,
      adjunto_url: defaultValues?.adjunto_url ?? null,
      adjunto_nombre: defaultValues?.adjunto_nombre ?? null,
      privada: v.privada,
    }
    await onSubmit(insert)
  })

  return (
    <form onSubmit={handle} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Tipo *</span>
          <select {...form.register('tipo')} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Fecha *</span>
          <input
            type="datetime-local"
            {...form.register('fecha_actividad')}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {form.formState.errors.fecha_actividad && (
            <span className="mt-1 block text-xs text-red-600">{String(form.formState.errors.fecha_actividad.message)}</span>
          )}
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">Título *</span>
          <input type="text" {...form.register('titulo')} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          {form.formState.errors.titulo && (
            <span className="mt-1 block text-xs text-red-600">{String(form.formState.errors.titulo.message)}</span>
          )}
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">Descripción</span>
          <textarea {...form.register('descripcion')} rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </label>

        {/* Entidad asociada */}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Asociar a *</span>
          <select
            {...form.register('entidad_tipo', {
              onChange: () => form.setValue('entidad_id', ''),
            })}
            disabled={entidadLocked}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
          >
            <option value="empresa">Empresa</option>
            <option value="contacto">Contacto</option>
            <option value="oportunidad">Oportunidad</option>
            <option value="contrato">Contrato</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Empresa *</span>
          <select
            {...form.register('empresa_id', {
              onChange: () => {
                if (entidadTipoWatched !== 'empresa') form.setValue('entidad_id', '')
              },
            })}
            disabled={entidadLocked}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
          >
            <option value="">— Selecciona empresa —</option>
            {empresas.data?.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          {form.formState.errors.empresa_id && (
            <span className="mt-1 block text-xs text-red-600">{String(form.formState.errors.empresa_id.message)}</span>
          )}
        </label>

        {entidadTipoWatched !== 'empresa' && (
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              {entidadTipoWatched === 'contacto' && 'Contacto *'}
              {entidadTipoWatched === 'oportunidad' && 'Oportunidad *'}
              {entidadTipoWatched === 'contrato' && 'Contrato *'}
            </span>
            <select
              {...form.register('entidad_id')}
              disabled={entidadLocked || !empresaIdWatched}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">— Selecciona —</option>
              {secondLevelOptions?.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
            {form.formState.errors.entidad_id && (
              <span className="mt-1 block text-xs text-red-600">{String(form.formState.errors.entidad_id.message)}</span>
            )}
            {empresaIdWatched && secondLevelOptions && secondLevelOptions.length === 0 && (
              <span className="mt-1 block text-xs text-slate-500">Esta empresa no tiene {entidadTipoWatched}s aún.</span>
            )}
          </label>
        )}

        {isReunionOLlamada && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Duración (min)</span>
            <input type="number" {...form.register('duracion_min')} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
        )}

        {isReunionOLlamada && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Resultado</span>
            <select {...form.register('resultado')} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">—</option>
              <option value="positivo">Positivo</option>
              <option value="neutral">Neutral</option>
              <option value="negativo">Negativo</option>
              <option value="sin_respuesta">Sin respuesta</option>
            </select>
          </label>
        )}

        {isTarea && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Estado tarea</span>
              <select {...form.register('estado_tarea')} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="pendiente">Pendiente</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Vence</span>
              <input type="datetime-local" {...form.register('fecha_vencimiento')} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">Asignado a</span>
              <select {...form.register('asignado_a')} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="">— Yo ({user?.nombre_completo ?? 'usuario actual'}) —</option>
                {usuarios.data?.map((u) => <option key={u.id} value={u.id}>{u.nombre_completo}</option>)}
              </select>
            </label>
          </>
        )}

        <label className="flex items-center gap-2 md:col-span-2 text-sm text-slate-700">
          <input type="checkbox" {...form.register('privada')} />
          Actividad privada (solo visible para mí)
        </label>
      </div>

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