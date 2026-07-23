// ═══════════════════════════════════════════════════════════════════
// Edge Function: push-lunes  (PR-4.2, semana 4 "CRM ÚTIL")
// ═══════════════════════════════════════════════════════════════════
//
// Informe semanal por email (cron lunes 07:00 UTC): renovaciones CRÍTICAS
// que vencen este mes natural + incidencias Datadis vivas. Va a role IN
// ('master','consultant') aprobados (decisión de Juan 23-jul, corrección
// del auditor: el equipo operativo que gestiona renovaciones —Julia,
// Antonio, administración— está en 'consultant', no 'master'; solo-master
// dejaba fuera a quien tiene que actuar). Patrón x-cron-secret vía Vault,
// igual que datadis-sync / datadis-consumos / esios-price-cache.
//
// FUENTE ÚNICA DE VERDAD (nota del auditor, 23-jul): las cifras del email
// deben cuadrar tanto contra la UI como contra SQL directo por separado —
// UI y email podrían compartir el mismo error de origen si comparten query.
// Por eso la query de "críticas del mes" replica LITERALMENTE la semántica
// de v_renovaciones_kpi (activas = estado NOT IN renovado/perdido) + filtro
// de mes ya usado en PR-2.2 (incluye vencidas de ese mes, no solo futuras).
//
// Cada run deja parte en `audit_log` (action='push_lunes_run', reutilizado:
// no crea tabla nueva) para que el run de las 07:00 no sea invisible.
//
// dry_run=true por defecto (no envía email, solo calcula y devuelve el JSON).
//
// DISEÑO (23-jul): plantilla con la imagen corporativa real de Valere —
// logo tomado tal cual de G:\Mi unidad\AA PRIVADO\LOGO\Logo Valere_72ppp.png
// (confirmado por Juan, sin modificar el diseño, solo redimensionado),
// subido sin alterar bytes (verificado SHA-256) al bucket público
// 'email-assets' de Supabase Storage. Colores = paleta real de la app
// (src/index.css: --color-valere-blue-dark/#284e8f, --color-valere-green-dark
// /#13753c, etc.), NO colores inventados. HTML de tabla + estilos inline
// (sin flexbox/grid) por compatibilidad con Gmail/Outlook.
// ═══════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.100.0'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = Deno.env.get('APP_URL') ?? 'https://valere-v2.pages.dev'
const FROM_ADDRESS = 'Valere CRM <noreply@valereconsultores.com>'

// Logo corporativo real (Logo Valere_72ppp.png, sin modificar), hospedado
// en Storage público para que los clientes de correo puedan cargarlo por URL.
const LOGO_URL = 'https://gtphkowfcuiqbvfkwjxb.supabase.co/storage/v1/object/public/email-assets/logo-valere.png'

// Paleta real de la app (src/index.css @theme) — NO inventar colores.
const BRAND = {
  blueDark: '#284e8f',
  blueMedium: '#2780ba',
  greenDark: '#13753c',
  greenMedium: '#529525',
  paper: '#F8FAFC',
  ink: '#1E293B',
  destructive: '#ef4444',
  border: '#e2e8f0',
  muted: '#64748b',
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } })
}

interface RenovacionCritica {
  empresa_id: string
  empresa_nombre: string
  contrato_id: string
  fecha_vencimiento_contrato: string | null
  estado: string
}

interface IncidenciaResumen {
  tipo: string
  n: number
}

function fmtFecha(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function buildHtml(mesLabel: string, criticas: RenovacionCritica[], incidencias: IncidenciaResumen[]): string {
  const filas = criticas.length
    ? criticas
        .map(
          (r, idx) => `<tr>
            <td style="padding:10px 12px;border-bottom:1px solid ${BRAND.border};background:${idx % 2 === 0 ? '#ffffff' : BRAND.paper};font-size:13px;color:${BRAND.ink};">${r.empresa_nombre}</td>
            <td style="padding:10px 12px;border-bottom:1px solid ${BRAND.border};background:${idx % 2 === 0 ? '#ffffff' : BRAND.paper};font-size:13px;color:${BRAND.ink};white-space:nowrap;">${fmtFecha(r.fecha_vencimiento_contrato)}</td>
            <td style="padding:10px 12px;border-bottom:1px solid ${BRAND.border};background:${idx % 2 === 0 ? '#ffffff' : BRAND.paper};">
              <span style="display:inline-block;padding:2px 8px;border-radius:10px;background:#fef2f2;color:${BRAND.destructive};font-size:11px;font-weight:600;text-transform:capitalize;">${r.estado}</span>
            </td>
          </tr>`,
        )
        .join('')
    : `<tr><td colspan="3" style="padding:16px 12px;color:${BRAND.muted};font-size:13px;">Sin renovaciones críticas este mes.</td></tr>`

  const incidenciasHtml = incidencias.length
    ? incidencias
        .map(
          (i) => `<tr>
            <td style="padding:6px 0;font-size:13px;color:${BRAND.ink};">
              <span style="display:inline-block;min-width:22px;padding:2px 6px;margin-right:8px;border-radius:10px;background:#eff6ff;color:${BRAND.blueDark};font-size:11px;font-weight:700;text-align:center;">${i.n}</span>
              ${i.tipo === 'cups_falta_en_crm' ? 'CUPS autorizado en Datadis que falta en el CRM' : i.tipo === 'cups_no_coincide' ? 'empresa autorizada sin CUPS coincidente' : i.tipo}
            </td>
          </tr>`,
        )
        .join('')
    : `<tr><td style="padding:6px 0;font-size:13px;color:${BRAND.muted};">Sin incidencias Datadis vivas.</td></tr>`

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Informe de los lunes — Valere CRM</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};">

          <!-- Barra de acento con los dos colores de marca -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background:${BRAND.blueDark};">&nbsp;</td>
          </tr>

          <!-- Cabecera: logo real, sin modificar, solo redimensionado -->
          <tr>
            <td style="padding:28px 32px 20px 32px;background:#ffffff;">
              <img src="${LOGO_URL}" width="160" height="63" alt="Valere Consultores" style="display:block;border:0;outline:none;height:63px;width:160px;">
            </td>
          </tr>

          <!-- Título -->
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <h1 style="margin:0 0 4px;font-size:20px;line-height:1.3;color:${BRAND.ink};font-weight:700;">Informe de los lunes</h1>
              <p style="margin:0;font-size:13px;color:${BRAND.blueMedium};font-weight:600;text-transform:capitalize;">${mesLabel}</p>
            </td>
          </tr>

          <!-- Renovaciones críticas -->
          <tr>
            <td style="padding:0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
                <tr>
                  <td style="border-left:3px solid ${BRAND.blueDark};padding-left:10px;">
                    <h2 style="margin:0;font-size:14px;color:${BRAND.blueDark};font-weight:700;">Renovaciones críticas del mes (${criticas.length})</h2>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:12px 0 8px;border:1px solid ${BRAND.border};border-radius:8px;overflow:hidden;">
                <thead>
                  <tr>
                    <th align="left" style="padding:8px 12px;background:${BRAND.paper};font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:${BRAND.muted};font-weight:700;">Empresa</th>
                    <th align="left" style="padding:8px 12px;background:${BRAND.paper};font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:${BRAND.muted};font-weight:700;">Vencimiento</th>
                    <th align="left" style="padding:8px 12px;background:${BRAND.paper};font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:${BRAND.muted};font-weight:700;">Estado</th>
                  </tr>
                </thead>
                <tbody>${filas}</tbody>
              </table>
            </td>
          </tr>

          <!-- Incidencias Datadis -->
          <tr>
            <td style="padding:16px 32px 8px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
                <tr>
                  <td style="border-left:3px solid ${BRAND.greenDark};padding-left:10px;">
                    <h2 style="margin:0;font-size:14px;color:${BRAND.greenDark};font-weight:700;">Incidencias Datadis</h2>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
                ${incidenciasHtml}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:24px 32px 8px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:8px;background:${BRAND.blueDark};">
                    <a href="${APP_URL}/renovaciones?estado=activas" style="display:inline-block;padding:11px 22px;font-size:13px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">Ver renovaciones en el CRM</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px 28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${BRAND.border};padding-top:16px;">
                <tr>
                  <td style="padding-top:16px;font-size:11px;color:${BRAND.muted};line-height:1.5;">
                    Valere Consultores · resumen automático del CRM interno.<br>
                    Este correo se genera todos los lunes a partir de los datos del CRM y de Datadis.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

async function sendResendEmail(to: string[], subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY no configurada' }
  if (to.length === 0) return { ok: false, error: 'sin destinatarios' }
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
    })
    if (!resp.ok) {
      const text = await resp.text()
      return { ok: false, error: `Resend ${resp.status}: ${text}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'fetch error' }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return j({ ok: false, error: 'Method not allowed' }, 405)

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Protección x-cron-secret vía RPC de Vault (mismo patrón que datadis-sync/esios).
  {
    const provided = req.headers.get('x-cron-secret') ?? ''
    const { data: okSecret, error: sErr } = await sb.rpc('check_push_cron_secret', { p: provided })
    if (sErr || okSecret !== true) return j({ ok: false, error: 'unauthorized' }, 401)
  }

  let dryRun = true
  let testTo: string[] | null = null
  try {
    const b = await req.json()
    if (b && b.dry_run === false) dryRun = false
    // Envío de prueba puntual (verificación del auditor antes de activar el
    // cron): si se pasa test_to, ignora la lista de staff y manda SOLO ahí.
    if (b && Array.isArray(b.test_to) && b.test_to.length > 0) {
      testTo = b.test_to.map((x: string) => String(x).trim()).filter(Boolean)
    }
  } catch { /* default dry */ }

  const out: Record<string, unknown> = { dry_run: dryRun }

  try {
    // Renovaciones críticas cuyo contrato vence ESTE MES natural (incluye
    // vencidas del mes en curso, no solo futuras — patrón PR-2.2), activas
    // (estado no renovado/perdido, misma semántica que v_renovaciones_kpi).
    const hoy = new Date()
    const inicioMes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1)).toISOString()
    const finMes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + 1, 1)).toISOString()

    const { data: renData, error: renErr } = await sb
      .from('renovaciones')
      .select('empresa_id, contrato_id, fecha_vencimiento_contrato, estado, prioridad, empresas!inner(nombre)')
      .is('deleted_at', null)
      .not('estado', 'in', '(renovado,perdido)')
      .eq('prioridad', 'critica')
      .gte('fecha_vencimiento_contrato', inicioMes)
      .lt('fecha_vencimiento_contrato', finMes)
      .order('fecha_vencimiento_contrato', { ascending: true })
    if (renErr) throw new Error('leer renovaciones: ' + renErr.message)

    const criticas: RenovacionCritica[] = (renData ?? []).map((r) => {
      const x = r as unknown as {
        empresa_id: string; contrato_id: string; fecha_vencimiento_contrato: string | null
        estado: string; empresas?: { nombre?: string }
      }
      return {
        empresa_id: x.empresa_id,
        empresa_nombre: x.empresas?.nombre ?? '—',
        contrato_id: x.contrato_id,
        fecha_vencimiento_contrato: x.fecha_vencimiento_contrato,
        estado: x.estado,
      }
    })
    out.criticas_del_mes = criticas.length

    // Incidencias Datadis vivas, agrupadas por tipo.
    const { data: incData, error: incErr } = await sb.from('datadis_incidencias').select('tipo')
    if (incErr) throw new Error('leer incidencias: ' + incErr.message)
    const conteo = new Map<string, number>()
    for (const i of (incData ?? []) as { tipo: string }[]) conteo.set(i.tipo, (conteo.get(i.tipo) ?? 0) + 1)
    const incidencias: IncidenciaResumen[] = [...conteo.entries()].map(([tipo, n]) => ({ tipo, n }))
    out.incidencias_vivas = incData?.length ?? 0

    // Destinatarios: equipo operativo (consultant, gestiona renovaciones) +
    // supervisión (master). Decisión Juan 23-jul tras verificación auditor.
    const { data: staffData, error: staffErr } = await sb
      .from('user_profiles')
      .select('email')
      .in('role', ['master', 'consultant'])
      .eq('is_approved', true)
    if (staffErr) throw new Error('leer staff: ' + staffErr.message)
    const staffDestinatarios = [...new Set((staffData ?? []).map((u: { email: string }) => u.email).filter(Boolean))]
    const destinatarios = testTo ?? staffDestinatarios
    out.destinatarios = destinatarios
    out.es_prueba = testTo != null
    if (testTo == null) out.destinatarios_staff_total = staffDestinatarios.length

    const mesLabel = hoy.toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    const asunto = `Informe de los lunes — ${criticas.length} crítica${criticas.length === 1 ? '' : 's'} · ${incData?.length ?? 0} incidencia${(incData?.length ?? 0) === 1 ? '' : 's'} Datadis`

    if (!dryRun) {
      const html = buildHtml(mesLabel, criticas, incidencias)
      const sent = await sendResendEmail(destinatarios, asunto, html)
      out.enviado = sent.ok
      if (!sent.ok) out.error_envio = sent.error
    } else {
      out.enviado = false
      out.nota = 'dry_run: no se ha enviado email'
    }

    out.ok = true
  } catch (e) {
    out.ok = false
    out.error = (e as Error).message
  }

  // Parte del run (reutiliza audit_log; no crea tabla nueva).
  try {
    await sb.from('audit_log').insert({
      actor_email: 'cron@push-lunes',
      action: 'push_lunes_run',
      entity_type: 'cron',
      entity_id: 'push-lunes',
      metadata: out,
    })
  } catch { /* no bloquea */ }

  return j(out, 200)
})
