/**
 * fixtures.ts — Datos demo para el módulo FV.
 *
 * Se usan cuando no hay datos reales en Supabase (ninguna planta asignada).
 * La página detecta automáticamente si usar fixtures o datos reales.
 *
 * Escenarios demo incluidos:
 *  - Planta operativa con datos Datadis que cuadran (OK)
 *  - Planta operativa con leve descuadre Datadis (revisar)
 *  - Planta con alarma crítica / inversor averiado
 *  - Planta desconectada / sin datos 72h
 *  - Planta operativa con descuadre crítico Datadis
 *  - Planta detectada sin cliente asignado
 */

// ─────────────────────────────────────────────────────────
// Tipos extendidos (superset del schema actual de Supabase)
// ─────────────────────────────────────────────────────────

export interface FxEmpresa {
  id: string
  nombre: string
}

export interface FxKpiRealtime {
  potencia_actual_kw: number | null
  energia_hoy_kwh: number | null
  energia_mes_kwh: number | null
  actualizado_en: string
}

export interface FxPlanta {
  id: string
  empresa_id: string | null
  empresa: FxEmpresa | null
  station_code: string
  nombre: string
  plataforma: string
  pais: string
  capacidad_kwp: number | null
  tiene_bateria: boolean
  estado: 'normal' | 'defectuoso' | 'desconectado' | 'desconocido'
  cups_asociados: string[]
  credencial_id: string
  ultima_sync: string | null
  creado_en: string
  kpi_realtime: FxKpiRealtime | null
}

export interface FxKpiDiario {
  planta_id: string
  fecha: string
  energia_kwh: number
  excedente_kwh: number
  autoconsumida_kwh: number
  potencia_max_kw: number
  ingresos_eur: number
}

export interface FxComparativa {
  planta_id: string
  planta_nombre: string
  empresa_nombre: string
  cups: string
  fecha: string
  produccion_fv_kwh: number
  excedente_fv_kwh: number
  excedente_datadis_kwh: number | null
  diferencia_kwh: number | null
  diferencia_pct: number | null
  estado: 'ok' | 'revisar' | 'critico' | 'sin_datos'
}

export interface FxIncidencia {
  id: string
  planta_id: string
  planta_nombre: string
  empresa_nombre: string
  tipo: 'sin_datos' | 'alarma_critica' | 'descuadre_datadis' | 'credencial_error' | 'produccion_anomala'
  severidad: 'critica' | 'mayor' | 'menor'
  descripcion: string
  detectada_en: string
  resuelta: boolean
}

export interface FxCredencial {
  id: string
  username: string
  plataforma: string
  region_url: string
  activo: boolean
  plantas_vinculadas: number
  ultima_sync: string | null
  cookies_expires_at: string | null
  ultimo_error: string | null
}

export interface FxInforme {
  id: string
  empresa_nombre: string
  mes: string
  estado: 'borrador' | 'revision_pendiente' | 'aprobado' | 'enviado'
  energia_total_kwh: number
  excedentes_kwh: number
  autoconsumo_kwh: number
  ahorro_estimado_eur: number
  co2_evitado_kg: number
  generado_en: string
}

// ─────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function dateStr(daysBack: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysBack)
  return d.toISOString().split('T')[0]
}

// Factores de producción diaria determinísticos (30 días)
const FACTORS_30 = [
  0.82, 0.91, 0.78, 0.95, 0.88, 0.67, 0.72, 0.89, 0.93, 0.85,
  0.91, 0.79, 0.96, 0.88, 0.74, 0.83, 0.92, 0.87, 0.95, 0.81,
  0.78, 0.90, 0.94, 0.86, 0.89, 0.71, 0.75, 0.91, 0.93, 0.84,
]

function genKpis(
  plantaId: string,
  baseKwh: number,
  excdRatio = 0.38,
  overrides: Partial<FxKpiDiario>[] = [],
): FxKpiDiario[] {
  return FACTORS_30.map((f, i) => {
    const kwh = Math.round(baseKwh * f * 10) / 10
    const exc = Math.round(kwh * excdRatio * 10) / 10
    const base: FxKpiDiario = {
      planta_id: plantaId,
      fecha: dateStr(29 - i),
      energia_kwh: kwh,
      excedente_kwh: exc,
      autoconsumida_kwh: Math.round((kwh - exc) * 10) / 10,
      potencia_max_kw: Math.round((kwh / 5.5) * 10) / 10,
      ingresos_eur: Math.round(kwh * 0.065 * 10) / 10,
    }
    return overrides[i] ? { ...base, ...overrides[i] } : base
  })
}

// IDs fijos para coherencia entre fixtures
const E = {
  perez:    'fix-empresa-0001',
  garcia:   'fix-empresa-0002',
  pani:     'fix-empresa-0003',
  coop:     'fix-empresa-0004',
  mercaval: 'fix-empresa-0005',
}
const P = {
  perez:    'fix-planta-0001',
  garcia:   'fix-planta-0002',
  pani:     'fix-planta-0003',
  coop:     'fix-planta-0004',
  mercaval: 'fix-planta-0005',
  libre:    'fix-planta-0006',
}

// ─────────────────────────────────────────────────────────
// Plantas asignadas
// ─────────────────────────────────────────────────────────

export const FIXTURE_PLANTAS: FxPlanta[] = [
  {
    id: P.perez,
    empresa_id: E.perez,
    empresa: { id: E.perez, nombre: 'Industrias Pérez S.L.' },
    station_code: 'NE=04761234',
    nombre: 'Solar Parking Pérez',
    plataforma: 'fusionsolar',
    pais: 'ES',
    capacidad_kwp: 48.6,
    tiene_bateria: false,
    estado: 'normal',
    cups_asociados: ['ES0031405861449001SL'],
    credencial_id: 'fix-cred-0001',
    ultima_sync: daysAgo(0),
    creado_en: daysAgo(90),
    kpi_realtime: {
      potencia_actual_kw: 21.4,
      energia_hoy_kwh: 187.2,
      energia_mes_kwh: 2843.0,
      actualizado_en: daysAgo(0),
    },
  },
  {
    id: P.garcia,
    empresa_id: E.garcia,
    empresa: { id: E.garcia, nombre: 'García Logística S.A.' },
    station_code: 'NE=03819876',
    nombre: 'Cubierta García Logística',
    plataforma: 'fusionsolar',
    pais: 'ES',
    capacidad_kwp: 32.4,
    tiene_bateria: false,
    estado: 'normal',
    cups_asociados: ['ES0031405861123002SL'],
    credencial_id: 'fix-cred-0001',
    ultima_sync: daysAgo(0),
    creado_en: daysAgo(120),
    kpi_realtime: {
      potencia_actual_kw: 14.1,
      energia_hoy_kwh: 121.5,
      energia_mes_kwh: 1892.3,
      actualizado_en: daysAgo(0),
    },
  },
  {
    id: P.pani,
    empresa_id: E.pani,
    empresa: { id: E.pani, nombre: 'Panificadora Norte S.L.' },
    station_code: 'NE=02344567',
    nombre: 'Panificadora Norte FV',
    plataforma: 'fusionsolar',
    pais: 'ES',
    capacidad_kwp: 15.0,
    tiene_bateria: false,
    estado: 'defectuoso',
    cups_asociados: [],
    credencial_id: 'fix-cred-0002',
    ultima_sync: daysAgo(0),
    creado_en: daysAgo(60),
    kpi_realtime: {
      potencia_actual_kw: 0,
      energia_hoy_kwh: 0,
      energia_mes_kwh: 612.4,
      actualizado_en: daysAgo(0),
    },
  },
  {
    id: P.coop,
    empresa_id: E.coop,
    empresa: { id: E.coop, nombre: 'Coop. Agrícola Levante' },
    station_code: 'NE=01988765',
    nombre: 'Almacén Coop. Agrícola',
    plataforma: 'fusionsolar',
    pais: 'ES',
    capacidad_kwp: 28.0,
    tiene_bateria: false,
    estado: 'desconectado',
    cups_asociados: [],
    credencial_id: 'fix-cred-0002',
    ultima_sync: daysAgo(3),
    creado_en: daysAgo(45),
    kpi_realtime: null,
  },
  {
    id: P.mercaval,
    empresa_id: E.mercaval,
    empresa: { id: E.mercaval, nombre: 'MercaVal S.L.' },
    station_code: 'NE=05234890',
    nombre: 'Parking Supermercado MercaVal',
    plataforma: 'fusionsolar',
    pais: 'ES',
    capacidad_kwp: 62.0,
    tiene_bateria: true,
    estado: 'normal',
    cups_asociados: ['ES0031405861456789SL'],
    credencial_id: 'fix-cred-0001',
    ultima_sync: daysAgo(0),
    creado_en: daysAgo(30),
    kpi_realtime: {
      potencia_actual_kw: 31.7,
      energia_hoy_kwh: 258.4,
      energia_mes_kwh: 3921.6,
      actualizado_en: daysAgo(0),
    },
  },
]

// Planta detectada por el sync sin cliente asignado
export const FIXTURE_PLANTAS_SIN_ASIGNAR: FxPlanta[] = [
  {
    id: P.libre,
    empresa_id: null,
    empresa: null,
    station_code: 'NE=09811234',
    nombre: 'Planta detectada (sin asignar)',
    plataforma: 'fusionsolar',
    pais: 'ES',
    capacidad_kwp: 10.0,
    tiene_bateria: false,
    estado: 'normal',
    cups_asociados: [],
    credencial_id: 'fix-cred-0001',
    ultima_sync: daysAgo(0),
    creado_en: daysAgo(2),
    kpi_realtime: {
      potencia_actual_kw: 4.2,
      energia_hoy_kwh: 38.1,
      energia_mes_kwh: 512.0,
      actualizado_en: daysAgo(0),
    },
  },
]

// ─────────────────────────────────────────────────────────
// KPIs diarios (30 días por planta)
// ─────────────────────────────────────────────────────────

// Últimos 5 días de Panificadora → cero (avería)
const panOverrides: Partial<FxKpiDiario>[] = Array.from({ length: 30 }, (_, i) =>
  i >= 25 ? { energia_kwh: 0, excedente_kwh: 0, autoconsumida_kwh: 0, potencia_max_kw: 0, ingresos_eur: 0 } : {},
)
// Últimos 3 días de Coop → sin datos
const coopOverrides: Partial<FxKpiDiario>[] = Array.from({ length: 30 }, (_, i) =>
  i >= 27 ? { energia_kwh: 0, excedente_kwh: 0, autoconsumida_kwh: 0, potencia_max_kw: 0, ingresos_eur: 0 } : {},
)

export const FIXTURE_KPI_DIARIO: Record<string, FxKpiDiario[]> = {
  [P.perez]:    genKpis(P.perez,    200, 0.36),
  [P.garcia]:   genKpis(P.garcia,   130, 0.40),
  [P.pani]:     genKpis(P.pani,      62, 0.30, panOverrides),
  [P.coop]:     genKpis(P.coop,     115, 0.35, coopOverrides),
  [P.mercaval]: genKpis(P.mercaval, 260, 0.42),
}

// ─────────────────────────────────────────────────────────
// Comparativa FV vs Datadis (mes en curso)
// ─────────────────────────────────────────────────────────

function sumMes(kpis: FxKpiDiario[]) {
  return kpis.reduce(
    (acc, k) => ({ energia: acc.energia + k.energia_kwh, excedente: acc.excedente + k.excedente_kwh }),
    { energia: 0, excedente: 0 },
  )
}

const perezMes    = sumMes(FIXTURE_KPI_DIARIO[P.perez])
const garciaMes   = sumMes(FIXTURE_KPI_DIARIO[P.garcia])
const mercavalMes = sumMes(FIXTURE_KPI_DIARIO[P.mercaval])

const mesActual = new Date().toISOString().slice(0, 7)

export const FIXTURE_COMPARATIVA: FxComparativa[] = [
  {
    planta_id: P.perez,
    planta_nombre: 'Solar Parking Pérez',
    empresa_nombre: 'Industrias Pérez S.L.',
    cups: 'ES0031405861449001SL',
    fecha: mesActual,
    produccion_fv_kwh: Math.round(perezMes.energia),
    excedente_fv_kwh: Math.round(perezMes.excedente),
    excedente_datadis_kwh: Math.round(perezMes.excedente * 0.993),
    diferencia_kwh: Math.round(perezMes.excedente * 0.007),
    diferencia_pct: 0.7,
    estado: 'ok',
  },
  {
    planta_id: P.garcia,
    planta_nombre: 'Cubierta García Logística',
    empresa_nombre: 'García Logística S.A.',
    cups: 'ES0031405861123002SL',
    fecha: mesActual,
    produccion_fv_kwh: Math.round(garciaMes.energia),
    excedente_fv_kwh: Math.round(garciaMes.excedente),
    excedente_datadis_kwh: Math.round(garciaMes.excedente * 0.947),
    diferencia_kwh: Math.round(garciaMes.excedente * 0.053),
    diferencia_pct: 5.3,
    estado: 'revisar',
  },
  {
    planta_id: P.pani,
    planta_nombre: 'Panificadora Norte FV',
    empresa_nombre: 'Panificadora Norte S.L.',
    cups: '—',
    fecha: mesActual,
    produccion_fv_kwh: 0,
    excedente_fv_kwh: 0,
    excedente_datadis_kwh: null,
    diferencia_kwh: null,
    diferencia_pct: null,
    estado: 'sin_datos',
  },
  {
    planta_id: P.coop,
    planta_nombre: 'Almacén Coop. Agrícola',
    empresa_nombre: 'Coop. Agrícola Levante',
    cups: '—',
    fecha: mesActual,
    produccion_fv_kwh: 0,
    excedente_fv_kwh: 0,
    excedente_datadis_kwh: null,
    diferencia_kwh: null,
    diferencia_pct: null,
    estado: 'sin_datos',
  },
  {
    planta_id: P.mercaval,
    planta_nombre: 'Parking Supermercado MercaVal',
    empresa_nombre: 'MercaVal S.L.',
    cups: 'ES0031405861456789SL',
    fecha: mesActual,
    produccion_fv_kwh: Math.round(mercavalMes.energia),
    excedente_fv_kwh: Math.round(mercavalMes.excedente),
    excedente_datadis_kwh: Math.round(mercavalMes.excedente * 0.781),
    diferencia_kwh: Math.round(mercavalMes.excedente * 0.219),
    diferencia_pct: 21.9,
    estado: 'critico',
  },
]

// ─────────────────────────────────────────────────────────
// Incidencias
// ─────────────────────────────────────────────────────────

export const FIXTURE_INCIDENCIAS: FxIncidencia[] = [
  {
    id: 'fix-inc-0001',
    planta_id: P.pani,
    planta_nombre: 'Panificadora Norte FV',
    empresa_nombre: 'Panificadora Norte S.L.',
    tipo: 'alarma_critica',
    severidad: 'critica',
    descripcion: 'Inversor principal desconectado. Sin generación desde hace 5 días. Comunicación perdida con el dispositivo.',
    detectada_en: daysAgo(5),
    resuelta: false,
  },
  {
    id: 'fix-inc-0002',
    planta_id: P.coop,
    planta_nombre: 'Almacén Coop. Agrícola',
    empresa_nombre: 'Coop. Agrícola Levante',
    tipo: 'sin_datos',
    severidad: 'mayor',
    descripcion: 'Planta sin datos de producción desde hace 72 horas. Posible pérdida de comunicación del datalogger.',
    detectada_en: daysAgo(3),
    resuelta: false,
  },
  {
    id: 'fix-inc-0003',
    planta_id: P.mercaval,
    planta_nombre: 'Parking Supermercado MercaVal',
    empresa_nombre: 'MercaVal S.L.',
    tipo: 'descuadre_datadis',
    severidad: 'critica',
    descripcion:
      'Excedente reportado por FusionSolar difiere un 21,9% del excedente registrado en Datadis. Posible error de medida o configuración de CUPS incorrecta.',
    detectada_en: daysAgo(2),
    resuelta: false,
  },
  {
    id: 'fix-inc-0004',
    planta_id: P.garcia,
    planta_nombre: 'Cubierta García Logística',
    empresa_nombre: 'García Logística S.A.',
    tipo: 'descuadre_datadis',
    severidad: 'menor',
    descripcion:
      'Excedente FusionSolar difiere un 5,3% respecto a Datadis. Dentro del margen aceptable, se recomienda revisar en el próximo cierre.',
    detectada_en: daysAgo(1),
    resuelta: false,
  },
]

// ─────────────────────────────────────────────────────────
// Credenciales
// ─────────────────────────────────────────────────────────

export const FIXTURE_CREDENCIALES: FxCredencial[] = [
  {
    id: 'fix-cred-0001',
    username: 'valere.instalador@fusionsolar.eu',
    plataforma: 'FusionSolar EU5',
    region_url: 'https://uni003eu5.fusionsolar.huawei.com',
    activo: true,
    plantas_vinculadas: 4,
    ultima_sync: daysAgo(0),
    cookies_expires_at: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString(),
    ultimo_error: null,
  },
  {
    id: 'fix-cred-0002',
    username: 'jolivares@panificadoras.es',
    plataforma: 'FusionSolar EU5',
    region_url: 'https://uni003eu5.fusionsolar.huawei.com',
    activo: true,
    plantas_vinculadas: 2,
    ultima_sync: daysAgo(3),
    cookies_expires_at: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    ultimo_error: 'AUTH_REDIRECT — sesión rechazada. Ejecutar extract_cookies.py',
  },
]

// ─────────────────────────────────────────────────────────
// Informes mensuales
// ─────────────────────────────────────────────────────────

export const FIXTURE_INFORMES: FxInforme[] = [
  {
    id: 'fix-inf-0001',
    empresa_nombre: 'Industrias Pérez S.L.',
    mes: mesActual,
    estado: 'borrador',
    energia_total_kwh: Math.round(perezMes.energia),
    excedentes_kwh: Math.round(perezMes.excedente),
    autoconsumo_kwh: Math.round(perezMes.energia - perezMes.excedente),
    ahorro_estimado_eur: Math.round(perezMes.energia * 0.14),
    co2_evitado_kg: Math.round(perezMes.energia * 0.233),
    generado_en: daysAgo(1),
  },
  {
    id: 'fix-inf-0002',
    empresa_nombre: 'García Logística S.A.',
    mes: mesActual,
    estado: 'revision_pendiente',
    energia_total_kwh: Math.round(garciaMes.energia),
    excedentes_kwh: Math.round(garciaMes.excedente),
    autoconsumo_kwh: Math.round(garciaMes.energia - garciaMes.excedente),
    ahorro_estimado_eur: Math.round(garciaMes.energia * 0.14),
    co2_evitado_kg: Math.round(garciaMes.energia * 0.233),
    generado_en: daysAgo(0),
  },
  {
    id: 'fix-inf-0003',
    empresa_nombre: 'MercaVal S.L.',
    mes: mesActual,
    estado: 'borrador',
    energia_total_kwh: Math.round(mercavalMes.energia),
    excedentes_kwh: Math.round(mercavalMes.excedente),
    autoconsumo_kwh: Math.round(mercavalMes.energia - mercavalMes.excedente),
    ahorro_estimado_eur: Math.round(mercavalMes.energia * 0.14),
    co2_evitado_kg: Math.round(mercavalMes.energia * 0.233),
    generado_en: daysAgo(0),
  },
]

// ─────────────────────────────────────────────────────────
// Re-exportar mes actual para uso en tabs
// ─────────────────────────────────────────────────────────
export { mesActual }
export const sumMesExported = sumMes
