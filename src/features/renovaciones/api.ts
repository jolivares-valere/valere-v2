import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'
import { buildQueryKey } from '../../core/hooks/useQueryBase'
import type { QueryOptions, PaginatedResult } from '../../core/types/api'
import type {
  Renovacion,
  RenovacionInsert,
  RenovacionUpdate,
  EstadoRenovacion,
  PrioridadRenovacion,
} from '../../core/types/entities'

const RESOURCE = 'renovaciones'

export interface RenovacionConRelaciones extends Renovacion {
  empresa?: { id: string; nombre: string; nif: string | null } | null
  contrato?: {
    id: string
    numero_contrato: string | null
    fecha_fin: string | null
    fecha_inicio: string | null
    compania: string
    cups?: { codigo_cups: string }[] | null
  } | null
  asignado?: { id: string; full_name: string | null } | null
}

export interface RenovacionesKPI {
  activas: number
  criticas: number
  renovadas: number
  perdidas: number
}

export function useRenovacionesKPI() {
  return useQuery({
    queryKey: [RESOURCE, 'kpi'],
    queryFn: async (): Promise<RenovacionesKPI> => {
      const { data, error } = await supabase
        .from('v_renovaciones_kpi' as never)
        .select('*')
        .maybeSingle()
      if (error) { logError(error, 'useRenovacionesKPI'); throw error }
      return (data as RenovacionesKPI | null) ?? { activas: 0, criticas: 0, renovadas: 0, perdidas: 0 }
    },
  })
}

export function useRenovaciones(options?: QueryOptions) {
  return useQuery({
    queryKey: buildQueryKey(RESOURCE, options),
    queryFn: async (): Promise<PaginatedResult<RenovacionConRelaciones>> => {
      const page = options?.page ?? 1
      const pageSize = options?.pageSize ?? 20
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let q = supabase
        .from('renovaciones' as never)
        .select(
          '*, empresa:empresas!renovaciones_empresa_id_fkey(id, nombre, nif), contrato:contratos!renovaciones_contrato_id_fkey(id, numero_contrato, fecha_fin, fecha_inicio, compania, cups(codigo_cups)), asignado:user_profiles!renovaciones_asignado_a_fkey(id, full_name)',
          { count: 'exact' },
        )
        .is('deleted_at' as never, null)

      const f = options?.filter ?? {}
      if (f.estado) q = q.eq('estado' as never, f.estado as never)
      if (f.prioridad) q = q.eq('prioridad' as never, f.prioridad as never)
      if (f.empresa_id) q = q.eq('empresa_id' as never, f.empresa_id as never)
      if (f.asignado_a) q = q.eq('asignado_a' as never, f.asignado_a as never)

      const sortField = (options?.sort?.field ?? 'fecha_vencimiento_contrato') as never
      const sortAsc = options?.sort?.direction === 'asc'
      q = q.order(sortField, { ascending: sortAsc }).range(from, to)

      const { data, count, error } = await q
      if (error) { logError(error, 'useRenovaciones'); throw error }
      return { data: (data ?? []) as unknown as RenovacionConRelaciones[], count: count ?? 0, page, pageSize }
    },
  })
}

export async function fetchRenovacionesForExport(filter?: {
  estado?: EstadoRenovacion
  prioridad?: PrioridadRenovacion
  empresa_id?: string
}): Promise<RenovacionConRelaciones[]> {
  let q = supabase
    .from('renovaciones' as never)
    .select(
      '*, empresa:empresas!renovaciones_empresa_id_fkey(id, nombre, nif), contrato:contratos!renovaciones_contrato_id_fkey(id, numero_contrato, fecha_fin, fecha_inicio, compania, cups(codigo_cups)), asignado:user_profiles!renovaciones_asignado_a_fkey(id, full_name)',
    )
    .is('deleted_at' as never, null)

  if (filter?.estado) q = q.eq('estado' as never, filter.estado as never)
  if (filter?.prioridad) q = q.eq('prioridad' as never, filter.prioridad as never)
  if (filter?.empresa_id) q = q.eq('empresa_id' as never, filter.empresa_id as never)

  const { data, error } = await q.order('fecha_vencimiento_contrato' as never, { ascending: true }).limit(10000)
  if (error) { logError(error, 'fetchRenovacionesForExport'); throw error }
  return (data ?? []) as unknown as RenovacionConRelaciones[]
}

/**
 * Renovación "viva" de un contrato (no renovada, no perdida, no borrada),
 * la más reciente. Fuente ÚNICA de prioridad para el detalle de contrato
 * (PR-1.3): si existe, su `prioridad` manda sobre el cálculo por días.
 */
export function useRenovacionViva(contratoId: string | undefined) {
  return useQuery({
    queryKey: [RESOURCE, 'viva', contratoId],
    enabled: Boolean(contratoId),
    queryFn: async (): Promise<Renovacion | null> => {
      const { data, error } = await supabase
        .from('renovaciones' as never)
        .select('*')
        .eq('contrato_id' as never, contratoId! as never)
        .is('deleted_at' as never, null)
        .not('estado' as never, 'in', '(renovado,perdido)')
        .order('created_at' as never, { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) { logError(error, 'useRenovacionViva'); throw error }
      return (data as Renovacion | null) ?? null
    },
  })
}

export function useCreateRenovacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: RenovacionInsert) => {
      const { data, error } = await supabase
        .from('renovaciones' as never)
        .insert(input as never)
        .select('*')
        .single()
      if (error) { logError(error, 'useCreateRenovacion'); throw error }
      return data as unknown as Renovacion
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      toast.success('Renovación creada')
    },
    onError: (e) => toast.error('No se pudo crear la renovación', { description: (e as Error).message }),
  })
}

export function useUpdateRenovacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: RenovacionUpdate }) => {
      const { data, error } = await supabase
        .from('renovaciones' as never)
        .update(patch as never)
        .eq('id', id)
        .select('*')
        .single()
      if (error) { logError(error, 'useUpdateRenovacion'); throw error }
      return data as unknown as Renovacion
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      qc.invalidateQueries({ queryKey: [RESOURCE, 'byId', vars.id] })
      toast.success('Renovación actualizada')
    },
    onError: (e) => toast.error('No se pudo actualizar', { description: (e as Error).message }),
  })
}

export function useDeleteRenovacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft-delete via RPC (fix 21-jul: las policies de lectura deleted_at IS NULL
      // bloquean el UPDATE directo con 42501; la RPC valida permisos espejo del delete)
      const { error } = await supabase.rpc('soft_delete' as never, { p_tabla: 'renovaciones', p_id: id } as never)
      if (error) { logError(error, 'useDeleteRenovacion'); throw error }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      toast.success('Renovación eliminada')
    },
    onError: (e) => toast.error('No se pudo eliminar', { description: (e as Error).message }),
  })
}
