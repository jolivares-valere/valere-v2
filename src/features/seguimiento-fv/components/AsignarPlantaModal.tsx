import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Sun, Building2, Zap, Loader2 } from 'lucide-react'
import { useEmpresasSelector, useCupsPorEmpresa, useAsignarPlantaEmpresa } from '../api'
import type { FVPlantaBasica } from '../api'

const schema = z.object({
  empresaId:     z.string().min(1, 'Selecciona una empresa'),
  cupsId:        z.string().optional(),
  nombreInterno: z.string().optional(),
  syncEnabled:   z.boolean().default(true),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  planta: FVPlantaBasica | null
}

export default function AsignarPlantaModal({ open, onClose, planta }: Props) {
  const [empresaId, setEmpresaId] = useState<string | null>(null)

  const { data: empresas = [], isLoading: loadingEmpresas } = useEmpresasSelector()
  const { data: cups    = [], isLoading: loadingCups       } = useCupsPorEmpresa(empresaId)
  const asignar = useAsignarPlantaEmpresa()

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      empresaId:     '',
      cupsId:        '',
      nombreInterno: planta?.nombre_interno ?? planta?.nombre ?? '',
      syncEnabled:   true,
    },
  })

  const empresaSeleccionada = watch('empresaId')

  useEffect(() => {
    setEmpresaId(empresaSeleccionada || null)
    setValue('cupsId', '')
  }, [empresaSeleccionada, setValue])

  useEffect(() => {
    if (open && planta) {
      reset({
        empresaId:     '',
        cupsId:        '',
        nombreInterno: planta.nombre_interno ?? planta.nombre ?? '',
        syncEnabled:   true,
      })
      setEmpresaId(null)
    }
  }, [open, planta, reset])

  const onSubmit = async (values: FormValues) => {
    if (!planta) return
    await asignar.mutateAsync({
      plantaId:      planta.id,
      empresaId:     values.empresaId,
      cupsId:        values.cupsId || null,
      nombreInterno: values.nombreInterno || null,
      syncEnabled:   values.syncEnabled,
    })
    onClose()
  }

  if (!open || !planta) return null

  const nombreMostrar = planta.nombre_fusionsolar ?? planta.nombre

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Sun className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 text-base">Asignar planta a cliente</h2>
              <p className="text-xs text-slate-500 font-mono">{planta.station_code}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info planta (solo lectura) */}
        <div className="mx-6 mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-start gap-2.5">
            <Sun className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-slate-800 text-sm truncate">{nombreMostrar}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                <span className="capitalize">{planta.plataforma}</span>
                <span>·</span>
                <span className="font-mono">{planta.station_code}</span>
                {planta.capacidad_kwp && (
                  <>
                    <span>·</span>
                    <span>{planta.capacidad_kwp} kWp</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">

          {/* Empresa */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Empresa cliente <span className="text-red-500">*</span>
            </label>
            {loadingEmpresas ? (
              <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando empresas...
              </div>
            ) : (
              <select
                {...register('empresaId')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">— Selecciona empresa —</option>
                {empresas.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            )}
            {errors.empresaId && <p className="text-xs text-red-600 mt-1">{errors.empresaId.message}</p>}
          </div>

          {/* CUPS (opcional, filtrado por empresa) */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
              <Zap className="w-3.5 h-3.5 text-slate-400" />
              CUPS vinculado
              <span className="ml-1 text-xs text-slate-400">(opcional)</span>
            </label>
            {!empresaId ? (
              <p className="text-xs text-slate-400 italic px-1">
                Selecciona primero una empresa para ver sus CUPS
              </p>
            ) : loadingCups ? (
              <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando CUPS...
              </div>
            ) : cups.length === 0 ? (
              <p className="text-xs text-slate-400 italic px-1">
                Esta empresa no tiene CUPS registrados en el CRM
              </p>
            ) : (
              <select
                {...register('cupsId')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">— Sin CUPS vinculado —</option>
                {cups.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.codigo_cups}
                    {c.direccion_suministro ? ` — ${c.direccion_suministro}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Nombre interno */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Nombre interno en el CRM
              <span className="ml-1 text-xs text-slate-400">(editable, opcional)</span>
            </label>
            <input
              {...register('nombreInterno')}
              placeholder={nombreMostrar}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              Si se deja vacío se usa el nombre del portal: <span className="font-mono">{nombreMostrar}</span>
            </p>
          </div>

          {/* Sync enabled */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              {...register('syncEnabled')}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">
              Activar sincronización automática para esta planta
            </span>
          </label>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={asignar.isPending}
              className="flex-1 px-4 py-2.5 bg-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {asignar.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Asignar planta
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
