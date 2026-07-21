import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'
import { buildQueryKey } from '../../core/hooks/useQueryBase'
import type { QueryOptions, PaginatedResult } from '../../core/types/api'
import type {
  Incidencia,
  IncidenciaInsert,
  IncidenciaUpdate,
  TipoIncidencia,
  EstadoIncidencia,
  PrioridadIncidencia,
} from '../../core/types/entities'

const RESOURCE = 'incidencias'

export interface IncidenciaConEmpresa extends Incidencia {
  empresa?: { id: string; nombre: string; nif: string | null } | null
  contrato?: { id: string; numero_contrato: string | null } | null
  asignado?: { id: string; full_name: string | null } | null
}

export interface IncidenciasKPI {
  abiertas: number
  criticas: number
  altas: number
  vencidas: number
}

export function useIncidenciasKPI() {
  return useQuery({
    queryKey: [RESOURCE, 'kpi'],
    queryFn: async (): Promise<IncidenciasKPI> => {
      const { data, error } = await supabase
        .from('v_incidencias_kpi' as never)
        .select('*')
        .maybeSingle()
      if (error) { logError(error, 'useIncidenciasKPI'); throw error }
      return (data as IncidenciasKPI | null) ?? { abiertas: 0, criticas: 0, altas: 0, vencidas: 0 }
    },
  })
}

export function useIncidencias(options?: QueryOptions) {
  return useQuery({
    queryKey: buildQueryKey(RESOURCE, options),
    queryFn: async (): Promise<PaginatedResult<IncidenciaConEmpresa>> => {
      const page = options?.page ?? 1
      const pageSize = options?.pageSize ?? 20
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let q = supabase
        .from('incidencias' as never)
        .select(
          '*, empresa:empresas!incidencias_empresa_id_fkey(id, nombre, nif), contrato:contratos!incidencias_contrato_id_fkey(id, numero_contrato), asignado:user_profiles!incidencias_asignado_a_fkey(id, full_name)',
          { count: 'exact' },
        )
        .is('deleted_at' as never, null)

      const f = options?.filter ?? {}
      if (f.estado) q = q.eq('estado' as never, f.estado as never)
      if (f.tipo) q = q.eq('tipo' as never, f.tipo as never)
      if (f.prioridad) q = q.eq('prioridad' as never, f.prioridad as never)
      if (f.empresa_id) q = q.eq('empresa_id' as never, f.empresa_id as never)
      if (f.asignado_a) q = q.eq('asignado_a' as never, f.asignado_a as never)

      const sortField = (options?.sort?.field ?? 'fecha_apertura') as never
      const sortAsc = options?.sort?.direction === 'asc'
      q = q.order(sortField, { ascending: sortAsc }).range(from, to)

      const { data, count, error } = await q
      if (error) { logError(error, 'useIncidencias'); throw error }
      return { data: (data ?? []) as unknown as IncidenciaConEmpresa[], count: count ?? 0, page, pageSize }
    },
  })
}

export async function fetchIncidenciasForExport(filter?: {
  estado?: EstadoIncidencia
  tipo?: TipoIncidencia
  prioridad?: PrioridadIncidencia
  empresa_id?: string
}): Promise<IncidenciaConEmpresa[]> {
  let q = supabase
    .from('incidencias' as never)
    .select(
      '*, empresa:empresas!incidencias_empresa_id_fkey(id, nombre, nif), contrato:contratos!incidencias_contrato_id_fkey(id, numero_contrato), asignado:user_profiles!incidencias_asignado_a_fkey(id, full_name)',
    )
    .is('deleted_at' as never, null)

  if (filter?.estado) q = q.eq('estado' as never, filter.estado as never)
  if (filter?.tipo) q = q.eq('tipo' as never, filter.tipo as never)
  if (filter?.prioridad) q = q.eq('prioridad' as never, filter.prioridad as never)
  if (filter?.empresa_id) q = q.eq('empresa_id' as never, filter.empresa_id as never)

  const { data, error } = await q.order('fecha_apertura' as never, { ascending: false }).limit(10000)
  if (error) { logError(error, 'fetchIncidenciasForExport'); throw error }
  return (data ?? []) as unknown as IncidenciaConEmpresa[]
}

export function useIncidenciaById(id: string | undefined) {
  return useQuery({
    queryKey: [RESOURCE, 'byId', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidencias' as never)
        .select(
          '*, empresa:empresas!incidencias_empresa_id_fkey(id, nombre, nif), contrato:contratos!incidencias_contrato_id_fkey(id, numero_contrato), asignado:user_profiles!incidencias_asignado_a_fkey(id, full_name)',
        )
        .eq('id' as never, id!)
        .is('deleted_at' as never, null)
        .maybeSingle()
      if (error) { logError(error, 'useIncidenciaById'); throw error }
      return (data as IncidenciaConEmpresa | null) ?? null
    },
  })
}

export function useCreateIncidencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: IncidenciaInsert) => {
      const { data, error } = await supabase
        .from('incidencias' as never)
        .insert(input as never)
        .select('*')
        .single()
      if (error) { logError(error, 'useCreateIncidencia'); throw error }
      return data as unknown as Incidencia
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      toast.success('Incidencia creada')
    },
    onError: (e) => toast.error('No se pudo crear la incidencia', { description: (e as Error).message }),
  })
}

export function useUpdateIncidencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: IncidenciaUpdate }) => {
      const { data, error } = await supabase
        .from('incidencias' as never)
        .update(patch as never)
        .eq('id', id)
        .select('*')
        .single()
      if (error) { logError(error, 'useUpdateIncidencia'); throw error }
      return data as unknown as Incidencia
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      qc.invalidateQueries({ queryKey: [RESOURCE, 'byId', vars.id] })
      toast.success('Incidencia actualizada')
    },
    onError: (e) => toast.error('No se pudo actualizar la incidencia', { description: (e as Error).message }),
  })
}

export function useDeleteIncidencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft-delete via RPC (fix 21-jul: las policies de lectura deleted_at IS NULL
      // bloquean el UPDATE directo con 42501; la RPC valida permisos espejo del delete)
      const { error } = await supabase.rpc('soft_delete' as never, { p_tabla: 'incidencias', p_id: id } as never)
      if (error) { logError(error, 'useDeleteIncidencia'); throw error }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      toast.success('Incidencia eliminada')
    },
    onError: (e) => toast.error('No se pudo eliminar la incidencia', { description: (e as Error).message }),
  })
}
