import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'
import { buildQueryKey } from '../../core/hooks/useQueryBase'
import type { QueryOptions, PaginatedResult } from '../../core/types/api'
import type { Contacto, ContactoInsert, ContactoUpdate } from '../../core/types/entities'

const RESOURCE = 'contactos'

export interface ContactoConEmpresa extends Contacto {
  empresa?: { id: string; nombre: string } | null
}

export function useContactos(options?: QueryOptions) {
  return useQuery({
    queryKey: buildQueryKey(RESOURCE, options),
    queryFn: async (): Promise<PaginatedResult<ContactoConEmpresa>> => {
      const page = options?.page ?? 1
      const pageSize = options?.pageSize ?? 50
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let q = supabase
        .from('contactos')
        .select('*, empresa:empresas!contactos_empresa_id_fkey(id, nombre)', { count: 'exact' })
        .is('deleted_at', null)

      const f = options?.filter ?? {}
      const search = f.search as string | undefined
      if (search && search.trim()) {
        const s = search.trim()
        q = q.or(`nombre.ilike.%${s}%,apellidos.ilike.%${s}%,email.ilike.%${s}%`)
      }
      if (f.empresa_id) q = q.eq('empresa_id', f.empresa_id)

      const sortField = options?.sort?.field ?? 'nombre'
      const sortAsc = options?.sort?.direction !== 'desc'
      q = q.order(sortField, { ascending: sortAsc }).range(from, to)

      const { data, count, error } = await q
      if (error) { logError(error, 'useContactos'); throw error }
      return { data: (data ?? []) as unknown as ContactoConEmpresa[], count: count ?? 0, page, pageSize }
    },
  })
}

export function useContactoById(id: string | undefined) {
  return useQuery({
    queryKey: [RESOURCE, 'byId', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<ContactoConEmpresa | null> => {
      const { data, error } = await supabase
        .from('contactos')
        .select('*, empresa:empresas!contactos_empresa_id_fkey(id, nombre)')
        .eq('id', id!)
        .is('deleted_at', null)
        .maybeSingle()
      if (error) { logError(error, 'useContactoById'); throw error }
      return (data as ContactoConEmpresa | null) ?? null
    },
  })
}

export function useCreateContacto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ContactoInsert) => {
      const { data, error } = await supabase
        .from('contactos')
        .insert(input as unknown as Record<string, unknown>)
        .select('*')
        .single()
      if (error) { logError(error, 'useCreateContacto'); throw error }
      return data as unknown as Contacto
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [RESOURCE] }),
  })
}

export function useUpdateContacto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ContactoUpdate }) => {
      const { data, error } = await supabase
        .from('contactos')
        .update(patch as unknown as Record<string, unknown>)
        .eq('id', id)
        .select('*')
        .single()
      if (error) { logError(error, 'useUpdateContacto'); throw error }
      return data as unknown as Contacto
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      qc.invalidateQueries({ queryKey: [RESOURCE, 'byId', vars.id] })
    },
  })
}

export function useDeleteContacto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contactos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) { logError(error, 'useDeleteContacto'); throw error }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [RESOURCE] }),
  })
}