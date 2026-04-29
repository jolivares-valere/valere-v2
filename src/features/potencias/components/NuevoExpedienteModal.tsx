import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2 } from 'lucide-react'
import { supabase } from '@/core/supabase/client'
import { useSupabaseQuery } from '@/core/hooks/useSupabaseQuery'
import { toast } from 'sonner'
import type { Empresa, Cups } from '@/core/types/entities'

const schema = z.object({
  empresa_id: z.string().uuid('Selecciona una empresa'),
  cups_id:    z.string().uuid('Selecciona un CUPS'),
  p1_nueva:   z.coerce.number().positive('Requerido'),
  p2_nueva:   z.coerce.number().positive('Requerido'),
  p3_nueva:   z.coerce.number().nonnegative().optional(),
  notas:      z.string().optional(),
})
type FormData = z.infer<typeof schema>

// Usa tipo Cups canónico (p1_kw..p6_kw ya incluidos en entities.ts)
type CupsRow = Pick<Cups, 'id' | 'codigo_cups' | 'p1_kw' | 'p2_kw' | 'p3_kw'>

interface Props {
  onClose: () => void
  onCreated: () => void
  initialEmpresaId?: string
  initialCupsId?: string
}

export default function NuevoExpedienteModal({ onClose, onCreated, initialEmpresaId, initialCupsId }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [cupsDisponibles, setCupsDisponibles] = useState<CupsRow[]>([])

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      empresa_id: initialEmpresaId ?? '',
      cups_id: initialCupsId ?? '',
    },
  })

  const empresaId = watch('empresa_id')
  const cupsId    = watch('cups_id')

  const { data: empresas } = useSupabaseQuery<Empresa>({
    table: 'empresas',
    filters: [{ column: 'deleted_at', op: 'eq', value: null }],
    order: { column: 'nombre', ascending: true },
  })

  // Cargar CUPS al cambiar empresa
  useEffect(() => {
    if (!empresaId) { setCupsDisponibles([]); return }
    supabase
      .from('cups')
      .select('id, codigo_cups, p1_kw, p2_kw, p3_kw')
      .eq('empresa_id', empresaId)
      .is('deleted_at', null)
      .then(({ data }) => {
        const lista = (data ?? []) as CupsRow[]
        setCupsDisponibles(lista)
        // Si venimos con cups inicial y ya cargaron, aseguramos que esté seleccionado
        if (initialCupsId && lista.some(c => c.id === initialCupsId)) {
          setValue('cups_id', initialCupsId)
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId])

  const cupsSeleccionado = cupsDisponibles.find(c => c.id === cupsId)

  const onSubmit = async (form: FormData) => {
    setSubmitting(true)
    try {
      // 1. Crear expediente
      const { data: exp, error: e1 } = await supabase.from('expedientes').insert({
        empresa_id:        form.empresa_id,
        cups_id:           form.cups_id,
        anio:              new Date().getFullYear(),
        tipo_normativa:    'RDL_7_2026',
        estado:            'activo',
        ciclos_realizados: 0,
        notas:             form.notas || null,
      }).select('id').single()
      if (e1) throw e1

      // 2. Crear primer ciclo
      const { data: ciclo, error: e2 } = await supabase.from('ciclos').insert({
        expediente_id:        exp.id,
        numero_ciclo:         1,
        estado:               'bajada_pendiente',
        ahorro_previsto_total: null,
      }).select('id').single()
      if (e2) throw e2

      // 3. Crear solicitud de bajada
      const { error: e3 } = await supabase.from('solicitudes_potencia').insert({
        expediente_id: exp.id,
        ciclo_id:      ciclo.id,
        cups_id:       form.cups_id,
        empresa_id:    form.empresa_id,
        tipo:          'bajada',
        estado:        'pendiente',
        p1_actual:     cupsSeleccionado?.p1_kw ?? null,
        p2_actual:     cupsSeleccionado?.p2_kw ?? null,
        p3_actual:     cupsSeleccionado?.p3_kw ?? null,
        p1_nueva:      form.p1_nueva,
        p2_nueva:      form.p2_nueva,
        p3_nueva:      form.p3_nueva ?? null,
      })
      if (e3) throw e3

      toast.success('Expediente creado correctamente')
      onCreated()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Error al crear el expediente')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">Nuevo expediente RDL 7/2026</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-5">
          {/* Empresa */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Empresa *</label>
            <select {...register('empresa_id')} disabled={!!initialEmpresaId} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-600">
              <option value="">Selecciona una empresa...</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
            {errors.empresa_id && <p className="mt-1 text-xs text-red-500">{errors.empresa_id.message}</p>}
          </div>

          {/* CUPS */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">CUPS *</label>
            <select {...register('cups_id')} disabled={!empresaId || !!initialCupsId} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-600">
              <option value="">Selecciona un CUPS...</option>
              {cupsDisponibles.map(c => <option key={c.id} value={c.id}>{c.codigo_cups}</option>)}
            </select>
            {errors.cups_id && <p className="mt-1 text-xs text-red-500">{errors.cups_id.message}</p>}
          </div>

          {/* Potencias actuales (informativo) */}
          {cupsSeleccionado && (
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <p className="font-semibold mb-1">Potencias actuales del CUPS:</p>
              <p>P1: {cupsSeleccionado.p1_kw ?? '—'} kW · P2: {cupsSeleccionado.p2_kw ?? '—'} kW · P3: {cupsSeleccionado.p3_kw ?? '—'} kW</p>
            </div>
          )}

          {/* Nuevas potencias */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Nuevas potencias (bajada) *</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="mb-0.5 text-[10px] text-slate-400">P1 (kW) *</p>
                <input type="number" step="0.01" {...register('p1_nueva')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                {errors.p1_nueva && <p className="mt-0.5 text-[10px] text-red-500">{errors.p1_nueva.message}</p>}
              </div>
              <div>
                <p className="mb-0.5 text-[10px] text-slate-400">P2 (kW) *</p>
                <input type="number" step="0.01" {...register('p2_nueva')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                {errors.p2_nueva && <p className="mt-0.5 text-[10px] text-red-500">{errors.p2_nueva.message}</p>}
              </div>
              <div>
                <p className="mb-0.5 text-[10px] text-slate-400">P3 (kW)</p>
                <input type="number" step="0.01" {...register('p3_nueva')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Notas internas</label>
            <textarea {...register('notas')} rows={2} className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-lg bg-[#1e3a6e] px-4 py-2 text-sm font-medium text-white hover:bg-[#162d58] disabled:opacity-60">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear expediente
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
