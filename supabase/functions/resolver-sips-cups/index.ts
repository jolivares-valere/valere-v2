// ═══════════════════════════════════════════════════════════════════
// Edge Function: resolver-sips-cups  v1  (FASE F1 — capa SIPS/Datadis)
// ═══════════════════════════════════════════════════════════════════
//
// Orquestador "resuelve por CUPS": dado un CUPS (y opcionalmente el NIF
// autorizado), devuelve en UNA sola llamada todo lo que el comercial
// necesita para autorrellenar un alta de contrato / oportunidad, sin
// que tenga que saber nada de Datadis. Replica lo que hace el CRM de
// Zocoenergía con su `getAPIConsumption` / `getCIFByCUPS`.
//
// Reutiliza la EF `datadis-proxy` (no reimplementa Datadis): la invoca
// internamente con el JWT del usuario, encadenando:
//   1. get_supplies    → localizar el suministro (distribuidor, provincia,
//                        municipio, tipo de punto, tarifa, dirección, NIF).
//   2. get_contractual → titular, tarifa de acceso, potencias contratadas P1-P6.
//   3. get_max_power   → maxímetros mensuales (kW) por periodo (12 meses).
//   4. get_consumption → curva horaria → se agrega a consumo por periodo y mensual.
//
// Devuelve un objeto canónico `SipsResolveResult` (ver más abajo).
//
// El cacheo lo hace ya `datadis-proxy` (tabla datadis_proxy_cache), así que
// esta EF no añade tablas. Es HTTPS puro → no necesita VPS.
//
// POST /functions/v1/resolver-sips-cups
//   Authorization: Bearer {jwt usuario}
//   Body: { cups: string, authorizedNif?: string, months?: number,
//           datadis_username?: string, datadis_password?: string }
//
// Respuesta: { ok: true, data: SipsResolveResult } | { ok: false, error }
// ═══════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!

// ───────────── CORS ─────────────

const ALLOWED_ORIGINS = new Set([
  'https://valere-v2.pages.dev',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  Deno.env.get('ALLOWED_ORIGIN') ?? '',
].filter(Boolean))

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : 'https://valere-v2.pages.dev'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  }
}

// ───────────── Tipos canónicos ─────────────

interface PorPeriodo {
  p1: number | null; p2: number | null; p3: number | null
  p4: number | null; p5: number | null; p6: number | null
}

interface PuntoMensual {
  mes: string            // 'YYYY/MM'
  consumo_kwh: number
}

interface SipsResolveResult {
  cups: string
  encontrado: boolean
  titular_nif: string | null          // CIF/NIF del titular (getCIFByCUPS de Zoco)
  distribuidor: string | null
  distribuidor_codigo: string | null
  direccion: string | null
  codigo_postal: string | null
  provincia: string | null
  provincia_codigo: string | null
  municipio_codigo: string | null
  tarifa_acceso: string | null        // p.ej. '2.0TD'
  tipo_punto_medida: number | null
  comercializadora_actual: string | null
  fecha_ultimo_cambio_comerc: string | null
  potencias_contratadas: PorPeriodo   // kW por periodo
  maximetros: PorPeriodo              // kW máximo demandado por periodo (máx de los meses)
  consumo_por_periodo_kwh: PorPeriodo // kWh agregados del rango por periodo
  consumo_total_kwh: number | null
  consumo_mensual: PuntoMensual[]     // para la gráfica de 12 meses
  fuente: 'datadis'
  parcial: boolean                    // true si alguna sub-llamada falló pero hay datos básicos
  avisos: string[]
}

// ───────────── Helper: invocar datadis-proxy ─────────────

async function callDatadisProxy(
  authHeader: string,
  action: string,
  params: Record<string, unknown> | null,
  creds?: { username?: string; password?: string },
): Promise<{ ok: boolean; data?: unknown; error?: string; from_cache?: boolean }> {
  const body: Record<string, unknown> = { action }
  if (params) body.params = params
  if (creds?.username) {
    body.datadis_username = creds.username
    body.datadis_password = creds.password
  }
  const res = await fetch(`${SUPABASE_URL}/functions/v1/datadis-proxy`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  try {
    return await res.json()
  } catch {
    return { ok: false, error: `datadis-proxy ${action} HTTP ${res.status}` }
  }
}

// ───────────── Normalizadores ─────────────

const EMPTY_PERIODO: PorPeriodo = { p1: null, p2: null, p3: null, p4: null, p5: null, p6: null }

function pickArray(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[]
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    if (Array.isArray(r.response)) return r.response as Record<string, unknown>[]
    if (Array.isArray(r.supplies)) return r.supplies as Record<string, unknown>[]
    if (Array.isArray(r.timeCurveList)) return r.timeCurveList as Record<string, unknown>[]
  }
  return []
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Mapea el periodo Datadis (1..6) a clave pX. measuringTagPeriod / 'period'. */
function periodKey(v: unknown): keyof PorPeriodo | null {
  const n = Number(v)
  if (n >= 1 && n <= 6) return (`p${n}` as keyof PorPeriodo)
  return null
}

// ───────────── Handler ─────────────

serve(async (req) => {
  const cors = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: cors })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ ok: false, error: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...cors } })
  }

  let cups: string, authorizedNif: string | undefined, months: number
  let overrideUser: string | undefined, overridePass: string | undefined
  try {
    const body = await req.json()
    cups = String(body.cups ?? '').trim().toUpperCase()
    authorizedNif = body.authorizedNif ? String(body.authorizedNif) : undefined
    months = Number(body.months) > 0 ? Number(body.months) : 12
    overrideUser = body.datadis_username
    overridePass = body.datadis_password
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Body JSON invalido' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...cors } })
  }

  if (!/^ES[0-9A-Z]{18,20}$/.test(cups)) {
    return new Response(JSON.stringify({ ok: false, error: 'CUPS invalido (formato ES + 18-20 caracteres)' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...cors } })
  }

  const creds = overrideUser ? { username: overrideUser, password: overridePass } : undefined
  const avisos: string[] = []

  // Rango de fechas (YYYY/MM) — Datadis usa mes
  const now = new Date()
  const fechaFinal = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`
  const desde = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)
  const fechaInicial = `${desde.getFullYear()}/${String(desde.getMonth() + 1).padStart(2, '0')}`

  const result: SipsResolveResult = {
    cups, encontrado: false, titular_nif: authorizedNif ?? null,
    distribuidor: null, distribuidor_codigo: null, direccion: null, codigo_postal: null,
    provincia: null, provincia_codigo: null, municipio_codigo: null,
    tarifa_acceso: null, tipo_punto_medida: null,
    comercializadora_actual: null, fecha_ultimo_cambio_comerc: null,
    potencias_contratadas: { ...EMPTY_PERIODO }, maximetros: { ...EMPTY_PERIODO },
    consumo_por_periodo_kwh: { ...EMPTY_PERIODO }, consumo_total_kwh: null,
    consumo_mensual: [], fuente: 'datadis', parcial: false, avisos,
  }

  // ── 1. get_supplies → localizar el suministro ────────────────────────────
  const supRes = await callDatadisProxy(authHeader, 'get_supplies',
    authorizedNif ? { authorizedNif } : null, creds)
  if (!supRes.ok) {
    return new Response(JSON.stringify({ ok: false, error: `No se pudo consultar suministros: ${supRes.error}` }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...cors } })
  }
  const supplies = pickArray(supRes.data)
  const sup = supplies.find(s => String(s.cups ?? '').toUpperCase() === cups)
  if (!sup) {
    avisos.push('El CUPS no aparece entre los suministros autorizados en Datadis. Verifica la autorización del titular.')
    return new Response(JSON.stringify({ ok: true, data: result }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...cors } })
  }

  result.encontrado = true
  result.distribuidor = (sup.distributor as string) ?? null
  result.distribuidor_codigo = (sup.distributorCode as string) ?? (sup.cod_distribuidora as string) ?? null
  result.direccion = (sup.address as string) ?? null
  result.codigo_postal = (sup.postalCode as string) ?? null
  result.provincia = (sup.province as string) ?? null
  result.provincia_codigo = (sup.cod_provincia as string) ?? (sup.provinceCode as string) ?? null
  result.municipio_codigo = (sup.cod_municipio as string) ?? (sup.municipioCode as string) ?? null
  result.tarifa_acceso = (sup.tariff as string) ?? null
  result.tipo_punto_medida = num(sup.pointType)
  if (!result.titular_nif && sup.authorizedNif) result.titular_nif = String(sup.authorizedNif)
  result.fecha_ultimo_cambio_comerc = (sup.lastMarketerDate as string) ?? (sup.validDateFrom as string) ?? null

  const distributor = result.distribuidor_codigo ?? result.distribuidor ?? ''
  const provinceCode = result.provincia_codigo ?? ''
  const municipioCode = result.municipio_codigo ?? ''
  const tarifaCode = result.tarifa_acceso ?? ''
  const tipoPuntoMedida = result.tipo_punto_medida ?? 5

  // ── 2. get_contractual → titular, tarifa, potencias contratadas ──────────
  const conRes = await callDatadisProxy(authHeader, 'get_contractual',
    { cups, distributor, ...(authorizedNif ? { authorizedNif } : {}) }, creds)
  if (conRes.ok) {
    const con = pickArray(conRes.data)[0] ?? {}
    result.comercializadora_actual = (con.marketer as string) ?? result.comercializadora_actual
    result.tarifa_acceso = (con.accessFare as string) ?? result.tarifa_acceso
    result.potencias_contratadas = {
      p1: num(con.contractedPowerkWP1), p2: num(con.contractedPowerkWP2),
      p3: num(con.contractedPowerkWP3), p4: num(con.contractedPowerkWP4),
      p5: num(con.contractedPowerkWP5), p6: num(con.contractedPowerkWP6),
    }
    if (con.startDate && !result.fecha_ultimo_cambio_comerc) {
      result.fecha_ultimo_cambio_comerc = con.startDate as string
    }
  } else {
    result.parcial = true
    avisos.push(`No se pudieron leer datos contractuales: ${conRes.error}`)
  }

  // ── 3. get_max_power → maxímetros por periodo (máx de los meses) ──────────
  const mpRes = await callDatadisProxy(authHeader, 'get_max_power',
    { cups, distributor, fechaInicial, fechaFinal, provinceCode, tarifaCode,
      ...(authorizedNif ? { authorizedNif } : {}) }, creds)
  if (mpRes.ok) {
    const maxByPeriod: PorPeriodo = { ...EMPTY_PERIODO }
    for (const row of pickArray(mpRes.data)) {
      const k = periodKey(row.period ?? row.measuringTagPeriod)
      const v = num(row.maxPower)
      if (k && v !== null) maxByPeriod[k] = Math.max(maxByPeriod[k] ?? 0, v)
    }
    result.maximetros = maxByPeriod
  } else {
    result.parcial = true
    avisos.push(`No se pudieron leer maxímetros: ${mpRes.error}`)
  }

  // ── 4. get_consumption → curva → consumo por periodo + mensual ───────────
  const coRes = await callDatadisProxy(authHeader, 'get_consumption',
    { cups, distributor, fechaInicial, fechaFinal, provinceCode, municipioCode,
      tarifaCode, tipoPuntoMedida, ...(authorizedNif ? { authorizedNif } : {}) }, creds)
  if (coRes.ok) {
    const periodos: PorPeriodo = { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 }
    const mensual = new Map<string, number>()
    let total = 0
    for (const row of pickArray(coRes.data)) {
      const kwh = num(row.consumptionKWh) ?? num(row.consumption) ?? 0
      if (kwh === null) continue
      total += kwh
      const k = periodKey(row.obtainMethod === undefined ? row.period : (row.period ?? row.tariffPeriod))
      if (k) periodos[k] = (periodos[k] ?? 0) + kwh
      const fecha = String(row.date ?? '')        // 'YYYY/MM/DD'
      const ym = fecha.length >= 7 ? fecha.slice(0, 7) : null
      if (ym) mensual.set(ym, (mensual.get(ym) ?? 0) + kwh)
    }
    result.consumo_por_periodo_kwh = {
      p1: Math.round((periodos.p1 ?? 0) * 100) / 100,
      p2: Math.round((periodos.p2 ?? 0) * 100) / 100,
      p3: Math.round((periodos.p3 ?? 0) * 100) / 100,
      p4: Math.round((periodos.p4 ?? 0) * 100) / 100,
      p5: Math.round((periodos.p5 ?? 0) * 100) / 100,
      p6: Math.round((periodos.p6 ?? 0) * 100) / 100,
    }
    result.consumo_total_kwh = Math.round(total * 100) / 100
    result.consumo_mensual = [...mensual.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, kwh]) => ({ mes, consumo_kwh: Math.round(kwh * 100) / 100 }))
  } else {
    result.parcial = true
    avisos.push(`No se pudo leer la curva de consumo: ${coRes.error}`)
  }

  return new Response(JSON.stringify({ ok: true, data: result }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...cors } })
})
