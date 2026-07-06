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

/**
 * Exporta una matriz (cabeceras + filas) a .xlsx con columnas reales,
 * anchos de columna auto-ajustados y autofilter (desplegables de filtro).
 * Pensado para ExportButton: el archivo abre directo en columnas sin depender
 * de la configuración regional de Excel (que rompe el CSV separado por comas).
 */
export function downloadMatrixAsExcel(
  headers: string[],
  rows: (string | number | null | undefined)[][],
  fileName = 'export.xlsx',
  sheetName = 'Datos',
): void {
  const aoa: (string | number)[][] = [
    headers,
    ...rows.map(r => r.map(v => (v == null ? '' : v))),
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Ancho por columna = mayor longitud de contenido (con margen y tope 8..50)
  ws['!cols'] = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map(r => String(r[i] ?? '').length),
    )
    return { wch: Math.min(Math.max(maxLen + 2, 8), 50) }
  })

  // Autofilter sobre todo el rango (fila 1 = cabeceras)
  const lastCol = XLSX.utils.encode_col(headers.length - 1)
  ws['!autofilter'] = { ref: `A1:${lastCol}${aoa.length}` }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, fileName)
}
