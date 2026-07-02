# Sesión 2026-07-02 (Cowork) — Módulo Suministros en el CRM comercial

## Qué se pidió
Los CUPS (suministros) solo se veían dentro de Potencias (`/potencias/suministros`).
Exponerlos en el CRM comercial: pestaña en la ficha de empresa + entrada de menú global.

## Hecho (código, SIN commit — verificación + commit en terminal de Juan)
No toca base de datos: solo lee de la tabla `cups` existente.

Ficheros NUEVOS (sin BOM, tsc limpio en sandbox):
- `src/features/suministros/api.ts` — `fetchSuministrosByEmpresa(empresaId)` y `fetchAllSuministros()` sobre `cups` (embebido `empresas(nombre)`), tipo `SuministroRow`.
- `src/features/suministros/components/SuministrosTable.tsx` — tabla reutilizable (prop `showEmpresa`). Columnas: CUPS, tarifa, potencia, dirección, comercializadora, FV (☀️ si potencia_fv_kwp/modelo_autoconsumo), Datadis, estado.
- `src/features/suministros/components/SuministrosTab.tsx` — pestaña de la ficha de empresa (useQuery por empresaId).
- `src/features/suministros/SuministrosPage.tsx` — página global `/suministros` con buscador + filtro por empresa.

Ficheros EDITADOS:
- `src/App.tsx` — lazy import + ruta `/suministros` (AuthGuard).
- `src/features/empresas/EmpresaDetailPage.tsx` — nueva pestaña `suministros` (tipo Tab, TAB_LABELS «⚡ Suministros», array tabs, render).
- `src/components/layout/Sidebar.tsx` — ítem «Suministros» (icon Zap) en `crmItems`, tras Contactos.
- `src/core/auth/permissions.ts` — `/^\/suministros(\/|$)/` en whitelist de `asesor_senior` (admin ya tiene `/.*`).
- `docs/help/suministros/ver-suministros.md` — NUEVO (doc RAG).

## Verificación PENDIENTE en terminal de Juan (Windows)
El sandbox no puede validar tsc de forma fiable (mount sirve snapshots truncados de
los ficheros con BOM → falsos "JSX no cerrado"/"unterminated string" en App.tsx,
Sidebar.tsx, permissions.ts, LoginPage, SignupPage). Los ficheros NUEVOS de la feature
suministros dieron 0 errores. Hay que:

1. `git checkout main && git pull origin main && git checkout -b claude/suministros-comercial`
   (o la rama que uses; recuerda: nunca commitear con tsc en error).
2. `npx tsc --noEmit`  → debe dar 0 errores.
3. `npm test -- --run`.
4. Commit + push + PR:
   ```
   git add src/features/suministros src/App.tsx src/features/empresas/EmpresaDetailPage.tsx src/components/layout/Sidebar.tsx src/core/auth/permissions.ts docs/help/suministros
   git commit -m "feat(suministros): exponer CUPS en CRM comercial (pestaña ficha empresa + pagina /suministros)"
   git push origin claude/suministros-comercial
   ```

## Notas de diseño
- Reutiliza `cups`; visible para `asesor_senior` y `admin` (el bloque CRM Comercial del
  sidebar ya se muestra a esos). Telemarketing/analista no lo ven (por diseño).
- La pestaña y la página son de solo lectura. El alta/edición de CUPS sigue en
  Captura de datos / Potencias (no se duplicó).
- Rama de reset de contraseña (`claude/auth-reset-password`) sigue pendiente de commit;
  ver outbox `2026-07-02T11-30-08-flujo-reset-password.md`.
