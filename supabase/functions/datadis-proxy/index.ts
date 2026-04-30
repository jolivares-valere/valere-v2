// ═══════════════════════════════════════════════════════════════════
// Edge Function: datadis-proxy  v2
// ═══════════════════════════════════════════════════════════════════
//
// Proxy seguro hacia la API de Datadis con abstracción dual:
//
//   MODO "portal"   — endpoints internos del portal web, capturados
//                     en vivo 2026-04-30 (sesión CHEMTROL ESPAÑOLA SA).
//                     Funcionan YA con cualquier cuenta Datadis.
//                     Sin SLA oficial — Datadis puede cambiarlos sin aviso.
//                     Auth: Authorization: <jwt>  (sin "Bearer")
//                     Formato: POST con JSON body, fechas "yyyy/MM/dd"
//
//   MODO "terceros" — API oficial para integradores registrados.
//                     Requiere que Datadis active el flag apiAccess=true
//                     en la cuenta de Valere (solicitar a datadis@enagas.es
//                     o desde Mi cuenta → Solicitar acceso API).
//                     Endpoints en /api-private/api/… con querystring (GET).
//                     Auth: Authorization: Bearer <jwt>  (CON "Bearer")
//
// Selección: variable de entorno DATADIS_MODE = "portal" (default) | "terceros"
//
// Spec completa: docs/PLAN_INTEGRACION_DATADIS.md §Apéndice-A
// Credenciales master de Valere en Supabase Vault (DATADIS_USERNAME / PASSWORD).
//
// Actions expuestas via POST /datadis-proxy  { action, params }:
//   - get_supplies    → lista suministros del NIF autorizado
//   - get_consumption → curva horaria kWh/h
//   - get_max_power   → potencias máximas mensuales (kW)
//   - get_contractual → datos contrato (tarifa, potencias contratadas)
//   - get_reactive    → energía reactiva mensual (kVArh)
// ═══════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.100.0'

// ───────────── Modo de operación ─────────────

type DatadisMode = 'portal' | 'terceros'
const DATADIS_MODE = (Deno.env.get('DATADIS_MODE') ?? 'portal') as DatadisMode

const DATADIS_BASE = 'https://datadis.es'
const DATADIS_LOGIN_URL = `${DATADIS_BASE}/nikola-auth/tokens/login`

const ENDPOINTS_PORTAL = {
  supplies:    { method: 'GET'  as const, path: '/api-private/getSupplies' },
  consumption: { method: 'POST' as const, path: '/api-private/supply-data/v2/time-curve-data/hours' },
  max_power:   { method: 'POST' as const, path: '/api-private/supply-data/max-power' },
  contractual: { method: 'POST' as const, path: '/api-private/supply-data/contractual-data' },
  reactive:    { method: 'POST' as const, path: '/api-private/supply-data/get-reactive-data' },
}

const ENDPOINTS_TERCEROS = {
  supplies:    { method: 'GET' as const, path: '/api-private/api/get-supplies' },
  consumption: { method: 'GET' as const, path: '/api-private/api/get-consumption-data' },
  max_power:   { method: 'GET' as const, path: '/api-private/api/get-max-power' },
  contractual: { method: 'GET' as const, path: '/api-private/api/get-contract-detail' },
  reactive:    { method: 'GET' as const, path: '/api-private/api/get-reactive-data' },
}

const DATADIS_ENDPOINTS = DATADIS_MODE === 'terceros' ? ENDPOINTS_TERCEROS : ENDPOINTS_PORTAL

// ───────────── Config Supabase ─────────────

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DATADIS_USERNAME          = Deno.env.get('DATADIS_USERNAME')!
const DATADIS_PASSWORD          = Deno.env.get('DATADIS_PASSWORD')!

const ALLOWED_ORIGINS = [
  Deno.env.get('ALLOWED_ORIGIN') || 'http://localhost:3000',
  'https://valere-v2.pages.dev',
]

// ───────────── Cache de token en memoria ─────────────

interface TokenCache { jwt: string; expiresAt: number }
let tokenCache: TokenCache | null = null

async function getDatadisToken(): Promise<string> {
  const now    = Date.now()
  const margin = 5 * 60 * 1000
  if (tokenCache && tokenCache.expiresAt > now + margin) return tokenCache.jwt

  console.log('[datadis-proxy] Solicitando nuevo token Datadis...')
  const res = await fetch(DATADIS_LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: DATADIS_USERNAME, password: DATADIS_PASSWORD, origin: 'WEB' }),
  })
  if (!res.ok) throw new Error(`Datadis login fallo: HTTP ${res.status}`)

  const jwt = (await res.text()).trim()
  if (!jwt.startsWith('eyJ')) throw new Error('Token Datadis con formato inesperado')

  let expiresAt: number
  try { expiresAt = JSON.parse(atob(jwt.split('.')[1])).exp * 1000 }
  catch { expiresAt = now + 23 * 60 * 60 * 1000 }

  tokenCache = { jwt, expiresAt }
  console.log(`[datadis-proxy] Token valido hasta ${new Date(expiresAt).toISOString()}`)
  return jwt
}

// ───────────── Llamada autenticada a Datadis ─────────────

async function datadisRequest(path: string, method: 'GET' | 'POST', bodyOrParams?: unknown): Promise<unknown> {
  const doRequest = async (jwt: string) => {
    const headers: HeadersInit = {
      'Authorization': DATADIS_MODE === 'terceros' ? `Bearer ${jwt}` : jwt,
      'Accept': 'application/json',
    }
    let url = `${DATADIS_BASE}${path}`
    let fetchBody: string | undefined

    if (DATADIS_MODE === 'terceros' && bodyOrParams) {
      const qs = new URLSearchParams(
        Object.entries(bodyOrParams as Record<string, unknown>)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => [k, String(v)])
      ).toString()
      if (qs) url += '?' + qs
    } else if (method === 'POST' && bodyOrParams) {
      headers['Content-Type'] = 'application/json'
      fetchBody = JSON.stringify(bodyOrParams)
    }
    return fetch(url, { method, headers, body: fetchBody })
  }

  let jwt = await getDatadisToken()
  let res  = await doRequest(jwt)
  if (res.status === 401) {
    console.log('[datadis-proxy] 401 — renovando token...')
    tokenCache = null
    jwt = await getDatadisToken()
    res = await doRequest(jwt)
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Datadis ${path} -> HTTP ${res.status}: ${errText}`)
  }
  return res.json()
}

// ───────────── Acciones ─────────────

async function getSupplies(authorizedNif?: string): Promise<unknown> {
  const params = DATADIS_MODE === 'terceros' && authorizedNif ? { authorizedNif } : undefined
  return datadisRequest(DATADIS_ENDPOINTS.supplies.path, DATADIS_ENDPOINTS.supplies.method, params)
}

async function getConsumption(params: {
  cups: string; distributor: string; fechaInicial: string; fechaFinal: string
  provinceCode: string; municipioCode: string; tarifaCode: string
  tipoPuntoMedida: number; fraccion?: number; hasAutoConsumo?: boolean; authorizedNif?: string
}): Promise<unknown> {
  const ep = DATADIS_ENDPOINTS.consumption
  if (DATADIS_MODE === 'terceros') {
    return datadisRequest(ep.path, ep.method, {
      cups: params.cups, distributorCode: params.distributor,
      startDate: params.fechaInicial, endDate: params.fechaFinal,
      measurementType: 1, pointType: params.tipoPuntoMedida,
      ...(params.authorizedNif ? { authorizedNif: params.authorizedNif } : {}),
    })
  }
  return datadisRequest(ep.path, ep.method, {
    cups: [params.cups], distributor: params.distributor,
    fechaInicial: params.fechaInicial, fechaFinal: params.fechaFinal,
    provinceCode: params.provinceCode, municipioCode: params.municipioCode,
    tarifaCode: params.tarifaCode, tipoPuntoMedida: params.tipoPuntoMedida,
    fraccion: params.fraccion ?? 0, hasAutoConsumo: params.hasAutoConsumo ?? false,
    tipoAutoConsumo: '',
  })
}

async function getMaxPower(params: {
  cups: string; distributor: string; fechaInicial: string; fechaFinal: string
  provinceCode: string; tarifaCode: string; authorizedNif?: string
}): Promise<unknown> {
  const ep = DATADIS_ENDPOINTS.max_power
  if (DATADIS_MODE === 'terceros') {
    return datadisRequest(ep.path, ep.method, {
      cups: params.cups, distributorCode: params.distributor,
      startDate: params.fechaInicial, endDate: params.fechaFinal,
      ...(params.authorizedNif ? { authorizedNif: params.authorizedNif } : {}),
    })
  }
  return datadisRequest(ep.path, ep.method, {
    cups: [params.cups], distributor: params.distributor,
    fechaInicial: params.fechaInicial, fechaFinal: params.fechaFinal,
    provinceCode: params.provinceCode, tarifaCode: params.tarifaCode,
  })
}

async function getContractual(params: {
  cups: string; distributor: string; authorizedNif?: string
}): Promise<unknown> {
  const ep = DATADIS_ENDPOINTS.contractual
  if (DATADIS_MODE === 'terceros') {
    return datadisRequest(ep.path, ep.method, {
      cups: params.cups, distributorCode: params.distributor,
      ...(params.authorizedNif ? { authorizedNif: params.authorizedNif } : {}),
    })
  }
  return datadisRequest(ep.path, ep.method, { cups: [params.cups], distributor: params.distributor })
}

async function getReactive(params: {
  cups: string; distributor: string; fechaInicial: string; fechaFinal: string
  provinceCode: string; tarifaCode: string; authorizedNif?: string
}): Promise<unknown> {
  const ep = DATADIS_ENDPOINTS.reactive
  if (DATADIS_MODE === 'terceros') {
    return datadisRequest(ep.path, ep.method, {
      cups: params.cups, distributorCode: params.distributor,
      startDate: params.fechaInicial, endDate: params.fechaFinal,
      ...(params.authorizedNif ? { authorizedNif: params.authorizedNif } : {}),
    })
  }
  return datadisRequest(ep.path, ep.method, {
    cups: [params.cups], distributor: params.distributor,
    fechaInicial: params.fechaInicial, fechaFinal: params.fechaFinal,
    provinceCode: params.provinceCode, tarifaCode: params.tarifaCode,
  })
}

// ───────────── Handler principal ─────────────

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin':  ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
})

serve(async (req) => {
  const origin = req.headers.get('origin') ?? ''

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) })
  if (req.method !== 'POST')    return new Response('Method Not Allowed', { status: 405 })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Token invalido o expirado' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } })
  }

  let action: string
  let params: Record<string, unknown>
  try {
    const body = await req.json()
    action = body.action
    params = body.params ?? {}
  } catch {
    return new Response(JSON.stringify({ error: 'Body JSON invalido' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } })
  }

  if (!action) {
    return new Response(JSON.stringify({ error: 'Campo "action" requerido' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } })
  }

  try {
    let result: unknown
    switch (action) {
      case 'get_supplies':   result = await getSupplies(params.authorizedNif as string | undefined); break
      case 'get_consumption':result = await getConsumption(params as Parameters<typeof getConsumption>[0]); break
      case 'get_max_power':  result = await getMaxPower(params as Parameters<typeof getMaxPower>[0]); break
      case 'get_contractual':result = await getContractual(params as Parameters<typeof getContractual>[0]); break
      case 'get_reactive':   result = await getReactive(params as Parameters<typeof getReactive>[0]); break
      default:
        return new Response(JSON.stringify({ error: `Accion desconocida: ${action}` }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } })
    }
    return new Response(JSON.stringify({ ok: true, data: result }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[datadis-proxy] Error:', message)
    return new Response(JSON.stringify({ ok: false, error: message }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } })
  }
})
