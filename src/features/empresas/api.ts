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
  PrioridadRenovacion,
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

      // Separación CRM/Captación: por defecto solo empresas cliente.
      // Si se pasa filter.estado_relacion explícito, usar ese.
      const estadoFilter = (options?.filter?.estado_relacion as string | undefined) ?? 'cliente'

      // Cast: estado_relacion es columna nueva (FASE 1 separación CRM/Captación,
      // 2026-05-05) que aún no está en los tipos generados de Supabase.
      // Quitar este cast cuando se regeneren los tipos.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from('empresas')
        .select('*, comercial:user_profiles!empresas_comercial_id_fkey(id, full_name)', { count: 'exact' })
        .is('deleted_at', null)
        .eq('estado_relacion', estadoFilter)

      const search = options?.filter?.search as string | undefined
      if (search && search.trim()) {
        const s = search.trim()
        q = q.or(`nombre.ilike.%${s}%,nif.ilike.%${s}%`)
      }

      if (options?.filter?.tipo) q = q.eq('tipo', options.filter.tipo as never)
      if (options?.filter?.segmento) q = q.eq('segmento', options.filter.segmento as never)
      if (options?.filter?.comercial_id) {
        const cid = options.filter.comercial_id as string
        // 'sin_asignar' filtra empresas sin comercial (comercial_id IS NULL)
        q = cid === 'sin_asignar' ? q.is('comercial_id', null) : q.eq('comercial_id', cid)
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

export async function fetchEmpresasForExport(filter?: {
  search?: string
  tipo?: string
  segmento?: string
  comercial_id?: string
}): Promise<Empresa[]> {
  let q = supabase
    .from('empresas')
    .select('*, comercial:user_profiles!empresas_comercial_id_fkey(id, full_name)')
    .is('deleted_at', null)

  if (filter?.search && filter.search.trim()) {
    const s = filter.search.trim()
    q = q.or(`nombre.ilike.%${s}%,nif.ilike.%${s}%`)
  }
  if (filter?.tipo) q = q.eq('tipo', filter.tipo as never)
  if (filter?.segmento) q = q.eq('segmento', filter.segmento as never)
  if (filter?.comercial_id) {
    q = filter.comercial_id === 'sin_asignar' ? q.is('comercial_id', null) : q.eq('comercial_id', filter.comercial_id)
  }

  const { data, error } = await q.order('created_at', { ascending: false }).limit(10000)
  if (error) {
    logError(error, 'fetchEmpresasForExport')
    throw error
  }
  return (data ?? []) as unknown as Empresa[]
}

export interface ComercialOption {
  id: string
  full_name: string | null
}

/** Usuarios asignables como comercial/canal de una empresa. */
export function useComerciales() {
  return useQuery({
    queryKey: ['user_profiles', 'comerciales'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ComercialOption[]> => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .order('full_name', { ascending: true })

      if (error) {
        logError(error, 'useComerciales')
        throw error
      }
      return (data ?? []) as ComercialOption[]
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

export interface EmpresaCabeceraData {
  comercialNombre: string | null
  contratosActivos: number
  proximaRenovacion: { fecha: string; prioridad: PrioridadRenovacion } | null
  incidenciasDatadis: number
  /** Renovaciones con fecha pasada y estado vivo (∉ renovado/perdido) sin
   * gestionar: lo URGENTE que la próxima renovación no cuenta (PR-2.4,
   * observación del auditor en el paseo PR-1.3 — caso PAZ Y BIEN). */
  renovacionesVencidas: number
}

/**
 * Datos agregados para la cabecera de la ficha de empresa (PR-1.1):
 * comercial, nº contratos activos, próxima renovación e incidencias Datadis.
 * Solo lecturas; una query paralela por bloque.
 */
export function useEmpresaCabecera(empresaId: string | undefined, comercialId?: string | null) {
  return useQuery({
    queryKey: [RESOURCE, 'cabecera', empresaId, comercialId ?? null],
    enabled: Boolean(empresaId),
    queryFn: async (): Promise<EmpresaCabeceraData> => {
      // Cast: datadis_incidencias y renovaciones no están en los tipos generados.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const [contratosRes, renovRes, vencidasRes, incidRes, comercialRes] = await Promise.all([
        sb.from('contratos')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId)
          .is('deleted_at', null)
          .eq('estado', 'activo'),
        sb.from('renovaciones')
          .select('fecha_vencimiento_contrato, prioridad')
          .eq('empresa_id', empresaId)
          .is('deleted_at', null)
          .gte('fecha_vencimiento_contrato', new Date().toISOString())
          .order('fecha_vencimiento_contrato', { ascending: true })
          .limit(1)
          .maybeSingle(),
        sb.from('renovaciones')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId)
          .is('deleted_at', null)
          .not('estado', 'in', '(renovado,perdido)')
          .lt('fecha_vencimiento_contrato', new Date().toISOString()),
        sb.from('datadis_incidencias')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId),
        comercialId
          ? sb.from('user_profiles').select('full_name').eq('id', comercialId).maybeSingle()
          : Promise.resolve({ data: null, error: null, count: null }),
      ])

      for (const r of [contratosRes, renovRes, vencidasRes, incidRes, comercialRes]) {
        if (r.error) {
          logError(r.error, 'useEmpresaCabecera')
          throw r.error
        }
      }

      return {
        comercialNombre: comercialRes.data?.full_name ?? null,
        contratosActivos: contratosRes.count ?? 0,
        proximaRenovacion: renovRes.data
          ? { fecha: renovRes.data.fecha_vencimiento_contrato, prioridad: renovRes.data.prioridad }
          : null,
        incidenciasDatadis: incidRes.count ?? 0,
        renovacionesVencidas: vencidasRes.count ?? 0,
      }
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
