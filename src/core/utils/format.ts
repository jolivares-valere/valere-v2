/** Format number as EUR currency */
export function formatEur(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' €'
}

/** Format number as percentage */
export function formatPct(value: number | null | undefined, decimals = 1): string {
  return (value ?? 0).toFixed(decimals) + '%'
}

/** Safe number — returns 0 for null/undefined/NaN */
export function safeNum(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Safe array — returns array of specified length filled with 0 */
export function safeArray(arr: unknown, length = 6): number[] {
  if (Array.isArray(arr) && arr.length >= length) {
    return arr.slice(0, length).map(safeNum)
  }
  return new Array(length).fill(0)
}

/** Generate CSV content from rows */
export function generateCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  return [
    headers.map(escape).join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ].join('\n')
}

/** Download blob as file */
export function downloadFile(content: string, filename: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}
