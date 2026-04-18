import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'
import type {
  Actividad,
  ActividadInsert,
  ActividadUpdate,
  EntidadTipo,
  TipoActividad,
  EstadoTarea,
} from '../../core/types/entities'

const RESOURCE = 'actividades'

export interface ActividadConUsuario extends Actividad {
  usuario?: { id: string; full_name: string } | null
}

export interface ActividadFilter {
  tipo?: TipoActividad
  entidad_tipo?: EntidadTipo
  entidad_id?: string
  desde?: string
  hasta?: string
  asignado_a?: string
  estado_tarea?: EstadoTarea
  solo_pendientes?: boolean
}

export interface ActividadQueryOptions {
  page?: number
  pageSize?: number
  filter?: ActividadFilter
}

export interface ActividadesPaginado {
  data: ActividadConUsuario[]
  count: number
  page: number
  pageSize: number
}

export function useActividades(entidadTipo: EntidadTipo, entidadId: string | undefined) {
  return useQuery({
    queryKey: [RESOURCE, entidadTipo, entidadId],
    enabled: Boolean(entidadId),
    queryFn: async (): Promise<ActividadConUsuario[]> => {
      const { data, error } = await supabase
        .from('actividades')
        .select('*, usuario:user_profiles!actividades_usuario_id_fkey(id, full_name)')
        .eq('entidad_tipo', entidadTipo)
        .eq('entidad_id', entidadId!)
        .is('deleted_at', null)
        .order('fecha_actividad', { ascending: false })
        .limit(50)
      if (error) { logError(error, 'useActividades'); throw error }
      return (data ?? []) as unknown as ActividadConUsuario[]
    },
  })
}

export function useActividadesPorEmpresa(empresaId: string | undefined) {
  return useActividades('empresa', empresaId)
}

export function useActividadesPorOportunidad(oportunidadId: string | undefined) {
  return useActividades('oportunidad', oportunidadId)
}

export function useActividadesTodas(options?: ActividadQueryOptions) {
  return useQuery({
    queryKey: [RESOURCE, 'todas', options ?? {}],
    queryFn: async (): Promise<ActividadesPaginado> => {
      const page = options?.page ?? 1
      const pageSize = options?.pageSize ?? 30
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let q = supabase
        .from('actividades')
        .select('*, usuario:user_profiles!actividades_usuario_id_fkey(id, full_name)', { count: 'exact' })
        .is('deleted_at', null)

      const f = options?.filter ?? {}
      if (f.tipo) q = q.eq('tipo', f.tipo)
      if (f.entidad_tipo) q = q.eq('entidad_tipo', f.entidad_tipo)
      if (f.entidad_id) q = q.eq('entidad_id', f.entidad_id)
      if (f.desde) q = q.gte('fecha_actividad', f.desde)
      if (f.hasta) q = q.lte('fecha_actividad', f.hasta)
      if (f.asignado_a) q = q.eq('asignado_a', f.asignado_a)
      if (f.estado_tarea) q = q.eq('estado_tarea', f.estado_tarea)
      if (f.solo_pendientes) q = q.eq('tipo', 'tarea').eq('estado_tarea', 'pendiente')

      q = q.order('fecha_actividad', { ascending: false }).range(from, to)

      const { data, count, error } = await q
      if (error) { logError(error, 'useActividadesTodas'); throw error }
      return {
        data: (data ?? []) as unknown as ActividadConUsuario[],
        count: count ?? 0,
        page,
        pageSize,
      }
    },
  })
}

export async function fetchActividadesForExport(filter?: ActividadFilter): Promise<ActividadConUsuario[]> {
  let q = supabase
    .from('actividades')
    .select('*, usuario:user_profiles!actividades_usuario_id_fkey(id, full_name)')
    .is('deleted_at', null)

  const f = filter ?? {}
  if (f.tipo) q = q.eq('tipo', f.tipo)
  if (f.entidad_tipo) q = q.eq('entidad_tipo', f.entidad_tipo)
  if (f.entidad_id) q = q.eq('entidad_id', f.entidad_id)
  if (f.desde) q = q.gte('fecha_actividad', f.desde)
  if (f.hasta) q = q.lte('fecha_actividad', f.hasta)
  if (f.asignado_a) q = q.eq('asignado_a', f.asignado_a)
  if (f.estado_tarea) q = q.eq('estado_tarea', f.estado_tarea)
  if (f.solo_pendientes) q = q.eq('tipo', 'tarea').eq('estado_tarea', 'pendiente')

  const { data, error } = await q.order('fecha_actividad', { ascending: false }).limit(10000)
  if (error) { logError(error, 'fetchActividadesForExport'); throw error }
  return (data ?? []) as unknown as ActividadConUsuario[]
}

export function useCreateActividad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ActividadInsert) => {
      const { data, error } = await supabase
        .from('actividades')
        .insert(input as never)
        .select('*')
        .single()
      if (error) { logError(error, 'useCreateActividad'); throw error }
      return data as unknown as Actividad
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [RESOURCE, vars.entidad_tipo, vars.entidad_id] })
      qc.invalidateQueries({ queryKey: [RESOURCE, 'todas'] })
      qc.invalidateQueries({ queryKey: [RESOURCE, 'tareas-pendientes-oportunidades'] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'mis-tareas'] })
      toast.success('Actividad creada')
    },
    onError: (e) => toast.error('No se pudo crear la actividad', { description: (e as Error).message }),
  })
}

export function useUpdateActividad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ActividadUpdate }) => {
      const { data, error } = await supabase
        .from('actividades')
        .update(patch as never)
        .eq('id', id)
        .select('*')
        .single()
      if (error) { logError(error, 'useUpdateActividad'); throw error }
      return data as unknown as Actividad
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'mis-tareas'] })
      toast.success('Actividad actualizada')
    },
    onError: (e) => toast.error('No se pudo actualizar la actividad', { description: (e as Error).message }),
  })
}

export function useDeleteActividad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('actividades')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) { logError(error, 'useDeleteActividad'); throw error }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'mis-tareas'] })
      toast.success('Actividad eliminada')
    },
    onError: (e) => toast.error('No se pudo eliminar la actividad', { description: (e as Error).message }),
  })
}

export function useToggleTareaCompletada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, completada }: { id: string; completada: boolean }) => {
      const { data, error } = await supabase
        .from('actividades')
        .update({ estado_tarea: completada ? 'completada' : 'pendiente' })
        .eq('id', id)
        .select('*')
        .single()
      if (error) { logError(error, 'useToggleTareaCompletada'); throw error }
      return data as unknown as Actividad
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'mis-tareas'] })
    },
  })
}

export function useTareasPendientesPorOportunidad() {
  return useQuery({
    queryKey: [RESOURCE, 'tareas-pendientes-oportunidades'],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from('actividades')
        .select('entidad_id')
        .eq('entidad_tipo', 'oportunidad')
        .eq('tipo', 'tarea')
        .eq('estado_tarea', 'pendiente')
        .is('deleted_at', null)
      if (error) { logError(error, 'useTareasPendientesPorOportunidad'); throw error }
      const map: Record<string, number> = {}
      for (const row of data ?? []) {
        const id = row.entidad_id as string
        map[id] = (map[id] ?? 0) + 1
      }
      return map
    },
  })
}