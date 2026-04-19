import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'
import type {
  Documento,
  DocumentoInsert,
  EntidadTipo,
} from '../../core/types/entities'

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
    }: {
      file: File
      entidadTipo: EntidadTipo
      entidadId: string
      descripcion?: string
    }) => {
      const rawExt = file.name.split('.').pop() ?? 'bin'
      const ext = rawExt.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'bin'
      const path = `${entidadTipo}/${entidadId}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) { logError(uploadError, 'uploadDocumento.storage'); throw uploadError }

      const userId = (await supabase.auth.getUser()).data.user?.id ?? null

      const insert: DocumentoInsert = {
        entidad_tipo: entidadTipo,
        entidad_id: entidadId,
        nombre: file.name,
        tipo: ext,
        ruta_storage: path,
        tamanio: file.size,
        mime_type: file.type || null,
        descripcion: descripcion || null,
        subido_por: userId,
      }

      const { data, error } = await supabase
        .from('documentos' as never)
        .insert(insert as never)
        .select('*')
        .single()
      if (error) { logError(error, 'uploadDocumento.insert'); throw error }
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

      const { error } = await supabase
        .from('documentos' as never)
        .update({ deleted_at: new Date().toISOString() } as never)
        .eq('id', id)
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
