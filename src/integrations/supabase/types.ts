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
      about_page_content: {
        Row: {
          created_at: string
          id: string
          milestones: Json | null
          mission_text: string | null
          settings_id: string
          updated_at: string
          values: Json | null
          vision_text: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          milestones?: Json | null
          mission_text?: string | null
          settings_id: string
          updated_at?: string
          values?: Json | null
          vision_text?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          milestones?: Json | null
          mission_text?: string | null
          settings_id?: string
          updated_at?: string
          values?: Json | null
          vision_text?: string | null
        }
        Relationships: []
      }
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
      agent_training_progress: {
        Row: {
          agent_id: string
          completed_at: string | null
          created_at: string
          id: string
          module_id: string
          quiz_score: number | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id: string
          quiz_score?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id?: string
          quiz_score?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_training_progress_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_training_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
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
          parent_agent_id: string | null
          slug: string | null
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
          parent_agent_id?: string | null
          slug?: string | null
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
          parent_agent_id?: string | null
          slug?: string | null
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
          {
            foreignKeyName: "agents_parent_agent_id_fkey"
            columns: ["parent_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
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
          is_manual: boolean | null
          manual_reason: string | null
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
          is_manual?: boolean | null
          manual_reason?: string | null
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
          is_manual?: boolean | null
          manual_reason?: string | null
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
          new_values: Json | null
          old_data: Json | null
          old_values: Json | null
          record_id: string | null
          resource_id: string | null
          resource_type: string | null
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
          new_values?: Json | null
          old_data?: Json | null
          old_values?: Json | null
          record_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
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
          new_values?: Json | null
          old_data?: Json | null
          old_values?: Json | null
          record_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
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
      booking_status_history: {
        Row: {
          booking_id: string
          changed_by: string | null
          created_at: string
          id: string
          new_payment_status: string | null
          new_status: string
          notes: string | null
          old_payment_status: string | null
          old_status: string | null
        }
        Insert: {
          booking_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_payment_status?: string | null
          new_status: string
          notes?: string | null
          old_payment_status?: string | null
          old_status?: string | null
        }
        Update: {
          booking_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_payment_status?: string | null
          new_status?: string
          notes?: string | null
          old_payment_status?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
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
          payment_deadline: string | null
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
          booking_code?: string
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
          payment_deadline?: string | null
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
          payment_deadline?: string | null
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
          slug: string | null
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
          slug?: string | null
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
          slug?: string | null
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
      cash_transactions: {
        Row: {
          amount: number
          branch_id: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          transaction_date: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          branch_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          transaction_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
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
      contact_page_content: {
        Row: {
          created_at: string
          form_title: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          map_url: string | null
          operating_hours: Json | null
          settings_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          form_title?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          map_url?: string | null
          operating_hours?: Json | null
          settings_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          form_title?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          map_url?: string | null
          operating_hours?: Json | null
          settings_id?: string
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
      customer_mahrams: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          mahram_customer_id: string | null
          mahram_name: string
          mahram_relation: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          mahram_customer_id?: string | null
          mahram_name: string
          mahram_relation: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          mahram_customer_id?: string | null
          mahram_name?: string
          mahram_relation?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_mahrams_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_mahrams_mahram_customer_id_fkey"
            columns: ["mahram_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
          district: string | null
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
          village: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          blood_type?: string | null
          branch_id?: string | null
          city?: string | null
          created_at?: string | null
          district?: string | null
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
          village?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          blood_type?: string | null
          branch_id?: string | null
          city?: string | null
          created_at?: string | null
          district?: string | null
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
          village?: string | null
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
      departments: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      departure_hotels: {
        Row: {
          check_in_date: string | null
          check_out_date: string | null
          created_at: string | null
          departure_id: string
          hotel_id: string
          hotel_role: string
          id: string
          nights: number | null
          notes: string | null
          sort_order: number | null
        }
        Insert: {
          check_in_date?: string | null
          check_out_date?: string | null
          created_at?: string | null
          departure_id: string
          hotel_id: string
          hotel_role?: string
          id?: string
          nights?: number | null
          notes?: string | null
          sort_order?: number | null
        }
        Update: {
          check_in_date?: string | null
          check_out_date?: string | null
          created_at?: string | null
          departure_id?: string
          hotel_id?: string
          hotel_role?: string
          id?: string
          nights?: number | null
          notes?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "departure_hotels_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departure_hotels_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "v_financial_summary"
            referencedColumns: ["departure_id"]
          },
          {
            foreignKeyName: "departure_hotels_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      departure_itineraries: {
        Row: {
          created_at: string | null
          customized_days: Json | null
          departure_id: string
          id: string
          template_id: string
        }
        Insert: {
          created_at?: string | null
          customized_days?: Json | null
          departure_id: string
          id?: string
          template_id: string
        }
        Update: {
          created_at?: string | null
          customized_days?: Json | null
          departure_id?: string
          id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departure_itineraries_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: true
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departure_itineraries_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: true
            referencedRelation: "v_financial_summary"
            referencedColumns: ["departure_id"]
          },
          {
            foreignKeyName: "departure_itineraries_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "itinerary_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      departures: {
        Row: {
          airline_id: string | null
          arrival_airport_id: string | null
          booked_count: number | null
          break_even_pax: number | null
          created_at: string | null
          departure_airport_id: string | null
          departure_date: string
          departure_time: string | null
          document_deadline: string | null
          flight_number: string | null
          hotel_madinah_id: string | null
          hotel_makkah_id: string | null
          id: string
          month: string | null
          muthawif_id: string | null
          operational_cost_per_pax: number | null
          package_id: string | null
          payment_deadline: string | null
          price_double: number | null
          price_quad: number | null
          price_single: number | null
          price_triple: number | null
          quota: number
          return_date: string
          status: string | null
          team_leader_id: string | null
          updated_at: string | null
          visa_deadline: string | null
        }
        Insert: {
          airline_id?: string | null
          arrival_airport_id?: string | null
          booked_count?: number | null
          break_even_pax?: number | null
          created_at?: string | null
          departure_airport_id?: string | null
          departure_date: string
          departure_time?: string | null
          document_deadline?: string | null
          flight_number?: string | null
          hotel_madinah_id?: string | null
          hotel_makkah_id?: string | null
          id?: string
          month?: string | null
          muthawif_id?: string | null
          operational_cost_per_pax?: number | null
          package_id?: string | null
          payment_deadline?: string | null
          price_double?: number | null
          price_quad?: number | null
          price_single?: number | null
          price_triple?: number | null
          quota?: number
          return_date: string
          status?: string | null
          team_leader_id?: string | null
          updated_at?: string | null
          visa_deadline?: string | null
        }
        Update: {
          airline_id?: string | null
          arrival_airport_id?: string | null
          booked_count?: number | null
          break_even_pax?: number | null
          created_at?: string | null
          departure_airport_id?: string | null
          departure_date?: string
          departure_time?: string | null
          document_deadline?: string | null
          flight_number?: string | null
          hotel_madinah_id?: string | null
          hotel_makkah_id?: string | null
          id?: string
          month?: string | null
          muthawif_id?: string | null
          operational_cost_per_pax?: number | null
          package_id?: string | null
          payment_deadline?: string | null
          price_double?: number | null
          price_quad?: number | null
          price_single?: number | null
          price_triple?: number | null
          quota?: number
          return_date?: string
          status?: string | null
          team_leader_id?: string | null
          updated_at?: string | null
          visa_deadline?: string | null
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
          allowed_extensions: string[]
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          is_required: boolean | null
          max_file_size_mb: number
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allowed_extensions?: string[]
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean | null
          max_file_size_mb?: number
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allowed_extensions?: string[]
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean | null
          max_file_size_mb?: number
          name?: string
          sort_order?: number
          updated_at?: string
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
      employee_devices: {
        Row: {
          device_fingerprint: string
          device_name: string
          employee_id: string
          id: string
          is_active: boolean
          last_used_at: string | null
          registered_at: string
          registered_by: string | null
          screen_info: string | null
          user_agent: string | null
        }
        Insert: {
          device_fingerprint: string
          device_name?: string
          employee_id: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          registered_at?: string
          registered_by?: string | null
          screen_info?: string | null
          user_agent?: string | null
        }
        Update: {
          device_fingerprint?: string
          device_name?: string
          employee_id?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          registered_at?: string
          registered_by?: string | null
          screen_info?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_devices_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
          custom_absent_deduction: number | null
          custom_absent_deduction_type: string | null
          custom_late_deduction: number | null
          custom_late_deduction_type: string | null
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
          use_custom_deduction: boolean
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
          custom_absent_deduction?: number | null
          custom_absent_deduction_type?: string | null
          custom_late_deduction?: number | null
          custom_late_deduction_type?: string | null
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
          use_custom_deduction?: boolean
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
          custom_absent_deduction?: number | null
          custom_absent_deduction_type?: string | null
          custom_late_deduction?: number | null
          custom_late_deduction_type?: string | null
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
          use_custom_deduction?: boolean
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
      equipment_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipment_distributions: {
        Row: {
          cancel_admin_fee: number | null
          cancel_reason: string | null
          condition_photo_url: string | null
          customer_id: string
          delivery_date: string | null
          delivery_proof_url: string | null
          delivery_type: string | null
          departure_id: string | null
          distributed_at: string | null
          distributed_by: string | null
          equipment_id: string
          expedition_name: string | null
          id: string
          notes: string | null
          quantity: number | null
          return_condition: string | null
          return_notes: string | null
          return_photo_url: string | null
          returned_at: string | null
          status: string | null
          tracking_number: string | null
          variant_id: string | null
        }
        Insert: {
          cancel_admin_fee?: number | null
          cancel_reason?: string | null
          condition_photo_url?: string | null
          customer_id: string
          delivery_date?: string | null
          delivery_proof_url?: string | null
          delivery_type?: string | null
          departure_id?: string | null
          distributed_at?: string | null
          distributed_by?: string | null
          equipment_id: string
          expedition_name?: string | null
          id?: string
          notes?: string | null
          quantity?: number | null
          return_condition?: string | null
          return_notes?: string | null
          return_photo_url?: string | null
          returned_at?: string | null
          status?: string | null
          tracking_number?: string | null
          variant_id?: string | null
        }
        Update: {
          cancel_admin_fee?: number | null
          cancel_reason?: string | null
          condition_photo_url?: string | null
          customer_id?: string
          delivery_date?: string | null
          delivery_proof_url?: string | null
          delivery_type?: string | null
          departure_id?: string | null
          distributed_at?: string | null
          distributed_by?: string | null
          equipment_id?: string
          expedition_name?: string | null
          id?: string
          notes?: string | null
          quantity?: number | null
          return_condition?: string | null
          return_notes?: string | null
          return_photo_url?: string | null
          returned_at?: string | null
          status?: string | null
          tracking_number?: string | null
          variant_id?: string | null
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
          {
            foreignKeyName: "equipment_distributions_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "equipment_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_items: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          gender_target: string
          has_variants: boolean
          id: string
          low_stock_threshold: number
          name: string
          photo_url: string | null
          pic: string | null
          pic_type: string | null
          qr_code: string | null
          stock_quantity: number | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          gender_target?: string
          has_variants?: boolean
          id?: string
          low_stock_threshold?: number
          name: string
          photo_url?: string | null
          pic?: string | null
          pic_type?: string | null
          qr_code?: string | null
          stock_quantity?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          gender_target?: string
          has_variants?: boolean
          id?: string
          low_stock_threshold?: number
          name?: string
          photo_url?: string | null
          pic?: string | null
          pic_type?: string | null
          qr_code?: string | null
          stock_quantity?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      equipment_notification_settings: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          low_stock_threshold_default: number
          notify_admins: boolean
          notify_pic: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          low_stock_threshold_default?: number
          notify_admins?: boolean
          notify_pic?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          low_stock_threshold_default?: number
          notify_admins?: boolean
          notify_pic?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      equipment_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      equipment_stock_history: {
        Row: {
          change_type: string
          changed_by: string | null
          created_at: string
          equipment_item_id: string
          id: string
          new_quantity: number
          notes: string | null
          previous_quantity: number
          quantity_change: number
        }
        Insert: {
          change_type: string
          changed_by?: string | null
          created_at?: string
          equipment_item_id: string
          id?: string
          new_quantity?: number
          notes?: string | null
          previous_quantity?: number
          quantity_change?: number
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          created_at?: string
          equipment_item_id?: string
          id?: string
          new_quantity?: number
          notes?: string | null
          previous_quantity?: number
          quantity_change?: number
        }
        Relationships: [
          {
            foreignKeyName: "equipment_stock_history_equipment_item_id_fkey"
            columns: ["equipment_item_id"]
            isOneToOne: false
            referencedRelation: "equipment_items"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_stock_opname: {
        Row: {
          created_at: string
          created_by: string | null
          difference: number
          equipment_item_id: string
          id: string
          notes: string | null
          opname_date: string
          physical_count: number
          pic_name: string | null
          pic_type: string | null
          status: string
          system_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          difference?: number
          equipment_item_id: string
          id?: string
          notes?: string | null
          opname_date?: string
          physical_count?: number
          pic_name?: string | null
          pic_type?: string | null
          status?: string
          system_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          difference?: number
          equipment_item_id?: string
          id?: string
          notes?: string | null
          opname_date?: string
          physical_count?: number
          pic_name?: string | null
          pic_type?: string | null
          status?: string
          system_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_stock_opname_equipment_item_id_fkey"
            columns: ["equipment_item_id"]
            isOneToOne: false
            referencedRelation: "equipment_items"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_variants: {
        Row: {
          color: string | null
          created_at: string
          equipment_id: string
          id: string
          low_stock_threshold: number
          size: string | null
          sku: string | null
          stock_damaged: number
          stock_good: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          equipment_id: string
          id?: string
          low_stock_threshold?: number
          size?: string | null
          sku?: string | null
          stock_damaged?: number
          stock_good?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          equipment_id?: string
          id?: string
          low_stock_threshold?: number
          size?: string | null
          sku?: string | null
          stock_damaged?: number
          stock_good?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_variants_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_items"
            referencedColumns: ["id"]
          },
        ]
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
      hr_settings: {
        Row: {
          absent_deduction_per_day: number | null
          absent_deduction_percentage: number | null
          absent_deduction_type: string
          holiday_overtime_multiplier: number | null
          id: string
          late_deduction_per_incident: number | null
          late_deduction_percentage: number | null
          late_deduction_type: string
          late_threshold_minutes: number | null
          overtime_rate_per_hour: number | null
          require_device_registration: boolean
          updated_at: string | null
          work_end_time: string | null
          work_start_time: string | null
        }
        Insert: {
          absent_deduction_per_day?: number | null
          absent_deduction_percentage?: number | null
          absent_deduction_type?: string
          holiday_overtime_multiplier?: number | null
          id?: string
          late_deduction_per_incident?: number | null
          late_deduction_percentage?: number | null
          late_deduction_type?: string
          late_threshold_minutes?: number | null
          overtime_rate_per_hour?: number | null
          require_device_registration?: boolean
          updated_at?: string | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Update: {
          absent_deduction_per_day?: number | null
          absent_deduction_percentage?: number | null
          absent_deduction_type?: string
          holiday_overtime_multiplier?: number | null
          id?: string
          late_deduction_per_incident?: number | null
          late_deduction_percentage?: number | null
          late_deduction_type?: string
          late_threshold_minutes?: number | null
          overtime_rate_per_hour?: number | null
          require_device_registration?: boolean
          updated_at?: string | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Relationships: []
      }
      ibadah_progress: {
        Row: {
          completed: boolean
          count: number
          created_at: string
          ibadah_date: string
          ibadah_type: string
          id: string
          notes: string | null
          target: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          count?: number
          created_at?: string
          ibadah_date?: string
          ibadah_type: string
          id?: string
          notes?: string | null
          target?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          count?: number
          created_at?: string
          ibadah_date?: string
          ibadah_type?: string
          id?: string
          notes?: string | null
          target?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      itinerary_templates: {
        Row: {
          created_at: string
          days: Json
          description: string | null
          duration_days: number
          id: string
          is_active: boolean
          name: string
          package_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          days?: Json
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          name: string
          package_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          days?: Json
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          name?: string
          package_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      jamaah_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          metadata: Json | null
          source: string | null
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          source?: string | null
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      jamaah_daily_attendance: {
        Row: {
          attendance_date: string
          customer_id: string
          departure_id: string
          id: string
          location: string | null
          notes: string | null
          photo_url: string | null
          recorded_at: string
          recorded_by: string | null
          status: string
        }
        Insert: {
          attendance_date?: string
          customer_id: string
          departure_id: string
          id?: string
          location?: string | null
          notes?: string | null
          photo_url?: string | null
          recorded_at?: string
          recorded_by?: string | null
          status?: string
        }
        Update: {
          attendance_date?: string
          customer_id?: string
          departure_id?: string
          id?: string
          location?: string | null
          notes?: string | null
          photo_url?: string | null
          recorded_at?: string
          recorded_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "jamaah_daily_attendance_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jamaah_daily_attendance_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jamaah_daily_attendance_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "v_financial_summary"
            referencedColumns: ["departure_id"]
          },
        ]
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
      landing_pages: {
        Row: {
          created_at: string
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          og_image_url: string | null
          sections: Json
          slug: string
          title: string
          updated_at: string
          whatsapp_agent_id: string | null
          whatsapp_custom_number: string | null
          whatsapp_source_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          sections?: Json
          slug: string
          title: string
          updated_at?: string
          whatsapp_agent_id?: string | null
          whatsapp_custom_number?: string | null
          whatsapp_source_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          sections?: Json
          slug?: string
          title?: string
          updated_at?: string
          whatsapp_agent_id?: string | null
          whatsapp_custom_number?: string | null
          whatsapp_source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_whatsapp_agent_id_fkey"
            columns: ["whatsapp_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
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
      menu_items: {
        Row: {
          created_at: string
          group_name: string
          icon: string | null
          id: string
          is_visible: boolean
          key: string
          label: string
          path: string
          required_permission: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_name?: string
          icon?: string | null
          id?: string
          is_visible?: boolean
          key: string
          label: string
          path: string
          required_permission?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_name?: string
          icon?: string | null
          id?: string
          is_visible?: boolean
          key?: string
          label?: string
          path?: string
          required_permission?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
      office_assets: {
        Row: {
          branch_id: string | null
          category: string
          condition: string
          created_at: string
          id: string
          location: string | null
          name: string
          notes: string | null
          photo_url: string | null
          purchase_date: string | null
          purchase_price: number | null
          quantity: number
          size_or_color: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          category?: string
          condition?: string
          created_at?: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number
          size_or_color?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          category?: string
          condition?: string
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number
          size_or_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_assets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
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
      package_change_rules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          min_days_before_departure: number
          package_id: string
          penalty_amount: number
          penalty_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          min_days_before_departure: number
          package_id: string
          penalty_amount?: number
          penalty_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          min_days_before_departure?: number
          package_id?: string
          penalty_amount?: number
          penalty_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_change_rules_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_label_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          label_id: string
          package_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          label_id: string
          package_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          label_id?: string
          package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "package_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_label_assignments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_labels: {
        Row: {
          branch_id: string | null
          color: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          color?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          color?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_labels_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      package_types: {
        Row: {
          code: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
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
          display_order: number | null
          duration_days: number
          excludes: string[] | null
          featured_image: string | null
          gallery: string[] | null
          hotel_madinah_id: string | null
          hotel_makkah_id: string | null
          id: string
          includes: string[] | null
          is_active: boolean | null
          is_cheapest: boolean | null
          is_featured: boolean | null
          is_popular: boolean | null
          itinerary: Json | null
          muthawif_id: string | null
          name: string
          package_type: Database["public"]["Enums"]["package_type"]
          package_type_id: string | null
          price_double: number
          price_quad: number
          price_single: number
          price_triple: number
          savings_installment: number | null
          savings_target: number | null
          updated_at: string | null
        }
        Insert: {
          airline_id?: string | null
          branch_id?: string | null
          code: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          display_order?: number | null
          duration_days?: number
          excludes?: string[] | null
          featured_image?: string | null
          gallery?: string[] | null
          hotel_madinah_id?: string | null
          hotel_makkah_id?: string | null
          id?: string
          includes?: string[] | null
          is_active?: boolean | null
          is_cheapest?: boolean | null
          is_featured?: boolean | null
          is_popular?: boolean | null
          itinerary?: Json | null
          muthawif_id?: string | null
          name: string
          package_type?: Database["public"]["Enums"]["package_type"]
          package_type_id?: string | null
          price_double?: number
          price_quad?: number
          price_single?: number
          price_triple?: number
          savings_installment?: number | null
          savings_target?: number | null
          updated_at?: string | null
        }
        Update: {
          airline_id?: string | null
          branch_id?: string | null
          code?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          display_order?: number | null
          duration_days?: number
          excludes?: string[] | null
          featured_image?: string | null
          gallery?: string[] | null
          hotel_madinah_id?: string | null
          hotel_makkah_id?: string | null
          id?: string
          includes?: string[] | null
          is_active?: boolean | null
          is_cheapest?: boolean | null
          is_featured?: boolean | null
          is_popular?: boolean | null
          itinerary?: Json | null
          muthawif_id?: string | null
          name?: string
          package_type?: Database["public"]["Enums"]["package_type"]
          package_type_id?: string | null
          price_double?: number
          price_quad?: number
          price_single?: number
          price_triple?: number
          savings_installment?: number | null
          savings_target?: number | null
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
          {
            foreignKeyName: "packages_package_type_id_fkey"
            columns: ["package_type_id"]
            isOneToOne: false
            referencedRelation: "package_types"
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
      permissions_list: {
        Row: {
          created_at: string
          description: string | null
          group_name: string
          id: string
          key: string
          label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_name?: string
          id?: string
          key: string
          label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          group_name?: string
          id?: string
          key?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          is_active: boolean | null
          level: number | null
          name: string
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name: string
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      preparation_checklists: {
        Row: {
          booking_id: string | null
          category: string
          completed_at: string | null
          created_at: string
          customer_id: string
          id: string
          is_completed: boolean
          item_key: string
          item_label: string
          notes: string | null
        }
        Insert: {
          booking_id?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_completed?: boolean
          item_key: string
          item_label: string
          notes?: string | null
        }
        Update: {
          booking_id?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_completed?: boolean
          item_key?: string
          item_label?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preparation_checklists_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preparation_checklists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
      push_outbox: {
        Row: {
          attempts: number
          body: string
          created_at: string
          customer_ids: string[]
          id: string
          last_error: string | null
          scheduled_at: string
          sent_at: string | null
          status: string
          title: string
          type: string
          url: string | null
          user_ids: string[]
        }
        Insert: {
          attempts?: number
          body: string
          created_at?: string
          customer_ids?: string[]
          id?: string
          last_error?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          title: string
          type?: string
          url?: string | null
          user_ids?: string[]
        }
        Update: {
          attempts?: number
          body?: string
          created_at?: string
          customer_ids?: string[]
          id?: string
          last_error?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          title?: string
          type?: string
          url?: string | null
          user_ids?: string[]
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          customer_id: string | null
          endpoint: string
          id: string
          is_active: boolean
          last_used_at: string | null
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          customer_id?: string | null
          endpoint: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          customer_id?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
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
      rbac_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          permission_key: string | null
          scope: string
          target_role: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          permission_key?: string | null
          scope: string
          target_role?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          permission_key?: string | null
          scope?: string
          target_role?: string | null
          target_user_id?: string | null
        }
        Relationships: []
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
          created_at: string
          id: string
          is_enabled: boolean
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions_list"
            referencedColumns: ["key"]
          },
        ]
      }
      room_assignment_audit: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          departure_id: string | null
          id: string
          new_room_number: string | null
          new_roommate_id: string | null
          old_room_number: string | null
          old_roommate_id: string | null
          passenger_id: string
          reason: string | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          departure_id?: string | null
          id?: string
          new_room_number?: string | null
          new_roommate_id?: string | null
          old_room_number?: string | null
          old_roommate_id?: string | null
          passenger_id: string
          reason?: string | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          departure_id?: string | null
          id?: string
          new_room_number?: string | null
          new_roommate_id?: string | null
          old_room_number?: string | null
          old_roommate_id?: string | null
          passenger_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_assignment_audit_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_assignment_audit_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "v_financial_summary"
            referencedColumns: ["departure_id"]
          },
          {
            foreignKeyName: "room_assignment_audit_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "booking_passengers"
            referencedColumns: ["id"]
          },
        ]
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
      salary_payments: {
        Row: {
          allowances: number
          base_salary: number
          created_at: string
          deductions: number
          employee_id: string
          id: string
          notes: string | null
          overtime_pay: number
          paid_at: string | null
          paid_by: string | null
          period_month: number
          period_year: number
          status: string
          total_pay: number
          updated_at: string
        }
        Insert: {
          allowances?: number
          base_salary?: number
          created_at?: string
          deductions?: number
          employee_id: string
          id?: string
          notes?: string | null
          overtime_pay?: number
          paid_at?: string | null
          paid_by?: string | null
          period_month: number
          period_year: number
          status?: string
          total_pay?: number
          updated_at?: string
        }
        Update: {
          allowances?: number
          base_salary?: number
          created_at?: string
          deductions?: number
          employee_id?: string
          id?: string
          notes?: string | null
          overtime_pay?: number
          paid_at?: string | null
          paid_by?: string | null
          period_month?: number
          period_year?: number
          status?: string
          total_pay?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_page_content: {
        Row: {
          benefits: Json | null
          created_at: string
          cta_subtitle: string | null
          cta_title: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          settings_id: string
          updated_at: string
        }
        Insert: {
          benefits?: Json | null
          created_at?: string
          cta_subtitle?: string | null
          cta_title?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          settings_id: string
          updated_at?: string
        }
        Update: {
          benefits?: Json | null
          created_at?: string
          cta_subtitle?: string | null
          cta_title?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          settings_id?: string
          updated_at?: string
        }
        Relationships: []
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
          locked_price: number | null
          monthly_amount: number
          notes: string | null
          package_id: string
          paid_amount: number | null
          price_lock_date: string | null
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
          locked_price?: number | null
          monthly_amount: number
          notes?: string | null
          package_id: string
          paid_amount?: number | null
          price_lock_date?: string | null
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
          locked_price?: number | null
          monthly_amount?: number
          notes?: string | null
          package_id?: string
          paid_amount?: number | null
          price_lock_date?: string | null
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
      savings_schedules: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          id: string
          installment_number: number
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          savings_plan_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date: string
          id?: string
          installment_number: number
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          savings_plan_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          id?: string
          installment_number?: number
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          savings_plan_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "savings_schedules_savings_plan_id_fkey"
            columns: ["savings_plan_id"]
            isOneToOne: false
            referencedRelation: "savings_plans"
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
      store_carts: {
        Row: {
          items: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          items?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          items?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_order_counters: {
        Row: {
          date_key: string
          last_seq: number
        }
        Insert: {
          date_key: string
          last_seq?: number
        }
        Update: {
          date_key?: string
          last_seq?: number
        }
        Relationships: []
      }
      store_order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_image: string | null
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_image?: string | null
          product_name: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_orders: {
        Row: {
          branch_id: string | null
          confirmed_at: string | null
          created_at: string
          customer_id: string | null
          discount_amount: number
          id: string
          notes: string | null
          order_number: string
          paid_at: string | null
          payment_proof_url: string | null
          payment_status: string
          shipping_address: string | null
          shipping_city: string | null
          shipping_cost: number
          shipping_name: string | null
          shipping_phone: string | null
          shipping_postal: string | null
          shipping_province: string | null
          status: string
          subtotal: number
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          branch_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          order_number: string
          paid_at?: string | null
          payment_proof_url?: string | null
          payment_status?: string
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_cost?: number
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_postal?: string | null
          shipping_province?: string | null
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          branch_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          order_number?: string
          paid_at?: string | null
          payment_proof_url?: string | null
          payment_status?: string
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_cost?: number
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_postal?: string | null
          shipping_province?: string | null
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      store_product_reviews: {
        Row: {
          admin_reply: string | null
          admin_reply_at: string | null
          comment: string | null
          created_at: string
          customer_id: string | null
          id: string
          is_published: boolean
          order_id: string
          product_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          admin_reply_at?: string | null
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          is_published?: boolean
          order_id: string
          product_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          admin_reply_at?: string | null
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          is_published?: boolean
          order_id?: string
          product_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_product_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_products: {
        Row: {
          branch_id: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          images: Json
          is_active: boolean
          is_featured: boolean
          name: string
          original_price: number | null
          price: number
          sku: string | null
          slug: string
          sold_count: number
          stock: number
          updated_at: string
          weight_gram: number
        }
        Insert: {
          branch_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json
          is_active?: boolean
          is_featured?: boolean
          name: string
          original_price?: number | null
          price?: number
          sku?: string | null
          slug: string
          sold_count?: number
          stock?: number
          updated_at?: string
          weight_gram?: number
        }
        Update: {
          branch_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json
          is_active?: boolean
          is_featured?: boolean
          name?: string
          original_price?: number | null
          price?: number
          sku?: string | null
          slug?: string
          sold_count?: number
          stock?: number
          updated_at?: string
          weight_gram?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "store_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      store_shipments: {
        Row: {
          courier_name: string
          courier_service: string | null
          created_at: string
          delivered_at: string | null
          estimated_arrival: string | null
          id: string
          notes: string | null
          order_id: string
          shipped_at: string | null
          status: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          courier_name: string
          courier_service?: string | null
          created_at?: string
          delivered_at?: string | null
          estimated_arrival?: string | null
          id?: string
          notes?: string | null
          order_id: string
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          courier_name?: string
          courier_service?: string | null
          created_at?: string
          delivered_at?: string | null
          estimated_arrival?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
        ]
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
          accent_gold: string | null
          background_color: string
          body_font: string | null
          card_style: string | null
          created_at: string | null
          cta_variant: string | null
          density: string | null
          description: string | null
          foreground_color: string
          heading_font: string | null
          hero_variant: string | null
          id: string
          is_default: boolean | null
          mood: string | null
          name: string
          ornament: string | null
          preview_image_url: string | null
          primary_color: string
          radius_style: string | null
          secondary_color: string
          slug: string
          surface_color: string | null
        }
        Insert: {
          accent_color: string
          accent_gold?: string | null
          background_color?: string
          body_font?: string | null
          card_style?: string | null
          created_at?: string | null
          cta_variant?: string | null
          density?: string | null
          description?: string | null
          foreground_color?: string
          heading_font?: string | null
          hero_variant?: string | null
          id?: string
          is_default?: boolean | null
          mood?: string | null
          name: string
          ornament?: string | null
          preview_image_url?: string | null
          primary_color: string
          radius_style?: string | null
          secondary_color: string
          slug: string
          surface_color?: string | null
        }
        Update: {
          accent_color?: string
          accent_gold?: string | null
          background_color?: string
          body_font?: string | null
          card_style?: string | null
          created_at?: string | null
          cta_variant?: string | null
          density?: string | null
          description?: string | null
          foreground_color?: string
          heading_font?: string | null
          hero_variant?: string | null
          id?: string
          is_default?: boolean | null
          mood?: string | null
          name?: string
          ornament?: string | null
          preview_image_url?: string | null
          primary_color?: string
          radius_style?: string | null
          secondary_color?: string
          slug?: string
          surface_color?: string | null
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
      tier_benefits: {
        Row: {
          created_at: string
          description: string | null
          discount_percent: number
          free_upgrades: number
          id: string
          priority_support: boolean
          tier_level: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_percent?: number
          free_upgrades?: number
          id?: string
          priority_support?: boolean
          tier_level: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_percent?: number
          free_upgrades?: number
          id?: string
          priority_support?: boolean
          tier_level?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_modules: {
        Row: {
          category: string
          content_text: string | null
          content_type: string
          content_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_mandatory: boolean
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content_text?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content_text?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_quizzes: {
        Row: {
          created_at: string
          id: string
          module_id: string
          options: Json
          order_index: number
          question: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_id: string
          options: Json
          order_index?: number
          question: string
        }
        Update: {
          created_at?: string
          id?: string
          module_id?: string
          options?: Json
          order_index?: number
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_quizzes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
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
      user_permissions: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          permission_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          permission_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          permission_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions_list"
            referencedColumns: ["key"]
          },
        ]
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
      visa_applications: {
        Row: {
          approved_at: string | null
          created_at: string
          customer_id: string
          departure_id: string | null
          id: string
          notes: string | null
          passport_expiry: string | null
          passport_number: string | null
          processed_by: string | null
          rejected_at: string | null
          rejection_reason: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          visa_expiry: string | null
          visa_number: string | null
          visa_type: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          customer_id: string
          departure_id?: string | null
          id?: string
          notes?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          processed_by?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          visa_expiry?: string | null
          visa_number?: string | null
          visa_type?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          customer_id?: string
          departure_id?: string | null
          id?: string
          notes?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          processed_by?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          visa_expiry?: string | null
          visa_number?: string | null
          visa_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "visa_applications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visa_applications_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visa_applications_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "v_financial_summary"
            referencedColumns: ["departure_id"]
          },
        ]
      }
      website_settings: {
        Row: {
          accent_color: string | null
          active_theme: string
          agent_id: string | null
          background_color: string | null
          body_font: string | null
          branch_id: string | null
          company_name: string | null
          created_at: string | null
          custom_sections: Json | null
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
          hero_display_mode: string
          hero_image_url: string | null
          hero_subtitle: string | null
          hero_title: string | null
          homepage_sections: Json | null
          id: string
          layout_variant: Json | null
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
          template: string
          theme_overrides: Json | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          active_theme?: string
          agent_id?: string | null
          background_color?: string | null
          body_font?: string | null
          branch_id?: string | null
          company_name?: string | null
          created_at?: string | null
          custom_sections?: Json | null
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
          hero_display_mode?: string
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          homepage_sections?: Json | null
          id?: string
          layout_variant?: Json | null
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
          template?: string
          theme_overrides?: Json | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          active_theme?: string
          agent_id?: string | null
          background_color?: string | null
          body_font?: string | null
          branch_id?: string | null
          company_name?: string | null
          created_at?: string | null
          custom_sections?: Json | null
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
          hero_display_mode?: string
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          homepage_sections?: Json | null
          id?: string
          layout_variant?: Json | null
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
          template?: string
          theme_overrides?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "website_settings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
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
      work_schedules: {
        Row: {
          created_at: string | null
          day_of_week: number
          employee_id: string | null
          end_time: string | null
          id: string
          is_day_off: boolean | null
          start_time: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          employee_id?: string | null
          end_time?: string | null
          id?: string
          is_day_off?: boolean | null
          start_time?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          employee_id?: string | null
          end_time?: string | null
          id?: string
          is_day_off?: boolean | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
      v_role_user_counts: {
        Row: {
          role: string | null
          user_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_variant_stock: {
        Args: {
          p_delta_damaged?: number
          p_delta_good?: number
          p_variant_id: string
        }
        Returns: undefined
      }
      agent_can_access_customer: {
        Args: { _customer_id: string; _user_id: string }
        Returns: boolean
      }
      apply_tier_discount: {
        Args: { _base_amount: number; _customer_id: string }
        Returns: Json
      }
      award_badge: {
        Args: {
          _badge_id: string
          _badge_name: string
          _source?: string
          _user_id: string
          _xp?: number
        }
        Returns: boolean
      }
      bulk_distribute_equipment: {
        Args: { p_departure_id: string; p_distributions: Json }
        Returns: undefined
      }
      bulk_sync_menu_items: {
        Args: { _menu_items: string }
        Returns: undefined
      }
      check_user_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      convert_savings_to_booking: {
        Args: {
          _departure_id: string
          _room_type?: string
          _savings_plan_id: string
        }
        Returns: string
      }
      decrement_equipment_stock: {
        Args: { amount?: number; item_id: string }
        Returns: undefined
      }
      enqueue_h_minus_one_push: { Args: never; Returns: number }
      enqueue_push: {
        Args: {
          _body: string
          _customer_ids?: string[]
          _title: string
          _type?: string
          _url?: string
          _user_ids: string[]
        }
        Returns: string
      }
      estimate_haji_departure_year: {
        Args: {
          p_haji_type?: string
          p_portion_number: string
          p_registration_year: number
        }
        Returns: number
      }
      generate_booking_code: {
        Args: { _departure_date?: string; _package_code?: string }
        Returns: string
      }
      generate_employee_code: { Args: never; Returns: string }
      generate_payment_code: { Args: never; Returns: string }
      generate_savings_payment_code: { Args: never; Returns: string }
      generate_store_order_number: { Args: never; Returns: string }
      generate_ticket_code: { Args: never; Returns: string }
      get_booking_customer_ids_for_user: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_customer_user_id: { Args: { _customer_id: string }; Returns: string }
      get_failed_attempts: { Args: { _email: string }; Returns: number }
      get_menu_access_summary: {
        Args: never
        Returns: {
          access_percentage: number
          accessible_menus: number
          role: string
          total_menus: number
        }[]
      }
      get_next_document_number: {
        Args: { p_document_type: string; p_prefix: string }
        Returns: string
      }
      get_user_branch_id: { Args: { _user_id: string }; Returns: string }
      get_user_effective_permissions: {
        Args: { _user_id: string }
        Returns: {
          permission_key: string
        }[]
      }
      get_user_effective_permissions_v2: {
        Args: { _roles: string[]; _user_id: string }
        Returns: {
          permission_key: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_departure_booked: {
        Args: { _departure_id: string; _pax: number }
        Returns: boolean
      }
      increment_equipment_stock: {
        Args: { amount?: number; item_id: string }
        Returns: undefined
      }
      is_account_locked: { Args: { _email: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_branch_manager_only: { Args: { _user_id: string }; Returns: boolean }
      list_users_with_emails: {
        Args: never
        Returns: {
          email: string
          id: string
        }[]
      }
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
      log_rbac_change: {
        Args: {
          _action: string
          _metadata?: Json
          _new_value?: Json
          _old_value?: Json
          _permission_key?: string
          _scope: string
          _target_role?: string
          _target_user_id?: string
        }
        Returns: string
      }
      recalculate_departure_booked_count: {
        Args: { p_departure_id?: string }
        Returns: undefined
      }
      reset_role_permissions: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: number
      }
      resync_all_role_permissions: { Args: never; Returns: Json }
      return_equipment_distribution: {
        Args: {
          p_admin_fee?: number
          p_condition: string
          p_distribution_id: string
          p_notes?: string
          p_return_photo_url?: string
        }
        Returns: undefined
      }
      sync_role_permissions_to_users: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: undefined
      }
      user_belongs_to_branch: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      user_owns_booking: {
        Args: { _booking_id: string; _user_id: string }
        Returns: boolean
      }
      validate_employee_user_sync: {
        Args: never
        Returns: {
          description: string
          employee_code: string
          employee_id: string
          full_name: string
          issue_type: string
          user_id: string
        }[]
      }
      wipe_and_reset_all_role_permissions: { Args: never; Returns: Json }
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
