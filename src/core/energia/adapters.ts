import type { Cups, CupsInsert, Empresa } from '@/core/types/entities'
import type { SupplyPoint, Powers, Client } from '@/types/database'

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

export function supplyPointFormToCupsPayload(
  sp: Partial<SupplyPoint>,
  empresaId: string,
): Partial<CupsInsert> & { empresa_id: string } {
  return {
    empresa_id: empresaId,
    codigo_cups: sp.cups ?? '',
    tarifa_acceso: sp.tariff ?? null,
    tarifa_manual: sp.manual_tariff ?? null,
    potencias_contratadas: (sp.powers as unknown as Record<string, number>) ?? null,
    direccion_suministro: sp.supply_address ?? null,
    comercializadora_actual: sp.current_retailer ?? null,
    modelo_autoconsumo: sp.autoconsumption_model ?? null,
    modelo_autoconsumo_manual: sp.manual_autoconsumption_model ?? null,
    potencia_fv_kwp: sp.pv_power_kwp ?? null,
    coste_instalacion_fv_eur: sp.fv_installation_cost_eur ?? null,
    potencia_inversor_kw: sp.inverter_power_kw ?? null,
    fecha_instalacion_fv: sp.installation_date || null,
    marca_inversor: sp.inverter_brand ?? null,
    energia_p1_kwh: sp.e1_kwh ?? null,
    energia_p2_kwh: sp.e2_kwh ?? null,
    energia_p3_kwh: sp.e3_kwh ?? null,
    energia_p4_kwh: sp.e4_kwh ?? null,
    energia_p5_kwh: sp.e5_kwh ?? null,
    energia_p6_kwh: sp.e6_kwh ?? null,
  }
}

export function empresaToClient(e: Empresa): Client {
  return {
    id: e.id,
    company_name: e.nombre,
    nif: e.nif ?? '',
    fiscal_address: e.direccion ?? '',
    contact_person: '',
    contact_email: e.email_principal ?? '',
    contact_phone: e.telefono_principal ?? '',
    fiscal_city: e.ciudad ?? '',
    fiscal_zip: e.cp ?? '',
    fiscal_province: e.provincia ?? '',
    notes: e.notas ?? '',
    consultor_asignado: e.comercial_id ?? '',
    created_at: e.created_at,
  }
}

export function getCupsDisplay(cups: Cups): string {
  return `${cups.codigo_cups} (${cups.tarifa_acceso || 'sin tarifa'})`
}
