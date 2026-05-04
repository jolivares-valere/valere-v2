import { useEffect } from 'react'
import { X, Building2, Phone, Mail, MapPin, User, FileText, Calendar, Activity } from 'lucide-react'
import { useOportunidadDetalle, useActividadesOportunidad, ETAPA_LABELS, ETAPA_COLORS } from '../api'
import { formatDate } from '../../../core/utils/dates'
import { formatEur } from '../../../core/utils/format'

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
  const { data: detalle, isLoading: loadingDetalle } = useOportunidadDetalle(oportunidadId)
  const { data: actividades = [], isLoading: loadingActividades } = useActividadesOportunidad(oportunidadId)

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
            <span
              className={`inline-flex mt-2 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${etapaColor}`}
            >
              {etapaLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
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

              {/* Contactos */}
              {detalle.contactos.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Contactos
                  </h3>
                  <div className="space-y-2">
                    {detalle.contactos.map(c => (
                      <div key={c.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-900">{c.nombre ?? '(sin nombre)'}</p>
                          {c.es_decisor && (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold">
                              Decisor
                            </span>
                          )}
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
              )}

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
              </section>

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

        {/* Footer (placeholder para Día 2-4: aquí van las acciones contextuales) */}
        <div className="border-t border-slate-200 px-5 py-3 bg-slate-50">
          <p className="text-xs text-slate-500 text-center">
            Las acciones contextuales se añaden en Día 2-4 del sprint.
          </p>
        </div>
      </aside>
    </>
  )
}
