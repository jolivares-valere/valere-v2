import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'

// ─────────────────────────────────────────────────────────
// Tipos locales (hasta que se regeneren los tipos de Supabase)
// ─────────────────────────────────────────────────────────

export interface FVPlanta {
  id: string
  empresa_id: string
  credencial_id: string | null
  plataforma: string
  station_code: string
  nombre: string
  pais: string
  capacidad_kwp: number | null
  tiene_bateria: boolean
  tiene_esss: boolean
  fecha_conexion: string | null
  estado: 'normal' | 'defectuoso' | 'desconectado' | 'desconocido'
  creado_en: string
  actualizado_en: string
  // joins opcionales
  kpi_realtime?: FVKpiRealtime | null
  alarmas_activas?: number
}

export interface FVKpiRealtime {
  planta_id: string
  potencia_actual_kw: number | null
  energia_hoy_kwh: number | null
  energia_mes_kwh: number | null
  energia_total_kwh: number | null
  ingresos_hoy_eur: number | null
  actualizado_en: string
}

export interface FVKpiDiario {
  id: string
  planta_id: string
  fecha: string
  energia_kwh: number | null
  ingresos_eur: number | null
}

export interface FVDispositivo {
  id: string
  planta_id: string
  device_id: string
  tipo: 'inversor' | 'bateria' | 'optimizador' | 'smart_meter' | 'otro'
  nombre: string | null
  modelo: string | null
  numero_serie: string | null
  estado: string
  actualizado_en: string
}

export interface FVAlarma {
  id: string
  planta_id: string
  alarm_id: string
  codigo: string | null
  severidad: 'critica' | 'mayor' | 'menor' | 'advertencia' | 'desconocida'
  descripcion: string | null
  dispositivo: string | null
  iniciada_en: string | null
  resuelta_en: string | null
  activa: boolean
  actualizado_en: string
}

export interface FVSyncLog {
  id: string
  empresa_id: string | null
  plataforma: string | null
  ok: boolean
  plantas_sync: number
  alarmas_sync: number
  mensaje: string | null
  iniciado_en: string
  duracion_ms: number | null
}

// ─────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────

/** Plantas FV de una empresa con KPIs en tiempo real */
export function usePlantasPorEmpresa(empresaId: string | undefined) {
  return useQuery({
    queryKey: ['fv_planta', 'empresa', empresaId],
    enabled: !!empresaId,
    queryFn: async (): Promise<FVPlanta[]> => {
      const { data, error } = await (supabase as any)
        .from('fv_planta')
        .select(`
          *,
          kpi_realtime:fv_kpi_realtime(*),
          alarmas_activas:fv_alarma(count)
        `)
        .eq('empresa_id', empresaId!)
        .order('nombre')

      if (error) {
        logError(error, 'usePlantasPorEmpresa')
        throw error
      }

      return (data ?? []).map((row: any) => ({
        ...row,
        kpi_realtime: row.kpi_realtime?.[0] ?? row.kpi_realtime ?? null,
        alarmas_activas: row.alarmas_activas?.[0]?.count ?? 0,
      })) as FVPlanta[]
    },
  })
}

/** Alarmas activas de una planta */
export function useAlarmasPorPlanta(plantaId: string | undefined) {
  return useQuery({
    queryKey: ['fv_alarma', 'planta', plantaId],
    enabled: !!plantaId,
    queryFn: async (): Promise<FVAlarma[]> => {
      const { data, error } = await (supabase as any)
        .from('fv_alarma')
        .select('*')
        .eq('planta_id', plantaId!)
        .eq('activa', true)
        .order('iniciada_en', { ascending: false })

      if (error) {
        logError(error, 'useAlarmasPorPlanta')
        throw error
      }
      return (data ?? []) as FVAlarma[]
    },
  })
}

/** Histórico de producción diaria de una planta (últimos N días) */
export function useKpiDiarioPorPlanta(plantaId: string | undefined, dias = 30) {
  return useQuery({
    queryKey: ['fv_kpi_diario', 'planta', plantaId, dias],
    enabled: !!plantaId,
    queryFn: async (): Promise<FVKpiDiario[]> => {
      const desde = new Date()
      desde.setDate(desde.getDate() - dias)

      const { data, error } = await (supabase as any)
        .from('fv_kpi_diario')
        .select('*')
        .eq('planta_id', plantaId!)
        .gte('fecha', desde.toISOString().slice(0, 10))
        .order('fecha', { ascending: true })

      if (error) {
        logError(error, 'useKpiDiarioPorPlanta')
        throw error
      }
      return (data ?? []) as FVKpiDiario[]
    },
  })
}

/** Dispositivos de una planta */
export function useDispositivosPorPlanta(plantaId: string | undefined) {
  return useQuery({
    queryKey: ['fv_dispositivo', 'planta', plantaId],
    enabled: !!plantaId,
    queryFn: async (): Promise<FVDispositivo[]> => {
      const { data, error } = await (supabase as any)
        .from('fv_dispositivo')
        .select('*')
        .eq('planta_id', plantaId!)
        .order('tipo')

      if (error) {
        logError(error, 'useDispositivosPorPlanta')
        throw error
      }
      return (data ?? []) as FVDispositivo[]
    },
  })
}

/** Último log de sync de una empresa */
export function useSyncLogEmpresa(empresaId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: ['fv_sync_log', empresaId, limit],
    enabled: !!empresaId,
    queryFn: async (): Promise<FVSyncLog[]> => {
      const { data, error } = await (supabase as any)
        .from('fv_sync_log')
        .select('*')
        .eq('empresa_id', empresaId!)
        .order('iniciado_en', { ascending: false })
        .limit(limit)

      if (error) {
        logError(error, 'useSyncLogEmpresa')
        throw error
      }
      return (data ?? []) as FVSyncLog[]
    },
  })
}

/** Todas las plantas (vista global para el módulo de seguimiento) */
export function useTodasLasPlantas() {
  return useQuery({
    queryKey: ['fv_planta', 'todas'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fv_planta')
        .select(`
          *,
          empresa:empresas(id, nombre),
          kpi_realtime:fv_kpi_realtime(*)
        `)
        .order('empresa_id')
        .order('nombre')

      if (error) {
        logError(error, 'useTodasLasPlantas')
        throw error
      }

      return (data ?? []).map((row: any) => ({
        ...row,
        kpi_realtime: row.kpi_realtime?.[0] ?? row.kpi_realtime ?? null,
      }))
    },
  })
}
