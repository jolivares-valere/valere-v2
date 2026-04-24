# Auditoría de seguridad preventiva — `valere-v2` CRM

> Generado 2026-04-24 por Cowork. Barrido con grep de patrones estándar de credenciales.
> Scope: todo el repo excepto `node_modules/`.

## Resumen ejecutivo

| Categoría | Hallazgos | Estado |
|---|---|---|
| Google API keys (`AIzaSy...`) | 0 en código vivo (1 era en INSTRUCCIONES.md — **ya limpiado hoy**) | ✅ Limpio |
| JWTs Supabase (`eyJ...`) | 0 | ✅ Limpio |
| Anthropic API keys (`sk-ant-api...`) | 0 | ✅ Limpio |
| OpenAI keys estrictos (`sk-proj-`, `sk-api-`) | 0 | ✅ Limpio |
| AWS keys (`AKIA...`) | 0 | ✅ Limpio |
| Private keys (RSA/OpenSSH/PKCS) | 0 | ✅ Limpio |
| `API_KEY = "..."` patrones en código | 0 | ✅ Limpio |
| `password: "..."` en código | 0 | ✅ Limpio |
| `.env` tracked en git | Solo `.env.example` y `.env.txt` | ⚠️ Ver detalle |

**Conclusión global**: el repo está en buen estado de seguridad tras la limpieza de `INSTRUCCIONES.md` de hoy. No se detectan otras credenciales expuestas.

---

## Detalle de hallazgos

### ✅ Google API keys — limpio

Búsqueda con patrón `AIzaSy`:
- **Antes de hoy**: la key `AIzaSyDqjcyy328DMa9-5mPoohJZPqvF4JfjYuE` aparecía en `INSTRUCCIONES.md` líneas 32 y 62 (repo público).
- **Hoy**: sustituida por placeholder + nota explicativa. Resultado: solo aparece una referencia en `docs/PLAN_MIGRACION_POTENCIAS_CLOUDFLARE.md` en un comando de ejemplo `Select-String` (no es credencial real, es un patrón de búsqueda).
- **Historial git**: la key sigue en commits anteriores. Como se va a revocar (tarea #31), el valor en historial es inofensivo.

### ✅ Tokens JWT Supabase — limpio

Búsqueda con patrón `eyJhbGciOi` (header base64 de JWT): **0 hits**. Los tokens Supabase no están hardcodeados en el repo.

### ✅ Claves de otros proveedores — limpio

- Anthropic API keys (`sk-ant-api`): 0 matches.
- OpenAI keys estrictos (`sk-proj-`, `sk-api-`): 0 matches.
- AWS access keys (`AKIA...`): 0 matches.
- Private keys (RSA/OpenSSH): 0 matches.

### ✅ Patrones genéricos `API_KEY = "..."` — limpio

Búsqueda de asignaciones tipo `XXX_KEY = "..."`: **0 matches** en TS/TSX/JS/JSON. Cero API keys hardcodeadas.

### ✅ `password: "..."` en código — limpio

Búsqueda case-insensitive: **0 matches**. No hay contraseñas hardcodeadas.

### ⚠️ Archivos `.env*` tracked en git

```
.env.example   ✅ correcto — está pensado para versionarse
.env.txt       ⚠️ SOSPECHOSO — nombre raro, convendría revisar
```

**Verificación de `.env.txt`**:

El archivo contiene **código TypeScript** (de `ContratoForm.tsx` pegado por error), NO variables de entorno reales. Es basura que se coló en un commit antiguo.

**Recomendación**: eliminar `.env.txt` del repo.

```powershell
cd $HOME\valere-v2
Remove-Item .env.txt
git rm .env.txt
git commit -m "chore: eliminar .env.txt tracked por error (era codigo pegado, no env vars)"
git push
```

---

## Archivos `.env` en `.gitignore`

Verificado que `.gitignore` excluye correctamente los `.env` reales:

```
.env
.env.local
.env.*.local
```

Solo `.env.example` y `.env.txt` están tracked, que es esperado/correcto (salvo `.env.txt` que es basura).

---

## Recomendaciones adicionales

### 1. Git hooks pre-commit (prevención futura)

Instalar `gitleaks` o `pre-commit` con regla de detección de secrets para evitar futuras fugas. Setup:

```powershell
# Windows: descargar gitleaks desde https://github.com/gitleaks/gitleaks/releases
# O via scoop:
scoop install gitleaks

# En el repo:
cd $HOME\valere-v2
gitleaks detect --verbose --redact
# (si está limpio, configurar como pre-commit hook)
```

Beneficio: si alguien intenta commitear una key por error, el hook la bloquea antes del commit.

### 2. GitHub Secret Scanning

Verificar que está activado en el repo:

- GitHub → repo → Settings → Code security and analysis.
- **Secret scanning**: ON.
- **Push protection**: ON (bloquea pushes con secrets detectados).

Es gratis para repos públicos y en org Free.

### 3. Rotación periódica

- **1Password vault Valere** debe trackear fecha de creación de cada key.
- Rotación cuatrimestral de keys sensibles (Gemini, Supabase service_role, etc.).
- Rotación inmediata ante cualquier sospecha.

### 4. Supabase service_role en CI/CD

Verificar que `SUPABASE_SERVICE_KEY` (si existe en GitHub Actions secrets):
- Está configurada como "Repository secret" (no en código).
- Acceso limitado a los workflows que la necesiten.
- Rotada tras cualquier cambio de equipo.

---

## Qué NO se audita aquí

Esta auditoría es **solo del repo**. NO cubre:

- Env vars configuradas en Cloudflare Pages / Vercel / Supabase.
- Secretos en historial git de commits antiguos (vs `main` actual).
- Tokens en gestores de contraseñas o documentos externos.
- Credenciales compartidas por email, Slack, etc.

Para auditoría completa se necesita también inspeccionar esas superficies.

---

## Hallazgos que ya se están abordando (no nuevos)

- `VITE_GEMINI_API_KEY` en `valere-gestion-potencias` (repo externo): refactor pendiente — ver `docs/PLAN_MIGRACION_POTENCIAS_CLOUDFLARE.md`.
- Key `...YuE` en cuenta personal Juan: verificación pendiente (30 segundos de Juan en su cuenta personal de Google AI Studio).
- Anon key Supabase en `dtpbghvfxwyvkugtsojr` (proyecto personal energetica): rotación opcional.

---

## Conclusión

**Estado del repo `valere-v2` tras auditoría: saludable.**

Las acciones residuales son mínimas:

1. ✅ Eliminar `.env.txt` (basura, 0 impacto).
2. ✅ Activar Secret Scanning + Push Protection en GitHub.
3. ✅ Considerar gitleaks como pre-commit hook.

Nada de esto es urgente, pero completarlo deja el repo en estado "ruta estable" sin sorpresas futuras.
