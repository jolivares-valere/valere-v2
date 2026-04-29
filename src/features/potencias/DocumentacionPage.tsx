import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, FileText, Download, Trash2, Upload,
  RefreshCw, Search, Building2, ChevronRight, AlertCircle
} from 'lucide-react'
import { supabase } from '@/core/supabase/client'
import { useSupabaseQuery } from '@/core/hooks/useSupabaseQuery'
import { toast } from 'sonner'
import { SkeletonRow } from '@/components/ui/Skeleton'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface DocumentoRow {
  id: string
  entidad_tipo: string
  entidad_id: string
  nombre_archivo: string | null
  ruta_storage: string
  tipo_mime: string | null
  created_at: string
}

interface ExpedienteSimple {
  id: string
  empresas: { nombre: string } | null
  cups: { codigo_cups: string } | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function mimeIcon(mime: string | null) {
  if (!mime) return <FileText className="h-4 w-4 text-slate-400" />
  if (mime.includes('pdf'))   return <FileText className="h-4 w-4 text-red-500" />
  if (mime.includes('image')) return <FileText className="h-4 w-4 text-purple-500" />
  if (mime.includes('word') || mime.includes('document'))
    return <FileText className="h-4 w-4 text-blue-500" />
  if (mime.includes('sheet') || mime.includes('excel'))
    return <FileText className="h-4 w-4 text-green-500" />
  return <FileText className="h-4 w-4 text-slate-400" />
}

const BUCKET = 'documentos'

// ── Página ────────────────────────────────────────────────────────────────────

export default function DocumentacionPage() {
  const [search, setSearch]             = useState('')
  const [uploading, setUploading]       = useState(false)
  const [selectedExpId, setSelectedExpId] = useState('')
  const [docs, setDocs]                 = useState<DocumentoRow[]>([])
  const [docsLoading, setDocsLoading]   = useState(true)

  // Expedientes para selector de subida
  const { data: expedientes } = useSupabaseQuery<ExpedienteSimple>({
    table: 'expedientes',
    select: `id, empresas(nombre), cups(codigo_cups)`,
    filters: [{ column: 'estado', op: 'eq', value: 'activo' }],
    order: { column: 'created_at', ascending: false },
  })

  // Índice expedienteId → datos (para mostrar en tabla)
  const expMap = Object.fromEntries(expedientes.map(e => [e.id, e]))

  const loadDocs = async () => {
    setDocsLoading(true)
    const { data } = await (supabase as any)
      .from('documentos')
      .select('*')
      .eq('entidad_tipo', 'expediente')
      .order('created_at', { ascending: false })
    setDocs((data ?? []) as DocumentoRow[])
    setDocsLoading(false)
  }

  useEffect(() => { loadDocs() }, [])

  const filtered = docs.filter(d => {
    if (!search) return true
    const q = search.toLowerCase()
    const nombre = (d.nombre_archivo ?? '').toLowerCase()
    const empresa = (expMap[d.entidad_id]?.empresas?.nombre ?? '').toLowerCase()
    return nombre.includes(q) || empresa.includes(q)
  })

  // ── Subir archivo ────────────────────────────────────────────────────────

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedExpId) {
      toast.error('Selecciona un expediente y un archivo')
      return
    }
    setUploading(true)
    try {
      const path = `expedientes/${selectedExpId}/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
      if (upErr) throw upErr

      const { error: dbErr } = await (supabase as any).from('documentos').insert({
        entidad_tipo:   'expediente',
        entidad_id:     selectedExpId,
        nombre_archivo: file.name,
        ruta_storage:   path,
        tipo_mime:      file.type || null,
      })
      if (dbErr) throw dbErr

      toast.success(`"${file.name}" subido correctamente`)
      e.target.value = ''
      loadDocs()
    } catch (err) {
      console.error(err)
      toast.error('Error al subir el archivo')
    } finally {
      setUploading(false)
    }
  }

  // ── Descargar ────────────────────────────────────────────────────────────

  const handleDownload = async (doc: DocumentoRow) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.ruta_storage, 60)
    if (error || !data?.signedUrl) { toast.error('No se pudo generar el enlace'); return }
    window.open(data.signedUrl, '_blank')
  }

  // ── Eliminar ─────────────────────────────────────────────────────────────

  const handleDelete = async (doc: DocumentoRow) => {
    if (!confirm(`¿Eliminar "${doc.nombre_archivo}"?`)) return
    await supabase.storage.from(BUCKET).remove([doc.ruta_storage])
    await (supabase as any).from('documentos').delete().eq('id', doc.id)
    toast.success('Documento eliminado')
    loadDocs()
  }

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Documentación</h1>
            <p className="text-sm text-slate-500">Repositorio de documentos vinculados a expedientes</p>
          </div>
          <button onClick={loadDocs} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" title="Actualizar">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">

        {/* Panel subida */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-500" />
            <h2 className="text-sm font-bold text-slate-700">Subir documento</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-slate-500">Expediente *</label>
              <select
                value={selectedExpId}
                onChange={e => setSelectedExpId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Selecciona un expediente...</option>
                {expedientes.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.empresas?.nombre ?? '—'} — {e.cups?.codigo_cups ?? '—'}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-slate-500">Archivo *</label>
              <input
                type="file"
                disabled={!selectedExpId || uploading}
                onChange={handleUpload}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            {uploading && (
              <div className="flex items-center gap-1.5 text-xs text-blue-600">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Subiendo...
              </div>
            )}
          </div>
          {!selectedExpId && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
              <AlertCircle className="h-3.5 w-3.5" />
              Selecciona primero el expediente para activar la subida de archivos.
            </div>
          )}
        </div>

        {/* Buscador */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar documento o empresa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Tabla documentos */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Archivo</th>
                <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500 md:table-cell">Expediente</th>
                <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500 lg:table-cell">Fecha</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={4}><SkeletonRow /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                        <BookOpen className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">Sin documentos</p>
                      <p className="text-xs text-slate-400">
                        Sube archivos vinculados a cada expediente usando el panel de arriba.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(doc => {
                const exp = expMap[doc.entidad_id]
                return (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {mimeIcon(doc.tipo_mime)}
                        <span className="text-sm font-medium text-slate-900 max-w-[200px] truncate">
                          {doc.nombre_archivo ?? doc.ruta_storage.split('/').pop()}
                        </span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {exp ? (
                        <div>
                          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            {exp.empresas?.nombre ?? '—'}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            {exp.cups?.codigo_cups ?? ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">{doc.entidad_id.slice(0, 8)}…</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-slate-500 lg:table-cell">
                      {fmtDate(doc.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {exp && (
                          <Link
                            to={`/potencias/expedientes/${doc.entidad_id}`}
                            className="rounded p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Ver expediente"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        )}
                        <button
                          onClick={() => handleDownload(doc)}
                          className="rounded p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Descargar"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
