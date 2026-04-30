// ═══════════════════════════════════════════════════════════════════
// Edge Function: datadis-proxy  v1
// ═══════════════════════════════════════════════════════════════════
//
// Proxy seguro hacia la API privada de Datadis.
// Credenciales master de Valere en Supabase Vault.
// Los clientes NUNCA comparten contraseña — solo autorizan el NIF
// de Valere desde el portal de Datadis.
//
// Spec capturada en vivo 2026-04-30 (sesión CHEMTROL ESPAÑOLA SA)
// Ver docs/PLAN_INTEGRACION_DATADIS.md §3 y §Apéndice-A.
//
// Endpoints expuestos:
//   POST /datadis-proxy          body: { action, params }
//
// Actions disponibles:
//   - get_supplies               → lista de suministros del NIF autorizado
//   - get_consumption            → curva horaria (kWh/h por CUPS)
//   - get_max_power              → potencias máximas mensuales
//   - get_contractual            → datos contractuales (tarifa, potencias contratadas)
//   - get_reactive               → energía reactiva mensual (kVArh)
//
// Requiere JWT de Supabase válido (usuario autenticado del CRM).
// ═══════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.100.0'

// ───────────── Constantes Datadis ─────────────

const DATADIS_BASE = 'https://datadis.es'
const DATADIS_LOGIN_URL = `${DATADIS_BASE}/nikola-auth/tokens/login`

// Endpoints internos del portal (capturados en vivo — pueden cambiar)
// La API de terceros oficial usa /api-private/api/… — actualizar cuando
// Valere tenga acceso corporativo y se lean los PDFs fileId=1 y fileId=2.
const DATADIS_ENDPOINTS = {
  supplies:     '/api-private/getSupplies',                            // GET
  consumption:  '/api-private/supply-data/v2/time-curve-data/hours',  // POST
  max_power:    '/api-private/supply-data/max-power',                  // POST
  contractual:  '/api-private/supply-data/contractual-data',          // POST
  reactive:     '/api-private/supply-data/get-reactive-data',         // POST
} as const

// ───────────── Config Supabase ─────────────

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Credenciales master de Valere en Datadis (Supabase Vault Secrets)
const DATADIS_USERNAME = Deno.env.get('DATADIS_USERNAME')!  // NIF Valere
const DATADIS_PASSWORD = Deno.env.get('DATADIS_PASSWORD')!

const ALLOWED_ORIGINS = [
  Deno.env.get('ALLOWED_ORIGIN') || 'http://localhost:3000',
  'https://valere-v2.pages.dev',
]

// ───────────── Cache de token en memoria ─────────────
// Cada instancia de la Edge Function tiene su propio cache.
// TTL real del token Datadis: 24h (exp - iat = 86400s)
// Refrescamos con margen de 5 min para evitar expiración mid-request.

interface TokenCache {
  jwt: string
  expiresAt: number  // ms epoch
}

let tokenCache: TokenCache | null = null

async function getDatadisToken(): Promise<string> {
  const now = Date.now()
  const margin = 5 * 60 * 1000  // 5 minutos

  if (tokenCache && tokenCache.expiresAt > now + margin) {
    return tokenCache.jwt
  }

  console.log('[datadis-proxy] Solicitando nuevo token Datadis…')

  const res = await fetch(DATADIS_LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username: DATADIS_USERNAME,
      password: DATADIS_PASSWORD,
      origin:   'WEB',
    }),
  })

  if (!res.ok) {
    throw new Error(`Datadis login falló: HTTP ${res.status}`)
  }

  // Datadis devuelve el JWT raw como texto plano (no JSON, no envoltorio)
  const jwt = (await res.text()).trim()

  if (!jwt.startsWith('eyJ')) {
    throw new Error('Datadis devolvió un token con formato inesperado')
  }

  // Decodificar payload para obtener exp
  let expiresAt: number
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1]))
    expiresAt = payload.exp * 1000  // seg → ms
  } catch {
    // Si no se puede decodificar, asumir 23h desde ahora
    expiresAt = now + 23 * 60 * 60 * 1000
  }

  tokenCache = { jwt, expiresAt }
  console.log(`[datadis-proxy] Token obtenido, válido hasta ${new Date(expiresAt).toISOString()}`)
  return jwt
}

// ───────────── Llamada autenticada a Datadis ─────────────

async function datadisRequest(
  path: string,
  method: 'GET' | 'POST',
  body?: unknown,
): Promise<unknown> {
  const doRequest = async (jwt: string) => {
    const headers: HeadersInit = {
      // ⚠️ Sin prefijo "Bearer" — la API de Datadis acepta el JWT directo
      'Authorization': jwt,
      'Accept': 'application/json',
    }
    if (method === 'POST') headers['Content-Type'] = 'application/json'

    return fetch(`${DATADIS_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  let jwt = await getDatadisToken()
  let res  = await doRequest(jwt)

  // Reintento único tras 401 (token expirado antes del margen)
  if (res.status === 401) {
    console.log('[datadis-proxy] 401 recibido — renovando token y reintentando…')
    tokenCache = null
    jwt = await getDatadisToken()
    res = await doRequest(jwt)
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Datadis API ${path} → HTTP ${res.status}: ${errText}`)
  }

  return res.json()
}

// ───────────── Acciones del proxy ─────────────

/**
 * Lista todos los suministros accesibles con el NIF de Valere.
 * Un suministro aparece si el cliente autorizó el NIF en el portal Datadis.
 * CodError:"902" = respuesta parcial (alguna distribuidora no contestó) — es normal.
 */
async function getSupplies(): Promise<unknown> {
  return datadisRequest(DATADIS_ENDPOINTS.supplies, 'GET')
}

/**
 * Curva horaria de consumo activo (kWh/h) para un CUPS y rango de fechas.
 *
 * @param cups              - CUPS del suministro
 * @param distributor       - cod_disitribuidora (typo oficial de Datadis, ej: "8")
 * @param fechaInicial      - "yyyy/MM/dd"  ← formato obligatorio con barras
 * @param fechaFinal        - "yyyy/MM/dd"
 * @param provinceCode      - código de provincia (ej: "28" para Madrid)
 * @param municipioCode     - código de municipio (ej: "079")
 * @param tarifaCode        - código de tarifa (ej: "3T", "2.0TD")
 * @param tipoPuntoMedida   - pointType (1..5), 4 y 5 son los más comunes
 * @param fraccion          - 0 = datos horarios completos (default)
 * @param hasAutoConsumo    - false si no tiene autoconsumo
 *
 * Respuesta: { response: { timeCurveList: Array<{date, hour, measureMagnitudeActive, period, ...}> } }
 * timeCurveList: [] si no hay datos (no error) — tratar como "sin datos en ese rango".
 * Unidades: kWh (no Wh, confirmado contra totales diarios de la UI).
 */
async function getConsumption(params: {
  cups: string
  distributor: string
  fechaInicial: string
  fechaFinal: string
  provinceCode: string
  municipioCode: string
  tarifaCode: string
  tipoPuntoMedida: number
  fraccion?: number
  hasAutoConsumo?: boolean
}): Promise<unknown> {
  return datadisRequest(DATADIS_ENDPOINTS.consumption, 'POST', {
    cups:             [params.cups],  // array, aunque sea 1 elemento
    distributor:      params.distributor,
    fechaInicial:     params.fechaInicial,
    fechaFinal:       params.fechaFinal,
    provinceCode:     params.provinceCode,
    municipioCode:    params.municipioCode,
    tarifaCode:       params.tarifaCode,
    tipoPuntoMedida:  params.tipoPuntoMedida,
    fraccion:         params.fraccion ?? 0,
    hasAutoConsumo:   params.hasAutoConsumo ?? false,
    tipoAutoConsumo:  '',
  })
}

/**
 * Potencias máximas registradas, un registro por (mes × periodo).
 * Unidades: kW. Campo: maximoPotenciaDemandada.
 */
async function getMaxPower(params: {
  cups: string
  distributor: string
  fechaInicial: string
  fechaFinal: string
  provinceCode: string
  tarifaCode: string
}): Promise<unknown> {
  return datadisRequest(DATADIS_ENDPOINTS.max_power, 'POST', {
    cups:         [params.cups],
    distributor:  params.distributor,
    fechaInicial: params.fechaInicial,
    fechaFinal:   params.fechaFinal,
    provinceCode: params.provinceCode,
    tarifaCode:   params.tarifaCode,
  })
}

/**
 * Datos contractuales: comercializadora, tarifa, potencias contratadas (array 6 periodos), etc.
 * potenciaContratada: [P1, P2, P3, P4, P5, P6] en kW.
 */
async function getContractual(params: {
  cups: string
  distributor: string
}): Promise<unknown> {
  return datadisRequest(DATADIS_ENDPOINTS.contractual, 'POST', {
    cups:        [params.cups],
    distributor: params.distributor,
  })
}

/**
 * Energía reactiva mensual (kVArh), desglosada en P1..P6.
 * Valores negativos = capacitiva.
 */
async function getReactive(params: {
  cups: string
  distributor: string
  fechaInicial: string
  fechaFinal: string
  provinceCode: string
  tarifaCode: string
}): Promise<unknown> {
  return datadisRequest(DATADIS_ENDPOINTS.reactive, 'POST', {
    cups:         [params.cups],
    distributor:  params.distributor,
    fechaInicial: params.fechaInicial,
    fechaFinal:   params.fechaFinal,
    provinceCode: params.provinceCode,
    tarifaCode:   params.tarifaCode,
  })
}

// ───────────── Handler principal ─────────────

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
})

serve(async (req) => {
  const origin = req.headers.get('origin') ?? ''

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // ── Verificar JWT de Supabase (usuario autenticado del CRM) ──
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } }
    )
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Token inválido o expirado' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } }
    )
  }

  // ── Parsear body ──
  let action: string
  let params: Record<string, unknown>
  try {
    const body = await req.json()
    action = body.action
    params = body.params ?? {}
  } catch {
    return new Response(
      JSON.stringify({ error: 'Body JSON inválido' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } }
    )
  }

  if (!action) {
    return new Response(
      JSON.stringify({ error: 'Campo "action" requerido' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } }
    )
  }

  // ── Ejecutar acción ──
  try {
    let result: unknown

    switch (action) {
      case 'get_supplies':
        result = await getSupplies()
        break

      case 'get_consumption':
        result = await getConsumption(params as Parameters<typeof getConsumption>[0])
        break

      case 'get_max_power':
        result = await getMaxPower(params as Parameters<typeof getMaxPower>[0])
        break

      case 'get_contractual':
        result = await getContractual(params as Parameters<typeof getContractual>[0])
        break

      case 'get_reactive':
        result = await getReactive(params as Parameters<typeof getReactive>[0])
        break

      default:
        return new Response(
          JSON.stringify({ error: `Acción desconocida: ${action}` }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } }
        )
    }

    return new Response(
      JSON.stringify({ ok: true, data: result }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      }
    )

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[datadis-proxy] Error:', message)
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      {
        // 200 para que el SDK de Supabase entregue el body al cliente
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      }
    )
  }
})
