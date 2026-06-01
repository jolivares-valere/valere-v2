/**
 * Sprint 2026-05-19 Hallazgo #3: utilidad para exportar tabla a Excel.
 * Usa SheetJS (xlsx) que ya está en lockfile del proyecto.
 */

import * as XLSX from 'xlsx'

export type Column<T> = {
  /** Cabecera visible en Excel */
  header: string
  /** Selector del valor — string key o función */
  accessor: keyof T | ((row: T) => unknown)
  /** Formato opcional (ej. fechas) */
  format?: (value: unknown) => string | number | null
}

export function exportToExcel<T extends Record<string, unknown>>(
  rows: T[],
  columns: Column<T>[],
  fileName = 'export.xlsx',
  sheetName = 'Datos',
): void {
  const data = rows.map(r => {
    const out: Record<string, unknown> = {}
    for (const col of columns) {
      const raw = typeof col.accessor === 'function'
        ? col.accessor(r)
        : (r as Record<string, unknown>)[col.accessor as string]
      out[col.header] = col.format ? col.format(raw) : (raw ?? '')
    }
    return out
  })
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, fileName)
}
