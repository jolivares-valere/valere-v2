// ═══════════════════════════════════════════════════════════════════
// DatadisAutorizacionesTab — sección "Datadis" en la ficha de empresa
//
// Botón "Generar autorización" → invoca la Edge Function. Si faltan datos
// críticos (CIF, firmante+DNI, CUPS), muestra panel "Faltan datos" con
// enlaces a completar. Lista las autorizaciones con su estado y descarga.
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Download, AlertTriangle, Plus, ExternalLink, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import StatusBadge, { type StatusVariant } from '../../../core/components/StatusBadge'
import { formatDate } from '../../../core/utils/dates'
import ConfirmDialog from '../../../components/ui/ConfirmDialog'
import {
  useAutorizaciones,
  useGenerarAutorizacion,
  useEliminarAutorizacion,
  descargarDocumentoAutorizacion,
  type EstadoAutorizacion,
  type FaltaDato,
} from '../autorizaciones.api'

interface Props {
  empresaId: string
}

const ESTADO_LABEL: Record<EstadoAutorizacion, string> = {
  borrador: 'Borrador',
  generada: 'Generada',
  enviada_cliente: 'Enviada al cliente',
  firmada: 'Firmada',
  enviada_datadis: 'Enviada a Datadis',
  activa: 'Activa',
  rechazada: 'Rechazada',
  revocada: 'Revocada',
  caducada: 'Caducada',
}

const ESTADO_VARIANT: Record<EstadoAutorizacion, StatusVariant> = {
  borrador: 'neutral',
  generada: 'info',
  enviada_cliente: 'warning',
  firmada: 'accent',
  enviada_datadis: 'warning',
  activa: 'success',
  rechazada: 'danger',
  revocada: 'danger',
  caducada: 'neutral',
}

export default function DatadisAutorizacionesTab({ empresaId }: Props) {
  const { data: autorizaciones, isLoading } = useAutorizaciones(empresaId)
  const generar = useGenerarAutorizacion()
  const eliminar = useEliminarAutorizacion(empresaId)
  const [faltan, setFaltan] = useState<FaltaDato[] | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  async function handleGenerar() {
    setFaltan(null)
    const res = await generar.mutateAsync({ empresa_id: empresaId, alcance_cups: 'todos' })
    if (!res.ok && res.faltan?.length) {
      setFaltan(res.faltan)
      return
    }
    if (res.ok && res.url) {
      // abrir el PDF generado
      window.open(res.url, '_blank')
    }
  }

  async function handleDescargar(documentoId: string | null) {
    if (!documentoId) { toast.error('No hay documento asociado'); return }
    const url = await descargarDocumentoAutorizacion(documentoId)
    if (url) window.open(url, '_blank')
    else toast.error('No se pudo generar el enlace de descarga')
  }

  function enlaceFalta(donde: string): string {
    // donde viene como "empresa/<id>", "empresa/<id>/contactos", "empresa/<id>/cups"
    const parts = donde.split('/')
    if (parts[0] === 'empresa') return `/empresas/${parts[1]}`
    return `/empresas/${empresaId}`
  }

  return (
    <div className="space-y-5">
      {/* Cabecera + acción */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Autorizaciones Datadis</h3>
          <p className="text-xs text-slate-500">
            Genera la autorización de acceso a datos de consumo para esta empresa.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerar}
          disabled={generar.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-valere-blue-dark px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {generar.isPending ? 'Generando…' : 'Generar autorización'}
        </button>
      </div>

      {/* Panel "Faltan datos" */}
      {faltan && faltan.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Faltan datos para generar la autorización</span>
          </div>
          <p className="mt-1 text-xs text-amber-700">
            Completa lo siguiente en el CRM y vuelve a generar:
          </p>
          <ul className="mt-3 space-y-2">
            {faltan.map((f) => (
              <li key={f.campo} className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2">
                <span className="text-sm text-slate-700">{f.etiqueta}</span>
                <Link
                  to={enlaceFalta(f.donde)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-valere-blue-dark hover:underline"
                >
                  Completar <ExternalLink className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lista de autorizaciones */}
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : !autorizaciones || autorizaciones.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">Aún no hay autorizaciones para esta empresa.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Alcance</th>
                <th className="px-4 py-2 font-medium">Generada</th>
                <th className="px-4 py-2 font-medium">Vence</th>
                <th className="px-4 py-2 font-medium">Ref. Datadis</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {autorizaciones.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <StatusBadge variant={ESTADO_VARIANT[a.estado]}>{ESTADO_LABEL[a.estado]}</StatusBadge>
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {a.alcance_cups === 'todos' ? 'Todos los CUPS' : 'Lista (anexo)'}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{a.fecha_generacion ? formatDate(a.fecha_generacion) : '—'}</td>
                  <td className="px-4 py-2 text-slate-600">{a.fecha_vencimiento ? formatDate(a.fecha_vencimiento) : '—'}</td>
                  <td className="px-4 py-2 text-slate-600">{a.referencia_datadis ?? '—'}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-2">
                      {a.documento_id && (
                        <button
                          type="button"
                          onClick={() => handleDescargar(a.documento_id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          <Download className="h-3 w-3" /> PDF
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(a.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" /> Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title="Eliminar autorización"
        message="¿Seguro que quieres eliminar esta autorización? Se borrará también su PDF. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        submitting={eliminar.isPending}
        onConfirm={async () => { if (confirmDelete) { await eliminar.mutateAsync(confirmDelete); setConfirmDelete(null) } }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
