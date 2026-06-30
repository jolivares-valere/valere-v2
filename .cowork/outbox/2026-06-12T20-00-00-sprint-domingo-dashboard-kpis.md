# Handoff — sprint-domingo-dashboard-kpis

**Fecha**: 2026-06-12
**Autor**: Cowork (sesión paralela sprint domingo)
**Para**: Claude Code (Juan) en la próxima sesión

## Qué hice

Sprint para reforzar el Dashboard CRM con KPIs reales y añadir 3 reportes
nuevos al módulo Informes. Ver `docs/DASHBOARD_KPIS_2026-06-12.md` para el
detalle completo.

Resumen ultracorto:

1. **Dashboard** — bloque "Cartera y operativa" con 4 cards nuevas
   (Suministros bajo gestión, Ahorro entregado, Asistente IA 24h, Alertas
   operativas). Loading skeleton, error y empty states cubiertos en cada una.
2. **Informes** — 3 tabs nuevas: Pipeline, Renovaciones próximas (con ventana
   30/60/90/180), Histórico de propuestas. Todos con filtro por comercial y
   export CSV.
3. **Permisos** — `/informes` ahora bajo `AuthGuard roles=['master', 'manager',
   'admin', 'comercial']`. Sidebar filtra el link por el mismo criterio.
   Whitelist de `asesor_senior` actualizada para mantener acceso.

## Archivos tocados

Ver `docs/DASHBOARD_KPIS_2026-06-12.md` sección "Archivos tocados".

Nada de migraciones, ni Edge Functions, ni features bloqueadas por otros
sprints (auth, admin/PendingUsers, analisis, propuestas-energia, ESIOS/datadis,
generar-propuesta-pptx — intactas).

## Lo que necesito que hagas tú (Claude Code en Windows)

**Importante**: no he podido validar TSC desde el sandbox. El mount Linux del
repo está sirviendo archivos truncados (problema pre-existente — no es de mis
cambios, los archivos en disco Windows están íntegros, verificado con Read).
Por favor ejecuta tú en local:

```powershell
cd C:\Users\joliv\valere-v2
npx tsc --noEmit
npm test -- --run
npm run dev    # validar visualmente en localhost:3000
```

Cosas concretas a comprobar:

1. **TSC a 0 errores**. Si hay alguno en los archivos nuevos:
   - `src/features/dashboard/api.ts` (líneas 386+, sección KPIs sprint domingo)
   - `src/features/dashboard/DashboardPage.tsx` (cards nuevas al final)
   - `src/features/informes/api.ts` (queries pipeline/renovaciones/propuestas)
   - `src/features/informes/InformesPage.tsx`
   - `src/features/informes/components/Informe{Pipeline,RenovacionesProximas,PropuestasHist}.tsx`

   Pásalos. Lo más probable: algún `as any` que TSC quiera más estricto, o un
   import sin usar.

2. **Tests pasen 39/39**. No he añadido tests nuevos (no aplicaba, no he tocado
   lógica testeada). Si rompo alguno será efecto colateral.

3. **Visual en `npm run dev`**:
   - Login con jolivares@valereconsultores.com (master).
   - Dashboard: bloque "Cartera y operativa" aparece entre la fila KPIs y
     OMIE. 4 cards con datos reales o estados vacíos según corresponda.
   - Sidebar → Informes: 5 tabs visibles (Comercial mensual, Cartera activa,
     Pipeline, Renovaciones próximas, Histórico propuestas).
   - Cada tab carga, muestra totales y exporta CSV sin error.
   - Logout y login con un usuario sin role permitido → /informes debe
     redirigir a /dashboard.

4. **Si todo OK → commit y push**.

   Sugerencia mensaje:
   ```
   feat(dashboard): KPIs cartera + 3 reportes nuevos (sprint domingo 12 jun)

   - Dashboard: bloque "Cartera y operativa" con 4 cards (Suministros bajo
     gestion, Ahorro entregado, Asistente IA 24h, Alertas operativas).
   - Informes: tabs Pipeline, Renovaciones proximas y Historico propuestas.
   - Permisos: /informes restringido a master/manager/admin/comercial.

   Ver docs/DASHBOARD_KPIS_2026-06-12.md.
   ```

5. **Actualiza `docs/ESTADO.md`** con la fecha 2026-06-12 y el resumen del
   sprint.

## Lo que NO he hecho (deliberadamente)

- No he tocado tablas Supabase (no había necesidad).
- No he añadido SheetJS para export XLSX — CSV cubre el caso. Si quieres XLSX,
  añade SheetJS y crea un `ExportXlsxButton` paralelo a `ExportButton`.
- No he tocado los KPIs/queries existentes del dashboard. Solo añadí encima.
- No he commiteado nada — toca a tu Claude Code CLI cuando valides.

## Bloqueos / decisiones pendientes para Juan

Ninguno crítico. Una decisión opcional de producto:

- El bloque "Cartera y operativa" lo puse justo antes del widget OMIE. Si
  visualmente queda muy cargado o prefieres que vaya más abajo, basta con
  mover el `<section>` en `DashboardPage.tsx` (líneas ~149-160). El bloque es
  totalmente autocontenido.

## Estado actual

- Sandbox: archivos creados/editados correctamente vía `Edit`/`Write` (que
  pasan por el filesystem Windows nativo, no por el mount Linux).
- TSC sandbox no fiable por truncamiento de mount, pero los archivos en disco
  son íntegros — verificado con `Read` en múltiples offsets.
- Datos reales validados contra Supabase prod vía MCP (53 empresas,
  30 oportunidades, 2 contratos activos, 69 CUPS activos, 0 propuestas).
</content>
</invoke>