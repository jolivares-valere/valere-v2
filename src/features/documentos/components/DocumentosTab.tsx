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
import type { EntidadTipo } from '../../../core/types/entities'

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
  const { data: docs, isLoading } = useDocumentosPorEntidad(entidadTipo, entidadId)
  const uploadMut = useUploadDocumento()
  const deleteMut = useDeleteDocumento()
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; ruta: string; nombre: string } | null>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadMut.mutateAsync({ file, entidadTipo, entidadId })
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
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800">
          <Upload className="h-3.5 w-3.5" />
          {uploadMut.isPending ? 'Subiendo…' : 'Subir archivo'}
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
            disabled={uploadMut.isPending}
          />
        </label>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : !docs?.length ? (
        <div className="rounded-md border border-dashed border-slate-300 p-6 text-center">
          <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-xs text-slate-500">Sin documentos adjuntos</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{doc.nombre}</p>
                <p className="text-xs text-slate-500">
                  {formatSize(doc.tamanio)} · {doc.tipo?.toUpperCase()}
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
