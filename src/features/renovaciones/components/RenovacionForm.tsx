import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEmpresas } from '../../empresas/api'
import type { RenovacionInsert, EstadoRenovacion, PrioridadRenovacion } from '../../../core/types/entities'

const ESTADOS: { value: EstadoRenovacion; label: string }[] = [
  { value: 'detectada', label: 'Detectada' },
  { value: 'contactado', label: 'Contactado' },
  { value: 'oferta_enviada', label: 'Oferta enviada' },
  { value: 'negociacion', label: 'Negociación' },
  { value: 'renovado', label: 'Renovado' },
  { value: 'perdido', label: 'Perdido' },
]

const PRIORIDADES: { value: PrioridadRenovacion; label: string }[] = [
  { value: 'critica', label: 'Crítica' },
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
  { value: 'ok', label: 'OK' },
]

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const schema = z.object({
  contrato_id: z.string().uuid('Selecciona un contrato'),
  empresa_id: z.string().uuid('Selecciona una empresa'),
  estado: z.enum(['detectada', 'contactado', 'oferta_enviada', 'negociacion', 'renovado', 'perdido']),
  prioridad: z.enum(['critica', 'alta', 'media', 'baja', 'ok']),
  fecha_vencimiento_contrato: z.string().nullable().optional(),
  motivo_perdida: z.string().nullable().optional(),
  notas: z.string().nullable().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  defaultValues?: Partial<FormValues>
  onSubmit: (values: RenovacionInsert) => Promise<void> | void
  onCancel?: () => void
  submitting?: boolean
}

export default function RenovacionForm({ defaultValues, onSubmit, onCancel, submitting }: Props) {
  const empresas = useEmpresas({ pageSize: 1000 })
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      estado: 'detectada',
      prioridad: 'media',
      ...defaultValues,
    },
  })

  const estadoWatched = watch('estado')
  const empresaSeleccionada = watch('empresa_id')

  const empresasVisibles = useMemo(() => {
    const todas = [...(empresas.data?.data ?? [])].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
    )
    const q = normalizar(filtroEmpresa.trim())
    if (!q) return todas
    // La empresa ya seleccionada se mantiene visible aunque no case con el filtro,
    // para que el <select> no pierda su valor.
    return todas.filter((e) => normalizar(e.nombre).includes(q) || e.id === empresaSeleccionada)
  }, [empresas.data, filtroEmpresa, empresaSeleccionada])

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onSubmit({
          ...values,
          fecha_deteccion: new Date().toISOString(),
          fecha_vencimiento_contrato: values.fecha_vencimiento_contrato || null,
          motivo_perdida: values.motivo_perdida || null,
          nuevo_contrato_id: null,
          asignado_a: null,
          notas: values.notas || null,
        } as unknown as RenovacionInsert)
      })}
      className="space-y-4"
    >
      <div>
        <label className="block text-xs font-medium text-slate-600">Empresa *</label>
        <input
          type="text"
          value={filtroEmpresa}
          onChange={(e) => setFiltroEmpresa(e.target.value)}
          placeholder="Escribe para filtrar empresas…"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          aria-label="Filtrar empresas"
        />
        <select
          {...register('empresa_id')}
          className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          size={filtroEmpresa.trim() ? Math.min(Math.max(empresasVisibles.length, 2), 6) : undefined}
        >
          <option value="">— Seleccionar —</option>
          {empresasVisibles.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
        {filtroEmpresa.trim() && (
          <p className="mt-1 text-xs text-slate-400">
            {empresasVisibles.length} empresa{empresasVisibles.length === 1 ? '' : 's'} coincide{empresasVisibles.length === 1 ? '' : 'n'}
          </p>
        )}
        {errors.empresa_id && <p className="mt-1 text-xs text-red-600">{errors.empresa_id.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600">ID Contrato *</label>
        <input
          {...register('contrato_id')}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
          placeholder="UUID del contrato"
        />
        {errors.contrato_id && <p className="mt-1 text-xs text-red-600">{errors.contrato_id.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Estado</label>
          <select {...register('estado')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
            {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Prioridad</label>
          <select {...register('prioridad')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
            {PRIORIDADES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600">Fecha vencimiento contrato</label>
        <input
          type="date"
          {...register('fecha_vencimiento_contrato')}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {estadoWatched === 'perdido' && (
        <div>
          <label className="block text-xs font-medium text-slate-600">Motivo de pérdida</label>
          <textarea
            {...register('motivo_perdida')}
            rows={2}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-600">Notas</label>
        <textarea
          {...register('notas')}
          rows={2}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
