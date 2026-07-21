/**
 * Regla de periodos por tarifa de acceso (PR-3.2, leccion BLUENET: los periodos
 * que no aplican quedan NULL, nunca 0 inventado).
 * - 2.0TD: 2 potencias (P1-P2) + 3 energias (P1-P3)
 * - resto (3.0TD, 6.1TD, ...): 6 + 6
 */
export interface PeriodosTarifa {
  potencias: number
  energias: number
}

export function periodosPorTarifa(tarifa: string | null | undefined): PeriodosTarifa {
  if (tarifa && tarifa.trim().toUpperCase() === '2.0TD') {
    return { potencias: 2, energias: 3 }
  }
  return { potencias: 6, energias: 6 }
}

export const TARIFAS_ASISTENTE = ['2.0TD', '3.0TD', '6.1TD'] as const
