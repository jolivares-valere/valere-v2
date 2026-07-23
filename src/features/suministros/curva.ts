/**
 * PR-4.1 · Helpers puros de la curva de consumo (testeados en curva.test.ts).
 * La vista v_consumos_diarios da filas diarias; aquí se agrega a mes y se
 * evalúa la honestidad del backfill (🟡 incompleto, patrón L3).
 */

export interface ConsumoDiario {
  fecha: string // YYYY-MM-DD
  consumo_kwh: number
  excedente_kwh: number
  horas: number
  horas_estimadas: number
}

export interface ConsumoMensual {
  mes: string // YYYY-MM
  consumo_kwh: number
  excedente_kwh: number
  dias: number
  dias_en_mes: number
  completo: boolean
}

function diasDelMes(mes: string): number {
  const [y, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** Agrega filas diarias a meses. Un mes es "completo" si tiene todos sus días
 *  (el mes en curso nunca se marca incompleto por definición: aún no acabó). */
export function agruparPorMes(diarios: ConsumoDiario[], hoyISO?: string): ConsumoMensual[] {
  const hoy = hoyISO ?? new Date().toISOString().slice(0, 10)
  const mesActual = hoy.slice(0, 7)
  const map = new Map<string, ConsumoMensual>()
  for (const d of diarios) {
    const mes = d.fecha.slice(0, 7)
    let m = map.get(mes)
    if (!m) {
      m = { mes, consumo_kwh: 0, excedente_kwh: 0, dias: 0, dias_en_mes: diasDelMes(mes), completo: false }
      map.set(mes, m)
    }
    m.consumo_kwh += d.consumo_kwh
    m.excedente_kwh += d.excedente_kwh
    m.dias += 1
  }
  const out = [...map.values()].sort((a, b) => (a.mes < b.mes ? -1 : 1))
  for (const m of out) {
    m.completo = m.mes === mesActual ? true : m.dias >= m.dias_en_mes
    m.consumo_kwh = Math.round(m.consumo_kwh * 1000) / 1000
    m.excedente_kwh = Math.round(m.excedente_kwh * 1000) / 1000
  }
  return out
}

/** Backfill incompleto = hay huecos (meses pasados con días de menos) o la
 *  última fecha con datos está a más de `staleDias` de hoy. */
export function backfillIncompleto(
  meses: ConsumoMensual[],
  ultimaFecha: string | null,
  hoyISO?: string,
  staleDias = 45,
): boolean {
  if (meses.length === 0) return true
  const hoy = hoyISO ?? new Date().toISOString().slice(0, 10)
  const mesActual = hoy.slice(0, 7)
  if (meses.some((m) => m.mes !== mesActual && !m.completo)) return true
  if (!ultimaFecha) return true
  const dias = Math.floor((new Date(hoy + 'T00:00:00Z').getTime() - new Date(ultimaFecha + 'T00:00:00Z').getTime()) / 86_400_000)
  return dias > staleDias
}

/** CSV (separador ; — Excel es-ES) de las filas diarias. */
export function csvDiario(codigoCups: string, diarios: ConsumoDiario[]): string {
  const head = 'cups;fecha;consumo_kwh;excedente_kwh;horas;horas_estimadas'
  const lines = diarios.map((d) =>
    [codigoCups, d.fecha, String(d.consumo_kwh).replace('.', ','), String(d.excedente_kwh).replace('.', ','), d.horas, d.horas_estimadas].join(';'),
  )
  return [head, ...lines].join('\n')
}
