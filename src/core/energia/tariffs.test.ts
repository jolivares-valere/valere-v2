import { describe, it, expect } from 'vitest';
import { getTariffConfig, validatePowers } from './tariffs';

/**
 * Tests de regresión sobre la estructura de tarifas (normativa CNMC vigente).
 * Bug histórico corregido 2026-06-12:
 *  - 3.0TD tenía 3 periodos de potencia (era la antigua 3.0A, derogada). Son 6.
 *  - validatePowers exigía potencias DECRECIENTES; la Circular 3/2020 exige CRECIENTES.
 */
describe('getTariffConfig — periodos de potencia', () => {
  it('3.0TD tiene 6 periodos de potencia y 6 de energía', () => {
    const c = getTariffConfig('3.0TD');
    expect(c.potencia).toBe(6);
    expect(c.energia).toBe(6);
    expect(c.labels.potencia).toHaveLength(6);
  });

  it('6.1TD–6.4TD tienen 6 periodos de potencia', () => {
    for (const t of ['6.1TD', '6.2TD', '6.3TD', '6.4TD']) {
      expect(getTariffConfig(t).potencia).toBe(6);
    }
  });

  it('2.0TD tiene 2 periodos de potencia', () => {
    expect(getTariffConfig('2.0TD').potencia).toBe(2);
  });
});

describe('validatePowers — regla CRECIENTE (Circular CNMC 3/2020)', () => {
  it('3.0TD acepta potencias crecientes P1 ≤ … ≤ P6', () => {
    const ok = { p1: 30, p2: 30, p3: 35, p4: 35, p5: 40, p6: 50 };
    expect(validatePowers('3.0TD', ok)).toBeNull();
  });

  it('3.0TD rechaza potencias decrecientes', () => {
    const bad = { p1: 50, p2: 40, p3: 30, p4: 30, p5: 30, p6: 30 };
    expect(validatePowers('3.0TD', bad)).toMatch(/crecientes/i);
  });

  it('6.1TD acepta crecientes y rechaza un bajón intermedio', () => {
    expect(validatePowers('6.1TD', { p1: 100, p2: 100, p3: 120, p4: 120, p5: 150, p6: 200 })).toBeNull();
    expect(validatePowers('6.1TD', { p1: 100, p2: 100, p3: 120, p4: 80, p5: 150, p6: 200 })).toMatch(/crecientes/i);
  });

  it('2.0TD exige P1 = P2', () => {
    expect(validatePowers('2.0TD', { p1: 5, p2: 5 })).toBeNull();
    expect(validatePowers('2.0TD', { p1: 5, p2: 6 })).toMatch(/iguales/i);
  });
});
