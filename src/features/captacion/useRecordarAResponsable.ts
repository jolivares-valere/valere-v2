import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'

/**
 * Sprint 2026-05-19 Hallazgo #2: mutación recordar al responsable actual.
 *
 * Flujo:
 *  1. RPC `recordar_a_responsable` crea notificación CRM + actividad timeline
 *     y devuelve datos para email.
 *  2. Edge Function `enviar-recordatorio` manda el email vía Resend.
 *  3. Email es best-effort — si falla, la notificación CRM ya está creada.
 *
 * Separado de api.ts porque el cat-heredoc grande truncaba el archivo.
 */
export function useRecordarAResponsable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { oportunidad_id: string; mensaje: string }) => {
      const { data: rpcData, error: rpcErr } = await (supabase as any).rpc('recordar_a_responsable', {
        p_oportunidad_id: input.oportunidad_id,
        p_mensaje: input.mensaje,
      })
      if (rpcErr) {
        logError(rpcErr, 'useRecordarAResponsable.rpc')
        throw rpcErr
      }
      if (rpcData?.responsable_email && rpcData?.empresa_nombre) {
        try {
          await (supabase as any).functions.invoke('enviar-recordatorio', {
            body: {
              oportunidad_id: input.oportunidad_id,
              mensaje: input.mensaje,
              responsable_email: rpcData.responsable_email,
              responsable_nombre: rpcData.responsable_nombre ?? null,
              empresa_nombre: rpcData.empresa_nombre,
              emisor_nombre: rpcData.emisor_nombre ?? null,
            },
          })
        } catch (e) {
          logError(e, 'useRecordarAResponsable.email')
        }
      }
      return rpcData
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['captacion'] })
      qc.invalidateQueries({ queryKey: ['notificaciones'] })
      qc.invalidateQueries({ queryKey: ['actividades'] })
    },
  })
}
