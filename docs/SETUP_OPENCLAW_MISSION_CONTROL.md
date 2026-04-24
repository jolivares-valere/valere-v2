# Setup OpenClaw + Mission Control + Cloudflare Tunnel

> Para que Cowork (Claude) pueda dar órdenes a OpenClaw en tiempo real desde la nube,
> con seguridad y sin exponer tu PC al internet abierto.
> Tiempo estimado: 40-60 min.

---

## ¿Por qué este setup?

OpenClaw corre en tu PC en `127.0.0.1:18789` (atado a localhost por seguridad). Yo (Cowork) corro en la nube — no puedo conectar directamente.

**Solución 2026 estándar**:

1. **Mission Control** (dashboard open-source) actúa como capa de orquestación delante de OpenClaw, con Kanban + Live Feed + audit trail + API REST.
2. **Cloudflare Tunnel** crea un túnel cifrado entre tu PC y un dominio público (`openclaw.tudominio.com`), sin abrir puertos en tu router.
3. Yo me conecto al túnel con un token de auth y te puedo asignar tareas, ver el Kanban en vivo, recibir reportes en streaming.

**Beneficios sobre exponer puerto directo**:
- Sin abrir puertos de tu router (menos riesgo).
- Cifrado TLS extremo a extremo.
- Cloudflare bloquea ataques antes de llegar a tu PC.
- Token de auth obligatorio.
- Logs centralizados.

---

## Pre-requisitos

- ✅ OpenClaw instalado y funcionando en tu PC (ya lo tienes).
- ✅ Cuenta Cloudflare con dominio `valereconsultores.com` o subdominio gestionable
      (puede ser un subdominio gratis de Cloudflare si no quieres tocar el principal).
- ✅ Plan ChatGPT Empresa (que ya tienes, alimenta OpenClaw).
- ✅ PowerShell + Node.js + Git en tu PC (lo tienes para el CRM).

---

## FASE 1 — Instalar Mission Control (15 min)

Hay 2 implementaciones populares. Recomendación: **`abhi1693/openclaw-mission-control`**
(2.6k stars, enterprise-grade con governance y audit trails).

### 1.1 Clonar el repo

```powershell
cd $HOME
git clone https://github.com/abhi1693/openclaw-mission-control.git
cd openclaw-mission-control
```

### 1.2 Instalar dependencias

```powershell
npm install
```

### 1.3 Configurar variables

Copiar el `.env.example` a `.env` y rellenar:

```powershell
Copy-Item .env.example .env
notepad .env
```

Variables clave (ajustar según docs del repo):

```
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
MISSION_CONTROL_PORT=3030
MISSION_CONTROL_AUTH_TOKEN=<genera-uno-aleatorio-de-64-caracteres>
DATABASE_URL=sqlite://./mission-control.db
```

Generar el token aleatorio en PowerShell:

```powershell
[System.Web.Security.Membership]::GeneratePassword(64, 10)
# o:
-join ((33..126) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

**IMPORTANTE**: guardar este token en 1Password (vault Valere, entrada nueva 
"Mission Control Auth Token"). Lo necesito yo para conectar.

### 1.4 Arrancar Mission Control

```powershell
npm start
```

Debería arrancar en `http://localhost:3030`. Abre el navegador, verifica que ves
el dashboard. Loguéate con el token.

### 1.5 Verificar conexión a OpenClaw

En el dashboard, debería aparecer el Gateway de OpenClaw como "Connected". Si no:
- Confirma que OpenClaw está corriendo (`netstat -ano | findstr 18789`).
- Verifica que `OPENCLAW_GATEWAY_URL` apunta correctamente.

---

## FASE 2 — Cloudflare Tunnel (20 min)

### 2.1 Instalar cloudflared

```powershell
winget install --id Cloudflare.cloudflared
```

O descarga el `.msi` desde https://github.com/cloudflare/cloudflared/releases.

### 2.2 Login con tu cuenta Cloudflare

```powershell
cloudflared tunnel login
```

Se abre el navegador → autorizas → vuelves a la terminal.

### 2.3 Crear el túnel

```powershell
cloudflared tunnel create openclaw-juan
```

Te devuelve un Tunnel ID y crea un archivo de credenciales JSON. Anota ambas.

### 2.4 Configurar enrutamiento DNS

Decide qué subdominio usar. Si quieres usar tu dominio de Valere:

```powershell
cloudflared tunnel route dns openclaw-juan openclaw.valereconsultores.com
```

Si prefieres un subdominio temporal de Cloudflare gratis:
- Ve a Cloudflare dashboard → Workers & Pages → tu cuenta tiene un subdominio
  gratis tipo `<algo>.workers.dev`. Puedes apuntar el túnel ahí.

### 2.5 Crear archivo de configuración del túnel

Crear `$HOME\.cloudflared\config.yml` con:

```yaml
tunnel: <TUNNEL_ID_DEL_PASO_2.3>
credentials-file: C:\Users\joliv\.cloudflared\<TUNNEL_ID>.json

ingress:
  - hostname: openclaw.valereconsultores.com
    service: http://localhost:3030
  - service: http_status:404
```

### 2.6 Arrancar el túnel

```powershell
cloudflared tunnel run openclaw-juan
```

Verifica que `https://openclaw.valereconsultores.com` (o el subdominio que hayas
elegido) muestra el dashboard de Mission Control.

### 2.7 Configurar como servicio Windows (para que arranque solo)

```powershell
cloudflared service install
```

Esto hace que el túnel arranque al inicio de Windows automáticamente.

---

## FASE 3 — Hardening del túnel (5 min)

### 3.1 Cloudflare Access (opcional pero recomendado)

En el dashboard Cloudflare → Zero Trust → Access → Applications:
- Crear nueva app "OpenClaw Mission Control".
- Configurar policy: solo permitir acceso desde tu email Workspace o desde 
  ips/dispositivos concretos.
- Esto añade una capa de auth Cloudflare ANTES del token de Mission Control.

### 3.2 Verificar que OpenClaw Gateway sigue en localhost

```powershell
netstat -ano | findstr 18789
```

Debería mostrar `127.0.0.1:18789` (no `0.0.0.0:18789`). Si está bindeado a 
`0.0.0.0`, OpenClaw está expuesto a tu red local — corregir en su config.

---

## FASE 4 — Conectarme yo (Cowork) — 5 min

### 4.1 Pásame en chat el endpoint y el token

Cuando todo esté funcionando, dame:
- URL pública del túnel: `https://openclaw.valereconsultores.com` (o lo que hayas
  configurado).
- Token de auth de Mission Control (el del paso 1.3).

**No me los mandes en plano** — usa el método que prefieras (1Password share, 
nota cifrada, etc). Yo los almaceno como variables internas para esa sesión.

### 4.2 Verificación

Voy a hacer una llamada de prueba: `GET /api/health` con el token. Si responde 
200 OK, estamos conectados.

### 4.3 Primera tarea de prueba

Te asigno una tarea trivial via Mission Control API:

```
POST /api/tasks
{
  "title": "Test connection from Cowork",
  "description": "Crea un archivo test.txt en C:\\Users\\joliv\\Desktop\\ con el texto 'Hola desde Cowork'",
  "agent": "default"
}
```

Si OpenClaw recoge la tarea, la ejecuta y reporta éxito → estamos operativos.

---

## FASE 5 — Uso día a día

A partir de ese momento:

- Yo te asigno tareas vía Mission Control API.
- Tú ves el Kanban en `https://openclaw.valereconsultores.com` con los tasks 
  pending / in progress / done.
- OpenClaw las ejecuta y deposita reportes.
- Yo leo los reportes en la siguiente iteración.

**Ejemplos de tareas que puedo asignar a OpenClaw**:
- "Procesa todos los PDFs en `C:\downloads\contratos\` y extrae fechas y firmantes"
- "Renombra los archivos de `D:\fotos\` con el patrón `YYYY-MM-DD-evento.jpg`"
- "Genera un Excel con resumen de los CSVs en `E:\datos\`"
- "Comprueba si todos los CUPS de la BBDD CRM están en la BBDD Potencias y 
   reporta diferencias"

Tareas BUENAS para OpenClaw (no Anthropic API):
- Procesado batch de archivos.
- RPA (rellenar formularios, descargar archivos).
- Conversiones de formato.
- Scripts simples de mantenimiento.

Tareas BUENAS para Cowork (Anthropic):
- Razonamiento complejo.
- Trabajo con MCPs (Supabase, Vercel, Cloudflare).
- Diseño de arquitectura.
- Planning + coordinación.

---

## Troubleshooting común

### Mission Control no se conecta a OpenClaw
- Verifica que OpenClaw está corriendo: `netstat -ano | findstr 18789`.
- Verifica el `OPENCLAW_GATEWAY_URL` en `.env`.
- Reinicia ambos servicios.

### Cloudflare Tunnel da 502
- Confirma que Mission Control está corriendo en localhost:3030.
- Verifica el `service:` en `config.yml`.
- Logs: `cloudflared tunnel info openclaw-juan`.

### El subdominio no resuelve
- DNS puede tardar 1-5 min en propagarse tras `tunnel route dns`.
- Verifica en Cloudflare dashboard → DNS que aparece el CNAME.

### OpenClaw rechaza el comando "ejecutar shell arbitrario"
- Por defecto OpenClaw bloquea ejecución de shell por seguridad.
- En su config, hay un toggle "allow_shell_execution" — solo activar si confías 
  en quién manda los comandos (yo).

---

## Coste mensual estimado

- OpenClaw: 0€ (suscripción ChatGPT Empresa que ya pagas).
- Mission Control: 0€ (open-source, corre en tu PC).
- Cloudflare Tunnel: 0€ (gratis hasta 50 conexiones simultáneas, sobra).
- Cloudflare Access (si activas): 0€ hasta 50 usuarios.

**Total: 0€/mes adicionales.**

---

## Sources

- OpenClaw docs: https://docs.openclaw.ai/gateway/remote
- Mission Control: https://github.com/abhi1693/openclaw-mission-control
- Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
- OpenClaw hardening 2026: https://machtml.com/en/blog/articles/openclaw-gateway-proxy-tunnel-hardening-2026.html
