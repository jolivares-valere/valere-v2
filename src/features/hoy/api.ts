/**
 * Hooks de datos para la pantalla /hoy (Acciones del día).
 *
 * Diseñado para funcionar idénticamente en producción real y en modo demo:
 * - En producción: queries directas a Supabase, joins resueltos por FK.
 * - En demo (VITE_DEMO_MODE=true): el mock cliente devuelve fixtures con los
 *   joins pre-bakeados; la firma de respuesta es la misma.
 *
 * Estos hooks NO contienen lógica condicional por entorno.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'

const RESOURCE = 'hoy'

// Tipo proyectado para la pantalla /hoy. Mantiene compatibilidad con
// `oportunidades` (real) y con los fixtures demo (joins pre-bakeados).
export interface OpHoy {
  id: string
  titulo: string | null
  etapa: string | null
  etapa_operativa?: string | null
  contexto?: string | null
  tipo: string | null
  valor_estimado_eur?: number | null
  valor_estimado?: number | null
  fecha_siguiente_accion?: string | null
  siguiente_accion?: string | null
  fecha_vencimiento_contrato_prospecto?: string | null
  responsable_actual_id: string | null
  comercial_id: string | null
  updated_at: string
  created_at: string
  deleted_at: string | null
  empresa?: { id: string; nombre: string } | null
}

export interface ContratoHoy {
  id: string
  empresa_id: string
  numero_contrato: string | null
  fecha_fin: string | null
  estado: string
  deleted_at: string | null
}

export interface ProfileHoy {
  id: string
  full_name: string | null
  funciones: string[] | null
}

/**
 * Oportunidades activas (no eliminadas, no cerrada_perdida) con empresa
 * pre-resuelta. Ordenadas por updated_at desc para que el cliente pueda
 * aplicar su propio criterio de prioridad sin perder el orden temporal de
 * fallback.
 *
 * Cast `as any` documentado por CLAUDE.md decisión #2: `Database = any`
 * temporal hasta FASE 20.1. Se quita cuando se regeneren los tipos Supabase.
 */
export function useOportunidadesHoy() {
  return useQuery({
    queryKey: [RESOURCE, 'oportunidades'],
    queryFn: async (): Promise<OpHoy[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q = (supabase as any)
        .from('oportunidades')
        .select('*, empresa:empresas(id, nombre)')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
      const { data, error } = await q
      if (error) {
        logError(error, 'useOportunidadesHoy')
        throw error
      }
      const all = (data ?? []) as OpHoy[]
      return all.filter((o) => o.etapa !== 'cerrada_perdida')
    },
  })
}

/**
 * Contratos vivos (no eliminados) con campos mínimos para calcular
 * vencimientos en cliente. Filtros adicionales (próximos a vencer, por
 * comercial, etc.) los aplica la pantalla.
 */
export function useContratosHoy() {
  return useQuery({
    queryKey: [RESOURCE, 'contratos'],
    queryFn: async (): Promise<ContratoHoy[]> => {
      const { data, error } = await supabase
        .from('contratos')
        .select('id, empresa_id, numero_contrato, fecha_fin, estado, deleted_at')
        .is('deleted_at', null)
      if (error) {
        logError(error, 'useContratosHoy')
        throw error
      }
      return (data ?? []) as ContratoHoy[]
    },
  })
}

/**
 * Mapa de perfiles para resolver responsable_actual_id → full_name.
 * Mínimo: solo id + full_name + funciones.
 */
export function useUserProfilesHoy() {
  return useQuery({
    queryKey: [RESOURCE, 'user-profiles'],
    queryFn: async (): Promise<ProfileHoy[]> => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, funciones')
      if (error) {
        logError(error, 'useUserProfilesHoy')
        throw error
      }
      return (data ?? []) as ProfileHoy[]
    },
  })
}
