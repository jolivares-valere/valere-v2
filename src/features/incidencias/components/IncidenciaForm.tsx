import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEmpresas } from '../../empresas/api'
import type {
  IncidenciaInsert,
  TipoIncidencia,
  EstadoIncidencia,
  PrioridadIncidencia,
} from '../../../core/types/entities'

const TIPOS: { value: TipoIncidencia; label: string }[] = [
  { value: 'facturacion', label: 'Facturación' },
  { value: 'cambio_comercializadora', label: 'Cambio de comercializadora' },
  { value: 'corte_suministro', label: 'Corte de suministro' },
  { value: 'potencia', label: 'Potencia' },
  { value: 'acceso_red', label: 'Acceso a red' },
  { value: 'otro', label: 'Otro' },
]

const ESTADOS: { value: EstadoIncidencia; label: string }[] = [
  { value: 'abierta', label: 'Abierta' },
  { value: 'en_gestion', label: 'En gestión' },
  { value: 'pendiente_cliente', label: 'Pendiente cliente' },
  { value: 'pendiente_comercializadora', label: 'Pendiente comercializadora' },
  { value: 'resuelta', label: 'Resuelta' },
  { value: 'cerrada', label: 'Cerrada' },
]

const PRIORIDADES: { value: PrioridadIncidencia; label: string }[] = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
]

const schema = z.object({
  empresa_id: z.string().uuid('Selecciona una empresa'),
  contrato_id: z.string().uuid().nullable().optional(),
  cups: z.string().nullable().optional(),
  titulo: z.string().min(1, 'Título requerido'),
  descripcion: z.string().nullable().optional(),
  tipo: z.enum(['facturacion', 'cambio_comercializadora', 'corte_suministro', 'potencia', 'acceso_red', 'otro']),
  estado: z.enum(['abierta', 'en_gestion', 'pendiente_cliente', 'pendiente_comercializadora', 'resuelta', 'cerrada']),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']),
  fecha_limite: z.string().nullable().optional(),
  importe_reclamado: z.coerce.number().nullable().optional(),
  importe_recuperado: z.coerce.number().nullable().optional(),
  notas_resolucion: z.string().nullable().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  defaultValues?: Partial<FormValues>
  onSubmit: (values: IncidenciaInsert) => Promise<void> | void
  onCancel?: () => void
  submitting?: boolean
}

export default function IncidenciaForm({ defaultValues, onSubmit, onCancel, submitting }: Props) {
  const empresas = useEmpresas({ pageSize: 500 })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo: 'otro',
      estado: 'abierta',
      prioridad: 'media',
      ...defaultValues,
    },
  })

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onSubmit({
          ...values,
          contrato_id: values.contrato_id || null,
          cups: values.cups || null,
          descripcion: values.descripcion || null,
          fecha_limite: values.fecha_limite || null,
          importe_reclamado: values.importe_reclamado ?? null,
          importe_recuperado: values.importe_recuperado ?? null,
          notas_resolucion: values.notas_resolucion || null,
        } as IncidenciaInsert)
      })}
      className="space-y-4"
    >
      <div>
        <label className="block text-xs font-medium text-slate-600">Empresa *</label>
        <select
          {...register('empresa_id')}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">— Seleccionar —</option>
          {(empresas.data?.data ?? []).map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
        {errors.empresa_id && <p className="mt-1 text-xs text-red-600">{errors.empresa_id.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600">Título *</label>
        <input
          {...register('titulo')}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        {errors.titulo && <p className="mt-1 text-xs text-red-600">{errors.titulo.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600">Descripción</label>
        <textarea
          {...register('descripcion')}
          rows={3}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Tipo</label>
          <select {...register('tipo')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">CUPS</label>
          <input
            {...register('cups')}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
            placeholder="ES0021..."
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Fecha límite</label>
          <input
            type="date"
            {...register('fecha_limite')}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Importe reclamado (€)</label>
          <input
            type="number"
            step="0.01"
            {...register('importe_reclamado')}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Importe recuperado (€)</label>
          <input
            type="number"
            step="0.01"
            {...register('importe_recuperado')}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600">Notas de resolución</label>
        <textarea
          {...register('notas_resolucion')}
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
