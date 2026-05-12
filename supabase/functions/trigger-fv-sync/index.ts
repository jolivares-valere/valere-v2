/**
 * trigger-fv-sync — Edge Function
 *
 * Dispara el workflow de GitHub Actions "fv-sync.yml" via API REST.
 * Solo accesible para usuarios con role master o admin.
 *
 * POST /functions/v1/trigger-fv-sync
 * Body (JSON, todos opcionales):
 *   { credencial_id?: string, empresa_id?: string, dry_run?: boolean }
 *
 * Responde:
 *   200 { ok: true, workflow_run_url: string }
 *   403 si el usuario no es master/admin
 *   500 si falla el dispatch a GitHub
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GITHUB_REPO  = "jolivares-valere/valere-v2";
const WORKFLOW_ID  = "fv-sync.yml";
const GITHUB_BRANCH = "main";           // rama que lee el workflow

Deno.serve(async (req: Request) => {
  // ── CORS preflight ─────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  // ── Autenticación: verificar que el llamante es master/admin ────
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  // Crear cliente con el JWT del usuario para respetar RLS
  const sbUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await sbUser.auth.getUser();

  if (authErr || !user) {
    return json({ error: "No autenticado" }, 401);
  }

  // Verificar rol con service_role (bypassa RLS)
  const sbAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: profile } = await sbAdmin
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["master", "admin"].includes(profile.role ?? "")) {
    return json({ error: "Sin permisos — solo master/admin puede lanzar sincronizaciones" }, 403);
  }

  // ── Leer parámetros del body ────────────────────────────────────
  let body: { credencial_id?: string; empresa_id?: string; dry_run?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // Body vacío → sync de todas las credenciales
  }

  // ── Disparar workflow via GitHub API ───────────────────────────
  const githubPat = Deno.env.get("GITHUB_PAT");
  if (!githubPat) {
    return json({ error: "GITHUB_PAT no configurado en los secrets de la Edge Function" }, 500);
  }

  // Construir inputs para el workflow
  const inputs: Record<string, string> = {};
  if (body.credencial_id) inputs.credencial_id = body.credencial_id;
  if (body.empresa_id)    inputs.empresa_id    = body.empresa_id;
  if (body.dry_run)       inputs.dry_run       = "true";

  const dispatchUrl = `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_ID}/dispatches`;
  const ghRes = await fetch(dispatchUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${githubPat}`,
      Accept:        "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "valere-crm/1.0",
    },
    body: JSON.stringify({ ref: GITHUB_BRANCH, inputs }),
  });

  if (!ghRes.ok) {
    const ghErr = await ghRes.text();
    console.error("GitHub dispatch error:", ghRes.status, ghErr);
    return json({
      error: `GitHub dispatch falló (${ghRes.status})`,
      detail: ghErr.slice(0, 300),
    }, 500);
  }

  // GitHub devuelve 204 No Content en éxito — el run tardará ~1 min en aparecer
  const runsUrl = `https://github.com/${GITHUB_REPO}/actions/workflows/${WORKFLOW_ID}`;

  // Registrar en fv_sync_log que se solicitó un sync manual
  await sbAdmin.from("fv_sync_log").insert({
    credenciales_ok:    0,
    credenciales_total: 0,
    plantas_sync:       0,
    alarmas_sync:       0,
    alarmas_detectadas: 0,
    ok:                 true,
    resultado:          "dispatched",
    iniciado_en:        new Date().toISOString(),
    // Guardar quién y qué credencial se pidió sincronizar
    // (columnas opcionales — ignoradas si no existen)
  }).maybeSingle();

  return json({
    ok: true,
    message: `Sync lanzado${body.credencial_id ? ` para credencial ${body.credencial_id}` : " para todas las credenciales"}. Tardará ~1–2 minutos.`,
    workflow_run_url: runsUrl,
  });
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
