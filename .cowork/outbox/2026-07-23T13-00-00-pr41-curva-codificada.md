# PR-4.1 · Curva de consumo en pestaña Suministros — CODIFICADA
**Fecha:** 2026-07-23 · **De:** Cowork · **Para:** Juan + auditor
**Rama:** `claude/pr-4-1-curva-consumo` · **Estado BBDD:** migración EN REPO, **NO aplicada** (Juan pidió esperar)

## Qué hace
- Botón **"Ver"** en la columna Curva de la pestaña Suministros (ficha de empresa)
  → panel bajo la tabla con la **gráfica mensual** (agregado en cliente, función
  pura testeada) y **zoom diario** al hacer clic en un mes.
- **🟡 backfill incompleto** si hay meses pasados con huecos o el último dato
  tiene >45 días (mismo umbral que el badge existente de PR-1.5).
- **CSV** del diario completo (separador `;`, coma decimal, BOM para Excel es-ES).
- **Sin datos = aviso honesto** (no error): explica que la curva llega sola con
  la ingesta nocturna si hay autorización.

## Diseño de datos
- `datadis_consumptions` es horaria (~17k filas/CUPS a 23m) → NO se trae al
  navegador. Migración `20260723_pr41_vista_consumos_diarios.sql`: vista
  `v_consumos_diarios` (agregado a día, ≤ ~721 filas/CUPS verificado en BBDD;
  cabe en una query). `security_invoker=true` → manda la RLS de la tabla base
  (admin o comercial dueño). grant authenticated, revoke anon.
- Mes agregado en cliente: `curva.ts` (`agruparPorMes`, `backfillIncompleto`,
  `csvDiario`) con 7 tests nuevos.

## ⚠ Prerequisito de merge
La migración debe aplicarse en producción (OK de Juan pendiente) ANTES del
paseo del auditor; sin la vista, "Ver" muestra el estado de error honesto.

## Ficheros
- `supabase/migrations/20260723_pr41_vista_consumos_diarios.sql` (nueva)
- `src/features/suministros/curva.ts` + `curva.test.ts` (nuevos)
- `src/features/suministros/api.ts` (+fetchConsumosDiarios)
- `src/features/suministros/components/CurvaConsumo.tsx` (nuevo)
- `src/features/suministros/components/SuministrosTable.tsx` (+prop onVerCurva)
- `src/features/suministros/components/SuministrosTab.tsx` (+panel curva)

## CA del plan
- Curva de CHEMTROL visible (verificar en paseo tras aplicar la vista).
- CUPS sin datos → aviso honesto, no error. ✓ por diseño (estado vacío propio).

## Guion del paseo (auditor, tras aplicar migración)
1. Ficha CHEMTROL → Suministros → "Ver" en un CUPS 🟢 → gráfica mensual con
   ~23 meses; clic en un mes → barras diarias; botón Mensual vuelve.
2. Badge 🟡 en un CUPS con huecos (p. ej. …DG0F, datos hasta 30-abr).
3. CSV descarga y abre en Excel con decimales con coma.
4. CUPS sin curva → aviso honesto, cero errores en consola.
5. Con usuario comercial (no admin): solo ve curvas de SUS empresas (RLS).
