/**
 * Fixtures para modo DEMO — datos completamente ficticios.
 *
 * Estos datos se devuelven cuando alguien llama supabase.from(table).select()
 * con VITE_DEMO_MODE=true. Tablas no listadas devuelven array vacío.
 *
 * Los UUIDs son determinísticos para que las relaciones funcionen.
 */

const today = new Date()
const isoDaysAgo = (n: number) =>
  new Date(today.getTime() - n * 24 * 60 * 60 * 1000).toISOString()
const isoDaysAhead = (n: number) =>
  new Date(today.getTime() + n * 24 * 60 * 60 * 1000).toISOString()

// IDs determinísticos
const U_ADMIN = '00000000-0000-4000-8000-000000000001'
const U_ASESOR = '00000000-0000-4000-8000-000000000002'
const U_ANALISTA = '00000000-0000-4000-8000-000000000003'
const U_TELE = '00000000-0000-4000-8000-000000000004'

const E1 = '10000000-0000-4000-8000-000000000001'
const E2 = '10000000-0000-4000-8000-000000000002'
const E3 = '10000000-0000-4000-8000-000000000003'
const E4 = '10000000-0000-4000-8000-000000000004'
const E5 = '10000000-0000-4000-8000-000000000005'

const C1 = '20000000-0000-4000-8000-000000000001'
const C2 = '20000000-0000-4000-8000-000000000002'
const C3 = '20000000-0000-4000-8000-000000000003'

const O1 = '30000000-0000-4000-8000-000000000001'
const O2 = '30000000-0000-4000-8000-000000000002'
const O3 = '30000000-0000-4000-8000-000000000003'
const O4 = '30000000-0000-4000-8000-000000000004'
const O5 = '30000000-0000-4000-8000-000000000005'

const CTR1 = '40000000-0000-4000-8000-000000000001'
const CTR2 = '40000000-0000-4000-8000-000000000002'

const FV1 = '50000000-0000-4000-8000-000000000001'
const FV2 = '50000000-0000-4000-8000-000000000002'

// ────────────────────────────────────────────────────────────────────────────
// USER PROFILES (4 roles distintos para auditar permisos)
// ────────────────────────────────────────────────────────────────────────────
export const USER_PROFILES = [
  {
    id: U_ADMIN,
    email: 'auditor@valere.demo',
    full_name: 'Auditor Demo (Admin)',
    role: 'master',
    status: 'active',
    approved: true,
    avatar_url: null,
    funciones: ['admin'],
    created_at: isoDaysAgo(120),
    updated_at: isoDaysAgo(1),
  },
  {
    id: U_ASESOR,
    email: 'senior@valere.demo',
    full_name: 'Sara Senior (Asesor)',
    role: 'manager',
    status: 'active',
    approved: true,
    avatar_url: null,
    funciones: ['asesor_senior'],
    created_at: isoDaysAgo(110),
    updated_at: isoDaysAgo(2),
  },
  {
    id: U_ANALISTA,
    email: 'analista@valere.demo',
    full_name: 'Ana Analista',
    role: 'client',
    status: 'active',
    approved: true,
    avatar_url: null,
    funciones: ['analista'],
    created_at: isoDaysAgo(100),
    updated_at: isoDaysAgo(3),
  },
  {
    id: U_TELE,
    email: 'telemarketing@valere.demo',
    full_name: 'Tomás Telemarketing',
    role: 'client',
    status: 'active',
    approved: true,
    avatar_url: null,
    funciones: ['telemarketing'],
    created_at: isoDaysAgo(90),
    updated_at: isoDaysAgo(4),
  },
]

// ────────────────────────────────────────────────────────────────────────────
// EMPRESAS (5 — mezcla cliente / lead)
// ────────────────────────────────────────────────────────────────────────────
export const EMPRESAS = [
  {
    id: E1,
    nombre: 'Industrial Demo Norte S.L.',
    nif: 'B00000001',
    tipo: 'empresa',
    segmento: 'industrial',
    estado_relacion: 'cliente',
    email_principal: 'contacto@demo-norte.example',
    telefono_principal: '+34 900 000 001',
    web: 'https://demo-norte.example',
    direccion: 'C/ Demo Norte, 1',
    cp: '28001',
    ciudad: 'Madrid',
    provincia: 'Madrid',
    pais: 'ES',
    comercial_id: U_ASESOR,
    notas: 'Cliente fidelizado. Renovación 2026.',
    tags: ['fidelizado', 'industrial'],
    external_id: null,
    deleted_at: null,
    created_by: U_ADMIN,
    updated_by: U_ASESOR,
    created_at: isoDaysAgo(80),
    updated_at: isoDaysAgo(5),
    comercial: { id: U_ASESOR, full_name: 'Sara Senior (Asesor)' },
  },
  {
    id: E2,
    nombre: 'Comercial Demo Sur S.A.',
    nif: 'A00000002',
    tipo: 'empresa',
    segmento: 'comercial',
    estado_relacion: 'cliente',
    email_principal: 'info@demo-sur.example',
    telefono_principal: '+34 900 000 002',
    web: null,
    direccion: 'Av. Demo Sur, 22',
    cp: '41001',
    ciudad: 'Sevilla',
    provincia: 'Sevilla',
    pais: 'ES',
    comercial_id: U_ASESOR,
    notas: null,
    tags: ['B2B'],
    external_id: null,
    deleted_at: null,
    created_by: U_ADMIN,
    updated_by: null,
    created_at: isoDaysAgo(60),
    updated_at: isoDaysAgo(7),
    comercial: { id: U_ASESOR, full_name: 'Sara Senior (Asesor)' },
  },
  {
    id: E3,
    nombre: 'Servicios Demo Levante S.L.U.',
    nif: 'B00000003',
    tipo: 'empresa',
    segmento: 'servicios',
    estado_relacion: 'lead',
    email_principal: 'gerencia@demo-levante.example',
    telefono_principal: '+34 900 000 003',
    web: 'https://demo-levante.example',
    direccion: 'Pza. Demo Levante, 8',
    cp: '46001',
    ciudad: 'Valencia',
    provincia: 'Valencia',
    pais: 'ES',
    comercial_id: U_TELE,
    notas: 'Lead captación primaria. Pte. asignar análisis.',
    tags: ['lead', 'captacion'],
    external_id: null,
    deleted_at: null,
    created_by: U_TELE,
    updated_by: null,
    created_at: isoDaysAgo(20),
    updated_at: isoDaysAgo(2),
    comercial: { id: U_TELE, full_name: 'Tomás Telemarketing' },
  },
  {
    id: E4,
    nombre: 'Cooperativa Demo Agraria',
    nif: 'F00000004',
    tipo: 'cooperativa',
    segmento: 'agricola',
    estado_relacion: 'cliente',
    email_principal: 'admin@coop-demo.example',
    telefono_principal: '+34 900 000 004',
    web: null,
    direccion: 'Camino Demo, s/n',
    cp: '02001',
    ciudad: 'Albacete',
    provincia: 'Albacete',
    pais: 'ES',
    comercial_id: U_ASESOR,
    notas: 'Tiene planta FV de autoconsumo.',
    tags: ['FV', 'agricola'],
    external_id: null,
    deleted_at: null,
    created_by: U_ADMIN,
    updated_by: null,
    created_at: isoDaysAgo(150),
    updated_at: isoDaysAgo(10),
    comercial: { id: U_ASESOR, full_name: 'Sara Senior (Asesor)' },
  },
  {
    id: E5,
    nombre: 'Comunidad Demo Edificio Centro',
    nif: 'H00000005',
    tipo: 'comunidad_propietarios',
    segmento: 'residencial_colectivo',
    estado_relacion: 'lead',
    email_principal: 'presidencia@cp-demo.example',
    telefono_principal: '+34 900 000 005',
    web: null,
    direccion: 'C/ Centro, 100',
    cp: '08001',
    ciudad: 'Barcelona',
    provincia: 'Barcelona',
    pais: 'ES',
    comercial_id: U_ANALISTA,
    notas: 'Pendiente analisis de viabilidad FV colectivo.',
    tags: ['lead', 'FV'],
    external_id: null,
    deleted_at: null,
    created_by: U_TELE,
    updated_by: U_ANALISTA,
    created_at: isoDaysAgo(15),
    updated_at: isoDaysAgo(1),
    comercial: { id: U_ANALISTA, full_name: 'Ana Analista' },
  },
]

// ────────────────────────────────────────────────────────────────────────────
// CONTACTOS
// ────────────────────────────────────────────────────────────────────────────
export const CONTACTOS = [
  {
    id: C1,
    empresa_id: E1,
    nombre: 'Marta',
    apellidos: 'Demo García',
    email: 'marta@demo-norte.example',
    telefono: '+34 911 000 001',
    movil: '+34 600 000 001',
    cargo: 'Directora Financiera',
    departamento: 'Finanzas',
    es_decisor: true,
    es_firmante: true,
    notas: 'Decisora principal.',
    tags: ['decisor'],
    deleted_at: null,
    created_by: U_ADMIN,
    created_at: isoDaysAgo(80),
    updated_at: isoDaysAgo(5),
  },
  {
    id: C2,
    empresa_id: E2,
    nombre: 'Pedro',
    apellidos: 'Demo López',
    email: 'pedro@demo-sur.example',
    telefono: null,
    movil: '+34 600 000 002',
    cargo: 'Gerente',
    departamento: null,
    es_decisor: true,
    es_firmante: false,
    notas: null,
    tags: [],
    deleted_at: null,
    created_by: U_ADMIN,
    created_at: isoDaysAgo(60),
    updated_at: isoDaysAgo(7),
  },
  {
    id: C3,
    empresa_id: E4,
    nombre: 'Lucía',
    apellidos: 'Demo Martín',
    email: 'lucia@coop-demo.example',
    telefono: '+34 967 000 004',
    movil: null,
    cargo: 'Presidenta',
    departamento: null,
    es_decisor: true,
    es_firmante: true,
    notas: 'Coordinadora cooperativa.',
    tags: ['decisor', 'firmante'],
    deleted_at: null,
    created_by: U_ASESOR,
    created_at: isoDaysAgo(150),
    updated_at: isoDaysAgo(10),
  },
]

// ────────────────────────────────────────────────────────────────────────────
// OPORTUNIDADES (5 — etapas distintas para ver el kanban completo)
// Joins pre-bakeados: empresa, contacto, contrato_origen, responsable.
// `contexto: 'crm'` para que aparezcan en /oportunidades; las de captación
// (contexto: 'captacion') van en las vistas v_mis_oportunidades de abajo.
// ────────────────────────────────────────────────────────────────────────────
const empresaJoin = (id: string) => {
  const e = EMPRESAS.find((x) => x.id === id)
  return e ? { id: e.id, nombre: e.nombre, nif: e.nif } : null
}
const contactoJoin = (id: string | null) => {
  if (!id) return null
  const c = CONTACTOS.find((x) => x.id === id)
  return c ? { id: c.id, nombre: c.nombre, apellidos: c.apellidos, cargo: c.cargo } : null
}
// Nota: NO usar CONTRATOS aquí (declarado más abajo, TDZ). Inline en cada
// oportunidad que tenga contrato_origen.

export const OPORTUNIDADES = [
  {
    id: O1,
    empresa_id: E3,
    contacto_id: null,
    contrato_origen_id: null,
    titulo: 'Captación Levante — análisis SIPS',
    descripcion: 'Lead nuevo telemarketing. Pendiente extracción SIPS.',
    etapa: 'prospecto',
    etapa_operativa: 'prospecto',
    contexto: 'crm',
    tipo: 'nueva_venta',
    valor_estimado: 12000,
    valor_estimado_eur: 12000,
    ahorro_anual_estimado: 2400,
    probabilidad: 15,
    fecha_cierre_prevista: isoDaysAhead(45),
    fecha_vencimiento_contrato_prospecto: isoDaysAhead(60),
    fuente_vencimiento_contrato_prospecto: 'estimado',
    siguiente_accion: 'Llamar para extraer SIPS',
    fecha_siguiente_accion: isoDaysAhead(2),
    comercial_id: U_TELE,
    responsable_actual_id: U_ANALISTA,
    created_by: U_TELE,
    decisor_identificado: false,
    deleted_at: null,
    created_at: isoDaysAgo(20),
    updated_at: isoDaysAgo(2),
    empresa: empresaJoin(E3),
    contacto: null,
    contrato_origen: null,
  },
  {
    id: O2,
    empresa_id: E5,
    contacto_id: null,
    contrato_origen_id: null,
    titulo: 'CP Centro Barcelona — auditoría consumo',
    descripcion: 'Comunidad de propietarios interesada en FV colectivo.',
    etapa: 'auditoria_consumo',
    etapa_operativa: 'auditoria_consumo',
    contexto: 'crm',
    tipo: 'nueva_venta',
    valor_estimado: 8000,
    valor_estimado_eur: 8000,
    ahorro_anual_estimado: 1600,
    probabilidad: 30,
    fecha_cierre_prevista: isoDaysAhead(60),
    fecha_vencimiento_contrato_prospecto: isoDaysAhead(75),
    fuente_vencimiento_contrato_prospecto: 'cliente_llamada',
    siguiente_accion: 'Solicitar facturas año completo',
    fecha_siguiente_accion: isoDaysAhead(5),
    comercial_id: U_ANALISTA,
    responsable_actual_id: U_ASESOR,
    created_by: U_ANALISTA,
    decisor_identificado: true,
    deleted_at: null,
    created_at: isoDaysAgo(15),
    updated_at: isoDaysAgo(1),
    empresa: empresaJoin(E5),
    contacto: null,
    contrato_origen: null,
  },
  {
    id: O3,
    empresa_id: E1,
    contacto_id: C1,
    contrato_origen_id: CTR1,
    titulo: 'Industrial Norte — renovación 2026',
    descripcion: 'Oferta presentada al cliente. Esperando respuesta.',
    etapa: 'oferta_presentada',
    etapa_operativa: 'oferta_presentada',
    contexto: 'crm',
    tipo: 'renovacion',
    valor_estimado: 35000,
    valor_estimado_eur: 35000,
    ahorro_anual_estimado: 7000,
    probabilidad: 60,
    fecha_cierre_prevista: isoDaysAhead(20),
    fecha_vencimiento_contrato_prospecto: isoDaysAhead(5),
    fuente_vencimiento_contrato_prospecto: 'factura',
    siguiente_accion: 'Reunión cierre con CFO',
    fecha_siguiente_accion: isoDaysAhead(3),
    comercial_id: U_ASESOR,
    responsable_actual_id: U_ASESOR,
    created_by: U_ASESOR,
    decisor_identificado: true,
    deleted_at: null,
    created_at: isoDaysAgo(45),
    updated_at: isoDaysAgo(3),
    empresa: empresaJoin(E1),
    contacto: contactoJoin(C1),
    contrato_origen: { id: CTR1, fecha_fin: isoDaysAhead(5), numero_contrato: 'CTR-DEMO-001' },
  },
  {
    id: O4,
    empresa_id: E2,
    contacto_id: C2,
    contrato_origen_id: null,
    titulo: 'Comercial Sur — negociación',
    descripcion: 'En negociación final. Pendiente firma.',
    etapa: 'negociacion',
    etapa_operativa: 'negociacion',
    contexto: 'crm',
    tipo: 'nueva_venta',
    valor_estimado: 22000,
    valor_estimado_eur: 22000,
    ahorro_anual_estimado: 4400,
    probabilidad: 80,
    fecha_cierre_prevista: isoDaysAhead(10),
    fecha_vencimiento_contrato_prospecto: isoDaysAhead(15),
    fuente_vencimiento_contrato_prospecto: 'cliente_llamada',
    siguiente_accion: 'Enviar contrato final',
    fecha_siguiente_accion: isoDaysAhead(1),
    comercial_id: U_ASESOR,
    responsable_actual_id: U_ASESOR,
    created_by: U_ASESOR,
    decisor_identificado: true,
    deleted_at: null,
    created_at: isoDaysAgo(40),
    updated_at: isoDaysAgo(1),
    empresa: empresaJoin(E2),
    contacto: contactoJoin(C2),
    contrato_origen: null,
  },
  {
    id: O5,
    empresa_id: E4,
    contacto_id: C3,
    contrato_origen_id: null,
    titulo: 'Cooperativa Demo — ampliación FV',
    descripcion: 'Cliente firmó ampliación de potencia FV. Listo para convertir a CRM.',
    etapa: 'cerrada_ganada',
    etapa_operativa: 'cerrada_ganada',
    contexto: 'crm',
    tipo: 'ampliacion',
    valor_estimado: 18000,
    valor_estimado_eur: 18000,
    ahorro_anual_estimado: 3600,
    probabilidad: 100,
    fecha_cierre_prevista: isoDaysAgo(5),
    fecha_vencimiento_contrato_prospecto: null,
    fuente_vencimiento_contrato_prospecto: null,
    siguiente_accion: 'Convertir a cliente CRM',
    fecha_siguiente_accion: isoDaysAgo(0),
    comercial_id: U_ASESOR,
    responsable_actual_id: U_ASESOR,
    created_by: U_ASESOR,
    decisor_identificado: true,
    deleted_at: null,
    created_at: isoDaysAgo(70),
    updated_at: isoDaysAgo(5),
    empresa: empresaJoin(E4),
    contacto: contactoJoin(C3),
    contrato_origen: null,
  },
]

// ────────────────────────────────────────────────────────────────────────────
// CONTRATOS
// ────────────────────────────────────────────────────────────────────────────
export const CONTRATOS = [
  {
    id: CTR1,
    empresa_id: E1,
    contacto_firmante_id: C1,
    comercial_id: U_ASESOR,
    numero_contrato: 'CTR-DEMO-001',
    compania: 'Endesa Demo',
    tarifa_acceso: '3.0TD',
    tarifa_cliente: 'Indexada Demo',
    tipo_energia: 'electrica',
    tipo_precio: 'indexado',
    fecha_firma: isoDaysAgo(360),
    fecha_inicio: isoDaysAgo(355),
    fecha_fin: isoDaysAhead(5),
    duracion_meses: 12,
    consumo_sips_kwh: 480000,
    consumo_po_kwh: null,
    potencia_contratada: 250,
    comision_integra: 0.025,
    comision_comercial: 0.015,
    comision_jefe: 0.005,
    estado: 'vencido',
    observaciones: 'Pendiente renovación.',
    external_id: null,
    deleted_at: null,
    created_at: isoDaysAgo(360),
    updated_at: isoDaysAgo(5),
  },
  {
    id: CTR2,
    empresa_id: E2,
    contacto_firmante_id: null,
    comercial_id: U_ASESOR,
    numero_contrato: 'CTR-DEMO-002',
    compania: 'Iberdrola Demo',
    tarifa_acceso: '6.1TD',
    tarifa_cliente: 'Fija Demo',
    tipo_energia: 'electrica',
    tipo_precio: 'fijo',
    fecha_firma: isoDaysAgo(180),
    fecha_inicio: isoDaysAgo(175),
    fecha_fin: isoDaysAhead(190),
    duracion_meses: 12,
    consumo_sips_kwh: 1200000,
    consumo_po_kwh: null,
    potencia_contratada: 800,
    comision_integra: 0.022,
    comision_comercial: 0.012,
    comision_jefe: 0.004,
    estado: 'activo',
    observaciones: null,
    external_id: null,
    deleted_at: null,
    created_at: isoDaysAgo(180),
    updated_at: isoDaysAgo(7),
  },
]

// ────────────────────────────────────────────────────────────────────────────
// ACTIVIDADES
// ────────────────────────────────────────────────────────────────────────────
export const ACTIVIDADES = [
  {
    id: '60000000-0000-4000-8000-000000000001',
    entidad_tipo: 'oportunidad',
    entidad_id: O1,
    tipo: 'llamada',
    titulo: 'Llamada inicial Levante',
    descripcion: 'Primera toma de contacto.',
    resultado: 'positivo',
    fecha_actividad: isoDaysAgo(20),
    duracion_minutos: 15,
    asignado_a: U_TELE,
    usuario_id: U_TELE,
    adjunto_url: null,
    adjunto_nombre: null,
    deleted_at: null,
    created_at: isoDaysAgo(20),
    updated_at: isoDaysAgo(20),
  },
  {
    id: '60000000-0000-4000-8000-000000000002',
    entidad_tipo: 'oportunidad',
    entidad_id: O2,
    tipo: 'reunion',
    titulo: 'Reunión CP Centro',
    descripcion: 'Visita al edificio para inspección.',
    resultado: 'positivo',
    fecha_actividad: isoDaysAgo(7),
    duracion_minutos: 60,
    asignado_a: U_ASESOR,
    usuario_id: U_ASESOR,
    adjunto_url: null,
    adjunto_nombre: null,
    deleted_at: null,
    created_at: isoDaysAgo(7),
    updated_at: isoDaysAgo(7),
  },
  {
    id: '60000000-0000-4000-8000-000000000003',
    entidad_tipo: 'empresa',
    entidad_id: E1,
    tipo: 'email',
    titulo: 'Envío propuesta renovación',
    descripcion: 'Enviada oferta nueva.',
    resultado: 'neutral',
    fecha_actividad: isoDaysAgo(3),
    duracion_minutos: null,
    asignado_a: U_ASESOR,
    usuario_id: U_ASESOR,
    adjunto_url: null,
    adjunto_nombre: 'propuesta-renovacion.pdf',
    deleted_at: null,
    created_at: isoDaysAgo(3),
    updated_at: isoDaysAgo(3),
  },
]

// ────────────────────────────────────────────────────────────────────────────
// HANDOFFS (cambios de responsable)
// ────────────────────────────────────────────────────────────────────────────
export const HANDOFFS = [
  {
    id: '70000000-0000-4000-8000-000000000001',
    oportunidad_id: O1,
    de_usuario_id: U_TELE,
    a_usuario_id: U_ANALISTA,
    motivo: 'Lead validado, pasa a análisis SIPS',
    nota: null,
    estado: 'aceptado',
    created_at: isoDaysAgo(15),
    aceptado_at: isoDaysAgo(14),
    rechazado_at: null,
  },
  {
    id: '70000000-0000-4000-8000-000000000002',
    oportunidad_id: O2,
    de_usuario_id: U_ANALISTA,
    a_usuario_id: U_ASESOR,
    motivo: 'Análisis viable, pasa a asesor senior',
    nota: 'Buen consumo, alto potencial.',
    estado: 'aceptado',
    created_at: isoDaysAgo(5),
    aceptado_at: isoDaysAgo(4),
    rechazado_at: null,
  },
]

// ────────────────────────────────────────────────────────────────────────────
// DOCUMENTOS
// ────────────────────────────────────────────────────────────────────────────
export const DOCUMENTOS = [
  {
    id: '80000000-0000-4000-8000-000000000001',
    entidad_tipo: 'empresa',
    entidad_id: E1,
    nombre_archivo: 'factura-luz-marzo-2026.pdf',
    tipo_documento: 'factura',
    ruta_storage: 'demo/empresas/E1/factura-marzo.pdf',
    mime_type: 'application/pdf',
    tamano_bytes: 184320,
    descripcion: 'Factura de luz mes de marzo (demo).',
    subido_por: U_ASESOR,
    deleted_at: null,
    created_at: isoDaysAgo(30),
    updated_at: isoDaysAgo(30),
  },
  {
    id: '80000000-0000-4000-8000-000000000002',
    entidad_tipo: 'oportunidad',
    entidad_id: O3,
    nombre_archivo: 'propuesta-renovacion.pdf',
    tipo_documento: 'propuesta',
    ruta_storage: 'demo/oportunidades/O3/propuesta.pdf',
    mime_type: 'application/pdf',
    tamano_bytes: 245760,
    descripcion: 'Propuesta comercial de renovación.',
    subido_por: U_ASESOR,
    deleted_at: null,
    created_at: isoDaysAgo(3),
    updated_at: isoDaysAgo(3),
  },
]

// ────────────────────────────────────────────────────────────────────────────
// INCIDENCIAS
// ────────────────────────────────────────────────────────────────────────────
export const INCIDENCIAS = [
  {
    id: '90000000-0000-4000-8000-000000000001',
    empresa_id: E2,
    contrato_id: CTR2,
    tipo: 'facturacion',
    estado: 'en_gestion',
    prioridad: 'media',
    titulo: 'Facturación incorrecta marzo',
    descripcion: 'Cliente reporta sobrefacturación de potencia.',
    asignado_a: U_ASESOR,
    deleted_at: null,
    created_at: isoDaysAgo(8),
    updated_at: isoDaysAgo(2),
  },
  {
    id: '90000000-0000-4000-8000-000000000002',
    empresa_id: E1,
    contrato_id: CTR1,
    tipo: 'cambio_comercializadora',
    estado: 'pendiente_comercializadora',
    prioridad: 'alta',
    titulo: 'Cambio comercializadora pendiente',
    descripcion: 'Tramitación cambio en curso, esperando confirmación.',
    asignado_a: U_ASESOR,
    deleted_at: null,
    created_at: isoDaysAgo(15),
    updated_at: isoDaysAgo(1),
  },
]

// ────────────────────────────────────────────────────────────────────────────
// COMERCIALIZADORAS (catálogo)
// ────────────────────────────────────────────────────────────────────────────
export const COMERCIALIZADORAS = [
  { id: 'a0000000-0000-4000-8000-000000000001', nombre: 'Endesa Demo', activa: true, contacto_email: 'b2b@endesa-demo.example', notas: null, created_at: isoDaysAgo(300) },
  { id: 'a0000000-0000-4000-8000-000000000002', nombre: 'Iberdrola Demo', activa: true, contacto_email: 'b2b@iberdrola-demo.example', notas: null, created_at: isoDaysAgo(300) },
  { id: 'a0000000-0000-4000-8000-000000000003', nombre: 'Naturgy Demo', activa: true, contacto_email: 'b2b@naturgy-demo.example', notas: null, created_at: isoDaysAgo(300) },
  { id: 'a0000000-0000-4000-8000-000000000004', nombre: 'Repsol Demo', activa: true, contacto_email: 'b2b@repsol-demo.example', notas: null, created_at: isoDaysAgo(300) },
]

// ────────────────────────────────────────────────────────────────────────────
// EXPEDIENTES (Potencias)
// ────────────────────────────────────────────────────────────────────────────
export const EXPEDIENTES = [
  {
    id: 'b0000000-0000-4000-8000-000000000001',
    empresa_id: E1,
    cups: 'ES0021000000000001JN',
    estado: 'en_tramite',
    fase_actual: 'analisis_sips',
    comercializadora_id: 'a0000000-0000-4000-8000-000000000001',
    fecha_apertura: isoDaysAgo(30),
    fecha_cierre_prevista: isoDaysAhead(15),
    deleted_at: null,
    created_at: isoDaysAgo(30),
    updated_at: isoDaysAgo(2),
  },
]

// ────────────────────────────────────────────────────────────────────────────
// FV — plantas, dispositivos, KPI diario, alarmas (mock 30 días)
// ────────────────────────────────────────────────────────────────────────────
export const FV_PLANTAS = [
  {
    id: FV1,
    empresa_id: E4,
    nombre: 'FV Cooperativa Demo Sur',
    fabricante: 'Huawei',
    pn_pico_kwp: 120.5,
    fecha_puesta_marcha: isoDaysAgo(420),
    direccion: 'Polígono Demo, Albacete',
    deleted_at: null,
    created_at: isoDaysAgo(420),
    updated_at: isoDaysAgo(1),
  },
  {
    id: FV2,
    empresa_id: E5,
    nombre: 'FV CP Centro BCN (en alta)',
    fabricante: 'SMA',
    pn_pico_kwp: 35.0,
    fecha_puesta_marcha: null,
    direccion: 'C/ Centro, 100, Barcelona',
    deleted_at: null,
    created_at: isoDaysAgo(15),
    updated_at: isoDaysAgo(1),
  },
]

export const FV_DISPOSITIVOS = [
  {
    id: 'c0000000-0000-4000-8000-000000000001',
    planta_id: FV1,
    tipo: 'inversor',
    serie: 'INV-DEMO-001',
    estado: 'ok',
    created_at: isoDaysAgo(420),
  },
  {
    id: 'c0000000-0000-4000-8000-000000000002',
    planta_id: FV1,
    tipo: 'medidor',
    serie: 'MED-DEMO-001',
    estado: 'ok',
    created_at: isoDaysAgo(420),
  },
]

// 30 días de KPI diario para FV1 — generación pseudo-realista
export const FV_KPI_DIARIO = Array.from({ length: 30 }).map((_, i) => {
  const dayIdx = 29 - i // hoy primero
  const baseEnergyKwh = 600 + Math.sin((i / 30) * Math.PI) * 200
  const noise = (Math.sin(i * 1.3) + 1) * 80
  return {
    id: `d000000${i.toString().padStart(2, '0')}-0000-4000-8000-000000000001`,
    planta_id: FV1,
    fecha: isoDaysAgo(dayIdx).slice(0, 10),
    energia_generada_kwh: Math.round(baseEnergyKwh + noise),
    energia_consumida_kwh: Math.round((baseEnergyKwh + noise) * 0.7),
    energia_excedente_kwh: Math.round((baseEnergyKwh + noise) * 0.3),
    autoconsumo_pct: 70,
    rendimiento_pct: 84 + (i % 5),
    co2_evitado_kg: Math.round((baseEnergyKwh + noise) * 0.3),
    created_at: isoDaysAgo(dayIdx),
  }
})

export const FV_ALARMAS = [
  {
    id: 'e0000000-0000-4000-8000-000000000001',
    planta_id: FV1,
    dispositivo_id: 'c0000000-0000-4000-8000-000000000001',
    severidad: 'warning',
    titulo: 'Tensión DC fuera de rango',
    descripcion: 'Tensión DC string 3 fuera de rango durante 12 min.',
    estado: 'reconocida',
    fecha_apertura: isoDaysAgo(2),
    fecha_cierre: null,
    created_at: isoDaysAgo(2),
  },
  {
    id: 'e0000000-0000-4000-8000-000000000002',
    planta_id: FV1,
    dispositivo_id: 'c0000000-0000-4000-8000-000000000002',
    severidad: 'info',
    titulo: 'Comunicación medidor restablecida',
    descripcion: 'Reconexión tras caída de 6 minutos.',
    estado: 'cerrada',
    fecha_apertura: isoDaysAgo(5),
    fecha_cierre: isoDaysAgo(5),
    created_at: isoDaysAgo(5),
  },
]

// ────────────────────────────────────────────────────────────────────────────
// DATADIS — suministros y consumos (mock)
// ────────────────────────────────────────────────────────────────────────────
export const CUPS = [
  {
    id: 'f0000000-0000-4000-8000-000000000001',
    empresa_id: E1,
    cups: 'ES0021000000000001JN',
    tarifa_acceso: '3.0TD',
    estado: 'activo',
    direccion_suministro: 'C/ Demo Norte 1, Madrid',
    fecha_alta_cnae: isoDaysAgo(800),
    deleted_at: null,
    created_at: isoDaysAgo(800),
    updated_at: isoDaysAgo(10),
  },
  {
    id: 'f0000000-0000-4000-8000-000000000002',
    empresa_id: E2,
    cups: 'ES0021000000000002JN',
    tarifa_acceso: '6.1TD',
    estado: 'activo',
    direccion_suministro: 'Av. Demo Sur 22, Sevilla',
    fecha_alta_cnae: isoDaysAgo(700),
    deleted_at: null,
    created_at: isoDaysAgo(700),
    updated_at: isoDaysAgo(10),
  },
]

export const DATADIS_CONSUMOS_CACHE = [
  {
    id: 'aa000000-0000-4000-8000-000000000001',
    cups: 'ES0021000000000001JN',
    fecha: isoDaysAgo(1).slice(0, 10),
    consumo_kwh: 1320,
    payload: { source: 'demo', detail: '24h horario' },
    created_at: isoDaysAgo(1),
  },
]

// ────────────────────────────────────────────────────────────────────────────
// VISTAS SQL para CAPTACIÓN (v_mis_oportunidades, v_captacion_todos_mis_casos)
// El mock las trata como tablas normales y las expone vía supabase.from(view).
// ────────────────────────────────────────────────────────────────────────────
const CAPTACION_OPP_T1 = '31000000-0000-4000-8000-000000000001'
const CAPTACION_OPP_T2 = '31000000-0000-4000-8000-000000000002'
const CAPTACION_OPP_A1 = '31000000-0000-4000-8000-000000000003'
const CAPTACION_OPP_S1 = '31000000-0000-4000-8000-000000000004'

const flat = (overrides: Record<string, unknown>) => ({
  id: '',
  empresa_id: '',
  empresa_nombre: '',
  empresa_nif: '',
  tipo: 'nueva_venta',
  etapa: 'prospecto',
  etapa_operativa: 'prospecto',
  decisor_identificado: false,
  responsable_actual_id: null,
  factura_fecha_prevista: null,
  factura_recibida_at: null,
  factura_documento_id: null,
  propuesta_documento_id: null,
  propuesta_enviada_at: null,
  visita_programada_at: null,
  valor_estimado_eur: null,
  ahorro_anual_estimado: null,
  fecha_vencimiento_contrato_prospecto: null,
  fuente_vencimiento_contrato_prospecto: null,
  siguiente_accion: null,
  fecha_siguiente_accion: null,
  created_at: isoDaysAgo(10),
  updated_at: isoDaysAgo(1),
  ...overrides,
})

export const V_MIS_OPORTUNIDADES = [
  flat({
    id: CAPTACION_OPP_T1,
    empresa_id: E3,
    empresa_nombre: 'Servicios Demo Levante S.L.U.',
    empresa_nif: 'B00000003',
    etapa: 'cold_lead',
    etapa_operativa: 'pendiente_factura',
    responsable_actual_id: U_TELE,
    decisor_identificado: false,
    valor_estimado_eur: 12000,
    ahorro_anual_estimado: 2400,
    fecha_vencimiento_contrato_prospecto: isoDaysAhead(60),
    fuente_vencimiento_contrato_prospecto: 'estimado',
    siguiente_accion: 'Llamar lead frío',
    fecha_siguiente_accion: isoDaysAhead(2),
    created_at: isoDaysAgo(20),
    updated_at: isoDaysAgo(2),
  }),
  flat({
    id: CAPTACION_OPP_T2,
    empresa_id: E5,
    empresa_nombre: 'Comunidad Demo Edificio Centro',
    empresa_nif: 'H00000005',
    etapa: 'contactado',
    etapa_operativa: 'pendiente_factura',
    responsable_actual_id: U_TELE,
    decisor_identificado: true,
    valor_estimado_eur: 8000,
    ahorro_anual_estimado: 1600,
    fecha_vencimiento_contrato_prospecto: isoDaysAhead(30),
    fuente_vencimiento_contrato_prospecto: 'cliente_llamada',
    siguiente_accion: 'Programar visita técnica',
    fecha_siguiente_accion: isoDaysAhead(5),
    created_at: isoDaysAgo(15),
    updated_at: isoDaysAgo(1),
  }),
  flat({
    id: CAPTACION_OPP_A1,
    empresa_id: E3,
    empresa_nombre: 'Servicios Demo Levante S.L.U.',
    empresa_nif: 'B00000003',
    etapa: 'analisis',
    etapa_operativa: 'analisis_sips',
    responsable_actual_id: U_ANALISTA,
    decisor_identificado: true,
    factura_recibida_at: isoDaysAgo(3),
    factura_documento_id: '80000000-0000-4000-8000-000000000001',
    valor_estimado_eur: 14500,
    ahorro_anual_estimado: 2900,
    fecha_vencimiento_contrato_prospecto: isoDaysAhead(45),
    fuente_vencimiento_contrato_prospecto: 'factura',
    siguiente_accion: 'Generar propuesta comparativa',
    fecha_siguiente_accion: isoDaysAhead(2),
    created_at: isoDaysAgo(8),
    updated_at: isoDaysAgo(1),
  }),
  flat({
    id: CAPTACION_OPP_S1,
    empresa_id: E1,
    empresa_nombre: 'Industrial Demo Norte S.L.',
    empresa_nif: 'B00000001',
    etapa: 'cierre',
    etapa_operativa: 'oferta_enviada',
    responsable_actual_id: U_ASESOR,
    decisor_identificado: true,
    factura_recibida_at: isoDaysAgo(20),
    factura_documento_id: '80000000-0000-4000-8000-000000000001',
    propuesta_documento_id: '80000000-0000-4000-8000-000000000002',
    propuesta_enviada_at: isoDaysAgo(5),
    visita_programada_at: isoDaysAhead(2),
    valor_estimado_eur: 35000,
    ahorro_anual_estimado: 7000,
    fecha_vencimiento_contrato_prospecto: isoDaysAhead(5),
    fuente_vencimiento_contrato_prospecto: 'factura',
    siguiente_accion: 'Reunión cierre con CFO',
    fecha_siguiente_accion: isoDaysAhead(2),
    created_at: isoDaysAgo(30),
    updated_at: isoDaysAgo(1),
  }),
]

export const V_CAPTACION_TODOS_MIS_CASOS = V_MIS_OPORTUNIDADES.map((row) => {
  const u = USER_PROFILES.find((p) => p.id === row.responsable_actual_id)
  return {
    ...row,
    responsable_actual_nombre: u?.full_name ?? null,
    responsable_actual_funciones: u?.funciones ?? null,
    created_by: row.responsable_actual_id,
    creador_nombre: u?.full_name ?? null,
    creador_funciones: u?.funciones ?? null,
  }
})

// ────────────────────────────────────────────────────────────────────────────
// REGISTRO — exportar todo bajo un único objeto indexado por nombre de tabla
// ────────────────────────────────────────────────────────────────────────────
export const FIXTURES: Record<string, unknown[]> = {
  user_profiles: USER_PROFILES,
  users_profile: USER_PROFILES, // alias legacy CRM
  empresas: EMPRESAS,
  contactos: CONTACTOS,
  oportunidades: OPORTUNIDADES,
  oportunidad_handoffs: HANDOFFS,
  contratos: CONTRATOS,
  actividades: ACTIVIDADES,
  documentos: DOCUMENTOS,
  incidencias: INCIDENCIAS,
  comercializadoras: COMERCIALIZADORAS,
  expedientes: EXPEDIENTES,
  fv_planta: FV_PLANTAS,
  fv_dispositivo: FV_DISPOSITIVOS,
  fv_kpi_diario: FV_KPI_DIARIO,
  fv_alarma: FV_ALARMAS,
  cups: CUPS,
  datadis_consumos_cache: DATADIS_CONSUMOS_CACHE,
  v_mis_oportunidades: V_MIS_OPORTUNIDADES,
  v_captacion_todos_mis_casos: V_CAPTACION_TODOS_MIS_CASOS,
}

export const DEMO_USERS_BY_EMAIL = new Map(
  USER_PROFILES.map((u) => [u.email, u]),
)
