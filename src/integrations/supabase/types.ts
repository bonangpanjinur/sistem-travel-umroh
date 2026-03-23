export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
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
          savings_installment: number | null
          savings_target: number | null
          updated_at: string | null
          fee_branch: number
          fee_agent: number
          fee_sub_agent: number
          fee_referral: number
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
          savings_installment?: number | null
          savings_target?: number | null
          updated_at?: string | null
          fee_branch?: number
          fee_agent?: number
          fee_sub_agent?: number
          fee_referral?: number
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
          savings_installment?: number | null
          savings_target?: number | null
          updated_at?: string | null
          fee_branch?: number
          fee_agent?: number
          fee_sub_agent?: number
          fee_referral?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      package_type: "UMRAH" | "HAJI"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
