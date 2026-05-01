// ═══════════════════════════════════════════════════════════════════
// Edge Function: datadis-proxy  v8
// ═══════════════════════════════════════════════════════════════════
//
// Cambios v8 (2026-05-01):
//   - Caché persistente en tabla datadis_proxy_cache de Supabase.
//   - Antes de llamar a Datadis: comprueba si hay datos frescos en cache.
//   - Tras recibir respuesta: guarda en cache (upsert).
//   - Si Datadis falla Y hay datos en cache (aunque expirados): devuelve
//     los datos guardados con flag { from_cache: true, stale: true }.
//   - CORS mejorado: refleja el Origin del request si está en allowlist.
//   - TTL configurable por action: supplies 24h, contractual 168h, resto 6h.
//
// Arquitectura de caché:
//   cache_key = datadis_username + ':' + action + ':' + cups + ':' + paramsHash
//   paramsHash = primeros 8 chars de SHA-1 del JSON.stringify(params)
//
// Actions expuestas via POST /datadis-proxy:
//   Body: { action, params?, datadis_username?, datadis_password? }
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

const DATADIS_BASE      = 'https://datadis.es'
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

// TTL en horas por action
const CACHE_TTL_HOURS: Record<string, number> = {
  get_supplies:    24,
  get_contractual: 168,  // 7 días — datos contractuales muy estables
  get_consumption: 6,
  get_max_power:   24,
  get_reactive:    24,
}

// ───────────── Config Supabase ─────────────

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DATADIS_USERNAME          = Deno.env.get('DATADIS_USERNAME')!
const DATADIS_PASSWORD          = Deno.env.get('DATADIS_PASSWORD')!

// ───────────── CORS ─────────────
// Refleja el Origin del request si está en la allowlist (necesario para cookies).
// El SDK de Supabase JS envía 'apikey' y 'x-client-info' en todas las llamadas.

const ALLOWED_ORIGINS = new Set([
  'https://valere-v2.pages.dev',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  Deno.env.get('ALLOWED_ORIGIN') ?? '',
].filter(Boolean))

function corsHeaders(req: Request): Record<string, string> {
  const origin  = req.headers.get('origin') ?? ''
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : 'https://valere-v2.pages.dev'
  return {
    'Access-Control-Allow-Origin':      allowed,
    'Access-Control-Allow-Methods':     'POST, OPTIONS',
    'Access-Control-Allow-Headers':     'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
    'Vary':                             'Origin',
  }
}

// ───────────── Cache de token maestro en memoria ─────────────

interface TokenCache { jwt: string; cookies: string; expiresAt: number }
let tokenCache: TokenCache | null = null

// ───────────── Autenticación Datadis ─────────────

interface OverrideCreds { username?: string; password?: string }

async function getDatadisSession(creds?: OverrideCreds): Promise<{ jwt: string; cookies: string }> {
  const username = creds?.username || DATADIS_USERNAME
  const password = creds?.password || DATADIS_PASSWORD

  if (!creds?.username) {
    const now    = Date.now()
    const margin = 5 * 60 * 1000
    if (tokenCache && tokenCache.expiresAt > now + margin) {
      return { jwt: tokenCache.jwt, cookies: tokenCache.cookies }
    }
  }

  console.log(`[datadis-proxy] Login (${creds?.username ? 'override' : 'master'})...`)
  const res = await fetch(DATADIS_LOGIN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({ username, password, origin: 'WEB' }),
  })
  if (!res.ok) throw new Error(`Datadis login fallo: HTTP ${res.status}`)

  const jwt = (await res.text()).trim()
  if (!jwt.startsWith('eyJ')) {
    throw new Error('Credenciales Datadis incorrectas o respuesta inesperada del servidor')
  }

  const cookies = res.headers.getSetCookie
    ? res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
    : (res.headers.get('set-cookie') ?? '').split(';')[0]

  let expiresAt: number
  try { expiresAt = JSON.parse(atob(jwt.split('.')[1])).exp * 1000 }
  catch { expiresAt = Date.now() + 23 * 60 * 60 * 1000 }

  if (!creds?.username) {
    tokenCache = { jwt, cookies, expiresAt }
    console.log(`[datadis-proxy] Token master válido hasta ${new Date(expiresAt).toISOString()}`)
  }

  return { jwt, cookies }
}

// ───────────── Llamada autenticada a Datadis ─────────────

async function datadisRequest(
  path: string,
  method: 'GET' | 'POST',
  bodyOrParams?: unknown,
  creds?: OverrideCreds,
): Promise<unknown> {
  const doRequest = async (jwt: string, cookies: string) => {
    const headers: HeadersInit = {
      'Authorization': `Bearer ${jwt}`,
      'Accept':        'application/json',
      'Content-Type':  'application/json',
    }
    if (cookies) headers['Cookie'] = cookies

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
      fetchBody = JSON.stringify(bodyOrParams)
    }

    return fetch(url, { method, headers, body: fetchBody })
  }

  let { jwt, cookies } = await getDatadisSession(creds)
  let res = await doRequest(jwt, cookies)

  if (res.status === 401) {
    console.log('[datadis-proxy] 401 — renovando sesion...')
    if (!creds?.username) tokenCache = null
    ;({ jwt, cookies } = await getDatadisSession(creds))
    res = await doRequest(jwt, cookies)
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Datadis ${path} -> HTTP ${res.status}: ${errText}`)
  }
  return res.json()
}

// ───────────── Acciones ─────────────

async function getSupplies(authorizedNif?: string, creds?: OverrideCreds): Promise<unknown> {
  const params = DATADIS_MODE === 'terceros' && authorizedNif ? { authorizedNif } : undefined
  return datadisRequest(DATADIS_ENDPOINTS.supplies.path, DATADIS_ENDPOINTS.supplies.method, params, creds)
}

async function getConsumption(params: {
  cups: string; distributor: string; fechaInicial: string; fechaFinal: string
  provinceCode: string; municipioCode: string; tarifaCode: string
  tipoPuntoMedida: number; fraccion?: number; hasAutoConsumo?: boolean; authorizedNif?: string
}, creds?: OverrideCreds): Promise<unknown> {
  const ep = DATADIS_ENDPOINTS.consumption
  if (DATADIS_MODE === 'terceros') {
    return datadisRequest(ep.path, ep.method, {
      cups: params.cups, distributorCode: params.distributor,
      startDate: params.fechaInicial, endDate: params.fechaFinal,
      measurementType: 1, pointType: params.tipoPuntoMedida,
      ...(params.authorizedNif ? { authorizedNif: params.authorizedNif } : {}),
    }, creds)
  }
  return datadisRequest(ep.path, ep.method, {
    cups: [params.cups], distributor: params.distributor,
    fechaInicial: params.fechaInicial, fechaFinal: params.fechaFinal,
    provinceCode: params.provinceCode, municipioCode: params.municipioCode,
    tarifaCode: params.tarifaCode, tipoPuntoMedida: params.tipoPuntoMedida,
    fraccion: params.fraccion ?? 0, hasAutoConsumo: params.hasAutoConsumo ?? false,
    tipoAutoConsumo: '',
  }, creds)
}

async function getMaxPower(params: {
  cups: string; distributor: string; fechaInicial: string; fechaFinal: string
  provinceCode: string; tarifaCode: string; authorizedNif?: string
}, creds?: OverrideCreds): Promise<unknown> {
  const ep = DATADIS_ENDPOINTS.max_power
  if (DATADIS_MODE === 'terceros') {
    return datadisRequest(ep.path, ep.method, {
      cups: params.cups, distributorCode: params.distributor,
      startDate: params.fechaInicial, endDate: params.fechaFinal,
      ...(params.authorizedNif ? { authorizedNif: params.authorizedNif } : {}),
    }, creds)
  }
  return datadisRequest(ep.path, ep.method, {
    cups: [params.cups], distributor: params.distributor,
    fechaInicial: params.fechaInicial, fechaFinal: params.fechaFinal,
    provinceCode: params.provinceCode, tarifaCode: params.tarifaCode,
  }, creds)
}

async function getContractual(params: {
  cups: string; distributor: string; authorizedNif?: string
}, creds?: OverrideCreds): Promise<unknown> {
  const ep = DATADIS_ENDPOINTS.contractual
  if (DATADIS_MODE === 'terceros') {
    return datadisRequest(ep.path, ep.method, {
      cups: params.cups, distributorCode: params.distributor,
      ...(params.authorizedNif ? { authorizedNif: params.authorizedNif } : {}),
    }, creds)
  }
  return datadisRequest(ep.path, ep.method, { cups: [params.cups], distributor: params.distributor }, creds)
}

async function getReactive(params: {
  cups: string; distributor: string; fechaInicial: string; fechaFinal: string
  provinceCode: string; tarifaCode: string; authorizedNif?: string
}, creds?: OverrideCreds): Promise<unknown> {
  const ep = DATADIS_ENDPOINTS.reactive
  if (DATADIS_MODE === 'terceros') {
    return datadisRequest(ep.path, ep.method, {
      cups: params.cups, distributorCode: params.distributor,
      startDate: params.fechaInicial, endDate: params.fechaFinal,
      ...(params.authorizedNif ? { authorizedNif: params.authorizedNif } : {}),
    }, creds)
  }
  return datadisRequest(ep.path, ep.method, {
    cups: [params.cups], distributor: params.distributor,
    fechaInicial: params.fechaInicial, fechaFinal: params.fechaFinal,
    provinceCode: params.provinceCode, tarifaCode: params.tarifaCode,
  }, creds)
}

// ───────────── Caché Supabase ─────────────

/** Hash simple (FNV-1a 32bit) para generar cache_key determinista */
function hashParams(params: unknown): string {
  const str = JSON.stringify(params ?? {})
  let hash = 2166136261
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

function buildCacheKey(datadisUsername: string, action: string, params: unknown): string {
  const cups = (params as Record<string, unknown>)?.cups as string | undefined
  return `${datadisUsername}:${action}:${cups ?? ''}:${hashParams(params)}`
}

interface CacheRow {
  id: string
  response_data: unknown
  fetched_at: string
  stale_after_hours: number
  is_stale: boolean   // computed in JS: fetched_at + stale_after_hours < now
}

function isCacheStale(row: Omit<CacheRow, 'is_stale'>): boolean {
  const fetchedMs = new Date(row.fetched_at).getTime()
  return fetchedMs + row.stale_after_hours * 3_600_000 < Date.now()
}

async function readCache(
  supabase: ReturnType<typeof createClient>,
  cacheKey: string,
): Promise<CacheRow | null> {
  const { data, error } = await supabase
    .from('datadis_proxy_cache')
    .select('id, response_data, fetched_at, stale_after_hours')
    .eq('cache_key', cacheKey)
    .single()

  if (error || !data) return null
  const row = data as Omit<CacheRow, 'is_stale'>
  return { ...row, is_stale: isCacheStale(row) }
}

async function writeCache(
  supabase: ReturnType<typeof createClient>,
  opts: {
    cacheKey: string
    datadisUsername: string
    action: string
    cups: string | undefined
    params: unknown
    responseData: unknown
    staleAfterHours: number
  },
): Promise<void> {
  const { error } = await supabase
    .from('datadis_proxy_cache')
    .upsert({
      cache_key:         opts.cacheKey,
      datadis_username:  opts.datadisUsername,
      action:            opts.action,
      cups:              opts.cups ?? null,
      params_snapshot:   opts.params ?? null,
      response_data:     opts.responseData,
      fetched_at:        new Date().toISOString(),
      stale_after_hours: opts.staleAfterHours,
    }, { onConflict: 'cache_key' })

  if (error) {
    console.error('[datadis-proxy] writeCache error:', error.message)
  }
}

// ───────────── Handler principal ─────────────

serve(async (req) => {
  const cors = corsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...cors } },
    )
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Token invalido o expirado' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...cors } },
    )
  }

  let action: string
  let params: Record<string, unknown>
  let overrideUser: string | undefined
  let overridePass: string | undefined
  let forceRefresh: boolean = false
  try {
    const body    = await req.json()
    action        = body.action
    params        = body.params ?? {}
    overrideUser  = body.datadis_username as string | undefined
    overridePass  = body.datadis_password as string | undefined
    forceRefresh  = body.force_refresh === true
  } catch {
    return new Response(
      JSON.stringify({ error: 'Body JSON invalido' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...cors } },
    )
  }

  if (!action) {
    return new Response(
      JSON.stringify({ error: 'Campo "action" requerido' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...cors } },
    )
  }

  const creds: OverrideCreds | undefined = overrideUser
    ? { username: overrideUser, password: overridePass }
    : undefined

  const datadisUsername = overrideUser ?? 'master'
  const cacheKey        = buildCacheKey(datadisUsername, action, action === 'get_supplies' ? null : params)
  const staleTtl        = CACHE_TTL_HOURS[action] ?? 24

  // ── 1. Comprobar caché ───────────────────────────────────────────────────
  let cachedRow: CacheRow | null = null
  if (!forceRefresh) {
    cachedRow = await readCache(supabase, cacheKey)
    if (cachedRow && !cachedRow.is_stale) {
      console.log(`[datadis-proxy] Cache HIT (fresh): ${action} / ${datadisUsername}`)
      return new Response(
        JSON.stringify({
          ok:          true,
          data:        cachedRow.response_data,
          from_cache:  true,
          cached_at:   cachedRow.fetched_at,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...cors } },
      )
    }
  }

  // ── 2. Llamar a Datadis ──────────────────────────────────────────────────
  try {
    let result: unknown
    switch (action) {
      case 'get_supplies':
        result = await getSupplies(params.authorizedNif as string | undefined, creds)
        break
      case 'get_consumption':
        result = await getConsumption(params as Parameters<typeof getConsumption>[0], creds)
        break
      case 'get_max_power':
        result = await getMaxPower(params as Parameters<typeof getMaxPower>[0], creds)
        break
      case 'get_contractual':
        result = await getContractual(params as Parameters<typeof getContractual>[0], creds)
        break
      case 'get_reactive':
        result = await getReactive(params as Parameters<typeof getReactive>[0], creds)
        break
      default:
        return new Response(
          JSON.stringify({ error: `Accion desconocida: ${action}` }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...cors } },
        )
    }

    // ── 3. Guardar en caché ───────────────────────────────────────────────
    const cups = (params as Record<string, unknown>).cups as string | undefined
    await writeCache(supabase, {
      cacheKey, datadisUsername, action, cups,
      params:        action === 'get_supplies' ? null : params,
      responseData:  result,
      staleAfterHours: staleTtl,
    })

    console.log(`[datadis-proxy] Cache WRITE: ${action} / ${datadisUsername}`)
    return new Response(
      JSON.stringify({ ok: true, data: result, from_cache: false }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...cors } },
    )

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error(`[datadis-proxy] Error en action=${action}:`, message)

    // ── 4. Fallback: datos expirados del caché si los hay ─────────────────
    if (cachedRow) {
      console.log(`[datadis-proxy] Cache FALLBACK (stale): ${action} / ${datadisUsername}`)
      return new Response(
        JSON.stringify({
          ok:          true,
          data:        cachedRow.response_data,
          from_cache:  true,
          stale:       true,
          cached_at:   cachedRow.fetched_at,
          datadis_error: message,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...cors } },
      )
    }

    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...cors } },
    )
  }
})
