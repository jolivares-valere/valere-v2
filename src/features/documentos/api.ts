import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'
import type {
  Documento,
  DocumentoInsert,
  EntidadTipo,
  TipoDocumento,
} from '../../core/types/entities'

/** Mapa tipo_documento -> columna LEGACY `tipo` (check en minusculas SIN 'dni' ni extensiones).
 *  El codigo heredado escribia la EXTENSION ('pdf') y violaba documentos_tipo_check.
 *  Deuda de esquema anotada en backlog: unificar tipo -> tipo_documento. */
const TIPO_LEGACY: Record<TipoDocumento, string> = {
  contrato: 'contrato',
  factura: 'factura',
  dni: 'documentacion',
  otro: 'otro',
}

/** Slug de nombre de fichero normalizado (nota OCR-ready PR-3.3). */
export function normalizarNombreArchivo(nombreOriginal: string, tipoDocumento: TipoDocumento, fecha: Date): string {
  const sinExt = nombreOriginal.replace(/\.[^.]+$/, '')
  const slug = sinExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'documento'
  const ymd = fecha.toISOString().slice(0, 10).replace(/-/g, '')
  return `${ymd}_${tipoDocumento}_${slug}`
}

const RESOURCE = 'documentos'

export interface DocumentoConUsuario extends Documento {
  subido_por_profile?: { id: string; full_name: string | null } | null
}

export function useDocumentosPorEntidad(entidadTipo: EntidadTipo, entidadId: string | undefined) {
  return useQuery({
    queryKey: [RESOURCE, entidadTipo, entidadId],
    enabled: Boolean(entidadId),
    queryFn: async (): Promise<DocumentoConUsuario[]> => {
      const { data, error } = await supabase
        .from('documentos' as never)
        .select('*, subido_por_profile:user_profiles!documentos_subido_por_fkey(id, full_name)')
        .eq('entidad_tipo' as never, entidadTipo as never)
        .eq('entidad_id' as never, entidadId! as never)
        .is('deleted_at' as never, null)
        .order('created_at' as never, { ascending: false })
      if (error) { logError(error, 'useDocumentosPorEntidad'); throw error }
      return (data ?? []) as unknown as DocumentoConUsuario[]
    },
  })
}

export function useUploadDocumento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      file,
      entidadTipo,
      entidadId,
      descripcion,
      tipoDocumento = 'otro',
      comercializadoraId = null,
    }: {
      file: File
      entidadTipo: EntidadTipo
      entidadId: string
      descripcion?: string
      tipoDocumento?: TipoDocumento
      comercializadoraId?: string | null
    }) => {
      const rawExt = file.name.split('.').pop() ?? 'bin'
      const ext = rawExt.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'bin'
      // Nombre normalizado (OCR-ready): fecha_tipo_slug + sufijo anticolision
      const nombreArchivo = `${normalizarNombreArchivo(file.name, tipoDocumento, new Date())}_${crypto.randomUUID().slice(0, 8)}.${ext}`
      const path = `${entidadTipo}/${entidadId}/${nombreArchivo}`

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) { logError(uploadError, 'uploadDocumento.storage'); throw uploadError }

      const userId = (await supabase.auth.getUser()).data.user?.id ?? null

      const insert: DocumentoInsert = {
        entidad_tipo: entidadTipo,
        entidad_id: entidadId,
        nombre: file.name,
        tipo: TIPO_LEGACY[tipoDocumento],
        tipo_documento: tipoDocumento,
        comercializadora_id: comercializadoraId,
        ruta_storage: path,
        tamano_bytes: file.size,
        nombre_archivo: nombreArchivo,
        nombre_original: file.name,
        mime_type: file.type || null,
        descripcion: descripcion || null,
        subido_por: userId,
      }

      const { data, error } = await supabase
        .from('documentos' as never)
        .insert(insert as never)
        .select('*')
        .single()
      if (error) {
        // Borrado compensatorio: el fichero ya subio; si la fila falla, no dejar huerfano
        // (re-paseo PR-3.3: habia 2 huerfanos de inserts fallidos pre-fix)
        void supabase.storage.from('documentos').remove([path])
        logError(error, 'uploadDocumento.insert')
        throw error
      }
      return data as unknown as Documento
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [RESOURCE, vars.entidadTipo, vars.entidadId] })
      toast.success('Documento subido')
    },
    onError: (e) => toast.error('Error al subir documento', { description: (e as Error).message }),
  })
}

export function useDeleteDocumento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, rutaStorage }: { id: string; rutaStorage: string }) => {
      await supabase.storage.from('documentos').remove([rutaStorage])

      // Soft-delete via RPC (fix 21-jul: las policies de lectura deleted_at IS NULL
      // bloquean el UPDATE directo con 42501; la RPC valida permisos espejo del delete)
      const { error } = await supabase.rpc('soft_delete' as never, { p_tabla: 'documentos', p_id: id } as never)
      if (error) { logError(error, 'useDeleteDocumento'); throw error }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      toast.success('Documento eliminado')
    },
    onError: (e) => toast.error('No se pudo eliminar', { description: (e as Error).message }),
  })
}

export async function getDocumentoSignedUrl(
  rutaStorage: string,
  expiresInSec = 60,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('documentos')
    .createSignedUrl(rutaStorage, expiresInSec)
  if (error || !data?.signedUrl) {
    logError(error, 'getDocumentoSignedUrl')
    throw error ?? new Error('No se pudo generar la URL firmada')
  }
  return data.signedUrl
}
