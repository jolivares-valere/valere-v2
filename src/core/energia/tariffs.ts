// ============================================================
// VALERE v2 — Configuración de Tarifas Eléctricas (Normativa española)
// Single source of truth para periodos por tarifa
// ============================================================

export interface TariffConfig {
  potencia: number;  // Number of power periods
  energia: number;   // Number of energy periods
  labels: {
    potencia: string[];  // P1, P2, ...
    energia: string[];   // E1, E2, ...
  };
}

export const TARIFF_PERIODS: Record<string, TariffConfig> = {
  '2.0TD': {
    potencia: 2,
    energia: 3,
    labels: {
      potencia: ['P1', 'P2'],
      energia: ['E1', 'E2', 'E3'],
    },
  },
  '3.0TD': {
    potencia: 3,
    energia: 6,
    labels: {
      potencia: ['P1', 'P2', 'P3'],
      energia: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'],
    },
  },
  '6.1TD': {
    potencia: 6,
    energia: 6,
    labels: {
      potencia: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
      energia: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'],
    },
  },
  '6.2TD': {
    potencia: 6,
    energia: 6,
    labels: {
      potencia: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
      energia: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'],
    },
  },
  '6.3TD': {
    potencia: 6,
    energia: 6,
    labels: {
      potencia: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
      energia: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'],
    },
  },
  '6.4TD': {
    potencia: 6,
    energia: 6,
    labels: {
      potencia: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
      energia: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'],
    },
  },
};

export function getTariffConfig(tariff: string): TariffConfig {
  return TARIFF_PERIODS[tariff] || TARIFF_PERIODS['2.0TD'];
}

/** Validate powers according to Spanish regulation */
export function validatePowers(tariff: string, powers: Record<string, number>): string | null {
  const config = getTariffConfig(tariff);

  if (tariff === '2.0TD') {
    if (powers.p1 !== powers.p2 && powers.p1 > 0 && powers.p2 > 0) {
      return 'En tarifa 2.0TD, P1 y P2 deben ser iguales (potencia única).';
    }
  } else if (tariff === '3.0TD') {
    if (powers.p1 < powers.p2 || powers.p2 < powers.p3) {
      return 'En tarifa 3.0TD, las potencias deben cumplir: P1 ≥ P2 ≥ P3.';
    }
  } else if (tariff.startsWith('6.')) {
    for (let i = 1; i < config.potencia; i++) {
      const current = powers[`p${i}`] || 0;
      const next = powers[`p${i + 1}`] || 0;
      if (current < next) {
        return `En tarifa ${tariff}, las potencias deben ser decrecientes: P${i} (${current} kW) ≥ P${i + 1} (${next} kW).`;
      }
    }
  }
  return null;
}

/** Validate CUPS format (Spanish standard) */
export function validateCUPS(cups: string): string | null {
  if (!cups) return 'CUPS es obligatorio';
  const cupsRegex = /^ES\d{16}[A-Z]{2}$/;
  if (!cupsRegex.test(cups.toUpperCase())) {
    return 'Formato CUPS incorrecto. Debe ser ES + 16 dígitos + 2 letras (ej: ES0021000000000001AB)';
  }
  return null;
}

export const ALL_TARIFFS = ['2.0TD', '3.0TD', '6.1TD', '6.2TD', '6.3TD', '6.4TD'];
