-- ============================================================
-- VALERE CONSULTORES — Migración de Base de Datos
-- Proyecto: PROYECTO VALERE (Supabase)
-- Fecha: 2026-04-09
-- ============================================================

-- 1. TABLA DE CLIENTES
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  nif TEXT DEFAULT '',
  fiscal_address TEXT DEFAULT '',
  contact_person TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  fiscal_city TEXT DEFAULT '',
  fiscal_zip TEXT DEFAULT '',
  fiscal_province TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  consultor_asignado TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PUNTOS DE SUMINISTRO
CREATE TABLE IF NOT EXISTS supply_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  cups TEXT NOT NULL,
  tariff TEXT DEFAULT '2.0TD',
  manual_tariff TEXT DEFAULT '',
  supply_address TEXT DEFAULT '',
  powers JSONB DEFAULT '{"p1": 0, "p2": 0, "p3": 0, "p4": 0, "p5": 0, "p6": 0}',
  current_retailer TEXT DEFAULT '',
  autoconsumption_model TEXT DEFAULT '',
  manual_autoconsumption_model TEXT DEFAULT '',
  pv_power_kwp NUMERIC DEFAULT 0,
  fv_installation_cost_eur NUMERIC DEFAULT 0,
  inverter_power_kw NUMERIC DEFAULT 0,
  installation_date DATE,
  inverter_brand TEXT DEFAULT '',
  e1_kwh NUMERIC DEFAULT 0,
  e2_kwh NUMERIC DEFAULT 0,
  e3_kwh NUMERIC DEFAULT 0,
  e4_kwh NUMERIC DEFAULT 0,
  e5_kwh NUMERIC DEFAULT 0,
  e6_kwh NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. HISTORIAL DE FACTURAS
CREATE TABLE IF NOT EXISTS invoice_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supply_point_id UUID REFERENCES supply_points(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  consumption_kwh NUMERIC DEFAULT 0,
  surplus_kwh NUMERIC DEFAULT 0,
  total_amount_eur NUMERIC DEFAULT 0,
  surplus_compensation_eur NUMERIC DEFAULT 0,
  retailer TEXT DEFAULT '',
  billed_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COMERCIALIZADORAS
CREATE TABLE IF NOT EXISTS retailers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  model TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. OFERTAS DE COMERCIALIZADORAS
CREATE TABLE IF NOT EXISTS retailer_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  product_name TEXT DEFAULT '',
  access_rate TEXT DEFAULT '2.0TD',
  surplus_model TEXT DEFAULT 'compensacion_simple' CHECK (surplus_model IN (
    'compensacion_simple', 'bateria_virtual_kwh', 'gestion_silver', 'indexado_pool', 'otro'
  )),
  energy_prices NUMERIC[] DEFAULT ARRAY[0,0,0,0,0,0]::NUMERIC[],
  power_prices NUMERIC[] DEFAULT ARRAY[0,0,0,0,0,0]::NUMERIC[],
  surplus_price_per_kwh NUMERIC DEFAULT 0,
  entry_fee_eur NUMERIC DEFAULT 0,
  entry_fee_per_kw NUMERIC DEFAULT 0,
  annual_management_fee_eur NUMERIC DEFAULT 0,
  tender_fee_pct NUMERIC DEFAULT 0,
  activation_fee_eur NUMERIC DEFAULT 0,
  battery_fee_per_kwp_eur NUMERIC DEFAULT 0,
  allow_zero_invoice BOOLEAN DEFAULT FALSE,
  min_contract_months INTEGER DEFAULT 12,
  include_in_comparison BOOLEAN DEFAULT TRUE,
  show_tolls_separately BOOLEAN DEFAULT FALSE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PROPUESTAS
CREATE TABLE IF NOT EXISTS proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supply_point_id UUID REFERENCES supply_points(id) ON DELETE CASCADE,
  current_annual_cost_eur NUMERIC DEFAULT 0,
  best_offer_annual_cost_eur NUMERIC DEFAULT 0,
  best_offer_retailer TEXT DEFAULT '',
  best_offer_savings_eur NUMERIC DEFAULT 0,
  best_offer_savings_pct NUMERIC DEFAULT 0,
  included_offers JSONB DEFAULT '[]',
  comparison_results JSONB DEFAULT '[]',
  pdf_url TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CONFIGURACIÓN GLOBAL
CREATE TABLE IF NOT EXISTS global_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT DEFAULT '',
  vat_pct NUMERIC DEFAULT 21,
  iee_pct NUMERIC DEFAULT 5.1127,
  notes TEXT DEFAULT ''
);

-- 8. PRECIOS REGULADOS BOE
CREATE TABLE IF NOT EXISTS boe_regulated_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tariff TEXT NOT NULL,
  period TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. PERFILES DE USUARIO
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT DEFAULT '',
  full_name TEXT DEFAULT '',
  role TEXT DEFAULT 'client' CHECK (role IN ('master', 'manager', 'consultant', 'client')),
  status TEXT DEFAULT 'active',
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDICES para rendimiento
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_supply_points_client ON supply_points(client_id);
CREATE INDEX IF NOT EXISTS idx_invoice_history_sp ON invoice_history(supply_point_id);
CREATE INDEX IF NOT EXISTS idx_retailer_offers_retailer ON retailer_offers(retailer_id);
CREATE INDEX IF NOT EXISTS idx_proposals_sp ON proposals(supply_point_id);
CREATE INDEX IF NOT EXISTS idx_boe_prices_tariff ON boe_regulated_prices(tariff);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE retailer_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE boe_regulated_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para usuarios autenticados
-- (En producción, se deberían restringir por consultor/cliente)
CREATE POLICY "Authenticated users can read clients" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert clients" ON clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update clients" ON clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete clients" ON clients FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read supply_points" ON supply_points FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert supply_points" ON supply_points FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update supply_points" ON supply_points FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete supply_points" ON supply_points FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read invoice_history" ON invoice_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert invoice_history" ON invoice_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update invoice_history" ON invoice_history FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete invoice_history" ON invoice_history FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read retailers" ON retailers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert retailers" ON retailers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update retailers" ON retailers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete retailers" ON retailers FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read retailer_offers" ON retailer_offers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert retailer_offers" ON retailer_offers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update retailer_offers" ON retailer_offers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete retailer_offers" ON retailer_offers FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read proposals" ON proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert proposals" ON proposals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update proposals" ON proposals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete proposals" ON proposals FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read global_config" ON global_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage global_config" ON global_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read boe_regulated_prices" ON boe_regulated_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage boe_regulated_prices" ON boe_regulated_prices FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Users can read own profile" ON user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- DATOS INICIALES
-- ============================================================

-- Configuración global por defecto
INSERT INTO global_config (vat_pct, iee_pct, notes)
VALUES (21, 5.1127, 'Configuración inicial Valere Consultores');

-- Precios regulados BOE 2024-2025 (Peajes y Cargos)
-- Tarifa 2.0TD - Peajes de Potencia (€/kW/año)
INSERT INTO boe_regulated_prices (tariff, period, price) VALUES
  ('2.0TD', 'P1', 30.876672),  -- Potencia P1
  ('2.0TD', 'P2', 1.424148),   -- Potencia P2
  ('2.0TD', 'P1E', 0.073183),  -- Energía P1 (peaje + cargo)
  ('2.0TD', 'P2E', 0.043375),  -- Energía P2
  ('2.0TD', 'P3E', 0.014847);  -- Energía P3

-- Tarifa 3.0TD - Peajes de Potencia (€/kW/año)
INSERT INTO boe_regulated_prices (tariff, period, price) VALUES
  ('3.0TD', 'P1', 30.876672),
  ('3.0TD', 'P2', 18.225408),
  ('3.0TD', 'P3', 11.092344),
  ('3.0TD', 'P4', 7.362744),
  ('3.0TD', 'P5', 5.133696),
  ('3.0TD', 'P6', 2.449440),
  ('3.0TD', 'P1E', 0.056482),
  ('3.0TD', 'P2E', 0.045614),
  ('3.0TD', 'P3E', 0.033766),
  ('3.0TD', 'P4E', 0.025209),
  ('3.0TD', 'P5E', 0.018188),
  ('3.0TD', 'P6E', 0.010951);

-- Tarifa 6.1TD
INSERT INTO boe_regulated_prices (tariff, period, price) VALUES
  ('6.1TD', 'P1', 24.012060),
  ('6.1TD', 'P2', 16.199820),
  ('6.1TD', 'P3', 10.610940),
  ('6.1TD', 'P4', 7.032960),
  ('6.1TD', 'P5', 4.904640),
  ('6.1TD', 'P6', 2.340000),
  ('6.1TD', 'P1E', 0.042286),
  ('6.1TD', 'P2E', 0.034482),
  ('6.1TD', 'P3E', 0.025870),
  ('6.1TD', 'P4E', 0.019382),
  ('6.1TD', 'P5E', 0.014162),
  ('6.1TD', 'P6E', 0.008668);

-- Comercializadoras de ejemplo
INSERT INTO retailers (name, is_active, model) VALUES
  ('Iberdrola', TRUE, 'Mercado libre'),
  ('Endesa', TRUE, 'Mercado libre'),
  ('Naturgy', TRUE, 'Mercado libre'),
  ('Repsol', TRUE, 'Mercado libre'),
  ('Holaluz', TRUE, 'Batería virtual'),
  ('Nexus Energía', TRUE, 'Batería virtual');

-- ============================================================
-- FUNCIÓN: Auto-crear perfil al registrarse
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, status, approved)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE
      WHEN NEW.email = 'jolivares@valereconsultores.com' THEN 'master'
      ELSE 'client'
    END,
    'active',
    CASE
      WHEN NEW.email = 'jolivares@valereconsultores.com' THEN TRUE
      ELSE FALSE
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auto-crear perfil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
