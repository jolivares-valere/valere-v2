-- ─────────────────────────────────────────────────────────────────────────────
-- HITO 2 — Factura Teórica v1
-- Tabla de condiciones tarifarias por CUPS + seed con facturas reales
-- Extraídas de facturas CHEMTROL ESPAÑOLA SA, marzo 2026
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS datadis_supply_price_terms (
  id                       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación
  cups                     text          NOT NULL,
  comercializadora         text,
  tarifa                   text          NOT NULL,           -- '2.0TD' | '3.0TD' | '6.1TD'

  -- Vigencia
  valid_from               date          NOT NULL,
  valid_to                 date,                            -- NULL = vigente

  -- Potencia en cent€/kW/día (incluye peajes + cargos + margen comercializadora)
  potencia_p1_c            numeric(10,4),
  potencia_p2_c            numeric(10,4),
  potencia_p3_c            numeric(10,4),
  potencia_p4_c            numeric(10,4),
  potencia_p5_c            numeric(10,4),
  potencia_p6_c            numeric(10,4),

  -- Energía en cent€/kWh (incluye peajes + cargos + coste energía comercializadora)
  -- NULL = sin datos de factura (no hubo consumo ese período en las facturas de referencia)
  energia_p1_c             numeric(10,4),
  energia_p2_c             numeric(10,4),
  energia_p3_c             numeric(10,4),
  energia_p4_c             numeric(10,4),
  energia_p5_c             numeric(10,4),
  energia_p6_c             numeric(10,4),

  -- Fiscalidad
  iva_pct                  numeric(5,2)  NOT NULL DEFAULT 21,  -- 10 (≤10 kW, RD-ley 7/2026) ó 21

  -- Cargos fijos diarios
  alquiler_equipo_dia_eur  numeric(10,6),                   -- €/día (pagado a distribuidora)
  bono_social_dia_eur      numeric(10,6),                   -- €/día (solo tarifas ≤10 kW)

  -- Metadata
  fuente                   text          DEFAULT 'factura', -- 'factura' | 'boe' | 'estimado'
  notas                    text,

  created_at               timestamptz   DEFAULT now(),
  updated_at               timestamptz   DEFAULT now()
);

-- ── Índices ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_dspt_cups_valid
  ON datadis_supply_price_terms (cups, valid_from DESC);

-- Solo un registro activo (sin valid_to) por CUPS
CREATE UNIQUE INDEX IF NOT EXISTS idx_dspt_cups_active
  ON datadis_supply_price_terms (cups)
  WHERE valid_to IS NULL;

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE datadis_supply_price_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users manage price terms"
  ON datadis_supply_price_terms
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: Precios extraídos de facturas reales CHEMTROL, marzo 2026
-- Fuente: 5 PDFs analizados sesión 2026-05-14
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 3.0TD · Nexus Energía (The Yellow Energy) · ENDESA distribuidora ─────────
-- Fuente: facturas 2010SA + 6004KV + 9001PK (marzo 2026)
-- P4/P5 energía NULL: ningún CUPS tuvo consumo en esos períodos en la factura de referencia
-- P1 energía: extraído de 9001PK (único con consumo P1)
-- Alquiler: 11,01 € / 31 días = 0,355161 €/día

INSERT INTO datadis_supply_price_terms (
  cups, comercializadora, tarifa, valid_from,
  potencia_p1_c, potencia_p2_c, potencia_p3_c, potencia_p4_c, potencia_p5_c, potencia_p6_c,
  energia_p1_c,  energia_p2_c,  energia_p3_c,  energia_p4_c,  energia_p5_c,  energia_p6_c,
  iva_pct, alquiler_equipo_dia_eur, fuente, notas
) VALUES
(
  'ES0031104950142010SA', 'Nexus Energía (The Yellow Energy)', '3.0TD', '2026-01-01',
  5.5827, 2.9089, 1.2278, 1.0647, 0.6887, 0.3951,
  18.7857, 14.9270, 11.3612, NULL, NULL, 9.3468,
  21, 0.355161, 'factura',
  'Factura YE2604EL00061802 (mar-2026). Pot. contratada 15,01 kW P1-P6. '
  'P4/P5 energía sin dato (0 kWh en factura). Excluye Reg.RRTT (68,11€) e IEE especial.'
),
(
  'ES0031102811976004KV', 'Nexus Energía (The Yellow Energy)', '3.0TD', '2026-01-01',
  5.5827, 2.9089, 1.2278, 1.0647, 0.6887, 0.3951,
  18.7857, 14.9270, 11.3612, NULL, NULL, 9.3468,
  21, 0.355161, 'factura',
  'Factura YE2604EL00061805 (mar-2026). Pot. contratada 15,01 kW P1-P6. '
  'P4/P5 energía sin dato (0 kWh en factura). Excluye Reg.RRTT (17,21€).'
),
(
  'ES0031101560969001PK', 'Nexus Energía (The Yellow Energy)', '3.0TD', '2026-01-01',
  5.5827, 2.9089, 1.2278, 1.0647, 0.6887, 0.3951,
  18.7857, 14.9270, 11.3612, NULL, NULL, 9.3468,
  21, 0.355161, 'factura',
  'Factura YE2604EL00061806 (24-feb/17-mar-2026). Pot. P1=4,7 kW P2-P5=5,8 kW P6=33,75 kW. '
  'P1 energía disponible (56 kWh). P4/P5 energía sin dato. Excluye Reg.RRTT (120,51€).'
);

-- ── 2.0TD · Naturgy Clientes · Distribuidora Eléctrica Tentudia ──────────────
-- Fuente: factura FE26390014687171 (mar-2026)
-- Plan Fijo Luz 24h: precio energía plano para punta/llano/valle
-- En 2.0TD: P1=punta, P2=llano, P3=valle (terminología DataDis)
-- Potencia P1 cubre punta+llano; P2 cubre valle
-- IVA 10% (pot. contratada 5,196 kW < 10 kW — RD-ley 7/2026)
-- Alquiler: 0,044712 €/día | Bono social: 0,019121 €/día

INSERT INTO datadis_supply_price_terms (
  cups, comercializadora, tarifa, valid_from,
  potencia_p1_c, potencia_p2_c,
  energia_p1_c, energia_p2_c, energia_p3_c,
  iva_pct, alquiler_equipo_dia_eur, bono_social_dia_eur, fuente, notas
) VALUES (
  'ES0230114135061023SN', 'Naturgy Clientes', '2.0TD', '2026-01-01',
  12.2973, 4.3976,
  14.2913, 14.2913, 14.2913,
  10, 0.044712, 0.019121, 'factura',
  'Factura FE26390014687171 (mar-2026). Plan Fijo Luz 24h — precio energía plano. '
  'Distribuidora: Tentudia. Pot. contratada P1=P2=5,196 kW. IVA 10% por pot<10kW.'
);

-- ── 6.1TD · Bassols Energía Comercial · Distribuidora Eléctrica Monesterio ───
-- Fuente: factura 202601O095850 (28-feb/31-mar-2026)
-- Potencia: solo peajes regulados (sin margen comercializadora en potencia)
-- Energía: precio total = coste comercializadora + peajes + cargos
-- Precios del contrato explícitos en factura Bassols ("ECOSMART BASE FIJO")
-- IVA 10% (pot. contratada 5 kW/período < 10 kW — RD-ley 7/2026)
-- Alquiler: 2,38 € / 31 días = 0,076774 €/día

INSERT INTO datadis_supply_price_terms (
  cups, comercializadora, tarifa, valid_from,
  potencia_p1_c, potencia_p2_c, potencia_p3_c, potencia_p4_c, potencia_p5_c, potencia_p6_c,
  energia_p1_c,  energia_p2_c,  energia_p3_c,  energia_p4_c,  energia_p5_c,  energia_p6_c,
  iva_pct, alquiler_equipo_dia_eur, fuente, notas
) VALUES (
  'ES0227026054455000HZ0F', 'Bassols Energía Comercial', '6.1TD', '2026-01-01',
  8.1083, 4.2506, 1.8635, 1.4778, 0.5822, 0.2751,
  16.6310, 14.2729, 12.4100, 10.9956, 10.4898, 11.8119,
  10, 0.076774, 'factura',
  'Factura 202601O095850 (28-feb/31-mar-2026). Contrato ECOSMART BASE FIJO ref.945842. '
  'Pot.P1-P6=5kW. Potencia=solo peajes. Energía=coste+peajes+cargos (precios explícitos en factura). '
  'Distribuidora: Monesterio. IVA 10% por pot<10kW.'
);
