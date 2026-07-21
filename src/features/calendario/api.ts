import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'
import type { Evento, EventoInsert, EventoUpdate } from '../../core/types/entities'

const RESOURCE = 'eventos'

export interface EventoConRelaciones extends Evento {
  usuario?: { id: string; full_name: string | null } | null
}

export interface EventosRangeOptions {
  desde: string
  hasta: string
  usuario_id?: string
}

export function useEventosEnRango(opts: EventosRangeOptions) {
  return useQuery({
    queryKey: [RESOURCE, 'range', opts.desde, opts.hasta, opts.usuario_id ?? null],
    queryFn: async (): Promise<EventoConRelaciones[]> => {
      let q = supabase
        .from('eventos' as never)
        .select('*, usuario:user_profiles!eventos_usuario_id_fkey(id, full_name)')
        .is('deleted_at' as never, null)
        .gte('fecha_inicio' as never, opts.desde as never)
        .lt('fecha_inicio' as never, opts.hasta as never)
        .order('fecha_inicio' as never, { ascending: true })

      if (opts.usuario_id) {
        q = q.eq('usuario_id' as never, opts.usuario_id as never)
      }

      const { data, error } = await q
      if (error) { logError(error, 'useEventosEnRango'); throw error }
      return (data ?? []) as unknown as EventoConRelaciones[]
    },
  })
}

export function useEventosByEntidad(entidadTipo: string | undefined, entidadId: string | undefined) {
  return useQuery({
    queryKey: [RESOURCE, 'byEntidad', entidadTipo, entidadId],
    enabled: Boolean(entidadTipo && entidadId),
    queryFn: async (): Promise<EventoConRelaciones[]> => {
      const { data, error } = await supabase
        .from('eventos' as never)
        .select('*, usuario:user_profiles!eventos_usuario_id_fkey(id, full_name)')
        .is('deleted_at' as never, null)
        .eq('entidad_tipo' as never, entidadTipo! as never)
        .eq('entidad_id' as never, entidadId! as never)
        .order('fecha_inicio' as never, { ascending: false })
      if (error) { logError(error, 'useEventosByEntidad'); throw error }
      return (data ?? []) as unknown as EventoConRelaciones[]
    },
  })
}

export function useCreateEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: EventoInsert) => {
      const { data, error } = await supabase
        .from('eventos' as never)
        .insert(input as never)
        .select('*')
        .single()
      if (error) { logError(error, 'useCreateEvento'); throw error }
      return data as unknown as Evento
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      toast.success('Evento creado')
    },
    onError: (e) => toast.error('No se pudo crear el evento', { description: (e as Error).message }),
  })
}

export function useUpdateEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: EventoUpdate }) => {
      const { data, error } = await supabase
        .from('eventos' as never)
        .update(patch as never)
        .eq('id', id)
        .select('*')
        .single()
      if (error) { logError(error, 'useUpdateEvento'); throw error }
      return data as unknown as Evento
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      toast.success('Evento actualizado')
    },
    onError: (e) => toast.error('No se pudo actualizar el evento', { description: (e as Error).message }),
  })
}

export function useDeleteEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft-delete via RPC (fix 21-jul: las policies de lectura deleted_at IS NULL
      // bloquean el UPDATE directo con 42501; la RPC valida permisos espejo del delete)
      const { error } = await supabase.rpc('soft_delete' as never, { p_tabla: 'eventos', p_id: id } as never)
      if (error) { logError(error, 'useDeleteEvento'); throw error }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RESOURCE] })
      toast.success('Evento eliminado')
    },
    onError: (e) => toast.error('No se pudo eliminar el evento', { description: (e as Error).message }),
  })
}
