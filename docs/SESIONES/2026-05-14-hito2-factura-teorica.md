# Sesión 2026-05-14 (4ª parte) — Hito 2: Factura Teórica v1

## Qué se hizo

### 1. Análisis de 5 facturas PDF reales (CHEMTROL ESPAÑOLA SA, marzo 2026)
- Extraídos precios P1-P6 potencia (cent€/kW/día) y energía (cent€/kWh)
- 3×3.0TD Nexus Energía: precios idénticos (misma comercializadora + tarifa)
  · P4/P5 energía NULL: ningún CUPS con consumo en esos períodos en la factura de referencia
  · IVA 21% (pot. contratada 15,01 kW > 10 kW)
- 1×2.0TD Naturgy Plan Fijo Luz 24h: precio plano para punta/llano/valle, IVA 10%
- 1×6.1TD Bassols ECOSMART BASE FIJO: potencia solo peajes, energía total, IVA 10%

### 2. Migration SQL: `datadis_supply_price_terms`
- Tabla con potencia_p1_c..p6_c, energia_p1_c..p6_c, iva_pct, alquiler, bono_social
- Índice único `(cups) WHERE valid_to IS NULL` — garantiza una fila activa por CUPS
- RLS: authenticated puede hacer todo (policy simple para FASE actual)
- **Aplicada en Supabase prod** (gtphkowfcuiqbvfkwjxb) vía MCP

### 3. Motor de cálculo `src/core/energia/invoiceEstimate.ts`
- Función pura `calculateInvoiceEstimate({ priceTerms, consumoKWh, potenciaKW, dias })`
- IEE: max(0.5% de base, 1€/MWh × totalKWh) per Art. 99.2 Ley 38/1992 (RD-ley 7/2026)
- IVA: directo de `priceTerms.iva_pct` (10% o 21%)
- Confianza: 'completa' (0 gaps) / 'parcial' (1 gap con consumo) / 'baja' (2+ gaps)
- Helpers fmtEur(), fmtCentEur()

### 4. Hook `useSupplyPriceTerms` en `api.ts`
- Cache 24h, filtra `valid_to IS NULL`, `.maybeSingle()` → null si no configurado
- Cast `(supabase as any)` porque `datadis_supply_price_terms` no está en tipos generados

### 5. Tab "Factura Teórica" en SupplyDetailPage
- Selector mes (más reciente por defecto)
- Badge confianza estimación
- Tabla desglose: potencia P1-P6, subtotal fijo; energía P1-P6, subtotal variable; alquiler, bonoSocial, IEE, IVA, TOTAL ESTIMADO
- 3 KPIs: consumo total kWh, precio medio energía c€/kWh, coste todo incluido c€/kWh
- Nota legal: excluye Reg. RRTT Sistema y energía reactiva
- React Query deduplica con ConsumoTab (mismos params + cache 6h compartido = 0 peticiones extra)

## Incidencias resueltas

### Desync filesystem Linux mount vs. Windows
- El archivo SupplyDetailPage.tsx (1817 líneas en Windows) aparecía truncado en el mount Linux (1453 líneas)
- Causa: sesión anterior escribió vía Edit tool a Windows; el mount Linux tenía versión stale
- Fix: Python script leyó el mount truncado, reconstruyó el tail correcto desde contexto, escribió al mount
- Similar truncación en api.ts (314 vs 352 líneas) — mismo fix

### Bugs corregidos
- `m.totalKWh` → `m.totalKwh` (interfaz ConsumoMonthlyAgg usa camelCase con w minúscula)
- Cast `(supabase as any)` para tabla nueva no en tipos generados

## Commit
- `60ab260` — `feat(datadis): Hito 2 — Factura Teórica v1`
- 4 archivos: +invoiceEstimate.ts, +20260514_hito2_supply_price_terms.sql, ~SupplyDetailPage.tsx, ~api.ts

## Pendiente próxima sesión

1. **CRÍTICO**: `git push origin main` desde PowerShell de Juan (commit `60ab260` local, no pusheado)
2. SQL fase28.6 sigue pendiente de ejecutar (ver supabase/migrations/20260422_fase28_6_rls_policies_cleanup.sql)
3. Regenerar tipos Supabase para incluir `datadis_supply_price_terms` (eliminaría el cast `as any`)
4. Calibrar precios para CUPS adicionales que Juan añada en el futuro (UI de gestión `datadis_supply_price_terms`)
