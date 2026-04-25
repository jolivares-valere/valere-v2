# ─────────────────────────────────────────────────────────────────────────────
# scripts/inventario_apps_satelite.ps1
#
# Extrae inventario detallado de las apps satélite Valere para preparar
# la migración Fase 4 (apps satélite → CRM canónico) sin sorpresas.
#
# Output:
#   - $HOME\valere-backups\inventario-apps-satelite-<YYYYMMDD-HHMM>.md
#     (rellena docs/INVENTARIO_APPS_SATELITE_TEMPLATE.md con datos reales)
#   - $HOME\valere-backups\inventario-apps-satelite-<YYYYMMDD-HHMM>-raw.json
#     (datos crudos por si quieres post-procesar)
#
# Cómo usar:
#   1. Edita la sección CONFIG si las rutas locales de los repos no son las por
#      defecto ($HOME\<repo>).
#   2. Ejecuta:  powershell -ExecutionPolicy Bypass -File scripts\inventario_apps_satelite.ps1
#   3. Sube el .md generado al repo (commit) o pégaselo a Cowork en el chat.
#
# Por qué este script:
#   El sandbox Cowork SOLO ve valere-v2 (ningún otro repo está mounted).
#   Sin esta foto, el plan Fase 4 navega a ciegas. Con ella, Cowork puede:
#     · saber qué tablas tocar con compat views,
#     · saber qué env vars cambiar (URL + ANON_KEY → CRM),
#     · saber si la app expone GEMINI_API_KEY en bundle frontend (riesgo),
#     · estimar el esfuerzo real del refactor por app.
# ─────────────────────────────────────────────────────────────────────────────

# ════════════════════════════════════════════════════════════════════════════
# CONFIG — edita si tus repos no están en $HOME
# ════════════════════════════════════════════════════════════════════════════

$Apps = @(
  @{ Name = "valere-gestion-potencias";  Path = "$HOME\valere-gestion-potencias" },
  @{ Name = "valere-excedentes";         Path = "$HOME\valere-excedentes" },
  @{ Name = "valere-gestion-energetica"; Path = "$HOME\valere-gestion-energetica" }
)

# Carpeta donde guardar el output (se crea si no existe)
$OutDir = "$HOME\valere-backups"
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

$Stamp = Get-Date -Format "yyyyMMdd-HHmm"
$MdOut   = Join-Path $OutDir "inventario-apps-satelite-$Stamp.md"
$JsonOut = Join-Path $OutDir "inventario-apps-satelite-$Stamp-raw.json"

# Patrones a buscar
$PatTables   = "from\(['""]([a-zA-Z0-9_]+)['""]\)|\.table\(['""]([a-zA-Z0-9_]+)['""]\)"
$PatEnvVite  = "import\.meta\.env\.(VITE_[A-Z0-9_]+)"
$PatEnvProc  = "process\.env\.([A-Z0-9_]+)|Deno\.env\.get\(['""]([A-Z0-9_]+)['""]\)"
$PatGemini   = "GEMINI|GoogleGenerativeAI|@google/genai|generativelanguage"
$PatSupaUrl  = "https://[a-z0-9]+\.supabase\.co"

# Extensiones a escanear
$Ext = @("*.ts","*.tsx","*.js","*.jsx","*.mjs","*.cjs","*.env","*.env.*","*.yml","*.yaml","*.toml","*.json")

# Carpetas a ignorar
$Skip = @("node_modules",".git","dist","build",".next",".vercel",".turbo","coverage")

# ════════════════════════════════════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════════════════════════════════════

function Get-RepoFiles {
  param([string]$Path)
  Get-ChildItem -Path $Path -Recurse -File -Include $Ext -ErrorAction SilentlyContinue |
    Where-Object {
      $rel = $_.FullName.Substring($Path.Length).TrimStart('\','/')
      -not ($Skip | Where-Object { $rel -like "$_*" -or $rel -like "*\$_\*" })
    }
}

function Find-Matches {
  param($Files, [string]$Pattern, [switch]$SimpleMatch)
  $params = @{ Pattern = $Pattern }
  if ($SimpleMatch) { $params['SimpleMatch'] = $true }
  $Files | Select-String @params -ErrorAction SilentlyContinue |
    Select-Object @{n='File';e={$_.Path}}, @{n='Line';e={$_.LineNumber}}, @{n='Text';e={$_.Line.Trim()}}
}

function Get-PackageJsonDeps {
  param([string]$Path)
  $pkg = Join-Path $Path "package.json"
  if (-not (Test-Path $pkg)) { return $null }
  try {
    $json = Get-Content $pkg -Raw | ConvertFrom-Json
    $deps = @{}
    if ($json.dependencies)    { $json.dependencies.PSObject.Properties    | ForEach-Object { $deps[$_.Name] = $_.Value } }
    if ($json.devDependencies) { $json.devDependencies.PSObject.Properties | ForEach-Object { $deps[$_.Name] = "(dev) $($_.Value)" } }
    return $deps
  } catch { return $null }
}

function Get-EnvFiles {
  param([string]$Path)
  Get-ChildItem -Path $Path -File -Filter ".env*" -ErrorAction SilentlyContinue |
    ForEach-Object {
      @{
        File = $_.Name
        Vars = (Get-Content $_.FullName -ErrorAction SilentlyContinue) |
          Where-Object { $_ -match '^[A-Z_][A-Z0-9_]*\s*=' } |
          ForEach-Object { ($_ -split '=',2)[0].Trim() } |
          Sort-Object -Unique
      }
    }
}

# ════════════════════════════════════════════════════════════════════════════
# RECOLECCIÓN
# ════════════════════════════════════════════════════════════════════════════

$Report = @()

foreach ($app in $Apps) {
  Write-Host "=== Inspeccionando $($app.Name) ===" -ForegroundColor Cyan

  $entry = @{
    App        = $app.Name
    Path       = $app.Path
    Exists     = (Test-Path $app.Path)
    GitRemote  = $null
    GitBranch  = $null
    LastCommit = $null
    Tables     = @()
    EnvVars    = @{ Vite = @(); Server = @(); Files = @() }
    Gemini     = @()
    SupaUrls   = @()
    Deps       = @{
      Supabase  = $null
      Gemini    = $null
      React     = $null
      Vite      = $null
      Express   = $null
      All       = @{}
    }
    Files      = @()
  }

  if (-not $entry.Exists) {
    Write-Host "  [WARN] No existe: $($app.Path)" -ForegroundColor Yellow
    $Report += $entry
    continue
  }

  Push-Location $app.Path
  try {
    $entry.GitRemote  = (git config --get remote.origin.url 2>$null)
    $entry.GitBranch  = (git rev-parse --abbrev-ref HEAD 2>$null)
    $entry.LastCommit = (git log -1 --format="%h %cd %s" --date=short 2>$null)
  } catch {}
  Pop-Location

  $files = @(Get-RepoFiles -Path $app.Path)
  $entry.Files = @($files | ForEach-Object { $_.FullName.Substring($app.Path.Length).TrimStart('\','/') })
  Write-Host "  Files escaneados: $($files.Count)" -ForegroundColor Gray

  # Tablas Supabase (.from('xxx') / .table('xxx'))
  $tableHits = Find-Matches -Files $files -Pattern $PatTables
  $tableNames = @($tableHits | ForEach-Object {
      if ($_.Text -match $PatTables) { if ($matches[1]) { $matches[1] } elseif ($matches[2]) { $matches[2] } }
    } | Where-Object { $_ } | Sort-Object -Unique)
  $entry.Tables = $tableNames

  # Env vars Vite (frontend, peligrosas)
  $viteHits = Find-Matches -Files $files -Pattern $PatEnvVite
  $entry.EnvVars.Vite = @($viteHits | ForEach-Object {
      if ($_.Text -match $PatEnvVite) { $matches[1] }
    } | Where-Object { $_ } | Sort-Object -Unique)

  # Env vars server (process.env / Deno.env)
  $serverHits = Find-Matches -Files $files -Pattern $PatEnvProc
  $entry.EnvVars.Server = @($serverHits | ForEach-Object {
      if ($_.Text -match $PatEnvProc) { if ($matches[1]) { $matches[1] } elseif ($matches[2]) { $matches[2] } }
    } | Where-Object { $_ } | Sort-Object -Unique)

  # Archivos .env existentes
  $entry.EnvVars.Files = @(Get-EnvFiles -Path $app.Path)

  # Gemini usage (con contexto: file + line)
  $entry.Gemini = @(Find-Matches -Files $files -Pattern $PatGemini -SimpleMatch | ForEach-Object {
      @{ File = $_.File.Substring($app.Path.Length).TrimStart('\','/'); Line = $_.Line; Text = $_.Text }
  })

  # URLs Supabase hardcoded
  $entry.SupaUrls = @(Find-Matches -Files $files -Pattern $PatSupaUrl | ForEach-Object {
      if ($_.Text -match $PatSupaUrl) { $matches[0] }
    } | Where-Object { $_ } | Sort-Object -Unique)

  # Dependencias clave
  $deps = Get-PackageJsonDeps -Path $app.Path
  if ($deps) {
    $entry.Deps.All      = $deps
    $entry.Deps.Supabase = $deps['@supabase/supabase-js']
    $entry.Deps.Gemini   = if ($deps['@google/genai']) { $deps['@google/genai'] } else { $deps['@google/generative-ai'] }
    $entry.Deps.React    = $deps['react']
    $entry.Deps.Vite     = if ($deps['vite']) { $deps['vite'] } else { $deps['(dev) vite'] }
    $entry.Deps.Express  = $deps['express']
  }

  $Report += $entry
}

# ════════════════════════════════════════════════════════════════════════════
# OUTPUT — JSON crudo
# ════════════════════════════════════════════════════════════════════════════

$Report | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 $JsonOut
Write-Host ""
Write-Host "Datos crudos: $JsonOut" -ForegroundColor Green

# ════════════════════════════════════════════════════════════════════════════
# OUTPUT — Markdown legible (formato del template)
# ════════════════════════════════════════════════════════════════════════════

$md = New-Object System.Text.StringBuilder
[void]$md.AppendLine("# Inventario apps satélite — $Stamp")
[void]$md.AppendLine("")
[void]$md.AppendLine("> Generado por ``scripts/inventario_apps_satelite.ps1`` desde el ordenador de Juan.")
[void]$md.AppendLine("> Rellena la plantilla ``docs/INVENTARIO_APPS_SATELITE_TEMPLATE.md``.")
[void]$md.AppendLine("> Sustituye el archivo en ``docs/`` o pásaselo a Cowork como input para Fase 4.")
[void]$md.AppendLine("")

foreach ($e in $Report) {
  [void]$md.AppendLine("## $($e.App)")
  [void]$md.AppendLine("")
  if (-not $e.Exists) {
    [void]$md.AppendLine("**[WARN] Repo no encontrado en ``$($e.Path)``.**")
    [void]$md.AppendLine("")
    [void]$md.AppendLine("Acción: ajusta la sección CONFIG del script con la ruta correcta y vuelve a ejecutar.")
    [void]$md.AppendLine("")
    continue
  }

  [void]$md.AppendLine("- **Ruta local**: ``$($e.Path)``")
  [void]$md.AppendLine("- **Git remote**: $($e.GitRemote)")
  [void]$md.AppendLine("- **Git branch**: $($e.GitBranch)")
  [void]$md.AppendLine("- **Último commit**: $($e.LastCommit)")
  [void]$md.AppendLine("- **Archivos escaneados**: $($e.Files.Count)")
  [void]$md.AppendLine("")

  # Dependencias clave
  [void]$md.AppendLine("### Dependencias clave")
  [void]$md.AppendLine("")
  [void]$md.AppendLine("| Paquete | Versión |")
  [void]$md.AppendLine("|---|---|")
  [void]$md.AppendLine("| @supabase/supabase-js | $($e.Deps.Supabase) |")
  [void]$md.AppendLine("| @google/genai (o ...generative-ai) | $($e.Deps.Gemini) |")
  [void]$md.AppendLine("| react | $($e.Deps.React) |")
  [void]$md.AppendLine("| vite | $($e.Deps.Vite) |")
  [void]$md.AppendLine("| express | $($e.Deps.Express) |")
  [void]$md.AppendLine("")

  # Env vars Vite (riesgo)
  [void]$md.AppendLine("### Env vars expuestas en bundle (VITE_*) — riesgo si contienen secretos")
  [void]$md.AppendLine("")
  if ($e.EnvVars.Vite.Count -eq 0) {
    [void]$md.AppendLine("_Ninguna._")
  } else {
    foreach ($v in $e.EnvVars.Vite) { [void]$md.AppendLine("- ``$v``") }
  }
  [void]$md.AppendLine("")

  # Env vars server
  [void]$md.AppendLine("### Env vars server-side (process.env / Deno.env)")
  [void]$md.AppendLine("")
  if ($e.EnvVars.Server.Count -eq 0) {
    [void]$md.AppendLine("_Ninguna._")
  } else {
    foreach ($v in $e.EnvVars.Server) { [void]$md.AppendLine("- ``$v``") }
  }
  [void]$md.AppendLine("")

  # Archivos .env locales
  [void]$md.AppendLine("### Archivos .env locales")
  [void]$md.AppendLine("")
  if ($e.EnvVars.Files.Count -eq 0) {
    [void]$md.AppendLine("_Ninguno._")
  } else {
    foreach ($f in $e.EnvVars.Files) {
      [void]$md.AppendLine("- ``$($f.File)`` → vars: $((@($f.Vars) -join ', '))")
    }
  }
  [void]$md.AppendLine("")

  # Tablas Supabase
  [void]$md.AppendLine("### Tablas Supabase usadas (vía ``.from()`` / ``.table()``)")
  [void]$md.AppendLine("")
  if ($e.Tables.Count -eq 0) {
    [void]$md.AppendLine("_Ninguna detectada (puede que la app use raw SQL, RPC, o no use Supabase)._")
  } else {
    [void]$md.AppendLine("| Tabla | Equivalente CRM (canónico) | Acción Fase 4 |")
    [void]$md.AppendLine("|---|---|---|")
    foreach ($t in $e.Tables) {
      $canon = switch ($t) {
        'clients'                { 'empresas' }
        'supplies'               { 'cups' }
        'profiles'               { 'user_profiles' }
        'comercializadoras'      { 'comercializadoras' }
        'retailers'              { 'comercializadoras' }
        'retailer_offers'        { 'comercializadora_ofertas' }
        'regulated_rates'        { 'precios_regulados_boe' }
        'boe_regulated_prices'   { 'precios_regulados_boe' }
        'expedientes'            { 'expedientes' }
        'ciclos'                 { 'ciclos' }
        'power_requests'         { 'solicitudes_potencia' }
        'savings_calculations'   { 'savings_calculations' }
        'client_communications'  { 'comunicaciones_cliente' }
        'client_documents'       { 'documentos (entidad_tipo=empresa)' }
        'expediente_documents'   { 'documentos (entidad_tipo=expediente)' }
        'documentacion'          { 'documentos (entidad_tipo=general)' }
        'alerts'                 { 'alertas' }
        'comercializadora_docs'  { 'comercializadora_docs' }
        'email_templates'        { 'email_templates' }
        'excel_import_templates' { 'excel_import_templates' }
        'status_log'             { 'status_log' }
        default                  { '_revisar manualmente_' }
      }
      [void]$md.AppendLine("| ``$t`` | ``$canon`` | _rellena: compat view / refactor / no aplica_ |")
    }
  }
  [void]$md.AppendLine("")

  # URLs Supabase
  [void]$md.AppendLine("### URLs Supabase encontradas (hardcoded)")
  [void]$md.AppendLine("")
  if ($e.SupaUrls.Count -eq 0) {
    [void]$md.AppendLine("_Ninguna (bien — debe leerse de env)._")
  } else {
    foreach ($u in $e.SupaUrls) {
      $proj = if ($u -match 'gtphkowfcuiqbvfkwjxb') { 'CRM (canónico)' }
              elseif ($u -match 'alesfvxqtwlrwlmkoosg') { 'Potencias (legacy — migrar)' }
              else { '?' }
      [void]$md.AppendLine("- ``$u`` → $proj")
    }
  }
  [void]$md.AppendLine("")

  # Gemini usage
  [void]$md.AppendLine("### Uso de Gemini")
  [void]$md.AppendLine("")
  if ($e.Gemini.Count -eq 0) {
    [void]$md.AppendLine("_No se ha encontrado uso de Gemini._")
  } else {
    [void]$md.AppendLine("| Archivo | Línea | Contexto |")
    [void]$md.AppendLine("|---|---|---|")
    foreach ($g in $e.Gemini) {
      $txt = $g.Text -replace '\|','\|'
      if ($txt.Length -gt 100) { $txt = $txt.Substring(0,100) + "…" }
      [void]$md.AppendLine("| ``$($g.File)`` | $($g.Line) | ``$txt`` |")
    }
  }
  [void]$md.AppendLine("")

  # Diagnóstico automático
  [void]$md.AppendLine("### Diagnóstico automático")
  [void]$md.AppendLine("")
  $issues = @()
  if ($e.EnvVars.Vite -contains 'VITE_GEMINI_API_KEY') {
    $issues += "🔴 **Key Gemini en bundle frontend** (``VITE_GEMINI_API_KEY``). Refactor obligatorio antes de cutover (ver ``docs/PLAN_MIGRACION_POTENCIAS_CLOUDFLARE.md``)."
  }
  if ($e.SupaUrls | Where-Object { $_ -match 'alesfvxqtwlrwlmkoosg' }) {
    $issues += "🟡 **Apunta a proyecto Potencias** (``alesfvxqtwlrwlmkoosg``). Cambiar URL + ANON_KEY a CRM (``gtphkowfcuiqbvfkwjxb``) en cutover Fase 4."
  }
  $legacyTables = @('clients','supplies','profiles','retailers','retailer_offers','regulated_rates','client_communications','client_documents','expediente_documents','documentacion','alerts','power_requests')
  $hits = @($e.Tables | Where-Object { $legacyTables -contains $_ })
  if ($hits.Count -gt 0) {
    $issues += "🟡 **Usa tablas legacy** ($($hits -join ', ')). Crear compat views CRM (ver ``docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md`` §4.C) o refactorizar."
  }
  if ($issues.Count -eq 0) {
    [void]$md.AppendLine("✅ Sin issues automáticos detectados.")
  } else {
    foreach ($i in $issues) { [void]$md.AppendLine("- $i") }
  }
  [void]$md.AppendLine("")
  [void]$md.AppendLine("---")
  [void]$md.AppendLine("")
}

# Resumen ejecutivo
[void]$md.AppendLine("## Resumen ejecutivo cross-app")
[void]$md.AppendLine("")
[void]$md.AppendLine("| App | Existe | Tablas | VITE_* | Gemini hits | URLs Supabase |")
[void]$md.AppendLine("|---|---|---|---|---|---|")
foreach ($e in $Report) {
  $exists = if ($e.Exists) { "✅" } else { "❌" }
  $tables = $e.Tables.Count
  $vite   = $e.EnvVars.Vite.Count
  $gem    = $e.Gemini.Count
  $urls   = $e.SupaUrls.Count
  [void]$md.AppendLine("| $($e.App) | $exists | $tables | $vite | $gem | $urls |")
}
[void]$md.AppendLine("")
[void]$md.AppendLine("## Próximos pasos")
[void]$md.AppendLine("")
[void]$md.AppendLine("1. Pega este archivo (o copia el .json crudo) en ``docs/INVENTARIO_APPS_SATELITE_<fecha>.md`` del repo ``valere-v2``.")
[void]$md.AppendLine("2. Avisa a Cowork: con esta foto, puede generar las compat views específicas que cada app necesita.")
[void]$md.AppendLine("3. Si alguna app marca 🔴 (key Gemini en bundle), prioriza el refactor antes del cutover.")
[void]$md.AppendLine("")

$md.ToString() | Out-File -Encoding utf8 $MdOut

Write-Host ""
Write-Host "Inventario generado: $MdOut" -ForegroundColor Green
Write-Host ""
Write-Host "Sube el .md al repo o pégalo a Cowork para que pueda diseñar Fase 4 con datos reales." -ForegroundColor Cyan
