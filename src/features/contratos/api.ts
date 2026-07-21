import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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

export interface ContratoPorVencer {
  id: string
  numero_contrato: string | null
  empresa_id: string
  fecha_fin: string
  dias_restantes: number
  estado_alerta: 'critica' | 'proxima' | 'futura'
  empresa_nombre: string
}

export interface ResumenVencimientos {
  criticas: number
  proximas: number
  futuras: number
  total: number
}

export function useResumenVencimientos(comercialId?: string | null) {
  return useQuery({
    queryKey: [RESOURCE, 'resumen-vencimientos', comercialId ?? null],
    queryFn: async (): Promise<ResumenVencimientos> => {
      const { data, error } = await supabase.rpc('get_resumen_vencimientos', {
        p_comercial_id: comercialId ?? undefined,
      })
      if (error) { logError(error, 'useResumenVencimientos'); throw error }
      const row = (data ?? [])[0] as ResumenVencimientos | undefined
      return row ?? { criticas: 0, proximas: 0, futuras: 0, total: 0 }
    },
  })
}

export function useContratosPorVencer(limit = 50) {
  return useQuery({
    queryKey: [RESOURCE, 'por-vencer', limit],
    queryFn: async (): Promise<ContratoPorVencer[]> => {
      const { data, error } = await supabase
        .from('contratos_por_vencer')
        .select('*')
        .order('fecha_fin', { ascending: true })
        .limit(limit)
      if (error) { logError(error, 'useContratosPorVencer'); throw error }
      return (data ?? []) as unknown as ContratoPorVencer[]
    },
  })
}

export interface ContratoConEmpresa extends Contrato {
  empresa?: { id: string; nombre: string; nif: string | null } | null
  comercial?: { id: string; full_name: string } | null
  comision_eur?: number | null
  cups?: string | null
  tipo_punto?: string | null
  contacto_firmante?: { id: string; nombre: string; apellidos: string | null; cargo: string | null } | null
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
        .select('*, empresa:empresas!contratos_empresa_id_fkey(id, nombre, nif), comercial:user_profiles!contratos_comercial_id_fkey(id, full_name), contacto_firmante:contactos!contratos_contacto_firmante_id_fkey(id, nombre, apellidos, cargo)', { count: 'exact' })
        .is('deleted_at', null)

      const f = options?.filter ?? {}
      if (f.estado) q = q.eq('estado', f.estado as never)
      if (f.empresa_id) q = q.eq('empresa_id', f.empresa_id as string)
      if (f.comercial_id) q = q.eq('comercial_id', f.comercial_id as string)
      if (f.compania) q = q.ilike('compania', `%${String(f.compania)}%`)
      // Filtro exacto para los chips de comercializadora (PR-2.3): un chip
      // "NEXUS" no debe arrastrar también "NEXUS RENOVABLES".
      if (f.compania_eq) q = q.eq('compania', f.compania_eq as string)

      const sortField = options?.sort?.field ?? 'fecha_fin'
      const sortAsc = options?.sort?.direction === 'asc'
      q = q.order(sortField, { ascending: sortAsc, nullsFirst: false }).range(from, to)

      const { data, count, error } = await q
      if (error) { logError(error, 'useContratos'); throw error }
      return { data: (data ?? []) as unknown as ContratoConEmpresa[], count: count ?? 0, page, pageSize }
    },
  })
}

export async function fetchContratosForExport(filter?: {
  estado?: string
  empresa_id?: string
  comercial_id?: string
  compania?: string
  compania_eq?: string
}): Promise<ContratoConEmpresa[]> {
  let q = supabase
    .from('contratos')
    .select('*, empresa:empresas!contratos_empresa_id_fkey(id, nombre, nif), comercial:user_profiles!contratos_comercial_id_fkey(id, full_name), contacto_firmante:contactos!contratos_contacto_firmante_id_fkey(id, nombre, apellidos, cargo)')
    .is('deleted_at', null)

  if (filter?.estado) q = q.eq('estado', filter.estado as never)
  if (filter?.empresa_id) q = q.eq('empresa_id', filter.empresa_id)
  if (filter?.comercial_id) q = q.eq('comercial_id', filter.comercial_id)
  if (filter?.compania) q = q.ilike('compania', `%${filter.compania}%`)
  if (filter?.compania_eq) q = q.eq('compania', filter.compania_eq)

  const { data, error } = await q.order('fecha_fin', { ascending: false, nullsFirst: false }).limit(10000)
  if (error) { logError(error, 'fetchContratosForExport'); throw error }
  return (data ?? []) as unknown as ContratoConEmpresa[]
}

/**
 * Comercializadoras distintas con contratos vivos, para los chips de filtro
 * del listado (PR-2.3). Una query ligera de una sola columna, cacheada 5 min.
 */
export function useComercializadorasDeContratos() {
  return useQuery({
    queryKey: [RESOURCE, 'companias'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('contratos')
        .select('compania')
        .is('deleted_at', null)
        .limit(10000)
      if (error) { logError(error, 'useComercializadorasDeContratos'); throw error }
      const set = new Set<string>()
      for (const row of (data ?? []) as { compania: string | null }[]) {
        if (row.compania) set.add(row.compania)
      }
      return [...set].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
    },
  })
}

export interface ContratoConCups extends Contrato {
  cups?: Pick<Cups, 'id' | 'codigo_cups'>[] | null
}

/**
 * Contratos de una empresa con sus CUPS embebidos, para la pestaña
 * Contratos de la ficha de empresa (PR-1.2, semana 1 CRM ÚTIL). Solo lectura.
 */
export function useContratosPorEmpresa(empresaId: string | undefined) {
  return useQuery({
    queryKey: [RESOURCE, 'porEmpresa', empresaId],
    enabled: Boolean(empresaId),
    queryFn: async (): Promise<ContratoConCups[]> => {
      const { data, error } = await supabase
        .from('contratos')
        .select('*, cups(id, codigo_cups)')
        .eq('empresa_id', empresaId!)
        .is('deleted_at', null)
        .is('cups.deleted_at', null)
        .order('fecha_fin', { ascending: true, nullsFirst: false })
      if (error) { logError(error, 'useContratosPorEmpresa'); throw error }
      return (data ?? []) as unknown as ContratoConCups[]
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
        .select('*, empresa:empresas!contratos_empresa_id_fkey(id, nombre, nif), comercial:user_profiles!contratos_comercial_id_fkey(id, full_name), contacto_firmante:contactos!contratos_contacto_firmante_id_fkey(id, nombre, apellidos, cargo)')
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
      const { data, error } = await supabase
        .from('contratos')
        .insert(input as never)
        .select('*')
        .single()
      if (error) { logError(error, 'useCreateContrato'); throw error }
      return data as unknown as Contrato
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      toast.success('Contrato creado')
    },
    onError: (e) => toast.error('No se pudo crear el contrato', { description: (e as Error).message }),
  })
}

export function useUpdateContrato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ContratoUpdate }) => {
      const { data, error } = await supabase
        .from('contratos')
        .update(patch as never)
        .eq('id', id)
        .select('*')
        .single()
      if (error) { logError(error, 'useUpdateContrato'); throw error }
      return data as unknown as Contrato
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      qc.invalidateQueries({ queryKey: [RESOURCE, 'byId', vars.id] })
      toast.success('Contrato actualizado')
    },
    onError: (e) => toast.error('No se pudo actualizar el contrato', { description: (e as Error).message }),
  })
}

export function useDeleteContrato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contratos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) { logError(error, 'useDeleteContrato'); throw error }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      toast.success('Contrato eliminado')
    },
    onError: (e) => toast.error('No se pudo eliminar el contrato', { description: (e as Error).message }),
  })
}
