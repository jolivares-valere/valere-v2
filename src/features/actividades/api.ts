import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'
import type {
  Actividad,
  ActividadInsert,
  EntidadTipo,
} from '../../core/types/entities'

const RESOURCE = 'actividades'

export interface ActividadConUsuario extends Actividad {
  usuario?: { id: string; nombre_completo: string } | null
}

export function useActividades(entidadTipo: EntidadTipo, entidadId: string | undefined) {
  return useQuery({
    queryKey: [RESOURCE, entidadTipo, entidadId],
    enabled: Boolean(entidadId),
    queryFn: async (): Promise<ActividadConUsuario[]> => {
      const { data, error } = await supabase
        .from('actividades')
        .select('*, usuario:users_profile!actividades_usuario_id_fkey(id, nombre_completo)')
        .eq('entidad_tipo', entidadTipo)
        .eq('entidad_id', entidadId!)
        .is('deleted_at', null)
        .order('fecha_actividad', { ascending: false })
        .limit(50)
      if (error) {
        logError(error, 'useActividades')
        throw error
      }
      return (data ?? []) as unknown as ActividadConUsuario[]
    },
  })
}

export function useCreateActividad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ActividadInsert) => {
      const { data, error } = await supabase
        .from('actividades')
        .insert(input as unknown as Record<string, unknown>)
        .select('*')
        .single()
      if (error) {
        logError(error, 'useCreateActividad')
        throw error
      }
      return data as unknown as Actividad
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: [RESOURCE, vars.entidad_tipo, vars.entidad_id],
      })
    },
  })
}
