import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'
import type { Actividad } from '../../core/types/entities'

export interface DashboardKPIs {
  empresas_activas: number
  contratos_activos: number
  vencen_30d: number
  vencen_60d: number
}

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: async (): Promise<DashboardKPIs> => {
      const hoy = new Date()
      const in30 = new Date(hoy.getTime() + 30 * 86_400_000).toISOString().slice(0, 10)
      const in60 = new Date(hoy.getTime() + 60 * 86_400_000).toISOString().slice(0, 10)
      const hoyISO = hoy.toISOString().slice(0, 10)

      const [empresas, contratos, v30, v60] = await Promise.all([
        supabase.from('empresas').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('contratos').select('id', { count: 'exact', head: true }).eq('estado', 'activo').is('deleted_at', null),
        supabase.from('contratos').select('id', { count: 'exact', head: true }).eq('estado', 'activo').is('deleted_at', null).gte('fecha_fin', hoyISO).lte('fecha_fin', in30),
        supabase.from('contratos').select('id', { count: 'exact', head: true }).eq('estado', 'activo').is('deleted_at', null).gte('fecha_fin', hoyISO).lte('fecha_fin', in60),
      ])

      if (empresas.error) logError(empresas.error, 'kpis.empresas')
      if (contratos.error) logError(contratos.error, 'kpis.contratos')

      return {
        empresas_activas: empresas.count ?? 0,
        contratos_activos: contratos.count ?? 0,
        vencen_30d: v30.count ?? 0,
        vencen_60d: v60.count ?? 0,
      }
    },
  })
}

export interface ContratoHuerfano {
  id: string
  numero_contrato: string | null
  empresa_nombre: string
  fecha_fin: string | null
  dias_para_vencimiento: number | null
  prioridad_renovacion: string
}

export function useContratosHuerfanos() {
  return useQuery({
    queryKey: ['dashboard', 'huerfanos'],
    queryFn: async (): Promise<ContratoHuerfano[]> => {
      const { data, error } = await supabase
        .from('v_oportunidades_huerfanas')
        .select('id, numero_contrato, empresa_nombre, fecha_fin, dias_para_vencimiento, prioridad_renovacion')
        .order('fecha_fin', { ascending: true })
        .limit(20)
      if (error) { logError(error, 'useContratosHuerfanos'); throw error }
      return (data ?? []) as unknown as ContratoHuerfano[]
    },
  })
}

export function useMisTareas(userId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', 'mis-tareas', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Actividad[]> => {
      const { data, error } = await supabase
        .from('actividades')
        .select('*')
        .eq('tipo', 'tarea')
        .eq('estado_tarea', 'pendiente')
        .eq('asignado_a', userId!)
        .is('deleted_at', null)
        .order('fecha_vencimiento', { ascending: true, nullsFirst: false })
        .limit(10)
      if (error) { logError(error, 'useMisTareas'); throw error }
      return (data ?? []) as unknown as Actividad[]
    },
  })
}
