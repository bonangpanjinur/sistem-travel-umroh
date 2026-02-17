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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          device_info: Json | null
          failure_reason: string | null
          id: string
          ip_address: unknown
          location_info: Json | null
          status: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          device_info?: Json | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          location_info?: Json | null
          status?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          device_info?: Json | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          location_info?: Json | null
          status?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      agent_commissions: {
        Row: {
          agent_id: string
          booking_id: string
          commission_amount: number
          created_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          status: string | null
        }
        Insert: {
          agent_id: string
          booking_id: string
          commission_amount: number
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          status?: string | null
        }
        Update: {
          agent_id?: string
          booking_id?: string
          commission_amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_commissions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_wallet_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          status: string | null
          transaction_type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string | null
          transaction_type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string | null
          transaction_type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "agent_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_wallets: {
        Row: {
          agent_id: string
          balance: number | null
          id: string
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          balance?: number | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          balance?: number | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_wallets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          agent_code: string
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          branch_id: string | null
          commission_rate: number | null
          company_name: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          npwp: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_code: string
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          branch_id?: string | null
          commission_rate?: number | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          npwp?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_code?: string
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          branch_id?: string | null
          commission_rate?: number | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          npwp?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      airlines: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      airports: {
        Row: {
          city: string
          code: string
          country: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          city: string
          code: string
          country: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          city?: string
          code?: string
          country?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          checkpoint: string
          customer_id: string
          departure_id: string
          id: string
          notes: string | null
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checkpoint: string
          customer_id: string
          departure_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checkpoint?: string
          customer_id?: string
          departure_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "v_financial_summary"
            referencedColumns: ["departure_id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          attendance_date: string
          check_in_location: Json | null
          check_in_photo_url: string | null
          check_in_time: string | null
          check_out_location: Json | null
          check_out_photo_url: string | null
          check_out_time: string | null
          created_at: string | null
          employee_id: string
          id: string
          notes: string | null
          status: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          attendance_date?: string
          check_in_location?: Json | null
          check_in_photo_url?: string | null
          check_in_time?: string | null
          check_out_location?: Json | null
          check_out_photo_url?: string | null
          check_out_time?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          attendance_date?: string
          check_in_location?: Json | null
          check_in_photo_url?: string | null
          check_in_time?: string | null
          check_out_location?: Json | null
          check_out_photo_url?: string | null
          check_out_time?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          action_type: string | null
          branch_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_name: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          severity: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          action_type?: string | null
          branch_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_name?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          severity?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          action_type?: string | null
          branch_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_name?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          severity?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          branch_name: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          branch_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          branch_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      booking_passengers: {
        Row: {
          booking_id: string
          created_at: string | null
          customer_id: string
          id: string
          is_main_passenger: boolean | null
          passenger_type: string | null
          room_number: string | null
          room_preference: Database["public"]["Enums"]["room_type"] | null
          roommate_id: string | null
          special_requests: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          customer_id: string
          id?: string
          is_main_passenger?: boolean | null
          passenger_type?: string | null
          room_number?: string | null
          room_preference?: Database["public"]["Enums"]["room_type"] | null
          roommate_id?: string | null
          special_requests?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          is_main_passenger?: boolean | null
          passenger_type?: string | null
          room_number?: string | null
          room_preference?: Database["public"]["Enums"]["room_type"] | null
          roommate_id?: string | null
          special_requests?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_passengers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_passengers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_passengers_roommate_id_fkey"
            columns: ["roommate_id"]
            isOneToOne: false
            referencedRelation: "booking_passengers"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          addons_price: number | null
          adult_count: number | null
          agent_id: string | null
          base_price: number
          booking_code: string
          booking_status: Database["public"]["Enums"]["booking_status"] | null
          branch_id: string | null
          child_count: number | null
          created_at: string | null
          currency: string | null
          customer_id: string
          departure_id: string
          discount_amount: number | null
          id: string
          infant_count: number | null
          notes: string | null
          paid_amount: number | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          remaining_amount: number | null
          room_type: Database["public"]["Enums"]["room_type"]
          sales_id: string | null
          total_pax: number | null
          total_price: number
          updated_at: string | null
        }
        Insert: {
          addons_price?: number | null
          adult_count?: number | null
          agent_id?: string | null
          base_price: number
          booking_code: string
          booking_status?: Database["public"]["Enums"]["booking_status"] | null
          branch_id?: string | null
          child_count?: number | null
          created_at?: string | null
          currency?: string | null
          customer_id: string
          departure_id: string
          discount_amount?: number | null
          id?: string
          infant_count?: number | null
          notes?: string | null
          paid_amount?: number | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          remaining_amount?: number | null
          room_type?: Database["public"]["Enums"]["room_type"]
          sales_id?: string | null
          total_pax?: number | null
          total_price: number
          updated_at?: string | null
        }
        Update: {
          addons_price?: number | null
          adult_count?: number | null
          agent_id?: string | null
          base_price?: number
          booking_code?: string
          booking_status?: Database["public"]["Enums"]["booking_status"] | null
          branch_id?: string | null
          child_count?: number | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string
          departure_id?: string
          discount_amount?: number | null
          id?: string
          infant_count?: number | null
          notes?: string | null
          paid_amount?: number | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          remaining_amount?: number | null
          room_type?: Database["public"]["Enums"]["room_type"]
          sales_id?: string | null
          total_pax?: number | null
          total_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "v_financial_summary"
            referencedColumns: ["departure_id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          code: string
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          province: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          province?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          province?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bus_assignments: {
        Row: {
          arrival_point: string | null
          bus_number: string
          bus_provider_id: string | null
          capacity: number | null
          created_at: string | null
          departure_id: string
          departure_point: string | null
          departure_time: string | null
          driver_name: string | null
          driver_phone: string | null
          id: string
          notes: string | null
          route_type: string | null
        }
        Insert: {
          arrival_point?: string | null
          bus_number: string
          bus_provider_id?: string | null
          capacity?: number | null
          created_at?: string | null
          departure_id: string
          departure_point?: string | null
          departure_time?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          notes?: string | null
          route_type?: string | null
        }
        Update: {
          arrival_point?: string | null
          bus_number?: string
          bus_provider_id?: string | null
          capacity?: number | null
          created_at?: string | null
          departure_id?: string
          departure_point?: string | null
          departure_time?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          notes?: string | null
          route_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bus_assignments_bus_provider_id_fkey"
            columns: ["bus_provider_id"]
            isOneToOne: false
            referencedRelation: "bus_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_assignments_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_assignments_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "v_financial_summary"
            referencedColumns: ["departure_id"]
          },
        ]
      }
      bus_passengers: {
        Row: {
          bus_assignment_id: string
          created_at: string | null
          customer_id: string
          id: string
          seat_number: string | null
        }
        Insert: {
          bus_assignment_id: string
          created_at?: string | null
          customer_id: string
          id?: string
          seat_number?: string | null
        }
        Update: {
          bus_assignment_id?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          seat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bus_passengers_bus_assignment_id_fkey"
            columns: ["bus_assignment_id"]
            isOneToOne: false
            referencedRelation: "bus_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_passengers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_providers: {
        Row: {
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
        }
        Insert: {
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
        }
        Update: {
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_type: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_type?: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_type?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          discount_type: string | null
          discount_value: number
          id: string
          is_active: boolean | null
          max_discount: number | null
          min_purchase: number | null
          name: string
          usage_limit: number | null
          used_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_purchase?: number | null
          name: string
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_purchase?: number | null
          name?: string
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      customer_documents: {
        Row: {
          created_at: string | null
          customer_id: string
          document_type_id: string
          file_name: string | null
          file_url: string
          id: string
          notes: string | null
          ocr_confidence: number | null
          ocr_data: Json | null
          ocr_processed_at: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          document_type_id: string
          file_name?: string | null
          file_url: string
          id?: string
          notes?: string | null
          ocr_confidence?: number | null
          ocr_data?: Json | null
          ocr_processed_at?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          document_type_id?: string
          file_name?: string | null
          file_url?: string
          id?: string
          notes?: string | null
          ocr_confidence?: number | null
          ocr_data?: Json | null
          ocr_processed_at?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_documents_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          birth_date: string | null
          birth_place: string | null
          blood_type: string | null
          branch_id: string | null
          city: string | null
          created_at: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          father_name: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          is_tour_leader: boolean | null
          mahram_name: string | null
          mahram_relation: string | null
          marital_status: string | null
          mother_name: string | null
          nik: string | null
          passport_expiry: string | null
          passport_number: string | null
          phone: string | null
          photo_url: string | null
          postal_code: string | null
          province: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          blood_type?: string | null
          branch_id?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          father_name?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_tour_leader?: boolean | null
          mahram_name?: string | null
          mahram_relation?: string | null
          marital_status?: string | null
          mother_name?: string | null
          nik?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          photo_url?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          blood_type?: string | null
          branch_id?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          father_name?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_tour_leader?: boolean | null
          mahram_name?: string | null
          mahram_relation?: string | null
          marital_status?: string | null
          mother_name?: string | null
          nik?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          photo_url?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      departures: {
        Row: {
          airline_id: string | null
          arrival_airport_id: string | null
          booked_count: number | null
          created_at: string | null
          departure_airport_id: string | null
          departure_date: string
          departure_time: string | null
          flight_number: string | null
          hotel_madinah_id: string | null
          hotel_makkah_id: string | null
          id: string
          muthawif_id: string | null
          package_id: string | null
          price_double: number | null
          price_quad: number | null
          price_single: number | null
          price_triple: number | null
          quota: number
          return_date: string
          status: string | null
          team_leader_id: string | null
          updated_at: string | null
        }
        Insert: {
          airline_id?: string | null
          arrival_airport_id?: string | null
          booked_count?: number | null
          created_at?: string | null
          departure_airport_id?: string | null
          departure_date: string
          departure_time?: string | null
          flight_number?: string | null
          hotel_madinah_id?: string | null
          hotel_makkah_id?: string | null
          id?: string
          muthawif_id?: string | null
          package_id?: string | null
          price_double?: number | null
          price_quad?: number | null
          price_single?: number | null
          price_triple?: number | null
          quota?: number
          return_date: string
          status?: string | null
          team_leader_id?: string | null
          updated_at?: string | null
        }
        Update: {
          airline_id?: string | null
          arrival_airport_id?: string | null
          booked_count?: number | null
          created_at?: string | null
          departure_airport_id?: string | null
          departure_date?: string
          departure_time?: string | null
          flight_number?: string | null
          hotel_madinah_id?: string | null
          hotel_makkah_id?: string | null
          id?: string
          muthawif_id?: string | null
          package_id?: string | null
          price_double?: number | null
          price_quad?: number | null
          price_single?: number | null
          price_triple?: number | null
          quota?: number
          return_date?: string
          status?: string | null
          team_leader_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departures_airline_id_fkey"
            columns: ["airline_id"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departures_arrival_airport_id_fkey"
            columns: ["arrival_airport_id"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departures_departure_airport_id_fkey"
            columns: ["departure_airport_id"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departures_hotel_madinah_id_fkey"
            columns: ["hotel_madinah_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departures_hotel_makkah_id_fkey"
            columns: ["hotel_makkah_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departures_muthawif_id_fkey"
            columns: ["muthawif_id"]
            isOneToOne: false
            referencedRelation: "muthawifs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departures_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departures_team_leader_id_fkey"
            columns: ["team_leader_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      document_counters: {
        Row: {
          created_at: string
          document_type: string
          id: string
          last_number: number
          month: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          document_type: string
          id?: string
          last_number?: number
          month: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          document_type?: string
          id?: string
          last_number?: number
          month?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      document_types: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_required: boolean | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          name?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          body_html: string | null
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          recipient_name: string | null
          reference_id: string | null
          reference_type: string | null
          sent_at: string | null
          status: string | null
          subject: string
          template_type: string | null
        }
        Insert: {
          body_html?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          recipient_name?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          template_type?: string | null
        }
        Update: {
          body_html?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          recipient_name?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_type?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          address: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          birth_date: string | null
          branch_id: string | null
          city: string | null
          created_at: string | null
          department: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_code: string
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          hire_date: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          phone: string | null
          photo_url: string | null
          position: string | null
          province: string | null
          salary: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          birth_date?: string | null
          branch_id?: string | null
          city?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_code: string
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          province?: string | null
          salary?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          birth_date?: string | null
          branch_id?: string | null
          city?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_code?: string
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          province?: string | null
          salary?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_distributions: {
        Row: {
          customer_id: string
          departure_id: string | null
          distributed_at: string | null
          distributed_by: string | null
          equipment_id: string
          id: string
          notes: string | null
          quantity: number | null
          returned_at: string | null
          status: string | null
        }
        Insert: {
          customer_id: string
          departure_id?: string | null
          distributed_at?: string | null
          distributed_by?: string | null
          equipment_id: string
          id?: string
          notes?: string | null
          quantity?: number | null
          returned_at?: string | null
          status?: string | null
        }
        Update: {
          customer_id?: string
          departure_id?: string | null
          distributed_at?: string | null
          distributed_by?: string | null
          equipment_id?: string
          id?: string
          notes?: string | null
          quantity?: number | null
          returned_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_distributions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_distributions_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_distributions_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "v_financial_summary"
            referencedColumns: ["departure_id"]
          },
          {
            foreignKeyName: "equipment_distributions_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_items"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          stock_quantity: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          stock_quantity?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          stock_quantity?: number | null
        }
        Relationships: []
      }
      haji_registrations: {
        Row: {
          created_at: string | null
          customer_id: string
          estimated_departure_year: number | null
          haji_type: string
          health_status: string | null
          id: string
          manasik_completed: boolean | null
          notes: string | null
          passport_status: string | null
          portion_number: string | null
          registration_number: string | null
          registration_year: number | null
          status: string | null
          updated_at: string | null
          visa_status: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          estimated_departure_year?: number | null
          haji_type?: string
          health_status?: string | null
          id?: string
          manasik_completed?: boolean | null
          notes?: string | null
          passport_status?: string | null
          portion_number?: string | null
          registration_number?: string | null
          registration_year?: number | null
          status?: string | null
          updated_at?: string | null
          visa_status?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          estimated_departure_year?: number | null
          haji_type?: string
          health_status?: string | null
          id?: string
          manasik_completed?: boolean | null
          notes?: string | null
          passport_status?: string | null
          portion_number?: string | null
          registration_number?: string | null
          registration_year?: number | null
          status?: string | null
          updated_at?: string | null
          visa_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "haji_registrations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      haji_waiting_progress: {
        Row: {
          created_at: string | null
          estimated_position: number | null
          id: string
          notes: string | null
          progress_date: string
          registration_id: string
        }
        Insert: {
          created_at?: string | null
          estimated_position?: number | null
          id?: string
          notes?: string | null
          progress_date?: string
          registration_id: string
        }
        Update: {
          created_at?: string | null
          estimated_position?: number | null
          id?: string
          notes?: string | null
          progress_date?: string
          registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "haji_waiting_progress_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "haji_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          address: string | null
          city: string
          created_at: string | null
          distance_to_masjid: string | null
          facilities: string[] | null
          id: string
          images: string[] | null
          is_active: boolean | null
          name: string
          star_rating: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city: string
          created_at?: string | null
          distance_to_masjid?: string | null
          facilities?: string[] | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          name: string
          star_rating?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string | null
          distance_to_masjid?: string | null
          facilities?: string[] | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          name?: string
          star_rating?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      jamaah_live_locations: {
        Row: {
          accuracy: number | null
          created_at: string
          customer_id: string
          departure_id: string | null
          heading: number | null
          id: string
          is_sharing: boolean | null
          latitude: number
          longitude: number
          speed: number | null
          updated_at: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          customer_id: string
          departure_id?: string | null
          heading?: number | null
          id?: string
          is_sharing?: boolean | null
          latitude: number
          longitude: number
          speed?: number | null
          updated_at?: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          customer_id?: string
          departure_id?: string | null
          heading?: number | null
          id?: string
          is_sharing?: boolean | null
          latitude?: number
          longitude?: number
          speed?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jamaah_live_locations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jamaah_live_locations_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jamaah_live_locations_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "v_financial_summary"
            referencedColumns: ["departure_id"]
          },
        ]
      }
      jamaah_qr_codes: {
        Row: {
          created_at: string | null
          customer_id: string
          departure_id: string
          id: string
          is_active: boolean | null
          qr_code_data: string
          qr_image_url: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          departure_id: string
          id?: string
          is_active?: boolean | null
          qr_code_data: string
          qr_image_url?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          departure_id?: string
          id?: string
          is_active?: boolean | null
          qr_code_data?: string
          qr_image_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jamaah_qr_codes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jamaah_qr_codes_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jamaah_qr_codes_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "v_financial_summary"
            referencedColumns: ["departure_id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          branch_id: string | null
          converted_at: string | null
          converted_booking_id: string | null
          created_at: string | null
          email: string | null
          follow_up_date: string | null
          full_name: string
          id: string
          notes: string | null
          package_interest: string | null
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          branch_id?: string | null
          converted_at?: string | null
          converted_booking_id?: string | null
          created_at?: string | null
          email?: string | null
          follow_up_date?: string | null
          full_name: string
          id?: string
          notes?: string | null
          package_interest?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          branch_id?: string | null
          converted_at?: string | null
          converted_booking_id?: string | null
          created_at?: string | null
          email?: string | null
          follow_up_date?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          package_interest?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_booking_id_fkey"
            columns: ["converted_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_package_interest_fkey"
            columns: ["package_interest"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          rejection_reason: string | null
          start_date: string
          status: string | null
          total_days: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id: string
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          rejection_reason?: string | null
          start_date: string
          status?: string | null
          total_days?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          rejection_reason?: string | null
          start_date?: string
          status?: string | null
          total_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string | null
          email: string
          failure_reason: string | null
          id: string
          ip_address: unknown
          is_successful: boolean | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          is_successful?: boolean | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          is_successful?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          current_points: number | null
          customer_id: string
          id: string
          tier_level: string | null
          total_earned: number | null
          total_redeemed: number | null
          updated_at: string | null
        }
        Insert: {
          current_points?: number | null
          customer_id: string
          id?: string
          tier_level?: string | null
          total_earned?: number | null
          total_redeemed?: number | null
          updated_at?: string | null
        }
        Update: {
          current_points?: number | null
          customer_id?: string
          id?: string
          tier_level?: string | null
          total_earned?: number | null
          total_redeemed?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          points_required: number
          stock_quantity: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          points_required: number
          stock_quantity?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          points_required?: number
          stock_quantity?: number | null
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string | null
          customer_id: string
          description: string | null
          id: string
          points_amount: number
          reference_id: string | null
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          description?: string | null
          id?: string
          points_amount: number
          reference_id?: string | null
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          points_amount?: number
          reference_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      luggage: {
        Row: {
          created_at: string | null
          customer_id: string
          departure_id: string
          id: string
          status: string | null
          tag_code: string
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          departure_id: string
          id?: string
          status?: string | null
          tag_code: string
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          departure_id?: string
          id?: string
          status?: string | null
          tag_code?: string
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "luggage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "luggage_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "luggage_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "v_financial_summary"
            referencedColumns: ["departure_id"]
          },
        ]
      }
      manasik_attendance: {
        Row: {
          attended: boolean | null
          attended_at: string | null
          created_at: string | null
          customer_id: string
          id: string
          notes: string | null
          schedule_id: string
        }
        Insert: {
          attended?: boolean | null
          attended_at?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          schedule_id: string
        }
        Update: {
          attended?: boolean | null
          attended_at?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manasik_attendance_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manasik_attendance_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "manasik_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      manasik_schedules: {
        Row: {
          created_at: string | null
          departure_id: string | null
          description: string | null
          end_time: string | null
          id: string
          instructor: string | null
          is_mandatory: boolean | null
          location: string | null
          max_participants: number | null
          schedule_date: string
          start_time: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          departure_id?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          instructor?: string | null
          is_mandatory?: boolean | null
          location?: string | null
          max_participants?: number | null
          schedule_date: string
          start_time?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          departure_id?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          instructor?: string | null
          is_mandatory?: boolean | null
          location?: string | null
          max_participants?: number | null
          schedule_date?: string
          start_time?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "manasik_schedules_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manasik_schedules_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "v_financial_summary"
            referencedColumns: ["departure_id"]
          },
        ]
      }
      manifests: {
        Row: {
          departure_id: string
          file_url: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          version: number | null
        }
        Insert: {
          departure_id: string
          file_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          version?: number | null
        }
        Update: {
          departure_id?: string
          file_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "manifests_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifests_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "v_financial_summary"
            referencedColumns: ["departure_id"]
          },
        ]
      }
      muthawifs: {
        Row: {
          created_at: string | null
          email: string | null
          experience_years: number | null
          id: string
          is_active: boolean | null
          languages: string[] | null
          name: string
          phone: string | null
          photo_url: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          experience_years?: number | null
          id?: string
          is_active?: boolean | null
          languages?: string[] | null
          name: string
          phone?: string | null
          photo_url?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          experience_years?: number | null
          id?: string
          is_active?: boolean | null
          languages?: string[] | null
          name?: string
          phone?: string | null
          photo_url?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      offline_content: {
        Row: {
          arabic_text: string | null
          audio_url: string | null
          category: string
          content: string | null
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          latin_text: string | null
          sort_order: number | null
          title: string
          translation: string | null
          updated_at: string | null
        }
        Insert: {
          arabic_text?: string | null
          audio_url?: string | null
          category: string
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          latin_text?: string | null
          sort_order?: number | null
          title: string
          translation?: string | null
          updated_at?: string | null
        }
        Update: {
          arabic_text?: string | null
          audio_url?: string | null
          category?: string
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          latin_text?: string | null
          sort_order?: number | null
          title?: string
          translation?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          attempts: number | null
          code: string
          created_at: string | null
          expires_at: string
          id: string
          is_used: boolean | null
          max_attempts: number | null
          purpose: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          is_used?: boolean | null
          max_attempts?: number | null
          purpose: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          is_used?: boolean | null
          max_attempts?: number | null
          purpose?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          airline_id: string | null
          branch_id: string | null
          code: string
          created_at: string | null
          currency: string | null
          description: string | null
          duration_days: number
          excludes: string[] | null
          featured_image: string | null
          gallery: string[] | null
          hotel_madinah_id: string | null
          hotel_makkah_id: string | null
          id: string
          includes: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          itinerary: Json | null
          muthawif_id: string | null
          name: string
          package_type: Database["public"]["Enums"]["package_type"]
          price_double: number
          price_quad: number
          price_single: number
          price_triple: number
          updated_at: string | null
        }
        Insert: {
          airline_id?: string | null
          branch_id?: string | null
          code: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration_days?: number
          excludes?: string[] | null
          featured_image?: string | null
          gallery?: string[] | null
          hotel_madinah_id?: string | null
          hotel_makkah_id?: string | null
          id?: string
          includes?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          itinerary?: Json | null
          muthawif_id?: string | null
          name: string
          package_type?: Database["public"]["Enums"]["package_type"]
          price_double?: number
          price_quad?: number
          price_single?: number
          price_triple?: number
          updated_at?: string | null
        }
        Update: {
          airline_id?: string | null
          branch_id?: string | null
          code?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration_days?: number
          excludes?: string[] | null
          featured_image?: string | null
          gallery?: string[] | null
          hotel_madinah_id?: string | null
          hotel_makkah_id?: string | null
          id?: string
          includes?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          itinerary?: Json | null
          muthawif_id?: string | null
          name?: string
          package_type?: Database["public"]["Enums"]["package_type"]
          price_double?: number
          price_quad?: number
          price_single?: number
          price_triple?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_airline_id_fkey"
            columns: ["airline_id"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_hotel_madinah_id_fkey"
            columns: ["hotel_madinah_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_hotel_makkah_id_fkey"
            columns: ["hotel_makkah_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_muthawif_id_fkey"
            columns: ["muthawif_id"]
            isOneToOne: false
            referencedRelation: "muthawifs"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminders: {
        Row: {
          booking_id: string
          created_at: string | null
          error_message: string | null
          id: string
          message_content: string | null
          reminder_type: string
          retry_count: number | null
          scheduled_at: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_content?: string | null
          reminder_type: string
          retry_count?: number | null
          scheduled_at: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_content?: string | null
          reminder_type?: string
          retry_count?: number | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          account_name: string | null
          account_number: string | null
          amount: number
          bank_name: string | null
          booking_id: string
          created_at: string | null
          id: string
          notes: string | null
          payment_code: string
          payment_method: string | null
          proof_url: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          amount: number
          bank_name?: string | null
          booking_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_code: string
          payment_method?: string | null
          proof_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          amount?: number
          bank_name?: string | null
          booking_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_code?: string
          payment_method?: string | null
          proof_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          province: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          province?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          province?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      qr_scans: {
        Row: {
          id: string
          location: string | null
          notes: string | null
          qr_code_id: string
          scan_type: string
          scanned_at: string | null
          scanned_by: string | null
        }
        Insert: {
          id?: string
          location?: string | null
          notes?: string | null
          qr_code_id: string
          scan_type: string
          scanned_at?: string | null
          scanned_by?: string | null
        }
        Update: {
          id?: string
          location?: string | null
          notes?: string | null
          qr_code_id?: string
          scan_type?: string
          scanned_at?: string | null
          scanned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_scans_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "jamaah_qr_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          commission_rate: number | null
          created_at: string | null
          customer_id: string
          id: string
          is_active: boolean | null
          total_commission: number | null
          total_referrals: number | null
        }
        Insert: {
          code: string
          commission_rate?: number | null
          created_at?: string | null
          customer_id: string
          id?: string
          is_active?: boolean | null
          total_commission?: number | null
          total_referrals?: number | null
        }
        Update: {
          code?: string
          commission_rate?: number | null
          created_at?: string | null
          customer_id?: string
          id?: string
          is_active?: boolean | null
          total_commission?: number | null
          total_referrals?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_usages: {
        Row: {
          booking_amount: number
          booking_id: string
          commission_amount: number
          commission_status: string | null
          created_at: string | null
          id: string
          paid_at: string | null
          referral_code_id: string
          referred_customer_id: string
        }
        Insert: {
          booking_amount: number
          booking_id: string
          commission_amount: number
          commission_status?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          referral_code_id: string
          referred_customer_id: string
        }
        Update: {
          booking_amount?: number
          booking_id?: string
          commission_amount?: number
          commission_status?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          referral_code_id?: string
          referred_customer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_usages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_usages_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_usages_referred_customer_id_fkey"
            columns: ["referred_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          bonus_amount: number | null
          bonus_type: string | null
          booking_id: string | null
          confirmed_at: string | null
          created_at: string | null
          id: string
          referred_customer_id: string
          referrer_code_id: string
          status: string | null
        }
        Insert: {
          bonus_amount?: number | null
          bonus_type?: string | null
          booking_id?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          referred_customer_id: string
          referrer_code_id: string
          status?: string | null
        }
        Update: {
          bonus_amount?: number | null
          bonus_type?: string | null
          booking_id?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          referred_customer_id?: string
          referrer_code_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_customer_id_fkey"
            columns: ["referred_customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_code_id_fkey"
            columns: ["referrer_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      room_assignments: {
        Row: {
          capacity: number | null
          created_at: string | null
          departure_id: string
          floor: string | null
          hotel_id: string
          id: string
          notes: string | null
          room_number: string
          room_type: string
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          departure_id: string
          floor?: string | null
          hotel_id: string
          id?: string
          notes?: string | null
          room_number: string
          room_type: string
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          departure_id?: string
          floor?: string | null
          hotel_id?: string
          id?: string
          notes?: string | null
          room_number?: string
          room_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_assignments_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_assignments_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "v_financial_summary"
            referencedColumns: ["departure_id"]
          },
          {
            foreignKeyName: "room_assignments_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      room_occupants: {
        Row: {
          bed_number: number | null
          check_in_at: string | null
          check_out_at: string | null
          created_at: string | null
          customer_id: string
          id: string
          room_assignment_id: string
        }
        Insert: {
          bed_number?: number | null
          check_in_at?: string | null
          check_out_at?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          room_assignment_id: string
        }
        Update: {
          bed_number?: number | null
          check_in_at?: string | null
          check_out_at?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          room_assignment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_occupants_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_occupants_room_assignment_id_fkey"
            columns: ["room_assignment_id"]
            isOneToOne: false
            referencedRelation: "room_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_payments: {
        Row: {
          account_name: string | null
          amount: number
          bank_name: string | null
          created_at: string | null
          id: string
          notes: string | null
          payment_code: string
          payment_date: string
          payment_method: string | null
          proof_url: string | null
          savings_plan_id: string
          status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          account_name?: string | null
          amount: number
          bank_name?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_code: string
          payment_date?: string
          payment_method?: string | null
          proof_url?: string | null
          savings_plan_id: string
          status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          account_name?: string | null
          amount?: number
          bank_name?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_code?: string
          payment_date?: string
          payment_method?: string | null
          proof_url?: string | null
          savings_plan_id?: string
          status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "savings_payments_savings_plan_id_fkey"
            columns: ["savings_plan_id"]
            isOneToOne: false
            referencedRelation: "savings_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_plans: {
        Row: {
          converted_booking_id: string | null
          created_at: string | null
          customer_id: string
          id: string
          monthly_amount: number
          notes: string | null
          package_id: string
          paid_amount: number | null
          remaining_amount: number | null
          start_date: string
          status: string | null
          target_amount: number
          target_date: string
          tenor_months: number
          updated_at: string | null
        }
        Insert: {
          converted_booking_id?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          monthly_amount: number
          notes?: string | null
          package_id: string
          paid_amount?: number | null
          remaining_amount?: number | null
          start_date?: string
          status?: string | null
          target_amount: number
          target_date: string
          tenor_months?: number
          updated_at?: string | null
        }
        Update: {
          converted_booking_id?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          monthly_amount?: number
          notes?: string | null
          package_id?: string
          paid_amount?: number | null
          remaining_amount?: number | null
          start_date?: string
          status?: string | null
          target_amount?: number
          target_date?: string
          tenor_months?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "savings_plans_converted_booking_id_fkey"
            columns: ["converted_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_plans_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_report_logs: {
        Row: {
          error_message: string | null
          generated_at: string
          id: string
          recipients_sent: string[] | null
          report_id: string
          status: string
        }
        Insert: {
          error_message?: string | null
          generated_at?: string
          id?: string
          recipients_sent?: string[] | null
          report_id: string
          status?: string
        }
        Update: {
          error_message?: string | null
          generated_at?: string
          id?: string
          recipients_sent?: string[] | null
          report_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_report_logs_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "scheduled_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reports: {
        Row: {
          created_at: string
          created_by: string | null
          day_of_month: number | null
          day_of_week: number | null
          filters: Json | null
          frequency: string
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          next_run_at: string | null
          recipients: string[]
          report_type: string
          time_of_day: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          filters?: Json | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          recipients?: string[]
          report_type?: string
          time_of_day?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          filters?: Json | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          recipients?: string[]
          report_type?: string
          time_of_day?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      static_pages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          attachment_url: string | null
          category: string | null
          created_at: string | null
          departure_id: string | null
          description: string
          id: string
          priority: string | null
          status: string | null
          subject: string
          ticket_code: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          attachment_url?: string | null
          category?: string | null
          created_at?: string | null
          departure_id?: string | null
          description: string
          id?: string
          priority?: string | null
          status?: string | null
          subject: string
          ticket_code?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          attachment_url?: string | null
          category?: string | null
          created_at?: string | null
          departure_id?: string | null
          description?: string
          id?: string
          priority?: string | null
          status?: string | null
          subject?: string
          ticket_code?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "v_financial_summary"
            referencedColumns: ["departure_id"]
          },
        ]
      }
      testimonials: {
        Row: {
          content: string
          created_at: string
          id: string
          is_featured: boolean
          is_published: boolean
          location: string | null
          name: string
          package_name: string | null
          photo_url: string | null
          rating: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_featured?: boolean
          is_published?: boolean
          location?: string | null
          name: string
          package_name?: string | null
          photo_url?: string | null
          rating?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_featured?: boolean
          is_published?: boolean
          location?: string | null
          name?: string
          package_name?: string | null
          photo_url?: string | null
          rating?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      theme_presets: {
        Row: {
          accent_color: string
          background_color: string
          body_font: string | null
          created_at: string | null
          description: string | null
          foreground_color: string
          heading_font: string | null
          id: string
          is_default: boolean | null
          name: string
          preview_image_url: string | null
          primary_color: string
          secondary_color: string
          slug: string
        }
        Insert: {
          accent_color: string
          background_color?: string
          body_font?: string | null
          created_at?: string | null
          description?: string | null
          foreground_color?: string
          heading_font?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          preview_image_url?: string | null
          primary_color: string
          secondary_color: string
          slug: string
        }
        Update: {
          accent_color?: string
          background_color?: string
          body_font?: string | null
          created_at?: string | null
          description?: string | null
          foreground_color?: string
          heading_font?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          preview_image_url?: string | null
          primary_color?: string
          secondary_color?: string
          slug?: string
        }
        Relationships: []
      }
      ticket_responses: {
        Row: {
          attachment_url: string | null
          created_at: string | null
          id: string
          is_internal_note: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string | null
          id?: string
          is_internal_note?: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string | null
          id?: string
          is_internal_note?: boolean | null
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_responses_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_2fa_settings: {
        Row: {
          backup_codes: string[] | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          last_verified_at: string | null
          method: string | null
          phone_number: string | null
          secret_key: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_verified_at?: string | null
          method?: string | null
          phone_number?: string | null
          secret_key?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_verified_at?: string | null
          method?: string | null
          phone_number?: string | null
          secret_key?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          branch_id: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_costs: {
        Row: {
          amount: number
          cost_type: string
          created_at: string | null
          currency: string | null
          departure_id: string
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          paid_by: string | null
          proof_url: string | null
          status: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          amount: number
          cost_type: string
          created_at?: string | null
          currency?: string | null
          departure_id: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          paid_by?: string | null
          proof_url?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          amount?: number
          cost_type?: string
          created_at?: string | null
          currency?: string | null
          departure_id?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          paid_by?: string | null
          proof_url?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_costs_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_costs_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "v_financial_summary"
            referencedColumns: ["departure_id"]
          },
          {
            foreignKeyName: "vendor_costs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string | null
          vendor_type: string
        }
        Insert: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          vendor_type: string
        }
        Update: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          vendor_type?: string
        }
        Relationships: []
      }
      website_settings: {
        Row: {
          accent_color: string | null
          active_theme: string
          background_color: string | null
          body_font: string | null
          company_name: string | null
          created_at: string | null
          favicon_url: string | null
          footer_address: string | null
          footer_bottom_text: string | null
          footer_description: string | null
          footer_email: string | null
          footer_links: Json | null
          footer_phone: string | null
          footer_whatsapp: string | null
          foreground_color: string | null
          heading_font: string | null
          hero_cta_link: string | null
          hero_cta_text: string | null
          hero_image_url: string | null
          hero_subtitle: string | null
          hero_title: string | null
          homepage_sections: Json | null
          id: string
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          nav_links: Json | null
          primary_color: string | null
          secondary_color: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_tiktok: string | null
          social_youtube: string | null
          tagline: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          active_theme?: string
          background_color?: string | null
          body_font?: string | null
          company_name?: string | null
          created_at?: string | null
          favicon_url?: string | null
          footer_address?: string | null
          footer_bottom_text?: string | null
          footer_description?: string | null
          footer_email?: string | null
          footer_links?: Json | null
          footer_phone?: string | null
          footer_whatsapp?: string | null
          foreground_color?: string | null
          heading_font?: string | null
          hero_cta_link?: string | null
          hero_cta_text?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          homepage_sections?: Json | null
          id?: string
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          nav_links?: Json | null
          primary_color?: string | null
          secondary_color?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_tiktok?: string | null
          social_youtube?: string | null
          tagline?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          active_theme?: string
          background_color?: string | null
          body_font?: string | null
          company_name?: string | null
          created_at?: string | null
          favicon_url?: string | null
          footer_address?: string | null
          footer_bottom_text?: string | null
          footer_description?: string | null
          footer_email?: string | null
          footer_links?: Json | null
          footer_phone?: string | null
          footer_whatsapp?: string | null
          foreground_color?: string | null
          heading_font?: string | null
          hero_cta_link?: string | null
          hero_cta_text?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          homepage_sections?: Json | null
          id?: string
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          nav_links?: Json | null
          primary_color?: string | null
          secondary_color?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_tiktok?: string | null
          social_youtube?: string | null
          tagline?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_config: {
        Row: {
          api_key: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          provider: string
          sender_number: string | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          sender_number?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          sender_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          message_content: string
          recipient_phone: string
          sent_at: string | null
          status: string | null
          template_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_content: string
          recipient_phone: string
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_content?: string
          recipient_phone?: string
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          message_template: string
          name: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_template: string
          name: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_template?: string
          name?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          agent_id: string
          amount: number
          bank_details: Json | null
          created_at: string | null
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          proof_url: string | null
          status: string | null
        }
        Insert: {
          agent_id: string
          amount: number
          bank_details?: Json | null
          created_at?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          proof_url?: string | null
          status?: string | null
        }
        Update: {
          agent_id?: string
          amount?: number
          bank_details?: Json | null
          created_at?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          proof_url?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_financial_summary: {
        Row: {
          booked_count: number | null
          collected_amount: number | null
          departure_date: string | null
          departure_id: string | null
          net_profit: number | null
          outstanding_amount: number | null
          package_name: string | null
          quota: number | null
          return_date: string | null
          total_revenue: number | null
          total_vendor_costs: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      agent_can_access_customer: {
        Args: { _customer_id: string; _user_id: string }
        Returns: boolean
      }
      estimate_haji_departure_year: {
        Args: {
          p_haji_type?: string
          p_portion_number: string
          p_registration_year: number
        }
        Returns: number
      }
      generate_booking_code: { Args: never; Returns: string }
      generate_employee_code: { Args: never; Returns: string }
      generate_payment_code: { Args: never; Returns: string }
      generate_savings_payment_code: { Args: never; Returns: string }
      generate_ticket_code: { Args: never; Returns: string }
      get_failed_attempts: { Args: { _email: string }; Returns: number }
      get_next_document_number: {
        Args: { p_document_type: string; p_prefix: string }
        Returns: string
      }
      get_user_branch_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_locked: { Args: { _email: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      log_activity: {
        Args: {
          _action: string
          _device_info?: Json
          _failure_reason?: string
          _status?: string
        }
        Returns: string
      }
      log_audit_action: {
        Args: {
          _action: string
          _action_type: string
          _metadata?: Json
          _new_data?: Json
          _old_data?: Json
          _record_id: string
          _severity?: string
          _table_name: string
        }
        Returns: string
      }
      user_belongs_to_branch: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "owner"
        | "branch_manager"
        | "finance"
        | "operational"
        | "sales"
        | "marketing"
        | "equipment"
        | "agent"
        | "customer"
      booking_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "completed"
        | "cancelled"
        | "refunded"
      document_status:
        | "pending"
        | "uploaded"
        | "verified"
        | "rejected"
        | "expired"
      equipment_distribution_status: "pending" | "distributed" | "returned"
      gender_type: "male" | "female"
      lead_status:
        | "new"
        | "contacted"
        | "follow_up"
        | "negotiation"
        | "closing"
        | "won"
        | "lost"
      package_type: "umroh" | "haji" | "haji_plus" | "umroh_plus" | "tabungan"
      payment_status: "pending" | "partial" | "paid" | "refunded" | "failed"
      room_type: "quad" | "triple" | "double" | "single"
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
      app_role: [
        "super_admin",
        "owner",
        "branch_manager",
        "finance",
        "operational",
        "sales",
        "marketing",
        "equipment",
        "agent",
        "customer",
      ],
      booking_status: [
        "pending",
        "confirmed",
        "processing",
        "completed",
        "cancelled",
        "refunded",
      ],
      document_status: [
        "pending",
        "uploaded",
        "verified",
        "rejected",
        "expired",
      ],
      equipment_distribution_status: ["pending", "distributed", "returned"],
      gender_type: ["male", "female"],
      lead_status: [
        "new",
        "contacted",
        "follow_up",
        "negotiation",
        "closing",
        "won",
        "lost",
      ],
      package_type: ["umroh", "haji", "haji_plus", "umroh_plus", "tabungan"],
      payment_status: ["pending", "partial", "paid", "refunded", "failed"],
      room_type: ["quad", "triple", "double", "single"],
    },
  },
} as const
