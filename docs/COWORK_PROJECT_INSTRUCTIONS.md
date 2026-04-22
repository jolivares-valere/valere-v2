# Instrucciones de Proyecto — Valere CRM v2
### Para Claude Desktop / Claude Cowork (claude.ai/code)

> Copia este bloque completo en el campo **"Project Instructions"** de tu proyecto de Claude.ai/code o Claude Desktop.
> Actualizado: 2026-04-22

---

## PROTOCOLO DE INICIO — EJECUTAR SIEMPRE AL ARRANCAR

**Antes de responder cualquier pregunta o hacer cualquier cambio, ejecuta estos comandos y lee el resultado completo:**

```bash
git pull origin main
cat CLAUDE.md
cat docs/ESTADO.md
ls .cowork/inbox/ 2>/dev/null || echo "(inbox vacío)"
git log --oneline -10
```

Si hay archivos en `.cowork/inbox/`, ábrelos y léelos — contienen instrucciones de la sesión anterior. Después di en voz alta: **"He leído el estado del proyecto. Estamos en: [resumen de 2 líneas de docs/ESTADO.md]."**

---

## PROTOCOLO DE CIERRE — EJECUTAR SIEMPRE AL TERMINAR

**Al final de cada sesión, antes de despedirte:**

### 1. Actualizar `docs/ESTADO.md`
Edita el archivo y:
- Cambia la línea `> Última actualización:` a la fecha de hoy.
- Añade los commits de esta sesión a la tabla de historial.
- Marca como ✅ las tareas completadas en la sección "Pendientes".
- Añade nuevas tareas a "Pendientes" si las hay.

### 2. Crear resumen de sesión (si fue significativa)
```bash
# Crea el archivo docs/SESIONES/YYYY-MM-DD-resumen.md con:
# - Qué se hizo
# - Qué quedó pendiente
# - Cualquier decisión importante tomada
```

### 3. Commit y push
```bash
git add docs/ESTADO.md docs/SESIONES/ 2>/dev/null || git add docs/ESTADO.md
git commit -m "docs: actualizar ESTADO.md sesión $(date +%Y-%m-%d)"
git push origin $(git branch --show-current)
```

**Por qué es crítico:** Si la sesión se cuelga o Claude pierde contexto, la próxima sesión lee `docs/ESTADO.md` como primera acción. Si ese archivo está desactualizado, el agente siguiente trabajará con información obsoleta y puede pisar cambios o duplicar trabajo.

---

## Qué es este proyecto

**Valere CRM v2** — plataforma web para Valere Consultores (consultora energética española). Fusiona:

1. **CRM de ventas**: empresas, contactos, contratos, oportunidades (kanban), actividades, dashboard, incidencias, renovaciones, documentos, calendario.
2. **Calculadora de ofertas energéticas**: captura de facturas, análisis comparativo, propuestas, tracking, chat IA.

**Supabase project:** `gtphkowfcuiqbvfkwjxb` → `https://gtphkowfcuiqbvfkwjxb.supabase.co`
**Repo GitHub:** `jolivares-valere/valere-v2`

---

## Stack

- React 19 + TypeScript 5 + Vite 6
- Tailwind CSS 4 · Supabase JS SDK 2.100.x
- @tanstack/react-query 5 · react-hook-form 7 + zod 4
- sonner (toasts) · recharts (gráficos) · Framer Motion 11

---

## Arquitectura

```
src/features/<dominio>/      # Un directorio por dominio de negocio
  <Dominio>Page.tsx          # Componente de ruta
  api.ts                     # Llamadas a Supabase
  components/                # Componentes privados

src/core/                    # Código transversal
  supabase/client.ts         # Cliente Supabase (único)
  hooks/useAuth.ts           # Auth + roles (única fuente)
  types/entities.ts          # Interfaces de dominio
  components/                # ConfirmDialog, StatusBadge, Skeleton...
  energia/                   # Lógica calculadora
```

**Regla:** Solo existen `src/features/` y `src/core/`. Las carpetas `src/modules/`, `src/lib/`, `src/hooks/` fueron eliminadas.

---

## Estado actual del proyecto (verificar siempre en `docs/ESTADO.md`)

- ✅ 27 fases de fusión CRM + Calculadora completadas
- ✅ FASE 28: Custom fields, Dashboards por rol, Automatizaciones
- ✅ TSC 0 errores · 39 tests · build OK · CI en GitHub Actions
- ✅ RLS granular multitenant (20+ policies activas)
- ⏳ SQL `fase28.6` pendiente de ejecutar en Supabase (fichero: `supabase/migrations/20260422_fase28_6_rls_policies_cleanup.sql`)
- ⏳ Deploy Edge Function `chat-consultor` (instrucciones en `supabase/functions/chat-consultor/README.md`)

---

## Tablas Supabase activas

**Usar:** `user_profiles`, `empresas`, `contactos`, `contratos`, `cups`, `oportunidades`, `actividades`, `propuestas`, `custom_fields_schema`, `custom_fields_values`, `notificaciones`, `documentos`, `eventos`, `facturas`, `retailers`, `retailer_offers`, `proposals`, `global_config`, `boe_regulated_prices`, `incidencias`, `renovaciones`

**NO usar (ya no existen en Supabase):** `clients`, `supply_points`, `users_profile`, `invoice_history`

---

## Convenciones de código

- **Toasts:** `import { toast } from 'sonner'` — en todas las mutaciones.
- **Confirmaciones destructivas:** `ConfirmDialog` de `src/core/components/`, nunca `confirm()`.
- **Estados de carga:** `Skeleton`, nunca spinners fullscreen.
- **Badges:** `StatusBadge` de `src/core/components/StatusBadge.tsx`.
- **TSC 0 errores** antes de cada commit: `npx tsc --noEmit`.
- **39/39 tests** antes de cada commit: `npm test -- --run`.

---

## Comandos del día a día

```bash
npm run dev              # Dev server localhost:5173
npm run build            # Build producción
npx tsc --noEmit         # Type-check (debe dar 0 errores)
npm test -- --run        # Tests (deben pasar 39/39)
```

---

## Archivos clave de memoria

| Archivo | Propósito |
|---------|-----------|
| `CLAUDE.md` | Contexto completo del proyecto |
| `docs/ESTADO.md` | **Estado en tiempo real** — actualizar al cerrar sesión |
| `docs/ROADMAP_FUSION.md` | Roadmap con checklists |
| `docs/DEPLOY.md` | Guía de deploy (Vercel + Cloudflare Tunnel) |
| `.cowork/inbox/` | Mensajes para esta sesión de sesiones anteriores |
| `.cowork/outbox/` | Mensajes que esta sesión deja para la siguiente |

---

## Comunicación entre sesiones (bus de mensajes)

Si necesitas dejar una instrucción para la siguiente sesión (aunque sea solo "revisé X y está bien"), crea:

```
.cowork/outbox/YYYY-MM-DDTHH-MM-SS-descripcion.md
```

Al arrancar, si hay archivos en `.cowork/inbox/`, léelos antes de hacer nada.

---

## Reglas críticas

1. **Nunca tocar** tablas `clients`, `supply_points`, `users_profile` — ya no existen en Supabase.
2. **Nunca usar** `confirm()` nativo — usar `ConfirmDialog`.
3. **Nunca hacer commit** con TSC en error — verificar con `npx tsc --noEmit`.
4. **Nunca hacer push** a `main` directamente — abrir PR desde rama `claude/<descripcion>`.
5. **Siempre actualizar** `docs/ESTADO.md` al cerrar la sesión — es la memoria del proyecto.
