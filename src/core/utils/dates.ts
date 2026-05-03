export type DateFormat = 'short' | 'long' | 'relative'

export function formatDate(
  date: string | Date | null | undefined,
  format: DateFormat = 'short',
): string {
  if (!date) return '—'
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '—'
  if (format === 'relative') return formatRelative(d)
  const opts: Intl.DateTimeFormatOptions =
    format === 'long'
      ? { day: 'numeric', month: 'long', year: 'numeric' }
      : { day: '2-digit', month: '2-digit', year: 'numeric' }
  return new Intl.DateTimeFormat('es-ES', opts).format(d)
}

function formatRelative(d: Date): string {
  const diff = d.getTime() - Date.now()
  const days = Math.round(diff / 86_400_000)
  const rtf = new Intl.RelativeTimeFormat('es-ES', { numeric: 'auto' })
  if (Math.abs(days) >= 1) return rtf.format(days, 'day')
  const hours = Math.round(diff / 3_600_000)
  if (Math.abs(hours) >= 1) return rtf.format(hours, 'hour')
  const minutes = Math.round(diff / 60_000)
  return rtf.format(minutes, 'minute')
}

export function formatDateRange(
  inicio: string | null | undefined,
  fin: string | null | undefined,
): string {
  if (!inicio && !fin) return '—'
  if (!inicio) return `hasta ${formatDate(fin)}`
  if (!fin) return `desde ${formatDate(inicio)}`
  return `${formatDate(inicio)} — ${formatDate(fin)}`
}

export function parseCSVDate(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed + 'T00:00:00')
    return isNaN(d.getTime()) ? null : trimmed
  }
  const m = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (!m) return null
  const [, dd, mm, yyyy] = m
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  if (isNaN(d.getTime())) return null
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

/** Alias de formatDate para compatibilidad con codigo de Potencias migrado desde POT */
export const formatFecha = formatDate
