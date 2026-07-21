import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
        // Separación CRM/Captación: solo contactos de empresas cliente.
        // Filtra por inner-join: empresa con estado_relacion='cliente'
        .select('*, empresa:empresas!contactos_empresa_id_fkey!inner(id, nombre, estado_relacion)', { count: 'exact' })
        .is('deleted_at', null)
        .eq('empresa.estado_relacion', 'cliente')

      const f = options?.filter ?? {}
      const search = f.search as string | undefined
      if (search && search.trim()) {
        const s = search.trim()
        q = q.or(`nombre.ilike.%${s}%,apellidos.ilike.%${s}%,email.ilike.%${s}%`)
      }
      if (f.empresa_id) q = q.eq('empresa_id', f.empresa_id as string)

      const sortField = options?.sort?.field ?? 'nombre'
      const sortAsc = options?.sort?.direction !== 'desc'
      q = q.order(sortField, { ascending: sortAsc }).range(from, to)

      const { data, count, error } = await q
      if (error) { logError(error, 'useContactos'); throw error }
      return { data: (data ?? []) as unknown as ContactoConEmpresa[], count: count ?? 0, page, pageSize }
    },
  })
}

export async function fetchContactosForExport(filter?: {
  search?: string
  empresa_id?: string
}): Promise<ContactoConEmpresa[]> {
  let q = supabase
    .from('contactos')
    .select('*, empresa:empresas!contactos_empresa_id_fkey(id, nombre)')
    .is('deleted_at', null)

  if (filter?.search && filter.search.trim()) {
    const s = filter.search.trim()
    q = q.or(`nombre.ilike.%${s}%,apellidos.ilike.%${s}%,email.ilike.%${s}%`)
  }
  if (filter?.empresa_id) q = q.eq('empresa_id', filter.empresa_id)

  const { data, error } = await q.order('nombre', { ascending: true }).limit(10000)
  if (error) { logError(error, 'fetchContactosForExport'); throw error }
  return (data ?? []) as unknown as ContactoConEmpresa[]
}

export interface ContactoOption {
  id: string
  nombre: string
  apellidos: string | null
  cargo: string | null
  email: string | null
  telefono: string | null
  movil: string | null
  es_decisor: boolean
  es_firmante: boolean
}

export function useContactosPorEmpresa(empresaId: string | null | undefined) {
  return useQuery({
    queryKey: [RESOURCE, 'por-empresa', empresaId],
    enabled: Boolean(empresaId),
    queryFn: async (): Promise<ContactoOption[]> => {
      const { data, error } = await supabase
        .from('contactos')
        .select('id, nombre, apellidos, cargo, email, telefono, movil, es_decisor, es_firmante')
        .eq('empresa_id', empresaId!)
        .is('deleted_at', null)
        .order('nombre', { ascending: true })
      if (error) { logError(error, 'useContactosPorEmpresa'); throw error }
      return (data ?? []) as ContactoOption[]
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
        .insert(input as never)
        .select('*')
        .single()
      if (error) { logError(error, 'useCreateContacto'); throw error }
      return data as unknown as Contacto
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      toast.success('Contacto creado')
    },
    onError: (e) => toast.error('No se pudo crear el contacto', { description: (e as Error).message }),
  })
}

export function useUpdateContacto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ContactoUpdate }) => {
      const { data, error } = await supabase
        .from('contactos')
        .update(patch as never)
        .eq('id', id)
        .select('*')
        .single()
      if (error) { logError(error, 'useUpdateContacto'); throw error }
      return data as unknown as Contacto
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      qc.invalidateQueries({ queryKey: [RESOURCE, 'byId', vars.id] })
      toast.success('Contacto actualizado')
    },
    onError: (e) => toast.error('No se pudo actualizar el contacto', { description: (e as Error).message }),
  })
}

export function useDeleteContacto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft-delete via RPC (fix 21-jul: las policies de lectura deleted_at IS NULL
      // bloquean el UPDATE directo con 42501; la RPC valida permisos espejo del delete)
      const { error } = await supabase.rpc('soft_delete' as never, { p_tabla: 'contactos', p_id: id } as never)
      if (error) { logError(error, 'useDeleteContacto'); throw error }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      toast.success('Contacto eliminado')
    },
    onError: (e) => toast.error('No se pudo eliminar el contacto', { description: (e as Error).message }),
  })
}
