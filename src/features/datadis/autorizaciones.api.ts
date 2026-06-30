// ═══════════════════════════════════════════════════════════════════
// autorizaciones.api.ts — API de autorizaciones Datadis
//
// Hooks para listar autorizaciones de una empresa y generarlas vía la
// Edge Function datadis-generar-autorizacion (que valida datos críticos,
// genera el PDF, lo guarda en documentos y registra la autorización).
// ═══════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '../../core/supabase/client'

export type EstadoAutorizacion =
  | 'borrador' | 'generada' | 'enviada_cliente' | 'firmada'
  | 'enviada_datadis' | 'activa' | 'rechazada' | 'revocada' | 'caducada'

export interface DatadisAutorizacion {
  id: string
  empresa_id: string
  contacto_firmante_id: string | null
  calidad_firmante: string | null
  alcance_cups: 'todos' | 'lista'
  cups_ids: string[]
  estado: EstadoAutorizacion
  documento_id: string | null
  finalidad: string | null
  metodo_verificacion: string | null
  referencia_datadis: string | null
  fecha_generacion: string | null
  fecha_envio_cliente: string | null
  fecha_firma: string | null
  fecha_envio_datadis: string | null
  fecha_activacion: string | null
  fecha_vencimiento: string | null
  fecha_revocacion: string | null
  notas: string | null
  created_at: string
}

export interface FaltaDato {
  campo: string
  etiqueta: string
  donde: string
}

export interface GenerarResult {
  ok: boolean
  autorizacion_id?: string
  documento_id?: string
  url?: string | null
  nombre?: string
  faltan?: FaltaDato[]
  mensaje?: string
  error?: string
}

const RESOURCE = 'datadis_autorizaciones'

export function useAutorizaciones(empresaId: string | null) {
  return useQuery({
    queryKey: [RESOURCE, empresaId],
    enabled: !!empresaId,
    queryFn: async (): Promise<DatadisAutorizacion[]> => {
      const { data, error } = await supabase
        .from(RESOURCE as never)
        .select('*')
        .eq('empresa_id' as never, empresaId as never)
        .order('created_at' as never, { ascending: false } as never)
      if (error) throw error
      return (data ?? []) as unknown as DatadisAutorizacion[]
    },
  })
}

export interface GenerarInput {
  empresa_id: string
  contacto_firmante_id?: string | null
  alcance_cups?: 'todos' | 'lista'
  cups_ids?: string[]
}

export function useGenerarAutorizacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: GenerarInput): Promise<GenerarResult> => {
      const { data, error } = await supabase.functions.invoke('datadis-generar-autorizacion', {
        body: input,
      })
      // La EF devuelve 422 con { ok:false, faltan } — supabase-js lo trata como error de función,
      // pero el cuerpo viaja en error.context. Normalizamos.
      if (error) {
        // Intentar extraer el body JSON del error de la función
        type FnError = { context?: { json?: () => Promise<GenerarResult> } }
        const ctx = (error as unknown as FnError).context
        if (ctx?.json) {
          try {
            const body = await ctx.json()
            if (body && body.ok === false) return body
          } catch { /* noop */ }
        }
        throw error
      }
      return data as GenerarResult
    },
    onSuccess: (res, vars) => {
      if (res.ok) {
        qc.invalidateQueries({ queryKey: [RESOURCE, vars.empresa_id] })
        qc.invalidateQueries({ queryKey: ['documentos', 'empresa', vars.empresa_id] })
        toast.success('Autorización generada')
      }
      // si !res.ok (faltan datos), el componente lo muestra; no es un error duro
    },
    onError: (e) => toast.error('Error al generar la autorización', { description: (e as Error).message }),
  })
}

export function useEliminarAutorizacion(empresaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (autorizacionId: string): Promise<void> => {
      const { data, error } = await supabase.functions.invoke('datadis-eliminar-autorizacion', {
        body: { autorizacion_id: autorizacionId },
      })
      if (error) throw error
      const res = data as { ok: boolean; error?: string }
      if (!res?.ok) throw new Error(res?.error ?? 'No se pudo eliminar')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE, empresaId] })
      qc.invalidateQueries({ queryKey: ['documentos', 'empresa', empresaId] })
      toast.success('Autorización eliminada')
    },
    onError: (e) => toast.error('Error al eliminar', { description: (e as Error).message }),
  })
}

// Descargar el PDF de una autorización (signed URL del documento)
export async function descargarDocumentoAutorizacion(documentoId: string): Promise<string | null> {
  const { data: doc, error } = await supabase
    .from('documentos' as never)
    .select('ruta_storage' as never)
    .eq('id' as never, documentoId as never)
    .single()
  if (error || !doc) return null
  const ruta = (doc as unknown as { ruta_storage: string }).ruta_storage
  const { data: signed } = await supabase.storage.from('documentos').createSignedUrl(ruta, 300)
  return signed?.signedUrl ?? null
}
