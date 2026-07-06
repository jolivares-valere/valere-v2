import type { TipoEmpresa } from '../../core/types/entities'

/**
 * Etiquetas legibles de tipo de empresa.
 * NOTA: 'residencial' está en la UI pero requiere ampliar el CHECK de
 * empresas.tipo en BBDD (tarea derivada — ver docs/MEJORAS_UI_BACKLOG.md).
 */
export const TIPO_EMPRESA_LABELS: Record<TipoEmpresa, string> = {
  empresa: 'Empresa',
  autonomo: 'Autónomo',
  comunidad_propietarios: 'CCPP',
  cooperativa: 'Cooperativa',
  asociacion: 'Asociación',
  residencial: 'Residencial',
}

export const TIPO_EMPRESA_OPTIONS = (Object.keys(TIPO_EMPRESA_LABELS) as TipoEmpresa[]).map((value) => ({
  value,
  label: TIPO_EMPRESA_LABELS[value],
}))

export function tipoEmpresaLabel(tipo: string | null | undefined): string {
  if (!tipo) return '—'
  return TIPO_EMPRESA_LABELS[tipo as TipoEmpresa] ?? tipo
}
