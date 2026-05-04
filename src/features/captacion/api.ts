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
  factura_fecha_prevista?: string | null
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

/** Tipo de fila de la vista v_captacion_todos_mis_casos (incluye casos donde fui parte alguna vez) */
export type VTodosMisCasosRow = VMisOportunidadesRow & {
  responsable_actual_nombre: string | null
  responsable_actual_funciones: string[] | null
}

/** Datos detallados para el drawer */
export type OportunidadDetalle = {
  id: string
  nombre: string | null
  tipo: string | null
  etapa: string | null
  etapa_operativa: string | null
  decisor_identificado: boolean | null
  valor_estimado_eur: number | null
  ahorro_anual_estimado: number | null
  factura_fecha_prevista: string | null
  factura_recibida_at: string | null
  factura_documento_id: string | null
  propuesta_documento_id: string | null
  propuesta_enviada_at: string | null
  notas: string | null
  responsable_actual_id: string | null
  created_at: string
  updated_at: string
  empresa: {
    id: string
    nombre: string | null
    nif: string | null
    telefono_principal: string | null
    email_principal: string | null
    ciudad: string | null
    segmento: string | null
  } | null
  contactos: Array<{
    id: string
    nombre: string | null
    cargo: string | null
    telefono: string | null
    email: string | null
    es_decisor: boolean
  }>
}

export type ActividadRow = {
  id: string
  tipo: string
  titulo: string
  descripcion: string | null
  fecha_actividad: string
  resultado: string | null
  usuario_id: string | null
  adjunto_url: string | null
  adjunto_nombre: string | null
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
      // Cast: la vista v_mis_oportunidades devuelve id como string|null en tipos
      // generados (limitación de Postgres views), pero en BD nunca es null porque
      // viene de oportunidades.id (PK). Cast seguro.
      return (data ?? []) as unknown as VMisOportunidadesRow[]
    },
  })
}

/**
 * Vista cross-bandeja: todos los casos donde el user actual fue parte alguna vez
 * (responsable actual, creador o aparece en handoffs).
 *
 * Pensada para Carolina Aroca: aunque haya hecho handoff a analista, sigue viendo
 * el caso en estado read-only para responder al cliente si llama.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAny = supabase as any

export function useTodosMisCasosCaptacion() {
  return useQuery({
    queryKey: ['captacion_todos_mis_casos'],
    queryFn: async (): Promise<VTodosMisCasosRow[]> => {
      // Cast: vista nueva del sprint Día 1, aún no presente en los tipos
      // generados de Supabase. Cuando se regeneren con
      // `npx supabase gen types typescript --project-id <ref> > src/core/types/database.ts`
      // se podrá usar `supabase.from(...)` directo.
      const { data, error } = await supabaseAny
        .from('v_captacion_todos_mis_casos')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) {
        logError(error, 'useTodosMisCasosCaptacion')
        throw error
      }
      return (data ?? []) as VTodosMisCasosRow[]
    },
  })
}

/** Detalle de una oportunidad para el drawer (incluye empresa + contactos) */
export function useOportunidadDetalle(id: string | null) {
  return useQuery({
    queryKey: ['oportunidad_detalle', id],
    enabled: !!id,
    queryFn: async (): Promise<OportunidadDetalle | null> => {
      if (!id) return null
      const { data, error } = await supabase
        .from('oportunidades')
        .select(`
          id, nombre, tipo, etapa, etapa_operativa,
          decisor_identificado, valor_estimado_eur, ahorro_anual_estimado,
          factura_fecha_prevista, factura_recibida_at, factura_documento_id,
          propuesta_documento_id, propuesta_enviada_at, notas,
          responsable_actual_id, created_at, updated_at,
          empresa:empresas (
            id, nombre, nif, telefono_principal, email_principal, ciudad, segmento
          ),
          contactos:contactos (
            id, nombre, cargo, telefono, email, es_decisor
          )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        logError(error, 'useOportunidadDetalle')
        throw error
      }
      return (data ?? null) as unknown as OportunidadDetalle | null
    },
  })
}

/** Timeline de actividades de una oportunidad (orden DESC por fecha) */
export function useActividadesOportunidad(oportunidadId: string | null) {
  return useQuery({
    queryKey: ['actividades_oportunidad', oportunidadId],
    enabled: !!oportunidadId,
    queryFn: async (): Promise<ActividadRow[]> => {
      if (!oportunidadId) return []
      const { data, error } = await supabase
        .from('actividades')
        .select('id, tipo, titulo, descripcion, fecha_actividad, resultado, usuario_id, adjunto_url, adjunto_nombre')
        .eq('entidad_tipo', 'oportunidad')
        .eq('entidad_id', oportunidadId)
        .is('deleted_at', null)
        .order('fecha_actividad', { ascending: false })

      if (error) {
        logError(error, 'useActividadesOportunidad')
        throw error
      }
      return (data ?? []) as ActividadRow[]
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
