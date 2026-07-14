// ═══════════════════════════════════════════════════════════════════
// Edge Function: datadis-consumos  (worker PESADO — Sprint 0.2)
// ═══════════════════════════════════════════════════════════════════
//
// Trae y PERSISTE, por cada CUPS autorizado (datadis_sincronizado=true):
//   · get-contract-detail → datadis_contratos   (snapshot; delete+insert por CUPS)
//   · get-max-power        → datadis_maximetro   (upsert cups_id,fecha,periodo)
//   · get-consumption-data → datadis_consumptions (curva horaria, upsert cups_id,fecha,hora)
//
// Diseño (auditoría 2026-07-14):
//   C1 · Observabilidad: registra cada run en datadis_runs.
//   C2 · Presupuesto por TIEMPO (max_seconds) y por CUPS (max_cups): se auto-para
//        limpio antes de que el wall-clock lo mate (la idempotencia cubre lo parcial).
//   C3 · DST: hora = hour-1 (0..24); el día de 25 h de octubre entra sin colisión
//        (CHECK relajado a 0..24 en la migración).
//   C4 · Cursor incremental sin tabla nueva: v_datadis_consumos_cursor da la última
//        fecha por CUPS; se prioriza el CUPS con datos más antiguos (backfill converge).
//   C5 · Maxímetro con histórico (lo necesita el optimizador de potencia S2.1) → aquí.
//   C6 · Protegido por x-cron-secret vía RPC de Vault; cron propio desfasado.
//
// prioridad_cups: lista de códigos CUPS que entran primero (decisión comercial).
// dry_run=true por defecto: mide tiempos reales sin escribir.
// ═══════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.100.0'

const BASE = 'https://datadis.es'
const LOGIN = `${BASE}/nikola-auth/tokens/login`
const API = `${BASE}/api-private/api`
const U = Deno.env.get('DATADIS_USERNAME') ?? ''
const P = Deno.env.get('DATADIS_PASSWORD') ?? ''
const SB_URL = Deno.env.get('SUPABASE_URL')!
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── helpers de fecha ────────────────────────────────────────────────
function ymd(d: Date): string { return d.toISOString().slice(0, 10) }              // YYYY-MM-DD
function toDatadis(d: Date): string { return ymd(d).replace(/-/g, '/') }            // YYYY/MM/DD
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x }
function addMonths(d: Date, n: number): Date { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + n); return x }
// Trocea [desde..hasta] en tramos de <=12 meses (minimiza nº de llamadas).
function chunksAnuales(desde: Date, hasta: Date): { start: Date; end: Date }[] {
  const out: { start: Date; end: Date }[] = []
  let s = new Date(desde)
  while (s <= hasta) {
    let e = addMonths(s, 12); e = addDays(e, -1)
    if (e > hasta) e = new Date(hasta)
    out.push({ start: new Date(s), end: new Date(e) })
    s = addDays(e, 1)
  }
  return out
}

async function login(): Promise<string> {
  const r = await fetch(LOGIN, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: U, password: P, origin: 'WEB' }),
  })
  if (!r.ok) throw new Error('login HTTP ' + r.status)
  const t = (await r.text()).trim()
  if (!t.startsWith('eyJ')) throw new Error('login inesperado')
  return t
}

async function getJson(jwt: string, path: string): Promise<{ status: number; body: unknown }> {
  const r = await fetch(`${API}/${path}`, { headers: { Authorization: 'Bearer ' + jwt, Accept: 'application/json' } })
  const txt = await r.text()
  let body: unknown = null
  try { body = JSON.parse(txt) } catch { body = txt }
  return { status: r.status, body }
}

function asArray(body: unknown, key?: string): Record<string, unknown>[] {
  const b = body as Record<string, unknown> | unknown[]
  if (Array.isArray(b)) return b as Record<string, unknown>[]
  const resp = (b as Record<string, unknown>)?.['response']
  if (key && resp && typeof resp === 'object' && (resp as Record<string, unknown>)[key]) {
    const inner = (resp as Record<string, unknown>)[key]
    return Array.isArray(inner) ? inner as Record<string, unknown>[] : []
  }
  if (Array.isArray(resp)) return resp as Record<string, unknown>[]
  return []
}

function n(v: unknown): number | null { const x = Number(v); return Number.isFinite(x) ? x : null }

interface CupsItem {
  cups_id: string; codigo: string; distributorCode: string; pointType: number; nif: string
  desde: Date; hasta: Date; ultima: string | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return j({ ok: false, error: 'Method not allowed' }, 405)

  const sb = createClient(SB_URL, SB_KEY)
  {
    const provided = req.headers.get('x-cron-secret') ?? ''
    const { data: okSecret, error: sErr } = await sb.rpc('check_datadis_cron_secret', { p: provided })
    if (sErr || okSecret !== true) return j({ ok: false, error: 'unauthorized' }, 401)
  }

  // Parámetros (con defaults conservadores; el primer dry-run mide tiempos reales).
  let dryRun = true, maxCups = 12, maxSeconds = 120, meses = 24
  let prioridad: string[] = []
  try {
    const b = await req.json()
    if (b && b.dry_run === false) dryRun = false
    if (b && Number.isFinite(b.max_cups)) maxCups = Math.max(1, Math.min(200, b.max_cups))
    if (b && Number.isFinite(b.max_seconds)) maxSeconds = Math.max(10, Math.min(280, b.max_seconds))
    if (b && Number.isFinite(b.meses_ventana)) meses = Math.max(1, Math.min(36, b.meses_ventana))
    if (b && Array.isArray(b.prioridad_cups)) prioridad = b.prioridad_cups.map((x: string) => (x || '').toUpperCase())
  } catch { /* defaults */ }

  const t0 = Date.now()
  const deadline = () => (Date.now() - t0) > maxSeconds * 1000

  const out: Record<string, unknown> = { dry_run: dryRun, max_cups: maxCups, max_seconds: maxSeconds }
  let runId: string | null = null
  let llamadas = 0, filas = 0, cupsProc = 0
  const errores: { cups: string; etapa: string; error: string }[] = []

  // C1 · abrir run
  try {
    const { data: rr } = await sb.from('datadis_runs')
      .insert({ worker: 'datadis-consumos', dry_run: dryRun }).select('id').single()
    runId = (rr as { id?: string } | null)?.id ?? null
  } catch { /* no bloquea */ }

  try {
    const hoy = new Date()
    const hasta = addDays(hoy, -1)              // Datadis publica con retraso → hasta ayer
    const ventanaMin = addMonths(hoy, -meses)   // tope de la ventana rodante

    // CUPS autorizados con distribuidora y tipo de punto
    const { data: cupsCrm, error: cErr } = await sb
      .from('cups')
      .select('id, codigo_cups, datadis_distributor_code, datadis_point_type, empresas!inner(nif)')
      .eq('datadis_sincronizado', true)
      .is('deleted_at', null)
    if (cErr) throw new Error('leer cups: ' + cErr.message)

    // C4 · cursor: última fecha por CUPS
    const { data: cur } = await sb.from('v_datadis_consumos_cursor').select('cups_id, ultima_fecha')
    const ultimaPorCups = new Map<string, string>()
    for (const c of (cur ?? [])) {
      const row = c as { cups_id: string; ultima_fecha: string | null }
      if (row.ultima_fecha) ultimaPorCups.set(row.cups_id, row.ultima_fecha)
    }

    // Construir worklist con ventana incremental
    const worklist: CupsItem[] = []
    for (const c of (cupsCrm ?? [])) {
      const r = c as unknown as {
        id: string; codigo_cups: string; datadis_distributor_code: string | null
        datadis_point_type: number | null; empresas?: { nif?: string }
      }
      const dist = r.datadis_distributor_code
      const pt = r.datadis_point_type
      const nif = (r.empresas?.nif ?? '').toUpperCase()
      if (!dist || pt == null || !nif) continue // sin datos auxiliares no se puede consultar
      const ultima = ultimaPorCups.get(r.id) ?? null
      // Arranca EN la última fecha guardada (no en la siguiente): re-ingiere ese día
      // completo (idempotente por UNIQUE cups_id,fecha,hora). Evita que un run frenado
      // a mitad deje un día incompleto que el cursor daría por terminado (hueco intradía).
      let desde = ultima ? new Date(ultima + 'T00:00:00Z') : new Date(ventanaMin)
      if (desde < ventanaMin) desde = new Date(ventanaMin) // respeta ventana rodante
      if (desde > hasta) continue // al día
      worklist.push({ cups_id: r.id, codigo: r.codigo_cups, distributorCode: dist, pointType: pt, nif, desde, hasta, ultima })
    }

    // Orden: prioridad primero; luego los de datos más antiguos (o sin datos) primero
    const prio = new Set(prioridad)
    worklist.sort((a, b) => {
      const pa = prio.has(a.codigo.toUpperCase()) ? 0 : 1
      const pb = prio.has(b.codigo.toUpperCase()) ? 0 : 1
      if (pa !== pb) return pa - pb
      const ua = a.ultima ?? '0000-00-00'
      const ub = b.ultima ?? '0000-00-00'
      return ua < ub ? -1 : ua > ub ? 1 : 0
    })

    out.candidatos = worklist.length
    const lote = worklist.slice(0, maxCups)
    const jwt = await login()

    for (const item of lote) {
      if (deadline()) { out.parado_por = 'tiempo'; break }
      cupsProc++
      const authNif = encodeURIComponent(item.nif)
      const dist = encodeURIComponent(item.distributorCode)
      const cupsQ = encodeURIComponent(item.codigo)

      // ── Contrato (snapshot: delete+insert por CUPS) ─────────────────
      try {
        const { status, body } = await getJson(jwt, `get-contract-detail?cups=${cupsQ}&distributorCode=${dist}&authorizedNif=${authNif}`)
        llamadas++
        if (status === 200) {
          const arr = asArray(body)
          const rows = arr.map((r) => {
            const fin = String(r['fechaFin'] ?? r['endDate'] ?? '')
            const potArr = (r['potenciaContratada'] as unknown[]) ?? null
            const pot = (i: number): number | null =>
              potArr && Array.isArray(potArr) ? n(potArr[i]) : n(r[`contractedPowerkWP${i + 1}`])
            return {
              cups_id: item.cups_id,
              tarifa_acceso: (r['tarifaAcceso'] ?? r['tarifaAccesoCode'] ?? r['accessFare'] ?? null) as string | null,
              comercializadora: (r['comercializador'] ?? r['marketer'] ?? null) as string | null,
              distribuidora: (r['distribuidor'] ?? r['distributor'] ?? null) as string | null,
              potencia_p1: pot(0), potencia_p2: pot(1), potencia_p3: pot(2),
              potencia_p4: pot(3), potencia_p5: pot(4), potencia_p6: pot(5),
              fecha_inicio: normFecha(r['fechaInicio'] ?? r['startDate']),
              fecha_fin: fin.startsWith('9999') ? null : normFecha(fin),
              autoconsumo_tipo: (r['tipoAutoconsumo'] ?? r['selfConsumptionType'] ?? null) as string | null,
              provincia: (r['provincia'] ?? r['province'] ?? null) as string | null,
              municipio: (r['municipio'] ?? r['municipality'] ?? null) as string | null,
              datos_raw: r,
              origen: 'datadis',
              updated_at: new Date().toISOString(),
            }
          })
          // dedupe por fecha_inicio (normalizada) para no violar UNIQUE(cups_id,fecha_inicio)
          const vistos = new Set<string>()
          const dedup = rows.filter((x) => { const k = x.fecha_inicio ?? 'null'; if (vistos.has(k)) return false; vistos.add(k); return true })
          if (!dryRun && dedup.length) {
            await sb.from('datadis_contratos').delete().eq('cups_id', item.cups_id)
            const { error } = await sb.from('datadis_contratos').insert(dedup)
            if (error) errores.push({ cups: item.codigo, etapa: 'contrato_insert', error: error.message })
          }
        }
      } catch (e) { errores.push({ cups: item.codigo, etapa: 'contrato', error: (e as Error).message }) }

      if (deadline()) { out.parado_por = 'tiempo'; break }

      // ── Maxímetro (histórico para optimizador de potencia) ──────────
      try {
        const { status, body } = await getJson(jwt, `get-max-power?cups=${cupsQ}&distributorCode=${dist}&startDate=${toDatadis(item.desde)}&endDate=${toDatadis(item.hasta)}&authorizedNif=${authNif}`)
        llamadas++
        if (status === 200) {
          const arr = asArray(body)
          const rows = arr.map((r) => ({
            cups_id: item.cups_id,
            fecha: normFecha(r['fechaMaximo'] ?? r['date']) ?? ymd(item.hasta),
            periodo: Math.max(1, Math.min(6, Number(r['periodo'] ?? r['period'] ?? 1))),
            potencia_kw: n(r['maximoPotenciaDemandada'] ?? r['maxPower']),
            momento: null as string | null,
            origen: 'datadis',
          })).filter((x) => x.potencia_kw != null)
          if (!dryRun && rows.length) {
            const { error } = await sb.from('datadis_maximetro').upsert(rows, { onConflict: 'cups_id,fecha,periodo' })
            if (error) errores.push({ cups: item.codigo, etapa: 'maximetro_upsert', error: error.message })
            else filas += rows.length
          }
        }
      } catch (e) { errores.push({ cups: item.codigo, etapa: 'maximetro', error: (e as Error).message }) }

      // ── Curva de consumo (troceada por año) ─────────────────────────
      for (const tramo of chunksAnuales(item.desde, item.hasta)) {
        if (deadline()) { out.parado_por = 'tiempo'; break }
        try {
          const path = `get-consumption-data?cups=${cupsQ}&distributorCode=${dist}` +
            `&startDate=${toDatadis(tramo.start)}&endDate=${toDatadis(tramo.end)}` +
            `&measurementType=0&pointType=${item.pointType}&authorizedNif=${authNif}`
          const { status, body } = await getJson(jwt, path)
          llamadas++
          if (status !== 200) continue
          const pts = asArray(body, 'timeCurveList')
          const rows: Record<string, unknown>[] = []
          let descartadas = 0; let ejemplo = ''
          for (const p of pts) {
            const hourStr = String(p['hour'] ?? p['time'] ?? '01:00')
            const hora = parseInt(hourStr.split(':')[0], 10) - 1
            const fecha = normFecha(p['date'])
            // R1 (auditoría): la hora fuera de rango se DESCARTA (no se recorta con clamp).
            // Un payload malformado colapsaría dos horas sobre la misma clave del UNIQUE
            // y el upsert sobreescribiría en silencio → corrupción sin rastro. Que haga ruido.
            if (fecha == null || !Number.isFinite(hora) || hora < 0 || hora > 24) {
              descartadas++; if (!ejemplo) ejemplo = `hour="${hourStr}" fecha="${String(p['date'])}"`
              continue
            }
            const met = String(p['metodoObtencion'] ?? p['obtainMethod'] ?? 'Real')
            rows.push({
              cups_id: item.cups_id, fecha, hora,
              consumo_kwh: n(p['measureMagnitudeActive'] ?? p['consumptionKWh']) ?? 0,
              excedente_kwh: n(p['energyPoured'] ?? p['surplusEnergyKWh']) ?? 0,
              metodo_obtencion: (met === 'Real' || met === '1') ? 'real' : 'estimada',
              origen: 'datadis',
            })
          }
          if (descartadas > 0) errores.push({ cups: item.codigo, etapa: 'consumo_hora_invalida', error: `${descartadas} filas descartadas (ej: ${ejemplo})` })
          if (!dryRun && rows.length) {
            for (let i = 0; i < rows.length; i += 1000) {
              const { error } = await sb.from('datadis_consumptions')
                .upsert(rows.slice(i, i + 1000), { onConflict: 'cups_id,fecha,hora' })
              if (error) { errores.push({ cups: item.codigo, etapa: 'consumo_upsert', error: error.message }); break }
            }
          }
          filas += rows.length
        } catch (e) { errores.push({ cups: item.codigo, etapa: 'consumo', error: (e as Error).message }) }
      }
    }

    out.cups_procesados = cupsProc
    out.llamadas = llamadas
    out.filas = filas
    out.errores = errores.length
    out.ok = true
  } catch (e) {
    out.ok = false
    out.error = (e as Error).message
    errores.push({ cups: '-', etapa: 'run', error: (e as Error).message })
  }

  // C1 · cerrar run
  if (runId) {
    try {
      await sb.from('datadis_runs').update({
        finished_at: new Date().toISOString(),
        cups_procesados: cupsProc, llamadas, filas_insertadas: filas,
        errores, resumen: { parado_por: out.parado_por ?? 'fin', candidatos: out.candidatos ?? null },
      }).eq('id', runId)
    } catch { /* no bloquea */ }
  }

  return j(out, 200)
})

function normFecha(v: unknown): string | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  const iso = s.replace(/\//g, '-')
  return /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : null
}

function j(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj, null, 2), { status, headers: { 'Content-Type': 'application/json', ...CORS } })
}
