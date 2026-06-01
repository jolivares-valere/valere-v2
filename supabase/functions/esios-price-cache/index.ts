// ═══════════════════════════════════════════════════════════════════
// Edge Function: esios-price-cache
// ═══════════════════════════════════════════════════════════════════
//
// Cron job que cachea precios horarios de la API de ESIOS (REE)
// en la tabla `precios_pool_horarios` de Supabase.
//
// Schedule: 30 20 * * *  (UTC = 21:30 CET / 22:30 CEST)
//   → OMIE publica el precio D+1 a ~14:00 CET. A las 21:30 UTC
//     ya están disponibles los precios del día siguiente.
//
// Indicadores que se descargan:
//   600   → Precio spot mercado diario OMIE (€/MWh)
//   1001  → PVPC término energía 2.0TD (€/kWh)
//   10211 → PVPC precio total 2.0TD (€/kWh)
//   1739  → Compensación excedentes FV simplificada (€/kWh)
//   10349 → Factor de emisiones CO₂ del sistema (gCO₂/kWh)
//
// Variables de entorno necesarias (Supabase secrets):
//   ESIOS_API_KEY              — token personal ESIOS
//   SUPABASE_URL               — auto
//   SUPABASE_SERVICE_ROLE_KEY  — auto
//
// Invocación manual (backfill):
//   POST /functions/v1/esios-price-cache
//   Authorization: Bearer {service_role_key}
//   { "start_date": "2024-01-01", "end_date": "2024-12-31" }
//
// Invocación automática (cron): sin body — usa ventana de 3 días
// ═══════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.100.0'

// ── Configuración ──────────────────────────────────────────────────

const ESIOS_API_KEY = Deno.env.get('ESIOS_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ESIOS_BASE = 'https://api.esios.ree.es'

// Indicadores a descargar: [id, nombre_legible, unidad]
const INDICATORS: Array<{ id: number; nom: string; unidad: string }> = [
  { id: 600,   nom: 'Precio mercado spot diario (OMIE)',      unidad: 'EUR_MWh'   },
  { id: 1001,  nom: 'PVPC — término energía 2.0TD',           unidad: 'EUR_kWh'   },
  { id: 10211, nom: 'PVPC — precio total 2.0TD',              unidad: 'EUR_kWh'   },
  { id: 1739,  nom: 'Compensación excedentes FV',             unidad: 'EUR_kWh'   },
  { id: 10349, nom: 'Factor emisiones CO₂ del sistema',       unidad: 'gCO2_kWh'  },
]

const GEO_ID = 3  // Península Ibérica

// ── Tipos ──────────────────────────────────────────────────────────

interface EsiosValue {
  value: number
  datetime_utc: string
  geo_id: number
  geo_name: string
}

interface EsiosResponse {
  indicator: {
    id: number
    name: string
    values: EsiosValue[]
  }
}

interface PrecioRow {
  hora_utc: string
  indicador_id: number
  indicador_nom: string
  valor: number
  unidad: string
  geo_id: number
  fuente: string
}

// ── Helpers ────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().replace(/\.\d+Z$/, 'Z')
}

async function fetchIndicator(
  indicatorId: number,
  startDate: string,
  endDate: string,
): Promise<EsiosValue[]> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    time_trunc: 'hour',
    time_agg: 'average',
    geo_ids: String(GEO_ID),
  })

  const url = `${ESIOS_BASE}/indicators/${indicatorId}?${params}`

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json; application/vnd.esios-api-v1+json',
      'Content-Type': 'application/json',
      'x-api-key': ESIOS_API_KEY!,
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`ESIOS ${indicatorId}: HTTP ${res.status} — ${body.slice(0, 200)}`)
  }

  const data: EsiosResponse = await res.json()
  // Filtrar solo geo_id = 3 (Península) si vienen varios geos
  return (data.indicator?.values ?? []).filter(v => v.geo_id === GEO_ID)
}

// ── Handler principal ──────────────────────────────────────────────

serve(async (req) => {
  // Solo aceptar llamadas autenticadas con service_role o cron interno
  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  if (!ESIOS_API_KEY) {
    console.error('[esios-price-cache] ESIOS_API_KEY no configurado')
    return new Response(JSON.stringify({ error: 'ESIOS_API_KEY not configured' }), { status: 500 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // Determinar rango de fechas
  let startDate: string
  let endDate: string

  if (req.method === 'POST') {
    let body: { start_date?: string; end_date?: string } = {}
    try { body = await req.json() } catch { /* body vacío = cron automático */ }

    if (body.start_date && body.end_date) {
      // Backfill manual: rango explícito
      startDate = `${body.start_date}T00:00:00Z`
      endDate   = `${body.end_date}T23:59:59Z`
    } else {
      // Cron automático: ventana de 3 días (ayer, hoy, mañana)
      const ayer = new Date(Date.now() - 86_400_000)
      const manana = new Date(Date.now() + 86_400_000)
      ayer.setUTCHours(0, 0, 0, 0)
      manana.setUTCHours(23, 59, 59, 0)
      startDate = isoDate(ayer)
      endDate   = isoDate(manana)
    }
  } else if (req.method === 'GET') {
    // GET de salud / cron sin body
    const ayer = new Date(Date.now() - 86_400_000)
    const manana = new Date(Date.now() + 86_400_000)
    ayer.setUTCHours(0, 0, 0, 0)
    manana.setUTCHours(23, 59, 59, 0)
    startDate = isoDate(ayer)
    endDate   = isoDate(manana)
  } else {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  console.log(`[esios-price-cache] Descargando ${startDate} → ${endDate}`)

  const resultado: Record<string, { filas: number; error?: string }> = {}
  let totalInserted = 0

  for (const ind of INDICATORS) {
    try {
      const values = await fetchIndicator(ind.id, startDate, endDate)

      if (values.length === 0) {
        resultado[ind.nom] = { filas: 0 }
        continue
      }

      const rows: PrecioRow[] = values.map(v => ({
        hora_utc:      v.datetime_utc,
        indicador_id:  ind.id,
        indicador_nom: ind.nom,
        valor:         v.value,
        unidad:        ind.unidad,
        geo_id:        GEO_ID,
        fuente:        'esios',
      }))

      // Upsert en lotes de 500 para no superar el límite de payload
      const BATCH = 500
      let inserted = 0
      for (let i = 0; i < rows.length; i += BATCH) {
        const lote = rows.slice(i, i + BATCH)
        const { error } = await supabase
          .from('precios_pool_horarios')
          .upsert(lote, { onConflict: 'hora_utc,indicador_id,geo_id', ignoreDuplicates: false })

        if (error) throw new Error(error.message)
        inserted += lote.length
      }

      resultado[ind.nom] = { filas: inserted }
      totalInserted += inserted
      console.log(`[esios-price-cache] ${ind.nom} (${ind.id}): ${inserted} filas`)

    } catch (err) {
      const msg = (err as Error).message
      console.error(`[esios-price-cache] ERROR ${ind.nom} (${ind.id}):`, msg)
      resultado[ind.nom] = { filas: 0, error: msg }
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      rango: { start_date: startDate, end_date: endDate },
      total_filas: totalInserted,
      detalle: resultado,
      ejecutado_en: new Date().toISOString(),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
