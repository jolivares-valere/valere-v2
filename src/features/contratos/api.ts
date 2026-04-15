import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'
import { buildQueryKey } from '../../core/hooks/useQueryBase'
import type { QueryOptions, PaginatedResult } from '../../core/types/api'
import type {
  Contrato,
  ContratoInsert,
  ContratoUpdate,
  Cups,
} from '../../core/types/entities'

const RESOURCE = 'contratos'

export interface ContratoConEmpresa extends Contrato {
  empresa?: { id: string; nombre: string; nif: string | null } | null
  comercial?: { id: string; nombre_completo: string } | null
}

export function useContratos(options?: QueryOptions) {
  return useQuery({
    queryKey: buildQueryKey(RESOURCE, options),
    queryFn: async (): Promise<PaginatedResult<ContratoConEmpresa>> => {
      const page = options?.page ?? 1
      const pageSize = options?.pageSize ?? 20
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let q = supabase
        .from('contratos')
        .select('*, empresa:empresas(id, nombre, nif), comercial:users_profile(id, nombre_completo)', { count: 'exact' })
        .is('deleted_at', null)

      const f = options?.filter ?? {}
      if (f.estado) q = q.eq('estado', f.estado)
      if (f.empresa_id) q = q.eq('empresa_id', f.empresa_id)
      if (f.comercial_id) q = q.eq('comercial_id', f.comercial_id)
      if (f.compania) q = q.ilike('compania', `%${String(f.compania)}%`)

      const sortField = options?.sort?.field ?? 'fecha_fin'
      const sortAsc = options?.sort?.direction === 'asc'
      q = q.order(sortField, { ascending: sortAsc, nullsFirst: false }).range(from, to)

      const { data, count, error } = await q
      if (error) { logError(error, 'useContratos'); throw error }
      return { data: (data ?? []) as unknown as ContratoConEmpresa[], count: count ?? 0, page, pageSize }
    },
  })
}

export function useContratoById(id: string | undefined) {
  return useQuery({
    queryKey: [RESOURCE, 'byId', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data: contrato, error: e1 } = await supabase
        .from('contratos')
        .select('*, empresa:empresas(id, nombre, nif), comercial:users_profile(id, nombre_completo)')
        .eq('id', id!)
        .is('deleted_at', null)
        .maybeSingle()
      if (e1) { logError(e1, 'useContratoById'); throw e1 }
      if (!contrato) return null

      const { data: cupsList } = await supabase
        .from('cups')
        .select('*')
        .eq('contrato_id', id!)
        .is('deleted_at', null)

      return {
        contrato: contrato as unknown as ContratoConEmpresa,
        cups: (cupsList ?? []) as unknown as Cups[],
      }
    },
  })
}

export function useCreateContrato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ContratoInsert) => {
      const { data, error } = await supabase.from('contratos').insert(input as unknown as Record<string, unknown>).select('*').single()
      if (error) { logError(error, 'useCreateContrato'); throw error }
      return data as unknown as Contrato
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [RESOURCE] }),
  })
}

export function useUpdateContrato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ContratoUpdate }) => {
      const { data, error } = await supabase.from('contratos').update(patch as unknown as Record<string, unknown>).eq('id', id).select('*').single()
      if (error) { logError(error, 'useUpdateContrato'); throw error }
      return data as unknown as Contrato
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      qc.invalidateQueries({ queryKey: [RESOURCE, 'byId', vars.id] })
    },
  })
}

export function useDeleteContrato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contratos').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      if (error) { logError(error, 'useDeleteContrato'); throw error }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [RESOURCE] }),
  })
}
