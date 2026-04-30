import type { PowerValues, RegulatedRate, TariffType } from '@/core/types/entities';

/**
 * Detalle de ahorro por periodo individual
 */
export interface PeriodSavingDetail {
  period: string;       // P1, P2, ...
  kwActual: number;
  kwNueva: number;
  diffKw: number;       // kwActual - kwNueva
  rateEurKwDay: number; // precio €/kW/día
  dias: number;
  ahorro: number;       // diffKw * rate * dias
}

/**
 * Resultado detallado del cálculo de ahorro
 */
export interface SavingsResult {
  byPeriod: Record<string, number>;
  details: PeriodSavingDetail[];
  total: number;
  dias: number;
}

/**
 * Calcula el ahorro por periodo para una bajada de potencia
 *
 * Formula: AHORRO[Pn] = (kW_actual - kW_nueva) x tarifa_eur_kw_dia x dias
 */
export function calculateSavingsByPeriod(
  actuales: PowerValues,
  nuevas: PowerValues,
  rates: Record<string, number>, // { P1: rate, P2: rate, ... }
  dias: number
): SavingsResult {
  const periods = ['p1', 'p2', 'p3', 'p4', 'p5'] as const;
  const byPeriod: Record<string, number> = {};
  const details: PeriodSavingDetail[] = [];
  let total = 0;

  for (const p of periods) {
    const periodKey = p.toUpperCase(); // P1, P2, etc.
    const rate = rates[periodKey] || 0;
    const diff = actuales[p] - nuevas[p];
    const ahorro = diff * rate * dias;
    byPeriod[periodKey] = Math.round(ahorro * 100) / 100;
    total += ahorro;

    details.push({
      period: periodKey,
      kwActual: actuales[p],
      kwNueva: nuevas[p],
      diffKw: Math.round(diff * 100) / 100,
      rateEurKwDay: rate,
      dias,
      ahorro: Math.round(ahorro * 100) / 100,
    });
  }

  return {
    byPeriod,
    details,
    total: Math.round(total * 100) / 100,
    dias,
  };
}

/**
 * Calcula dias entre dos fechas
 */
export function daysBetween(from: Date, to: Date): number {
  const diff = to.getTime() - from.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Convierte un array de RegulatedRate a un map { P1: rate, P2: rate, ... }
 * para una tarifa y fecha dadas
 */
export function ratesToMap(
  rates: RegulatedRate[],
  tariffType: TariffType,
  date: Date = new Date()
): Record<string, number> {
  const map: Record<string, number> = {};
  const dateStr = date.toISOString().split('T')[0];

  for (const rate of rates) {
    if (rate.tariff_type !== tariffType) continue;
    if (rate.valid_from > dateStr) continue;
    if (rate.valid_to && rate.valid_to < dateStr) continue;
    map[rate.period] = rate.rate_eur_kw_day;
  }

  return map;
}

/**
 * Formatea un numero como moneda EUR
 */
export function formatEUR(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatea kW con 2 decimales
 */
export function formatKW(kw: number): string {
  return `${kw.toFixed(2)} kW`;
}
