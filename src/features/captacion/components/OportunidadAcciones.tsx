import { useState } from 'react'
import { toast } from 'sonner'
import {
  Phone, Mail, Upload, CheckCircle2, XCircle, ArrowRight, Calendar, AlertTriangle, UserPlus, Send, Briefcase, Download,
} from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select'
import {
  useCambiarEtapa, useRegistrarActividad, useHacerHandoff, useAnalistas, useAsesoresSenior,
  type OportunidadDetalle,
} from '../api'
import { motivosParaUsuario } from '../motivos'
import { useAuth } from '../../../core/hooks/useAuth'
import {
  subirDocumentoOportunidad, urlFirmadaDocumento, validarFichero, ACCEPTED_EXT_LABEL, ACCEPTED_MIME,
} from '../storage'

interface Props {
  detalle: OportunidadDetalle
  onClose: () => void
}

type Modo =
  | null
  | 'no_contesta'
  | 'no_decisor'
  | 'esperando_factura'
  | 'cerrar_perdida'
  | 'recordatorio'
  | 'subir_factura'
  | 'pasar_a_analisis'
  | 'no_envia_factura'
  | 'marcar_propuesta_enviada'
  | 'cliente_acepta'
  | 'cliente_rechaza'
  | 'pedir_visita'
  | 'programar_contacto'
  | 'empezar_analisis'
  | 'asignar_a_senior'
  | 'empezar_preparar_propuesta'
  | 'subir_propuesta'

/**
 * Bloque de acciones contextuales para una oportunidad, según etapa_operativa.
 * Renderiza botones primarios y un mini-form que cambia con la acción elegida.
 *
 * Origen: docs/SPRINT_OPERATIVO_CAPTACION_2026-05-04.md (Días 3-4)
 */
export default function OportunidadAcciones({ detalle, onClose }: Props) {
  const { user } = useAuth()
  const funciones = user?.funciones ?? []
  const [modo, setModo] = useState<Modo>(null)
  const { data: analistas = [] } = useAnalistas()
  const { data: senior = [] } = useAsesoresSenior()

  const etapa = detalle.etapa_operativa ?? 'sin_etapa'
  const esResponsable = detalle.responsable_actual_id === user?.id
  const tieneFunciones = funciones.length > 0

  // Si el user no es responsable actual del caso, modo solo lectura
  if (!esResponsable) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-slate-500 italic px-1">
          Este caso ya no está en tu bandeja. Lectura/seguimiento.
        </p>
      </div>
    )
  }

  // Si no tiene función, no debería estar aquí
  if (!tieneFunciones) {
    return null
  }

  return (
    <div className="space-y-3">
      {/* Botones primarios según etapa */}
      {modo === null && (
        <BotonesPorEtapa etapa={etapa} setModo={setModo} />
      )}

      {/* Forms contextuales */}
      {modo === 'no_contesta' && (
        <FormNoContesta
          oportunidadId={detalle.id}
          onCancel={() => setModo(null)}
          onDone={() => { setModo(null) }}
        />
      )}
      {modo === 'no_decisor' && (
        <FormNoDecisor
          oportunidadId={detalle.id}
          onCancel={() => setModo(null)}
          onDone={() => { setModo(null) }}
        />
      )}
      {modo === 'esperando_factura' && (
        <FormEsperandoFactura
          oportunidadId={detalle.id}
          contactoEmailDefault={detalle.contactos?.[0]?.email ?? ''}
          onCancel={() => setModo(null)}
          onDone={() => { setModo(null) }}
        />
      )}
      {modo === 'cerrar_perdida' && (
        <FormCerrarPerdida
          oportunidadId={detalle.id}
          funciones={funciones}
          onCancel={() => setModo(null)}
          onDone={() => { setModo(null); onClose() }}
        />
      )}
      {modo === 'recordatorio' && (
        <FormRecordatorio
          oportunidadId={detalle.id}
          onCancel={() => setModo(null)}
          onDone={() => { setModo(null) }}
        />
      )}
      {modo === 'subir_factura' && (
        <FormSubirFactura
          oportunidadId={detalle.id}
          empresaId={detalle.empresa?.id ?? ''}
          onCancel={() => setModo(null)}
          onDone={() => { setModo(null) }}
        />
      )}
      {modo === 'pasar_a_analisis' && (
        <FormPasarAAnalisis
          oportunidadId={detalle.id}
          analistas={analistas}
          onCancel={() => setModo(null)}
          onDone={() => { setModo(null); onClose() }}
        />
      )}
      {modo === 'no_envia_factura' && (
        <FormNoEnviaFactura
          oportunidadId={detalle.id}
          onCancel={() => setModo(null)}
          onDone={() => { setModo(null); onClose() }}
        />
      )}
      {modo === 'marcar_propuesta_enviada' && (
        <FormMarcarPropuestaEnviada
          oportunidadId={detalle.id}
          contactoEmailDefault={detalle.contactos?.[0]?.email ?? ''}
          onCancel={() => setModo(null)}
          onDone={() => { setModo(null) }}
        />
      )}
      {modo === 'cliente_acepta' && (
        <FormClienteAcepta
          oportunidadId={detalle.id}
          onCancel={() => setModo(null)}
          onDone={() => { setModo(null); onClose() }}
        />
      )}
      {modo === 'cliente_rechaza' && (
        <FormClienteRechaza
          oportunidadId={detalle.id}
          funciones={funciones}
          onCancel={() => setModo(null)}
          onDone={() => { setModo(null); onClose() }}
        />
      )}
      {modo === 'pedir_visita' && (
        <FormPedirVisita
          oportunidadId={detalle.id}
          senior={senior}
          onCancel={() => setModo(null)}
          onDone={() => { setModo(null); onClose() }}
        />
      )}
      {modo === 'programar_contacto' && (
        <FormProgramarContacto
          oportunidadId={detalle.id}
          onCancel={() => setModo(null)}
          onDone={() => { setModo(null) }}
        />
      )}
      {modo === 'empezar_analisis' && (
        <FormSimpleEtapa
          oportunidadId={detalle.id}
          nuevaEtapa="en_analisis"
          tituloFormulario="Empezar análisis estándar"
          tituloActividad="Análisis iniciado"
          tipoActividad="cambio_etapa"
          onCancel={() => setModo(null)}
          onDone={() => { setModo(null) }}
        />
      )}
      {modo === 'asignar_a_senior' && (
        <FormPedirVisita
          oportunidadId={detalle.id}
          senior={senior}
          onCancel={() => setModo(null)}
          onDone={() => { setModo(null); onClose() }}
        />
      )}
      {modo === 'empezar_preparar_propuesta' && (
        <FormSimpleEtapa
          oportunidadId={detalle.id}
          nuevaEtapa="propuesta_en_preparacion"
          tituloFormulario="Empezar a preparar propuesta"
          tituloActividad="Inicio preparación de propuesta"
          tipoActividad="cambio_etapa"
          onCancel={() => setModo(null)}
          onDone={() => { setModo(null) }}
        />
      )}
      {modo === 'subir_propuesta' && (
        <FormSubirPropuesta
          oportunidadId={detalle.id}
          empresaId={detalle.empresa?.id ?? ''}
          onCancel={() => setModo(null)}
          onDone={() => { setModo(null); onClose() }}
        />
      )}

      {/* Si está en etapa cerrada, no hay acciones */}
      {(etapa === 'cerrado_ganada' || etapa === 'cerrado_perdida' || etapa === 'cerrado') && modo === null && (
        <p className="text-xs text-slate-400 italic px-1">Caso cerrado, sin acciones disponibles.</p>
      )}
    </div>
  )
}

/* ============================================================
 * Botones primarios según etapa
 * ============================================================ */
function BotonesPorEtapa({ etapa, setModo }: { etapa: string; setModo: (m: Modo) => void }) {
  if (etapa === 'nuevo' || etapa === 'contactado') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <ActionButton icon={Phone} label="No contesta" onClick={() => setModo('no_contesta')} />
        <ActionButton icon={UserPlus} label="No es decisor" onClick={() => setModo('no_decisor')} />
        <ActionButton icon={Mail} label="Esperando factura" onClick={() => setModo('esperando_factura')} variant="primary" />
        <ActionButton icon={XCircle} label="No interesa" onClick={() => setModo('cerrar_perdida')} variant="danger" />
      </div>
    )
  }
  if (etapa === 'esperando_factura') {
    return (
      <div className="grid grid-cols-1 gap-2">
        <ActionButton icon={Upload} label="Factura recibida" onClick={() => setModo('subir_factura')} variant="primary" />
        <div className="grid grid-cols-3 gap-2">
          <ActionButton icon={Phone} label="Recordatorio" onClick={() => setModo('recordatorio')} />
          <ActionButton icon={ArrowRight} label="Pasar a análisis" onClick={() => setModo('pasar_a_analisis')} />
          <ActionButton icon={XCircle} label="No envía" onClick={() => setModo('no_envia_factura')} variant="danger" />
        </div>
      </div>
    )
  }
  if (etapa === 'factura_recibida') {
    // Si la card sigue en bandeja de telemarketing (todavía no se hizo handoff manual)
    // muestra acciones de Carolina A. Si está en bandeja de analista, muestra otras.
    return (
      <div className="grid grid-cols-1 gap-2">
        <ActionButton icon={Briefcase} label="Empezar análisis (estándar)" onClick={() => setModo('empezar_analisis')} variant="primary" />
        <ActionButton icon={UserPlus} label="Asignar a senior (caso complejo)" onClick={() => setModo('asignar_a_senior')} />
        <ActionButton icon={ArrowRight} label="Pasar a análisis (Carolina M)" onClick={() => setModo('pasar_a_analisis')} />
      </div>
    )
  }
  if (etapa === 'en_analisis') {
    return (
      <div className="grid grid-cols-1 gap-2">
        <ActionButton icon={Upload} label="Subir propuesta lista" onClick={() => setModo('subir_propuesta')} variant="primary" />
      </div>
    )
  }
  if (etapa === 'asignada_a_senior') {
    return (
      <div className="grid grid-cols-1 gap-2">
        <ActionButton icon={Briefcase} label="Empezar a preparar propuesta" onClick={() => setModo('empezar_preparar_propuesta')} variant="primary" />
      </div>
    )
  }
  if (etapa === 'propuesta_en_preparacion') {
    return (
      <div className="grid grid-cols-1 gap-2">
        <ActionButton icon={Upload} label="Subir propuesta lista" onClick={() => setModo('subir_propuesta')} variant="primary" />
      </div>
    )
  }
  if (etapa === 'propuesta_lista') {
    return (
      <div className="grid grid-cols-1 gap-2">
        <ActionButton icon={Send} label="Marcar propuesta enviada" onClick={() => setModo('marcar_propuesta_enviada')} variant="primary" />
      </div>
    )
  }
  if (etapa === 'propuesta_enviada' || etapa === 'seguimiento') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <ActionButton icon={CheckCircle2} label="Cliente acepta" onClick={() => setModo('cliente_acepta')} variant="primary" />
        <ActionButton icon={XCircle} label="Cliente rechaza" onClick={() => setModo('cliente_rechaza')} variant="danger" />
        <ActionButton icon={Briefcase} label="Pedir visita" onClick={() => setModo('pedir_visita')} />
        <ActionButton icon={Calendar} label="Programar próximo" onClick={() => setModo('programar_contacto')} />
      </div>
    )
  }
  return null
}

function ActionButton({ icon: Icon, label, onClick, variant = 'default' }: {
  icon: typeof Phone
  label: string
  onClick: () => void
  variant?: 'default' | 'primary' | 'danger'
}) {
  const cls =
    variant === 'primary'
      ? 'bg-valere-blue-dark text-white hover:bg-valere-blue-dark/90'
      : variant === 'danger'
      ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${cls}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}

/* ============================================================
 * Forms (todos comparten el patrón: cancelar + confirmar)
 * ============================================================ */

function FormFooter({ onCancel, primaryLabel = 'Confirmar', primaryVariant = 'primary', disabled = false }: {
  onCancel: () => void
  primaryLabel?: string
  primaryVariant?: 'primary' | 'danger'
  disabled?: boolean
}) {
  return (
    <div className="flex justify-end gap-2 mt-3">
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
      <Button
        type="submit"
        size="sm"
        disabled={disabled}
        className={primaryVariant === 'danger' ? 'bg-red-600 hover:bg-red-700' : ''}
      >
        {primaryLabel}
      </Button>
    </div>
  )
}

function FormNoContesta({ oportunidadId, onCancel, onDone }: {
  oportunidadId: string
  onCancel: () => void
  onDone: () => void
}) {
  const [nota, setNota] = useState('')
  const registrar = useRegistrarActividad()
  const cambiar = useCambiarEtapa()

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await registrar.mutateAsync({
        oportunidadId,
        tipo: 'llamada',
        titulo: 'Llamada sin respuesta',
        descripcion: nota || undefined,
        resultado: 'no_contesta',
      })
      // Mover a 'contactado' (intentado) si estaba en 'nuevo'
      await cambiar.mutateAsync({
        oportunidadId,
        etapaOperativa: 'contactado',
      })
      toast.success('Intento registrado')
      onDone()
    } catch (err) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'desconocido' })
    }
  }

  return (
    <form onSubmit={handle} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
      <p className="text-sm font-medium text-slate-900 mb-2">Llamada sin respuesta</p>
      <Label htmlFor="nota_nc">Nota (opcional)</Label>
      <Textarea id="nota_nc" rows={2} placeholder="Ej: buzón lleno; horario malo" value={nota} onChange={e => setNota(e.target.value)} />
      <FormFooter onCancel={onCancel} primaryLabel="Registrar intento" disabled={registrar.isPending || cambiar.isPending} />
    </form>
  )
}

function FormNoDecisor({ oportunidadId, onCancel, onDone }: {
  oportunidadId: string
  onCancel: () => void
  onDone: () => void
}) {
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoTel, setNuevoTel] = useState('')
  const registrar = useRegistrarActividad()
  const cambiar = useCambiarEtapa()

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const desc = `Persona contactada no es decisor.${nuevoNombre ? ` Nuevo contacto sugerido: ${nuevoNombre}` : ''}${nuevoTel ? ` (${nuevoTel})` : ''}`
      await registrar.mutateAsync({
        oportunidadId,
        tipo: 'llamada',
        titulo: 'No es decisor',
        descripcion: desc,
        resultado: 'no_es_decisor',
      })
      await cambiar.mutateAsync({
        oportunidadId,
        etapaOperativa: 'contactado',
        decisor_identificado: false,
        notasAppend: desc,
      })
      toast.success('Registrado')
      onDone()
    } catch (err) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'desconocido' })
    }
  }

  return (
    <form onSubmit={handle} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
      <p className="text-sm font-medium text-slate-900 mb-2">Persona no es decisor</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="nd_nombre">Nuevo contacto sugerido</Label>
          <Input id="nd_nombre" placeholder="Nombre" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="nd_tel">Teléfono</Label>
          <Input id="nd_tel" value={nuevoTel} onChange={e => setNuevoTel(e.target.value)} />
        </div>
      </div>
      <FormFooter onCancel={onCancel} primaryLabel="Registrar" disabled={registrar.isPending || cambiar.isPending} />
    </form>
  )
}

function FormEsperandoFactura({ oportunidadId, contactoEmailDefault, onCancel, onDone }: {
  oportunidadId: string
  contactoEmailDefault: string
  onCancel: () => void
  onDone: () => void
}) {
  const [emailEnvio, setEmailEnvio] = useState(contactoEmailDefault)
  const [fechaPrev, setFechaPrev] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    return d.toISOString().slice(0, 10)
  })
  const cambiar = useCambiarEtapa()
  const registrar = useRegistrarActividad()

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await cambiar.mutateAsync({
        oportunidadId,
        etapaOperativa: 'esperando_factura',
        factura_fecha_prevista: new Date(fechaPrev).toISOString(),
        decisor_identificado: true,
      })
      await registrar.mutateAsync({
        oportunidadId,
        tipo: 'llamada',
        titulo: 'Cliente acepta enviar factura',
        descripcion: `Email donde envía: ${emailEnvio}\nFecha prevista: ${new Date(fechaPrev).toLocaleDateString('es-ES')}`,
        resultado: 'compromiso_factura',
      })
      toast.success('Caso movido a Esperando factura')
      onDone()
    } catch (err) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'desconocido' })
    }
  }

  return (
    <form onSubmit={handle} className="rounded-lg bg-amber-50 border border-amber-200 p-3">
      <p className="text-sm font-medium text-slate-900 mb-2">Cliente envía factura</p>
      <div className="space-y-2">
        <div>
          <Label htmlFor="ef_email">Email a donde envía</Label>
          <Input id="ef_email" type="email" placeholder="info@valereconsultores.com" value={emailEnvio} onChange={e => setEmailEnvio(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="ef_fecha">Fecha prevista de envío</Label>
          <Input id="ef_fecha" type="date" value={fechaPrev} onChange={e => setFechaPrev(e.target.value)} required />
        </div>
      </div>
      <FormFooter onCancel={onCancel} primaryLabel="Mover a Esperando factura" disabled={cambiar.isPending || registrar.isPending} />
    </form>
  )
}

function FormCerrarPerdida({ oportunidadId, funciones, onCancel, onDone }: {
  oportunidadId: string
  funciones: string[]
  onCancel: () => void
  onDone: () => void
}) {
  const motivos = motivosParaUsuario(funciones)
  const [codigo, setCodigo] = useState<string>(motivos[0]?.codigo ?? 'otro')
  const [detalle, setDetalle] = useState('')
  const cambiar = useCambiarEtapa()
  const registrar = useRegistrarActividad()

  const requireDetalle = codigo === 'otro'

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (requireDetalle && !detalle.trim()) {
      toast.error('Detalle obligatorio si eliges "otro"')
      return
    }
    try {
      await cambiar.mutateAsync({
        oportunidadId,
        etapaOperativa: 'cerrado',
        etapa: 'cerrada_perdida',
        motivo_perdida_codigo: codigo,
        motivo_perdida_detalle: detalle || null,
      })
      await registrar.mutateAsync({
        oportunidadId,
        tipo: 'cierre',
        titulo: 'Cerrado como perdida',
        descripcion: `Motivo: ${codigo}${detalle ? ` — ${detalle}` : ''}`,
        resultado: 'cerrado_perdida',
      })
      toast.success('Caso cerrado como perdida')
      onDone()
    } catch (err) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'desconocido' })
    }
  }

  return (
    <form onSubmit={handle} className="rounded-lg bg-red-50 border border-red-200 p-3">
      <p className="text-sm font-medium text-slate-900 mb-2 flex items-center gap-1.5">
        <AlertTriangle className="h-4 w-4 text-red-600" /> Cerrar como perdida
      </p>
      <div className="space-y-2">
        <div>
          <Label htmlFor="cp_motivo">Motivo</Label>
          <Select value={codigo} onValueChange={v => setCodigo(v ?? '')}>
            <SelectTrigger id="cp_motivo"><SelectValue /></SelectTrigger>
            <SelectContent>
              {motivos.map(m => (
                <SelectItem key={m.codigo} value={m.codigo}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="cp_detalle">Detalle{requireDetalle && <span className="text-red-500"> *</span>}</Label>
          <Textarea id="cp_detalle" rows={2} placeholder={requireDetalle ? 'Describe el motivo' : 'Opcional'} value={detalle} onChange={e => setDetalle(e.target.value)} />
        </div>
      </div>
      <FormFooter onCancel={onCancel} primaryLabel="Cerrar perdida" primaryVariant="danger" disabled={cambiar.isPending || registrar.isPending} />
    </form>
  )
}

function FormRecordatorio({ oportunidadId, onCancel, onDone }: {
  oportunidadId: string
  onCancel: () => void
  onDone: () => void
}) {
  const [tipo, setTipo] = useState<'llamada' | 'email'>('llamada')
  const [nota, setNota] = useState('')
  const registrar = useRegistrarActividad()

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await registrar.mutateAsync({
        oportunidadId,
        tipo,
        titulo: tipo === 'llamada' ? 'Llamada recordatorio enviada' : 'Email recordatorio enviado',
        descripcion: nota || undefined,
        resultado: 'recordatorio',
      })
      toast.success('Recordatorio registrado')
      onDone()
    } catch (err) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'desconocido' })
    }
  }

  return (
    <form onSubmit={handle} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
      <p className="text-sm font-medium text-slate-900 mb-2">Recordatorio enviado</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="rec_tipo">Canal</Label>
          <Select value={tipo} onValueChange={v => setTipo((v ?? 'llamada') as 'llamada' | 'email')}>
            <SelectTrigger id="rec_tipo"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="llamada">Llamada</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="rec_nota">Nota</Label>
          <Input id="rec_nota" value={nota} onChange={e => setNota(e.target.value)} placeholder="Opcional" />
        </div>
      </div>
      <FormFooter onCancel={onCancel} primaryLabel="Registrar" disabled={registrar.isPending} />
    </form>
  )
}

function FormSubirFactura({ oportunidadId, empresaId, onCancel, onDone }: {
  oportunidadId: string
  empresaId: string
  onCancel: () => void
  onDone: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [fechaReal, setFechaReal] = useState(() => new Date().toISOString().slice(0, 10))
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cambiar = useCambiarEtapa()
  const registrar = useRegistrarActividad()

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { setError('Selecciona un archivo'); return }
    const valError = validarFichero(file)
    if (valError) { setError(valError); return }
    setError(null)
    setUploading(true)
    try {
      const result = await subirDocumentoOportunidad({
        file, oportunidadId, empresaId,
        categoria: 'facturas', tipoDocumento: 'factura',
      })
      // Update oportunidad — paso separado del upload (resilient)
      try {
        await cambiar.mutateAsync({
          oportunidadId,
          etapaOperativa: 'factura_recibida',
          factura_recibida_at: new Date(fechaReal).toISOString(),
          factura_documento_id: result.documentoId,
        })
      } catch (errStage) {
        toast.warning('Factura subida pero falla al actualizar estado', {
          description: 'Reintenta el cambio de etapa desde aquí. La factura no se ha perdido.',
        })
        await registrar.mutateAsync({
          oportunidadId,
          tipo: 'factura_subida',
          titulo: `Factura subida (${result.nombre})`,
          descripcion: 'Subida correcta. Actualización de estado pendiente — reintentar.',
          resultado: 'factura_recibida_pendiente_estado',
          adjunto_url: result.rutaStorage,
          adjunto_nombre: result.nombre,
        })
        throw errStage
      }
      await registrar.mutateAsync({
        oportunidadId,
        tipo: 'factura_subida',
        titulo: `Factura recibida — ${result.nombre}`,
        descripcion: `Fecha real de recepción: ${new Date(fechaReal).toLocaleDateString('es-ES')}`,
        resultado: 'factura_recibida',
        adjunto_url: result.rutaStorage,
        adjunto_nombre: result.nombre,
      })
      toast.success('Factura recibida y registrada', {
        description: 'Ahora pulsa "Pasar a análisis" para que Carolina M la trabaje.',
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handle} className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
      <p className="text-sm font-medium text-slate-900 mb-2 flex items-center gap-1.5">
        <Upload className="h-4 w-4 text-emerald-600" /> Subir factura
      </p>
      <div className="space-y-2">
        <div>
          <Label htmlFor="sf_file">Archivo ({ACCEPTED_EXT_LABEL})</Label>
          <Input
            id="sf_file"
            type="file"
            accept={ACCEPTED_MIME.join(',')}
            onChange={e => { setFile(e.target.files?.[0] ?? null); setError(null) }}
            required
          />
          {file && (
            <p className="text-xs text-slate-600 mt-0.5">
              {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="sf_fecha">Fecha real de recepción</Label>
          <Input id="sf_fecha" type="date" value={fechaReal} onChange={e => setFechaReal(e.target.value)} required />
        </div>
        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> {error}
          </p>
        )}
      </div>
      <FormFooter onCancel={onCancel} primaryLabel={uploading ? 'Subiendo…' : 'Subir factura'} disabled={uploading} />
    </form>
  )
}

function FormPasarAAnalisis({ oportunidadId, analistas, onCancel, onDone }: {
  oportunidadId: string
  analistas: Array<{ id: string; full_name: string | null; email: string }>
  onCancel: () => void
  onDone: () => void
}) {
  const [toUser, setToUser] = useState<string>(analistas[0]?.id ?? '')
  const [nota, setNota] = useState('')
  const handoff = useHacerHandoff()
  const registrar = useRegistrarActividad()

  if (analistas.length === 0) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
        No hay ningún usuario con función analista configurado. Pide a Juan que asigne la función a alguien.
        <div className="flex justify-end mt-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cerrar</Button>
        </div>
      </div>
    )
  }

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await handoff.mutateAsync({
        oportunidadId,
        toUserId: toUser,
        motivo: 'factura_recibida',  // valor válido del CHECK constraint en oportunidad_handoffs
        etapaOperativaDestino: 'factura_recibida',
        notas: nota || undefined,
      })
      await registrar.mutateAsync({
        oportunidadId,
        tipo: 'handoff',
        titulo: 'Caso pasado a analista',
        descripcion: nota || undefined,
        resultado: 'handoff_a_analista',
      })
      toast.success('Caso pasado a análisis')
      onDone()
    } catch (err) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'desconocido' })
    }
  }

  return (
    <form onSubmit={handle} className="rounded-lg bg-blue-50 border border-blue-200 p-3">
      <p className="text-sm font-medium text-slate-900 mb-2">Pasar a análisis</p>
      <div className="space-y-2">
        <div>
          <Label htmlFor="pa_to">Analista</Label>
          <Select value={toUser} onValueChange={v => setToUser(v ?? '')}>
            <SelectTrigger id="pa_to"><SelectValue /></SelectTrigger>
            <SelectContent>
              {analistas.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.full_name ?? a.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="pa_nota">Nota para el analista (opcional)</Label>
          <Textarea id="pa_nota" rows={2} value={nota} onChange={e => setNota(e.target.value)} placeholder="Contexto, urgencia, datos de la factura..." />
        </div>
      </div>
      <FormFooter onCancel={onCancel} primaryLabel="Pasar a análisis" disabled={handoff.isPending || registrar.isPending} />
    </form>
  )
}

function FormNoEnviaFactura({ oportunidadId, onCancel, onDone }: {
  oportunidadId: string
  onCancel: () => void
  onDone: () => void
}) {
  const [detalle, setDetalle] = useState('')
  const cambiar = useCambiarEtapa()
  const registrar = useRegistrarActividad()

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await cambiar.mutateAsync({
        oportunidadId,
        etapaOperativa: 'cerrado',
        etapa: 'cerrada_perdida',
        motivo_perdida_codigo: 'no_envia_factura',
        motivo_perdida_detalle: detalle || null,
      })
      await registrar.mutateAsync({
        oportunidadId,
        tipo: 'cierre',
        titulo: 'Cerrado: no envía factura',
        descripcion: detalle || undefined,
        resultado: 'cerrado_perdida',
      })
      toast.success('Caso cerrado')
      onDone()
    } catch (err) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'desconocido' })
    }
  }

  return (
    <form onSubmit={handle} className="rounded-lg bg-red-50 border border-red-200 p-3">
      <p className="text-sm font-medium text-slate-900 mb-2">No envía factura → cerrar perdida</p>
      <Label htmlFor="ne_detalle">Detalle (opcional)</Label>
      <Textarea id="ne_detalle" rows={2} value={detalle} onChange={e => setDetalle(e.target.value)} placeholder="Intentos realizados, contexto" />
      <FormFooter onCancel={onCancel} primaryLabel="Cerrar perdida" primaryVariant="danger" disabled={cambiar.isPending || registrar.isPending} />
    </form>
  )
}

function FormMarcarPropuestaEnviada({ oportunidadId, contactoEmailDefault, onCancel, onDone }: {
  oportunidadId: string
  contactoEmailDefault: string
  onCancel: () => void
  onDone: () => void
}) {
  const [email, setEmail] = useState(contactoEmailDefault)
  const cambiar = useCambiarEtapa()
  const registrar = useRegistrarActividad()

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const ahora = new Date().toISOString()
      await cambiar.mutateAsync({
        oportunidadId,
        etapaOperativa: 'propuesta_enviada',
        propuesta_enviada_at: ahora,
        etapa: 'oferta_presentada',
      })
      await registrar.mutateAsync({
        oportunidadId,
        tipo: 'email',
        titulo: 'Propuesta enviada al cliente',
        descripcion: `Email destinatario: ${email}`,
        resultado: 'propuesta_enviada',
      })
      toast.success('Propuesta marcada como enviada')
      onDone()
    } catch (err) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'desconocido' })
    }
  }

  return (
    <form onSubmit={handle} className="rounded-lg bg-purple-50 border border-purple-200 p-3">
      <p className="text-sm font-medium text-slate-900 mb-2">Marcar propuesta enviada</p>
      <Label htmlFor="me_email">Email destinatario</Label>
      <Input id="me_email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
      <FormFooter onCancel={onCancel} primaryLabel="Marcar enviada" disabled={cambiar.isPending || registrar.isPending} />
    </form>
  )
}

function FormClienteAcepta({ oportunidadId, onCancel, onDone }: {
  oportunidadId: string
  onCancel: () => void
  onDone: () => void
}) {
  const [nota, setNota] = useState('')
  const cambiar = useCambiarEtapa()
  const registrar = useRegistrarActividad()

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await cambiar.mutateAsync({
        oportunidadId,
        etapaOperativa: 'cerrado',
        etapa: 'cerrada_ganada',
      })
      await registrar.mutateAsync({
        oportunidadId,
        tipo: 'cierre',
        titulo: 'Cliente acepta — cerrado ganada',
        descripcion: nota || undefined,
        resultado: 'cerrado_ganada',
      })
      toast.success('¡Caso cerrado como ganada!')
      onDone()
    } catch (err) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'desconocido' })
    }
  }

  return (
    <form onSubmit={handle} className="rounded-lg bg-green-50 border border-green-200 p-3">
      <p className="text-sm font-medium text-slate-900 mb-2 flex items-center gap-1.5">
        <CheckCircle2 className="h-4 w-4 text-green-600" /> Cliente acepta
      </p>
      <Label htmlFor="ca_nota">Detalles del cierre (opcional)</Label>
      <Textarea id="ca_nota" rows={2} value={nota} onChange={e => setNota(e.target.value)} placeholder="Fecha de firma, condiciones especiales..." />
      <FormFooter onCancel={onCancel} primaryLabel="Cerrar ganada" disabled={cambiar.isPending || registrar.isPending} />
    </form>
  )
}

function FormClienteRechaza({ oportunidadId, funciones, onCancel, onDone }: {
  oportunidadId: string
  funciones: string[]
  onCancel: () => void
  onDone: () => void
}) {
  const motivos = motivosParaUsuario(funciones)
  const [codigo, setCodigo] = useState<string>('precio_insuficiente')
  const [detalle, setDetalle] = useState('')
  const cambiar = useCambiarEtapa()
  const registrar = useRegistrarActividad()

  const requireDetalle = codigo === 'otro'

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (requireDetalle && !detalle.trim()) {
      toast.error('Detalle obligatorio si eliges "otro"')
      return
    }
    try {
      await cambiar.mutateAsync({
        oportunidadId,
        etapaOperativa: 'cerrado',
        etapa: 'cerrada_perdida',
        motivo_perdida_codigo: codigo,
        motivo_perdida_detalle: detalle || null,
      })
      await registrar.mutateAsync({
        oportunidadId,
        tipo: 'cierre',
        titulo: 'Cliente rechaza — cerrado perdida',
        descripcion: `Motivo: ${codigo}${detalle ? ` — ${detalle}` : ''}`,
        resultado: 'cerrado_perdida',
      })
      toast.success('Caso cerrado como perdida')
      onDone()
    } catch (err) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'desconocido' })
    }
  }

  return (
    <form onSubmit={handle} className="rounded-lg bg-red-50 border border-red-200 p-3">
      <p className="text-sm font-medium text-slate-900 mb-2">Cliente rechaza propuesta</p>
      <div className="space-y-2">
        <div>
          <Label htmlFor="cr_motivo">Motivo del rechazo</Label>
          <Select value={codigo} onValueChange={v => setCodigo(v ?? '')}>
            <SelectTrigger id="cr_motivo"><SelectValue /></SelectTrigger>
            <SelectContent>
              {motivos.map(m => (
                <SelectItem key={m.codigo} value={m.codigo}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="cr_detalle">Detalle{requireDetalle && <span className="text-red-500"> *</span>}</Label>
          <Textarea id="cr_detalle" rows={2} value={detalle} onChange={e => setDetalle(e.target.value)} />
        </div>
      </div>
      <FormFooter onCancel={onCancel} primaryLabel="Cerrar rechazada" primaryVariant="danger" disabled={cambiar.isPending || registrar.isPending} />
    </form>
  )
}

function FormPedirVisita({ oportunidadId, senior, onCancel, onDone }: {
  oportunidadId: string
  senior: Array<{ id: string; full_name: string | null; email: string }>
  onCancel: () => void
  onDone: () => void
}) {
  const [toUser, setToUser] = useState<string>(senior[0]?.id ?? '')
  const [nota, setNota] = useState('')
  const handoff = useHacerHandoff()
  const registrar = useRegistrarActividad()

  if (senior.length === 0) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
        No hay asesores senior configurados. Pide a Juan que asigne la función.
        <div className="flex justify-end mt-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cerrar</Button>
        </div>
      </div>
    )
  }

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nota.trim()) {
      toast.error('Añade contexto para el asesor senior')
      return
    }
    try {
      await handoff.mutateAsync({
        oportunidadId,
        toUserId: toUser,
        motivo: 'asignacion_a_senior',  // valor válido del CHECK constraint
        etapaOperativaDestino: 'asignada_a_senior',
        notas: nota,
      })
      await registrar.mutateAsync({
        oportunidadId,
        tipo: 'handoff',
        titulo: 'Visita escalada a senior',
        descripcion: nota,
        resultado: 'handoff_a_senior',
      })
      toast.success('Caso enviado al asesor senior')
      onDone()
    } catch (err) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'desconocido' })
    }
  }

  return (
    <form onSubmit={handle} className="rounded-lg bg-indigo-50 border border-indigo-200 p-3">
      <p className="text-sm font-medium text-slate-900 mb-2">Pedir visita / escalar a senior</p>
      <div className="space-y-2">
        <div>
          <Label htmlFor="pv_to">Asesor senior</Label>
          <Select value={toUser} onValueChange={v => setToUser(v ?? '')}>
            <SelectTrigger id="pv_to"><SelectValue /></SelectTrigger>
            <SelectContent>
              {senior.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.full_name ?? s.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="pv_nota">Contexto para el asesor <span className="text-red-500">*</span></Label>
          <Textarea id="pv_nota" rows={3} value={nota} onChange={e => setNota(e.target.value)} required placeholder="Cliente quiere negociar precio, pide visita la semana que viene..." />
        </div>
      </div>
      <FormFooter onCancel={onCancel} primaryLabel="Enviar a senior" disabled={handoff.isPending || registrar.isPending} />
    </form>
  )
}

function FormProgramarContacto({ oportunidadId, onCancel, onDone }: {
  oportunidadId: string
  onCancel: () => void
  onDone: () => void
}) {
  const [fecha, setFecha] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })
  const [nota, setNota] = useState('')
  const registrar = useRegistrarActividad()

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await registrar.mutateAsync({
        oportunidadId,
        tipo: 'callback_programado',
        titulo: `Próximo contacto: ${new Date(fecha).toLocaleDateString('es-ES')}`,
        descripcion: nota || undefined,
        fecha: new Date(fecha).toISOString(),
        resultado: 'callback_pendiente',
      })
      toast.success('Próximo contacto programado')
      onDone()
    } catch (err) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'desconocido' })
    }
  }

  return (
    <form onSubmit={handle} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
      <p className="text-sm font-medium text-slate-900 mb-2">Programar próximo contacto</p>
      <div className="space-y-2">
        <div>
          <Label htmlFor="pc_fecha">Fecha</Label>
          <Input id="pc_fecha" type="date" value={fecha} onChange={e => setFecha(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="pc_nota">Nota</Label>
          <Textarea id="pc_nota" rows={2} value={nota} onChange={e => setNota(e.target.value)} placeholder="Recordar mencionar X..." />
        </div>
      </div>
      <FormFooter onCancel={onCancel} primaryLabel="Programar" disabled={registrar.isPending} />
    </form>
  )
}

/**
 * Form genérico: cambia etapa + opcional registra actividad.
 * Para transiciones simples sin captura de datos extra.
 */
function FormSimpleEtapa({ oportunidadId, nuevaEtapa, tituloFormulario, tituloActividad, tipoActividad, onCancel, onDone }: {
  oportunidadId: string
  nuevaEtapa: string
  tituloFormulario: string
  tituloActividad: string
  tipoActividad: string
  onCancel: () => void
  onDone: () => void
}) {
  const [nota, setNota] = useState('')
  const cambiar = useCambiarEtapa()
  const registrar = useRegistrarActividad()

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await cambiar.mutateAsync({ oportunidadId, etapaOperativa: nuevaEtapa })
      await registrar.mutateAsync({
        oportunidadId,
        tipo: tipoActividad,
        titulo: tituloActividad,
        descripcion: nota || undefined,
      })
      toast.success('Etapa actualizada')
      onDone()
    } catch (err) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'desconocido' })
    }
  }

  return (
    <form onSubmit={handle} className="rounded-lg bg-blue-50 border border-blue-200 p-3">
      <p className="text-sm font-medium text-slate-900 mb-2">{tituloFormulario}</p>
      <Label htmlFor="se_nota">Nota (opcional)</Label>
      <Textarea id="se_nota" rows={2} value={nota} onChange={e => setNota(e.target.value)} placeholder="Contexto, observaciones..." />
      <FormFooter onCancel={onCancel} primaryLabel="Confirmar" disabled={cambiar.isPending || registrar.isPending} />
    </form>
  )
}

/**
 * Form para subir propuesta (analista o asesor senior).
 * Tras subir: marca etapa = propuesta_lista + handoff de vuelta a Carolina A
 * (creadora del lead). El trigger BD aplica responsable_actual_id.
 */
function FormSubirPropuesta({ oportunidadId, empresaId, onCancel, onDone }: {
  oportunidadId: string
  empresaId: string
  onCancel: () => void
  onDone: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cambiar = useCambiarEtapa()
  const registrar = useRegistrarActividad()
  const handoff = useHacerHandoff()

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { setError('Selecciona un archivo'); return }
    const valError = validarFichero(file)
    if (valError) { setError(valError); return }
    setError(null)
    setUploading(true)

    try {
      // 1) Upload
      const result = await subirDocumentoOportunidad({
        file, oportunidadId, empresaId,
        categoria: 'propuestas', tipoDocumento: 'oferta',
      })

      // 2) Buscar el creador original (Carolina A) para handoff de vuelta
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: opData } = await ((await import('../../../core/supabase/client')).supabase as any)
        .from('oportunidades')
        .select('created_by')
        .eq('id', oportunidadId)
        .maybeSingle()
      const creadorId = opData?.created_by as string | null

      // 3) Update etapa + propuesta_documento_id
      try {
        await cambiar.mutateAsync({
          oportunidadId,
          etapaOperativa: 'propuesta_lista',
          propuesta_documento_id: result.documentoId,
        })
      } catch (errStage) {
        toast.warning('Propuesta subida pero falla al actualizar estado', {
          description: 'Reintenta el cambio de etapa. La propuesta no se ha perdido.',
        })
        await registrar.mutateAsync({
          oportunidadId,
          tipo: 'propuesta_subida',
          titulo: `Propuesta subida (${result.nombre})`,
          descripcion: 'Subida correcta. Actualización de estado pendiente — reintentar.',
          adjunto_url: result.rutaStorage,
          adjunto_nombre: result.nombre,
        })
        throw errStage
      }

      // 4) Handoff a Carolina A (creador) si existe
      if (creadorId) {
        try {
          await handoff.mutateAsync({
            oportunidadId,
            toUserId: creadorId,
            motivo: 'propuesta_lista',  // valor válido del CHECK constraint
            etapaOperativaDestino: 'propuesta_lista',
          })
        } catch (errHandoff) {
          toast.warning('Propuesta lista, pero falla devolverla a captación', {
            description: 'La propuesta queda guardada. Reintenta desde el caso si hace falta.',
          })
          throw errHandoff
        }
      }

      await registrar.mutateAsync({
        oportunidadId,
        tipo: 'propuesta_subida',
        titulo: `Propuesta lista — ${result.nombre}`,
        descripcion: 'Propuesta lista para enviar al cliente',
        resultado: 'propuesta_lista',
        adjunto_url: result.rutaStorage,
        adjunto_nombre: result.nombre,
      })

      toast.success('Propuesta lista', {
        description: 'Devuelta a captación para envío al cliente.',
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handle} className="rounded-lg bg-blue-50 border border-blue-200 p-3">
      <p className="text-sm font-medium text-slate-900 mb-2 flex items-center gap-1.5">
        <Upload className="h-4 w-4 text-blue-600" /> Subir propuesta lista
      </p>
      <div className="space-y-2">
        <div>
          <Label htmlFor="sp_file">Archivo ({ACCEPTED_EXT_LABEL})</Label>
          <Input
            id="sp_file"
            type="file"
            accept={ACCEPTED_MIME.join(',')}
            onChange={e => { setFile(e.target.files?.[0] ?? null); setError(null) }}
            required
          />
          {file && (
            <p className="text-xs text-slate-600 mt-0.5">
              {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> {error}
          </p>
        )}
        <p className="text-[11px] text-slate-500">
          Tras subir, la propuesta vuelve automáticamente a Captación para que la envíen al cliente.
        </p>
      </div>
      <FormFooter onCancel={onCancel} primaryLabel={uploading ? 'Subiendo…' : 'Subir y devolver a captación'} disabled={uploading} />
    </form>
  )
}

/* Botón download propuesta — usado fuera del switch por elegancia */
export function DescargarPropuestaInline({ documentoId }: { documentoId: string | null }) {
  const [loading, setLoading] = useState(false)

  if (!documentoId) {
    return (
      <p className="text-xs text-slate-400 italic">
        El analista aún no ha subido la propuesta.
      </p>
    )
  }

  const handle = async () => {
    setLoading(true)
    try {
      const { obtenerDocumento } = await import('../storage')
      const doc = await obtenerDocumento(documentoId)
      if (!doc) {
        toast.error('Documento no encontrado')
        return
      }
      const url = await urlFirmadaDocumento(doc.ruta_storage)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error('Error descargando', { description: err instanceof Error ? err.message : 'desconocido' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handle} disabled={loading}>
      <Download className="h-4 w-4 mr-1.5" />
      {loading ? 'Generando enlace…' : 'Descargar propuesta'}
    </Button>
  )
}
