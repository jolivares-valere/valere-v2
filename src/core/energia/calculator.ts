// ============================================================
// VALERE v2 — Energy Invoice Simulation Calculator
// Hardened: all inputs validated, no crash possible
// ============================================================

import type {
  SupplyPoint,
  RetailerOffer,
  BoeRegulatedPrice,
  InvoiceData,
  InvoiceSimulationResult
} from '@/types/database';
import { safeNum, safeArray } from '@/core/utils/format';
import { getTariffConfig } from './tariffs';

interface SimulationParams {
  supplyPoint: SupplyPoint | null;
  invoiceData: InvoiceData | null;
  offer: RetailerOffer | null;
  boePrices: BoeRegulatedPrice[];
  globalConfig: Record<string, number>;
}

/**
 * Simulates an energy invoice for a given supply point, offer and period.
 *
 * All inputs are defensively validated — passing null/undefined for any
 * parameter will NOT crash; it will return a zero-value result.
 */
export function calculateSimulatedInvoice(params: SimulationParams): InvoiceSimulationResult {
  // === DEFENSIVE INPUT VALIDATION ===
  const supplyPoint = params.supplyPoint;
  const invoiceData = params.invoiceData;
  const offer = params.offer;
  const boePrices = Array.isArray(params.boePrices) ? params.boePrices : [];
  const globalConfig = params.globalConfig || {};

  const consumption_p = safeArray(invoiceData?.consumption_p);
  const surplus_kwh = safeNum(invoiceData?.surplus_kwh);
  const billed_days = safeNum(invoiceData?.billed_days) || 30;

  const powers = supplyPoint?.powers || { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 };
  const tariff = supplyPoint?.tariff || '';
  const pvPowerKwp = safeNum(supplyPoint?.pv_power_kwp);
  const fvInstallationCost = safeNum(supplyPoint?.fv_installation_cost_eur);
    const tariffCfg = getTariffConfig(tariff);

  const offerEnergyPrices = safeArray(offer?.energy_prices);
  const offerPowerPrices = safeArray(offer?.power_prices);
  const surplusModel = offer?.surplus_model || '';
  const surplusPricePerKwh = safeNum(offer?.surplus_price_per_kwh);
  const batteryFeePerKwp = safeNum(offer?.battery_fee_per_kwp_eur);
  const tenderFeePct = safeNum(offer?.tender_fee_pct);
  const allowZeroInvoice = offer?.allow_zero_invoice ?? false;

  const DAYS_IN_YEAR = 365;
  const DAYS_IN_MONTH = 30;

  // === 1. POWER TERM (Fixed cost) ===
  const power_periods: number[] = [];
  let totalPowerCost = 0;

  const boePowerPrices = boePrices.filter(
    p => p.tariff === tariff && p.period.startsWith('P') && !p.period.includes('E')
  );

  for (let i = 0; i < tariffCfg.potencia; i++) {
    const periodKey = `p${i + 1}` as keyof typeof powers;
    const powerKw = safeNum(powers[periodKey]);
    const boePrice = boePowerPrices.find(p => p.period === `P${i + 1}`)?.price ?? 0;
    const offerPrice = offerPowerPrices[i];

    const cost = powerKw * (boePrice + offerPrice) * (billed_days / DAYS_IN_YEAR);
    power_periods.push(cost);
    totalPowerCost += cost;
  }

  // === 2. REGULATED ENERGY TERM (Peajes + Cargos BOE) ===
  const regulated_energy_periods: number[] = [];
  let totalRegulatedEnergy = 0;

  const boeEnergyPrices = boePrices.filter(
    p => p.tariff === tariff && p.period.startsWith('P') && p.period.includes('E')
  );

  for (let i = 0; i < tariffCfg.energia; i++) {
    const consumption = consumption_p[i];
    const boePrice = boeEnergyPrices.find(p => p.period === `P${i + 1}E`)?.price ?? 0;
    const cost = consumption * boePrice;
    regulated_energy_periods.push(cost);
    totalRegulatedEnergy += cost;
  }

  // === 3. FREE MARKET ENERGY TERM ===
  const free_energy_periods: number[] = [];
  let totalFreeEnergy = 0;
  const isSilver = surplusModel === 'gestion_silver';

  for (let i = 0; i < tariffCfg.energia; i++) {
    const consumption = consumption_p[i];
    const price = isSilver ? 0 : offerEnergyPrices[i];
    const cost = consumption * price;
    free_energy_periods.push(cost);
    totalFreeEnergy += cost;
  }

  // === 4. BATTERY FEE ===
  const batteryFee = pvPowerKwp * batteryFeePerKwp * (billed_days / DAYS_IN_MONTH);

  // === 5. SURPLUS DISCOUNT ===
  let surplusDiscount = surplus_kwh * surplusPricePerKwh;

  // === 6. TENDER FEE (pro-rated monthly) ===
  const tenderFeeMonthly = (fvInstallationCost * tenderFeePct / 100) / 12;

  // === 7. TOTALS WITH FLOOR LOGIC ===
  const subtotalBeforeSurplus = totalPowerCost + totalRegulatedEnergy + totalFreeEnergy + batteryFee + tenderFeeMonthly;
  const fixedAndRegulated = totalPowerCost + totalRegulatedEnergy + batteryFee + tenderFeeMonthly;

  if (!allowZeroInvoice) {
    const maxDiscount = Math.max(0, subtotalBeforeSurplus - fixedAndRegulated);
    surplusDiscount = Math.min(surplusDiscount, maxDiscount);
  } else {
    surplusDiscount = Math.min(surplusDiscount, subtotalBeforeSurplus);
  }

  const subtotal = Math.max(0, subtotalBeforeSurplus - surplusDiscount);

  // === 8. TAXES ===
  const ieePct = safeNum(globalConfig.iee_pct) || 5.1127;
  const vatPct = safeNum(globalConfig.vat_pct) || 21;
  const iee = subtotal * (ieePct / 100);
  const iva = (subtotal + iee) * (vatPct / 100);
  const total = subtotal + iee + iva;

  return {
    total_eur: total,
    breakdown: {
      power_fixed_eur: totalPowerCost,
      energy_regulated_eur: totalRegulatedEnergy,
      energy_free_eur: totalFreeEnergy,
      battery_fee_eur: batteryFee,
      tender_fee_eur: tenderFeeMonthly,
      subtotal_eur: subtotal,
      iee_eur: iee,
      iva_eur: iva,
      surplus_discount_eur: surplusDiscount,
    },
    details: {
      power_periods,
      regulated_energy_periods,
      free_energy_periods,
    },
  };
}

/**
 * Distributes annual consumption (kWh) into 6 periods based on
 * the supply point's e1-e6 ratios. If no ratios exist, all goes to P1.
 */
export function distributeConsumption(
  totalKwh: number,
  supplyPoint: SupplyPoint | null
): number[] {
  if (!supplyPoint) return [totalKwh, 0, 0, 0, 0, 0];

  const periods = [
    safeNum(supplyPoint.e1_kwh),
    safeNum(supplyPoint.e2_kwh),
    safeNum(supplyPoint.e3_kwh),
    safeNum(supplyPoint.e4_kwh),
    safeNum(supplyPoint.e5_kwh),
    safeNum(supplyPoint.e6_kwh),
  ];

  const annualTotal = periods.reduce((a, b) => a + b, 0);

  if (annualTotal > 0) {
    return periods.map(p => totalKwh * (p / annualTotal));
  }

  // Fallback: all consumption in P1
  return [totalKwh, 0, 0, 0, 0, 0];
}
