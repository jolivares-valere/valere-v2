import { useRef, useState } from 'react'
import { Upload, FileText, Trash2, Download } from 'lucide-react'
import { toast } from 'sonner'
import {
  useDocumentosPorEntidad,
  useUploadDocumento,
  useDeleteDocumento,
  getDocumentoSignedUrl,
} from '../api'
import ConfirmDialog from '../../../components/ui/ConfirmDialog'
import { useComercializadorasCanal } from '../../comercializadoras/api'
import type { EntidadTipo, TipoDocumento } from '../../../core/types/entities'

const TIPOS_DOC: { value: TipoDocumento; label: string }[] = [
  { value: 'contrato', label: 'Contrato' },
  { value: 'factura', label: 'Factura' },
  { value: 'dni', label: 'DNI' },
  { value: 'otro', label: 'Otro' },
]
const TIPO_DOC_BADGE: Record<string, string> = {
  contrato: 'bg-emerald-100 text-emerald-800',
  factura: 'bg-sky-100 text-sky-800',
  dni: 'bg-violet-100 text-violet-800',
  otro: 'bg-slate-100 text-slate-600',
}

interface Props {
  entidadTipo: EntidadTipo
  entidadId: string
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function DocumentosTab({ entidadTipo, entidadId }: Props) {
  const { data: docs, isLoading, isError, refetch } = useDocumentosPorEntidad(entidadTipo, entidadId)
  const uploadMut = useUploadDocumento()
  const deleteMut = useDeleteDocumento()
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; ruta: string; nombre: string } | null>(null)
  // PR-3.3: metadatos OCR-ready al subir
  const canales = useComercializadorasCanal()
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [tipoDoc, setTipoDoc] = useState<TipoDocumento>(entidadTipo === 'contrato' ? 'contrato' : 'otro')
  const [comercializadoraId, setComercializadoraId] = useState('')

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setPendingFile(file)
  }

  const handleUpload = async () => {
    if (!pendingFile || uploadMut.isPending) return // guard doble-click (creaba filas duplicadas)
    await uploadMut.mutateAsync({
      file: pendingFile,
      entidadTipo,
      entidadId,
      tipoDocumento: tipoDoc,
      comercializadoraId: comercializadoraId || null,
    })
    setPendingFile(null)
    setComercializadoraId('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const onDeleteConfirmed = async () => {
    if (!confirmDelete) return
    await deleteMut.mutateAsync({ id: confirmDelete.id, rutaStorage: confirmDelete.ruta })
    setConfirmDelete(null)
  }

  const handleDownload = async (ruta: string) => {
    try {
      const url = await getDocumentoSignedUrl(ruta)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      toast.error('No se pudo generar el enlace de descarga', {
        description: (e as Error).message,
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Documentos</h3>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800">
          <Upload className="h-3.5 w-3.5" />
          {uploadMut.isPending ? 'Subiendo…' : 'Subir archivo'}
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={handleFileChosen}
            disabled={uploadMut.isPending}
          />
        </label>
      </div>

      {pendingFile && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="truncate text-sm font-medium text-slate-900">{pendingFile.name}</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Tipo de documento *</span>
              <select value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value as TipoDocumento)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                {TIPOS_DOC.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Comercializadora (si se conoce)</span>
              <select value={comercializadoraId} onChange={(e) => setComercializadoraId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <option value="">—</option>
                {canales.data?.map((c) => <option key={c.id} value={c.id}>{c.nombre_canonico}</option>)}
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setPendingFile(null); if (fileRef.current) fileRef.current.value = '' }} className="rounded-xl px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button type="button" onClick={handleUpload} disabled={uploadMut.isPending} className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white disabled:opacity-60">
              {uploadMut.isPending ? 'Subiendo…' : 'Confirmar subida'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-xs text-red-700">
          Error cargando los documentos.{' '}
          <button type="button" onClick={() => refetch()} className="underline">Reintentar</button>
        </div>
      ) : !docs?.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
          <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-xs text-slate-500">Sin documentos adjuntos</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-medium text-slate-900">
                  <span className="truncate">{doc.nombre}</span>
                  {doc.tipo_documento && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${TIPO_DOC_BADGE[doc.tipo_documento]}`}>
                      {doc.tipo_documento}
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {formatSize(doc.tamano_bytes)} · {doc.tipo?.toUpperCase()}
                  {doc.subido_por_profile?.full_name && ` · ${doc.subido_por_profile.full_name}`}
                </p>
              </div>
              <div className="ml-3 flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => handleDownload(doc.ruta_storage)}
                  className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  aria-label={`Descargar ${doc.nombre}`}
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete({ id: doc.id, ruta: doc.ruta_storage, nombre: doc.nombre })}
                  className="rounded p-1.5 text-red-600 hover:bg-red-50"
                  aria-label={`Eliminar ${doc.nombre}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Eliminar documento"
        message={confirmDelete ? `¿Eliminar "${confirmDelete.nombre}"?` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        submitting={deleteMut.isPending}
        onConfirm={onDeleteConfirmed}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
