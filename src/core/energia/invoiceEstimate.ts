/**
 * invoiceEstimate.ts — Motor de estimación de factura teórica
 *
 * Calcula el importe estimado de una factura de electricidad a partir de
 * precios contractuales (tabla datadis_supply_price_terms) y consumo real
 * de DataDis (normalizeConsumption).
 *
 * Limitaciones documentadas (v1):
 * - Excluye Regularización RRTT Sistema (cargo retroactivo de distribuidora, impredecible)
 * - Excluye energía reactiva (visible en CierresTab)
 * - P4/P5 pueden ser null si no hubo consumo en las facturas de referencia
 * - IEE: aplica mínimo Art. 99.2 Ley 38/1992 según RD-ley 7/2026
 */

import type { TariffPeriod } from '../../features/datadis/periodos30TD'

// ─── Tipos públicos ────────────────────────────────────────────────────────────

/** Fila de datadis_supply_price_terms tal como la devuelve Supabase */
export interface SupplyPriceTerm {
  id: string
  cups: string
  comercializadora: string | null
  tarifa: string
  valid_from: string
  valid_to: string | null
  /** Potencia P1–P6 en cent€/kW/día. NULL = sin dato. */
  potencia_p1_c: number | null
  potencia_p2_c: number | null
  potencia_p3_c: number | null
  potencia_p4_c: number | null
  potencia_p5_c: number | null
  potencia_p6_c: number | null
  /** Energía P1–P6 en cent€/kWh. NULL = sin dato (período sin consumo en factura de referencia). */
  energia_p1_c: number | null
  energia_p2_c: number | null
  energia_p3_c: number | null
  energia_p4_c: number | null
  energia_p5_c: number | null
  energia_p6_c: number | null
  /** IVA: 21 (>10kW) ó 10 (≤10kW con RD-ley 7/2026) */
  iva_pct: number
  /** Alquiler del equipo de medida en €/día (pagado a distribuidora) */
  alquiler_equipo_dia_eur: number | null
  /** Financiación Bono Social en €/día (solo tarifas ≤10 kW) */
  bono_social_dia_eur: number | null
  fuente: string | null
  notas: string | null
}

/** Detalle de un período en la factura estimada */
export interface PeriodDetail {
  /** Cantidad: kW (potencia) o kWh (energía) */
  cantidad: number
  /** Precio en cent€/kW·día o cent€/kWh. NULL = sin dato en price terms */
  precio_c: number | null
  /** Importe en €. NULL si precio_c es null */
  importe: number | null
}

/** Entrada a calculateInvoiceEstimate */
export interface InvoiceEstimateInput {
  priceTerms: SupplyPriceTerm
  /** Consumo en kWh por período (claves uppercase: P1..P6) */
  consumoKWh: Record<TariffPeriod, number>
  /** Potencia contratada en kW por período */
  potenciaKW: Record<TariffPeriod, number>
  /** Días del período de facturación */
  dias: number
}

/** Resultado de calculateInvoiceEstimate */
export interface InvoiceEstimateResult {
  potencia: Record<TariffPeriod, PeriodDetail>
  energia:  Record<TariffPeriod, PeriodDetail>
  terminoFijo:     number   // suma potencia P1..P6
  terminoVariable: number   // suma energía P1..P6
  alquiler:        number   // alquiler equipo
  bonoSocial:      number   // financiación bono social
  iee:             number   // Impuesto Especial sobre Electricidad
  baseIVA:         number   // base imponible IVA
  iva:             number   // cuota IVA
  total:           number   // total estimado
  totalKWh:        number   // suma consumo todos períodos
  /** Avisos sobre datos incompletos */
  warnings: string[]
  /** Calidad de la estimación */
  confianza: 'completa' | 'parcial' | 'baja'
}

// ─── Constantes ────────────────────────────────────────────────────────────────

/** Cuota mínima IEE: Art. 99.2 Ley 38/1992 (reducida pero vigente en RD-ley 7/2026) */
const IEE_MIN_EUR_MWH = 1.0
/** Tipo general IEE reducido por RD-ley 7/2026 de 20 de marzo */
const IEE_RATE        = 0.005

const ALL_PERIODS: TariffPeriod[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']

// ─── Función principal ─────────────────────────────────────────────────────────

/**
 * Calcula la factura teórica estimada.
 *
 * Fórmula:
 *   Término fijo      = Σ(kW_Pi × días × pot_price_Pi / 100)
 *   Término variable  = Σ(kWh_Pi × eng_price_Pi / 100)
 *   Alquiler          = dias × alquiler_dia
 *   IEE               = max(normal: (fijo+var) × 0.5%, mínimo: kWh_total / 1000 × 1 €/MWh)
 *   IVA               = (fijo + var + alquiler + bonoSocial + IEE) × iva_pct%
 *   TOTAL             = base_IVA + IVA
 *
 * No incluye: Reg. RRTT Sistema, energía reactiva, maxímetros ni penalizaciones.
 */
export function calculateInvoiceEstimate(input: InvoiceEstimateInput): InvoiceEstimateResult {
  const { priceTerms: pt, consumoKWh, potenciaKW, dias } = input
  const warnings: string[] = []

  // ── Término de potencia ────────────────────────────────────────────────────
  const potencia = {} as Record<TariffPeriod, PeriodDetail>
  let terminoFijo = 0

  for (const p of ALL_PERIODS) {
    const kw      = potenciaKW[p] ?? 0
    const precio_c = pt[`potencia_${p.toLowerCase()}_c` as keyof SupplyPriceTerm] as number | null
    const importe  = precio_c != null ? (kw * dias * precio_c) / 100 : null

    potencia[p] = { cantidad: kw, precio_c, importe }
    if (importe != null) terminoFijo += importe
    else if (kw > 0)    warnings.push(`Sin precio de potencia para ${p}`)
  }

  // ── Término de energía ─────────────────────────────────────────────────────
  const energia = {} as Record<TariffPeriod, PeriodDetail>
  let terminoVariable = 0
  let totalKWh        = 0

  for (const p of ALL_PERIODS) {
    const kwh      = consumoKWh[p] ?? 0
    const precio_c = pt[`energia_${p.toLowerCase()}_c` as keyof SupplyPriceTerm] as number | null
    const importe  = precio_c != null ? (kwh * precio_c) / 100 : null

    energia[p] = { cantidad: kwh, precio_c, importe }
    if (importe != null) terminoVariable += importe
    else if (kwh > 0)   warnings.push(`Sin precio de energía para ${p} (${kwh.toFixed(0)} kWh sin estimar)`)

    totalKWh += kwh
  }

  // ── Cargos fijos diarios ───────────────────────────────────────────────────
  const alquiler   = pt.alquiler_equipo_dia_eur  != null ? pt.alquiler_equipo_dia_eur  * dias : 0
  const bonoSocial = pt.bono_social_dia_eur       != null ? pt.bono_social_dia_eur       * dias : 0

  // ── IEE ───────────────────────────────────────────────────────────────────
  // Base = potencia + energía (excluye alquiler y RRTT per normativa Supabase)
  const ieeNormal = (terminoFijo + terminoVariable) * IEE_RATE
  const ieeMinimo = (totalKWh / 1000) * IEE_MIN_EUR_MWH
  const iee       = Math.max(ieeNormal, ieeMinimo)

  // ── IVA ───────────────────────────────────────────────────────────────────
  const baseIVA = terminoFijo + terminoVariable + alquiler + bonoSocial + iee
  const iva     = baseIVA * (pt.iva_pct / 100)
  const total   = baseIVA + iva

  // ── Confianza ─────────────────────────────────────────────────────────────
  const missingWithConsumption = ALL_PERIODS.filter(p => {
    const kwh      = consumoKWh[p] ?? 0
    const precio_c = pt[`energia_${p.toLowerCase()}_c` as keyof SupplyPriceTerm] as number | null
    return kwh > 0 && precio_c == null
  })

  const confianza: InvoiceEstimateResult['confianza'] =
    missingWithConsumption.length === 0
      ? 'completa'
      : missingWithConsumption.length === 1
      ? 'parcial'
      : 'baja'

  return {
    potencia,
    energia,
    terminoFijo,
    terminoVariable,
    alquiler,
    bonoSocial,
    iee,
    baseIVA,
    iva,
    total,
    totalKWh,
    warnings,
    confianza,
  }
}

// ─── Helpers de formato ────────────────────────────────────────────────────────

/** Formatea un importe en € con 2 decimales, o "—" si null */
export function fmtEur(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

/** Formatea un precio en cent€ con 4 decimales, o "—" si null */
export function fmtCentEur(c: number | null | undefined): string {
  if (c == null) return '—'
  return c.toLocaleString('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + ' c€'
}
