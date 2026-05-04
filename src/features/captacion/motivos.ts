/**
 * Catálogo de motivos de pérdida — UI filtrada por contexto.
 *
 * Regla (validada con ChatGPT 2026-05-04):
 *   - BD mantiene `motivo_perdida_enum` completo (21 valores) intacto.
 *   - UI muestra subset según rol/etapa para no castigar la velocidad operativa.
 *   - Cuando se elige `otro`, se rellena `motivo_perdida_detalle` (texto libre).
 *
 * Origen: docs/SPRINT_OPERATIVO_CAPTACION_2026-05-04.md
 */

export type MotivoPerdida = {
  /** Valor exacto del enum BD `motivo_perdida_enum` */
  codigo: string
  /** Texto que ve Carolina A en la llamada — corto, sin jerga */
  label: string
  /** Pista cuando hace falta (tooltip, opcional) */
  hint?: string
}

/**
 * Motivos visibles a Carolina Aroca (función telemarketing) durante la operativa
 * de llamadas (etapas: nuevo, contactado, esperando_factura, seguimientos).
 *
 * 7 motivos típicos + "otro" abierto. Por debajo de 10 para que la decisión sea rápida.
 */
export const MOTIVOS_TELEMARKETING: readonly MotivoPerdida[] = [
  { codigo: 'no_contesta',            label: 'No contesta tras varios intentos' },
  { codigo: 'numero_erroneo',         label: 'Número erróneo / no es la empresa' },
  { codigo: 'no_es_decisor',          label: 'Persona no es decisor' },
  { codigo: 'ya_tiene_consultor',     label: 'Ya tiene consultor energético' },
  { codigo: 'no_quiere_mover',        label: 'No quiere cambiar / no interesa' },
  { codigo: 'no_envia_factura',       label: 'No envía la factura tras compromiso' },
  { codigo: 'lista_robinson',         label: 'Lista Robinson / pide RGPD eliminación' },
  { codigo: 'otro',                   label: 'Otro motivo (escribir abajo)' },
] as const

/**
 * Motivos avanzados visibles a Carolina Maciñeiras (analista) y a los asesores
 * senior (Antonio, Juan) durante etapas de análisis y seguimiento.
 *
 * Combina los de telemarketing con los específicos de análisis y propuesta.
 */
export const MOTIVOS_AVANZADO: readonly MotivoPerdida[] = [
  ...MOTIVOS_TELEMARKETING.filter(m => m.codigo !== 'otro'),
  { codigo: 'no_autoriza_datadis',       label: 'No autoriza acceso a Datadis' },
  { codigo: 'precio_insuficiente',       label: 'Precio actual mejor / insuficiente margen' },
  { codigo: 'contrato_con_penalizacion', label: 'Contrato actual con penalización' },
  { codigo: 'empresa_fuera_perfil',      label: 'Empresa fuera de perfil objetivo' },
  { codigo: 'insolvente',                label: 'Empresa insolvente / morosa' },
  { codigo: 'sector_excluido',           label: 'Sector excluido' },
  { codigo: 'satisfecho_comercializadora', label: 'Satisfecho con su comercializadora' },
  { codigo: 'acaba_de_renovar',          label: 'Acaba de renovar contrato' },
  { codigo: 'cierre_empresa',            label: 'Cierre / cese de actividad' },
  { codigo: 'geografia_excluida',        label: 'Geografía excluida' },
  { codigo: 'otro',                      label: 'Otro motivo (escribir abajo)' },
] as const

/**
 * Selecciona el catálogo apropiado según funciones del usuario.
 * Telemarketing puro → simple. Cualquier otra función → avanzado.
 */
export function motivosParaUsuario(funciones: string[] | null | undefined): readonly MotivoPerdida[] {
  const f = funciones ?? []
  // Si el usuario es SOLO telemarketing (no acumula otras), usa el subset corto.
  if (f.length === 1 && f[0] === 'telemarketing') return MOTIVOS_TELEMARKETING
  // En cualquier otro caso (analista, asesor_senior, admin, combinaciones) → avanzado.
  return MOTIVOS_AVANZADO
}
