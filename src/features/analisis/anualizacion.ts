/**
 * Factor de anualización: extrapola un coste medido en `billedDays` a 365 días.
 * Evita el error clásico de comparar el coste de 1-2 facturas (parcial) contra
 * un coste presentado como "anual". Tanto el histórico como la simulación se
 * normalizan con el MISMO factor, de modo que el % de ahorro es siempre correcto.
 */
export function annualizeFactor(billedDays: number): number {
  return billedDays > 0 ? 365 / billedDays : 1;
}
