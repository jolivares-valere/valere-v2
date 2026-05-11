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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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

      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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

/** Todas las alarmas activas (vista global — join con planta + empresa) */
export function useTodasLasAlarmas() {
  return useQuery({
    queryKey: ['fv_alarma', 'todas'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('fv_alarma')
        .select(`
          *,
          planta:fv_planta(
            id, nombre, nombre_interno, station_code, capacidad_kwp,
            empresa:empresas(id, nombre)
          )
        `)
        .order('iniciada_en', { ascending: false })
        .limit(200)

      if (error) {
        logError(error, 'useTodasLasAlarmas')
        throw error
      }
      return (data ?? []) as (FVAlarma & {
        planta: {
          id: string
          nombre: string
          nombre_interno: string | null
          station_code: string
          capacidad_kwp: number | null
          empresa: { id: string; nombre: string } | null
        } | null
      })[]
    },
  })
}

/** Todas las plantas (vista global para el módulo de seguimiento) */
export function useTodasLasPlantas() {
  return useQuery({
    queryKey: ['fv_planta', 'todas'],
    queryFn: async () => {
      const { data, error } = await supabase
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

// ─────────────────────────────────────────────────────────
// Tipos para el flujo de alta manual
// ─────────────────────────────────────────────────────────

export interface FVCredencial {
  id: string
  plataforma: string
  nombre: string | null
  username: string
  region_url: string | null
  activo: boolean
  tipo: string | null
  descripcion: string | null
  ultima_sync: string | null
  cookies_expires_at: string | null
  ultimo_error: string | null
  // password_enc NUNCA se selecciona desde frontend
}

export interface FVPlantaBasica {
  id: string
  plataforma: string
  region_url: string | null
  station_code: string
  nombre: string
  nombre_interno: string | null
  nombre_fusionsolar: string | null
  capacidad_kwp: number | null
  estado: string
  credencial_id: string | null
  empresa_id: string | null
  cups_id: string | null
  sync_enabled: boolean
}

// ─────────────────────────────────────────────────────────
// Queries — alta manual de credenciales y asignación
// ─────────────────────────────────────────────────────────

/** Lista credenciales FV usando la vista segura (sin password_enc ni session_cookies) */
export function useCredencialesFV() {
  return useQuery({
    queryKey: ['fv_credenciales'],
    queryFn: async (): Promise<FVCredencial[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('fv_credenciales_safe')   // vista — excluye columnas sensibles (pendiente regenerar tipos tras migración)
        .select('*')
        .order('plataforma')
      if (error) { logError(error, 'useCredencialesFV'); throw error }
      return (data ?? []) as FVCredencial[]
    },
  })
}

/** Plantas detectadas sin cliente asignado (empresa_id = null) */
export function usePlantasSinAsignar() {
  return useQuery({
    queryKey: ['fv_planta', 'sin_asignar'],
    queryFn: async (): Promise<FVPlantaBasica[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('fv_planta')
        .select('id, plataforma, region_url, station_code, nombre, nombre_interno, nombre_fusionsolar, capacidad_kwp, estado, credencial_id, empresa_id, cups_id, sync_enabled')
        .is('empresa_id', null)
        .order('nombre')
      if (error) { logError(error, 'usePlantasSinAsignar'); throw error }
      return (data ?? []) as FVPlantaBasica[]
    },
  })
}

/** Empresas del CRM (para selectores) */
export function useEmpresasSelector() {
  return useQuery({
    queryKey: ['empresas', 'selector'],
    queryFn: async (): Promise<{ id: string; nombre: string }[]> => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nombre')
        .order('nombre')
      if (error) { logError(error, 'useEmpresasSelector'); throw error }
      return (data ?? []) as { id: string; nombre: string }[]
    },
  })
}

/** CUPS de una empresa (para selector, filtrado por empresa) */
export function useCupsPorEmpresa(empresaId: string | null) {
  return useQuery({
    queryKey: ['cups', 'empresa', empresaId],
    enabled: !!empresaId,
    queryFn: async (): Promise<{ id: string; codigo_cups: string; direccion_suministro: string | null }[]> => {
      const { data, error } = await supabase
        .from('cups')
        .select('id, codigo_cups, direccion_suministro')
        .eq('empresa_id', empresaId!)
        .order('codigo_cups')
      if (error) { logError(error, 'useCupsPorEmpresa'); throw error }
      return (data ?? []) as { id: string; codigo_cups: string; direccion_suministro: string | null }[]
    },
  })
}

// ─────────────────────────────────────────────────────────
// Mutations — credenciales FV
// ─────────────────────────────────────────────────────────

export interface CrearCredencialInput {
  plataforma: string
  nombre: string
  username: string
  password: string      // se envía a la Edge Function que cifra server-side
  region_url?: string
  activo?: boolean
  tipo?: string
  descripcion?: string
}

// ─── Helper: llamar a la Edge Function fv-create-credential ──────────────
async function llamarEdgeFVCredencial(body: Record<string, unknown>): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sin sesión activa')

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fv-create-credential`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Error en Edge Function fv-create-credential')
  }
}

export function useCrearCredencial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: CrearCredencialInput) => {
      // La contraseña se cifra en la Edge Function server-side
      // El frontend NUNCA escribe password_enc directamente a Supabase
      await llamarEdgeFVCredencial({
        action:      'create',
        plataforma:  values.plataforma,
        nombre:      values.nombre,
        username:    values.username,
        password:    values.password,
        region_url:  values.region_url || null,
        activo:      values.activo ?? true,
        tipo:        values.tipo || 'instalador_multicliente',
        descripcion: values.descripcion || null,
      })
    },
    onSuccess: () => {
      toast.success('Credencial guardada correctamente')
      qc.invalidateQueries({ queryKey: ['fv_credenciales'] })
    },
    onError: (err: Error) => {
      logError(err, 'useCrearCredencial')
      toast.error(err.message || 'Error al guardar la credencial')
    },
  })
}

export interface ActualizarCredencialInput {
  id: string
  nombre?: string
  activo?: boolean
  descripcion?: string
  password?: string     // solo si se quiere cambiar
  region_url?: string
}

export function useActualizarCredencial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: ActualizarCredencialInput) => {
      // Igual que crear: cifrado server-side en la Edge Function
      await llamarEdgeFVCredencial({
        action:      'update',
        id:          values.id,
        nombre:      values.nombre,
        activo:      values.activo,
        descripcion: values.descripcion,
        region_url:  values.region_url,
        ...(values.password ? { password: values.password } : {}),
      })
    },
    onSuccess: () => {
      toast.success('Credencial actualizada')
      qc.invalidateQueries({ queryKey: ['fv_credenciales'] })
    },
    onError: (err: Error) => {
      logError(err, 'useActualizarCredencial')
      toast.error(err.message || 'Error al actualizar la credencial')
    },
  })
}

export function useEliminarCredencial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fv_credenciales').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Credencial eliminada')
      qc.invalidateQueries({ queryKey: ['fv_credenciales'] })
    },
    onError: (err: Error) => {
      logError(err, 'useEliminarCredencial')
      toast.error('Error al eliminar la credencial')
    },
  })
}

// ─────────────────────────────────────────────────────────
// Mutations — asignación de plantas a clientes
// ─────────────────────────────────────────────────────────

export interface AsignarPlantaInput {
  plantaId:      string
  empresaId:     string
  cupsId?:       string | null
  nombreInterno?: string | null
  syncEnabled?:  boolean
}

export function useAsignarPlantaEmpresa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: AsignarPlantaInput) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('fv_planta')
        .update({
          empresa_id:    values.empresaId,
          cups_id:       values.cupsId ?? null,
          nombre_interno: values.nombreInterno ?? null,
          sync_enabled:  values.syncEnabled ?? true,
        })
        .eq('id', values.plantaId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Planta asignada al cliente correctamente')
      qc.invalidateQueries({ queryKey: ['fv_planta'] })
      qc.invalidateQueries({ queryKey: ['fv_credenciales'] })
    },
    onError: (err: Error) => {
      logError(err, 'useAsignarPlantaEmpresa')
      toast.error('Error al asignar la planta')
    },
  })
}
:       string | null
  nombreInterno?: string | null
  syncEnabled?:  boolean
}

export function useAsignarPlantaEmpresa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: AsignarPlantaInput) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('fv_planta')
        .update({
          empresa_id:    values.empresaId,
          cups_id:       values.cupsId ?? null,
          nombre_interno: values.nombreInterno ?? null,
          sync_enabled:  values.syncEnabled ?? true,
        })
        .eq('id', values.plantaId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Planta asignada al cliente correctamente')
      qc.invalidateQueries({ queryKey: ['fv_planta'] })
      qc.invalidateQueries({ queryKey: ['fv_credenciales'] })
    },
    onError: (err: Error) => {
      logError(err, 'useAsignarPlantaEmpresa')
      toast.error('Error al asignar la planta')
    },
  })
}
