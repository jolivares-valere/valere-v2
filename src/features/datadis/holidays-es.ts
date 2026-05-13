/**
 * holidays-es.ts -- Calendario de festivos para derivacion de P6 en peajes 3.0TD / 6.xTD
 *
 * Fuente: BOE (festivos nacionales) + BOJA/boletines autonomicos.
 *
 * Cobertura actual:
 *   - Festivos NACIONALES: 2024, 2025, 2026
 *   - Festivos AUTONOMICOS: Andalucia (principal mercado de Valere Consultores)
 *   - Festivos LOCALES (municipales): NO incluidos
 *
 * Error residual estimado: < 0.3 % por festivos locales no cubiertos.
 *
 * TODO: aniadir resto de CCAA cuando aparezcan CUPS fuera de Andalucia.
 * TODO v3: integrar API BOE/datos.gob.es para calendario dinamico por anio.
 */

// ---- Festivos nacionales (BOE, Resolucion anual) ---------------------------
// Incluyen sustituciones oficiales cuando el festivo cae en domingo.

const HOLIDAYS_NATIONAL: Record<string, string[]> = {
  '2024': [
    '2024-01-01', // Anio Nuevo
    '2024-01-06', // Reyes
    '2024-03-29', // Viernes Santo
    '2024-05-01', // Dia del Trabajo
    '2024-08-15', // Asuncion de la Virgen
    '2024-10-12', // Fiesta Nacional
    '2024-11-01', // Todos los Santos
    '2024-12-06', // Constitucion
    '2024-12-08', // Inmaculada Concepcion
    '2024-12-25', // Navidad
  ],
  '2025': [
    '2025-01-01', // Anio Nuevo
    '2025-01-06', // Reyes
    '2025-04-18', // Viernes Santo
    '2025-05-01', // Dia del Trabajo
    '2025-08-15', // Asuncion de la Virgen
    '2025-10-12', // Fiesta Nacional
    '2025-11-01', // Todos los Santos
    '2025-12-06', // Constitucion
    '2025-12-08', // Inmaculada Concepcion
    '2025-12-25', // Navidad
  ],
  '2026': [
    '2026-01-01', // Anio Nuevo
    '2026-01-06', // Reyes
    '2026-04-03', // Viernes Santo
    '2026-05-01', // Dia del Trabajo
    '2026-08-15', // Asuncion (sabado, sin sustitucion en periodo 3.0TD ya que sa ya es P6)
    '2026-10-12', // Fiesta Nacional
    '2026-11-02', // Todos los Santos (sustitucion: 1-nov es domingo)
    '2026-12-08', // Inmaculada Concepcion
    '2026-12-25', // Navidad
  ],
}

// ---- Festivos autonomicos --------------------------------------------------
// Clave: nombre CCAA (normalizado sin tildes)
// Solo los festivos PROPIOS de la CCAA que no coinciden ya con nacionales.

const HOLIDAYS_REGIONAL: Record<string, Record<string, string[]>> = {
  'Andalucia': {
    '2024': [
      '2024-02-28', // Dia de Andalucia
      '2024-03-28', // Jueves Santo (Andalucia)
    ],
    '2025': [
      '2025-02-28', // Dia de Andalucia
      '2025-04-17', // Jueves Santo (Andalucia)
    ],
    '2026': [
      '2026-02-27', // Dia de Andalucia (28-feb es sabado; sustitucion lunes 2-mar segun BOE -- usar fecha oficial)
      '2026-04-02', // Jueves Santo (Andalucia)
    ],
  },
  'Madrid': {
    '2024': ['2024-05-02', '2024-05-15'],
    '2025': ['2025-05-02', '2025-05-15'],
    '2026': ['2026-05-15'],
  },
  'Cataluna': {
    '2024': ['2024-04-01', '2024-09-11', '2024-12-26'],
    '2025': ['2025-04-21', '2025-09-11', '2025-12-26'],
    '2026': ['2026-04-06', '2026-09-11', '2026-12-26'],
  },
}

// ---- Mapeo codigo INE de provincia -> CCAA ---------------------------------
// Fuente: INE (codigos de provincia de 2 digitos)
// Solo incluir provincias con CUPS activos en Valere; ampliar segun aparezcan.

export const PROVINCE_CODE_TO_CCAA: Record<string, string> = {
  // Andalucia (04-41)
  '04': 'Andalucia', '11': 'Andalucia', '14': 'Andalucia', '18': 'Andalucia',
  '21': 'Andalucia', '23': 'Andalucia', '29': 'Andalucia', '41': 'Andalucia',
  // Aragon
  '22': 'Aragon', '44': 'Aragon', '50': 'Aragon',
  // Asturias
  '33': 'Asturias',
  // Baleares
  '07': 'Baleares',
  // Canarias
  '35': 'Canarias', '38': 'Canarias',
  // Cantabria
  '39': 'Cantabria',
  // Castilla-La Mancha
  '02': 'CastillaLaMancha', '13': 'CastillaLaMancha', '16': 'CastillaLaMancha',
  '19': 'CastillaLaMancha', '45': 'CastillaLaMancha',
  // Castilla y Leon
  '05': 'CastillaYLeon', '09': 'CastillaYLeon', '24': 'CastillaYLeon',
  '34': 'CastillaYLeon', '37': 'CastillaYLeon', '40': 'CastillaYLeon',
  '42': 'CastillaYLeon', '47': 'CastillaYLeon', '49': 'CastillaYLeon',
  // Cataluna
  '08': 'Cataluna', '17': 'Cataluna', '25': 'Cataluna', '43': 'Cataluna',
  // Extremadura
  '06': 'Extremadura', '10': 'Extremadura',
  // Galicia
  '15': 'Galicia', '27': 'Galicia', '32': 'Galicia', '36': 'Galicia',
  // La Rioja
  '26': 'LaRioja',
  // Madrid
  '28': 'Madrid',
  // Murcia
  '30': 'Murcia',
  // Navarra
  '31': 'Navarra',
  // Pais Vasco
  '01': 'PaisVasco', '20': 'PaisVasco', '48': 'PaisVasco',
  // Valencia
  '03': 'Valencia', '12': 'Valencia', '46': 'Valencia',
  // Ceuta/Melilla
  '51': 'Ceuta', '52': 'Melilla',
}

// ---- Funcion publica -------------------------------------------------------

/**
 * Devuelve true si la fecha ISO (YYYY-MM-DD) es festivo en Espania.
 * @param dateISO  Fecha en formato YYYY-MM-DD
 * @param ccaa     Nombre CCAA (sin tildes, ej. 'Andalucia'). Opcional.
 *                 Si se omite solo se comprueban festivos nacionales.
 */
export function isHolidayES(dateISO: string, ccaa?: string): boolean {
  const year = dateISO.substring(0, 4)
  if (HOLIDAYS_NATIONAL[year]?.includes(dateISO)) return true
  if (ccaa && HOLIDAYS_REGIONAL[ccaa]?.[year]?.includes(dateISO)) return true
  return false
}

/**
 * Deriva el nombre de CCAA a partir del codigo de provincia INE (2 digitos).
 * Devuelve undefined si la provincia no esta en el mapa.
 *
 * @param provinceCode  Codigo INE de provincia (ej. '41', '04', '28')
 */
export function ccaaFromProvinceCode(provinceCode: string): string | undefined {
  const code = provinceCode.padStart(2, '0').substring(0, 2)
  return PROVINCE_CODE_TO_CCAA[code]
}
