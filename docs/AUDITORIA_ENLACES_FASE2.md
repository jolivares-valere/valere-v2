# FASE 2 — Auditoría de enlaces (inventario estático)

> Fecha: 2026-07-04 · Rama: `claude/f2-telemetria-enlaces` · Autor: Cowork (Agente 1)
> **Punto de parada 2**: este inventario debe aprobarse antes de empezar arreglos.

## Metodología

Cruce de las 40 rutas definidas en `src/App.tsx` (única fuente del router) contra todos los puntos de navegación de `src/`: `<Link to>` / `<NavLink to>` (literales y plantillas), `navigate()`, `<Navigate to>`, `href` internos, ítems de `Sidebar.tsx` y asignaciones a `window.location`. Barrido inicial por subagente Explore + contraste manual con grep de los patrones y de los hallazgos (el subagente reportó "cero enlaces rotos"; el contraste manual encontró el H1).

**Límite de este documento**: es análisis ESTÁTICO. La dimensión "botón muerto por tabla vacía / página a medias en runtime" requiere datos reales de uso — se completará cuando la telemetría (objetivo 1) lleve unos días en producción.

## A) Resultado del cruce

Todos los destinos de navegación encontrados casan con rutas del router. Verificado explícitamente:

| Grupo | Destinos | Estado |
|---|---|---|
| Detalle con parámetro | `/empresas/:id` (13 usos), `/contratos/:id` (8), `/potencias/expedientes/:id` (4), `/datadis/:cups` (1) | ✅ OK |
| Listados y módulos | `/empresas`, `/contratos`, `/oportunidades`, `/actividades`, `/datos`, `/datadis`, `/potencias/expedientes`, `/captacion` … | ✅ OK |
| Auth | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/pending-approval` | ✅ OK |
| navigate() (7 usos) | GlobalSearch (dinámico validado), EmpresaDetail→/empresas, SupplyDetail→/datadis, Signup→/pending-approval·/login, ResetPassword→/login, DatadisPage→/datadis/:cups | ✅ OK |
| Sin `href="#"`, sin `to=""` vacíos, sin `window.location` interno | — | ✅ OK |

## B) Hallazgos (candidatos a arreglo)

### H1 — Filtro `estado` ignorado en ContratosPage · **prioridad ALTA** (Dashboard = uso diario)
`DashboardPage.tsx:121` y `:129` enlazan a `/contratos?estado=activo` y `/contratos?estado=incidencia`, pero `ContratosPage.tsx:28` solo lee `searchParams.get('vencimiento')` — **nunca lee `estado`**. El enlace navega, el filtro se descarta en silencio: la tarjeta "incidencias" del Dashboard muestra TODOS los contratos. Enlace a medias clásico. (Renovaciones e Incidencias sí leen `estado`; Actividades sí lee `entidad_tipo`/`entidad_id` — el patrón existe, solo falta en Contratos.)

**Arreglo propuesto**: leer `estado` en ContratosPage y aplicarlo al filtro existente, siguiendo el patrón de `RenovacionesPage.tsx:59`.

### H2 — Placeholder deliberado en FV · prioridad BAJA (informativo)
`CredencialFormModal.tsx:313` anuncia «Próximamente: Probar conexión». Es deuda declarada del módulo FV, no un enlace roto. Se deja constancia para el informe.

### H3 — Dimensión runtime PENDIENTE de telemetría
Botones que renderizan sobre tablas con 0 filas (`documentos`, `eventos` tenían 0 filas en abril) y páginas a medias no son detectables estáticamente. Cuando `client_telemetry` acumule `route_change` + `supabase_query`, se cruzará: rutas con visitas vs. rutas con errores/vacíos. Segunda pasada de esta auditoría.

### H4 — (añadido tras el commit c809ef4) Contaminación SIPS en App.tsx de la rama f2 · **CRÍTICO, corregido en árbol local**
El commit de telemetría arrastró 2 líneas del cableado SIPS F1 sin commitear (import `./features/sips/BuscadorCupsPage` + ruta `/buscador-cups`) mientras `src/features/sips/` quedó sin trackear → la rama f2 en GitHub referencia un fichero inexistente y el build de CI/Cloudflare fallaría. Detectado contrastando el raw de GitHub contra origin/main. Corregido retirando las 2 líneas en local; **pendiente commit fix + push** antes del merge. Aviso a F1 en `.cowork/outbox/2026-07-04T23-30-00-f2-descableado-sips-en-apptsx.md`.

### H5 — Catch-all silencioso: los enlaces rotos son invisibles por diseño · **prioridad ALTA** (recomendación auditoría externa)
`App.tsx` termina en `<Route path="*" element={<Navigate to="/" replace />} />`: cualquier ruta inexistente rebota a `/` sin avisar. Consecuencia doble: el usuario nunca ve que un enlace está roto, y en telemetría el clic queda como dos `route_change` normales (ruta mala + rebote), indistinguibles de navegación legítima — el detector de humo de esta fase no existe.

**Arreglo propuesto**: sustituir el catch-all por una página 404 propia (`NotFoundPage`) que (a) informe al usuario con enlace de vuelta, y (b) emita un evento `custom` (admitido por la CHECK constraint de `client_telemetry`) con `{ tipo: 'ruta_no_encontrada', path, from }`. ~10 líneas + componente. Candidato a ir en el mismo paquete de arreglos que H1 (PR aparte del de telemetría).

### H6 — El 200-vacío esconde entidades rotas · **prioridad ALTA** (hallazgo auditoría externa, familia de H5)
Las consultas de detalle (`useEmpresaById` → `empresas/api.ts:108`, contratos → `contratos/api.ts:133`) usan `.maybeSingle()`: un ID inexistente o borrado devuelve HTTP 200 vacío. Correcto como diseño de API, pero consecuencia: los enlaces a entidades borradas/rotas — exactamente el tipo de enlace muerto que busca esta fase — son **invisibles para la telemetría** (el wrapper solo ve un 200 rápido). Simetría con H5: el catch-all esconde rutas rotas; el 200-vacío esconde entidades rotas.

**Arreglo propuesto**: en las pantallas de "no encontrado" (cuando `data === null` con ID presente), emitir evento `custom` con `{ tipo: 'entidad_no_encontrada', entidad, path, from }`. Se empareja con H1+H5 en el PR de arreglos.

## A1) Ampliación: enlaces externos (encargo auditoría)

Estáticos (3): `datadis.es` (DatadisPanel.tsx:100 — dominio vivo, OK), `mailto:` dinámico (OportunidadDrawer.tsx:298 — OK), workflow `fv-sync.yml` de GitHub Actions (CredencialesTab.tsx:393 — OK, uso interno). `window.open` (6): todos con URLs dinámicas — signed URLs de Storage (documentos, potencias, datadis ×2, captación) y `p.pdf_url` de BBDD (propuestas-energia). **Cero URLs hardcodeadas** a Vercel antiguo, AI Studio, proyecto Supabase de Potencias ni dominios muertos. ⚠️ Riesgo residual en DATOS, no en código: valores `pdf_url` antiguos en BBDD podrían apuntar a Vercel suspendido — verificable con SQL (`SELECT ... WHERE pdf_url LIKE '%vercel%'`), anotado para la ventana de BBDD.

## A2) Ampliación: contrato de query params (encargo auditoría)

Barrido completo: solo existen **5 enlaces con querystring** en `src/`. `/actividades?entidad_tipo=&entidad_id=` (×2, EmpresaDetailPage) → leídos por ActividadesPage:57-58 ✅ · `/contratos?vencimiento=1` (Dashboard:89) → leído por ContratosPage:28 ✅ · `/contratos?estado=activo|incidencia` (Dashboard:121,129) → **NO leídos = H1** ❌. Conclusión: H1 era la clase entera; no hay más filtros descartados en silencio.

## C) Menú (Sidebar.tsx)

CRM Comercial (admin | asesor_senior): 16 ítems. Captación (telemarketing | analista | asesor_senior | admin): 3. Energía (admin | asesor_senior): 4. Gestión de Potencias (admin): 9 (reutiliza `/empresas` y `/calendario`). Admin (master | manager): 1. Todos los paths de menú existen en el router. ✅

## D) Rutas sin enlace entrante (huérfanas benignas)

Accesibles solo por Sidebar (patrón normal de CRM): `/buscador-cups`, `/seguimiento-fv`, `/importador`, `/suministros`, `/informes`, `/renovaciones`, `/tracking`, `/propuestas-energia`, `/analisis`, subrutas de potencias, `/analisis-captacion`, `/cartera-senior`. Sin enlace ninguno (flujos especiales, correcto): `/reset-password` (llega por email), `/pending-approval` (redirect automático).

## Plan de arreglos propuesto (orden Captación > Potencias > FV > Tarifas > resto)

1. **H1 + H5 + H6** en un PR conjunto de arreglos (filtro `estado` en ContratosPage + página 404 con evento + evento `entidad_no_encontrada` en pantallas de detalle). Una sola historia: "los enlaces rotos se ven". PR aparte del de telemetría.
2. Reevaluar con telemetría real (H3) tras unos días de producción; priorizar por `route_change` + errores por ruta (y desde H5, por eventos `ruta_no_encontrada`).

*H4 cerrado (fix 56577cb + build Cloudflare verde en PR #55). Esperando OK de Juan para H1+H5 (punto de parada 2).*
