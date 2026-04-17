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

export interface KPIsAvanzados {
  vencen_90d: number
  contratos_incidencia: number
  oportunidades_estancadas: number
  tasa_cierre_pct: number
  ganadas_6m: number
  perdidas_6m: number
}

export function useKPIsAvanzados() {
  return useQuery({
    queryKey: ['dashboard', 'kpis-avanzados'],
    queryFn: async (): Promise<KPIsAvanzados> => {
      const hoy = new Date()
      const hoyISO = hoy.toISOString().slice(0, 10)
      const in90 = new Date(hoy.getTime() + 90 * 86_400_000).toISOString().slice(0, 10)
      const hace30 = new Date(hoy.getTime() - 30 * 86_400_000).toISOString()
      const hace180 = new Date(hoy.getTime() - 180 * 86_400_000).toISOString()

      const [v90, incidencia, estancadas, ganadas, perdidas] = await Promise.all([
        supabase.from('contratos').select('id', { count: 'exact', head: true })
          .eq('estado', 'activo').is('deleted_at', null)
          .gte('fecha_fin', hoyISO).lte('fecha_fin', in90),
        supabase.from('contratos').select('id', { count: 'exact', head: true })
          .eq('estado', 'incidencia').is('deleted_at', null),
        supabase.from('oportunidades').select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .not('etapa', 'in', '(ganada,perdida,cancelada)')
          .lt('updated_at', hace30),
        supabase.from('oportunidades').select('id', { count: 'exact', head: true })
          .is('deleted_at', null).eq('etapa', 'ganada').gte('updated_at', hace180),
        supabase.from('oportunidades').select('id', { count: 'exact', head: true })
          .is('deleted_at', null).eq('etapa', 'perdida').gte('updated_at', hace180),
      ])
      if (v90.error) logError(v90.error, 'kpis-avanzados.v90')
      if (incidencia.error) logError(incidencia.error, 'kpis-avanzados.incidencia')
      if (estancadas.error) logError(estancadas.error, 'kpis-avanzados.estancadas')

      const g = ganadas.count ?? 0
      const p = perdidas.count ?? 0
      const total = g + p
      const tasa = total > 0 ? Math.round((g / total) * 100) : 0

      return {
        vencen_90d: v90.count ?? 0,
        contratos_incidencia: incidencia.count ?? 0,
        oportunidades_estancadas: estancadas.count ?? 0,
        tasa_cierre_pct: tasa,
        ganadas_6m: g,
        perdidas_6m: p,
      }
    },
  })
}

export interface OportunidadKPI {
  etapa: string
  count: number
  valor_total: number
}

export function useOportunidadesKPI() {
  return useQuery({
    queryKey: ['dashboard', 'oportunidades-kpi'],
    queryFn: async (): Promise<OportunidadKPI[]> => {
      const { data, error } = await supabase
        .from('oportunidades')
        .select('etapa, valor_estimado_eur')
        .is('deleted_at', null)
        .not('etapa', 'in', '(ganada,perdida)')
      if (error) { logError(error, 'useOportunidadesKPI'); throw error }
      const byEtapa: Record<string, OportunidadKPI> = {}
      for (const row of data ?? []) {
        const e = row.etapa as string
        if (!byEtapa[e]) byEtapa[e] = { etapa: e, count: 0, valor_total: 0 }
        byEtapa[e].count++
        byEtapa[e].valor_total += (row.valor_estimado_eur as number | null) ?? 0
      }
      const orden = ['prospecto', 'contactado', 'analisis', 'propuesta_enviada', 'negociacion']
      return orden.filter(e => byEtapa[e]).map(e => byEtapa[e])
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

export interface AlertaVencimiento {
  id: string
  empresa_nombre: string
  compania: string
  fecha_fin: string | null
  dias_restantes: number
}

export function useAlertasVencimiento() {
  return useQuery({
    queryKey: ['dashboard', 'alertas-vencimiento'],
    queryFn: async (): Promise<AlertaVencimiento[]> => {
      const hoy = new Date()
      const hoyISO = hoy.toISOString().slice(0, 10)
      const in90 = new Date(hoy.getTime() + 90 * 86_400_000).toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('contratos')
        .select('id, compania, fecha_fin, empresa:empresas!contratos_empresa_id_fkey(nombre)')
        .eq('estado', 'activo')
        .is('deleted_at', null)
        .gte('fecha_fin', hoyISO)
        .lte('fecha_fin', in90)
        .order('fecha_fin', { ascending: true })
        .limit(20)
      if (error) { logError(error, 'useAlertasVencimiento'); throw error }
      const today = hoy.getTime()
      return (data ?? []).map((r) => {
        const fin = r.fecha_fin ? new Date(r.fecha_fin as string).getTime() : today
        const dias = Math.max(0, Math.round((fin - today) / 86_400_000))
        const emp = r.empresa as unknown as { nombre?: string } | null
        return {
          id: r.id as string,
          empresa_nombre: emp?.nombre ?? '—',
          compania: (r.compania as string) ?? '—',
          fecha_fin: (r.fecha_fin as string | null) ?? null,
          dias_restantes: dias,
        }
      })
    },
  })
}

export interface OportunidadEstancada {
  id: string
  nombre: string
  empresa_nombre: string
  etapa: string
  dias_sin_actualizar: number
  updated_at: string
}

export function useOportunidadesEstancadas() {
  return useQuery({
    queryKey: ['dashboard', 'oportunidades-estancadas'],
    queryFn: async (): Promise<OportunidadEstancada[]> => {
      const hoy = new Date()
      const hace30 = new Date(hoy.getTime() - 30 * 86_400_000).toISOString()
      const { data, error } = await supabase
        .from('oportunidades')
        .select('id, nombre, etapa, updated_at, empresa:empresas(nombre)')
        .is('deleted_at', null)
        .not('etapa', 'in', '(ganada,perdida,cancelada)')
        .lt('updated_at', hace30)
        .order('updated_at', { ascending: true })
        .limit(20)
      if (error) { logError(error, 'useOportunidadesEstancadas'); throw error }
      const today = hoy.getTime()
      return (data ?? []).map((r) => {
        const upd = r.updated_at ? new Date(r.updated_at as string).getTime() : today
        const dias = Math.max(0, Math.round((today - upd) / 86_400_000))
        const emp = r.empresa as unknown as { nombre?: string } | null
        return {
          id: r.id as string,
          nombre: (r.nombre as string) ?? '—',
          empresa_nombre: emp?.nombre ?? '—',
          etapa: (r.etapa as string) ?? '—',
          dias_sin_actualizar: dias,
          updated_at: (r.updated_at as string) ?? '',
        }
      })
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
