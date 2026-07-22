// ═══════════════════════════════════════════════════════════════════
// Edge Function: datadis-sync  (worker de sincronización Datadis → CRM)
// ═══════════════════════════════════════════════════════════════════
//
// MODELO (verificado en vivo 2026-07-08 con la cuenta PARTNER de Valere B10759520):
//   - Login con secrets DATADIS_USERNAME/PASSWORD (cuenta PARTNER de Valere).
//   - get-supplies AGREGADO (sin authorizedNif) devuelve "No supplies":
//     Valere no posee CUPS propios → ese modelo NO sirve para un partner.
//   - Modelo correcto = BUCLE POR NIF de cliente:
//       get-supplies?authorizedNif=<NIF empresa>
//         · 200 → CUPS que ese cliente ha autorizado a Valere en Datadis.
//         · 403 "No authorized supplies" / 404 → cliente sin autorización activa (se omite).
//
// EMPAREJAMIENTO CUPS (fix 2026-07-10):
//   - El CUPS tiene 20 caracteres base + a veces 2 de "frontera" (0F, 1P, 0P…).
//   - Emparejamos por los 20 caracteres BASE en ambos lados, para que cuadre
//     tanto si el CRM guarda el corto y Datadis el largo como al revés.
//
// INCIDENCIAS DE DATOS (2026-07-10):
//   El worker escribe en `datadis_incidencias` (refresco total en cada run):
//     · 'cups_falta_en_crm' → Datadis autoriza un CUPS que el CRM no tiene.
//     · 'cups_no_coincide'  → empresa autorizada pero ningún CUPS del CRM cuadra.
//   Autorreparable: al corregir el dato, la incidencia desaparece al siguiente run.
//
// PROTECCIÓN DE OTRAS FASES (regla 2026-07-06, exigida por Juan):
//   - Campos propios de Datadis (datadis_*): se escriben SIEMPRE.
//   - Campos COMPARTIDOS (distribuidor, direccion_suministro, ciudad_suministro):
//     SOLO se rellenan si están VACÍOS. Nunca se sobreescribe dato existente.
//   - NUNCA toca empresa_id, contrato_id, ni ningún vínculo.
//
// dry_run=true por defecto. Para escribir: { dry_run:false }.
// Opcional: { nifs:["G41065566",...] } para limitar a ciertos NIF.
// ═══════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.100.0'

const BASE = 'https://datadis.es'
const LOGIN = `${BASE}/nikola-auth/tokens/login`
const U = Deno.env.get('DATADIS_USERNAME') ?? ''
const P = Deno.env.get('DATADIS_PASSWORD') ?? ''
const SB_URL = Deno.env.get('SUPABASE_URL')!
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface DS {
  cups: string; address?: string; postalCode?: string; province?: string
  municipality?: string; distributor?: string; distributorCode?: string
  pointType?: number; validDateFrom?: string; validDateTo?: string
}

async function login(): Promise<string> {
  const r = await fetch(LOGIN, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: U, password: P, origin: 'WEB' }),
  })
  if (!r.ok) throw new Error('login HTTP ' + r.status)
  const j = (await r.text()).trim()
  if (!j.startsWith('eyJ')) throw new Error('login inesperado')
  return j
}

async function getSuppliesByNif(jwt: string, nif: string): Promise<{ status: number; supplies: DS[] }> {
  const r = await fetch(`${BASE}/api-private/api/get-supplies?authorizedNif=${encodeURIComponent(nif)}`, {
    headers: { Authorization: 'Bearer ' + jwt, Accept: 'application/json' },
  })
  const txt = await r.text()
  let supplies: DS[] = []
  try {
    const b = JSON.parse(txt)
    supplies = (Array.isArray(b) ? b : (b?.response ?? [])) as DS[]
  } catch { /* respuestas de texto tipo "No authorized supplies" */ }
  return { status: r.status, supplies }
}

// Clave de emparejamiento = 20 caracteres base del CUPS (sin frontera).
function base20(c: string): string {
  return (c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)
}

interface CupsRow {
  id: string; codigo: string
  distribuidor: string | null; direccion_suministro: string | null; ciudad_suministro: string | null
}
interface EmpresaGroup {
  empresa_id: string; nombre: string; nif: string
  cupsByBase: Map<string, CupsRow>
}
interface Incidencia {
  empresa_id: string; nif: string; tipo: 'cups_falta_en_crm' | 'cups_no_coincide'
  cups_codigo: string | null; distribuidora: string | null; direccion: string | null
  municipio: string | null; provincia: string | null; detalle: string | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return j({ ok: false, error: 'Method not allowed' }, 405)

  // Protección x-cron-secret vía RPC de Vault (patrón esios/datadis).
  const sb = createClient(SB_URL, SB_KEY)
  {
    const provided = req.headers.get('x-cron-secret') ?? ''
    const { data: okSecret, error: sErr } = await sb.rpc('check_datadis_cron_secret', { p: provided })
    if (sErr || okSecret !== true) return j({ ok: false, error: 'unauthorized' }, 401)
  }

  let dryRun = true
  let nifsFilter: string[] | null = null
  try {
    const b = await req.json()
    if (b && b.dry_run === false) dryRun = false
    if (b && Array.isArray(b.nifs) && b.nifs.length) nifsFilter = b.nifs.map((x: string) => x.toUpperCase().trim())
  } catch { /* default dry */ }

  const out: Record<string, unknown> = { dry_run: dryRun, modelo: 'authorizedNif (partner)' }
  try {
    // Empresas con NIF + sus CUPS en el CRM. Agrupamos por empresa.
    const { data: cupsCrm, error: cErr } = await sb
      .from('cups')
      .select('id, codigo_cups, empresa_id, distribuidor, direccion_suministro, ciudad_suministro, empresas!inner(nombre, nif)')
      .is('deleted_at', null)
    if (cErr) throw new Error('leer cups: ' + cErr.message)

    const groups = new Map<string, EmpresaGroup>() // key = empresa_id
    for (const c of (cupsCrm ?? [])) {
      const r = c as unknown as {
        id: string; codigo_cups: string; empresa_id: string
        distribuidor: string | null; direccion_suministro: string | null; ciudad_suministro: string | null
        empresas?: { nombre?: string; nif?: string }
      }
      const nif = (r.empresas?.nif ?? '').toUpperCase().trim()
      if (!nif) continue
      if (nifsFilter && !nifsFilter.includes(nif)) continue
      let g = groups.get(r.empresa_id)
      if (!g) {
        g = { empresa_id: r.empresa_id, nombre: r.empresas?.nombre ?? r.empresa_id, nif, cupsByBase: new Map() }
        groups.set(r.empresa_id, g)
      }
      g.cupsByBase.set(base20(r.codigo_cups), {
        id: r.id, codigo: r.codigo_cups, distribuidor: r.distribuidor,
        direccion_suministro: r.direccion_suministro, ciudad_suministro: r.ciudad_suministro,
      })
    }

    // Deduplicar por NIF (una llamada por NIF).
    const nifToGroups = new Map<string, EmpresaGroup[]>()
    for (const g of groups.values()) {
      const arr = nifToGroups.get(g.nif) ?? []
      arr.push(g)
      nifToGroups.set(g.nif, arr)
    }
    out.empresas_con_cups = groups.size
    out.nifs_a_consultar = nifToGroups.size

    const jwt = await login()
    out.cuenta = U

    const autorizados: Record<string, number> = {}
    const sinAutorizacion: string[] = []
    let actualizados = 0
    let camposComercialesProtegidos = 0
    const incidencias: Incidencia[] = []
    const processedEmpresaIds = new Set<string>()

    const nifList = [...nifToGroups.keys()]
    const BATCH = 4
    for (let i = 0; i < nifList.length; i += BATCH) {
      const slice = nifList.slice(i, i + BATCH)
      await Promise.all(slice.map(async (nif) => {
        const gs = nifToGroups.get(nif)!
        for (const g of gs) processedEmpresaIds.add(g.empresa_id)
        const empresaIdRef = gs[0].empresa_id
        const nombreRef = gs[0].nombre
        const totalCrmCups = gs.reduce((n, g) => n + g.cupsByBase.size, 0)

        let res: { status: number; supplies: DS[] }
        try { res = await getSuppliesByNif(jwt, nif) }
        catch (e) { sinAutorizacion.push(`${nombreRef} (${nif}): err ${(e as Error).message}`); return }

        if (res.status !== 200 || res.supplies.length === 0) {
          sinAutorizacion.push(`${nombreRef} (${nif}): http ${res.status}`)
          return
        }

        // Índice CRM por base20 (unión de todas las empresas con ese NIF).
        const baseToRow = new Map<string, { row: CupsRow; nombre: string }>()
        for (const g of gs) for (const [b, row] of g.cupsByBase) baseToRow.set(b, { row, nombre: g.nombre })

        let matchedNif = 0
        for (const s of res.supplies) {
          const key = base20(s.cups)
          const found = baseToRow.get(key)
          if (found) {
            matchedNif++
            autorizados[found.nombre] = (autorizados[found.nombre] ?? 0) + 1
            if (!dryRun) {
              const patch: Record<string, unknown> = {
                datadis_distributor_code: s.distributorCode ?? null,
                datadis_distribuidor_cod: s.distributorCode ?? null,
                datadis_point_type: s.pointType ?? null,
                datadis_punto_tipo: s.pointType ?? null,
                datadis_sincronizado: true,
                datadis_ultima_sync: new Date().toISOString(),
                datadis_ultimo_fetch: new Date().toISOString(),
              }
              if (!found.row.distribuidor && s.distributor) patch.distribuidor = s.distributor
              else if (found.row.distribuidor && s.distributor && found.row.distribuidor !== s.distributor) camposComercialesProtegidos++
              if (!found.row.direccion_suministro && s.address) patch.direccion_suministro = s.address
              if (!found.row.ciudad_suministro && s.municipality) patch.ciudad_suministro = s.municipality

              const { error: uErr } = await sb.from('cups').update(patch).eq('id', found.row.id)
              if (!uErr) actualizados++
            }
          } else {
            // CUPS que Datadis autoriza y el CRM no tiene → incidencia para alta.
            incidencias.push({
              empresa_id: empresaIdRef, nif, tipo: 'cups_falta_en_crm',
              cups_codigo: s.cups ?? null, distribuidora: s.distributor ?? null,
              direccion: s.address ?? null, municipio: s.municipality ?? null, provincia: s.province ?? null,
              detalle: 'Datadis autoriza este CUPS pero no existe en el CRM. Darlo de alta.',
            })
          }
        }

        // Empresa autorizada pero ningún CUPS del CRM cuadra → CUPS mal cargado.
        if (matchedNif === 0 && totalCrmCups > 0) {
          const codigosCrm: string[] = []
          for (const g of gs) for (const row of g.cupsByBase.values()) codigosCrm.push(row.codigo)
          incidencias.push({
            empresa_id: empresaIdRef, nif, tipo: 'cups_no_coincide',
            cups_codigo: codigosCrm[0] ?? null, distribuidora: null, direccion: null, municipio: null, provincia: null,
            detalle: `Empresa autorizada en Datadis pero ningún CUPS del CRM coincide. Revisar CUPS en el CRM: ${codigosCrm.join(', ')}`,
          })
        }
      }))
    }

    // Refrescar incidencias de las empresas procesadas (borra y reinserta → autorreparable).
    if (!dryRun && processedEmpresaIds.size > 0) {
      const ids = [...processedEmpresaIds]
      const CHUNK = 200
      for (let i = 0; i < ids.length; i += CHUNK) {
        await sb.from('datadis_incidencias').delete().in('empresa_id', ids.slice(i, i + CHUNK))
      }
      if (incidencias.length > 0) {
        await sb.from('datadis_incidencias').insert(incidencias)
      }

      // S0.2-bis: barrido de zombis — las incidencias de empresas que YA NO están en el
      // conjunto procesado (fusión, soft-delete, autorización revocada) no se borraban
      // nunca (el refresco solo tocaba empresas procesadas). Se purgan aquí.
      const { data: vivas } = await sb.from('datadis_incidencias').select('empresa_id')
      const zombis = [...new Set((vivas ?? []).map((r: { empresa_id: string }) => r.empresa_id))]
        .filter((id) => !processedEmpresaIds.has(id))
      if (zombis.length > 0) {
        for (let i = 0; i < zombis.length; i += CHUNK) {
          await sb.from('datadis_incidencias').delete().in('empresa_id', zombis.slice(i, i + CHUNK))
        }
      }
      out.incidencias_zombis_purgadas = zombis.length
    }

    out.autorizados_por_empresa = autorizados
    out.sin_autorizacion = sinAutorizacion
    out.incidencias = incidencias.length
    out.incidencias_detalle = incidencias
    out.actualizados = dryRun ? '(dry-run, 0)' : actualizados
    out.campos_comerciales_protegidos = camposComercialesProtegidos
  } catch (e) {
    out.ok = false
    out.error = (e as Error).message
    return j(out, 200)
  }
  out.ok = true
  return j(out, 200)
})

function j(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj, null, 2), { status, headers: { 'Content-Type': 'application/json', ...CORS } })
}
