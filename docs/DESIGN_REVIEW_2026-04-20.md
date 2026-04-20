# Revisión de diseño Valere v2 — 2026-04-20

> Revisión estática del código (no testing visual en navegador).
> Fuente: `src/features/**/*.tsx` + componentes core.
> Propósito: identificar incoherencias y oportunidades de mejora sin tocar código.

## Resumen ejecutivo

1. **Dos escuelas de diseño conviven**: las features del CRM (empresas, contratos, oportunidades, etc.) usan estilo "plano" (`rounded-md`, `shadow-sm`, layout denso). Las features de la Calculadora (admin, datos, analisis, propuestas-energia, tracking) usan estilo "ornamental" (`rounded-xl/2xl`, `shadow-md`, más padding). Es el vestigio del origen: dos apps fusionadas que mantuvieron su lenguaje visual. **Es el mayor problema de UX: la app se siente como dos apps pegadas.**

2. **5 usos de `confirm()` nativo** en lugar de `ConfirmDialog`. Rompe consistencia visual y no respeta tokens/focus/a11y.

3. **30 botones icon-only sin `aria-label` detectados**, contra 35 que sí lo tienen. Gap de accesibilidad del ~46%.

4. **3 patrones de loading state conviven**: `<Skeleton>` (5 archivos), `<Loader2 className="animate-spin">` (7 archivos), y texto plano `"Cargando…"` (7 archivos). Las skeletons dan mejor UX pero la Calculadora las ignoró.

5. **Colores fuera del design system**: `bg-blue-*`, `bg-green-*` usados indistintamente tanto para semántica (estados "activo"=verde, "baja"=rojo) como decoración (iconos `TrendingUp text-blue-500` en Dashboard). La semántica se justifica; la decoración rompe el sistema `valere-*`.

---

## Consistencia visual

### Crítico

**CRIT-1 — Dos escuelas visuales por feature**

Conteo de border-radius por feature:

| Feature | `rounded-md` | `rounded-xl/2xl` | Escuela |
|---------|:---:|:---:|:---:|
| empresas | 21 | 0 | CRM |
| contratos | 12 | 0 | CRM |
| oportunidades | 11 | 0 | CRM |
| incidencias | 19 | 0 | CRM |
| renovaciones | 14 | 0 | CRM |
| actividades | 24 | 0 | CRM |
| importador | 12 | 0 | CRM |
| informes | 7 | 0 | CRM |
| calendario | 13 | 0 | CRM |
| dashboard | 3 | 0 | CRM (casi) |
| **admin** | **0** | **28** | **Calc** |
| **datos** | **0** | **15** | **Calc** |
| **analisis** | **0** | **4** | **Calc** |
| **propuestas-energia** | **0** | **10** | **Calc** |
| **tracking** | **0** | **4** | **Calc** |

**Decisión de producto pendiente**: ¿convergemos todo a una escuela? Recomiendo **rounded-xl** como estándar (los features Calc son más modernos y pulidos). Las features CRM se migrarían gradualmente.

**CRIT-2 — Padding y espaciados dispares**

- CRM pages (`EmpresasPage`, `ContratosPage`, etc.): `p-8`, `gap-6`.
- Calc pages (`DatosPage`, `AnalisisPage`): `p-4 md:p-8`, `gap-5`, `gap-8`.

No es grave pero al navegar entre features la densidad cambia visiblemente. Homologar a `p-6 md:p-8, gap-6`.

### Mejora

**MEJ-1 — Badges de estado duplicados**

`ContratoEstadoBadge` (en `src/features/contratos/components/EstadoBadge.tsx`) y los badges inline de `ActividadesPage.tsx:220` y `IncidenciasPage` hacen lo mismo (mapa estado → color Tailwind). Crear un `<StatusBadge variant={estado}>` genérico en `src/core/components/` reutilizable.

**MEJ-2 — Dashboard mezcla tokens y colores directos**

En `src/features/dashboard/DashboardPage.tsx`:
- Línea 29: `contactado: 'bg-blue-500'` (decorativo, debería ser `bg-valere-blue-medium`)
- Línea 73: `'bg-blue-50 text-blue-700 ring-1 ring-blue-200'` (badge de scope — podría usar `valere-blue` tints)
- Línea 162, 325: iconos `text-blue-500`, paletas de accent variables.

**MEJ-3 — Títulos con dos tipografías distintas**

- `DatosPage.tsx`, `AdminPage.tsx`: `<h1 className="text-3xl font-display font-bold">`.
- `EmpresasPage.tsx`, `ContratosPage.tsx`: `<h1 className="text-2xl font-bold">` (sin font-display).

Homologar: todos los H1 con `text-3xl font-display font-bold text-valere-blue-dark`.

### Pulido

- Algunos `EmptyState` usan icono 8×8, otros 6×6, otros 5×5.
- El color `text-valere-ink/50` se usa mucho para "muted text"; coexiste con `text-slate-500`. Elegir uno.

---

## UX / Flujos

### Crítico

**UX-1 — `confirm()` nativo en 5 ubicaciones**

Archivos que usan `window.confirm()` en lugar de `<ConfirmDialog>`:

| Archivo | Línea | Qué elimina |
|---------|-------|-------------|
| `src/features/admin/AdminPage.tsx` | 172 | Retailer |
| `src/features/admin/components/CustomFieldsManager.tsx` | 154 | Campo personalizado |
| `src/features/calendario/components/EventoForm.tsx` | 76 | Evento |
| `src/features/datos/DatosPage.tsx` | 259 | Factura |
| `src/features/propuestas-energia/PropuestasEnergiaPage.tsx` | 71 | Propuesta |

Impacto: salto de estilo visual (el browser muestra su propio dialog), no respeta tokens, no hay focus trap, y en Firefox/Safari el texto es diferente al del resto de la app.

**Fix**: reemplazar por `<ConfirmDialog>` con `variant="danger"`.

**UX-2 — 3 patrones de loading**

- **Skeletons** (el mejor UX): `ContratosPage`, `EmpresasPage`, `ContactosPage`, `OportunidadesPage`, `DashboardPage`.
- **Spinner Loader2**: `AdminPage`, `DatosPage`, `AnalisisPage`, `PropuestasEnergiaPage`, `TrackingPage`, `CustomFieldsManager`, `InformesPage`.
- **Texto "Cargando…"**: `EmpresaDetailPage`, `ContratoDetailPage`, `App.tsx::LoadingScreen`.

**Fix incremental**: las features Calc (spinner) se mejoran con Skeleton cuando se homologue al estilo CRM.

### Mejora

**UX-3 — Dialogs inconsistentes**

Tres mecanismos para "paneles de edición":
1. **Right-slide drawer** custom (EmpresaDetailPage contacts, OportunidadesPage edit): `fixed right-0 top-0 w-full max-w-xl`
2. **Dialog centrado shadcn** (admin retailers, admin offers, custom fields): `<Dialog><DialogContent>`
3. **Inline form** (reemplaza la página): EmpresaDetailPage en edit mode

No es malo tener varios, pero el criterio no es obvio. Propuesta: drawer para forms complejos/largos, Dialog para forms cortos (≤4 campos), inline solo para page-as-form.

**UX-4 — Toasts de confirmación faltan en algunas mutaciones**

Detectado en `useUpdateOportunidad` (api.ts) y otras: no muestran toast tras éxito. En cambio `useCreateOportunidad` sí. Homologar: **toda mutación de usuario → toast de éxito + error**.

**UX-5 — Navegación profunda sin breadcrumb**

Ejemplo: `/empresas/:id` → tab "contactos" → "Añadir contacto" abre un drawer. No hay indicador de dónde estás en la jerarquía. Añadir breadcrumb discreto arriba en todas las rutas con parámetros.

### Pulido

- `EmpresaDetailPage.tsx:14`: Tab type definido inline, podría ser const array con iconos.
- Botón de "Exportar CSV" con 4 variantes de estilo (borde, relleno, outline).
- Algunos listados tienen sticky header, otros no.

---

## Accesibilidad

### Crítico

**A11Y-1 — ~30 botones icon-only sin `aria-label`**

Detectados (muestra):
- `src/features/admin/AdminPage.tsx:215,375`: `<button onClick={() => startEdit(r)}><Pencil /></button>` sin aria-label.
- `src/features/propuestas-energia/PropuestasEnergiaPage.tsx:187`: `<button><MoreVertical /></button>` del DropdownMenu trigger.
- Varios botones de eliminar (Trash2) sin aria-label.

**Fix**: añadir `aria-label="Editar"`, `aria-label="Eliminar"`, `aria-label="Opciones"`, etc. Esfuerzo: 15-20 ediciones puntuales.

**A11Y-2 — Contraste bajo en texto muted**

`text-valere-ink/40` y `text-valere-ink/50` sobre fondos blancos pueden no cumplir WCAG AA (4.5:1). Verificar con tooling y, si falla, subir a `/60` o `/70`.

### Mejora

**A11Y-3 — Tablas sin `<caption>` ni `scope` en headers**

Todas las `<TableHead>` (shadcn) se renderizan como `<th>` pero no incluyen `scope="col"` por defecto.

**A11Y-4 — Sidebar sin `role="navigation"` explícito**

El `<aside>` envuelve `<nav>` implícito. Añadir `aria-label="Navegación principal"` al `<nav>`.

**A11Y-5 — Focus visible en botones custom**

Muchos botones (`className="rounded-md bg-slate-900 px-4 py-2"`) no tienen `focus:ring-2 focus:ring-valere-blue-medium/30 focus:outline-none`. Perjudica navegación por teclado.

### Pulido

- Dropdown del topbar (notificaciones): mirar si `aria-expanded` está correctamente sincronizado.
- Ninguna feature implementa `prefers-reduced-motion` en Framer Motion animations.

---

## Propuestas concretas (top 10 priorizadas por valor/coste)

| # | Cambio | Archivo(s) | Esfuerzo | Impacto |
|---|--------|-----------|----------|---------|
| 1 | Reemplazar 5 `confirm()` nativos por `ConfirmDialog` | admin, custom-fields, calendario/EventoForm, datos, propuestas-energia | 30min | Alto (consistencia) |
| 2 | Añadir `aria-label` a ~30 botones icon-only | Admin, PropuestasEnergia, Incidencias, otros | 45min | Alto (a11y) |
| 3 | `<StatusBadge>` genérico en `core/components` y migrar los 3 existentes | Contratos/EstadoBadge, Actividades, Incidencias | 1h | Medio (mantenibilidad) |
| 4 | Homologar títulos H1 (`text-3xl font-display font-bold text-valere-blue-dark`) | EmpresasPage, ContratosPage, OportunidadesPage, etc. | 20min | Medio (visual) |
| 5 | Focus visible en todos los botones custom (añadir `focus:ring-*` al botón base) | multiple | 30min | Alto (a11y) |
| 6 | Toasts en todas las mutaciones (auditar todas las `useMutation` de `api.ts`) | contratos/api.ts, oportunidades/api.ts, otros | 45min | Medio (UX) |
| 7 | Migrar 7 features Calc a `rounded-xl` / `shadow-md` o inversamente 10 features CRM a `rounded-md`. **Decisión de producto previa** | todas | 2-3h | Muy alto (unificación visual) |
| 8 | Skeleton para las 7 features que hoy usan Loader2 spinner | admin, datos, analisis, propuestas-energia, tracking, custom-fields, informes | 1.5h | Medio (UX) |
| 9 | Breadcrumb en rutas profundas | EmpresaDetailPage, ContratoDetailPage | 40min | Bajo (navegación) |
| 10 | Test de contraste WCAG en `text-valere-ink/40` y ajustar si falla | global (tokens) | 20min + tool | Alto (a11y) |

---

## Recomendación de orden de ejecución

**Sprint 1 (impacto alto, coste bajo — 3h)**:
- #1 ConfirmDialog
- #2 aria-label
- #5 Focus visible
- #4 Títulos H1

**Sprint 2 (UX — 2h)**:
- #6 Toasts en mutaciones
- #8 Skeletons
- #9 Breadcrumbs

**Sprint 3 (decisión de producto + ejecución — 3-4h)**:
- #7 Unificar escuela visual (precisa decisión de Jesús)
- #3 StatusBadge genérico
- #10 Contraste WCAG

---

## Notas sobre el método

Esta revisión es estática (no se ha abierto ningún navegador). Podría ampliarse con:
- Test visual con Playwright + axe-core (detecta problemas de contraste y ARIA automáticamente).
- Lighthouse report en `npm run preview`.
- Chromatic o Percy para regresiones visuales.
