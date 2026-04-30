// ============================================================
// Parser de Excel/CSV para importacion multi-suministro.
// Soporta .xlsx, .xls y .csv. Heuristicas de auto-deteccion
// de columnas por nombre y mapeo manual cuando no reconoce.
// ============================================================
import * as XLSX from 'xlsx';

// Campos del sistema (supplies) que se pueden mapear desde el Excel
export const SUPPLY_FIELDS: { key: SupplyField; label: string; required?: boolean; example?: string }[] = [
  { key: 'cups',                    label: 'CUPS',                       required: true, example: 'ES0021000000000000XX' },
  { key: 'denominacion',            label: 'Denominacion',               example: 'Tienda centro' },
  { key: 'direccion_suministro',    label: 'Direccion del suministro',   example: 'C/ Mayor, 23' },
  { key: 'ciudad_suministro',       label: 'Ciudad del suministro' },
  { key: 'tariff_type',             label: 'Tarifa',                     required: true, example: '3.0TD' },
  { key: 'distribuidora',           label: 'Distribuidora',              example: 'EDISTRIBUCION' },
  { key: 'comercializadora',        label: 'Comercializadora (texto)' },
  { key: 'tension_kv',              label: 'Tension (kV)' },
  { key: 'p1_kw',                   label: 'Potencia P1 (kW)',           required: true },
  { key: 'p2_kw',                   label: 'Potencia P2 (kW)',           required: true },
  { key: 'p3_kw',                   label: 'Potencia P3 (kW)',           required: true },
  { key: 'p4_kw',                   label: 'Potencia P4 (kW)',           required: true },
  { key: 'p5_kw',                   label: 'Potencia P5 (kW)',           required: true },
  { key: 'p6_kw',                   label: 'Potencia P6 (kW)',           required: true },
];

export type SupplyField =
  | 'cups' | 'denominacion' | 'direccion_suministro' | 'ciudad_suministro'
  | 'tariff_type' | 'distribuidora' | 'comercializadora' | 'tension_kv'
  | 'p1_kw' | 'p2_kw' | 'p3_kw' | 'p4_kw' | 'p5_kw' | 'p6_kw';

export interface ParsedExcel {
  sheetNames: string[];
  activeSheet: string;
  headers: string[];        // cabeceras detectadas (fila headerRow)
  rows: Record<string, any>[]; // filas con claves = headers
  totalRows: number;
  headerRow: number;        // 1-based
}

/** Lee un archivo Excel/CSV y devuelve la hoja activa parseada. */
export async function parseExcelFile(file: File, opts: { sheetName?: string; headerRow?: number } = {}): Promise<ParsedExcel> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false, cellNF: false });
  const sheetNames = wb.SheetNames;
  const activeName = opts.sheetName && sheetNames.includes(opts.sheetName) ? opts.sheetName : sheetNames[0];
  const sheet = wb.Sheets[activeName];

  // Detectar automaticamente la fila de cabecera: la primera fila con al menos 3 celdas
  // con texto (si no se especifica)
  const aoa = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: null, blankrows: false });
  let headerRow = opts.headerRow ?? detectHeaderRow(aoa);
  const headers: string[] = (aoa[headerRow - 1] || []).map((h: any, i: number) =>
    h != null && String(h).trim() !== '' ? String(h).trim() : `col_${i + 1}`
  );

  // Construir filas con claves = headers
  const rows: Record<string, any>[] = [];
  for (let i = headerRow; i < aoa.length; i++) {
    const row = aoa[i];
    if (!row || row.every(c => c == null || String(c).trim() === '')) continue;
    const obj: Record<string, any> = {};
    headers.forEach((h, idx) => { obj[h] = row[idx] ?? null; });
    rows.push(obj);
  }

  return {
    sheetNames,
    activeSheet: activeName,
    headers,
    rows,
    totalRows: rows.length,
    headerRow,
  };
}

function detectHeaderRow(aoa: any[][]): number {
  for (let i = 0; i < Math.min(aoa.length, 10); i++) {
    const row = aoa[i] || [];
    const textCells = row.filter(c => c != null && typeof c === 'string' && String(c).trim().length > 1).length;
    if (textCells >= 3) return i + 1; // 1-based
  }
  return 1;
}

/** Auto-mapea cabeceras del Excel a campos del sistema usando heuristicas. */
export function autoMapHeaders(headers: string[]): Record<string, SupplyField | ''> {
  const out: Record<string, SupplyField | ''> = {};
  for (const h of headers) {
    out[h] = guessField(h) || '';
  }
  return out;
}

function norm(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .replace(/[^a-z0-9]/g, '');
}

function guessField(header: string): SupplyField | null {
  const n = norm(header);
  if (!n) return null;

  // CUPS
  if (/^cups$/.test(n) || /cups/.test(n) || /puntosuministro/.test(n) || /codigocups/.test(n)) return 'cups';

  // Tarifa
  if (/^tarifa$/.test(n) || /peaje/.test(n) || /tarifaacceso/.test(n) || /tipotarifa/.test(n)) return 'tariff_type';

  // Direccion
  if (/direccionsuministro/.test(n) || /^direccion$/.test(n) || /^domicilio$/.test(n) || /ubicacion/.test(n)) return 'direccion_suministro';

  // Ciudad
  if (/localidad/.test(n) || /municipio/.test(n) || /^ciudad$/.test(n) || /poblacion/.test(n)) return 'ciudad_suministro';

  // Denominacion
  if (/denominacion/.test(n) || /nombre/.test(n) || /descripcion/.test(n) || /aliassum/.test(n)) return 'denominacion';

  // Distribuidora / Comercializadora
  if (/distribuidora/.test(n) || /distrib/.test(n)) return 'distribuidora';
  if (/comercializadora/.test(n) || /comercial/.test(n)) return 'comercializadora';

  // Tension
  if (/tension/.test(n) || /^kv$/.test(n) || /voltaje/.test(n)) return 'tension_kv';

  // Potencias P1-P6 (por orden de especificidad)
  for (let p = 1; p <= 6; p++) {
    const re = new RegExp(`(^|[^0-9])p${p}($|[^0-9])|potencia.?p?${p}|pot${p}`);
    if (re.test(n)) return `p${p}_kw` as SupplyField;
  }

  return null;
}

/** Convierte un valor del Excel al tipo adecuado segun el campo. */
export function normalizeValue(field: SupplyField, raw: any): any {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();

  if (field === 'cups') {
    // Limpiar espacios y pasar a mayusculas
    const cups = s.replace(/\s+/g, '').toUpperCase();
    return cups;
  }

  if (field === 'tariff_type') {
    // Normalizar 2.0TD / 3.0TD / 6.1TD / 6.2TD
    const up = s.toUpperCase().replace(/\s+/g, '');
    if (/^2\.?0T?D?$/.test(up)) return '2.0TD';
    if (/^3\.?0T?D?$/.test(up)) return '3.0TD';
    if (/^6\.?1T?D?$/.test(up)) return '6.1TD';
    if (/^6\.?2T?D?$/.test(up)) return '6.2TD';
    if (/^6\.?3T?D?$/.test(up)) return '6.3TD';
    if (/^6\.?4T?D?$/.test(up)) return '6.4TD';
    // extraer por patron
    const m = up.match(/([2-6])[.,]?(\d)/);
    if (m) return `${m[1]}.${m[2]}TD`;
    return s;
  }

  if (/^p[1-6]_kw$/.test(field) || field === 'tension_kv') {
    // numero (aceptar coma decimal)
    const num = parseFloat(s.replace(',', '.').replace(/[^0-9.-]/g, ''));
    return isFinite(num) ? num : null;
  }

  return s;
}

export interface MappedSupplyRow {
  cups: string | null;
  denominacion: string | null;
  direccion_suministro: string | null;
  ciudad_suministro: string | null;
  tariff_type: string | null;
  distribuidora: string | null;
  comercializadora: string | null;
  tension_kv: number | null;
  p1_kw: number;
  p2_kw: number;
  p3_kw: number;
  p4_kw: number;
  p5_kw: number;
  p6_kw: number;
  _errors: string[];
  _warnings: string[];
  _rowIndex: number;
}

/** Aplica el mapeo a las filas parseadas y devuelve filas normalizadas + validadas. */
export function applyMappingToRows(
  rows: Record<string, any>[],
  mapping: Record<string, SupplyField | ''>
): MappedSupplyRow[] {
  return rows.map((row, idx) => {
    const out: MappedSupplyRow = {
      cups: null, denominacion: null, direccion_suministro: null, ciudad_suministro: null,
      tariff_type: null, distribuidora: null, comercializadora: null, tension_kv: null,
      p1_kw: 0, p2_kw: 0, p3_kw: 0, p4_kw: 0, p5_kw: 0, p6_kw: 0,
      _errors: [], _warnings: [], _rowIndex: idx + 1,
    };

    for (const [colName, field] of Object.entries(mapping)) {
      if (!field) continue;
      const raw = row[colName];
      const val = normalizeValue(field, raw);
      (out as any)[field] = val ?? (out as any)[field];
    }

    // Validaciones
    if (!out.cups || !/^ES[0-9A-Z]{18,22}$/i.test(out.cups)) {
      out._errors.push('CUPS invalido o vacio');
    }
    if (!out.tariff_type) {
      out._errors.push('Tarifa vacia');
    }
    const powers: (keyof MappedSupplyRow)[] = ['p1_kw','p2_kw','p3_kw','p4_kw','p5_kw','p6_kw'];
    for (const p of powers) {
      const v = (out as any)[p];
      if (v == null || isNaN(v as number)) out._warnings.push(`${p.toUpperCase()} vacia o no numerica (se guardara 0)`);
    }

    return out;
  });
}
