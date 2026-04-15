import type {
  Contrato,
  EstadoContrato,
  PrioridadRenovacion,
} from '../types/entities'

const CUPS_REGEX = /^ES\d{16}[A-Z]{2}([A-Z0-9]{2})?$/

export function validateCUPS(cups: string | null | undefined): boolean {
  if (!cups) return false
  return CUPS_REGEX.test(cups.trim().toUpperCase())
}

export function formatCUPS(cups: string | null | undefined): string {
  return (cups ?? '').replace(/\s+/g, '').toUpperCase()
}

export function calcDiasVencimiento(fechaFin: string | Date | null | undefined): number {
  if (!fechaFin) return 0
  const fin = fechaFin instanceof Date ? new Date(fechaFin) : new Date(fechaFin)
  if (isNaN(fin.getTime())) return 0
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  fin.setHours(0, 0, 0, 0)
  return Math.round((fin.getTime() - hoy.getTime()) / 86_400_000)
}

export function calcPrioridad(dias: number): PrioridadRenovacion {
  if (dias <= 15) return 'critica'
  if (dias <= 30) return 'alta'
  if (dias <= 60) return 'media'
  if (dias <= 90) return 'baja'
  return 'ok'
}

export function calcEstadoReal(
  contrato: Pick<Contrato, 'estado' | 'fecha_fin'>,
): EstadoContrato {
  if (contrato.estado === 'activo' && contrato.fecha_fin) {
    if (calcDiasVencimiento(contrato.fecha_fin) < 0) return 'vencido'
  }
  return contrato.estado
}

export function necesitaRenovacion(
  contrato: Pick<Contrato, 'estado' | 'fecha_fin'>,
): boolean {
  if (contrato.estado !== 'activo') return false
  return calcDiasVencimiento(contrato.fecha_fin) <= 90
}

export function formatComision(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return '—'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor)
}

export function normalizarNIF(nif: string | null | undefined): string {
  return (nif ?? '').replace(/[\s-]/g, '').toUpperCase()
}
