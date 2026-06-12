export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      _migration_ciclo_map: {
        Row: {
          canonical_id: string
          legacy_potencia_id: string
        }
        Insert: {
          canonical_id: string
          legacy_potencia_id: string
        }
        Update: {
          canonical_id?: string
          legacy_potencia_id?: string
        }
        Relationships: []
      }
      _migration_comercializadora_map: {
        Row: {
          canonical_id: string
          legacy_potencia_id: string
        }
        Insert: {
          canonical_id: string
          legacy_potencia_id: string
        }
        Update: {
          canonical_id?: string
          legacy_potencia_id?: string
        }
        Relationships: []
      }
      _migration_cups_map: {
        Row: {
          canonical_id: string
          fusionada: boolean | null
          legacy_potencia_id: string
        }
        Insert: {
          canonical_id: string
          fusionada?: boolean | null
          legacy_potencia_id: string
        }
        Update: {
          canonical_id?: string
          fusionada?: boolean | null
          legacy_potencia_id?: string
        }
        Relationships: []
      }
      _migration_empresa_map: {
        Row: {
          canonical_id: string
          fusionada: boolean | null
          legacy_potencia_id: string
        }
        Insert: {
          canonical_id: string
          fusionada?: boolean | null
          legacy_potencia_id: string
        }
        Update: {
          canonical_id?: string
          fusionada?: boolean | null
          legacy_potencia_id?: string
        }
        Relationships: []
      }
      _migration_expediente_map: {
        Row: {
          canonical_id: string
          legacy_potencia_id: string
        }
        Insert: {
          canonical_id: string
          legacy_potencia_id: string
        }
        Update: {
          canonical_id?: string
          legacy_potencia_id?: string
        }
        Relationships: []
      }
      _migration_request_map: {
        Row: {
          canonical_id: string
          legacy_potencia_id: string
        }
        Insert: {
          canonical_id: string
          legacy_potencia_id: string
        }
        Update: {
          canonical_id?: string
          legacy_potencia_id?: string
        }
        Relationships: []
      }
      _migration_user_map: {
        Row: {
          canonical_id: string
          legacy_potencia_id: string
        }
        Insert: {
          canonical_id: string
          legacy_potencia_id: string
        }
        Update: {
          canonical_id?: string
          legacy_potencia_id?: string
        }
        Relationships: []
      }
      actividades: {
        Row: {
          adjunto_nombre: string | null
          adjunto_url: string | null
          asignado_a: string | null
          created_at: string
          deleted_at: string | null
          descripcion: string | null
          duracion_min: number | null
          entidad_id: string
          entidad_tipo: string
          estado_tarea: string | null
          fecha_actividad: string
          fecha_vencimiento: string | null
          holded_etag: string | null
          holded_id: string | null
          holded_synced_at: string | null
          id: string
          prioridad: string | null
          privada: boolean
          resultado: string | null
          tipo: string
          titulo: string
          usuario_id: string | null
        }
        Insert: {
          adjunto_nombre?: string | null
          adjunto_url?: string | null
          asignado_a?: string | null
          created_at?: string
          deleted_at?: string | null
          descripcion?: string | null
          duracion_min?: number | null
          entidad_id: string
          entidad_tipo: string
          estado_tarea?: string | null
          fecha_actividad?: string
          fecha_vencimiento?: string | null
          holded_etag?: string | null
          holded_id?: string | null
          holded_synced_at?: string | null
          id?: string
          prioridad?: string | null
          privada?: boolean
          resultado?: string | null
          tipo: string
          titulo: string
          usuario_id?: string | null
        }
        Update: {
          adjunto_nombre?: string | null
          adjunto_url?: string | null
          asignado_a?: string | null
          created_at?: string
          deleted_at?: string | null
          descripcion?: string | null
          duracion_min?: number | null
          entidad_id?: string
          entidad_tipo?: string
          estado_tarea?: string | null
          fecha_actividad?: string
          fecha_vencimiento?: string | null
          holded_etag?: string | null
          holded_id?: string | null
          holded_synced_at?: string | null
          id?: string
          prioridad?: string | null
          privada?: boolean
          resultado?: string | null
          tipo?: string
          titulo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actividades_asignado_a_fkey"
            columns: ["asignado_a"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_asignado_a_fkey"
            columns: ["asignado_a"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "actividades_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      alertas: {
        Row: {
          ciclo_id: string | null
          created_at: string
          cups_id: string | null
          empresa_id: string | null
          expediente_id: string | null
          fecha_alerta: string
          fecha_lectura: string | null
          id: string
          legacy_potencia_id: string | null
          leida: boolean
          leida_por: string | null
          mensaje: string
          request_id: string | null
          tipo: string
        }
        Insert: {
          ciclo_id?: string | null
          created_at?: string
          cups_id?: string | null
          empresa_id?: string | null
          expediente_id?: string | null
          fecha_alerta: string
          fecha_lectura?: string | null
          id?: string
          legacy_potencia_id?: string | null
          leida?: boolean
          leida_por?: string | null
          mensaje: string
          request_id?: string | null
          tipo: string
        }
        Update: {
          ciclo_id?: string | null
          created_at?: string
          cups_id?: string | null
          empresa_id?: string | null
          expediente_id?: string | null
          fecha_alerta?: string
          fecha_lectura?: string | null
          id?: string
          legacy_potencia_id?: string | null
          leida?: boolean
          leida_por?: string | null
          mensaje?: string
          request_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_cups_id_fkey"
            columns: ["cups_id"]
            isOneToOne: false
            referencedRelation: "cups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_cups_id_fkey"
            columns: ["cups_id"]
            isOneToOne: false
            referencedRelation: "supply_points_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_expediente_id_fkey"
            columns: ["expediente_id"]
            isOneToOne: false
            referencedRelation: "expedientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_leida_por_fkey"
            columns: ["leida_por"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_leida_por_fkey"
            columns: ["leida_por"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "alertas_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "solicitudes_potencia"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      ciclos: {
        Row: {
          ahorro_previsto_total: number | null
          ahorro_real_total: number | null
          created_at: string
          estado: string
          expediente_id: string
          id: string
          legacy_potencia_id: string | null
          numero_ciclo: number
        }
        Insert: {
          ahorro_previsto_total?: number | null
          ahorro_real_total?: number | null
          created_at?: string
          estado: string
          expediente_id: string
          id?: string
          legacy_potencia_id?: string | null
          numero_ciclo: number
        }
        Update: {
          ahorro_previsto_total?: number | null
          ahorro_real_total?: number | null
          created_at?: string
          estado?: string
          expediente_id?: string
          id?: string
          legacy_potencia_id?: string | null
          numero_ciclo?: number
        }
        Relationships: [
          {
            foreignKeyName: "ciclos_expediente_id_fkey"
            columns: ["expediente_id"]
            isOneToOne: false
            referencedRelation: "expedientes"
            referencedColumns: ["id"]
          },
        ]
      }
      comercializadora_docs: {
        Row: {
          campos_detectados: Json
          campos_mapeados: Json
          comercializadora_id: string
          created_at: string
          descripcion: string | null
          es_plantilla_autorizacion: boolean
          id: string
          instrucciones: string | null
          legacy_potencia_id: string | null
          nombre: string
          nombre_archivo: string
          storage_path: string
          subido_por: string | null
          tamano_bytes: number | null
        }
        Insert: {
          campos_detectados?: Json
          campos_mapeados?: Json
          comercializadora_id: string
          created_at?: string
          descripcion?: string | null
          es_plantilla_autorizacion?: boolean
          id?: string
          instrucciones?: string | null
          legacy_potencia_id?: string | null
          nombre: string
          nombre_archivo: string
          storage_path: string
          subido_por?: string | null
          tamano_bytes?: number | null
        }
        Update: {
          campos_detectados?: Json
          campos_mapeados?: Json
          comercializadora_id?: string
          created_at?: string
          descripcion?: string | null
          es_plantilla_autorizacion?: boolean
          id?: string
          instrucciones?: string | null
          legacy_potencia_id?: string | null
          nombre?: string
          nombre_archivo?: string
          storage_path?: string
          subido_por?: string | null
          tamano_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comercializadora_docs_comercializadora_id_fkey"
            columns: ["comercializadora_id"]
            isOneToOne: false
            referencedRelation: "comercializadoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comercializadora_docs_comercializadora_id_fkey"
            columns: ["comercializadora_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comercializadora_docs_subido_por_fkey"
            columns: ["subido_por"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comercializadora_docs_subido_por_fkey"
            columns: ["subido_por"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      comercializadora_ofertas: {
        Row: {
          access_rate: string | null
          activation_fee_eur: number | null
          allow_zero_invoice: boolean | null
          annual_management_fee_eur: number | null
          auto_renewal_months: number | null
          battery_fee_per_kwp_eur: number | null
          comercializadora_id: string | null
          confidence_score: number | null
          contractable: boolean | null
          created_at: string | null
          discount_description: string | null
          discount_fixed_eur_year: number | null
          discount_pct_energy: number | null
          discount_pct_power: number | null
          energy_prices: number[] | null
          entry_fee_eur: number | null
          entry_fee_per_kw: number | null
          exempt_electricity_tax: boolean | null
          extension_data: Json | null
          extracted_by_ai: boolean | null
          green_energy_gdo: boolean | null
          id: string
          include_in_comparison: boolean | null
          index_margin_per_kwh: number | null
          is_promotional: boolean | null
          min_contract_months: number | null
          non_promotional_oferta_id: string | null
          notes: string | null
          power_p1_threshold_kw: number | null
          power_p1_threshold_op: string | null
          power_prices: number[] | null
          power_unit: string | null
          price_revision_terms: string | null
          pricing_type: string | null
          product_name: string | null
          requires_electronic_invoice: boolean | null
          sales_channels: string[] | null
          show_tolls_separately: boolean | null
          source_document_id: string | null
          status: string | null
          superseded_by: string | null
          surplus_model: string | null
          surplus_price_per_kwh: number | null
          telemedida: string | null
          tempo_hours_description: string | null
          tempo_hours_discount_pct: number | null
          tender_fee_pct: number | null
          valid_from: string | null
          valid_to: string | null
          validated_at: string | null
          validated_by: string | null
          version: number | null
          zones: string[] | null
        }
        Insert: {
          access_rate?: string | null
          activation_fee_eur?: number | null
          allow_zero_invoice?: boolean | null
          annual_management_fee_eur?: number | null
          auto_renewal_months?: number | null
          battery_fee_per_kwp_eur?: number | null
          comercializadora_id?: string | null
          confidence_score?: number | null
          contractable?: boolean | null
          created_at?: string | null
          discount_description?: string | null
          discount_fixed_eur_year?: number | null
          discount_pct_energy?: number | null
          discount_pct_power?: number | null
          energy_prices?: number[] | null
          entry_fee_eur?: number | null
          entry_fee_per_kw?: number | null
          exempt_electricity_tax?: boolean | null
          extension_data?: Json | null
          extracted_by_ai?: boolean | null
          green_energy_gdo?: boolean | null
          id?: string
          include_in_comparison?: boolean | null
          index_margin_per_kwh?: number | null
          is_promotional?: boolean | null
          min_contract_months?: number | null
          non_promotional_oferta_id?: string | null
          notes?: string | null
          power_p1_threshold_kw?: number | null
          power_p1_threshold_op?: string | null
          power_prices?: number[] | null
          power_unit?: string | null
          price_revision_terms?: string | null
          pricing_type?: string | null
          product_name?: string | null
          requires_electronic_invoice?: boolean | null
          sales_channels?: string[] | null
          show_tolls_separately?: boolean | null
          source_document_id?: string | null
          status?: string | null
          superseded_by?: string | null
          surplus_model?: string | null
          surplus_price_per_kwh?: number | null
          telemedida?: string | null
          tempo_hours_description?: string | null
          tempo_hours_discount_pct?: number | null
          tender_fee_pct?: number | null
          valid_from?: string | null
          valid_to?: string | null
          validated_at?: string | null
          validated_by?: string | null
          version?: number | null
          zones?: string[] | null
        }
        Update: {
          access_rate?: string | null
          activation_fee_eur?: number | null
          allow_zero_invoice?: boolean | null
          annual_management_fee_eur?: number | null
          auto_renewal_months?: number | null
          battery_fee_per_kwp_eur?: number | null
          comercializadora_id?: string | null
          confidence_score?: number | null
          contractable?: boolean | null
          created_at?: string | null
          discount_description?: string | null
          discount_fixed_eur_year?: number | null
          discount_pct_energy?: number | null
          discount_pct_power?: number | null
          energy_prices?: number[] | null
          entry_fee_eur?: number | null
          entry_fee_per_kw?: number | null
          exempt_electricity_tax?: boolean | null
          extension_data?: Json | null
          extracted_by_ai?: boolean | null
          green_energy_gdo?: boolean | null
          id?: string
          include_in_comparison?: boolean | null
          index_margin_per_kwh?: number | null
          is_promotional?: boolean | null
          min_contract_months?: number | null
          non_promotional_oferta_id?: string | null
          notes?: string | null
          power_p1_threshold_kw?: number | null
          power_p1_threshold_op?: string | null
          power_prices?: number[] | null
          power_unit?: string | null
          price_revision_terms?: string | null
          pricing_type?: string | null
          product_name?: string | null
          requires_electronic_invoice?: boolean | null
          sales_channels?: string[] | null
          show_tolls_separately?: boolean | null
          source_document_id?: string | null
          status?: string | null
          superseded_by?: string | null
          surplus_model?: string | null
          surplus_price_per_kwh?: number | null
          telemedida?: string | null
          tempo_hours_description?: string | null
          tempo_hours_discount_pct?: number | null
          tender_fee_pct?: number | null
          valid_from?: string | null
          valid_to?: string | null
          validated_at?: string | null
          validated_by?: string | null
          version?: number | null
          zones?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "comercializadora_ofertas_non_promotional_oferta_id_fkey"
            columns: ["non_promotional_oferta_id"]
            isOneToOne: false
            referencedRelation: "comercializadora_ofertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comercializadora_ofertas_non_promotional_oferta_id_fkey"
            columns: ["non_promotional_oferta_id"]
            isOneToOne: false
            referencedRelation: "retailer_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comercializadora_ofertas_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "comercializadora_ofertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comercializadora_ofertas_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "retailer_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comercializadora_ofertas_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comercializadora_ofertas_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "fk_oferta_source_document"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "tariff_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retailer_offers_retailer_id_fkey"
            columns: ["comercializadora_id"]
            isOneToOne: false
            referencedRelation: "comercializadoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retailer_offers_retailer_id_fkey"
            columns: ["comercializadora_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      comercializadora_productos_servicios: {
        Row: {
          cliente_objetivo: string | null
          comercializadora_id: string
          created_at: string
          descuento_tier: number | null
          id: string
          nombre: string
          notes: string | null
          precio_mes_eur: number | null
          precio_mes_eur_con_igic: number | null
          precio_mes_eur_con_ipsi: number | null
          precio_mes_eur_con_iva: number | null
          promocion: string | null
          source_document_id: string | null
          status: string | null
          tipo: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          cliente_objetivo?: string | null
          comercializadora_id: string
          created_at?: string
          descuento_tier?: number | null
          id?: string
          nombre: string
          notes?: string | null
          precio_mes_eur?: number | null
          precio_mes_eur_con_igic?: number | null
          precio_mes_eur_con_ipsi?: number | null
          precio_mes_eur_con_iva?: number | null
          promocion?: string | null
          source_document_id?: string | null
          status?: string | null
          tipo?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          cliente_objetivo?: string | null
          comercializadora_id?: string
          created_at?: string
          descuento_tier?: number | null
          id?: string
          nombre?: string
          notes?: string | null
          precio_mes_eur?: number | null
          precio_mes_eur_con_igic?: number | null
          precio_mes_eur_con_ipsi?: number | null
          precio_mes_eur_con_iva?: number | null
          promocion?: string | null
          source_document_id?: string | null
          status?: string | null
          tipo?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comercializadora_productos_servicios_comercializadora_id_fkey"
            columns: ["comercializadora_id"]
            isOneToOne: false
            referencedRelation: "comercializadoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comercializadora_productos_servicios_comercializadora_id_fkey"
            columns: ["comercializadora_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comercializadora_productos_servicios_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "tariff_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      comercializadoras: {
        Row: {
          activa: boolean | null
          agente_referencia: string | null
          created_at: string | null
          email_contacto: string | null
          id: string
          is_active: boolean | null
          legacy_potencia_com_id: string | null
          logo_url: string | null
          model: string | null
          name: string
          nif: string | null
          nombre_normalizado: string | null
          notes: string | null
          tipo_energia: string | null
          web: string | null
        }
        Insert: {
          activa?: boolean | null
          agente_referencia?: string | null
          created_at?: string | null
          email_contacto?: string | null
          id?: string
          is_active?: boolean | null
          legacy_potencia_com_id?: string | null
          logo_url?: string | null
          model?: string | null
          name: string
          nif?: string | null
          nombre_normalizado?: string | null
          notes?: string | null
          tipo_energia?: string | null
          web?: string | null
        }
        Update: {
          activa?: boolean | null
          agente_referencia?: string | null
          created_at?: string | null
          email_contacto?: string | null
          id?: string
          is_active?: boolean | null
          legacy_potencia_com_id?: string | null
          logo_url?: string | null
          model?: string | null
          name?: string
          nif?: string | null
          nombre_normalizado?: string | null
          notes?: string | null
          tipo_energia?: string | null
          web?: string | null
        }
        Relationships: []
      }
      comunicaciones_cliente: {
        Row: {
          asunto: string
          cc_email: string | null
          ciclo_id: string | null
          created_at: string
          cuerpo_html: string
          destinatario_email: string
          empresa_id: string
          enviado_por: string | null
          error_detalle: string | null
          estado: string
          expediente_id: string | null
          fecha_envio: string | null
          id: string
          legacy_potencia_id: string | null
          resend_message_id: string | null
          tipo: string
        }
        Insert: {
          asunto: string
          cc_email?: string | null
          ciclo_id?: string | null
          created_at?: string
          cuerpo_html: string
          destinatario_email: string
          empresa_id: string
          enviado_por?: string | null
          error_detalle?: string | null
          estado: string
          expediente_id?: string | null
          fecha_envio?: string | null
          id?: string
          legacy_potencia_id?: string | null
          resend_message_id?: string | null
          tipo: string
        }
        Update: {
          asunto?: string
          cc_email?: string | null
          ciclo_id?: string | null
          created_at?: string
          cuerpo_html?: string
          destinatario_email?: string
          empresa_id?: string
          enviado_por?: string | null
          error_detalle?: string | null
          estado?: string
          expediente_id?: string | null
          fecha_envio?: string | null
          id?: string
          legacy_potencia_id?: string | null
          resend_message_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicaciones_cliente_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicaciones_cliente_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicaciones_cliente_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicaciones_cliente_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicaciones_cliente_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicaciones_cliente_enviado_por_fkey"
            columns: ["enviado_por"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicaciones_cliente_enviado_por_fkey"
            columns: ["enviado_por"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "comunicaciones_cliente_expediente_id_fkey"
            columns: ["expediente_id"]
            isOneToOne: false
            referencedRelation: "expedientes"
            referencedColumns: ["id"]
          },
        ]
      }
      consentimientos_datadis: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          created_by: string | null
          cups: string
          fecha_fin_autorizacion: string
          fecha_firma: string
          fecha_inicio_autorizacion: string
          firmado_por_email: string
          firmado_por_nombre: string | null
          hash_texto: string
          id: string
          ip_firma: unknown
          revocado_at: string | null
          revocado_motivo: string | null
          texto_legal: string
          updated_at: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          created_by?: string | null
          cups: string
          fecha_fin_autorizacion: string
          fecha_firma?: string
          fecha_inicio_autorizacion: string
          firmado_por_email: string
          firmado_por_nombre?: string | null
          hash_texto: string
          id?: string
          ip_firma: unknown
          revocado_at?: string | null
          revocado_motivo?: string | null
          texto_legal: string
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          created_by?: string | null
          cups?: string
          fecha_fin_autorizacion?: string
          fecha_firma?: string
          fecha_inicio_autorizacion?: string
          firmado_por_email?: string
          firmado_por_nombre?: string | null
          hash_texto?: string
          id?: string
          ip_firma?: unknown
          revocado_at?: string | null
          revocado_motivo?: string | null
          texto_legal?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consentimientos_datadis_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consentimientos_datadis_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consentimientos_datadis_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consentimientos_datadis_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consentimientos_datadis_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consentimientos_datadis_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      contactos: {
        Row: {
          apellidos: string | null
          cargo: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          departamento: string | null
          email: string | null
          empresa_id: string
          es_decisor: boolean
          es_firmante: boolean
          es_principal: boolean
          extension: string | null
          holded_etag: string | null
          holded_id: string | null
          holded_synced_at: string | null
          id: string
          movil: string | null
          nombre: string
          notas: string | null
          tags: string[] | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          apellidos?: string | null
          cargo?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          departamento?: string | null
          email?: string | null
          empresa_id: string
          es_decisor?: boolean
          es_firmante?: boolean
          es_principal?: boolean
          extension?: string | null
          holded_etag?: string | null
          holded_id?: string | null
          holded_synced_at?: string | null
          id?: string
          movil?: string | null
          nombre: string
          notas?: string | null
          tags?: string[] | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          apellidos?: string | null
          cargo?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          departamento?: string | null
          email?: string | null
          empresa_id?: string
          es_decisor?: boolean
          es_firmante?: boolean
          es_principal?: boolean
          extension?: string | null
          holded_etag?: string | null
          holded_id?: string | null
          holded_synced_at?: string | null
          id?: string
          movil?: string | null
          nombre?: string
          notas?: string | null
          tags?: string[] | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contactos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contactos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "contactos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contactos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contactos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contactos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          comercial_id: string | null
          comision_comercial: number | null
          comision_integra: number | null
          comision_jefe: number | null
          compania: string
          consumo_po_kwh: number | null
          consumo_sips_kwh: number | null
          contacto_firmante_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          duracion_meses: number | null
          empresa_id: string
          estado: string
          external_id: string | null
          fecha_fin: string | null
          fecha_firma: string | null
          fecha_inicio: string | null
          holded_etag: string | null
          holded_id: string | null
          holded_synced_at: string | null
          id: string
          numero_contrato: string | null
          observaciones: string | null
          potencia_contratada: number | null
          tarifa_acceso: string | null
          tarifa_cliente: string | null
          tipo_energia: string | null
          tipo_precio: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          comercial_id?: string | null
          comision_comercial?: number | null
          comision_integra?: number | null
          comision_jefe?: number | null
          compania: string
          consumo_po_kwh?: number | null
          consumo_sips_kwh?: number | null
          contacto_firmante_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          duracion_meses?: number | null
          empresa_id: string
          estado?: string
          external_id?: string | null
          fecha_fin?: string | null
          fecha_firma?: string | null
          fecha_inicio?: string | null
          holded_etag?: string | null
          holded_id?: string | null
          holded_synced_at?: string | null
          id?: string
          numero_contrato?: string | null
          observaciones?: string | null
          potencia_contratada?: number | null
          tarifa_acceso?: string | null
          tarifa_cliente?: string | null
          tipo_energia?: string | null
          tipo_precio?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          comercial_id?: string | null
          comision_comercial?: number | null
          comision_integra?: number | null
          comision_jefe?: number | null
          compania?: string
          consumo_po_kwh?: number | null
          consumo_sips_kwh?: number | null
          contacto_firmante_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          duracion_meses?: number | null
          empresa_id?: string
          estado?: string
          external_id?: string | null
          fecha_fin?: string | null
          fecha_firma?: string | null
          fecha_inicio?: string | null
          holded_etag?: string | null
          holded_id?: string | null
          holded_synced_at?: string | null
          id?: string
          numero_contrato?: string | null
          observaciones?: string | null
          potencia_contratada?: number | null
          tarifa_acceso?: string | null
          tarifa_cliente?: string | null
          tipo_energia?: string | null
          tipo_precio?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "contratos_contacto_firmante_id_fkey"
            columns: ["contacto_firmante_id"]
            isOneToOne: false
            referencedRelation: "contactos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      crm_asistente_log: {
        Row: {
          duracion_ms: number | null
          encontrada_respuesta: boolean
          fecha: string
          id: string
          num_chunks_encontrados: number
          pregunta: string
          pregunta_normalizada: string | null
          provider: string
          seccion: string | null
          top_similarity: number | null
        }
        Insert: {
          duracion_ms?: number | null
          encontrada_respuesta: boolean
          fecha?: string
          id?: string
          num_chunks_encontrados?: number
          pregunta: string
          pregunta_normalizada?: string | null
          provider?: string
          seccion?: string | null
          top_similarity?: number | null
        }
        Update: {
          duracion_ms?: number | null
          encontrada_respuesta?: boolean
          fecha?: string
          id?: string
          num_chunks_encontrados?: number
          pregunta?: string
          pregunta_normalizada?: string | null
          provider?: string
          seccion?: string | null
          top_similarity?: number | null
        }
        Relationships: []
      }
      crm_help_embeddings: {
        Row: {
          chunk_index: number
          chunk_text: string
          created_at: string
          embedding: string
          id: string
          section: string
          source_path: string
          source_url: string | null
          title: string
        }
        Insert: {
          chunk_index?: number
          chunk_text: string
          created_at?: string
          embedding: string
          id?: string
          section?: string
          source_path: string
          source_url?: string | null
          title: string
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          embedding?: string
          id?: string
          section?: string
          source_path?: string
          source_url?: string | null
          title?: string
        }
        Relationships: []
      }
      cups: {
        Row: {
          channel: string | null
          ciudad_suministro: string | null
          codigo_cups: string
          comercializadora_actual: string | null
          contrato_id: string | null
          coste_instalacion_fv_eur: number | null
          created_at: string
          datadis_autorizacion_id: string | null
          datadis_autorizado: boolean | null
          datadis_distribuidor_cod: string | null
          datadis_distributor_code: string | null
          datadis_point_type: number | null
          datadis_punto_tipo: number | null
          datadis_sincronizado: boolean | null
          datadis_tarifa_code: string | null
          datadis_ultima_sync: string | null
          datadis_ultimo_fetch: string | null
          deleted_at: string | null
          denominacion: string | null
          direccion_suministro: string | null
          distribuidor: string | null
          empresa_id: string
          energia_p1_kwh: number | null
          energia_p2_kwh: number | null
          energia_p3_kwh: number | null
          energia_p4_kwh: number | null
          energia_p5_kwh: number | null
          energia_p6_kwh: number | null
          estado: string
          fecha_instalacion_fv: string | null
          id: string
          legacy_potencia_id: string | null
          marca_inversor: string | null
          modelo_autoconsumo: string | null
          modelo_autoconsumo_manual: string | null
          p1_kw: number | null
          p2_kw: number | null
          p3_kw: number | null
          p4_kw: number | null
          p5_kw: number | null
          p6_kw: number | null
          potencia_fv_kwp: number | null
          potencia_inversor_kw: number | null
          potencia_maxima_disponible: number | null
          potencias_contratadas: Json | null
          tarifa_acceso: string | null
          tarifa_manual: string | null
          tension_kv: number | null
        }
        Insert: {
          channel?: string | null
          ciudad_suministro?: string | null
          codigo_cups: string
          comercializadora_actual?: string | null
          contrato_id?: string | null
          coste_instalacion_fv_eur?: number | null
          created_at?: string
          datadis_autorizacion_id?: string | null
          datadis_autorizado?: boolean | null
          datadis_distribuidor_cod?: string | null
          datadis_distributor_code?: string | null
          datadis_point_type?: number | null
          datadis_punto_tipo?: number | null
          datadis_sincronizado?: boolean | null
          datadis_tarifa_code?: string | null
          datadis_ultima_sync?: string | null
          datadis_ultimo_fetch?: string | null
          deleted_at?: string | null
          denominacion?: string | null
          direccion_suministro?: string | null
          distribuidor?: string | null
          empresa_id: string
          energia_p1_kwh?: number | null
          energia_p2_kwh?: number | null
          energia_p3_kwh?: number | null
          energia_p4_kwh?: number | null
          energia_p5_kwh?: number | null
          energia_p6_kwh?: number | null
          estado?: string
          fecha_instalacion_fv?: string | null
          id?: string
          legacy_potencia_id?: string | null
          marca_inversor?: string | null
          modelo_autoconsumo?: string | null
          modelo_autoconsumo_manual?: string | null
          p1_kw?: number | null
          p2_kw?: number | null
          p3_kw?: number | null
          p4_kw?: number | null
          p5_kw?: number | null
          p6_kw?: number | null
          potencia_fv_kwp?: number | null
          potencia_inversor_kw?: number | null
          potencia_maxima_disponible?: number | null
          potencias_contratadas?: Json | null
          tarifa_acceso?: string | null
          tarifa_manual?: string | null
          tension_kv?: number | null
        }
        Update: {
          channel?: string | null
          ciudad_suministro?: string | null
          codigo_cups?: string
          comercializadora_actual?: string | null
          contrato_id?: string | null
          coste_instalacion_fv_eur?: number | null
          created_at?: string
          datadis_autorizacion_id?: string | null
          datadis_autorizado?: boolean | null
          datadis_distribuidor_cod?: string | null
          datadis_distributor_code?: string | null
          datadis_point_type?: number | null
          datadis_punto_tipo?: number | null
          datadis_sincronizado?: boolean | null
          datadis_tarifa_code?: string | null
          datadis_ultima_sync?: string | null
          datadis_ultimo_fetch?: string | null
          deleted_at?: string | null
          denominacion?: string | null
          direccion_suministro?: string | null
          distribuidor?: string | null
          empresa_id?: string
          energia_p1_kwh?: number | null
          energia_p2_kwh?: number | null
          energia_p3_kwh?: number | null
          energia_p4_kwh?: number | null
          energia_p5_kwh?: number | null
          energia_p6_kwh?: number | null
          estado?: string
          fecha_instalacion_fv?: string | null
          id?: string
          legacy_potencia_id?: string | null
          marca_inversor?: string | null
          modelo_autoconsumo?: string | null
          modelo_autoconsumo_manual?: string | null
          p1_kw?: number | null
          p2_kw?: number | null
          p3_kw?: number | null
          p4_kw?: number | null
          p5_kw?: number | null
          p6_kw?: number | null
          potencia_fv_kwp?: number | null
          potencia_inversor_kw?: number | null
          potencia_maxima_disponible?: number | null
          potencias_contratadas?: Json | null
          tarifa_acceso?: string | null
          tarifa_manual?: string | null
          tension_kv?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cups_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cups_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_por_vencer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cups_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_contratos_activos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cups_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_oportunidades_huerfanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cups_datadis_autorizacion_id_fkey"
            columns: ["datadis_autorizacion_id"]
            isOneToOne: false
            referencedRelation: "consentimientos_datadis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cups_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cups_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cups_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cups_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields_schema: {
        Row: {
          activo: boolean
          created_at: string
          entidad_tipo: string
          etiqueta: string
          id: string
          nombre_campo: string
          obligatorio: boolean
          opciones_lista: Json | null
          orden: number
          tipo_dato: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          entidad_tipo: string
          etiqueta: string
          id?: string
          nombre_campo: string
          obligatorio?: boolean
          opciones_lista?: Json | null
          orden?: number
          tipo_dato: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          entidad_tipo?: string
          etiqueta?: string
          id?: string
          nombre_campo?: string
          obligatorio?: boolean
          opciones_lista?: Json | null
          orden?: number
          tipo_dato?: string
        }
        Relationships: []
      }
      custom_fields_values: {
        Row: {
          created_at: string
          entidad_id: string
          id: string
          schema_id: string
          updated_at: string
          valor_fecha: string | null
          valor_json: Json | null
          valor_numero: number | null
          valor_texto: string | null
        }
        Insert: {
          created_at?: string
          entidad_id: string
          id?: string
          schema_id: string
          updated_at?: string
          valor_fecha?: string | null
          valor_json?: Json | null
          valor_numero?: number | null
          valor_texto?: string | null
        }
        Update: {
          created_at?: string
          entidad_id?: string
          id?: string
          schema_id?: string
          updated_at?: string
          valor_fecha?: string | null
          valor_json?: Json | null
          valor_numero?: number | null
          valor_texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_values_schema_id_fkey"
            columns: ["schema_id"]
            isOneToOne: false
            referencedRelation: "custom_fields_schema"
            referencedColumns: ["id"]
          },
        ]
      }
      datadis_consumos_cache: {
        Row: {
          cups: string
          distributor_code: string
          endpoint: string
          fetched_at: string
          id: string
          payload: Json
          periodo_fin: string
          periodo_inicio: string
          point_type: number | null
          tarifa_code: string | null
          ttl_expires_at: string
        }
        Insert: {
          cups: string
          distributor_code: string
          endpoint: string
          fetched_at?: string
          id?: string
          payload: Json
          periodo_fin: string
          periodo_inicio: string
          point_type?: number | null
          tarifa_code?: string | null
          ttl_expires_at?: string
        }
        Update: {
          cups?: string
          distributor_code?: string
          endpoint?: string
          fetched_at?: string
          id?: string
          payload?: Json
          periodo_fin?: string
          periodo_inicio?: string
          point_type?: number | null
          tarifa_code?: string | null
          ttl_expires_at?: string
        }
        Relationships: []
      }
      datadis_consumptions: {
        Row: {
          consumo_kwh: number
          created_at: string
          cups_id: string
          excedente_kwh: number
          fecha: string
          hora: number
          id: string
          metodo_obtencion: string
          origen: string
        }
        Insert: {
          consumo_kwh?: number
          created_at?: string
          cups_id: string
          excedente_kwh?: number
          fecha: string
          hora: number
          id?: string
          metodo_obtencion?: string
          origen?: string
        }
        Update: {
          consumo_kwh?: number
          created_at?: string
          cups_id?: string
          excedente_kwh?: number
          fecha?: string
          hora?: number
          id?: string
          metodo_obtencion?: string
          origen?: string
        }
        Relationships: [
          {
            foreignKeyName: "datadis_consumptions_cups_id_fkey"
            columns: ["cups_id"]
            isOneToOne: false
            referencedRelation: "cups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datadis_consumptions_cups_id_fkey"
            columns: ["cups_id"]
            isOneToOne: false
            referencedRelation: "supply_points_compat"
            referencedColumns: ["id"]
          },
        ]
      }
      datadis_provincias: {
        Row: {
          codigo: string
          nombre: string
        }
        Insert: {
          codigo: string
          nombre: string
        }
        Update: {
          codigo?: string
          nombre?: string
        }
        Relationships: []
      }
      datadis_proxy_cache: {
        Row: {
          action: string
          cache_key: string
          created_at: string
          cups: string | null
          datadis_username: string
          fetched_at: string
          id: string
          params_snapshot: Json | null
          response_data: Json
          stale_after_hours: number
          updated_at: string
        }
        Insert: {
          action: string
          cache_key: string
          created_at?: string
          cups?: string | null
          datadis_username?: string
          fetched_at?: string
          id?: string
          params_snapshot?: Json | null
          response_data: Json
          stale_after_hours?: number
          updated_at?: string
        }
        Update: {
          action?: string
          cache_key?: string
          created_at?: string
          cups?: string | null
          datadis_username?: string
          fetched_at?: string
          id?: string
          params_snapshot?: Json | null
          response_data?: Json
          stale_after_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      datadis_supply_price_terms: {
        Row: {
          alquiler_equipo_dia_eur: number | null
          bono_social_dia_eur: number | null
          comercializadora: string | null
          created_at: string | null
          cups: string
          energia_p1_c: number | null
          energia_p2_c: number | null
          energia_p3_c: number | null
          energia_p4_c: number | null
          energia_p5_c: number | null
          energia_p6_c: number | null
          fuente: string | null
          id: string
          iva_pct: number
          notas: string | null
          potencia_p1_c: number | null
          potencia_p2_c: number | null
          potencia_p3_c: number | null
          potencia_p4_c: number | null
          potencia_p5_c: number | null
          potencia_p6_c: number | null
          tarifa: string
          updated_at: string | null
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          alquiler_equipo_dia_eur?: number | null
          bono_social_dia_eur?: number | null
          comercializadora?: string | null
          created_at?: string | null
          cups: string
          energia_p1_c?: number | null
          energia_p2_c?: number | null
          energia_p3_c?: number | null
          energia_p4_c?: number | null
          energia_p5_c?: number | null
          energia_p6_c?: number | null
          fuente?: string | null
          id?: string
          iva_pct?: number
          notas?: string | null
          potencia_p1_c?: number | null
          potencia_p2_c?: number | null
          potencia_p3_c?: number | null
          potencia_p4_c?: number | null
          potencia_p5_c?: number | null
          potencia_p6_c?: number | null
          tarifa: string
          updated_at?: string | null
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          alquiler_equipo_dia_eur?: number | null
          bono_social_dia_eur?: number | null
          comercializadora?: string | null
          created_at?: string | null
          cups?: string
          energia_p1_c?: number | null
          energia_p2_c?: number | null
          energia_p3_c?: number | null
          energia_p4_c?: number | null
          energia_p5_c?: number | null
          energia_p6_c?: number | null
          fuente?: string | null
          id?: string
          iva_pct?: number
          notas?: string | null
          potencia_p1_c?: number | null
          potencia_p2_c?: number | null
          potencia_p3_c?: number | null
          potencia_p4_c?: number | null
          potencia_p5_c?: number | null
          potencia_p6_c?: number | null
          tarifa?: string
          updated_at?: string | null
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: []
      }
      datadis_tokens: {
        Row: {
          autorizado: boolean
          created_at: string
          empresa_id: string
          id: string
          password_enc: string
          token_cache: string | null
          token_expira: string | null
          ultimo_error: string | null
          updated_at: string
          username: string
        }
        Insert: {
          autorizado?: boolean
          created_at?: string
          empresa_id: string
          id?: string
          password_enc: string
          token_cache?: string | null
          token_expira?: string | null
          ultimo_error?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          autorizado?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          password_enc?: string
          token_cache?: string | null
          token_expira?: string | null
          ultimo_error?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "datadis_tokens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datadis_tokens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datadis_tokens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datadis_tokens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          ciclo_id: string | null
          created_at: string | null
          cups_id: string | null
          deleted_at: string | null
          descripcion: string | null
          empresa_id: string | null
          entidad_id: string | null
          entidad_tipo: string | null
          expediente_id: string | null
          id: string
          legacy_potencia_id: string | null
          legacy_source: string | null
          metadata: Json | null
          mime_type: string | null
          nombre: string
          nombre_archivo: string | null
          nombre_original: string | null
          notas: string | null
          ruta_storage: string
          subido_por: string | null
          tamano_bytes: number | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          ciclo_id?: string | null
          created_at?: string | null
          cups_id?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          empresa_id?: string | null
          entidad_id?: string | null
          entidad_tipo?: string | null
          expediente_id?: string | null
          id?: string
          legacy_potencia_id?: string | null
          legacy_source?: string | null
          metadata?: Json | null
          mime_type?: string | null
          nombre: string
          nombre_archivo?: string | null
          nombre_original?: string | null
          notas?: string | null
          ruta_storage: string
          subido_por?: string | null
          tamano_bytes?: number | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          ciclo_id?: string | null
          created_at?: string | null
          cups_id?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          empresa_id?: string | null
          entidad_id?: string | null
          entidad_tipo?: string | null
          expediente_id?: string | null
          id?: string
          legacy_potencia_id?: string | null
          legacy_source?: string | null
          metadata?: Json | null
          mime_type?: string | null
          nombre?: string
          nombre_archivo?: string | null
          nombre_original?: string | null
          notas?: string | null
          ruta_storage?: string
          subido_por?: string | null
          tamano_bytes?: number | null
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_ciclo_fk"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_cups_id_fkey"
            columns: ["cups_id"]
            isOneToOne: false
            referencedRelation: "cups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_cups_id_fkey"
            columns: ["cups_id"]
            isOneToOne: false
            referencedRelation: "supply_points_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_expediente_fk"
            columns: ["expediente_id"]
            isOneToOne: false
            referencedRelation: "expedientes"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          activo: boolean
          asunto: string
          cuerpo_html: string
          id: string
          legacy_potencia_id: string | null
          nombre: string
          tipo: string
          updated_at: string
          updated_by: string | null
          variables_disponibles: Json | null
        }
        Insert: {
          activo?: boolean
          asunto: string
          cuerpo_html: string
          id?: string
          legacy_potencia_id?: string | null
          nombre: string
          tipo: string
          updated_at?: string
          updated_by?: string | null
          variables_disponibles?: Json | null
        }
        Update: {
          activo?: boolean
          asunto?: string
          cuerpo_html?: string
          id?: string
          legacy_potencia_id?: string | null
          nombre?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          variables_disponibles?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      empresas: {
        Row: {
          activo: boolean
          asesor_id: string | null
          ciudad: string | null
          comercial_id: string | null
          convertido_cliente_at: string | null
          convertido_cliente_por: string | null
          cp: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          direccion: string | null
          email_principal: string | null
          estado_relacion: string
          external_id: string | null
          holded_etag: string | null
          holded_id: string | null
          holded_synced_at: string | null
          id: string
          legacy_potencia_id: string | null
          nif: string | null
          nombre: string
          notas: string | null
          origen_relacion: string | null
          pais: string | null
          persona_contacto: string | null
          provincia: string | null
          segmento: string | null
          tags: string[] | null
          telefono_principal: string | null
          tipo: string | null
          updated_at: string
          updated_by: string | null
          web: string | null
        }
        Insert: {
          activo?: boolean
          asesor_id?: string | null
          ciudad?: string | null
          comercial_id?: string | null
          convertido_cliente_at?: string | null
          convertido_cliente_por?: string | null
          cp?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          direccion?: string | null
          email_principal?: string | null
          estado_relacion?: string
          external_id?: string | null
          holded_etag?: string | null
          holded_id?: string | null
          holded_synced_at?: string | null
          id?: string
          legacy_potencia_id?: string | null
          nif?: string | null
          nombre: string
          notas?: string | null
          origen_relacion?: string | null
          pais?: string | null
          persona_contacto?: string | null
          provincia?: string | null
          segmento?: string | null
          tags?: string[] | null
          telefono_principal?: string | null
          tipo?: string | null
          updated_at?: string
          updated_by?: string | null
          web?: string | null
        }
        Update: {
          activo?: boolean
          asesor_id?: string | null
          ciudad?: string | null
          comercial_id?: string | null
          convertido_cliente_at?: string | null
          convertido_cliente_por?: string | null
          cp?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          direccion?: string | null
          email_principal?: string | null
          estado_relacion?: string
          external_id?: string | null
          holded_etag?: string | null
          holded_id?: string | null
          holded_synced_at?: string | null
          id?: string
          legacy_potencia_id?: string | null
          nif?: string | null
          nombre?: string
          notas?: string | null
          origen_relacion?: string | null
          pais?: string | null
          persona_contacto?: string | null
          provincia?: string | null
          segmento?: string | null
          tags?: string[] | null
          telefono_principal?: string | null
          tipo?: string | null
          updated_at?: string
          updated_by?: string | null
          web?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_asesor_id_fkey"
            columns: ["asesor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_asesor_id_fkey"
            columns: ["asesor_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "empresas_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "empresas_convertido_cliente_por_fkey"
            columns: ["convertido_cliente_por"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_convertido_cliente_por_fkey"
            columns: ["convertido_cliente_por"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "empresas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "empresas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      eventos: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          descripcion: string | null
          entidad_id: string | null
          entidad_tipo: string | null
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          tipo: string | null
          titulo: string
          todo_el_dia: boolean | null
          updated_at: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          entidad_id?: string | null
          entidad_tipo?: string | null
          fecha_fin?: string | null
          fecha_inicio: string
          id?: string
          tipo?: string | null
          titulo: string
          todo_el_dia?: boolean | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          entidad_id?: string | null
          entidad_tipo?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          tipo?: string | null
          titulo?: string
          todo_el_dia?: boolean | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      excel_import_templates: {
        Row: {
          campos_mapeados: Json
          comercializadora_id: string | null
          creado_por: string | null
          created_at: string | null
          descripcion: string | null
          header_row: number
          id: string
          legacy_potencia_id: string | null
          nombre: string
          sheet_name: string | null
          updated_at: string | null
        }
        Insert: {
          campos_mapeados?: Json
          comercializadora_id?: string | null
          creado_por?: string | null
          created_at?: string | null
          descripcion?: string | null
          header_row?: number
          id?: string
          legacy_potencia_id?: string | null
          nombre: string
          sheet_name?: string | null
          updated_at?: string | null
        }
        Update: {
          campos_mapeados?: Json
          comercializadora_id?: string | null
          creado_por?: string | null
          created_at?: string | null
          descripcion?: string | null
          header_row?: number
          id?: string
          legacy_potencia_id?: string | null
          nombre?: string
          sheet_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "excel_import_templates_comercializadora_id_fkey"
            columns: ["comercializadora_id"]
            isOneToOne: false
            referencedRelation: "comercializadoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excel_import_templates_comercializadora_id_fkey"
            columns: ["comercializadora_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excel_import_templates_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excel_import_templates_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      expedientes: {
        Row: {
          anio: number
          ciclos_realizados: number
          created_at: string
          created_by: string | null
          cups_id: string
          empresa_id: string
          estado: string
          id: string
          legacy_potencia_id: string | null
          max_ciclos_permitidos: number | null
          notas: string | null
          tipo_normativa: string
          updated_at: string
        }
        Insert: {
          anio: number
          ciclos_realizados?: number
          created_at?: string
          created_by?: string | null
          cups_id: string
          empresa_id: string
          estado: string
          id?: string
          legacy_potencia_id?: string | null
          max_ciclos_permitidos?: number | null
          notas?: string | null
          tipo_normativa: string
          updated_at?: string
        }
        Update: {
          anio?: number
          ciclos_realizados?: number
          created_at?: string
          created_by?: string | null
          cups_id?: string
          empresa_id?: string
          estado?: string
          id?: string
          legacy_potencia_id?: string | null
          max_ciclos_permitidos?: number | null
          notas?: string | null
          tipo_normativa?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expedientes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expedientes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "expedientes_cups_id_fkey"
            columns: ["cups_id"]
            isOneToOne: false
            referencedRelation: "cups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expedientes_cups_id_fkey"
            columns: ["cups_id"]
            isOneToOne: false
            referencedRelation: "supply_points_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expedientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expedientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expedientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expedientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas: {
        Row: {
          billed_days: number | null
          consumption_kwh: number | null
          consumption_p1: number | null
          consumption_p2: number | null
          consumption_p3: number | null
          consumption_p4: number | null
          consumption_p5: number | null
          consumption_p6: number | null
          created_at: string | null
          cups_id: string | null
          id: string
          month: number
          retailer: string | null
          supply_point_id: string | null
          surplus_compensation_eur: number | null
          surplus_kwh: number | null
          surplus_p1: number | null
          surplus_p2: number | null
          surplus_p3: number | null
          surplus_p4: number | null
          surplus_p5: number | null
          surplus_p6: number | null
          total_amount_eur: number | null
          year: number
        }
        Insert: {
          billed_days?: number | null
          consumption_kwh?: number | null
          consumption_p1?: number | null
          consumption_p2?: number | null
          consumption_p3?: number | null
          consumption_p4?: number | null
          consumption_p5?: number | null
          consumption_p6?: number | null
          created_at?: string | null
          cups_id?: string | null
          id?: string
          month: number
          retailer?: string | null
          supply_point_id?: string | null
          surplus_compensation_eur?: number | null
          surplus_kwh?: number | null
          surplus_p1?: number | null
          surplus_p2?: number | null
          surplus_p3?: number | null
          surplus_p4?: number | null
          surplus_p5?: number | null
          surplus_p6?: number | null
          total_amount_eur?: number | null
          year: number
        }
        Update: {
          billed_days?: number | null
          consumption_kwh?: number | null
          consumption_p1?: number | null
          consumption_p2?: number | null
          consumption_p3?: number | null
          consumption_p4?: number | null
          consumption_p5?: number | null
          consumption_p6?: number | null
          created_at?: string | null
          cups_id?: string | null
          id?: string
          month?: number
          retailer?: string | null
          supply_point_id?: string | null
          surplus_compensation_eur?: number | null
          surplus_kwh?: number | null
          surplus_p1?: number | null
          surplus_p2?: number | null
          surplus_p3?: number | null
          surplus_p4?: number | null
          surplus_p5?: number | null
          surplus_p6?: number | null
          total_amount_eur?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "facturas_cups_id_fkey"
            columns: ["cups_id"]
            isOneToOne: false
            referencedRelation: "cups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_cups_id_fkey"
            columns: ["cups_id"]
            isOneToOne: false
            referencedRelation: "supply_points_compat"
            referencedColumns: ["id"]
          },
        ]
      }
      fv_alarma: {
        Row: {
          activa: boolean
          actualizado_en: string
          alarm_id: string
          codigo: string | null
          creado_en: string
          descripcion: string | null
          dispositivo: string | null
          id: string
          iniciada_en: string | null
          planta_id: string
          resuelta_en: string | null
          severidad: string | null
        }
        Insert: {
          activa?: boolean
          actualizado_en?: string
          alarm_id: string
          codigo?: string | null
          creado_en?: string
          descripcion?: string | null
          dispositivo?: string | null
          id?: string
          iniciada_en?: string | null
          planta_id: string
          resuelta_en?: string | null
          severidad?: string | null
        }
        Update: {
          activa?: boolean
          actualizado_en?: string
          alarm_id?: string
          codigo?: string | null
          creado_en?: string
          descripcion?: string | null
          dispositivo?: string | null
          id?: string
          iniciada_en?: string | null
          planta_id?: string
          resuelta_en?: string | null
          severidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fv_alarma_planta_id_fkey"
            columns: ["planta_id"]
            isOneToOne: false
            referencedRelation: "fv_planta"
            referencedColumns: ["id"]
          },
        ]
      }
      fv_config_informe: {
        Row: {
          activo: boolean
          actualizado_en: string
          asesor_id: string | null
          creado_en: string
          destinatarios_cliente: string[]
          destinatarios_copia: string[]
          dia_envio: number
          empresa_id: string
          gestor_id: string | null
          incluir_actuaciones: boolean
          incluir_facturas: boolean
          incluir_fv: boolean
          modo_envio: string
          notas: string | null
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          asesor_id?: string | null
          creado_en?: string
          destinatarios_cliente?: string[]
          destinatarios_copia?: string[]
          dia_envio?: number
          empresa_id: string
          gestor_id?: string | null
          incluir_actuaciones?: boolean
          incluir_facturas?: boolean
          incluir_fv?: boolean
          modo_envio?: string
          notas?: string | null
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          asesor_id?: string | null
          creado_en?: string
          destinatarios_cliente?: string[]
          destinatarios_copia?: string[]
          dia_envio?: number
          empresa_id?: string
          gestor_id?: string | null
          incluir_actuaciones?: boolean
          incluir_facturas?: boolean
          incluir_fv?: boolean
          modo_envio?: string
          notas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fv_config_informe_asesor_id_fkey"
            columns: ["asesor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_config_informe_asesor_id_fkey"
            columns: ["asesor_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "fv_config_informe_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_config_informe_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_config_informe_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_config_informe_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_config_informe_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_config_informe_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      fv_credenciales: {
        Row: {
          activo: boolean
          actualizado_en: string
          cookies_expires_at: string | null
          cookies_updated_at: string | null
          creado_en: string
          descripcion: string | null
          empresa_id: string | null
          estado_sesion: string | null
          id: string
          nombre: string | null
          plataforma: string
          region_url: string | null
          tipo: string | null
          ultimo_error: string | null
          ultimo_ok_at: string | null
          username: string
          username_masked: string | null
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          cookies_expires_at?: string | null
          cookies_updated_at?: string | null
          creado_en?: string
          descripcion?: string | null
          empresa_id?: string | null
          estado_sesion?: string | null
          id?: string
          nombre?: string | null
          plataforma: string
          region_url?: string | null
          tipo?: string | null
          ultimo_error?: string | null
          ultimo_ok_at?: string | null
          username: string
          username_masked?: string | null
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          cookies_expires_at?: string | null
          cookies_updated_at?: string | null
          creado_en?: string
          descripcion?: string | null
          empresa_id?: string | null
          estado_sesion?: string | null
          id?: string
          nombre?: string | null
          plataforma?: string
          region_url?: string | null
          tipo?: string | null
          ultimo_error?: string | null
          ultimo_ok_at?: string | null
          username?: string
          username_masked?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fv_credenciales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_credenciales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_credenciales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_credenciales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      fv_credenciales_backup_20260511: {
        Row: {
          activo: boolean | null
          actualizado_en: string | null
          cookies_expires_at: string | null
          cookies_updated_at: string | null
          creado_en: string | null
          descripcion: string | null
          empresa_id: string | null
          id: string | null
          password_enc: string | null
          plataforma: string | null
          region_url: string | null
          session_cookies: string | null
          tipo: string | null
          ultimo_error: string | null
          ultimo_ok_at: string | null
          username: string | null
        }
        Insert: {
          activo?: boolean | null
          actualizado_en?: string | null
          cookies_expires_at?: string | null
          cookies_updated_at?: string | null
          creado_en?: string | null
          descripcion?: string | null
          empresa_id?: string | null
          id?: string | null
          password_enc?: string | null
          plataforma?: string | null
          region_url?: string | null
          session_cookies?: string | null
          tipo?: string | null
          ultimo_error?: string | null
          ultimo_ok_at?: string | null
          username?: string | null
        }
        Update: {
          activo?: boolean | null
          actualizado_en?: string | null
          cookies_expires_at?: string | null
          cookies_updated_at?: string | null
          creado_en?: string | null
          descripcion?: string | null
          empresa_id?: string | null
          id?: string | null
          password_enc?: string | null
          plataforma?: string | null
          region_url?: string | null
          session_cookies?: string | null
          tipo?: string | null
          ultimo_error?: string | null
          ultimo_ok_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      fv_credenciales_secret: {
        Row: {
          cookies_expires_at: string | null
          cookies_updated_at: string | null
          credencial_id: string
          password_enc: string
          session_cookies: string | null
        }
        Insert: {
          cookies_expires_at?: string | null
          cookies_updated_at?: string | null
          credencial_id: string
          password_enc: string
          session_cookies?: string | null
        }
        Update: {
          cookies_expires_at?: string | null
          cookies_updated_at?: string | null
          credencial_id?: string
          password_enc?: string
          session_cookies?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fv_credenciales_secret_credencial_id_fkey"
            columns: ["credencial_id"]
            isOneToOne: true
            referencedRelation: "fv_credenciales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_credenciales_secret_credencial_id_fkey"
            columns: ["credencial_id"]
            isOneToOne: true
            referencedRelation: "fv_credenciales_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      fv_dispositivo: {
        Row: {
          actualizado_en: string
          device_id: string
          estado: string | null
          id: string
          modelo: string | null
          nombre: string | null
          numero_serie: string | null
          planta_id: string
          tipo: string
        }
        Insert: {
          actualizado_en?: string
          device_id: string
          estado?: string | null
          id?: string
          modelo?: string | null
          nombre?: string | null
          numero_serie?: string | null
          planta_id: string
          tipo: string
        }
        Update: {
          actualizado_en?: string
          device_id?: string
          estado?: string | null
          id?: string
          modelo?: string | null
          nombre?: string | null
          numero_serie?: string | null
          planta_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fv_dispositivo_planta_id_fkey"
            columns: ["planta_id"]
            isOneToOne: false
            referencedRelation: "fv_planta"
            referencedColumns: ["id"]
          },
        ]
      }
      fv_empresa_mantenimiento: {
        Row: {
          activo: boolean
          actualizado_en: string
          cif: string | null
          contacto_nombre: string | null
          contrato_fin: string | null
          contrato_inicio: string | null
          contrato_ref: string | null
          creado_en: string
          email: string | null
          id: string
          nombre: string
          notas: string | null
          telefono: string | null
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          cif?: string | null
          contacto_nombre?: string | null
          contrato_fin?: string | null
          contrato_inicio?: string | null
          contrato_ref?: string | null
          creado_en?: string
          email?: string | null
          id?: string
          nombre: string
          notas?: string | null
          telefono?: string | null
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          cif?: string | null
          contacto_nombre?: string | null
          contrato_fin?: string | null
          contrato_inicio?: string | null
          contrato_ref?: string | null
          creado_en?: string
          email?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      fv_informe_mensual: {
        Row: {
          actualizado_en: string
          ahorro_estimado_eur: number | null
          aprobado_en: string | null
          co2_evitado_kg: number | null
          contenido_editado: Json | null
          creado_en: string
          destinatarios: Json | null
          empresa_id: string
          energia_total_kwh: number | null
          enviado_en: string | null
          error_envio: string | null
          estado: string
          generado_en: string | null
          gestor_id: string | null
          id: string
          mes: string
          notas: string | null
          notas_gestor: string | null
          num_alarmas_criticas: number | null
          num_alarmas_graves: number | null
        }
        Insert: {
          actualizado_en?: string
          ahorro_estimado_eur?: number | null
          aprobado_en?: string | null
          co2_evitado_kg?: number | null
          contenido_editado?: Json | null
          creado_en?: string
          destinatarios?: Json | null
          empresa_id: string
          energia_total_kwh?: number | null
          enviado_en?: string | null
          error_envio?: string | null
          estado?: string
          generado_en?: string | null
          gestor_id?: string | null
          id?: string
          mes: string
          notas?: string | null
          notas_gestor?: string | null
          num_alarmas_criticas?: number | null
          num_alarmas_graves?: number | null
        }
        Update: {
          actualizado_en?: string
          ahorro_estimado_eur?: number | null
          aprobado_en?: string | null
          co2_evitado_kg?: number | null
          contenido_editado?: Json | null
          creado_en?: string
          destinatarios?: Json | null
          empresa_id?: string
          energia_total_kwh?: number | null
          enviado_en?: string | null
          error_envio?: string | null
          estado?: string
          generado_en?: string | null
          gestor_id?: string | null
          id?: string
          mes?: string
          notas?: string | null
          notas_gestor?: string | null
          num_alarmas_criticas?: number | null
          num_alarmas_graves?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fv_informe_mensual_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_informe_mensual_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_informe_mensual_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_informe_mensual_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_informe_mensual_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_informe_mensual_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      fv_kpi_diario: {
        Row: {
          creado_en: string
          energia_kwh: number | null
          fecha: string
          id: string
          ingresos_eur: number | null
          planta_id: string
          potencia_max_kw: number | null
        }
        Insert: {
          creado_en?: string
          energia_kwh?: number | null
          fecha: string
          id?: string
          ingresos_eur?: number | null
          planta_id: string
          potencia_max_kw?: number | null
        }
        Update: {
          creado_en?: string
          energia_kwh?: number | null
          fecha?: string
          id?: string
          ingresos_eur?: number | null
          planta_id?: string
          potencia_max_kw?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fv_kpi_diario_planta_id_fkey"
            columns: ["planta_id"]
            isOneToOne: false
            referencedRelation: "fv_planta"
            referencedColumns: ["id"]
          },
        ]
      }
      fv_kpi_realtime: {
        Row: {
          actualizado_en: string
          energia_hoy_kwh: number | null
          energia_mes_kwh: number | null
          energia_total_kwh: number | null
          ingresos_hoy_eur: number | null
          planta_id: string
          potencia_actual_kw: number | null
        }
        Insert: {
          actualizado_en?: string
          energia_hoy_kwh?: number | null
          energia_mes_kwh?: number | null
          energia_total_kwh?: number | null
          ingresos_hoy_eur?: number | null
          planta_id: string
          potencia_actual_kw?: number | null
        }
        Update: {
          actualizado_en?: string
          energia_hoy_kwh?: number | null
          energia_mes_kwh?: number | null
          energia_total_kwh?: number | null
          ingresos_hoy_eur?: number | null
          planta_id?: string
          potencia_actual_kw?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fv_kpi_realtime_planta_id_fkey"
            columns: ["planta_id"]
            isOneToOne: true
            referencedRelation: "fv_planta"
            referencedColumns: ["id"]
          },
        ]
      }
      fv_mantenimiento: {
        Row: {
          actualizado_en: string
          coste_eur: number | null
          creado_en: string
          creado_por: string | null
          descripcion: string | null
          documentos_urls: string[] | null
          empresa_mant_id: string | null
          estado: string
          fecha_programada: string | null
          fecha_realizada: string | null
          id: string
          observaciones: string | null
          planta_id: string
          proxima_revision: string | null
          tecnico_nombre: string | null
          tipo: string
        }
        Insert: {
          actualizado_en?: string
          coste_eur?: number | null
          creado_en?: string
          creado_por?: string | null
          descripcion?: string | null
          documentos_urls?: string[] | null
          empresa_mant_id?: string | null
          estado?: string
          fecha_programada?: string | null
          fecha_realizada?: string | null
          id?: string
          observaciones?: string | null
          planta_id: string
          proxima_revision?: string | null
          tecnico_nombre?: string | null
          tipo: string
        }
        Update: {
          actualizado_en?: string
          coste_eur?: number | null
          creado_en?: string
          creado_por?: string | null
          descripcion?: string | null
          documentos_urls?: string[] | null
          empresa_mant_id?: string | null
          estado?: string
          fecha_programada?: string | null
          fecha_realizada?: string | null
          id?: string
          observaciones?: string | null
          planta_id?: string
          proxima_revision?: string | null
          tecnico_nombre?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fv_mantenimiento_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_mantenimiento_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "fv_mantenimiento_empresa_mant_id_fkey"
            columns: ["empresa_mant_id"]
            isOneToOne: false
            referencedRelation: "fv_empresa_mantenimiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_mantenimiento_planta_id_fkey"
            columns: ["planta_id"]
            isOneToOne: false
            referencedRelation: "fv_planta"
            referencedColumns: ["id"]
          },
        ]
      }
      fv_planta: {
        Row: {
          actualizado_en: string
          capacidad_kwp: number | null
          contrato_mant_ref: string | null
          creado_en: string
          credencial_id: string
          cups_id: string | null
          empresa_id: string | null
          empresa_instaladora: string | null
          empresa_mant_id: string | null
          estado: string | null
          fecha_conexion: string | null
          garantia_hasta: string | null
          id: string
          nombre: string
          nombre_fusionsolar: string | null
          nombre_interno: string | null
          pais: string | null
          plataforma: string
          region_url: string | null
          station_code: string
          sync_enabled: boolean
          tiene_bateria: boolean | null
          tiene_esss: boolean | null
        }
        Insert: {
          actualizado_en?: string
          capacidad_kwp?: number | null
          contrato_mant_ref?: string | null
          creado_en?: string
          credencial_id: string
          cups_id?: string | null
          empresa_id?: string | null
          empresa_instaladora?: string | null
          empresa_mant_id?: string | null
          estado?: string | null
          fecha_conexion?: string | null
          garantia_hasta?: string | null
          id?: string
          nombre: string
          nombre_fusionsolar?: string | null
          nombre_interno?: string | null
          pais?: string | null
          plataforma?: string
          region_url?: string | null
          station_code: string
          sync_enabled?: boolean
          tiene_bateria?: boolean | null
          tiene_esss?: boolean | null
        }
        Update: {
          actualizado_en?: string
          capacidad_kwp?: number | null
          contrato_mant_ref?: string | null
          creado_en?: string
          credencial_id?: string
          cups_id?: string | null
          empresa_id?: string | null
          empresa_instaladora?: string | null
          empresa_mant_id?: string | null
          estado?: string | null
          fecha_conexion?: string | null
          garantia_hasta?: string | null
          id?: string
          nombre?: string
          nombre_fusionsolar?: string | null
          nombre_interno?: string | null
          pais?: string | null
          plataforma?: string
          region_url?: string | null
          station_code?: string
          sync_enabled?: boolean
          tiene_bateria?: boolean | null
          tiene_esss?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fv_planta_credencial_id_fkey"
            columns: ["credencial_id"]
            isOneToOne: false
            referencedRelation: "fv_credenciales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_planta_credencial_id_fkey"
            columns: ["credencial_id"]
            isOneToOne: false
            referencedRelation: "fv_credenciales_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_planta_cups_id_fkey"
            columns: ["cups_id"]
            isOneToOne: false
            referencedRelation: "cups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_planta_cups_id_fkey"
            columns: ["cups_id"]
            isOneToOne: false
            referencedRelation: "supply_points_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_planta_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_planta_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_planta_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_planta_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_planta_empresa_mant_id_fkey"
            columns: ["empresa_mant_id"]
            isOneToOne: false
            referencedRelation: "fv_empresa_mantenimiento"
            referencedColumns: ["id"]
          },
        ]
      }
      fv_planta_backup_20260511: {
        Row: {
          actualizado_en: string | null
          capacidad_kwp: number | null
          contrato_mant_ref: string | null
          creado_en: string | null
          credencial_id: string | null
          empresa_id: string | null
          empresa_instaladora: string | null
          empresa_mant_id: string | null
          estado: string | null
          fecha_conexion: string | null
          garantia_hasta: string | null
          id: string | null
          nombre: string | null
          nombre_fusionsolar: string | null
          nombre_interno: string | null
          pais: string | null
          plataforma: string | null
          region_url: string | null
          station_code: string | null
          tiene_bateria: boolean | null
          tiene_esss: boolean | null
        }
        Insert: {
          actualizado_en?: string | null
          capacidad_kwp?: number | null
          contrato_mant_ref?: string | null
          creado_en?: string | null
          credencial_id?: string | null
          empresa_id?: string | null
          empresa_instaladora?: string | null
          empresa_mant_id?: string | null
          estado?: string | null
          fecha_conexion?: string | null
          garantia_hasta?: string | null
          id?: string | null
          nombre?: string | null
          nombre_fusionsolar?: string | null
          nombre_interno?: string | null
          pais?: string | null
          plataforma?: string | null
          region_url?: string | null
          station_code?: string | null
          tiene_bateria?: boolean | null
          tiene_esss?: boolean | null
        }
        Update: {
          actualizado_en?: string | null
          capacidad_kwp?: number | null
          contrato_mant_ref?: string | null
          creado_en?: string | null
          credencial_id?: string | null
          empresa_id?: string | null
          empresa_instaladora?: string | null
          empresa_mant_id?: string | null
          estado?: string | null
          fecha_conexion?: string | null
          garantia_hasta?: string | null
          id?: string | null
          nombre?: string | null
          nombre_fusionsolar?: string | null
          nombre_interno?: string | null
          pais?: string | null
          plataforma?: string | null
          region_url?: string | null
          station_code?: string | null
          tiene_bateria?: boolean | null
          tiene_esss?: boolean | null
        }
        Relationships: []
      }
      fv_planta_credencial: {
        Row: {
          credencial_id: string
          planta_id: string
          primera_vez: string
        }
        Insert: {
          credencial_id: string
          planta_id: string
          primera_vez?: string
        }
        Update: {
          credencial_id?: string
          planta_id?: string
          primera_vez?: string
        }
        Relationships: [
          {
            foreignKeyName: "fv_planta_credencial_credencial_id_fkey"
            columns: ["credencial_id"]
            isOneToOne: false
            referencedRelation: "fv_credenciales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_planta_credencial_credencial_id_fkey"
            columns: ["credencial_id"]
            isOneToOne: false
            referencedRelation: "fv_credenciales_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_planta_credencial_planta_id_fkey"
            columns: ["planta_id"]
            isOneToOne: false
            referencedRelation: "fv_planta"
            referencedColumns: ["id"]
          },
        ]
      }
      fv_resumen_semanal: {
        Row: {
          creado_en: string
          dias_activo: number | null
          energia_kwh: number | null
          id: string
          planta_id: string
          potencia_max_kw: number | null
          semana_fin: string
          semana_inicio: string
        }
        Insert: {
          creado_en?: string
          dias_activo?: number | null
          energia_kwh?: number | null
          id?: string
          planta_id: string
          potencia_max_kw?: number | null
          semana_fin: string
          semana_inicio: string
        }
        Update: {
          creado_en?: string
          dias_activo?: number | null
          energia_kwh?: number | null
          id?: string
          planta_id?: string
          potencia_max_kw?: number | null
          semana_fin?: string
          semana_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "fv_resumen_semanal_planta_id_fkey"
            columns: ["planta_id"]
            isOneToOne: false
            referencedRelation: "fv_planta"
            referencedColumns: ["id"]
          },
        ]
      }
      fv_sync_audit: {
        Row: {
          creado_en: string
          credencial_id: string | null
          endpoint: string
          error_raw: string | null
          error_tipo: Database["public"]["Enums"]["fv_error_category"] | null
          fecha_dato: string | null
          filas_insertadas: number
          id: string
          intentos: number
          ms_elapsed: number | null
          ok: boolean
          planta_id: string | null
          run_id: string
        }
        Insert: {
          creado_en?: string
          credencial_id?: string | null
          endpoint: string
          error_raw?: string | null
          error_tipo?: Database["public"]["Enums"]["fv_error_category"] | null
          fecha_dato?: string | null
          filas_insertadas?: number
          id?: string
          intentos?: number
          ms_elapsed?: number | null
          ok?: boolean
          planta_id?: string | null
          run_id: string
        }
        Update: {
          creado_en?: string
          credencial_id?: string | null
          endpoint?: string
          error_raw?: string | null
          error_tipo?: Database["public"]["Enums"]["fv_error_category"] | null
          fecha_dato?: string | null
          filas_insertadas?: number
          id?: string
          intentos?: number
          ms_elapsed?: number | null
          ok?: boolean
          planta_id?: string | null
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fv_sync_audit_credencial_id_fkey"
            columns: ["credencial_id"]
            isOneToOne: false
            referencedRelation: "fv_credenciales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_sync_audit_credencial_id_fkey"
            columns: ["credencial_id"]
            isOneToOne: false
            referencedRelation: "fv_credenciales_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_sync_audit_planta_id_fkey"
            columns: ["planta_id"]
            isOneToOne: false
            referencedRelation: "fv_planta"
            referencedColumns: ["id"]
          },
        ]
      }
      fv_sync_log: {
        Row: {
          alarmas_detectadas: number | null
          alarmas_sync: number | null
          credenciales_ok: number | null
          credenciales_total: number | null
          detalles: Json | null
          duracion_ms: number | null
          empresa_id: string | null
          id: string
          iniciado_en: string
          mensaje: string | null
          ok: boolean | null
          plantas_sync: number | null
          plataforma: string | null
          resultado: string | null
        }
        Insert: {
          alarmas_detectadas?: number | null
          alarmas_sync?: number | null
          credenciales_ok?: number | null
          credenciales_total?: number | null
          detalles?: Json | null
          duracion_ms?: number | null
          empresa_id?: string | null
          id?: string
          iniciado_en?: string
          mensaje?: string | null
          ok?: boolean | null
          plantas_sync?: number | null
          plataforma?: string | null
          resultado?: string | null
        }
        Update: {
          alarmas_detectadas?: number | null
          alarmas_sync?: number | null
          credenciales_ok?: number | null
          credenciales_total?: number | null
          detalles?: Json | null
          duracion_ms?: number | null
          empresa_id?: string | null
          id?: string
          iniciado_en?: string
          mensaje?: string | null
          ok?: boolean | null
          plantas_sync?: number | null
          plataforma?: string | null
          resultado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fv_sync_log_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_sync_log_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_sync_log_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_sync_log_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      fv_sync_log_backup_20260511: {
        Row: {
          alarmas_detectadas: number | null
          alarmas_sync: number | null
          credenciales_ok: number | null
          credenciales_total: number | null
          detalles: Json | null
          duracion_ms: number | null
          empresa_id: string | null
          id: string | null
          iniciado_en: string | null
          mensaje: string | null
          ok: boolean | null
          plantas_sync: number | null
          plataforma: string | null
          resultado: string | null
        }
        Insert: {
          alarmas_detectadas?: number | null
          alarmas_sync?: number | null
          credenciales_ok?: number | null
          credenciales_total?: number | null
          detalles?: Json | null
          duracion_ms?: number | null
          empresa_id?: string | null
          id?: string | null
          iniciado_en?: string | null
          mensaje?: string | null
          ok?: boolean | null
          plantas_sync?: number | null
          plataforma?: string | null
          resultado?: string | null
        }
        Update: {
          alarmas_detectadas?: number | null
          alarmas_sync?: number | null
          credenciales_ok?: number | null
          credenciales_total?: number | null
          detalles?: Json | null
          duracion_ms?: number | null
          empresa_id?: string | null
          id?: string | null
          iniciado_en?: string | null
          mensaje?: string | null
          ok?: boolean | null
          plantas_sync?: number | null
          plataforma?: string | null
          resultado?: string | null
        }
        Relationships: []
      }
      global_config: {
        Row: {
          id: string
          iee_pct: number | null
          notes: string | null
          updated_at: string | null
          updated_by: string | null
          vat_pct: number | null
        }
        Insert: {
          id?: string
          iee_pct?: number | null
          notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vat_pct?: number | null
        }
        Update: {
          id?: string
          iee_pct?: number | null
          notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vat_pct?: number | null
        }
        Relationships: []
      }
      holded_config: {
        Row: {
          api_base_url: string
          created_at: string
          enabled: boolean
          excluded_nifs: string[]
          functions_base_url: string
          http_timeout_ms: number
          id: string
          last_error: string | null
          last_error_at: string | null
          last_full_sync_at: string | null
          mode: string
          notes: string | null
          productos_sync_mode: string
          rate_limit_req_per_sec: number
          retry_initial_backoff_ms: number
          retry_max_attempts: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_base_url?: string
          created_at?: string
          enabled?: boolean
          excluded_nifs?: string[]
          functions_base_url?: string
          http_timeout_ms?: number
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          last_full_sync_at?: string | null
          mode?: string
          notes?: string | null
          productos_sync_mode?: string
          rate_limit_req_per_sec?: number
          retry_initial_backoff_ms?: number
          retry_max_attempts?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_base_url?: string
          created_at?: string
          enabled?: boolean
          excluded_nifs?: string[]
          functions_base_url?: string
          http_timeout_ms?: number
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          last_full_sync_at?: string | null
          mode?: string
          notes?: string | null
          productos_sync_mode?: string
          rate_limit_req_per_sec?: number
          retry_initial_backoff_ms?: number
          retry_max_attempts?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holded_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holded_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      holded_conflicts: {
        Row: {
          detected_at: string
          entity: string
          entity_id: string | null
          holded_id: string | null
          holded_payload: Json | null
          id: string
          resolution: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          valere_payload: Json | null
        }
        Insert: {
          detected_at?: string
          entity: string
          entity_id?: string | null
          holded_id?: string | null
          holded_payload?: Json | null
          id?: string
          resolution?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          valere_payload?: Json | null
        }
        Update: {
          detected_at?: string
          entity?: string
          entity_id?: string | null
          holded_id?: string | null
          holded_payload?: Json | null
          id?: string
          resolution?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          valere_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "holded_conflicts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holded_conflicts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      holded_integration_logs: {
        Row: {
          direction: string
          duration_ms: number | null
          entity: string
          entity_id: string | null
          error: string | null
          http_method: string | null
          http_status: number | null
          http_url: string | null
          id: string
          queue_id: string | null
          request_payload: Json | null
          response_body: Json | null
          triggered_by: string | null
          ts: string
        }
        Insert: {
          direction: string
          duration_ms?: number | null
          entity: string
          entity_id?: string | null
          error?: string | null
          http_method?: string | null
          http_status?: number | null
          http_url?: string | null
          id?: string
          queue_id?: string | null
          request_payload?: Json | null
          response_body?: Json | null
          triggered_by?: string | null
          ts?: string
        }
        Update: {
          direction?: string
          duration_ms?: number | null
          entity?: string
          entity_id?: string | null
          error?: string | null
          http_method?: string | null
          http_status?: number | null
          http_url?: string | null
          id?: string
          queue_id?: string | null
          request_payload?: Json | null
          response_body?: Json | null
          triggered_by?: string | null
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "holded_integration_logs_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "holded_sync_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holded_integration_logs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holded_integration_logs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      holded_sync_queue: {
        Row: {
          action: string
          attempts: number
          created_at: string
          direction: string
          entity: string
          entity_id: string | null
          id: string
          idempotency_key: string
          last_error: string | null
          max_attempts: number
          payload: Json | null
          processed_at: string | null
          scheduled_for: string
          status: string
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          action: string
          attempts?: number
          created_at?: string
          direction?: string
          entity: string
          entity_id?: string | null
          id?: string
          idempotency_key: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json | null
          processed_at?: string | null
          scheduled_for?: string
          status?: string
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          action?: string
          attempts?: number
          created_at?: string
          direction?: string
          entity?: string
          entity_id?: string | null
          id?: string
          idempotency_key?: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json | null
          processed_at?: string | null
          scheduled_for?: string
          status?: string
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "holded_sync_queue_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holded_sync_queue_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      holded_sync_state: {
        Row: {
          entity: string
          items_synced: number
          last_error: string | null
          last_pull_at: string | null
          last_pull_etag: string | null
          last_pull_status: string | null
          last_push_at: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          entity: string
          items_synced?: number
          last_error?: string | null
          last_pull_at?: string | null
          last_pull_etag?: string | null
          last_pull_status?: string | null
          last_push_at?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          entity?: string
          items_synced?: number
          last_error?: string | null
          last_pull_at?: string | null
          last_pull_etag?: string | null
          last_pull_status?: string | null
          last_push_at?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      incidencias: {
        Row: {
          asignado_a: string | null
          contrato_id: string | null
          created_at: string
          created_by: string | null
          cups: string | null
          cups_id: string | null
          deleted_at: string | null
          descripcion: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_incidencia"]
          fecha_apertura: string
          fecha_limite: string | null
          fecha_resolucion: string | null
          id: string
          importe_reclamado: number | null
          importe_recuperado: number | null
          notas_resolucion: string | null
          prioridad: Database["public"]["Enums"]["prioridad_incidencia"]
          tipo: Database["public"]["Enums"]["tipo_incidencia"]
          titulo: string
          updated_at: string
        }
        Insert: {
          asignado_a?: string | null
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          cups?: string | null
          cups_id?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_incidencia"]
          fecha_apertura?: string
          fecha_limite?: string | null
          fecha_resolucion?: string | null
          id?: string
          importe_reclamado?: number | null
          importe_recuperado?: number | null
          notas_resolucion?: string | null
          prioridad?: Database["public"]["Enums"]["prioridad_incidencia"]
          tipo?: Database["public"]["Enums"]["tipo_incidencia"]
          titulo: string
          updated_at?: string
        }
        Update: {
          asignado_a?: string | null
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          cups?: string | null
          cups_id?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_incidencia"]
          fecha_apertura?: string
          fecha_limite?: string | null
          fecha_resolucion?: string | null
          id?: string
          importe_reclamado?: number | null
          importe_recuperado?: number | null
          notas_resolucion?: string | null
          prioridad?: Database["public"]["Enums"]["prioridad_incidencia"]
          tipo?: Database["public"]["Enums"]["tipo_incidencia"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidencias_asignado_a_fkey"
            columns: ["asignado_a"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencias_asignado_a_fkey"
            columns: ["asignado_a"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "incidencias_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencias_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_por_vencer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencias_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_contratos_activos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencias_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_oportunidades_huerfanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencias_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencias_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "incidencias_cups_id_fkey"
            columns: ["cups_id"]
            isOneToOne: false
            referencedRelation: "cups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencias_cups_id_fkey"
            columns: ["cups_id"]
            isOneToOne: false
            referencedRelation: "supply_points_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          created_at: string
          cuerpo: string | null
          entidad_id: string | null
          entidad_tipo: string | null
          id: string
          leida: boolean
          leida_at: string | null
          tipo: string | null
          titulo: string | null
          usuario_id: string
        }
        Insert: {
          created_at?: string
          cuerpo?: string | null
          entidad_id?: string | null
          entidad_tipo?: string | null
          id?: string
          leida?: boolean
          leida_at?: string | null
          tipo?: string | null
          titulo?: string | null
          usuario_id: string
        }
        Update: {
          created_at?: string
          cuerpo?: string | null
          entidad_id?: string | null
          entidad_tipo?: string | null
          id?: string
          leida?: boolean
          leida_at?: string | null
          tipo?: string | null
          titulo?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      oferta_precios_mensuales: {
        Row: {
          componente: string | null
          created_at: string
          id: string
          mes_yyyy_mm: string
          notes: string | null
          oferta_id: string
          precio_energia_kwh: number | null
        }
        Insert: {
          componente?: string | null
          created_at?: string
          id?: string
          mes_yyyy_mm: string
          notes?: string | null
          oferta_id: string
          precio_energia_kwh?: number | null
        }
        Update: {
          componente?: string | null
          created_at?: string
          id?: string
          mes_yyyy_mm?: string
          notes?: string | null
          oferta_id?: string
          precio_energia_kwh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "oferta_precios_mensuales_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "comercializadora_ofertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oferta_precios_mensuales_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "retailer_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      oportunidad_emails: {
        Row: {
          asunto: string | null
          created_at: string
          cuerpo_resumen: string | null
          decidido_por: string | null
          destinatario_email: string | null
          destinatario_user_id: string | null
          enviado_at: string
          enviado_por: string | null
          id: string
          oportunidad_id: string
          tipo: string
        }
        Insert: {
          asunto?: string | null
          created_at?: string
          cuerpo_resumen?: string | null
          decidido_por?: string | null
          destinatario_email?: string | null
          destinatario_user_id?: string | null
          enviado_at?: string
          enviado_por?: string | null
          id?: string
          oportunidad_id: string
          tipo: string
        }
        Update: {
          asunto?: string | null
          created_at?: string
          cuerpo_resumen?: string | null
          decidido_por?: string | null
          destinatario_email?: string | null
          destinatario_user_id?: string | null
          enviado_at?: string
          enviado_por?: string | null
          id?: string
          oportunidad_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "oportunidad_emails_decidido_por_fkey"
            columns: ["decidido_por"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidad_emails_decidido_por_fkey"
            columns: ["decidido_por"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "oportunidad_emails_destinatario_user_id_fkey"
            columns: ["destinatario_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidad_emails_destinatario_user_id_fkey"
            columns: ["destinatario_user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "oportunidad_emails_enviado_por_fkey"
            columns: ["enviado_por"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidad_emails_enviado_por_fkey"
            columns: ["enviado_por"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "oportunidad_emails_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidad_emails_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_enviados_en_seguimiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidad_emails_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_historico_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidad_emails_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidad_emails_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_todos_mis_casos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidad_emails_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_crm_oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidad_emails_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_mis_oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidad_emails_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_motivos_perdida_familia"
            referencedColumns: ["id"]
          },
        ]
      }
      oportunidad_handoffs: {
        Row: {
          created_at: string
          created_by: string | null
          etapa_operativa_destino: string | null
          from_user_id: string | null
          id: string
          motivo: string
          notas: string | null
          oportunidad_id: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          etapa_operativa_destino?: string | null
          from_user_id?: string | null
          id?: string
          motivo: string
          notas?: string | null
          oportunidad_id: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          etapa_operativa_destino?: string | null
          from_user_id?: string | null
          id?: string
          motivo?: string
          notas?: string | null
          oportunidad_id?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oportunidad_handoffs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidad_handoffs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "oportunidad_handoffs_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidad_handoffs_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "oportunidad_handoffs_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidad_handoffs_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_enviados_en_seguimiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidad_handoffs_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_historico_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidad_handoffs_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidad_handoffs_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_todos_mis_casos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidad_handoffs_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_crm_oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidad_handoffs_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_mis_oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidad_handoffs_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_motivos_perdida_familia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidad_handoffs_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidad_handoffs_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      oportunidades: {
        Row: {
          ahorro_anual_estimado: number | null
          comercial_id: string | null
          contacto_id: string | null
          contexto: string
          contrato_origen_id: string | null
          convertida_a_crm_at: string | null
          convertida_a_crm_por: string | null
          created_at: string
          created_by: string | null
          decisor_identificado: boolean
          deleted_at: string | null
          empresa_id: string
          etapa: string
          etapa_operativa: string | null
          external_id: string | null
          factura_documento_id: string | null
          factura_fecha_prevista: string | null
          factura_recibida_at: string | null
          fecha_cierre_prevista: string | null
          fecha_siguiente_accion: string | null
          fecha_vencimiento_contrato_prospecto: string | null
          fuente_vencimiento_contrato_prospecto: string | null
          holded_etag: string | null
          holded_id: string | null
          holded_synced_at: string | null
          id: string
          motivo_perdida: string | null
          motivo_perdida_codigo:
            | Database["public"]["Enums"]["motivo_perdida_enum"]
            | null
          motivo_perdida_detalle: string | null
          nombre: string
          notas: string | null
          notas_vencimiento_contrato_prospecto: string | null
          probabilidad_pct: number
          propuesta_documento_id: string | null
          propuesta_enviada_at: string | null
          responsable_actual_id: string | null
          siguiente_accion: string | null
          tags: string[] | null
          tipo: string
          updated_at: string
          valor_estimado_eur: number | null
          visita_programada_at: string | null
        }
        Insert: {
          ahorro_anual_estimado?: number | null
          comercial_id?: string | null
          contacto_id?: string | null
          contexto?: string
          contrato_origen_id?: string | null
          convertida_a_crm_at?: string | null
          convertida_a_crm_por?: string | null
          created_at?: string
          created_by?: string | null
          decisor_identificado?: boolean
          deleted_at?: string | null
          empresa_id: string
          etapa?: string
          etapa_operativa?: string | null
          external_id?: string | null
          factura_documento_id?: string | null
          factura_fecha_prevista?: string | null
          factura_recibida_at?: string | null
          fecha_cierre_prevista?: string | null
          fecha_siguiente_accion?: string | null
          fecha_vencimiento_contrato_prospecto?: string | null
          fuente_vencimiento_contrato_prospecto?: string | null
          holded_etag?: string | null
          holded_id?: string | null
          holded_synced_at?: string | null
          id?: string
          motivo_perdida?: string | null
          motivo_perdida_codigo?:
            | Database["public"]["Enums"]["motivo_perdida_enum"]
            | null
          motivo_perdida_detalle?: string | null
          nombre: string
          notas?: string | null
          notas_vencimiento_contrato_prospecto?: string | null
          probabilidad_pct?: number
          propuesta_documento_id?: string | null
          propuesta_enviada_at?: string | null
          responsable_actual_id?: string | null
          siguiente_accion?: string | null
          tags?: string[] | null
          tipo: string
          updated_at?: string
          valor_estimado_eur?: number | null
          visita_programada_at?: string | null
        }
        Update: {
          ahorro_anual_estimado?: number | null
          comercial_id?: string | null
          contacto_id?: string | null
          contexto?: string
          contrato_origen_id?: string | null
          convertida_a_crm_at?: string | null
          convertida_a_crm_por?: string | null
          created_at?: string
          created_by?: string | null
          decisor_identificado?: boolean
          deleted_at?: string | null
          empresa_id?: string
          etapa?: string
          etapa_operativa?: string | null
          external_id?: string | null
          factura_documento_id?: string | null
          factura_fecha_prevista?: string | null
          factura_recibida_at?: string | null
          fecha_cierre_prevista?: string | null
          fecha_siguiente_accion?: string | null
          fecha_vencimiento_contrato_prospecto?: string | null
          fuente_vencimiento_contrato_prospecto?: string | null
          holded_etag?: string | null
          holded_id?: string | null
          holded_synced_at?: string | null
          id?: string
          motivo_perdida?: string | null
          motivo_perdida_codigo?:
            | Database["public"]["Enums"]["motivo_perdida_enum"]
            | null
          motivo_perdida_detalle?: string | null
          nombre?: string
          notas?: string | null
          notas_vencimiento_contrato_prospecto?: string | null
          probabilidad_pct?: number
          propuesta_documento_id?: string | null
          propuesta_enviada_at?: string | null
          responsable_actual_id?: string | null
          siguiente_accion?: string | null
          tags?: string[] | null
          tipo?: string
          updated_at?: string
          valor_estimado_eur?: number | null
          visita_programada_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidades_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "oportunidades_contacto_id_fkey"
            columns: ["contacto_id"]
            isOneToOne: false
            referencedRelation: "contactos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_contrato_origen_id_fkey"
            columns: ["contrato_origen_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_contrato_origen_id_fkey"
            columns: ["contrato_origen_id"]
            isOneToOne: false
            referencedRelation: "contratos_por_vencer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_contrato_origen_id_fkey"
            columns: ["contrato_origen_id"]
            isOneToOne: false
            referencedRelation: "v_contratos_activos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_contrato_origen_id_fkey"
            columns: ["contrato_origen_id"]
            isOneToOne: false
            referencedRelation: "v_oportunidades_huerfanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_convertida_a_crm_por_fkey"
            columns: ["convertida_a_crm_por"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_convertida_a_crm_por_fkey"
            columns: ["convertida_a_crm_por"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "oportunidades_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_factura_documento_id_fkey"
            columns: ["factura_documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_propuesta_documento_id_fkey"
            columns: ["propuesta_documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_responsable_actual_id_fkey"
            columns: ["responsable_actual_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_responsable_actual_id_fkey"
            columns: ["responsable_actual_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      precios_pool_horarios: {
        Row: {
          created_at: string
          fuente: string
          geo_id: number
          hora_utc: string
          id: string
          indicador_id: number
          indicador_nom: string
          unidad: string
          valor: number
        }
        Insert: {
          created_at?: string
          fuente?: string
          geo_id?: number
          hora_utc: string
          id?: string
          indicador_id: number
          indicador_nom: string
          unidad: string
          valor: number
        }
        Update: {
          created_at?: string
          fuente?: string
          geo_id?: number
          hora_utc?: string
          id?: string
          indicador_id?: number
          indicador_nom?: string
          unidad?: string
          valor?: number
        }
        Relationships: []
      }
      precios_regulados_boe: {
        Row: {
          created_at: string | null
          id: string
          legacy_potencia_id: string | null
          period: string
          price: number | null
          rate_eur_kw_day: number | null
          tariff: string
          tariff_type: string | null
          updated_at: string
          updated_by: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          legacy_potencia_id?: string | null
          period: string
          price?: number | null
          rate_eur_kw_day?: number | null
          tariff: string
          tariff_type?: string | null
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          legacy_potencia_id?: string | null
          period?: string
          price?: number | null
          rate_eur_kw_day?: number | null
          tariff?: string
          tariff_type?: string | null
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "precios_regulados_boe_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precios_regulados_boe_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      proposal_email_drafts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          bcc_email: string | null
          body_html: string
          body_text: string | null
          cc_email: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          proposal_id: string
          resend_message_id: string | null
          sent_at: string | null
          status: string
          subject: string
          to_email: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          bcc_email?: string | null
          body_html: string
          body_text?: string | null
          cc_email?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          proposal_id: string
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          bcc_email?: string | null
          body_html?: string
          body_text?: string | null
          cc_email?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          proposal_id?: string
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_email_drafts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_email_drafts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "proposal_email_drafts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_email_drafts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "proposal_email_drafts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          best_offer_annual_cost_eur: number | null
          best_offer_retailer: string | null
          best_offer_savings_eur: number | null
          best_offer_savings_pct: number | null
          comercial_id: string | null
          comparison_results: Json | null
          contacto_id: string | null
          created_at: string | null
          cups_id: string | null
          current_annual_cost_eur: number | null
          empresa_id: string | null
          id: string
          included_offers: Json | null
          pdf_url: string | null
          sent_at: string | null
          status: string | null
          status_v2: string | null
          supply_point_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          best_offer_annual_cost_eur?: number | null
          best_offer_retailer?: string | null
          best_offer_savings_eur?: number | null
          best_offer_savings_pct?: number | null
          comercial_id?: string | null
          comparison_results?: Json | null
          contacto_id?: string | null
          created_at?: string | null
          cups_id?: string | null
          current_annual_cost_eur?: number | null
          empresa_id?: string | null
          id?: string
          included_offers?: Json | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: string | null
          status_v2?: string | null
          supply_point_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          best_offer_annual_cost_eur?: number | null
          best_offer_retailer?: string | null
          best_offer_savings_eur?: number | null
          best_offer_savings_pct?: number | null
          comercial_id?: string | null
          comparison_results?: Json | null
          contacto_id?: string | null
          created_at?: string | null
          cups_id?: string | null
          current_annual_cost_eur?: number | null
          empresa_id?: string | null
          id?: string
          included_offers?: Json | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: string | null
          status_v2?: string | null
          supply_point_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "proposals_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "proposals_contacto_id_fkey"
            columns: ["contacto_id"]
            isOneToOne: false
            referencedRelation: "contactos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_cups_id_fkey"
            columns: ["cups_id"]
            isOneToOne: false
            referencedRelation: "cups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_cups_id_fkey"
            columns: ["cups_id"]
            isOneToOne: false
            referencedRelation: "supply_points_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      propuestas: {
        Row: {
          ahorro_estimado_pct: number | null
          comision_estimada: number | null
          compania_propuesta: string | null
          creada_por: string | null
          created_at: string
          datos_json: Json | null
          deleted_at: string | null
          empresa_id: string
          estado: string
          fecha_envio: string | null
          fecha_respuesta: string | null
          fecha_validez: string | null
          id: string
          notas_cliente: string | null
          oportunidad_id: string | null
          pdf_url: string | null
          potencia: number | null
          precio_kwh: number | null
          tarifa_propuesta: string | null
          updated_at: string
          version: number
        }
        Insert: {
          ahorro_estimado_pct?: number | null
          comision_estimada?: number | null
          compania_propuesta?: string | null
          creada_por?: string | null
          created_at?: string
          datos_json?: Json | null
          deleted_at?: string | null
          empresa_id: string
          estado?: string
          fecha_envio?: string | null
          fecha_respuesta?: string | null
          fecha_validez?: string | null
          id?: string
          notas_cliente?: string | null
          oportunidad_id?: string | null
          pdf_url?: string | null
          potencia?: number | null
          precio_kwh?: number | null
          tarifa_propuesta?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          ahorro_estimado_pct?: number | null
          comision_estimada?: number | null
          compania_propuesta?: string | null
          creada_por?: string | null
          created_at?: string
          datos_json?: Json | null
          deleted_at?: string | null
          empresa_id?: string
          estado?: string
          fecha_envio?: string | null
          fecha_respuesta?: string | null
          fecha_validez?: string | null
          id?: string
          notas_cliente?: string | null
          oportunidad_id?: string | null
          pdf_url?: string | null
          potencia?: number | null
          precio_kwh?: number | null
          tarifa_propuesta?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "propuestas_creada_por_fkey"
            columns: ["creada_por"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propuestas_creada_por_fkey"
            columns: ["creada_por"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "propuestas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propuestas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propuestas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propuestas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propuestas_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propuestas_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_enviados_en_seguimiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propuestas_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_historico_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propuestas_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propuestas_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_todos_mis_casos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propuestas_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_crm_oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propuestas_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_mis_oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propuestas_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_motivos_perdida_familia"
            referencedColumns: ["id"]
          },
        ]
      }
      renovaciones: {
        Row: {
          asignado_a: string | null
          contrato_id: string
          created_at: string
          deleted_at: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_renovacion"]
          fecha_deteccion: string
          fecha_vencimiento_contrato: string | null
          id: string
          motivo_perdida: string | null
          notas: string | null
          nuevo_contrato_id: string | null
          prioridad: Database["public"]["Enums"]["prioridad_renovacion"]
          updated_at: string
        }
        Insert: {
          asignado_a?: string | null
          contrato_id: string
          created_at?: string
          deleted_at?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_renovacion"]
          fecha_deteccion?: string
          fecha_vencimiento_contrato?: string | null
          id?: string
          motivo_perdida?: string | null
          notas?: string | null
          nuevo_contrato_id?: string | null
          prioridad?: Database["public"]["Enums"]["prioridad_renovacion"]
          updated_at?: string
        }
        Update: {
          asignado_a?: string | null
          contrato_id?: string
          created_at?: string
          deleted_at?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_renovacion"]
          fecha_deteccion?: string
          fecha_vencimiento_contrato?: string | null
          id?: string
          motivo_perdida?: string | null
          notas?: string | null
          nuevo_contrato_id?: string | null
          prioridad?: Database["public"]["Enums"]["prioridad_renovacion"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "renovaciones_asignado_a_fkey"
            columns: ["asignado_a"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renovaciones_asignado_a_fkey"
            columns: ["asignado_a"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "renovaciones_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renovaciones_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_por_vencer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renovaciones_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_contratos_activos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renovaciones_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_oportunidades_huerfanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renovaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renovaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renovaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renovaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renovaciones_nuevo_contrato_id_fkey"
            columns: ["nuevo_contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renovaciones_nuevo_contrato_id_fkey"
            columns: ["nuevo_contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_por_vencer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renovaciones_nuevo_contrato_id_fkey"
            columns: ["nuevo_contrato_id"]
            isOneToOne: false
            referencedRelation: "v_contratos_activos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renovaciones_nuevo_contrato_id_fkey"
            columns: ["nuevo_contrato_id"]
            isOneToOne: false
            referencedRelation: "v_oportunidades_huerfanas"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_calculations: {
        Row: {
          ahorro_previsto_p1: number | null
          ahorro_previsto_p2: number | null
          ahorro_previsto_p3: number | null
          ahorro_previsto_p4: number | null
          ahorro_previsto_p5: number | null
          ahorro_previsto_total: number | null
          ahorro_real_p1: number | null
          ahorro_real_p2: number | null
          ahorro_real_p3: number | null
          ahorro_real_p4: number | null
          ahorro_real_p5: number | null
          ahorro_real_total: number | null
          ciclo_id: string
          dias_previstos: number | null
          dias_reales: number | null
          fecha_calculo: string
          id: string
          legacy_potencia_id: string | null
          request_id: string
        }
        Insert: {
          ahorro_previsto_p1?: number | null
          ahorro_previsto_p2?: number | null
          ahorro_previsto_p3?: number | null
          ahorro_previsto_p4?: number | null
          ahorro_previsto_p5?: number | null
          ahorro_previsto_total?: number | null
          ahorro_real_p1?: number | null
          ahorro_real_p2?: number | null
          ahorro_real_p3?: number | null
          ahorro_real_p4?: number | null
          ahorro_real_p5?: number | null
          ahorro_real_total?: number | null
          ciclo_id: string
          dias_previstos?: number | null
          dias_reales?: number | null
          fecha_calculo?: string
          id?: string
          legacy_potencia_id?: string | null
          request_id: string
        }
        Update: {
          ahorro_previsto_p1?: number | null
          ahorro_previsto_p2?: number | null
          ahorro_previsto_p3?: number | null
          ahorro_previsto_p4?: number | null
          ahorro_previsto_p5?: number | null
          ahorro_previsto_total?: number | null
          ahorro_real_p1?: number | null
          ahorro_real_p2?: number | null
          ahorro_real_p3?: number | null
          ahorro_real_p4?: number | null
          ahorro_real_p5?: number | null
          ahorro_real_total?: number | null
          ciclo_id?: string
          dias_previstos?: number | null
          dias_reales?: number | null
          fecha_calculo?: string
          id?: string
          legacy_potencia_id?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_calculations_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_calculations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "solicitudes_potencia"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_potencia: {
        Row: {
          channel_used: string | null
          ciclo_id: string
          comercializadora_nombre: string | null
          created_at: string
          created_by: string | null
          cups_id: string
          doc_autorizacion_firmada_id: string | null
          doc_autorizacion_id: string | null
          empresa_id: string
          estado: string
          expediente_id: string | null
          fecha_alerta_amarilla: string | null
          fecha_alerta_naranja: string | null
          fecha_alerta_roja: string | null
          fecha_autorizacion: string | null
          fecha_ejecucion_real: string | null
          fecha_envio_autorizacion: string | null
          fecha_firma_cliente: string | null
          fecha_prevista_fin: string | null
          fecha_prevista_inicio: string | null
          fecha_solicitud_enviada: string | null
          id: string
          legacy_potencia_id: string | null
          notas_internas: string | null
          p1_actual: number | null
          p1_nueva: number | null
          p2_actual: number | null
          p2_nueva: number | null
          p3_actual: number | null
          p3_nueva: number | null
          p4_actual: number | null
          p4_nueva: number | null
          p5_actual: number | null
          p5_nueva: number | null
          p6_referencia: number | null
          ref_autorizacion: string | null
          ref_solicitud_distribuidora: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          channel_used?: string | null
          ciclo_id: string
          comercializadora_nombre?: string | null
          created_at?: string
          created_by?: string | null
          cups_id: string
          doc_autorizacion_firmada_id?: string | null
          doc_autorizacion_id?: string | null
          empresa_id: string
          estado: string
          expediente_id?: string | null
          fecha_alerta_amarilla?: string | null
          fecha_alerta_naranja?: string | null
          fecha_alerta_roja?: string | null
          fecha_autorizacion?: string | null
          fecha_ejecucion_real?: string | null
          fecha_envio_autorizacion?: string | null
          fecha_firma_cliente?: string | null
          fecha_prevista_fin?: string | null
          fecha_prevista_inicio?: string | null
          fecha_solicitud_enviada?: string | null
          id?: string
          legacy_potencia_id?: string | null
          notas_internas?: string | null
          p1_actual?: number | null
          p1_nueva?: number | null
          p2_actual?: number | null
          p2_nueva?: number | null
          p3_actual?: number | null
          p3_nueva?: number | null
          p4_actual?: number | null
          p4_nueva?: number | null
          p5_actual?: number | null
          p5_nueva?: number | null
          p6_referencia?: number | null
          ref_autorizacion?: string | null
          ref_solicitud_distribuidora?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          channel_used?: string | null
          ciclo_id?: string
          comercializadora_nombre?: string | null
          created_at?: string
          created_by?: string | null
          cups_id?: string
          doc_autorizacion_firmada_id?: string | null
          doc_autorizacion_id?: string | null
          empresa_id?: string
          estado?: string
          expediente_id?: string | null
          fecha_alerta_amarilla?: string | null
          fecha_alerta_naranja?: string | null
          fecha_alerta_roja?: string | null
          fecha_autorizacion?: string | null
          fecha_ejecucion_real?: string | null
          fecha_envio_autorizacion?: string | null
          fecha_firma_cliente?: string | null
          fecha_prevista_fin?: string | null
          fecha_prevista_inicio?: string | null
          fecha_solicitud_enviada?: string | null
          id?: string
          legacy_potencia_id?: string | null
          notas_internas?: string | null
          p1_actual?: number | null
          p1_nueva?: number | null
          p2_actual?: number | null
          p2_nueva?: number | null
          p3_actual?: number | null
          p3_nueva?: number | null
          p4_actual?: number | null
          p4_nueva?: number | null
          p5_actual?: number | null
          p5_nueva?: number | null
          p6_referencia?: number | null
          ref_autorizacion?: string | null
          ref_solicitud_distribuidora?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_potencia_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_potencia_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_potencia_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "solicitudes_potencia_cups_id_fkey"
            columns: ["cups_id"]
            isOneToOne: false
            referencedRelation: "cups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_potencia_cups_id_fkey"
            columns: ["cups_id"]
            isOneToOne: false
            referencedRelation: "supply_points_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_potencia_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_potencia_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_potencia_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_potencia_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_potencia_expediente_id_fkey"
            columns: ["expediente_id"]
            isOneToOne: false
            referencedRelation: "expedientes"
            referencedColumns: ["id"]
          },
        ]
      }
      status_log: {
        Row: {
          cambiado_por: string | null
          ciclo_id: string | null
          entidad_id: string | null
          entidad_tipo: string | null
          estado_anterior: string | null
          estado_nuevo: string
          expediente_id: string | null
          fecha_cambio: string
          id: string
          legacy_potencia_id: string | null
          notas: string | null
          request_id: string | null
        }
        Insert: {
          cambiado_por?: string | null
          ciclo_id?: string | null
          entidad_id?: string | null
          entidad_tipo?: string | null
          estado_anterior?: string | null
          estado_nuevo: string
          expediente_id?: string | null
          fecha_cambio?: string
          id?: string
          legacy_potencia_id?: string | null
          notas?: string | null
          request_id?: string | null
        }
        Update: {
          cambiado_por?: string | null
          ciclo_id?: string | null
          entidad_id?: string | null
          entidad_tipo?: string | null
          estado_anterior?: string | null
          estado_nuevo?: string
          expediente_id?: string | null
          fecha_cambio?: string
          id?: string
          legacy_potencia_id?: string | null
          notas?: string | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "status_log_cambiado_por_fkey"
            columns: ["cambiado_por"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_log_cambiado_por_fkey"
            columns: ["cambiado_por"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "status_log_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_log_expediente_id_fkey"
            columns: ["expediente_id"]
            isOneToOne: false
            referencedRelation: "expedientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_log_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "solicitudes_potencia"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas: {
        Row: {
          asignado_a: string | null
          completada: boolean
          contrato_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          descripcion: string | null
          empresa_id: string | null
          fecha_vencimiento: string | null
          id: string
          oportunidad_id: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          asignado_a?: string | null
          completada?: boolean
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          empresa_id?: string | null
          fecha_vencimiento?: string | null
          id?: string
          oportunidad_id?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          asignado_a?: string | null
          completada?: boolean
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          empresa_id?: string | null
          fecha_vencimiento?: string | null
          id?: string
          oportunidad_id?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_por_vencer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_contratos_activos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_oportunidades_huerfanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_enviados_en_seguimiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_historico_completo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_todos_mis_casos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_crm_oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_mis_oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "v_motivos_perdida_familia"
            referencedColumns: ["id"]
          },
        ]
      }
      tariff_documents: {
        Row: {
          created_at: string
          drive_file_id: string | null
          drive_url: string | null
          email_id: string | null
          error_message: string | null
          file_name: string | null
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          notes: string | null
          received_at: string | null
          sender_email: string | null
          sha256: string | null
          source: string
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          drive_file_id?: string | null
          drive_url?: string | null
          email_id?: string | null
          error_message?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          received_at?: string | null
          sender_email?: string | null
          sha256?: string | null
          source: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          drive_file_id?: string | null
          drive_url?: string | null
          email_id?: string | null
          error_message?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          received_at?: string | null
          sender_email?: string | null
          sha256?: string | null
          source?: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tariff_extractions: {
        Row: {
          confidence_score: number | null
          created_at: string
          document_id: string
          error_message: string | null
          id: string
          model_name: string
          proposed_action: string | null
          proposed_oferta_id: string | null
          raw_response_json: Json | null
          status: string
          structured_json: Json | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          document_id: string
          error_message?: string | null
          id?: string
          model_name: string
          proposed_action?: string | null
          proposed_oferta_id?: string | null
          raw_response_json?: Json | null
          status?: string
          structured_json?: Json | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          document_id?: string
          error_message?: string | null
          id?: string
          model_name?: string
          proposed_action?: string | null
          proposed_oferta_id?: string | null
          raw_response_json?: Json | null
          status?: string
          structured_json?: Json | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tariff_extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "tariff_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariff_extractions_proposed_oferta_id_fkey"
            columns: ["proposed_oferta_id"]
            isOneToOne: false
            referencedRelation: "comercializadora_ofertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariff_extractions_proposed_oferta_id_fkey"
            columns: ["proposed_oferta_id"]
            isOneToOne: false
            referencedRelation: "retailer_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariff_extractions_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariff_extractions_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          apellidos: string | null
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          funciones: string[]
          id: string
          is_approved: boolean
          legacy_potencia_id: string | null
          nombre: string | null
          role: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          apellidos?: string | null
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          funciones?: string[]
          id: string
          is_approved?: boolean
          legacy_potencia_id?: string | null
          nombre?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          apellidos?: string | null
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          funciones?: string[]
          id?: string
          is_approved?: boolean
          legacy_potencia_id?: string | null
          nombre?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      client_telemetry: {
        Row: {
          event_type: string
          id: string
          is_approved: boolean
          occurred_at: string
          payload: Json
          received_at: string
          user_id: string | null
        }
        Insert: {
          event_type: string
          id?: string
          occurred_at?: string
          payload?: Json
          received_at?: string
          user_id?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          occurred_at?: string
          payload?: Json
          received_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      boe_regulated_prices: {
        Row: {
          created_at: string | null
          id: string | null
          period: string | null
          price: number | null
          tariff: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          period?: string | null
          price?: number | null
          tariff?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          period?: string | null
          price?: number | null
          tariff?: string | null
        }
        Relationships: []
      }
      contratos_por_vencer: {
        Row: {
          dias_restantes: number | null
          empresa_id: string | null
          empresa_nombre: string | null
          estado_alerta: string | null
          fecha_fin: string | null
          id: string | null
          numero_contrato: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_asistente_top_no_respondidas: {
        Row: {
          pregunta_normalizada: string | null
          secciones: string[] | null
          ultima_vez: string | null
          veces: number | null
        }
        Relationships: []
      }
      fv_credenciales_safe: {
        Row: {
          activo: boolean | null
          actualizado_en: string | null
          cookies_expires_at: string | null
          creado_en: string | null
          descripcion: string | null
          empresa_id: string | null
          estado_sesion: string | null
          id: string | null
          nombre: string | null
          plataforma: string | null
          region_url: string | null
          tipo: string | null
          ultimo_error: string | null
          ultimo_ok_at: string | null
          username: string | null
          username_masked: string | null
        }
        Insert: {
          activo?: boolean | null
          actualizado_en?: string | null
          cookies_expires_at?: string | null
          creado_en?: string | null
          descripcion?: string | null
          empresa_id?: string | null
          estado_sesion?: string | null
          id?: string | null
          nombre?: string | null
          plataforma?: string | null
          region_url?: string | null
          tipo?: string | null
          ultimo_error?: string | null
          ultimo_ok_at?: string | null
          username?: string | null
          username_masked?: string | null
        }
        Update: {
          activo?: boolean | null
          actualizado_en?: string | null
          cookies_expires_at?: string | null
          creado_en?: string | null
          descripcion?: string | null
          empresa_id?: string | null
          estado_sesion?: string | null
          id?: string | null
          nombre?: string | null
          plataforma?: string | null
          region_url?: string | null
          tipo?: string | null
          ultimo_error?: string | null
          ultimo_ok_at?: string | null
          username?: string | null
          username_masked?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fv_credenciales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_credenciales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_credenciales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_credenciales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      fv_sync_health_latest: {
        Row: {
          creado_en: string | null
          credencial_id: string | null
          endpoint: string | null
          error_raw: string | null
          error_tipo: Database["public"]["Enums"]["fv_error_category"] | null
          fecha_dato: string | null
          filas_insertadas: number | null
          intentos: number | null
          ms_elapsed: number | null
          ok: boolean | null
          planta_estado: string | null
          planta_id: string | null
          planta_nombre: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fv_sync_audit_credencial_id_fkey"
            columns: ["credencial_id"]
            isOneToOne: false
            referencedRelation: "fv_credenciales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_sync_audit_credencial_id_fkey"
            columns: ["credencial_id"]
            isOneToOne: false
            referencedRelation: "fv_credenciales_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fv_sync_audit_planta_id_fkey"
            columns: ["planta_id"]
            isOneToOne: false
            referencedRelation: "fv_planta"
            referencedColumns: ["id"]
          },
        ]
      }
      holded_audit_duplicados_nif: {
        Row: {
          dup_count: number | null
          empresa_ids: string[] | null
          nif_normalizado: string | null
          nombres: string[] | null
        }
        Relationships: []
      }
      holded_audit_empresas: {
        Row: {
          ciudad: string | null
          comercial_id: string | null
          cp: string | null
          created_at: string | null
          direccion: string | null
          direccion_con_cp_embebido: boolean | null
          direccion_holded_lista: boolean | null
          email_formato_ok: boolean | null
          email_principal: string | null
          id: string | null
          nif: string | null
          nif_checksum_ok: boolean | null
          nif_clase: string | null
          nif_normalizado: string | null
          nombre: string | null
          pais: string | null
          provincia: string | null
          segmento: string | null
          telefono_principal: string | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          ciudad?: string | null
          comercial_id?: string | null
          cp?: string | null
          created_at?: string | null
          direccion?: string | null
          direccion_con_cp_embebido?: never
          direccion_holded_lista?: never
          email_formato_ok?: never
          email_principal?: string | null
          id?: string | null
          nif?: string | null
          nif_checksum_ok?: never
          nif_clase?: never
          nif_normalizado?: never
          nombre?: string | null
          pais?: string | null
          provincia?: string | null
          segmento?: string | null
          telefono_principal?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          ciudad?: string | null
          comercial_id?: string | null
          cp?: string | null
          created_at?: string | null
          direccion?: string | null
          direccion_con_cp_embebido?: never
          direccion_holded_lista?: never
          email_formato_ok?: never
          email_principal?: string | null
          id?: string | null
          nif?: string | null
          nif_checksum_ok?: never
          nif_clase?: never
          nif_normalizado?: never
          nombre?: string | null
          pais?: string | null
          provincia?: string | null
          segmento?: string | null
          telefono_principal?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      holded_audit_resumen: {
        Row: {
          clase_cif: number | null
          clase_invalid_format: number | null
          clase_nie: number | null
          clase_nif_persona: number | null
          clase_vat_intracom: number | null
          con_nif: number | null
          direccion_con_cp_embebido: number | null
          direccion_lista_para_holded: number | null
          email_formato_ok: number | null
          nif_checksum_invalidos: number | null
          nif_checksum_validos: number | null
          sin_nif: number | null
          tipo_null: number | null
          total_empresas: number | null
        }
        Relationships: []
      }
      retailer_offers: {
        Row: {
          access_rate: string | null
          activation_fee_eur: number | null
          allow_zero_invoice: boolean | null
          annual_management_fee_eur: number | null
          battery_fee_per_kwp_eur: number | null
          created_at: string | null
          energy_prices: number[] | null
          entry_fee_eur: number | null
          entry_fee_per_kw: number | null
          id: string | null
          include_in_comparison: boolean | null
          min_contract_months: number | null
          notes: string | null
          power_prices: number[] | null
          product_name: string | null
          retailer_id: string | null
          show_tolls_separately: boolean | null
          surplus_model: string | null
          surplus_price_per_kwh: number | null
          tender_fee_pct: number | null
        }
        Insert: {
          access_rate?: string | null
          activation_fee_eur?: number | null
          allow_zero_invoice?: boolean | null
          annual_management_fee_eur?: number | null
          battery_fee_per_kwp_eur?: number | null
          created_at?: string | null
          energy_prices?: number[] | null
          entry_fee_eur?: number | null
          entry_fee_per_kw?: number | null
          id?: string | null
          include_in_comparison?: boolean | null
          min_contract_months?: number | null
          notes?: string | null
          power_prices?: number[] | null
          product_name?: string | null
          retailer_id?: string | null
          show_tolls_separately?: boolean | null
          surplus_model?: string | null
          surplus_price_per_kwh?: number | null
          tender_fee_pct?: number | null
        }
        Update: {
          access_rate?: string | null
          activation_fee_eur?: number | null
          allow_zero_invoice?: boolean | null
          annual_management_fee_eur?: number | null
          battery_fee_per_kwp_eur?: number | null
          created_at?: string | null
          energy_prices?: number[] | null
          entry_fee_eur?: number | null
          entry_fee_per_kw?: number | null
          id?: string | null
          include_in_comparison?: boolean | null
          min_contract_months?: number | null
          notes?: string | null
          power_prices?: number[] | null
          product_name?: string | null
          retailer_id?: string | null
          show_tolls_separately?: boolean | null
          surplus_model?: string | null
          surplus_price_per_kwh?: number | null
          tender_fee_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "retailer_offers_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "comercializadoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retailer_offers_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      retailers: {
        Row: {
          activa: boolean | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          legacy_potencia_com_id: string | null
          model: string | null
          name: string | null
          nif: string | null
          nombre_normalizado: string | null
          notes: string | null
          tipo_energia: string | null
        }
        Insert: {
          activa?: boolean | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          legacy_potencia_com_id?: string | null
          model?: string | null
          name?: string | null
          nif?: string | null
          nombre_normalizado?: string | null
          notes?: string | null
          tipo_energia?: string | null
        }
        Update: {
          activa?: boolean | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          legacy_potencia_com_id?: string | null
          model?: string | null
          name?: string | null
          nif?: string | null
          nombre_normalizado?: string | null
          notes?: string | null
          tipo_energia?: string | null
        }
        Relationships: []
      }
      supply_points_compat: {
        Row: {
          autoconsumption_model: string | null
          client_id: string | null
          created_at: string | null
          cups: string | null
          current_retailer: string | null
          e1_kwh: number | null
          e2_kwh: number | null
          e3_kwh: number | null
          e4_kwh: number | null
          e5_kwh: number | null
          e6_kwh: number | null
          fv_installation_cost_eur: number | null
          id: string | null
          installation_date: string | null
          inverter_brand: string | null
          inverter_power_kw: number | null
          manual_autoconsumption_model: string | null
          manual_tariff: string | null
          powers: Json | null
          pv_power_kwp: number | null
          supply_address: string | null
          tariff: string | null
        }
        Insert: {
          autoconsumption_model?: string | null
          client_id?: string | null
          created_at?: string | null
          cups?: string | null
          current_retailer?: string | null
          e1_kwh?: number | null
          e2_kwh?: number | null
          e3_kwh?: number | null
          e4_kwh?: number | null
          e5_kwh?: number | null
          e6_kwh?: number | null
          fv_installation_cost_eur?: number | null
          id?: string | null
          installation_date?: string | null
          inverter_brand?: string | null
          inverter_power_kw?: number | null
          manual_autoconsumption_model?: string | null
          manual_tariff?: string | null
          powers?: Json | null
          pv_power_kwp?: number | null
          supply_address?: string | null
          tariff?: string | null
        }
        Update: {
          autoconsumption_model?: string | null
          client_id?: string | null
          created_at?: string | null
          cups?: string | null
          current_retailer?: string | null
          e1_kwh?: number | null
          e2_kwh?: number | null
          e3_kwh?: number | null
          e4_kwh?: number | null
          e5_kwh?: number | null
          e6_kwh?: number | null
          fv_installation_cost_eur?: number | null
          id?: string | null
          installation_date?: string | null
          inverter_brand?: string | null
          inverter_power_kw?: number | null
          manual_autoconsumption_model?: string | null
          manual_tariff?: string | null
          powers?: Json | null
          pv_power_kwp?: number | null
          supply_address?: string | null
          tariff?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cups_empresa_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cups_empresa_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cups_empresa_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cups_empresa_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      v_captacion_empresas: {
        Row: {
          activo: boolean | null
          asesor_id: string | null
          ciudad: string | null
          comercial_id: string | null
          convertido_cliente_at: string | null
          convertido_cliente_por: string | null
          cp: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          direccion: string | null
          email_principal: string | null
          estado_relacion: string | null
          external_id: string | null
          holded_etag: string | null
          holded_id: string | null
          holded_synced_at: string | null
          id: string | null
          legacy_potencia_id: string | null
          nif: string | null
          nombre: string | null
          notas: string | null
          origen_relacion: string | null
          pais: string | null
          persona_contacto: string | null
          provincia: string | null
          segmento: string | null
          tags: string[] | null
          telefono_principal: string | null
          tipo: string | null
          updated_at: string | null
          updated_by: string | null
          web: string | null
        }
        Insert: {
          activo?: boolean | null
          asesor_id?: string | null
          ciudad?: string | null
          comercial_id?: string | null
          convertido_cliente_at?: string | null
          convertido_cliente_por?: string | null
          cp?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          direccion?: string | null
          email_principal?: string | null
          estado_relacion?: string | null
          external_id?: string | null
          holded_etag?: string | null
          holded_id?: string | null
          holded_synced_at?: string | null
          id?: string | null
          legacy_potencia_id?: string | null
          nif?: string | null
          nombre?: string | null
          notas?: string | null
          origen_relacion?: string | null
          pais?: string | null
          persona_contacto?: string | null
          provincia?: string | null
          segmento?: string | null
          tags?: string[] | null
          telefono_principal?: string | null
          tipo?: string | null
          updated_at?: string | null
          updated_by?: string | null
          web?: string | null
        }
        Update: {
          activo?: boolean | null
          asesor_id?: string | null
          ciudad?: string | null
          comercial_id?: string | null
          convertido_cliente_at?: string | null
          convertido_cliente_por?: string | null
          cp?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          direccion?: string | null
          email_principal?: string | null
          estado_relacion?: string | null
          external_id?: string | null
          holded_etag?: string | null
          holded_id?: string | null
          holded_synced_at?: string | null
          id?: string | null
          legacy_potencia_id?: string | null
          nif?: string | null
          nombre?: string | null
          notas?: string | null
          origen_relacion?: string | null
          pais?: string | null
          persona_contacto?: string | null
          provincia?: string | null
          segmento?: string | null
          tags?: string[] | null
          telefono_principal?: string | null
          tipo?: string | null
          updated_at?: string | null
          updated_by?: string | null
          web?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_asesor_id_fkey"
            columns: ["asesor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_asesor_id_fkey"
            columns: ["asesor_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "empresas_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "empresas_convertido_cliente_por_fkey"
            columns: ["convertido_cliente_por"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_convertido_cliente_por_fkey"
            columns: ["convertido_cliente_por"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "empresas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "empresas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      v_captacion_enviados_en_seguimiento: {
        Row: {
          created_at: string | null
          dias_desde_envio: number | null
          dias_sin_movimiento: number | null
          empresa_id: string | null
          empresa_nif: string | null
          empresa_nombre: string | null
          empresa_telefono: string | null
          etapa: string | null
          etapa_operativa: string | null
          fecha_siguiente_accion: string | null
          fecha_vencimiento_contrato_prospecto: string | null
          id: string | null
          responsable_actual_funciones: string[] | null
          responsable_actual_id: string | null
          responsable_actual_nombre: string | null
          siguiente_accion: string | null
          sla_color: string | null
          tipo: string | null
          tipo_destinatario: string | null
          ultimo_handoff_at: string | null
          ultimo_handoff_motivo: string | null
          updated_at: string | null
          valor_estimado_eur: number | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_responsable_actual_id_fkey"
            columns: ["responsable_actual_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_responsable_actual_id_fkey"
            columns: ["responsable_actual_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      v_captacion_historico_completo: {
        Row: {
          ahorro_anual_estimado: number | null
          contexto: string | null
          creador_funciones: string[] | null
          creador_nombre: string | null
          created_at: string | null
          created_by: string | null
          decisor_identificado: boolean | null
          dias_sin_movimiento: number | null
          dias_vencimiento: number | null
          empresa_ciudad: string | null
          empresa_email: string | null
          empresa_estado_relacion: string | null
          empresa_id: string | null
          empresa_nif: string | null
          empresa_nombre: string | null
          empresa_segmento: string | null
          empresa_telefono: string | null
          etapa: string | null
          etapa_operativa: string | null
          factura_documento_id: string | null
          factura_fecha_prevista: string | null
          factura_recibida_at: string | null
          fecha_siguiente_accion: string | null
          fecha_vencimiento_contrato_prospecto: string | null
          fuente_vencimiento_contrato_prospecto: string | null
          id: string | null
          motivo_perdida: string | null
          motivo_perdida_codigo:
            | Database["public"]["Enums"]["motivo_perdida_enum"]
            | null
          motivo_perdida_detalle: string | null
          notas: string | null
          origen: string | null
          propuesta_documento_id: string | null
          propuesta_enviada_at: string | null
          responsable_actual_funciones: string[] | null
          responsable_actual_id: string | null
          responsable_actual_nombre: string | null
          siguiente_accion: string | null
          tipo: string | null
          updated_at: string | null
          valor_estimado_eur: number | null
          visita_programada_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidades_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_factura_documento_id_fkey"
            columns: ["factura_documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_propuesta_documento_id_fkey"
            columns: ["propuesta_documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_responsable_actual_id_fkey"
            columns: ["responsable_actual_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_responsable_actual_id_fkey"
            columns: ["responsable_actual_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      v_captacion_oportunidades: {
        Row: {
          ahorro_anual_estimado: number | null
          comercial_id: string | null
          contacto_id: string | null
          contexto: string | null
          contrato_origen_id: string | null
          convertida_a_crm_at: string | null
          convertida_a_crm_por: string | null
          created_at: string | null
          created_by: string | null
          decisor_identificado: boolean | null
          deleted_at: string | null
          empresa_id: string | null
          etapa: string | null
          etapa_operativa: string | null
          external_id: string | null
          factura_documento_id: string | null
          factura_fecha_prevista: string | null
          factura_recibida_at: string | null
          fecha_cierre_prevista: string | null
          holded_etag: string | null
          holded_id: string | null
          holded_synced_at: string | null
          id: string | null
          motivo_perdida: string | null
          motivo_perdida_codigo:
            | Database["public"]["Enums"]["motivo_perdida_enum"]
            | null
          motivo_perdida_detalle: string | null
          nombre: string | null
          notas: string | null
          probabilidad_pct: number | null
          propuesta_documento_id: string | null
          propuesta_enviada_at: string | null
          responsable_actual_id: string | null
          tags: string[] | null
          tipo: string | null
          updated_at: string | null
          valor_estimado_eur: number | null
          visita_programada_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidades_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "oportunidades_contacto_id_fkey"
            columns: ["contacto_id"]
            isOneToOne: false
            referencedRelation: "contactos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_contrato_origen_id_fkey"
            columns: ["contrato_origen_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_contrato_origen_id_fkey"
            columns: ["contrato_origen_id"]
            isOneToOne: false
            referencedRelation: "contratos_por_vencer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_contrato_origen_id_fkey"
            columns: ["contrato_origen_id"]
            isOneToOne: false
            referencedRelation: "v_contratos_activos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_contrato_origen_id_fkey"
            columns: ["contrato_origen_id"]
            isOneToOne: false
            referencedRelation: "v_oportunidades_huerfanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_convertida_a_crm_por_fkey"
            columns: ["convertida_a_crm_por"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_convertida_a_crm_por_fkey"
            columns: ["convertida_a_crm_por"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "oportunidades_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_factura_documento_id_fkey"
            columns: ["factura_documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_propuesta_documento_id_fkey"
            columns: ["propuesta_documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_responsable_actual_id_fkey"
            columns: ["responsable_actual_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_responsable_actual_id_fkey"
            columns: ["responsable_actual_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      v_captacion_todos_mis_casos: {
        Row: {
          ahorro_anual_estimado: number | null
          creador_funciones: string[] | null
          creador_nombre: string | null
          created_at: string | null
          created_by: string | null
          decisor_identificado: boolean | null
          empresa_id: string | null
          empresa_nif: string | null
          empresa_nombre: string | null
          etapa: string | null
          etapa_operativa: string | null
          factura_documento_id: string | null
          factura_fecha_prevista: string | null
          factura_recibida_at: string | null
          fecha_siguiente_accion: string | null
          fecha_vencimiento_contrato_prospecto: string | null
          fuente_vencimiento_contrato_prospecto: string | null
          id: string | null
          propuesta_documento_id: string | null
          propuesta_enviada_at: string | null
          responsable_actual_funciones: string[] | null
          responsable_actual_id: string | null
          responsable_actual_nombre: string | null
          siguiente_accion: string | null
          tipo: string | null
          updated_at: string | null
          valor_estimado_eur: number | null
          visita_programada_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidades_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_factura_documento_id_fkey"
            columns: ["factura_documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_propuesta_documento_id_fkey"
            columns: ["propuesta_documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_responsable_actual_id_fkey"
            columns: ["responsable_actual_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_responsable_actual_id_fkey"
            columns: ["responsable_actual_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      v_contratos_activos: {
        Row: {
          comercial_id: string | null
          comercial_nombre: string | null
          comision_comercial: number | null
          comision_integra: number | null
          comision_jefe: number | null
          compania: string | null
          consumo_po_kwh: number | null
          consumo_sips_kwh: number | null
          contacto_firmante_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          dias_para_vencimiento: number | null
          duracion_meses: number | null
          empresa_id: string | null
          empresa_nif: string | null
          empresa_nombre: string | null
          estado: string | null
          external_id: string | null
          fecha_fin: string | null
          fecha_firma: string | null
          fecha_inicio: string | null
          id: string | null
          numero_contrato: string | null
          observaciones: string | null
          potencia_contratada: number | null
          prioridad_renovacion: string | null
          tarifa_acceso: string | null
          tarifa_cliente: string | null
          tipo_energia: string | null
          tipo_precio: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "contratos_contacto_firmante_id_fkey"
            columns: ["contacto_firmante_id"]
            isOneToOne: false
            referencedRelation: "contactos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      v_crm_empresas_clientes: {
        Row: {
          activo: boolean | null
          asesor_id: string | null
          ciudad: string | null
          comercial_id: string | null
          convertido_cliente_at: string | null
          convertido_cliente_por: string | null
          cp: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          direccion: string | null
          email_principal: string | null
          estado_relacion: string | null
          external_id: string | null
          holded_etag: string | null
          holded_id: string | null
          holded_synced_at: string | null
          id: string | null
          legacy_potencia_id: string | null
          nif: string | null
          nombre: string | null
          notas: string | null
          origen_relacion: string | null
          pais: string | null
          persona_contacto: string | null
          provincia: string | null
          segmento: string | null
          tags: string[] | null
          telefono_principal: string | null
          tipo: string | null
          updated_at: string | null
          updated_by: string | null
          web: string | null
        }
        Insert: {
          activo?: boolean | null
          asesor_id?: string | null
          ciudad?: string | null
          comercial_id?: string | null
          convertido_cliente_at?: string | null
          convertido_cliente_por?: string | null
          cp?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          direccion?: string | null
          email_principal?: string | null
          estado_relacion?: string | null
          external_id?: string | null
          holded_etag?: string | null
          holded_id?: string | null
          holded_synced_at?: string | null
          id?: string | null
          legacy_potencia_id?: string | null
          nif?: string | null
          nombre?: string | null
          notas?: string | null
          origen_relacion?: string | null
          pais?: string | null
          persona_contacto?: string | null
          provincia?: string | null
          segmento?: string | null
          tags?: string[] | null
          telefono_principal?: string | null
          tipo?: string | null
          updated_at?: string | null
          updated_by?: string | null
          web?: string | null
        }
        Update: {
          activo?: boolean | null
          asesor_id?: string | null
          ciudad?: string | null
          comercial_id?: string | null
          convertido_cliente_at?: string | null
          convertido_cliente_por?: string | null
          cp?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          direccion?: string | null
          email_principal?: string | null
          estado_relacion?: string | null
          external_id?: string | null
          holded_etag?: string | null
          holded_id?: string | null
          holded_synced_at?: string | null
          id?: string | null
          legacy_potencia_id?: string | null
          nif?: string | null
          nombre?: string | null
          notas?: string | null
          origen_relacion?: string | null
          pais?: string | null
          persona_contacto?: string | null
          provincia?: string | null
          segmento?: string | null
          tags?: string[] | null
          telefono_principal?: string | null
          tipo?: string | null
          updated_at?: string | null
          updated_by?: string | null
          web?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_asesor_id_fkey"
            columns: ["asesor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_asesor_id_fkey"
            columns: ["asesor_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "empresas_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "empresas_convertido_cliente_por_fkey"
            columns: ["convertido_cliente_por"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_convertido_cliente_por_fkey"
            columns: ["convertido_cliente_por"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "empresas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "empresas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      v_crm_oportunidades: {
        Row: {
          ahorro_anual_estimado: number | null
          comercial_id: string | null
          contacto_id: string | null
          contexto: string | null
          contrato_origen_id: string | null
          convertida_a_crm_at: string | null
          convertida_a_crm_por: string | null
          created_at: string | null
          created_by: string | null
          decisor_identificado: boolean | null
          deleted_at: string | null
          empresa_id: string | null
          etapa: string | null
          etapa_operativa: string | null
          external_id: string | null
          factura_documento_id: string | null
          factura_fecha_prevista: string | null
          factura_recibida_at: string | null
          fecha_cierre_prevista: string | null
          holded_etag: string | null
          holded_id: string | null
          holded_synced_at: string | null
          id: string | null
          motivo_perdida: string | null
          motivo_perdida_codigo:
            | Database["public"]["Enums"]["motivo_perdida_enum"]
            | null
          motivo_perdida_detalle: string | null
          nombre: string | null
          notas: string | null
          probabilidad_pct: number | null
          propuesta_documento_id: string | null
          propuesta_enviada_at: string | null
          responsable_actual_id: string | null
          tags: string[] | null
          tipo: string | null
          updated_at: string | null
          valor_estimado_eur: number | null
          visita_programada_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidades_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "oportunidades_contacto_id_fkey"
            columns: ["contacto_id"]
            isOneToOne: false
            referencedRelation: "contactos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_contrato_origen_id_fkey"
            columns: ["contrato_origen_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_contrato_origen_id_fkey"
            columns: ["contrato_origen_id"]
            isOneToOne: false
            referencedRelation: "contratos_por_vencer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_contrato_origen_id_fkey"
            columns: ["contrato_origen_id"]
            isOneToOne: false
            referencedRelation: "v_contratos_activos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_contrato_origen_id_fkey"
            columns: ["contrato_origen_id"]
            isOneToOne: false
            referencedRelation: "v_oportunidades_huerfanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_convertida_a_crm_por_fkey"
            columns: ["convertida_a_crm_por"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_convertida_a_crm_por_fkey"
            columns: ["convertida_a_crm_por"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "oportunidades_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_factura_documento_id_fkey"
            columns: ["factura_documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_propuesta_documento_id_fkey"
            columns: ["propuesta_documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_responsable_actual_id_fkey"
            columns: ["responsable_actual_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_responsable_actual_id_fkey"
            columns: ["responsable_actual_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      v_dashboard_comercial: {
        Row: {
          comercial_id: string | null
          comision_integra_mes_actual: number | null
          contratos_activos: number | null
          nombre_completo: string | null
          vencen_30d: number | null
          vencen_60d: number | null
        }
        Relationships: []
      }
      v_incidencias_kpi: {
        Row: {
          abiertas: number | null
          altas: number | null
          criticas: number | null
          vencidas: number | null
        }
        Relationships: []
      }
      v_mis_llamadas: {
        Row: {
          created_at: string | null
          descripcion: string | null
          duracion_min: number | null
          empresa_id: string | null
          empresa_nif: string | null
          empresa_nombre: string | null
          empresa_telefono: string | null
          etapa_operativa: string | null
          fecha_actividad: string | null
          id: string | null
          llamada_creada_por: string | null
          llamada_creada_por_nombre: string | null
          oportunidad_id: string | null
          responsable_actual_id: string | null
          resultado: string | null
          titulo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actividades_usuario_id_fkey"
            columns: ["llamada_creada_por"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_usuario_id_fkey"
            columns: ["llamada_creada_por"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_responsable_actual_id_fkey"
            columns: ["responsable_actual_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_responsable_actual_id_fkey"
            columns: ["responsable_actual_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      v_mis_oportunidades: {
        Row: {
          ahorro_anual_estimado: number | null
          created_at: string | null
          decisor_identificado: boolean | null
          empresa_id: string | null
          empresa_nif: string | null
          empresa_nombre: string | null
          etapa: string | null
          etapa_operativa: string | null
          factura_documento_id: string | null
          factura_fecha_prevista: string | null
          factura_recibida_at: string | null
          fecha_siguiente_accion: string | null
          fecha_vencimiento_contrato_prospecto: string | null
          fuente_vencimiento_contrato_prospecto: string | null
          id: string | null
          propuesta_documento_id: string | null
          propuesta_enviada_at: string | null
          responsable_actual_id: string | null
          siguiente_accion: string | null
          tipo: string | null
          updated_at: string | null
          valor_estimado_eur: number | null
          visita_programada_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_factura_documento_id_fkey"
            columns: ["factura_documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_propuesta_documento_id_fkey"
            columns: ["propuesta_documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_responsable_actual_id_fkey"
            columns: ["responsable_actual_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_responsable_actual_id_fkey"
            columns: ["responsable_actual_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      v_motivos_perdida_familia: {
        Row: {
          cerrada_at: string | null
          empresa_id: string | null
          familia: string | null
          id: string | null
          motivo_perdida_codigo:
            | Database["public"]["Enums"]["motivo_perdida_enum"]
            | null
          motivo_perdida_detalle: string | null
        }
        Insert: {
          cerrada_at?: string | null
          empresa_id?: string | null
          familia?: never
          id?: string | null
          motivo_perdida_codigo?:
            | Database["public"]["Enums"]["motivo_perdida_enum"]
            | null
          motivo_perdida_detalle?: string | null
        }
        Update: {
          cerrada_at?: string | null
          empresa_id?: string | null
          familia?: never
          id?: string | null
          motivo_perdida_codigo?:
            | Database["public"]["Enums"]["motivo_perdida_enum"]
            | null
          motivo_perdida_detalle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      v_oportunidades_huerfanas: {
        Row: {
          comercial_id: string | null
          comercial_nombre: string | null
          comision_comercial: number | null
          comision_integra: number | null
          comision_jefe: number | null
          compania: string | null
          consumo_po_kwh: number | null
          consumo_sips_kwh: number | null
          contacto_firmante_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          dias_para_vencimiento: number | null
          duracion_meses: number | null
          empresa_id: string | null
          empresa_nif: string | null
          empresa_nombre: string | null
          estado: string | null
          external_id: string | null
          fecha_fin: string | null
          fecha_firma: string | null
          fecha_inicio: string | null
          id: string | null
          numero_contrato: string | null
          observaciones: string | null
          potencia_contratada: number | null
          prioridad_renovacion: string | null
          tarifa_acceso: string | null
          tarifa_cliente: string | null
          tipo_energia: string | null
          tipo_precio: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "contratos_contacto_firmante_id_fkey"
            columns: ["contacto_firmante_id"]
            isOneToOne: false
            referencedRelation: "contactos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "holded_audit_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_captacion_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_crm_empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard_comercial"
            referencedColumns: ["comercial_id"]
          },
        ]
      }
      v_oportunidades_kpi: {
        Row: {
          ahorro_acumulado: number | null
          etapa: string | null
          total: number | null
          valor_acumulado: number | null
        }
        Relationships: []
      }
      v_renovaciones_kpi: {
        Row: {
          activas: number | null
          criticas: number | null
          perdidas: number | null
          renovadas: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      actualizar_lead_captacion:
        | {
            Args: {
              p_contacto_cargo?: string
              p_contacto_email?: string
              p_contacto_nombre?: string
              p_contacto_telefono?: string
              p_empresa_ciudad?: string
              p_empresa_email?: string
              p_empresa_nif?: string
              p_empresa_nombre: string
              p_empresa_segmento?: string
              p_empresa_telefono?: string
              p_notas?: string
              p_oportunidad_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_contactos?: Json
              p_empresa_ciudad?: string
              p_empresa_email?: string
              p_empresa_nif?: string
              p_empresa_nombre: string
              p_empresa_segmento?: string
              p_empresa_telefono?: string
              p_notas?: string
              p_oportunidad_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_actualizar_vencimiento?: boolean
              p_contactos?: Json
              p_empresa_ciudad?: string
              p_empresa_email?: string
              p_empresa_nif?: string
              p_empresa_nombre: string
              p_empresa_segmento?: string
              p_empresa_telefono?: string
              p_fecha_vencimiento_contrato?: string
              p_fuente_vencimiento?: string
              p_notas?: string
              p_notas_vencimiento?: string
              p_oportunidad_id: string
            }
            Returns: Json
          }
      admin_reject_user: { Args: { p_user_id: string }; Returns: undefined }
      agregar_comentario_oportunidad: {
        Args: { p_oportunidad_id: string; p_texto: string }
        Returns: string
      }
      audit_log_insert: {
        Args: {
          p_action: string
          p_actor_email: string
          p_actor_id: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_new_values?: Json
          p_old_values?: Json
        }
        Returns: undefined
      }
      clasifica_nif_cif: { Args: { p_input: string }; Returns: string }
      cleanup_datadis_cache: { Args: never; Returns: number }
      cleanup_datadis_proxy_cache: { Args: never; Returns: number }
      cleanup_pending_users_older_than_7_days: { Args: never; Returns: number }
      convertir_prospecto_a_cliente: {
        Args: {
          p_empresa_id: string
          p_notas?: string
          p_oportunidad_id?: string
        }
        Returns: Json
      }
      crear_lead_captacion:
        | {
            Args: {
              p_contacto_cargo?: string
              p_contacto_email?: string
              p_contacto_nombre?: string
              p_contacto_telefono?: string
              p_empresa_ciudad?: string
              p_empresa_email?: string
              p_empresa_nif?: string
              p_empresa_nombre: string
              p_empresa_segmento?: string
              p_empresa_telefono?: string
              p_notas?: string
              p_origen?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_contactos?: Json
              p_empresa_ciudad?: string
              p_empresa_email?: string
              p_empresa_nif?: string
              p_empresa_nombre: string
              p_empresa_segmento?: string
              p_empresa_telefono?: string
              p_notas?: string
              p_origen?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_contactos?: Json
              p_empresa_ciudad?: string
              p_empresa_email?: string
              p_empresa_nif?: string
              p_empresa_nombre: string
              p_empresa_segmento?: string
              p_empresa_telefono?: string
              p_fecha_vencimiento_contrato?: string
              p_fuente_vencimiento?: string
              p_notas?: string
              p_notas_vencimiento?: string
              p_origen?: string
            }
            Returns: string
          }
      editar_campo_empresa: {
        Args: { p_campo: string; p_empresa_id: string; p_valor: string }
        Returns: Json
      }
      editar_campo_oportunidad: {
        Args: { p_campo: string; p_oportunidad_id: string; p_valor: string }
        Returns: Json
      }
      fv_estado_sesion: { Args: { expires_at: string }; Returns: string }
      fv_is_admin: { Args: never; Returns: boolean }
      fv_upsert_planta: {
        Args: {
          p_capacidad_kwp: number
          p_credencial_id: string
          p_empresa_id?: string
          p_estado: string
          p_fecha_conexion: string
          p_nombre: string
          p_pais: string
          p_plataforma: string
          p_region_url: string
          p_station_code: string
          p_tiene_bateria: boolean
        }
        Returns: {
          planta_empresa_id: string
          planta_id: string
          planta_is_new: boolean
        }[]
      }
      get_resumen_vencimientos: {
        Args: { p_comercial_id?: string }
        Returns: {
          criticas: number
          futuras: number
          proximas: number
          total: number
        }[]
      }
      get_user_rol: { Args: never; Returns: string }
      holded_dispatch_worker: { Args: never; Returns: number }
      holded_enqueue: {
        Args: {
          p_action: string
          p_direction?: string
          p_entity: string
          p_entity_id: string
          p_idempotency?: string
          p_payload?: Json
          p_scheduled_for?: string
        }
        Returns: string
      }
      holded_get_config: {
        Args: never
        Returns: {
          api_base_url: string
          created_at: string
          enabled: boolean
          excluded_nifs: string[]
          functions_base_url: string
          http_timeout_ms: number
          id: string
          last_error: string | null
          last_error_at: string | null
          last_full_sync_at: string | null
          mode: string
          notes: string | null
          productos_sync_mode: string
          rate_limit_req_per_sec: number
          retry_initial_backoff_ms: number
          retry_max_attempts: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "holded_config"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      holded_mask_iban: { Args: { p_iban: string }; Returns: string }
      holded_mask_nif: { Args: { p_nif: string }; Returns: string }
      is_approved: { Args: never; Returns: boolean }
      is_manager_or_above: { Args: never; Returns: boolean }
      is_master: { Args: never; Returns: boolean }
      match_crm_help: {
        Args: {
          filter_section?: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          chunk_text: string
          section: string
          similarity: number
          source_path: string
          source_url: string
          title: string
        }[]
      }
      normaliza_nif_cif: { Args: { p_input: string }; Returns: string }
      normalizar_nombre_retailer: { Args: { input: string }; Returns: string }
      posponer_llamada: {
        Args: {
          p_fecha_proxima: string
          p_motivo: string
          p_notas?: string
          p_oportunidad_id: string
        }
        Returns: string
      }
      publish_oferta_with_versioning: {
        Args: {
          p_access_rate: string
          p_comercializadora_id: string
          p_payload: Json
          p_product_name: string
          p_source_document_id?: string
          p_validated_by?: string
        }
        Returns: string
      }
      recordar_a_responsable: {
        Args: { p_mensaje: string; p_oportunidad_id: string }
        Returns: Json
      }
      run_daily_contract_check: { Args: never; Returns: Json }
      user_has_funcion: { Args: { p_funcion: string }; Returns: boolean }
      valida_nif_cif: { Args: { p_input: string }; Returns: boolean }
    }
    Enums: {
      estado_incidencia:
        | "abierta"
        | "en_gestion"
        | "pendiente_cliente"
        | "pendiente_comercializadora"
        | "resuelta"
        | "cerrada"
      estado_renovacion:
        | "detectada"
        | "contactado"
        | "oferta_enviada"
        | "negociacion"
        | "renovado"
        | "perdido"
      fv_error_category:
        | "auth"
        | "rate_limit"
        | "payload"
        | "overflow"
        | "empty"
        | "timeout"
        | "mapping"
        | "unknown"
      motivo_perdida_enum:
        | "no_contesta"
        | "buzon_repetido"
        | "numero_erroneo"
        | "no_es_decisor"
        | "decisor_no_disponible"
        | "ya_tiene_consultor"
        | "acaba_de_renovar"
        | "satisfecho_comercializadora"
        | "no_quiere_mover"
        | "no_envia_factura"
        | "no_autoriza_datadis"
        | "precio_insuficiente"
        | "contrato_con_penalizacion"
        | "empresa_fuera_perfil"
        | "insolvente"
        | "cierre_empresa"
        | "lista_robinson"
        | "rgpd_eliminacion"
        | "sector_excluido"
        | "geografia_excluida"
        | "otro"
      prioridad_incidencia: "baja" | "media" | "alta" | "critica"
      prioridad_renovacion: "critica" | "alta" | "media" | "baja" | "ok"
      tipo_incidencia:
        | "facturacion"
        | "cambio_comercializadora"
        | "corte_suministro"
        | "potencia"
        | "acceso_red"
        | "otro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_incidencia: [
        "abierta",
        "en_gestion",
        "pendiente_cliente",
        "pendiente_comercializadora",
        "resuelta",
        "cerrada",
      ],
      estado_renovacion: [
        "detectada",
        "contactado",
        "oferta_enviada",
        "negociacion",
        "renovado",
        "perdido",
      ],
      fv_error_category: [
        "auth",
        "rate_limit",
        "payload",
        "overflow",
        "empty",
        "timeout",
        "mapping",
        "unknown",
      ],
      motivo_perdida_enum: [
        "no_contesta",
        "buzon_repetido",
        "numero_erroneo",
        "no_es_decisor",
        "decisor_no_disponible",
        "ya_tiene_consultor",
        "acaba_de_renovar",
        "satisfecho_comercializadora",
        "no_quiere_mover",
        "no_envia_factura",
        "no_autoriza_datadis",
        "precio_insuficiente",
        "contrato_con_penalizacion",
        "empresa_fuera_perfil",
        "insolvente",
        "cierre_empresa",
        "lista_robinson",
        "rgpd_eliminacion",
        "sector_excluido",
        "geografia_excluida",
        "otro",
      ],
      prioridad_incidencia: ["baja", "media", "alta", "critica"],
      prioridad_renovacion: ["critica", "alta", "media", "baja", "ok"],
      tipo_incidencia: [
        "facturacion",
        "cambio_comercializadora",
        "corte_suministro",
        "potencia",
        "acceso_red",
        "otro",
      ],
    },
  },
} as const
