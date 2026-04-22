/**
 * datadis.ts — Cliente HTTP para la API privada de Datadis
 *
 * Documentación oficial:
 *   https://datadis.es/api-private/api/
 *   Manual: MANUAL-API-PRIVADA-Y-AGREGADA.pdf (ICAEN)
 *
 * Flujo:
 *   1. authenticate(username, password) → token JWT
 *   2. getSupplies()                    → lista de CUPS autorizados
 *   3. getContractDetail(cups, distCode)→ datos técnicos (tarifa, potencias)
 *   4. getConsumptionData(...)          → consumos horarios
 *
 * Notas de seguridad:
 *   - El token JWT de Datadis se almacena solo en memoria (no localStorage).
 *   - Las credenciales nunca viajan en texto plano desde la UI al servidor;
 *     en producción el authenticate() debe llamarse desde una Edge Function.
 *   - Para uso en cliente (desarrollo/demo) se llama directamente al API de Datadis.
 */

import type {
  DatadisSupplyRaw,
  DatadisConsumptionRaw,
} from '../types/entities'

// ─── Constantes ────────────────────────────────────────────────────────────

const BASE_URL = 'https://datadis.es'
const AUTH_URL = `${BASE_URL}/nikola-auth/tokens/login`
const API_URL  = `${BASE_URL}/api-private/api`

// Códigos de distribuidor según Datadis
export const DISTRIBUIDOR_CODES: Record<string, string> = {
  '1': 'Endesa Distribución',
  '2': 'Iberdrola (UFD)',
  '3': 'UFD Distribución Electricidad',
  '4': 'E-REDES (EDP)',
  '5': 'Naturgy Distribución',
  '6': 'Viesgo Distribución',
  '7': 'Axpo Iberia',
  '8': 'Redes Distribución Eléctrica',
}

// ─── Tipos internos del servicio ───────────────────────────────────────────

export interface DatadisAuthResult {
  ok: boolean
  token?: string
  error?: string
}

export interface DatadisError {
  code: number
  message: string
}

// ─── Estado en memoria (singleton) ─────────────────────────────────────────

let _token: string | null = null
let _tokenExpiresAt: number = 0   // epoch ms

function tokenIsValid(): boolean {
  return !!_token && Date.now() < _tokenExpiresAt - 60_000 // margen 1 min
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function authHeader(): HeadersInit {
  if (!_token) throw new Error('Datadis: no hay token activo. Llama a authenticate() primero.')
  return { Authorization: `Bearer ${_token}` }
}

function datadisDateToISO(dateStr: string): string {
  // Datadis devuelve "2026/01/15" → convertimos a "2026-01-15"
  return dateStr.replace(/\//g, '-')
}

function isoToDatadisDate(isoDate: string): string {
  // "2026-01-15" → "2026/01/15"
  return isoDate.replace(/-/g, '/')
}

/**
 * Parsea la hora de Datadis "01:00" → 0 (la hora 01:00 representa la hora solar 0)
 * La API devuelve la hora de fin del intervalo: "01:00" = intervalo 00:00-01:00 = hora 0
 */
function datadisTimeToHour(timeStr: string): number {
  const hour = parseInt(timeStr.split(':')[0], 10)
  return Math.max(0, hour - 1)
}

// ─── API pública del servicio ───────────────────────────────────────────────

/**
 * Autentica en Datadis y almacena el token en memoria.
 * En producción, llamar desde Edge Function para no exponer credenciales.
 */
export async function authenticate(
  username: string,
  password: string,
): Promise<DatadisAuthResult> {
  try {
    const res = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: `HTTP ${res.status}: ${text}` }
    }

    const token = await res.text()

    if (!token || token.length < 20) {
      return { ok: false, error: 'La API de Datadis devolvió un token vacío. Verifica usuario y contraseña.' }
    }

    _token = token.trim()
    // Datadis no especifica expiración explícita; asumimos 1 hora como margen conservador
    _tokenExpiresAt = Date.now() + 60 * 60 * 1000

    return { ok: true, token: _token }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Error de red: ${message}` }
  }
}

/**
 * Inyecta un token obtenido externamente (p.ej. desde Edge Function).
 * Útil cuando la autenticación se hace en servidor y el cliente solo usa el token.
 */
export function setToken(token: string, expiresInMs = 3600_000): void {
  _token = token
  _tokenExpiresAt = Date.now() + expiresInMs
}

/** Limpia el token de memoria (cierre de sesión) */
export function clearToken(): void {
  _token = null
  _tokenExpiresAt = 0
}

/** ¿Hay token válido en memoria? */
export function hasValidToken(): boolean {
  return tokenIsValid()
}

/**
 * Obtiene la lista de CUPS autorizados para el usuario autenticado.
 * Si authorizedNif está presente, consulta en nombre de ese NIF (tercero autorizado).
 */
export async function getSupplies(authorizedNif?: string): Promise<DatadisSupplyRaw[]> {
  const url = new URL(`${API_URL}/get-supplies`)
  if (authorizedNif) url.searchParams.set('authorizedNif', authorizedNif)

  const res = await fetch(url.toString(), { headers: authHeader() })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Datadis getSupplies HTTP ${res.status}: ${text}`)
  }

  const data: DatadisSupplyRaw[] = await res.json()
  return data
}

/**
 * Obtiene el detalle técnico de un CUPS concreto.
 * Devuelve tarifa de acceso, potencias contratadas, comercializadora actual, etc.
 */
export async function getContractDetail(
  cups: string,
  distributorCode: string,
  authorizedNif?: string,
): Promise<DatadisSupplyRaw | null> {
  const url = new URL(`${API_URL}/get-contract-detail`)
  url.searchParams.set('cups', cups.toUpperCase())
  url.searchParams.set('distributorCode', distributorCode)
  if (authorizedNif) url.searchParams.set('authorizedNif', authorizedNif)

  const res = await fetch(url.toString(), { headers: authHeader() })

  if (res.status === 404) return null

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Datadis getContractDetail HTTP ${res.status}: ${text}`)
  }

  const data: DatadisSupplyRaw[] = await res.json()
  return data?.[0] ?? null
}

/**
 * Obtiene consumos horarios de un CUPS en un rango de fechas.
 * @param cups            Código CUPS (ES + 16 dígitos + 2 letras)
 * @param distributorCode Código del distribuidor (1-8)
 * @param startDate       Fecha inicio ISO "2026-01-01"
 * @param endDate         Fecha fin ISO "2026-01-31"
 * @param pointType       1 = cuarto-horario (contador inteligente) | 2 = cierre mensual
 * @param authorizedNif   NIF del titular si consultamos en nombre de tercero
 */
export async function getConsumptionData(
  cups: string,
  distributorCode: string,
  startDate: string,
  endDate: string,
  pointType: 1 | 2 = 1,
  authorizedNif?: string,
): Promise<DatadisConsumptionRaw[]> {
  const url = new URL(`${API_URL}/get-consumption-data`)
  url.searchParams.set('cups', cups.toUpperCase())
  url.searchParams.set('distributorCode', distributorCode)
  url.searchParams.set('startDate', isoToDatadisDate(startDate))
  url.searchParams.set('endDate', isoToDatadisDate(endDate))
  url.searchParams.set('measurementType', '0')  // 0 = energía activa (kWh)
  url.searchParams.set('pointType', String(pointType))
  if (authorizedNif) url.searchParams.set('authorizedNif', authorizedNif)

  const res = await fetch(url.toString(), { headers: authHeader() })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Datadis getConsumptionData HTTP ${res.status}: ${text}`)
  }

  const data: DatadisConsumptionRaw[] = await res.json()
  return data ?? []
}

// ─── Helpers de transformación ──────────────────────────────────────────────

/**
 * Convierte la respuesta raw de Datadis al formato Cups de Valere.
 * Solo rellena los campos que vienen de Datadis; el resto se conserva.
 */
export function supplyRawToCupsFields(supply: DatadisSupplyRaw) {
  // Construye el objeto JSONB de potencias {p1, p2, ..., p6}
  const potencias: Record<string, number> = {}
  const powers = supply.contractedPowerkW ?? []
  powers.forEach((kw, i) => {
    potencias[`p${i + 1}`] = kw
  })

  return {
    distribuidor: supply.distributorName,
    direccion_suministro: [supply.address, supply.postalCode, supply.municipality, supply.province]
      .filter(Boolean)
      .join(', '),
    tarifa_acceso: supply.accessTariff ?? null,
    comercializadora_actual: supply.marketer ?? null,
    potencias_contratadas: Object.keys(potencias).length > 0 ? potencias : null,
    modelo_autoconsumo: supply.selfConsumptionType ?? null,
    datadis_sincronizado: true,
    datadis_ultima_sync: new Date().toISOString(),
    datadis_distribuidor_cod: supply.distributorCode,
    datadis_punto_tipo: supply.pointType,
  } as const
}

/**
 * Convierte consumos raw de Datadis al formato DatadisConsumptionInsert de Valere.
 */
export function consumptionRawToInsert(
  raw: DatadisConsumptionRaw,
  cupsId: string,
) {
  return {
    cups_id: cupsId,
    fecha: datadisDateToISO(raw.date),
    hora: datadisTimeToHour(raw.time),
    consumo_kwh: raw.consumptionKWh ?? 0,
    excedente_kwh: raw.surplusEnergyKWh ?? 0,
    metodo_obtencion: (raw.obtainMethod?.toLowerCase().startsWith('real') ? 'real' : 'estimada') as 'real' | 'estimada',
    origen: 'datadis',
  }
}

/**
 * Agrega consumos horarios por período tarifario para rellenar energia_p1_kwh..p6_kwh.
 * Usa la tarifa del CUPS para determinar a qué período pertenece cada hora.
 *
 * Simplificación: para 2.0TD usamos pico/valle/supervalle estándar.
 * Para tarifas industriales (3.0TD, 6.xTD) la discriminación exacta depende
 * de la zona y festivos — aquí usamos la distribución estándar de REE.
 */
export function aggregateConsumptionByPeriod(
  consumptions: DatadisConsumptionRaw[],
  tarifa: string,
): Record<string, number> {
  const totals: Record<string, number> = {
    p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0,
  }

  for (const c of consumptions) {
    const hour = datadisTimeToHour(c.time)
    const period = hourToPeriod(hour, tarifa)
    totals[`p${period}`] = (totals[`p${period}`] ?? 0) + (c.consumptionKWh ?? 0)
  }

  return totals
}

/**
 * Mapeo hora → período tarifario (simplificado, zona peninsular, días laborables).
 * Referencia: Circular 3/2020 de la CNMC.
 */
function hourToPeriod(hour: number, tarifa: string): number {
  if (tarifa === '2.0TD') {
    // P1: 10-14 y 18-22 (pico), P2: resto diurno, P3: nocturno (0-8 y 22-24)
    if (hour >= 10 && hour < 14) return 1
    if (hour >= 18 && hour < 22) return 1
    if (hour >= 0 && hour < 8) return 3
    if (hour >= 22) return 3
    return 2
  }
  // Para 3.0TD y 6.xTD: P1 punta, P2-P3 llana, P4-P6 valle
  // Simplificación horaria estándar peninsular
  if (hour >= 9 && hour < 14) return 1
  if (hour >= 18 && hour < 22) return 1
  if (hour >= 8 && hour < 9) return 2
  if (hour >= 14 && hour < 18) return 2
  if (hour >= 22 && hour < 24) return 2
  return 3  // Nocturno → P3 en 3.0TD, P6 en 6.xTD (simplificado)
}
