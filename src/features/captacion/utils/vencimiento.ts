/**
 * Sprint D1 (2026-05-05): helper limpio para semáforo de vencimiento del
 * contrato actual del prospecto + función de "siguiente acción comercial"
 * derivada de etapa_operativa con overlay de urgencia si la fecha está cerca.
 *
 * Reglas comerciales (validadas con Juan + ChatGPT):
 *   <0 días  → vencido
 *   <=30     → rojo     "Urgente"
 *   <=60     → naranja  "Prioridad alta"
 *   <=90     → amarillo "Contactar ya" (90 SÍ entra en amarillo)
 *   >90      → verde    "Seguimiento futuro"
 *   sin fecha → sin_fecha
 */

export type EstadoVencimiento =
  | 'sin_fecha'
  | 'vencido'
  | 'rojo'
  | 'naranja'
  | 'amarillo'
  | 'verde'

export type Semaforo = {
  estado: EstadoVencimiento
  diasRestantes: number | null
  label: string
}

/**
 * Calcula el semáforo de vencimiento.
 *
 * @param fecha ISO 'YYYY-MM-DD' o null/undefined.
 * @returns objeto con estado, diasRestantes, label legible.
 */
export function calcularSemaforoVencimiento(
  fecha?: string | null,
): Semaforo {
  if (!fecha) {
    return { estado: 'sin_fecha', diasRestantes: null, label: 'Sin vencimiento' }
  }

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  // ISO 'YYYY-MM-DD' tratado como local para evitar saltos de zona horaria.
  const venc = new Date(fecha + 'T00:00:00')
  const diffMs = venc.getTime() - hoy.getTime()
  const dias = Math.round(diffMs / 86_400_000)

  if (dias < 0)   return { estado: 'vencido',  diasRestantes: dias, label: `Vencido hace ${Math.abs(dias)} días` }
  if (dias <= 30) return { estado: 'rojo',     diasRestantes: dias, label: `Vence en ${dias} días` }
  if (dias <= 60) return { estado: 'naranja',  diasRestantes: dias, label: `Vence en ${dias} días` }
  if (dias <= 90) return { estado: 'amarillo', diasRestantes: dias, label: `Vence en ${dias} días` }
  return            { estado: 'verde',    diasRestantes: dias, label: `Vence en ${dias} días` }
}

/**
 * Texto que aparece en la card como "→ siguiente acción".
 *
 * Lógica:
 *   1) Mapeo base por etapa_operativa.
 *   2) Si hay fecha y es cercana (<=90d), se sobreescribe con tono urgente
 *      para que la card grite "llama a este antes que al resto".
 *
 * Diseñado para que Carolina pueda priorizar de un vistazo sin abrir nada.
 */
const ACCION_BASE: Record<string, string> = {
  nuevo:                    'Llamar para presentar Valere',
  contactado:               'Identificar decisor y enviar presentación',
  esperando_factura:        'Llamar para recordar envío de factura',
  factura_recibida:         'Pasar a análisis',
  en_analisis:              'Esperando análisis',
  asignada_a_senior:        'Esperando asesor senior',
  propuesta_en_preparacion: 'Terminar propuesta y pasarla',
  propuesta_lista:          'Enviar propuesta por email al cliente',
  propuesta_enviada:        'Hacer seguimiento al cliente',
  seguimiento:              'Cerrar (ganada o perdida) o programar visita',
  cerrado:                  'Caso cerrado',
}

export function siguienteAccionLead(
  etapaOperativa: string | null | undefined,
  fechaVencimiento?: string | null,
): string {
  const sem = calcularSemaforoVencimiento(fechaVencimiento)
  const baseAccion = ACCION_BASE[etapaOperativa ?? ''] ?? 'Revisar caso'

  // Overlay de urgencia: solo si hay fecha y semáforo es accionable.
  // No aplica en etapas terminales (cerrado).
  if (etapaOperativa === 'cerrado') return baseAccion
  if (sem.estado === 'sin_fecha') return baseAccion

  if (sem.estado === 'vencido') {
    return `Urgente: contrato vencido — llama ya`
  }
  if (sem.estado === 'rojo' && sem.diasRestantes !== null) {
    return `Urgente: vence en ${sem.diasRestantes} días — llama ya`
  }
  if (sem.estado === 'naranja' && sem.diasRestantes !== null) {
    return `Prioridad alta: vence en ${sem.diasRestantes} días`
  }
  if (sem.estado === 'amarillo' && sem.diasRestantes !== null) {
    return `Contactar ya: vence en ${sem.diasRestantes} días`
  }
  // estado === 'verde' — sin overlay, deja la acción base de etapa.
  return baseAccion
}

/**
 * Mapeo color → clases Tailwind para el badge en cards y bloque en drawer.
 * Centralizado aquí para que cualquier consumidor del helper no diverja.
 */
export const ESTADO_CLASSES: Record<EstadoVencimiento, string> = {
  verde:    'bg-green-50 border-green-200 text-green-800',
  amarillo: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  naranja:  'bg-orange-50 border-orange-300 text-orange-800',
  rojo:     'bg-red-50 border-red-300 text-red-800',
  vencido:  'bg-slate-200 border-slate-400 text-slate-800',
  sin_fecha: 'bg-slate-50 border-slate-200 text-slate-500',
}
