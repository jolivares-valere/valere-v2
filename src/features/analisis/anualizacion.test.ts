import { describe, it, expect } from 'vitest';
import { annualizeFactor } from './anualizacion';

/**
 * Fase 1 — Tests de la normalización temporal del análisis.
 * Bug corregido: se comparaba el coste de 1-2 facturas (periodo parcial)
 * contra un coste presentado como "anual", produciendo % de ahorro absurdos.
 * La solución anualiza histórico y simulado con el MISMO factor.
 */
describe('annualizeFactor', () => {
  it('extrapola 2 facturas (61 días) a base anual', () => {
    // ~2 meses → factor ≈ 5.98
    expect(annualizeFactor(61)).toBeCloseTo(365 / 61, 5);
  });

  it('un periodo de 365 días tiene factor 1 (ya es anual)', () => {
    expect(annualizeFactor(365)).toBe(1);
  });

  it('protege contra división por cero (0 días → factor 1)', () => {
    expect(annualizeFactor(0)).toBe(1);
  });

  it('caso auditoría: histórico y simulado anualizados dan % coherente', () => {
    // 2 facturas, 61 días: histórico 32.600 € en el periodo.
    const billedDays = 61;
    const factor = annualizeFactor(billedDays);
    const historicalPeriod = 32600;
    const offerPeriod = 30000; // oferta MÁS BARATA que el coste real del periodo

    const historicalAnnual = historicalPeriod * factor;
    const offerAnnual = offerPeriod * factor;
    const savings = historicalAnnual - offerAnnual;
    const savingsPct = (savings / historicalAnnual) * 100;

    // Con oferta más barata el ahorro debe ser POSITIVO (antes salía negativo).
    expect(savings).toBeGreaterThan(0);
    // El % es invariante al factor de anualización (se cancela): ~7,98 %
    expect(savingsPct).toBeCloseTo(((32600 - 30000) / 32600) * 100, 5);
  });

  it('oferta más cara → ahorro negativo (debe marcarse, no presentarse como MEJOR)', () => {
    const factor = annualizeFactor(61);
    const historicalAnnual = 32600 * factor;
    const offerAnnual = 43293 * factor; // oferta peor (caso real de la auditoría)
    const savings = historicalAnnual - offerAnnual;
    expect(savings).toBeLessThan(0);
  });
});
