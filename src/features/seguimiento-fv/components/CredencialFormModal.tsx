import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Eye, EyeOff, KeyRound, AlertTriangle, Loader2 } from 'lucide-react'
import { useCrearCredencial, useActualizarCredencial } from '../api'
import type { FVCredencial } from '../api'

// ─── Plataformas soportadas ───────────────────────────────
const PLATAFORMAS = [
  { value: 'fusionsolar', label: 'FusionSolar (Huawei)',     urlDefault: 'https://uni003eu5.fusionsolar.huawei.com' },
  { value: 'goodwe',      label: 'GoodWe SEMS',              urlDefault: 'https://www.semsportal.com' },
  { value: 'isolarcloud', label: 'iSolarCloud (Sungrow)',    urlDefault: 'https://www.isolarcloud.com' },
  { value: 'sma_ennexos', label: 'SMA Ennexos',             urlDefault: 'https://ennexos.sunnyportal.com' },
  { value: 'solaredge',   label: 'SolarEdge',                urlDefault: 'https://monitoring.solaredge.com' },
  { value: 'otro',        label: 'Otro portal FV',           urlDefault: '' },
]

const TIPOS = [
  { value: 'instalador_multicliente', label: 'Instalador (acceso a varios clientes)' },
  { value: 'cliente_multiplanta',     label: 'Cliente (acceso a varias plantas propias)' },
  { value: 'cliente_monoplanta',      label: 'Cliente (acceso a una sola planta)' },
]

// ─── Schema de validación ─────────────────────────────────
const schemaBase = z.object({
  plataforma:  z.string().min(1, 'Selecciona la plataforma'),
  nombre:      z.string().min(2, 'Introduce un nombre descriptivo'),
  username:    z.string().min(3, 'Introduce el usuario o email'),
  region_url:  z.string().url('URL no válida').or(z.literal('')).optional(),
  activo:      z.boolean().default(true),
  tipo:        z.string().min(1, 'Selecciona el tipo de cuenta'),
  descripcion: z.string().optional(),
  password:    z.string(),
})

const schemaNueva = schemaBase.extend({
  password: z.string().min(4, 'Introduce la contraseña'),
})

const schemaEditar = schemaBase.extend({
  password: z.string().optional(),
})

type FormValues = z.infer<typeof schemaNueva>

// ─── Props ────────────────────────────────────────────────
interface Props {
  open: boolean
  onClose: () => void
  credencial?: FVCredencial | null   // null = nueva, objeto = editar
}

export default function CredencialFormModal({ open, onClose, credencial }: Props) {
  const [showPwd, setShowPwd] = useState(false)
  const esNueva = !credencial

  const schema = esNueva ? schemaNueva : schemaEditar
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      plataforma:  credencial?.plataforma ?? 'fusionsolar',
      nombre:      credencial?.nombre ?? '',
      username:    credencial?.username ?? '',
      region_url:  credencial?.region_url ?? '',
      activo:      credencial?.activo ?? true,
      tipo:        credencial?.tipo ?? 'instalador_multicliente',
      descripcion: credencial?.descripcion ?? '',
      password:    '',
    },
  })

  const plataformaSeleccionada = watch('plataforma')

  // Autocompletar URL cuando cambia la plataforma (solo en modo nueva)
  useEffect(() => {
    if (!esNueva) return
    const p = PLATAFORMAS.find(x => x.value === plataformaSeleccionada)
    if (p) setValue('region_url', p.urlDefault)
  }, [plataformaSeleccionada, esNueva, setValue])

  // Reset al abrir
  useEffect(() => {
    if (open) {
      reset({
        plataforma:  credencial?.plataforma ?? 'fusionsolar',
        nombre:      credencial?.nombre ?? '',
        username:    credencial?.username ?? '',
        region_url:  credencial?.region_url ?? '',
        activo:      credencial?.activo ?? true,
        tipo:        credencial?.tipo ?? 'instalador_multicliente',
        descripcion: credencial?.descripcion ?? '',
        password:    '',
      })
      setShowPwd(false)
    }
  }, [open, credencial, reset])

  const crear    = useCrearCredencial()
  const editar   = useActualizarCredencial()
  const isPending = crear.isPending || editar.isPending

  const onSubmit = async (values: FormValues) => {
    if (esNueva) {
      await crear.mutateAsync({
        plataforma:  values.plataforma,
        nombre:      values.nombre,
        username:    values.username,
        password:    values.password!,
        region_url:  values.region_url || undefined,
        activo:      values.activo,
        tipo:        values.tipo,
        descripcion: values.descripcion,
      })
    } else {
      await editar.mutateAsync({
        id:          credencial!.id,
        nombre:      values.nombre,
        activo:      values.activo,
        descripcion: values.descripcion,
        region_url:  values.region_url || undefined,
        ...(values.password ? { password: values.password } : {}),
      })
    }
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 text-base">
                {esNueva ? 'Nueva credencial FV' : 'Editar credencial'}
              </h2>
              <p className="text-xs text-slate-500">
                {esNueva ? 'Acceso a portal de monitorización' : credencial?.username}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aviso de seguridad */}
        <div className="mx-6 mt-4 flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
          <p>
            La contraseña se guarda encriptada y <strong>nunca se muestra de nuevo</strong>.
            El conector Python la cifrará con AES-256 en el primer sync.
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">

          {/* Plataforma */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Plataforma <span className="text-red-500">*</span>
            </label>
            <select
              {...register('plataforma')}
              disabled={!esNueva}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              {PLATAFORMAS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            {errors.plataforma && <p className="text-xs text-red-600 mt-1">{errors.plataforma.message}</p>}
          </div>

          {/* Nombre descriptivo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Nombre descriptivo <span className="text-red-500">*</span>
            </label>
            <input
              {...register('nombre')}
              placeholder="Ej: FusionSolar Instalador Valere, Cuenta cliente Panificadoras..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.nombre && <p className="text-xs text-red-600 mt-1">{errors.nombre.message}</p>}
          </div>

          {/* Tipo de cuenta */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tipo de cuenta <span className="text-red-500">*</span>
            </label>
            <select
              {...register('tipo')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {TIPOS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* URL del portal */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              URL del portal
              <span className="ml-1 text-xs text-slate-400">(se rellena automáticamente)</span>
            </label>
            <input
              {...register('region_url')}
              placeholder="https://uni003eu5.fusionsolar.huawei.com"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.region_url && <p className="text-xs text-red-600 mt-1">{errors.region_url.message}</p>}
          </div>

          {/* Usuario */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Usuario / Email <span className="text-red-500">*</span>
            </label>
            <input
              {...register('username')}
              autoComplete="username"
              disabled={!esNueva}
              placeholder="usuario@ejemplo.com"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
            {errors.username && <p className="text-xs text-red-600 mt-1">{errors.username.message}</p>}
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Contraseña {esNueva && <span className="text-red-500">*</span>}
              {!esNueva && <span className="ml-1 text-xs text-slate-400">(dejar vacío para no cambiar)</span>}
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={esNueva ? 'Contraseña del portal' : '••••••••'}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
          </div>

          {/* Notas opcionales */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Notas <span className="text-xs text-slate-400">(opcional)</span>
            </label>
            <textarea
              {...register('descripcion')}
              rows={2}
              placeholder="Ej: Cuenta del instalador que da acceso a FOAM, PAZ Y BIEN y JUAN RUBIO"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Activo */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              {...register('activo')}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">Credencial activa (el sync la usará automáticamente)</span>
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
              disabled={isPending}
              className="flex-1 px-4 py-2.5 bg-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {esNueva ? 'Guardar credencial' : 'Guardar cambios'}
            </button>
          </div>

          {/* Aviso próximamente */}
          <div className="pt-1 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center">
              Próximamente: <span className="font-medium">Probar conexión</span> y{' '}
              <span className="font-medium">Detectar plantas automáticamente</span> (requiere sync backend activo)
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
