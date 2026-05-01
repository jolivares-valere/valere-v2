import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'

/** Tipo de fila de la vista v_mis_oportunidades (MVP captación) */
export type VMisOportunidadesRow = {
  id: string
  empresa_id: string
  empresa_nombre: string | null
  empresa_nif: string | null
  tipo: string | null
  etapa: string | null
  etapa_operativa: string | null
  decisor_identificado: boolean | null
  responsable_actual_id: string | null
  factura_recibida_at: string | null
  factura_documento_id: string | null
  propuesta_documento_id: string | null
  propuesta_enviada_at: string | null
  visita_programada_at: string | null
  valor_estimado_eur: number | null
  ahorro_anual_estimado: number | null
  created_at: string
  updated_at: string
}

export function useMisOportunidades() {
  return useQuery({
    queryKey: ['mis_oportunidades'],
    queryFn: async (): Promise<VMisOportunidadesRow[]> => {
      const { data, error } = await supabase
        .from('v_mis_oportunidades')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) {
        logError(error, 'useMisOportunidades')
        throw error
      }
      return (data ?? [])
    },
  })
}

export function agruparPorEtapa(
  oportunidades: VMisOportunidadesRow[],
): Record<string, VMisOportunidadesRow[]> {
  const resultado: Record<string, VMisOportunidadesRow[]> = {}
  for (const op of oportunidades) {
    const etapa = op.etapa_operativa ?? 'sin_etapa'
    if (!resultado[etapa]) {
      resultado[etapa] = []
    }
    resultado[etapa].push(op)
  }
  return resultado
}

export const ETAPA_LABELS: Record<string, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  esperando_factura: 'Esperando factura',
  factura_recibida: 'Factura recibida',
  en_analisis: 'En análisis',
  propuesta_lista: 'Propuesta lista',
  propuesta_en_preparacion: 'Propuesta en preparación',
  propuesta_enviada: 'Propuesta enviada',
  asignada_a_senior: 'Asignada a senior',
  seguimiento: 'Seguimiento',
  cerrado_ganada: 'Cerrado - Ganada',
  cerrado_perdida: 'Cerrado - Perdida',
}

export const ETAPA_COLORS: Record<string, string> = {
  nuevo: 'bg-slate-50 border-slate-200 text-slate-700',
  contactado: 'bg-slate-50 border-slate-200 text-slate-700',
  esperando_factura: 'bg-amber-50 border-amber-200 text-amber-700',
  factura_recibida: 'bg-amber-50 border-amber-200 text-amber-700',
  en_analisis: 'bg-blue-50 border-blue-200 text-blue-700',
  propuesta_lista: 'bg-blue-50 border-blue-200 text-blue-700',
  propuesta_en_preparacion: 'bg-blue-50 border-blue-200 text-blue-700',
  propuesta_enviada: 'bg-purple-50 border-purple-200 text-purple-700',
  asignada_a_senior: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  seguimiento: 'bg-purple-50 border-purple-200 text-purple-700',
  cerrado_ganada: 'bg-green-50 border-green-200 text-green-700',
  cerrado_perdida: 'bg-gray-50 border-gray-200 text-gray-700',
}
