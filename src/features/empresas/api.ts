import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'
import { buildQueryKey } from '../../core/hooks/useQueryBase'
import type { QueryOptions, PaginatedResult } from '../../core/types/api'
import type {
  Empresa,
  EmpresaInsert,
  EmpresaUpdate,
} from '../../core/types/entities'

const RESOURCE = 'empresas'

export function useEmpresas(options?: QueryOptions) {
  return useQuery({
    queryKey: buildQueryKey(RESOURCE, options),
    queryFn: async (): Promise<PaginatedResult<Empresa>> => {
      const page = options?.page ?? 1
      const pageSize = options?.pageSize ?? 20
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let q = supabase
        .from('empresas')
        .select('*, comercial:user_profiles!empresas_comercial_id_fkey(id, full_name)', { count: 'exact' })
        .is('deleted_at', null)

      const search = options?.filter?.search as string | undefined
      if (search && search.trim()) {
        const s = search.trim()
        q = q.or(`nombre.ilike.%${s}%,nif.ilike.%${s}%`)
      }

      if (options?.filter?.tipo) q = q.eq('tipo', options.filter.tipo as never)
      if (options?.filter?.segmento) q = q.eq('segmento', options.filter.segmento as never)
      if (options?.filter?.comercial_id) {
        q = q.eq('comercial_id', options.filter.comercial_id as string)
      }

      const sortField = options?.sort?.field ?? 'created_at'
      const sortAsc = options?.sort?.direction === 'asc'
      q = q.order(sortField, { ascending: sortAsc }).range(from, to)

      const { data, count, error } = await q

      if (error) {
        logError(error, 'useEmpresas')
        throw error
      }

      return {
        data: (data ?? []) as unknown as Empresa[],
        count: count ?? 0,
        page,
        pageSize,
      }
    },
  })
}

export function useEmpresaById(id: string | undefined) {
  return useQuery({
    queryKey: [RESOURCE, 'byId', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Empresa | null> => {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', id!)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        logError(error, 'useEmpresaById')
        throw error
      }

      return (data as Empresa | null) ?? null
    },
  })
}

export function useCreateEmpresa() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: EmpresaInsert): Promise<Empresa> => {
      const { data, error } = await supabase
        .from('empresas')
        .insert(input as never)
        .select('*')
        .single()

      if (error) {
        logError(error, 'useCreateEmpresa')
        throw error
      }

      return data as unknown as Empresa
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      toast.success('Empresa creada')
    },
    onError: (e) => toast.error('No se pudo crear la empresa', { description: (e as Error).message }),
  })
}

export function useUpdateEmpresa() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      patch: EmpresaUpdate
    }): Promise<Empresa> => {
      const { data, error } = await supabase
        .from('empresas')
        .update(patch as never)
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        logError(error, 'useUpdateEmpresa')
        throw error
      }

      return data as unknown as Empresa
    },

    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      qc.invalidateQueries({ queryKey: [RESOURCE, 'byId', vars.id] })
      toast.success('Empresa actualizada')
    },
    onError: (e) => toast.error('No se pudo actualizar la empresa', { description: (e as Error).message }),
  })
}

export function useDeleteEmpresa() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('empresas')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        logError(error, 'useDeleteEmpresa')
        throw error
      }
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      toast.success('Empresa eliminada')
    },
    onError: (e) => toast.error('No se pudo eliminar la empresa', { description: (e as Error).message }),
  })
}
