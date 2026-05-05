import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../core/supabase/client'
import { logError } from '../../core/utils/logger'

/** Tipo de fila de la vista v_mis_oportunidades (MVP captación) */
export type VMisOportunidadesRow = {
  id: string
  empresa_id: string
  empresa_nombre: string | null
  empresa_nif: string | null
  tipo: string | null
  etapa: string | null
  etapa_operativa: string | null
  decisor_identificado: boolean | null
  responsable_actual_id: string | null
  factura_fecha_prevista?: string | null
  factura_recibida_at: string | null
  factura_documento_id: string | null
  propuesta_documento_id: string | null
  propuesta_enviada_at: string | null
  visita_programada_at: string | null
  valor_estimado_eur: number | null
  ahorro_anual_estimado: number | null
  created_at: string
  updated_at: string
}

/** Tipo de fila de la vista v_captacion_todos_mis_casos (incluye casos donde fui parte alguna vez) */
export type VTodosMisCasosRow = VMisOportunidadesRow & {
  responsable_actual_nombre: string | null
  responsable_actual_funciones: string[] | null
}

/** Datos detallados para el drawer */
export type OportunidadDetalle = {
  id: string
  nombre: string | null
  tipo: string | null
  etapa: string | null
  etapa_operativa: string | null
  contexto?: 'captacion' | 'crm' | null
  decisor_identificado: boolean | null
  valor_estimado_eur: number | null
  ahorro_anual_estimado: number | null
  factura_fecha_prevista: string | null
  factura_recibida_at: string | null
  factura_documento_id: string | null
  propuesta_documento_id: string | null
  propuesta_enviada_at: string | null
  fecha_vencimiento_contrato_prospecto?: string | null
  fuente_vencimiento_contrato_prospecto?: string | null
  notas_vencimiento_contrato_prospecto?: string | null
  notas: string | null
  responsable_actual_id: string | null
  created_at: string
  updated_at: string
  empresa: {
    id: string
    nombre: string | null
    nif: string | null
    telefono_principal: string | null
    email_principal: string | null
    ciudad: string | null
    segmento: string | null
    estado_relacion?: 'prospecto' | 'cliente' | 'ex_cliente' | 'descartado' | null
  } | null
  contactos: Array<{
    id: string
    nombre: string | null
    cargo: string | null
    telefono: string | null
    email: string | null
    es_decisor: boolean
    es_principal?: boolean
  }>
}

export type ActividadRow = {
  id: string
  tipo: string
  titulo: string
  descripcion: string | null
  fecha_actividad: string
  resultado: string | null
  usuario_id: string | null
  adjunto_url: string | null
  adjunto_nombre: string | null
}

export function useMisOportunidades() {
  return useQuery({
    queryKey: ['mis_oportunidades'],
    queryFn: async (): Promise<VMisOportunidadesRow[]> => {
      const { data, error } = await supabase
        .from('v_mis_oportunidades')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) {
        logError(error, 'useMisOportunidades')
        throw error
      }
      // Cast: la vista v_mis_oportunidades devuelve id como string|null en tipos
      // generados (limitación de Postgres views), pero en BD nunca es null porque
      // viene de oportunidades.id (PK). Cast seguro.
      return (data ?? []) as unknown as VMisOportunidadesRow[]
    },
  })
}

/**
 * Vista cross-bandeja: todos los casos donde el user actual fue parte alguna vez
 * (responsable actual, creador o aparece en handoffs).
 *
 * Pensada para Carolina Aroca: aunque haya hecho handoff a analista, sigue viendo
 * el caso en estado read-only para responder al cliente si llama.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAny = supabase as any

/* ============================================================
 * Inputs y helpers de mutación (Día 2 sprint operativo)
 * ============================================================ */

/** Contacto individual para crear/editar lead */
export type ContactoInput = {
  /** id existente — solo en update; si no, se crea nuevo */
  id?: string
  nombre?: string
  cargo?: string
  telefono?: string
  email?: string
  es_principal?: boolean
  /** marca para soft-delete en update */
  _eliminar?: boolean
}

export type FuenteVencimiento = 'cliente_llamada' | 'factura' | 'email' | 'estimado' | 'desconocido'

export type CrearLeadInput = {
  empresa_nombre: string
  empresa_nif?: string
  empresa_telefono?: string
  empresa_email?: string
  empresa_ciudad?: string
  empresa_segmento?: 'industrial' | 'comercial' | 'servicios' | 'agricola' | 'residencial_colectivo'
  contactos: ContactoInput[]
  origen?: 'cold' | 'web' | 'recomendacion' | 'contacto_previo' | 'otro'
  notas?: string
  fecha_vencimiento_contrato?: string  // ISO date YYYY-MM-DD
  fuente_vencimiento?: FuenteVencimiento
  notas_vencimiento?: string
}

export type ActualizarLeadInput = {
  oportunidadId: string
  empresa_nombre: string
  empresa_nif?: string
  empresa_telefono?: string
  empresa_email?: string
  empresa_ciudad?: string
  empresa_segmento?: 'industrial' | 'comercial' | 'servicios' | 'agricola' | 'residencial_colectivo'
  contactos: ContactoInput[]
  notas?: string
  /** Si actualizar_vencimiento=true, los 3 campos abajo se persisten (incluso a null). Si false, no se tocan. */
  actualizar_vencimiento?: boolean
  fecha_vencimiento_contrato?: string | null
  fuente_vencimiento?: FuenteVencimiento | null
  notas_vencimiento?: string | null
}

/** Semáforo de vencimiento para captación. Validado con ChatGPT 2026-05-05. */
export type Semaforo = {
  color: 'verde' | 'amarillo' | 'naranja' | 'rojo' | 'vencido' | 'sin_dato'
  label: string
  dias: number | null
}

export function calcularSemaforoVencimiento(fechaISO: string | null | undefined): Semaforo {
  if (!fechaISO) return { color: 'sin_dato', label: 'Sin fecha', dias: null }
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const venc = new Date(fechaISO + 'T00:00:00')
  const diffMs = venc.getTime() - hoy.getTime()
  const dias = Math.round(diffMs / 86_400_000)
  if (dias < 0) return { color: 'vencido', label: `Vencido hace ${Math.abs(dias)} días`, dias }
  if (dias <= 30) return { color: 'rojo', label: `Vence en ${dias} días — urgente`, dias }
  if (dias <= 60) return { color: 'naranja', label: `Vence en ${dias} días — prioridad alta`, dias }
  if (dias <= 90) return { color: 'amarillo', label: `Vence en ${dias} días — iniciar contacto`, dias }
  return { color: 'verde', label: `Vence en ${dias} días`, dias }
}

/** Cargos sugeridos para B2B energético (input libre con sugerencias) */
export const CARGOS_SUGERIDOS = [
  'Compras',
  'Compras indirectas',
  'Operaciones',
  'Mantenimiento',
  'Director industrial',
  'Energía / Sostenibilidad',
  'Director financiero',
  'Gerencia',
  'Dirección general',
  'Otro',
] as const

/**
 * Hook para crear un lead nuevo desde Captación.
 * Invoca RPC `crear_lead_captacion` que en una transacción atómica inserta:
 *   - empresa
 *   - contacto (si hay datos)
 *   - oportunidad (etapa_operativa='nuevo', responsable=auth.uid())
 * Devuelve el `oportunidad_id` creado.
 */
export function useCrearLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CrearLeadInput): Promise<string> => {
      const { data, error } = await supabaseAny.rpc('crear_lead_captacion', {
        p_empresa_nombre:   input.empresa_nombre,
        p_empresa_nif:      input.empresa_nif ?? null,
        p_empresa_telefono: input.empresa_telefono ?? null,
        p_empresa_email:    input.empresa_email ?? null,
        p_empresa_ciudad:   input.empresa_ciudad ?? null,
        p_empresa_segmento: input.empresa_segmento ?? 'comercial',
        p_contactos:        input.contactos ?? [],
        p_origen: input.origen ?? 'cold',
        p_notas:  input.notas ?? null,
        p_fecha_vencimiento_contrato: input.fecha_vencimiento_contrato ?? null,
        p_fuente_vencimiento: input.fuente_vencimiento ?? null,
        p_notas_vencimiento: input.notas_vencimiento ?? null,
      })
      if (error) {
        logError(error, 'useCrearLead')
        throw error
      }
      return String(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mis_oportunidades'] })
      queryClient.invalidateQueries({ queryKey: ['captacion_todos_mis_casos'] })
    },
  })
}

export function useTodosMisCasosCaptacion() {
  return useQuery({
    queryKey: ['captacion_todos_mis_casos'],
    queryFn: async (): Promise<VTodosMisCasosRow[]> => {
      // Cast: vista nueva del sprint Día 1, aún no presente en los tipos
      // generados de Supabase. Cuando se regeneren con
      // `npx supabase gen types typescript --project-id <ref> > src/core/types/database.ts`
      // se podrá usar `supabase.from(...)` directo.
      const { data, error } = await supabaseAny
        .from('v_captacion_todos_mis_casos')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) {
        logError(error, 'useTodosMisCasosCaptacion')
        throw error
      }
      return (data ?? []) as VTodosMisCasosRow[]
    },
  })
}

/** Detalle de una oportunidad para el drawer (incluye empresa + contactos) */
export function useOportunidadDetalle(id: string | null) {
  return useQuery({
    queryKey: ['oportunidad_detalle', id],
    enabled: !!id,
    queryFn: async (): Promise<OportunidadDetalle | null> => {
      if (!id) return null
      const { data, error } = await supabase
        .from('oportunidades')
        .select(`
          id, nombre, tipo, etapa, etapa_operativa, contexto,
          decisor_identificado, valor_estimado_eur, ahorro_anual_estimado,
          factura_fecha_prevista, factura_recibida_at, factura_documento_id,
          propuesta_documento_id, propuesta_enviada_at, notas,
          fecha_vencimiento_contrato_prospecto,
          fuente_vencimiento_contrato_prospecto,
          notas_vencimiento_contrato_prospecto,
          responsable_actual_id, created_at, updated_at,
          empresa:empresas (
            id, nombre, nif, telefono_principal, email_principal, ciudad, segmento, estado_relacion
          ),
          contactos:contactos (
            id, nombre, cargo, telefono, email, es_decisor, es_principal
          )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        logError(error, 'useOportunidadDetalle')
        throw error
      }
      return (data ?? null) as unknown as OportunidadDetalle | null
    },
  })
}

/** Timeline de actividades de una oportunidad (orden DESC por fecha) */
export function useActividadesOportunidad(oportunidadId: string | null) {
  return useQuery({
    queryKey: ['actividades_oportunidad', oportunidadId],
    enabled: !!oportunidadId,
    queryFn: async (): Promise<ActividadRow[]> => {
      if (!oportunidadId) return []
      const { data, error } = await supabase
        .from('actividades')
        .select('id, tipo, titulo, descripcion, fecha_actividad, resultado, usuario_id, adjunto_url, adjunto_nombre')
        .eq('entidad_tipo', 'oportunidad')
        .eq('entidad_id', oportunidadId)
        .is('deleted_at', null)
        .order('fecha_actividad', { ascending: false })

      if (error) {
        logError(error, 'useActividadesOportunidad')
        throw error
      }
      return (data ?? []) as ActividadRow[]
    },
  })
}

/**
 * Hook para editar lead existente desde el drawer.
 * Invoca RPC `actualizar_lead_captacion` que actualiza atómicamente:
 *   - empresa (nombre + datos)
 *   - contacto principal (más antiguo de la empresa)
 *   - notas de la oportunidad
 * Valida funciones operativas + ownership (responsable/creador/admin).
 */
export function useActualizarLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ActualizarLeadInput): Promise<void> => {
      const { error } = await supabaseAny.rpc('actualizar_lead_captacion', {
        p_oportunidad_id:    input.oportunidadId,
        p_empresa_nombre:    input.empresa_nombre,
        p_empresa_nif:       input.empresa_nif ?? null,
        p_empresa_telefono:  input.empresa_telefono ?? null,
        p_empresa_email:     input.empresa_email ?? null,
        p_empresa_ciudad:    input.empresa_ciudad ?? null,
        p_empresa_segmento:  input.empresa_segmento ?? null,
        p_contactos:         input.contactos ?? [],
        p_notas:             input.notas ?? null,
        p_fecha_vencimiento_contrato: input.fecha_vencimiento_contrato ?? null,
        p_fuente_vencimiento: input.fuente_vencimiento ?? null,
        p_notas_vencimiento: input.notas_vencimiento ?? null,
        p_actualizar_vencimiento: input.actualizar_vencimiento ?? false,
      })
      if (error) {
        logError(error, 'useActualizarLead')
        throw error
      }
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['mis_oportunidades'] })
      queryClient.invalidateQueries({ queryKey: ['captacion_todos_mis_casos'] })
      queryClient.invalidateQueries({ queryKey: ['oportunidad_detalle', input.oportunidadId] })
    },
  })
}

/**
 * Hook para convertir empresa prospecto a cliente CRM.
 * Solo asesor_senior o admin (validado en RPC).
 * Atómico: cambia estado_relacion, migra oportunidades captacion→crm,
 * marca etapa contrato_firmado si se especifica oportunidad concreta,
 * registra actividad.
 *
 * Origen: feedback Juan/ChatGPT 2026-05-05 separación CRM/Captación.
 */
export function useConvertirCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { empresaId: string; oportunidadId?: string; notas?: string }): Promise<void> => {
      const { error } = await supabaseAny.rpc('convertir_prospecto_a_cliente', {
        p_empresa_id: input.empresaId,
        p_oportunidad_id: input.oportunidadId ?? null,
        p_notas: input.notas ?? null,
      })
      if (error) {
        logError(error, 'useConvertirCliente')
        throw error
      }
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['mis_oportunidades'] })
      queryClient.invalidateQueries({ queryKey: ['captacion_todos_mis_casos'] })
      queryClient.invalidateQueries({ queryKey: ['oportunidad_detalle', input.oportunidadId] })
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
    },
  })
}

/* ============================================================
 * Mutaciones de etapas / handoffs / actividades (Día 3-4 sprint)
 * ============================================================ */

async function obtenerUsuarioId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('No autenticado')
  return data.user.id
}

export type RegistrarActividadInput = {
  oportunidadId: string
  tipo: string  // ej: 'llamada', 'email', 'cambio_etapa', 'nota'
  titulo: string
  descripcion?: string
  resultado?: string
  fecha?: string  // ISO; default = NOW
  adjunto_url?: string
  adjunto_nombre?: string
}

/**
 * Registrar actividad sobre una oportunidad (timeline).
 * Llamadas, emails, recordatorios, cambios de etapa, etc.
 */
async function registrarActividad(input: RegistrarActividadInput): Promise<void> {
  const userId = await obtenerUsuarioId()
  const { error } = await supabaseAny
    .from('actividades')
    .insert({
      entidad_tipo: 'oportunidad',
      entidad_id: input.oportunidadId,
      tipo: input.tipo,
      titulo: input.titulo,
      descripcion: input.descripcion ?? null,
      resultado: input.resultado ?? null,
      fecha_actividad: input.fecha ?? new Date().toISOString(),
      usuario_id: userId,
      adjunto_url: input.adjunto_url ?? null,
      adjunto_nombre: input.adjunto_nombre ?? null,
      privada: false,
    })
  if (error) {
    logError(error, 'registrarActividad')
    throw error
  }
}

/**
 * Cambiar etapa_operativa + registrar actividad atómicamente (best-effort).
 * Si la actividad falla, no rollback de etapa (Postgres no soporta tx desde JS).
 * En caso de fallo de actividad, queda log pero etapa está cambiada.
 */
export type CambiarEtapaInput = {
  oportunidadId: string
  etapaOperativa: string
  // Campos opcionales para actualizar junto con la etapa
  factura_fecha_prevista?: string | null
  factura_recibida_at?: string | null
  factura_documento_id?: string | null
  propuesta_documento_id?: string | null
  propuesta_enviada_at?: string | null
  visita_programada_at?: string | null
  decisor_identificado?: boolean
  motivo_perdida_codigo?: string | null
  motivo_perdida_detalle?: string | null
  etapa?: 'prospecto' | 'auditoria_consumo' | 'oferta_presentada' | 'negociacion' | 'contrato_firmado' | 'activo' | 'cerrada_ganada' | 'cerrada_perdida'
  notasAppend?: string  // texto a añadir a notas existentes
}

export function useCambiarEtapa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CambiarEtapaInput) => {
      // 1) Si hay notasAppend, leer notas actuales + concat
      let notasFinales: string | null | undefined
      if (input.notasAppend) {
        const { data, error: errLoad } = await supabase
          .from('oportunidades')
          .select('notas')
          .eq('id', input.oportunidadId)
          .maybeSingle()
        if (errLoad) throw errLoad
        const previas = data?.notas ?? ''
        const ts = new Date().toLocaleString('es-ES')
        notasFinales = previas
          ? `${previas}\n\n[${ts}] ${input.notasAppend}`
          : `[${ts}] ${input.notasAppend}`
      }

      // 2) Actualizar oportunidad
      const updates: Record<string, unknown> = {
        etapa_operativa: input.etapaOperativa,
      }
      if (input.etapa !== undefined) updates.etapa = input.etapa
      if (input.factura_fecha_prevista !== undefined) updates.factura_fecha_prevista = input.factura_fecha_prevista
      if (input.factura_recibida_at !== undefined) updates.factura_recibida_at = input.factura_recibida_at
      if (input.factura_documento_id !== undefined) updates.factura_documento_id = input.factura_documento_id
      if (input.propuesta_documento_id !== undefined) updates.propuesta_documento_id = input.propuesta_documento_id
      if (input.propuesta_enviada_at !== undefined) updates.propuesta_enviada_at = input.propuesta_enviada_at
      if (input.visita_programada_at !== undefined) updates.visita_programada_at = input.visita_programada_at
      if (input.decisor_identificado !== undefined) updates.decisor_identificado = input.decisor_identificado
      if (input.motivo_perdida_codigo !== undefined) updates.motivo_perdida_codigo = input.motivo_perdida_codigo
      if (input.motivo_perdida_detalle !== undefined) updates.motivo_perdida_detalle = input.motivo_perdida_detalle
      if (notasFinales !== undefined) updates.notas = notasFinales

      const { error } = await supabaseAny
        .from('oportunidades')
        .update(updates)
        .eq('id', input.oportunidadId)
      if (error) {
        logError(error, 'useCambiarEtapa')
        throw error
      }
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['mis_oportunidades'] })
      queryClient.invalidateQueries({ queryKey: ['captacion_todos_mis_casos'] })
      queryClient.invalidateQueries({ queryKey: ['oportunidad_detalle', input.oportunidadId] })
      queryClient.invalidateQueries({ queryKey: ['actividades_oportunidad', input.oportunidadId] })
    },
  })
}

/**
 * Registrar actividad sobre una oportunidad (sin cambiar etapa).
 * Usado para llamadas sin respuesta, recordatorios, notas.
 */
export function useRegistrarActividad() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: RegistrarActividadInput) => {
      await registrarActividad(input)
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['actividades_oportunidad', input.oportunidadId] })
    },
  })
}

/**
 * Hacer un handoff de oportunidad a otro user (Carolina A → Carolina M, etc.).
 * Inserta fila en oportunidad_handoffs (trigger BD aplica responsable_actual_id).
 */
export type HandoffInput = {
  oportunidadId: string
  toUserId: string
  motivo: string  // NOT NULL en BD; descriptor: 'pasar_a_analisis', 'pedir_visita', etc.
  etapaOperativaDestino?: string  // ej: 'factura_recibida', 'asignada_a_senior'
  notas?: string
}

export function useHacerHandoff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: HandoffInput) => {
      const fromUserId = await obtenerUsuarioId()
      const { error } = await supabaseAny
        .from('oportunidad_handoffs')
        .insert({
          oportunidad_id: input.oportunidadId,
          from_user_id: fromUserId,
          to_user_id: input.toUserId,
          motivo: input.motivo,
          etapa_operativa_destino: input.etapaOperativaDestino ?? null,
          notas: input.notas ?? null,
          created_by: fromUserId,
        })
      if (error) {
        logError(error, 'useHacerHandoff')
        throw error
      }
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['mis_oportunidades'] })
      queryClient.invalidateQueries({ queryKey: ['captacion_todos_mis_casos'] })
      queryClient.invalidateQueries({ queryKey: ['oportunidad_detalle', input.oportunidadId] })
      queryClient.invalidateQueries({ queryKey: ['actividades_oportunidad', input.oportunidadId] })
    },
  })
}

/** Lista de usuarios senior (asesor_senior) para selector de "Pedir visita" */
export type SeniorRow = { id: string; full_name: string | null; email: string }
export function useAsesoresSenior() {
  return useQuery({
    queryKey: ['asesores_senior'],
    queryFn: async (): Promise<SeniorRow[]> => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .eq('approved', true)
        .eq('status', 'active')
        .contains('funciones', ['asesor_senior'])
        .order('full_name', { ascending: true })
      if (error) {
        logError(error, 'useAsesoresSenior')
        throw error
      }
      return (data ?? []) as SeniorRow[]
    },
  })
}

/** Usuario(s) con función analista (típicamente Carolina M) para handoff factura */
export function useAnalistas() {
  return useQuery({
    queryKey: ['analistas'],
    queryFn: async (): Promise<SeniorRow[]> => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .eq('approved', true)
        .eq('status', 'active')
        .contains('funciones', ['analista'])
        .order('full_name', { ascending: true })
      if (error) {
        logError(error, 'useAnalistas')
        throw error
      }
      return (data ?? []) as SeniorRow[]
    },
  })
}

export function agruparPorEtapa(
  oportunidades: VMisOportunidadesRow[],
): Record<string, VMisOportunidadesRow[]> {
  const resultado: Record<string, VMisOportunidadesRow[]> = {}
  for (const op of oportunidades) {
    const etapa = op.etapa_operativa ?? 'sin_etapa'
    if (!resultado[etapa]) {
      resultado[etapa] = []
    }
    resultado[etapa].push(op)
  }
  return resultado
}

export const ETAPA_LABELS: Record<string, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  esperando_factura: 'Esperando factura',
  factura_recibida: 'Factura recibida',
  en_analisis: 'En análisis',
  propuesta_lista: 'Propuesta lista',
  propuesta_en_preparacion: 'Propuesta en preparación',
  propuesta_enviada: 'Propuesta enviada',
  asignada_a_senior: 'Asignada a senior',
  seguimiento: 'Seguimiento',
  cerrado_ganada: 'Cerrado - Ganada',
  cerrado_perdida: 'Cerrado - Perdida',
}

export const ETAPA_COLORS: Record<string, string> = {
  nuevo: 'bg-slate-50 border-slate-200 text-slate-700',
  contactado: 'bg-slate-50 border-slate-200 text-slate-700',
  esperando_factura: 'bg-amber-50 border-amber-200 text-amber-700',
  factura_recibida: 'bg-amber-50 border-amber-200 text-amber-700',
  en_analisis: 'bg-blue-50 border-blue-200 text-blue-700',
  propuesta_lista: 'bg-blue-50 border-blue-200 text-blue-700',
  propuesta_en_preparacion: 'bg-blue-50 border-blue-200 text-blue-700',
  propuesta_enviada: 'bg-purple-50 border-purple-200 text-purple-700',
  asignada_a_senior: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  seguimiento: 'bg-purple-50 border-purple-200 text-purple-700',
  cerrado_ganada: 'bg-green-50 border-green-200 text-green-700',
  cerrado_perdida: 'bg-gray-50 border-gray-200 text-gray-700',
}
