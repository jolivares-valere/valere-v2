# Modo DEMO — Auditoría externa

> **AVISO:** Este modo sirve **únicamente** para auditorías externas (ChatGPT u otros) que necesiten navegar el CRM sin acceder a datos reales. No es una build de producción y no debe desplegarse en `valere-v2.pages.dev` ni en ningún hosting público permanente.

---

## ¿Qué es el modo DEMO?

Cuando se compila o se sirve la app con `VITE_DEMO_MODE=true`, el cliente Supabase real es reemplazado por un **mock local** que devuelve datos ficticios desde `src/core/demo/fixtures.ts`. Ninguna llamada de red sale del navegador.

**Punto de switch único:** `src/core/supabase/client.ts` (~10 líneas añadidas, dynamic import del mock).

**Garantía:** sin `VITE_DEMO_MODE=true`, el comportamiento es **idéntico** al de producción. Los archivos del módulo demo (`src/core/demo/*`) no se cargan, el banner no se muestra y no hay fixtures en memoria.

---

## Cómo arrancar el modo DEMO

### Modo 1 — dev server con hot reload (recomendado para auditar UI)

```powershell
cd C:\Users\joliv\valere-v2
npm run dev -- --mode demo
```

Vite cargará `.env.demo`, exportará el mock como cliente Supabase y servirá en `http://localhost:3000`.

### Modo 2 — build estático + preview (más realista)

```powershell
npm run build -- --mode demo
npm run preview -- --port 4173
```

Sirve en `http://localhost:4173`. El TypeScript-check (`tsc -b`) se ejecuta antes del build; si tu rama tiene errores TS preexistentes, usa solo `npx vite build --mode demo` para saltarlo.

### Verificación rápida

Abre la consola del navegador. La primera operación contra Supabase imprime en naranja:

```
DEMO MODE activo: Supabase real deshabilitado
```

Si **no** ves ese log y `VITE_DEMO_MODE=true`, hay un problema en el switch — revisar `src/core/supabase/client.ts`.

---

## Credenciales demo (cualquier contraseña vale)

| Email | Rol / función | Default route |
|---|---|---|
| `auditor@valere.demo` | master + admin (ve todo) | `/dashboard` |
| `senior@valere.demo` | manager + asesor_senior | `/cartera-senior` |
| `analista@valere.demo` | client + analista | `/analisis-captacion` |
| `telemarketing@valere.demo` | client + telemarketing | `/captacion` |

Contraseña sugerida (o cualquier otra): `demo1234`. El mock acepta cualquier contraseña; el email selecciona el perfil.

---

## Datos sembrados

Fixtures en `src/core/demo/fixtures.ts`:

- **4 usuarios** (uno por rol/función)
- **5 empresas** (3 cliente, 2 lead — industrial, comercial, servicios, cooperativa, comunidad de propietarios)
- **3 contactos** (con decisor/firmante)
- **5 oportunidades** en distintas etapas: `prospecto`, `auditoria_consumo`, `oferta_presentada`, `negociacion`, `cerrada_ganada`
- **2 contratos** (uno vencido, uno activo)
- **3 actividades** (llamada, reunión, email con adjunto)
- **2 handoffs** entre roles (telemarketing → analista → asesor_senior)
- **2 documentos** ficticios (factura, propuesta)
- **2 incidencias** (facturación, cambio comercializadora)
- **4 comercializadoras** del catálogo
- **1 expediente** de Potencias (en trámite)
- **2 plantas FV**, 2 dispositivos, 2 alarmas, **30 días de KPI diario**
- **2 CUPS** + cache Datadis ficticia

Tablas no listadas devuelven array vacío — la UI muestra empty states. Se añaden fixtures adicionales editando `FIXTURES` al final de `fixtures.ts`.

---

## Limitaciones conocidas del mock

| Categoría | Limitación |
|---|---|
| Filtros aplicados | Solo `eq`, `neq`, `is(null)`, `in`, `gt/gte/lt/lte` modifican el resultado realmente. `or`, `ilike`, `like`, `contains`, `not`, `match`, `textSearch` se aceptan en la cadena pero **no filtran** los datos devueltos (la UI muestra todo). |
| Joins (`select('*, fk:tabla!constraint(...)')`) | El mock no resuelve joins — los datos relacionados (p. ej. `empresa.comercial.full_name`) están **pre-bakeados** en el fixture cuando es relevante. Joins no preparados devuelven `undefined`. |
| Inserts/updates | No persisten entre recargas. La operación devuelve éxito pero los siguientes `select` no ven el cambio (memoria por petición). |
| RPC | `supabase.rpc(fn, args)` siempre devuelve `{ data: null, error: null }`. Cualquier feature que dependa de un RPC verá comportamiento neutro o vacío. |
| Edge Functions | `functions.invoke(name, opts)` devuelve `null` excepto `ask-crm-docs`, que devuelve respuesta canned indicando que el RAG no está conectado. |
| Storage | Las URLs públicas y signed URLs apuntan a `https://demo.invalid/…` (no resuelven). Descargas devuelven `Blob('demo')`. |
| Realtime | `supabase.channel(...)` es no-op. No hay updates push. |
| Auth | `signUp` falla con mensaje "Signup deshabilitado en modo demo". `resetPasswordForEmail` finge éxito. `signInWithPassword` siempre acepta. |

Estas limitaciones son aceptables para una auditoría visual/arquitectónica — no para QA funcional o tests E2E.

---

## Exposición pública con cloudflared (Quick Tunnel)

> **Importante:** los Quick Tunnels son temporales y no requieren cuenta de Cloudflare. Generan una URL `*.trycloudflare.com` aleatoria que dura mientras el comando esté corriendo.

### Instalar cloudflared (si no está)

```powershell
winget install --id Cloudflare.cloudflared
# o descarga manual: https://github.com/cloudflare/cloudflared/releases
```

### Levantar túnel

En una terminal corre el dev/preview en modo demo (ver arriba). En **otra terminal**:

```powershell
cloudflared tunnel --url http://localhost:3000
# (o --url http://localhost:4173 si usaste preview)
```

cloudflared imprimirá algo como:

```
+-------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may    |
|  take some minutes to be reachable):                        |
|  https://random-words.trycloudflare.com                      |
+-------------------------------------------------------------+
```

Esa URL `https://*.trycloudflare.com` es la que se comparte con el auditor.

### Alternativa: ngrok

```powershell
winget install --id Ngrok.Ngrok
ngrok http 3000
```

Genera `https://*.ngrok-free.app`. Requiere cuenta gratuita y `ngrok config add-authtoken …` la primera vez.

### Cierre del túnel

`Ctrl+C` en la terminal donde corre `cloudflared`/`ngrok`. La URL deja de ser accesible inmediatamente.

---

## Checklist de auditoría — flujos preparados para revisar

| Módulo / flujo | Fixtures listas | Notas |
|---|---|---|
| Dashboard general | ✅ | Cards, KPIs, etc. con datos básicos |
| Bandeja telemarketing | ✅ | E3, E5 leads + O1 oportunidad prospecto |
| Bandeja analista | ✅ | O2 (auditoría_consumo) asignada |
| Bandeja asesor senior | ✅ | O3, O4 (oferta_presentada, negociación) |
| Pipeline kanban completo | ✅ | 5 oportunidades cubriendo 5 etapas |
| Handoffs (cambios de responsable) | ✅ | 2 handoffs encadenados |
| Detalle empresa cliente | ✅ | E1 con contactos, contratos, actividades, documentos |
| Detalle empresa lead | ✅ | E3, E5 sin contratos |
| Contratos | ✅ | CTR1 vencido (alerta renovación), CTR2 activo |
| Actividades | ✅ | 3 tipos: llamada, reunión, email |
| Incidencias | ✅ | 2 abiertas con prioridades distintas |
| Calendario | ⚠️ | Sin eventos sembrados — empty state |
| Renovaciones | ⚠️ | Sin filas — empty state |
| Notificaciones | ⚠️ | Sin filas — empty state |
| Importador CSV | ⚠️ | UI funcional, importación no persiste |
| Documentos | ✅ | 2 docs ficticios; descarga devuelve blob "demo" |
| Asistente RAG | ⚠️ | Devuelve respuesta canned avisando que está deshabilitado |
| Módulo FV — listado plantas | ✅ | 2 plantas |
| Módulo FV — KPI diario | ✅ | 30 días de datos generados |
| Módulo FV — alarmas | ✅ | 2 alarmas (warning + info) |
| Módulo Potencias / expedientes | ⚠️ | 1 expediente en trámite, sin ciclos |
| Datadis | ⚠️ | 2 CUPS, 1 entrada de cache |
| Admin / pendientes de aprobación | ⚠️ | Sin filas — empty state |
| Custom fields | ⚠️ | Sin filas — empty state |
| Search global | ⚠️ | Funciona sobre fixtures cargadas |

✅ = datos suficientes para flujo completo · ⚠️ = empty state o flujo limitado

---

## Áreas que necesitan feedback externo (audit hints para ChatGPT)

1. **Arquitectura feature-based**: `src/features/<dominio>/` con `api.ts` + `Page.tsx` + `components/`. ¿Coherente? ¿Demasiado acoplada al cliente Supabase?
2. **Mutaciones React Query**: cada feature gestiona invalidación local. ¿Hay duplicación? ¿Patrón global de invalidación más limpio?
3. **Tipos `Database = any`**: hoy los tipos derivados de Supabase están desactivados — generan ~50 errores TS preexistentes (`Record<string, unknown>` no asignable a `never`). Se planea regenerar en FASE 20.7.
4. **AuthGuard**: lógica en `src/App.tsx` mezclando session/profile/funciones/role. ¿Patrón más limpio (HOC, hook compuesto)?
5. **Permissions whitelist**: `src/core/auth/permissions.ts` — regex match por ruta. ¿Pasaría auditoría de seguridad? (recordatorio: la defensa real está en RLS de Supabase, no en el frontend).
6. **Asistente RAG**: integración con Edge Functions Supabase + pgvector. ¿Patrón replicable? ¿Qué falta para producción?
7. **Mezcla CRM + Calculadora**: ¿la fusión feature-based ha logrado realmente unificar o quedan límites de dominio difusos?
8. **Bundle size**: lazy loading agresivo por ruta (todas las pages son `React.lazy`). ¿Bien dimensionado? Recomendaciones.
9. **Modo demo limpio**: ¿algún acoplamiento involuntario entre demo y prod? ¿Algún archivo de prod modificado más allá del switch en `client.ts` y `main.tsx`?

---

## Archivos modificados / creados por el modo demo

### Creados (todos aislados en `src/core/demo/`)

- `src/core/demo/index.ts` — exports y constantes (28 líneas)
- `src/core/demo/fixtures.ts` — datos ficticios (~800 líneas)
- `src/core/demo/mock-supabase.ts` — cliente fake (~340 líneas)
- `src/core/demo/DemoBanner.tsx` — banner UI (~60 líneas)
- `.env.demo` — configuración de variables de entorno demo
- `docs/DEMO_MODE.md` — este archivo

### Modificados (cambios mínimos, reversibles, condicionados a `VITE_DEMO_MODE`)

- `src/core/supabase/client.ts` — switch dynamic-import al mock cuando `VITE_DEMO_MODE=true` (8 líneas añadidas, lógica original intacta).
- `src/main.tsx` — import de `DemoBanner` y montaje en árbol (2 líneas añadidas).

**Reversibilidad total:** revertir el modo demo es eliminar la carpeta `src/core/demo/`, quitar las ~10 líneas añadidas en `client.ts` y `main.tsx`, y borrar `.env.demo`. Sin cambios destructivos.

---

## Seguridad — qué está garantizado

- ✅ Cero llamadas de red a `*.supabase.co`
- ✅ Sin credenciales reales en el bundle (anon key vacía en `.env.demo`)
- ✅ Sin `SUPABASE_ACCESS_TOKEN` en el cliente
- ✅ Sin claves Sentry
- ✅ Sin datos personales reales — todo es ficticio (emails `*.example`, NIFs `00000001`, etc.)
- ✅ Sin operaciones destructivas posibles (insert/update/delete son no-ops en memoria)

---

## Pendientes externos al modo demo (recordatorios de seguridad)

1. **Rotar `SUPABASE_ACCESS_TOKEN`** filtrado en `.env` (token `sbp_…` activo). Acción: https://supabase.com/dashboard/account/tokens → regenerar → actualizar `.mcp.json` (no `.env`).
2. **Activar RLS en `public.datadis_provincias`** (advisor lo marca como crítico — solo es catálogo público pero es buena práctica).
3. **Revisar políticas RLS permisivas** (CLAUDE.md decisión #5: "all authenticated CRUD all"). Endurecer en FASE 20.9.
