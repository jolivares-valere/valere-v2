import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'

/**
 * Sprint 2026-05-19 tarde - Hallazgo #1 Capa A: hooks del calendario interno.
 *
 * Filosofía:
 *   - El calendario es una VISTA sobre oportunidades.fecha_siguiente_accion +
 *     siguiente_accion. NO hay tabla de eventos separada.
 *   - Cualquier cambio en el calendario (reagendar, editar notas, cancelar) se
 *     traduce a UPDATE en oportunidades. Las invalidaciones cascada hacen que
 *     la ficha del cliente y el calendario se mantengan en sincro instantánea.
 */

/** Evento del calendario derivado de una oportunidad */
export type EventoCalendario = {
  id: string
  oportunidad_id: string
  empresa_id: string
  empresa_nombre: string
  empresa_nif: string | null
  empresa_telefono: string | null
  titulo: string
  notas: string | null
  fecha_inicio: Date
  fecha_fin: Date
  tipo: 'llamada' | 'vencimiento' | 'recordatorio'
  etapa_operativa: string | null
}

type FilaSupabase = {
  id: string
  empresa_id: string
  empresa_nombre: string | null
  empresa_nif: string | null
  empresa_telefono: string | null
  siguiente_accion: string | null
  fecha_siguiente_accion: string | null
  fecha_vencimiento_contrato_prospecto: string | null
  etapa_operativa: string | null
}

/**
 * Lee todos los eventos del calendario de Captación: llamadas programadas +
 * vencimientos de contrato. Usa v_captacion_historico_completo para incluir
 * todos los casos en los que el user (o master) tiene visibilidad.
 */
export function useEventosCalendario() {
  return useQuery({
    queryKey: ['captacion', 'calendario'],
    queryFn: async (): Promise<EventoCalendario[]> => {
      const { data, error } = await (supabase as any)
        .from('v_captacion_historico_completo')
        .select('id, empresa_id, empresa_nombre, empresa_nif, empresa_telefono, siguiente_accion, fecha_siguiente_accion, fecha_vencimiento_contrato_prospecto, etapa_operativa')
        .or('fecha_siguiente_accion.not.is.null,fecha_vencimiento_contrato_prospecto.not.is.null')
      if (error) {
        logError(error, 'useEventosCalendario')
        throw error
      }
      const rows = (data ?? []) as FilaSupabase[]
      const eventos: EventoCalendario[] = []
      for (const r of rows) {
        const nombre = r.empresa_nombre ?? 'Sin empresa'
        // Evento 1: llamada programada (fecha_siguiente_accion)
        if (r.fecha_siguiente_accion) {
          const start = new Date(r.fecha_siguiente_accion)
          if (!isNaN(start.getTime())) {
            const end = new Date(start.getTime() + 30 * 60_000) // 30 min default
            eventos.push({
              id: `llamada-${r.id}`,
              oportunidad_id: r.id,
              empresa_id: r.empresa_id,
              empresa_nombre: nombre,
              empresa_nif: r.empresa_nif,
              empresa_telefono: r.empresa_telefono,
              titulo: r.siguiente_accion ?? `Llamar a ${nombre}`,
              notas: r.siguiente_accion,
              fecha_inicio: start,
              fecha_fin: end,
              tipo: 'llamada',
              etapa_operativa: r.etapa_operativa,
            })
          }
        }
        // Evento 2: vencimiento contrato (todo el día)
        if (r.fecha_vencimiento_contrato_prospecto) {
          const start = new Date(r.fecha_vencimiento_contrato_prospecto)
          if (!isNaN(start.getTime())) {
            // Día completo: end = start + 1 día
            const end = new Date(start.getTime() + 24 * 3600_000)
            eventos.push({
              id: `vencimiento-${r.id}`,
              oportunidad_id: r.id,
              empresa_id: r.empresa_id,
              empresa_nombre: nombre,
              empresa_nif: r.empresa_nif,
              empresa_telefono: r.empresa_telefono,
              titulo: `Vence contrato ${nombre}`,
              notas: null,
              fecha_inicio: start,
              fecha_fin: end,
              tipo: 'vencimiento',
              etapa_operativa: r.etapa_operativa,
            })
          }
        }
      }
      return eventos
    },
    staleTime: 30_000,
  })
}

/**
 * Mutación bidireccional: cambia fecha_siguiente_accion (y opcionalmente
 * siguiente_accion = notas) de una oportunidad.
 * Invalida cache cross para que calendario + ficha cliente + bandejas se
 * actualicen instantáneamente.
 */
export function useReagendarEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      oportunidad_id: string
      fecha_siguiente_accion: string | null
      siguiente_accion?: string | null
    }) => {
      // editar_campo_oportunidad acepta solo un campo a la vez - hacemos 2 updates si hace falta
      const { error: e1 } = await (supabase as any).rpc('editar_campo_oportunidad', {
        p_oportunidad_id: input.oportunidad_id,
        p_campo: 'fecha_siguiente_accion',
        p_valor: input.fecha_siguiente_accion ?? '',
      })
      if (e1) {
        logError(e1, 'useReagendarEvento.fecha')
        throw e1
      }
      if (input.siguiente_accion !== undefined) {
        const { error: e2 } = await (supabase as any).rpc('editar_campo_oportunidad', {
          p_oportunidad_id: input.oportunidad_id,
          p_campo: 'siguiente_accion',
          p_valor: input.siguiente_accion ?? '',
        })
        if (e2) {
          logError(e2, 'useReagendarEvento.notas')
          throw e2
        }
      }
      return { oportunidad_id: input.oportunidad_id }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['captacion'] })
      qc.invalidateQueries({ queryKey: ['oportunidades'] })
      qc.invalidateQueries({ queryKey: ['oportunidad'] })
      qc.invalidateQueries({ queryKey: ['mis_oportunidades'] })
      qc.invalidateQueries({ queryKey: ['actividades'] })
    },
  })
}

/** Cancela un evento (pone fecha_siguiente_accion a NULL) */
export function useCancelarEvento() {
  const reagendar = useReagendarEvento()
  return {
    ...reagendar,
    mutate: (oportunidad_id: string) =>
      reagendar.mutate({ oportunidad_id, fecha_siguiente_accion: null }),
    mutateAsync: (oportunidad_id: string) =>
      reagendar.mutateAsync({ oportunidad_id, fecha_siguiente_accion: null }),
  }
}
