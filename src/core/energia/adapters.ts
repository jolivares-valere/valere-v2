import type { Cups } from '@/core/types/entities'
import type { SupplyPoint, Powers } from '@/types/database'

const EMPTY_POWERS: Powers = { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 }

export function cupsToSupplyPoint(cups: Cups): SupplyPoint {
  return {
    id: cups.id,
    client_id: cups.empresa_id,
    cups: cups.codigo_cups,
    tariff: cups.tarifa_acceso ?? '',
    manual_tariff: cups.tarifa_manual ?? '',
    powers: (cups.potencias_contratadas as unknown as Powers) ?? EMPTY_POWERS,
    supply_address: cups.direccion_suministro ?? '',
    current_retailer: cups.comercializadora_actual ?? '',
    autoconsumption_model: cups.modelo_autoconsumo ?? '',
    manual_autoconsumption_model: cups.modelo_autoconsumo_manual ?? '',
    pv_power_kwp: cups.potencia_fv_kwp ?? 0,
    fv_installation_cost_eur: cups.coste_instalacion_fv_eur ?? 0,
    inverter_power_kw: cups.potencia_inversor_kw ?? 0,
    installation_date: cups.fecha_instalacion_fv ?? '',
    inverter_brand: cups.marca_inversor ?? '',
    e1_kwh: cups.energia_p1_kwh ?? 0,
    e2_kwh: cups.energia_p2_kwh ?? 0,
    e3_kwh: cups.energia_p3_kwh ?? 0,
    e4_kwh: cups.energia_p4_kwh ?? 0,
    e5_kwh: cups.energia_p5_kwh ?? 0,
    e6_kwh: cups.energia_p6_kwh ?? 0,
    created_at: cups.created_at,
  }
}

export function getCupsDisplay(cups: Cups): string {
  return `${cups.codigo_cups} (${cups.tarifa_acceso || 'sin tarifa'})`
}
