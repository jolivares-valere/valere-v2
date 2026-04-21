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
      boe_regulated_prices: {
        Row: {
          created_at: string | null
          id: string
          period: string
          price: number | null
          tariff: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          period: string
          price?: number | null
          tariff: string
        }
        Update: {
          created_at?: string | null
          id?: string
          period?: string
          price?: number | null
          tariff?: string
        }
        Relationships: []
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
      cups: {
        Row: {
          codigo_cups: string
          comercializadora_actual: string | null
          contrato_id: string | null
          coste_instalacion_fv_eur: number | null
          created_at: string
          deleted_at: string | null
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
          marca_inversor: string | null
          modelo_autoconsumo: string | null
          modelo_autoconsumo_manual: string | null
          potencia_fv_kwp: number | null
          potencia_inversor_kw: number | null
          potencias_contratadas: Json | null
          tarifa_acceso: string | null
          tarifa_manual: string | null
        }
        Insert: {
          codigo_cups: string
          comercializadora_actual?: string | null
          contrato_id?: string | null
          coste_instalacion_fv_eur?: number | null
          created_at?: string
          deleted_at?: string | null
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
          marca_inversor?: string | null
          modelo_autoconsumo?: string | null
          modelo_autoconsumo_manual?: string | null
          potencia_fv_kwp?: number | null
          potencia_inversor_kw?: number | null
          potencias_contratadas?: Json | null
          tarifa_acceso?: string | null
          tarifa_manual?: string | null
        }
        Update: {
          codigo_cups?: string
          comercializadora_actual?: string | null
          contrato_id?: string | null
          coste_instalacion_fv_eur?: number | null
          created_at?: string
          deleted_at?: string | null
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
          marca_inversor?: string | null
          modelo_autoconsumo?: string | null
          modelo_autoconsumo_manual?: string | null
          potencia_fv_kwp?: number | null
          potencia_inversor_kw?: number | null
          potencias_contratadas?: Json | null
          tarifa_acceso?: string | null
          tarifa_manual?: string | null
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
            foreignKeyName: "cups_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
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
      documentos: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          descripcion: string | null
          entidad_id: string | null
          entidad_tipo: string | null
          id: string
          mime_type: string | null
          nombre: string
          ruta_storage: string
          subido_por: string | null
          tamano_bytes: number | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          entidad_id?: string | null
          entidad_tipo?: string | null
          id?: string
          mime_type?: string | null
          nombre: string
          ruta_storage: string
          subido_por?: string | null
          tamano_bytes?: number | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          entidad_id?: string | null
          entidad_tipo?: string | null
          id?: string
          mime_type?: string | null
          nombre?: string
          ruta_storage?: string
          subido_por?: string | null
          tamano_bytes?: number | null
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      empresas: {
        Row: {
          ciudad: string | null
          comercial_id: string | null
          cp: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          direccion: string | null
          email_principal: string | null
          external_id: string | null
          id: string
          nif: string | null
          nombre: string
          notas: string | null
          pais: string | null
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
          ciudad?: string | null
          comercial_id?: string | null
          cp?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          direccion?: string | null
          email_principal?: string | null
          external_id?: string | null
          id?: string
          nif?: string | null
          nombre: string
          notas?: string | null
          pais?: string | null
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
          ciudad?: string | null
          comercial_id?: string | null
          cp?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          direccion?: string | null
          email_principal?: string | null
          external_id?: string | null
          id?: string
          nif?: string | null
          nombre?: string
          notas?: string | null
          pais?: string | null
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
        Relationships: []
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
        ]
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
      incidencias: {
        Row: {
          asignado_a: string | null
          contrato_id: string | null
          created_at: string
          created_by: string | null
          cups: string | null
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
            foreignKeyName: "incidencias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
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
      oportunidades: {
        Row: {
          ahorro_anual_estimado: number | null
          comercial_id: string | null
          contacto_id: string | null
          contrato_origen_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          empresa_id: string
          etapa: string
          external_id: string | null
          fecha_cierre_prevista: string | null
          id: string
          motivo_perdida: string | null
          nombre: string
          notas: string | null
          probabilidad_pct: number
          tags: string[] | null
          tipo: string
          updated_at: string
          valor_estimado_eur: number | null
        }
        Insert: {
          ahorro_anual_estimado?: number | null
          comercial_id?: string | null
          contacto_id?: string | null
          contrato_origen_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          empresa_id: string
          etapa?: string
          external_id?: string | null
          fecha_cierre_prevista?: string | null
          id?: string
          motivo_perdida?: string | null
          nombre: string
          notas?: string | null
          probabilidad_pct?: number
          tags?: string[] | null
          tipo: string
          updated_at?: string
          valor_estimado_eur?: number | null
        }
        Update: {
          ahorro_anual_estimado?: number | null
          comercial_id?: string | null
          contacto_id?: string | null
          contrato_origen_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          empresa_id?: string
          etapa?: string
          external_id?: string | null
          fecha_cierre_prevista?: string | null
          id?: string
          motivo_perdida?: string | null
          nombre?: string
          notas?: string | null
          probabilidad_pct?: number
          tags?: string[] | null
          tipo?: string
          updated_at?: string
          valor_estimado_eur?: number | null
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
        ]
      }
      proposals: {
        Row: {
          best_offer_annual_cost_eur: number | null
          best_offer_retailer: string | null
          best_offer_savings_eur: number | null
          best_offer_savings_pct: number | null
          comparison_results: Json | null
          created_at: string | null
          cups_id: string | null
          current_annual_cost_eur: number | null
          id: string
          included_offers: Json | null
          pdf_url: string | null
          status: string | null
          supply_point_id: string | null
        }
        Insert: {
          best_offer_annual_cost_eur?: number | null
          best_offer_retailer?: string | null
          best_offer_savings_eur?: number | null
          best_offer_savings_pct?: number | null
          comparison_results?: Json | null
          created_at?: string | null
          cups_id?: string | null
          current_annual_cost_eur?: number | null
          id?: string
          included_offers?: Json | null
          pdf_url?: string | null
          status?: string | null
          supply_point_id?: string | null
        }
        Update: {
          best_offer_annual_cost_eur?: number | null
          best_offer_retailer?: string | null
          best_offer_savings_eur?: number | null
          best_offer_savings_pct?: number | null
          comparison_results?: Json | null
          created_at?: string | null
          cups_id?: string | null
          current_annual_cost_eur?: number | null
          id?: string
          included_offers?: Json | null
          pdf_url?: string | null
          status?: string | null
          supply_point_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_cups_id_fkey"
            columns: ["cups_id"]
            isOneToOne: false
            referencedRelation: "cups"
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
            foreignKeyName: "propuestas_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
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
          id: string
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
          id?: string
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
          id?: string
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
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      retailers: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          model: string | null
          name: string
          notes: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          model?: string | null
          name: string
          notes?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          model?: string | null
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          approved: boolean | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          approved?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          approved?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
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
