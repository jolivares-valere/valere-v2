import { useEffect, useState } from 'react'
import { X, Building2, Phone, Mail, MapPin, User, FileText, Calendar, Activity, Pencil, Star, Briefcase, AlertCircle, MessageSquare, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useOportunidadDetalle, useActividadesOportunidad, useConvertirCliente, useAgregarComentario, calcularSemaforoVencimiento, ETAPA_LABELS, ETAPA_COLORS } from '../api'
import { formatDate } from '../../../core/utils/dates'
import { formatEur } from '../../../core/utils/format'
import { useAuth } from '../../../core/hooks/useAuth'
import { Button } from '../../../components/ui/button'
import { Textarea } from '../../../components/ui/textarea'
import OportunidadAcciones, { DescargarPropuestaInline } from './OportunidadAcciones'
import EditarLeadModal from './EditarLeadModal'

interface Props {
  oportunidadId: string | null
  onClose: () => void
}

/**
 * Drawer lateral con detalle de una oportunidad.
 *
 * Día 1: solo lectura (cabecera + datos empresa/contactos + timeline actividades).
 * Día 2-4: se irán añadiendo botones de acción contextuales por etapa.
 *
 * Origen: docs/SPRINT_OPERATIVO_CAPTACION_2026-05-04.md
 */
export default function OportunidadDrawer({ oportunidadId, onClose }: Props) {
  const open = !!oportunidadId
  const { user } = useAuth()
  const { data: detalle, isLoading: loadingDetalle } = useOportunidadDetalle(oportunidadId)
  const { data: actividades = [], isLoading: loadingActividades } = useActividadesOportunidad(oportunidadId)
  const [editarOpen, setEditarOpen] = useState(false)
  const convertirCliente = useConvertirCliente()
  const agregarComentario = useAgregarComentario(oportunidadId)
  const [comentarioOpen, setComentarioOpen] = useState(false)
  const [comentarioTexto, setComentarioTexto] = useState('')

  // Puede editar: responsable actual, creador, o admin
  const puedeEditar = !!detalle && !!user && (
    detalle.responsable_actual_id === user.id
    || (user.funciones ?? []).includes('admin')
    || user.role === 'master'
  )

  // Sprint C 2026-05-05: visibilidad post-handoff
  const userFuncionesLower = user?.funciones ?? []
  const esResponsable = !!detalle && !!user && detalle.responsable_actual_id === user.id
  const esCreador    = !!detalle && !!user && detalle.created_by === user.id
  const esAdminSenior = !!user && (
    userFuncionesLower.includes('admin') ||
    userFuncionesLower.includes('asesor_senior') ||
    user.role === 'master'
  )
  // Solo seguimiento: soy creador pero ya no soy el responsable actual.
  // En este modo, banner azul + botón comentar; sin botones de cambio de etapa.
  const esSoloSeguimiento = !!detalle && !!user && esCreador && !esResponsable && !esAdminSenior
  // Puede añadir comentario: cualquier "parte" legítima del caso (RPC valida igual).
  const puedeComentar = !!detalle && !!user && (esResponsable || esCreador || esAdminSenior)

  // Es prospecto: empresa no es cliente (ej. captación o ya marcada)
  const esProspecto = detalle?.empresa?.estado_relacion === 'prospecto'

  // Puede convertir a cliente CRM: solo admin/asesor_senior + es prospecto + etapa indica cierre real
  const userFunciones = user?.funciones ?? []
  const puedeConvertir = !!detalle && !!user && esProspecto && (
    userFunciones.includes('admin') ||
    userFunciones.includes('asesor_senior') ||
    user.role === 'master'
  ) && (
    detalle.etapa === 'cerrada_ganada' ||
    detalle.etapa === 'contrato_firmado' ||
    detalle.etapa === 'activo'
  )

  const handleEnviarComentario = async () => {
    const texto = comentarioTexto.trim()
    if (!texto) {
      toast.error('El comentario está vacío')
      return
    }
    try {
      await agregarComentario.mutateAsync(texto)
      toast.success('Comentario añadido')
      setComentarioTexto('')
      setComentarioOpen(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message
        : (typeof err === 'object' && err !== null && 'message' in err
          && typeof (err as { message: unknown }).message === 'string')
          ? (err as { message: string }).message
          : 'Error desconocido'
      toast.error('No se pudo añadir el comentario', { description: msg })
    }
  }

  const handleConvertir = async () => {
    if (!detalle?.empresa?.id) return
    const empresaNombre = detalle.empresa.nombre ?? 'esta empresa'
    const ok = window.confirm(
      `Esto moverá "${empresaNombre}" al CRM de clientes.\n\n` +
      `A partir de ahora aparecerá en Empresas, Contactos, Contratos y gestión operativa del CRM.\n\n` +
      `Esta acción es difícil de revertir. ¿Confirmar?`
    )
    if (!ok) return
    try {
      await convertirCliente.mutateAsync({
        empresaId: detalle.empresa.id,
        oportunidadId: detalle.id,
      })
      toast.success('Empresa promocionada a cliente CRM', {
        description: 'Ya aparece en /empresas, /contactos y resto del CRM.',
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message
        : (typeof err === 'object' && err !== null && 'message' in err
          && typeof (err as { message: unknown }).message === 'string')
          ? (err as { message: string }).message
          : 'Error desconocido'
      toast.error('No se pudo convertir', { description: msg })
    }
  }

  // Cierre con ESC
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const etapa = detalle?.etapa_operativa ?? 'sin_etapa'
  const etapaLabel = ETAPA_LABELS[etapa] ?? etapa
  const etapaColor = ETAPA_COLORS[etapa] ?? 'bg-slate-50 border-slate-200 text-slate-700'

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 h-screen w-full sm:w-[520px] bg-white shadow-xl z-50 flex flex-col border-l border-slate-200"
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de oportunidad"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Oportunidad</p>
            <h2 className="text-lg font-semibold text-slate-900 truncate">
              {detalle?.empresa?.nombre ?? (loadingDetalle ? 'Cargando…' : 'Sin empresa')}
            </h2>
            {detalle?.empresa?.nif && (
              <p className="text-xs text-slate-500 mt-0.5">{detalle.empresa.nif}</p>
            )}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${etapaColor}`}
              >
                {etapaLabel}
              </span>
              {esProspecto && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border border-amber-300 bg-amber-50 text-amber-800"
                  title="Prospecto: aún no es cliente del CRM"
                >
                  <AlertCircle className="h-3 w-3" />
                  PROSPECTO
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {puedeEditar && (
              <button
                type="button"
                onClick={() => setEditarOpen(true)}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200"
                aria-label="Editar datos del lead"
                title="Editar datos del lead"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {loadingDetalle && (
            <div className="space-y-2">
              <div className="h-4 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse" />
            </div>
          )}

          {detalle && (
            <>
              {/* Sprint C 2026-05-05: Responsable / Creador (visibilidad post-handoff) */}
              {(detalle.responsable || detalle.creador) && (
                <section className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 space-y-1 text-xs">
                  {detalle.responsable && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Responsable actual</span>
                      <span className="font-medium text-slate-900 truncate">
                        {detalle.responsable.full_name ?? '—'}
                        {detalle.responsable.funciones && detalle.responsable.funciones.length > 0 && (
                          <span className="text-slate-400 font-normal ml-1">
                            ({detalle.responsable.funciones[0]})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {detalle.creador && detalle.creador.id !== detalle.responsable?.id && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Creado por</span>
                      <span className="font-medium text-slate-900 truncate">
                        {detalle.creador.full_name ?? '—'}
                        {detalle.creador.funciones && detalle.creador.funciones.length > 0 && (
                          <span className="text-slate-400 font-normal ml-1">
                            ({detalle.creador.funciones[0]})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </section>
              )}

              {/* Banner "Solo seguimiento" para creadora cuando ya hizo handoff */}
              {esSoloSeguimiento && (
                <section className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 flex items-start gap-2">
                  <Eye className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-900">
                    Este caso está siendo gestionado por <strong>{detalle.responsable?.full_name ?? 'otra persona'}</strong>.
                    Puedes hacer seguimiento y añadir comentarios, pero las acciones de cambio de etapa las hace quien lo lleva.
                  </div>
                </section>
              )}

              {/* Resumen económico */}
              {(detalle.valor_estimado_eur || detalle.ahorro_anual_estimado) && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Importes</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {detalle.valor_estimado_eur != null && (
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-[10px] text-slate-500 uppercase">Valor estimado</p>
                        <p className="text-base font-semibold text-slate-900">{formatEur(detalle.valor_estimado_eur)}</p>
                      </div>
                    )}
                    {detalle.ahorro_anual_estimado != null && (
                      <div className="rounded-lg bg-emerald-50 px-3 py-2">
                        <p className="text-[10px] text-emerald-700 uppercase">Ahorro anual estimado</p>
                        <p className="text-base font-semibold text-emerald-800">{formatEur(detalle.ahorro_anual_estimado)}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Empresa */}
              {detalle.empresa && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Empresa
                  </h3>
                  <div className="space-y-1.5 text-sm">
                    {detalle.empresa.telefono_principal && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>{detalle.empresa.telefono_principal}</span>
                      </div>
                    )}
                    {detalle.empresa.email_principal && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <a href={`mailto:${detalle.empresa.email_principal}`} className="text-valere-blue-dark hover:underline">
                          {detalle.empresa.email_principal}
                        </a>
                      </div>
                    )}
                    {detalle.empresa.ciudad && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span>{detalle.empresa.ciudad}</span>
                      </div>
                    )}
                    {detalle.empresa.segmento && (
                      <div className="text-xs text-slate-500">Segmento: {detalle.empresa.segmento}</div>
                    )}
                  </div>
                </section>
              )}

              {/* Contactos — guard null + ordenado por es_principal primero */}
              {(() => {
                const contactos = (detalle.contactos ?? []).slice().sort((a, b) => {
                  // Principal arriba; luego decisor; luego por id (orden de creación aproximado)
                  if (a.es_principal && !b.es_principal) return -1
                  if (!a.es_principal && b.es_principal) return 1
                  if (a.es_decisor && !b.es_decisor) return -1
                  if (!a.es_decisor && b.es_decisor) return 1
                  return 0
                })
                if (contactos.length === 0) return null
                return (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Contactos ({contactos.length})
                  </h3>
                  <div className="space-y-2">
                    {contactos.map(c => (
                      <div
                        key={c.id}
                        className={`rounded-lg border px-3 py-2 text-sm ${
                          c.es_principal
                            ? 'border-amber-300 bg-amber-50/40'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-slate-900 flex items-center gap-1.5">
                            {c.es_principal && (
                              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-600 shrink-0" aria-label="Contacto principal" />
                            )}
                            {c.nombre ?? '(sin nombre)'}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            {c.es_principal && (
                              <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-200 text-amber-700 px-2 py-0.5 text-[10px] font-semibold">
                                Principal
                              </span>
                            )}
                            {c.es_decisor && (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold">
                                Decisor
                              </span>
                            )}
                          </div>
                        </div>
                        {c.cargo && <p className="text-xs text-slate-500">{c.cargo}</p>}
                        <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                          {c.telefono && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{c.telefono}</div>}
                          {c.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{c.email}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                )
              })()}

              {/* Datos clave de la fase actual */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Estado del caso
                </h3>
                <dl className="space-y-1.5 text-sm">
                  {detalle.factura_fecha_prevista && (
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Factura prometida para</dt>
                      <dd className="text-slate-900 font-medium">{formatDate(detalle.factura_fecha_prevista, 'short')}</dd>
                    </div>
                  )}
                  {detalle.factura_recibida_at && (
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Factura recibida</dt>
                      <dd className="text-slate-900 font-medium">{formatDate(detalle.factura_recibida_at, 'short')}</dd>
                    </div>
                  )}
                  {detalle.propuesta_enviada_at && (
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Propuesta enviada</dt>
                      <dd className="text-slate-900 font-medium">{formatDate(detalle.propuesta_enviada_at, 'short')}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Decisor identificado</dt>
                    <dd className="text-slate-900 font-medium">{detalle.decisor_identificado ? 'Sí' : 'No'}</dd>
                  </div>
                </dl>

                {/* Botones de descarga si hay documentos asociados */}
                {(detalle.factura_documento_id || detalle.propuesta_documento_id) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {detalle.factura_documento_id && (
                      <DescargarPropuestaInline documentoId={detalle.factura_documento_id} />
                    )}
                    {detalle.propuesta_documento_id && (
                      <DescargarPropuestaInline documentoId={detalle.propuesta_documento_id} />
                    )}
                  </div>
                )}
              </section>

              {/* Vencimiento contrato actual del prospecto (semáforo 90/60/30).
                  Hotfix Sprint C 2026-05-05: la sección se muestra SIEMPRE en
                  contexto captación (aunque la fecha sea null) para que Carolina
                  vea si está registrada o no. Antes solo aparecía cuando existía
                  fecha, lo que confundía: "¿lo guardé bien o no?". */}
              {esProspecto && (() => {
                const fecha = detalle.fecha_vencimiento_contrato_prospecto
                const sem = calcularSemaforoVencimiento(fecha)
                const colorClasses: Record<typeof sem.color, string> = {
                  verde:    'bg-green-50 border-green-200 text-green-800',
                  amarillo: 'bg-yellow-50 border-yellow-200 text-yellow-800',
                  naranja:  'bg-orange-50 border-orange-300 text-orange-800',
                  rojo:     'bg-red-50 border-red-300 text-red-800',
                  vencido:  'bg-slate-100 border-slate-300 text-slate-700',
                  sin_dato: 'bg-slate-50 border-slate-200 text-slate-500',
                }
                return (
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Vencimiento contrato actual del prospecto
                    </h3>
                    {fecha ? (
                      <div className={`rounded-lg border px-3 py-2 ${colorClasses[sem.color]}`}>
                        <div className="text-sm font-semibold">
                          {formatDate(fecha, 'short')}
                        </div>
                        <div className="text-xs mt-0.5">{sem.label}</div>
                        {detalle.fuente_vencimiento_contrato_prospecto && (
                          <div className="text-[11px] mt-1 opacity-80">
                            Fuente: {detalle.fuente_vencimiento_contrato_prospecto}
                          </div>
                        )}
                        {detalle.notas_vencimiento_contrato_prospecto && (
                          <div className="text-xs mt-1 italic opacity-90">
                            {detalle.notas_vencimiento_contrato_prospecto}
                          </div>
                        )}
                      </div>
                    ) : (
                      // Hotfix Sprint C: si no hay fecha, mostrar placeholder en
                      // lugar de ocultar la sección. Carolina necesita saber si
                      // el dato está registrado o no.
                      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        Sin fecha registrada. Edita el lead para añadir la fecha de vencimiento del contrato actual y activar el semáforo 90/60/30 días.
                      </div>
                    )}
                  </section>
                )
              })()}

              {/* Convertir prospecto a cliente CRM */}
              {puedeConvertir && (
                <section className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-800 mb-2 flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" />
                    Convertir a cliente CRM
                  </h3>
                  <p className="text-xs text-emerald-900 mb-2">
                    Esta oportunidad parece cerrada. Si el contrato está firmado de verdad, promociona la empresa a cliente del CRM. Aparecerá en /empresas, /contactos, /contratos y resto del CRM.
                  </p>
                  <Button
                    type="button"
                    onClick={handleConvertir}
                    disabled={convertirCliente.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    size="sm"
                  >
                    {convertirCliente.isPending ? 'Convirtiendo…' : 'Convertir a cliente CRM'}
                  </Button>
                </section>
              )}

              {/* Notas */}
              {detalle.notas && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Notas
                  </h3>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
                    {detalle.notas}
                  </p>
                </section>
              )}

              {/* Sprint C: Añadir comentario interno (visible para responsable, creador, admin/senior) */}
              {puedeComentar && (
                <section>
                  {!comentarioOpen ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setComentarioOpen(true)}
                      className="w-full"
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                      Añadir comentario
                    </Button>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Comentario interno
                      </h3>
                      <Textarea
                        autoFocus
                        rows={3}
                        value={comentarioTexto}
                        onChange={e => setComentarioTexto(e.target.value)}
                        placeholder="Contexto, observación, recordatorio…"
                        maxLength={4000}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setComentarioOpen(false)
                            setComentarioTexto('')
                          }}
                          disabled={agregarComentario.isPending}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleEnviarComentario}
                          disabled={agregarComentario.isPending || comentarioTexto.trim().length === 0}
                        >
                          {agregarComentario.isPending ? 'Añadiendo…' : 'Añadir comentario'}
                        </Button>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Timeline actividades */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  Actividad ({actividades.length})
                </h3>
                {loadingActividades && (
                  <p className="text-sm text-slate-400">Cargando actividad…</p>
                )}
                {!loadingActividades && actividades.length === 0 && (
                  <p className="text-sm text-slate-400 italic">Sin actividad registrada todavía.</p>
                )}
                {!loadingActividades && actividades.length > 0 && (
                  <ol className="relative border-l border-slate-200 ml-2 space-y-3">
                    {actividades.map(act => (
                      <li key={act.id} className="ml-4">
                        <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-white bg-valere-blue-dark"></div>
                        <p className="text-sm font-medium text-slate-900">{act.titulo}</p>
                        <p className="text-[11px] text-slate-400">
                          {formatDate(act.fecha_actividad, 'relative')} · {act.tipo}
                        </p>
                        {act.descripcion && (
                          <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{act.descripcion}</p>
                        )}
                        {act.resultado && (
                          <p className="text-xs text-slate-500 mt-1">
                            Resultado: <span className="text-slate-700">{act.resultado}</span>
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          )}
        </div>

        {/* Footer — acciones contextuales por etapa.
            max-h + overflow-y-auto: si un form interno (subir factura, cerrar
            perdida, etc.) crece, scrollea dentro del propio footer en vez de
            empujar los botones fuera de pantalla.
            Sprint C: solo visible para responsable o admin/senior. La creadora
            que ya hizo handoff (esSoloSeguimiento) no ve botones de cambio de
            etapa para evitar pisar el flujo del que ahora gestiona el caso. */}
        {detalle && (esResponsable || esAdminSenior) && (
          <div className="border-t border-slate-200 px-5 py-3 bg-slate-50 max-h-[60vh] overflow-y-auto shrink-0">
            <OportunidadAcciones detalle={detalle} onClose={onClose} />
          </div>
        )}
      </aside>

      {/* Modal de edición del lead — solo monta cuando puedeEditar y hay detalle */}
      {detalle && puedeEditar && (
        <EditarLeadModal
          open={editarOpen}
          onOpenChange={setEditarOpen}
          detalle={detalle}
        />
      )}
    </>
  )
}
