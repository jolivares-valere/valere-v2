// Catálogo de normativas disponibles para gestión de potencias.
// Para añadir una nueva normativa, agrega una entrada a este objeto.

export interface NormativaConfig {
  label: string
  descripcion: string
  /** Documentos que se esperan para completar el expediente */
  documentosRequeridos: string[]
  /** Texto legal de referencia que aparece en comunicaciones */
  referenciaLegal: string
  /** Fecha límite (null = sin fecha límite) */
  fechaCierre: string | null
}

export const NORMATIVAS: Record<string, NormativaConfig> = {
  RDL_7_2026: {
    label: 'RDL 7/2026',
    descripcion: 'Real Decreto-Ley 7/2026 — Cambios de potencia sin coste hasta 31/12/2026',
    documentosRequeridos: [
      'Solicitud de bajada de potencia',
      'Confirmación distribuidora (bajada)',
      'Solicitud de subida de potencia',
      'Confirmación distribuidora (subida)',
    ],
    referenciaLegal: 'Real Decreto-Ley 7/2026, de 20 de enero',
    fechaCierre: '2026-12-31',
  },
  AT_COMERCIAL: {
    label: 'Ajuste Técnico Comercial',
    descripcion: 'Cambio de potencia por adecuación técnica de la instalación',
    documentosRequeridos: [
      'Solicitud ATR',
      'Informe técnico de la instalación',
      'Aceptación del distribuidor',
    ],
    referenciaLegal: 'Circular 3/2020 CNMC — Acceso y conexión de instalaciones',
    fechaCierre: null,
  },
  RESOLUCIÓN_RECLAMACIÓN: {
    label: 'Resolución por reclamación',
    descripcion: 'Cambio derivado de resolución de reclamación ante la distribuidora o CNMC',
    documentosRequeridos: [
      'Escrito de reclamación',
      'Resolución de la distribuidora / CNMC',
      'Solicitud de aplicación de resolución',
    ],
    referenciaLegal: 'Ley 24/2013 del Sector Eléctrico, art. 43',
    fechaCierre: null,
  },
  ADECUACIÓN_TARIFA: {
    label: 'Adecuación de tarifa de acceso',
    descripcion: 'Ajuste de potencias para optimizar la tarifa de acceso contratada',
    documentosRequeridos: [
      'Análisis de consumo y demanda',
      'Solicitud de modificación de contrato de acceso',
      'Confirmación comercializadora',
    ],
    referenciaLegal: 'Real Decreto 1164/2001 — Tarifas de acceso a redes',
    fechaCierre: null,
  },
}

export const NORMATIVA_DEFAULT = 'RDL_7_2026'

export function getNormativa(key: string): NormativaConfig {
  return NORMATIVAS[key] ?? NORMATIVAS[NORMATIVA_DEFAULT]
}

export function getNormativaOptions() {
  return Object.entries(NORMATIVAS).map(([value, cfg]) => ({
    value,
    label: cfg.label,
    descripcion: cfg.descripcion,
  }))
}
