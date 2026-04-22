/**
 * Valere CRM · Types de dominio del núcleo.
 * Mapea 1:1 supabase/migrations/001_crm_core.sql.
 */

export type RolUsuario = 'master' | 'manager' | 'client'
export type TipoEmpresa = 'empresa' | 'autonomo' | 'comunidad_propietarios' | 'cooperativa' | 'asociacion'
export type SegmentoEmpresa = 'industrial' | 'comercial' | 'servicios' | 'agricola' | 'residencial_colectivo'
export type TipoEnergia = 'electrica' | 'gas' | 'dual'
export type TipoPrecio = 'fijo' | 'indexado' | 'mixto'
export type EstadoContrato = 'borrador' | 'tramite' | 'activo' | 'vencido' | 'baja' | 'incidencia' | 'cancelado'
export type EstadoCups = 'activo' | 'baja' | 'pendiente'
export type TipoOportunidad = 'nueva_venta' | 'renovacion' | 'ampliacion' | 'recuperacion'
export type EtapaOportunidad = 'prospecto' | 'contactado' | 'analisis' | 'propuesta_enviada' | 'negociacion' | 'ganada' | 'perdida' | 'cancelada' | 'auditoria_consumo' | 'oferta_presentada' | 'contrato_firmado' | 'activo' | 'cerrada_ganada' | 'cerrada_perdida'
export type TipoIncidencia = 'facturacion' | 'cambio_comercializadora' | 'corte_suministro' | 'potencia' | 'acceso_red' | 'otro'
export type EstadoIncidencia = 'abierta' | 'en_gestion' | 'pendiente_cliente' | 'pendiente_comercializadora' | 'resuelta' | 'cerrada'
export type PrioridadIncidencia = 'baja' | 'media' | 'alta' | 'critica'
export type EstadoRenovacion = 'detectada' | 'contactado' | 'oferta_enviada' | 'negociacion' | 'renovado' | 'perdido'
export type TipoActividad = 'llamada' | 'email' | 'reunion' | 'tarea' | 'nota' | 'cambio_estado' | 'documento' | 'whatsapp' | 'visita'
export type ResultadoActividad = 'positivo' | 'neutral' | 'negativo' | 'sin_respuesta'
export type EstadoTarea = 'pendiente' | 'completada' | 'cancelada'
export type EntidadTipo = 'empresa' | 'contacto' | 'contrato' | 'oportunidad'
export type EstadoPropuesta = 'borrador' | 'enviada' | 'vista' | 'aceptada' | 'rechazada' | 'caducada'
export type TipoDatoCustom = 'texto' | 'numero' | 'fecha' | 'booleano' | 'lista' | 'multiselect'
export type PrioridadRenovacion = 'critica' | 'alta' | 'media' | 'baja' | 'ok'

export interface UserProfile {
  id: string
  email: string | null
  full_name: string | null
  role: string | null
  status: string | null
  approved: boolean | null
  avatar_url: string | null
  created_at: string | null
  updated_at: string | null
}

export interface Empresa {
  id: string
  nombre: string
  nif: string | null
  tipo: TipoEmpresa | null
  segmento: SegmentoEmpresa | null
  email_principal: string | null
  telefono_principal: string | null
  web: string | null
  direccion: string | null
  cp: string | null
  ciudad: string | null
  provincia: string | null
  pais: string | null
  comercial_id: string | null
  notas: string | null
  tags: string[]
  external_id: string | null
  deleted_at: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface Contacto {
  id: string
  empresa_id: string
  nombre: string
  apellidos: string | null
  email: string | null
  telefono: string | null
  movil: string | null
  cargo: string | null
  departamento: string | null
  es_decisor: boolean
  es_firmante: boolean
  notas: string | null
  tags: string[]
  deleted_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Contrato {
  id: string
  empresa_id: string
  contacto_firmante_id: string | null
  comercial_id: string | null
  numero_contrato: string | null
  compania: string
  tarifa_acceso: string | null
  tarifa_cliente: string | null
  tipo_energia: TipoEnergia | null
  tipo_precio: TipoPrecio | null
  fecha_firma: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  duracion_meses: number | null
  consumo_sips_kwh: number | null
  consumo_po_kwh: number | null
  potencia_contratada: number | null
  comision_integra: number | null
  comision_comercial: number | null
  comision_jefe: number | null
  estado: EstadoContrato
  observaciones: string | null
  external_id: string | null
  deleted_at: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface Cups {
  id: string
  contrato_id: string | null
  empresa_id: string
  codigo_cups: string
  direccion_suministro: string | null
  distribuidor: string | null
  estado: EstadoCups
  tarifa_acceso: string | null
  tarifa_manual: string | null
  potencias_contratadas: Record<string, number> | null
  comercializadora_actual: string | null
  modelo_autoconsumo: string | null
  modelo_autoconsumo_manual: string | null
  potencia_fv_kwp: number | null
  coste_instalacion_fv_eur: number | null
  potencia_inversor_kw: number | null
  fecha_instalacion_fv: string | null
  marca_inversor: string | null
  energia_p1_kwh: number | null
  energia_p2_kwh: number | null
  energia_p3_kwh: number | null
  energia_p4_kwh: number | null
  energia_p5_kwh: number | null
  energia_p6_kwh: number | null
  // Campos Datadis (migración 20260422_datadis_integracion)
  datadis_sincronizado: boolean | null
  datadis_ultima_sync: string | null
  datadis_distribuidor_cod: string | null
  datadis_punto_tipo: number | null
  deleted_at: string | null
  created_at: string
}

// ──────────────────────────────────────────────
// INTEGRACIÓN DATADIS
// ──────────────────────────────────────────────

/** Credenciales de Datadis almacenadas por empresa */
export interface DatadisToken {
  id: string
  empresa_id: string
  username: string          // NIF/NIE/CIF del titular en Datadis
  password_enc: string      // Contraseña cifrada (solo para escritura, no mostrar en UI)
  autorizado: boolean
  token_cache: string | null
  token_expira: string | null
  ultimo_error: string | null
  created_at: string
  updated_at: string
}

/** Consumo horario descargado de Datadis */
export interface DatadisConsumption {
  id: string
  cups_id: string
  fecha: string             // ISO date: "2026-01-15"
  hora: number              // 0–23
  consumo_kwh: number
  excedente_kwh: number
  metodo_obtencion: 'real' | 'estimada'
  origen: string
  created_at: string
}

// Respuestas raw de la API de Datadis (formato que devuelve la API oficial)
export interface DatadisSupplyRaw {
  cups: string
  validDateFrom: string
  validDateTo: string
  pointType: number         // 1 = cuarto-horario, 2 = cierre mensual
  distributorCode: string   // "2" = Iberdrola, etc.
  distributorName: string
  marketer: string          // Comercializadora actual
  postalCode: string
  province: string
  municipality: string
  address: string
  contractedPowerkW: number[]  // Potencias P1–P6
  accessTariff: string      // "2.0TD", "3.0TD", etc.
  selfConsumptionType: string | null
  surplusDistribution: boolean | null
}

export interface DatadisConsumptionRaw {
  cups: string
  date: string              // "2026/01/15"
  time: string              // "01:00"
  consumptionKWh: number
  surplusEnergyKWh: number
  obtainMethod: string      // "Real" | "Estimated"
}

export type DatadisTokenInsert = Omit<DatadisToken, 'id' | 'created_at' | 'updated_at'>
export type DatadisTokenUpdate = Partial<DatadisTokenInsert>
export type DatadisConsumptionInsert = Omit<DatadisConsumption, 'id' | 'created_at'>

export interface Oportunidad {
  id: string
  empresa_id: string
  contrato_origen_id: string | null
  contacto_id: string | null
  comercial_id: string | null
  tipo: TipoOportunidad
  nombre: string
  etapa: EtapaOportunidad
  probabilidad_pct: number
  valor_estimado_eur: number | null
  ahorro_anual_estimado: number | null
  fecha_cierre_prevista: string | null
  motivo_perdida: string | null
  notas: string | null
  tags: string[]
  external_id: string | null
  deleted_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Actividad {
  id: string
  tipo: TipoActividad
  titulo: string
  descripcion: string | null
  fecha_actividad: string
  duracion_min: number | null
  resultado: ResultadoActividad | null
  estado_tarea: EstadoTarea | null
  fecha_vencimiento: string | null
  entidad_tipo: EntidadTipo
  entidad_id: string
  usuario_id: string | null
  asignado_a: string | null
  adjunto_url: string | null
  adjunto_nombre: string | null
  privada: boolean
  deleted_at: string | null
  created_at: string
}

export interface Propuesta {
  id: string
  oportunidad_id: string | null
  empresa_id: string
  creada_por: string | null
  version: number
  compania_propuesta: string | null
  tarifa_propuesta: string | null
  precio_kwh: number | null
  potencia: number | null
  ahorro_estimado_pct: number | null
  comision_estimada: number | null
  estado: EstadoPropuesta
  fecha_envio: string | null
  fecha_validez: string | null
  fecha_respuesta: string | null
  notas_cliente: string | null
  pdf_url: string | null
  datos_json: Record<string, unknown> | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface CustomFieldSchema {
  id: string
  entidad_tipo: EntidadTipo
  nombre_campo: string
  etiqueta: string
  tipo_dato: TipoDatoCustom
  opciones_lista: unknown | null
  obligatorio: boolean
  orden: number
  activo: boolean
  created_at: string
}

export interface CustomFieldValue {
  id: string
  schema_id: string
  entidad_id: string
  valor_texto: string | null
  valor_numero: number | null
  valor_fecha: string | null
  valor_json: unknown | null
  created_at: string
  updated_at: string
}

export interface Incidencia {
  id: string
  empresa_id: string
  contrato_id: string | null
  cups: string | null
  titulo: string
  descripcion: string | null
  tipo: TipoIncidencia
  estado: EstadoIncidencia
  prioridad: PrioridadIncidencia
  asignado_a: string | null
  fecha_apertura: string
  fecha_limite: string | null
  fecha_resolucion: string | null
  importe_reclamado: number | null
  importe_recuperado: number | null
  notas_resolucion: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Renovacion {
  id: string
  contrato_id: string
  empresa_id: string
  estado: EstadoRenovacion
  prioridad: PrioridadRenovacion
  fecha_deteccion: string
  fecha_vencimiento_contrato: string | null
  motivo_perdida: string | null
  nuevo_contrato_id: string | null
  asignado_a: string | null
  notas: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Documento {
  id: string
  entidad_tipo: EntidadTipo
  entidad_id: string
  nombre: string
  tipo: string | null
  ruta_storage: string
  tamanio: number | null
  mime_type: string | null
  descripcion: string | null
  subido_por: string | null
  created_at: string
  deleted_at: string | null
}

export interface Notificacion {
  id: string
  usuario_id: string
  tipo: string | null
  titulo: string | null
  cuerpo: string | null
  entidad_tipo: string | null
  entidad_id: string | null
  leida: boolean
  leida_at: string | null
  created_at: string
}

type AutoCols = 'id' | 'created_at' | 'updated_at' | 'deleted_at'
export type Insert<T> = Omit<T, Extract<keyof T, AutoCols>>
export type Update<T> = Partial<Insert<T>>

export type UserProfileInsert = Insert<UserProfile>
export type UserProfileUpdate = Update<UserProfile>
export type EmpresaInsert = Insert<Empresa>
export type EmpresaUpdate = Update<Empresa>
export type ContactoInsert = Insert<Contacto>
export type ContactoUpdate = Update<Contacto>
export type ContratoInsert = Insert<Contrato>
export type ContratoUpdate = Update<Contrato>
export type CupsInsert = Insert<Cups>
export type CupsUpdate = Update<Cups>
export type OportunidadInsert = Insert<Oportunidad>
export type OportunidadUpdate = Update<Oportunidad>
export type ActividadInsert = Insert<Actividad>
export type ActividadUpdate = Update<Actividad>
export type PropuestaInsert = Insert<Propuesta>
export type PropuestaUpdate = Update<Propuesta>
export type CustomFieldSchemaInsert = Insert<CustomFieldSchema>
export type CustomFieldSchemaUpdate = Update<CustomFieldSchema>
export type CustomFieldValueInsert = Insert<CustomFieldValue>
export type CustomFieldValueUpdate = Update<CustomFieldValue>
export type NotificacionInsert = Insert<Notificacion>
export type NotificacionUpdate = Update<Notificacion>
export type IncidenciaInsert = Insert<Incidencia>
export type IncidenciaUpdate = Update<Incidencia>
export type RenovacionInsert = Insert<Renovacion>
export type RenovacionUpdate = Update<Renovacion>
export type DocumentoInsert = Insert<Documento>
export type DocumentoUpdate = Update<Documento>

export type TipoEvento = 'reunion' | 'llamada' | 'visita' | 'tarea' | 'vencimiento' | 'otro'
export type EntidadEvento = 'empresa' | 'contacto' | 'contrato' | 'oportunidad' | 'incidencia' | 'renovacion'

export interface Evento {
  id: string
  titulo: string
  descripcion: string | null
  tipo: TipoEvento
  fecha_inicio: string
  fecha_fin: string | null
  todo_el_dia: boolean
  ubicacion: string | null
  color: string | null
  entidad_tipo: EntidadEvento | null
  entidad_id: string | null
  usuario_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type EventoInsert = Insert<Evento>
export type EventoUpdate = Update<Evento>

// Datadis (Insert/Update ya definidos inline arriba para evitar conflicto con helper genérico)
