// ============================================================
// VALERE v2 — Single Source of Truth for Database Types
// All Supabase table types defined here. No duplicates.
// ============================================================

// NOTA: la interface `Client` fue eliminada tras el DROP de la tabla
// `clients` en Supabase (2026-04-21). Sus consumidores ya migraron a
// `Empresa` del CRM.
// `SupplyPoint` se mantiene como tipo interno: la tabla SQL ya no
// existe, pero el calculator sigue operando sobre esa forma de datos
// (construida desde `cups` vía `cupsToSupplyPoint` adapter).

export interface SupplyPoint {
  id: string;
  client_id: string;
  cups: string;
  tariff: string;
  manual_tariff: string;
  supply_address: string;
  powers: Powers;
  current_retailer: string;
  autoconsumption_model: string;
  manual_autoconsumption_model: string;
  pv_power_kwp: number;
  fv_installation_cost_eur: number;
  inverter_power_kw: number;
  installation_date: string;
  inverter_brand: string;
  e1_kwh: number;
  e2_kwh: number;
  e3_kwh: number;
  e4_kwh: number;
  e5_kwh: number;
  e6_kwh: number;
  created_at: string;
}

export interface Powers {
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p5: number;
  p6: number;
}

export interface InvoiceHistory {
  id: string;
  supply_point_id: string;
  cups_id: string | null;
  month: number;
  year: number;
  consumption_kwh: number;
  surplus_kwh: number;
  total_amount_eur: number;
  surplus_compensation_eur: number;
  retailer: string;
  billed_days: number;
  created_at: string;
  // Modelo por periodo + coordinacion multi-fuente (2026-06-14).
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  origen?: string | null;
  documento_url?: string | null;
}

export interface Retailer {
  id: string;
  name: string;
  is_active: boolean;
  model: string;
  notes: string;
  created_at: string;
}

export type SurplusModel =
  | 'compensacion_simple'
  | 'bateria_virtual_kwh'
  | 'gestion_silver'
  | 'indexado_pool'
  | 'otro';

export interface RetailerOffer {
  id: string;
  comercializadora_id: string; // renombrado desde retailer_id en Fase 1 unificación 2026-04-26
  product_name: string;
  access_rate: string;
  surplus_model: SurplusModel;
  energy_prices: number[];
  power_prices: number[];
  surplus_price_per_kwh: number;
  entry_fee_eur: number;
  entry_fee_per_kw: number;
  annual_management_fee_eur: number;
  tender_fee_pct: number;
  activation_fee_eur: number;
  battery_fee_per_kwp_eur: number;
  allow_zero_invoice: boolean;
  min_contract_months: number;
  include_in_comparison: boolean;
  show_tolls_separately: boolean;
  notes: string;
  created_at: string;
  /** 'fijo' = precios fijos por periodo; 'indexado' = precio pool OMIE + spread */
  price_type: 'fijo' | 'indexado';
  /** Margen de la comercializadora sobre precio pool en EUR/kWh (solo aplica si price_type='indexado') */
  spread_eur_kwh: number;
  /** true = SSAA ya incluidos en energy_prices; false = sumar SSAA reales aparte (ej: Nexus) */
  ssaa_incluidos: boolean;
  /** Comision Valere en EUR/MWh — se resta del precio visible al cliente en comparativa. 0 si ya incluido. */
  fee_valere_eur_mwh: number;
}

export interface Proposal {
  id: string;
  created_at: string;
  supply_point_id: string;
  cups_id: string | null;
  current_annual_cost_eur: number;
  best_offer_annual_cost_eur: number;
  best_offer_retailer: string;
  best_offer_savings_eur: number;
  best_offer_savings_pct: number;
  included_offers: unknown;
  comparison_results: unknown;
  pdf_url: string;
  status: ProposalStatus;
}

export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

export interface GlobalConfig {
  id: string;
  updated_at: string;
  updated_by: string;
  vat_pct: number;
  iee_pct: number;
  notes: string;
}

export interface BoeRegulatedPrice {
  id: string;
  tariff: string;
  period: string;
  price: number;
  created_at: string;
}

export type UserRole = 'master' | 'manager' | 'consultant' | 'client';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: string;
  approved: boolean;
  created_at: string;
}

// ============================================================
// JOINED / VIEW TYPES (for queries with relations)
// ============================================================

export interface ProposalWithDetails extends Proposal {
  cups_rel?: {
    codigo_cups: string;
    empresas: {
      nombre: string;
    };
  };
}

export interface RetailerOfferWithName extends RetailerOffer {
  // Join alias renombrado en Fase 1 unificación: retailers → comercializadoras
  comercializadoras: Pick<Retailer, 'name'>;
}

// ============================================================
// CALCULATOR TYPES
// ============================================================

export interface InvoiceData {
  consumption_p: number[];  // 6 periods (P1-P6)
  surplus_kwh: number;
  billed_days: number;
}

export interface InvoiceBreakdown {
  power_fixed_eur: number;
  energy_regulated_eur: number;
  energy_free_eur: number;
  ssaa_externo_eur: number;
  battery_fee_eur: number;
  tender_fee_eur: number;
  subtotal_eur: number;
  iee_eur: number;
  iva_eur: number;
  surplus_discount_eur: number;
}

export interface InvoiceSimulationResult {
  total_eur: number;
  breakdown: InvoiceBreakdown;
  details: {
    power_periods: number[];
    regulated_energy_periods: number[];
    free_energy_periods: number[];
  };
}
