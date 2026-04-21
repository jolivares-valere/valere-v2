// ============================================================
// VALERE v2 — Single Source of Truth for Database Types
// All Supabase table types defined here. No duplicates.
// ============================================================

export interface Client {
  id: string;
  company_name: string;
  nif: string;
  fiscal_address: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  fiscal_city: string;
  fiscal_zip: string;
  fiscal_province: string;
  notes: string;
  consultor_asignado: string;
  created_at: string;
}

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
  retailer_id: string;
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
  retailers: Pick<Retailer, 'name'>;
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
