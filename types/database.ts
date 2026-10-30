// Auto-generated types from Supabase schema
// Run: supabase gen types typescript --local > types/database.ts
// to regenerate after schema changes

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          logo_url: string | null
          status: 'pending' | 'active' | 'suspended'
          country_code: string
          currency: string
          payment_provider: 'stripe' | 'mercadopago'
          stripe_account_id: string | null
          mp_user_id: string | null
          location: unknown | null
          radius_km: number | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string | null
          logo_url?: string | null
          status?: 'pending' | 'active' | 'suspended'
          country_code: string
          currency: string
          payment_provider: 'stripe' | 'mercadopago'
          stripe_account_id?: string | null
          mp_user_id?: string | null
          location?: unknown | null
          radius_km?: number | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['restaurants']['Insert']>
        Relationships: []
      }
      menus: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          description: string | null
          price: number
          images: string[]
          status: 'active' | 'inactive' | 'draft'
          purchase_type: 'one_time' | 'subscription' | 'both'
          serves_people: number | null
          prep_time_minutes: number | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          description?: string | null
          price: number
          images?: string[]
          status?: 'active' | 'inactive' | 'draft'
          purchase_type?: 'one_time' | 'subscription' | 'both'
          serves_people?: number | null
          prep_time_minutes?: number | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['menus']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'menus_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          }
        ]
      }
      menu_health_goals: {
        Row: {
          id: string
          menu_id: string
          goal: HealthGoal
        }
        Insert: {
          id?: string
          menu_id: string
          goal: HealthGoal
        }
        Update: Partial<Database['public']['Tables']['menu_health_goals']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'menu_health_goals_menu_id_fkey'
            columns: ['menu_id']
            isOneToOne: false
            referencedRelation: 'menus'
            referencedColumns: ['id']
          }
        ]
      }
      menu_nutrition: {
        Row: {
          menu_id: string
          calories_per_serving: number | null
          protein_g: number | null
          carbs_g: number | null
          fat_g: number | null
          fiber_g: number | null
          sugar_g: number | null
          sodium_mg: number | null
          allergens: string[]
        }
        Insert: {
          menu_id: string
          calories_per_serving?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          fiber_g?: number | null
          sugar_g?: number | null
          sodium_mg?: number | null
          allergens?: string[]
        }
        Update: Partial<Database['public']['Tables']['menu_nutrition']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'menu_nutrition_menu_id_fkey'
            columns: ['menu_id']
            isOneToOne: true
            referencedRelation: 'menus'
            referencedColumns: ['id']
          }
        ]
      }
      orders: {
        Row: {
          id: string
          external_customer_ref: string
          restaurant_id: string
          menu_id: string
          quantity: number
          unit_price: number
          total_amount: number
          commission_amount: number
          currency: string
          status: OrderStatus
          payment_provider: 'stripe' | 'mercadopago'
          stripe_payment_intent_id: string | null
          mp_payment_id: string | null
          mp_preference_id: string | null
          delivery_address: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          external_customer_ref: string
          restaurant_id: string
          menu_id: string
          quantity?: number
          unit_price: number
          total_amount: number
          commission_amount?: number
          currency: string
          status?: OrderStatus
          payment_provider: 'stripe' | 'mercadopago'
          stripe_payment_intent_id?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          delivery_address?: Json | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'orders_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_menu_id_fkey'
            columns: ['menu_id']
            isOneToOne: false
            referencedRelation: 'menus'
            referencedColumns: ['id']
          }
        ]
      }
      subscriptions: {
        Row: {
          id: string
          external_customer_ref: string
          menu_id: string
          frequency: 'weekly' | 'biweekly' | 'monthly'
          status: 'active' | 'paused' | 'cancelled'
          payment_provider: 'stripe' | 'mercadopago'
          stripe_subscription_id: string | null
          mp_preapproval_id: string | null
          next_delivery_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          external_customer_ref: string
          menu_id: string
          frequency: 'weekly' | 'biweekly' | 'monthly'
          status?: 'active' | 'paused' | 'cancelled'
          payment_provider: 'stripe' | 'mercadopago'
          stripe_subscription_id?: string | null
          mp_preapproval_id?: string | null
          next_delivery_date?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'subscriptions_menu_id_fkey'
            columns: ['menu_id']
            isOneToOne: false
            referencedRelation: 'menus'
            referencedColumns: ['id']
          }
        ]
      }
      commission_config: {
        Row: {
          id: string
          type: 'percentage' | 'flat'
          value: number
          effective_from: string
        }
        Insert: {
          id?: string
          type: 'percentage' | 'flat'
          value: number
          effective_from?: string
        }
        Update: Partial<Database['public']['Tables']['commission_config']['Insert']>
        Relationships: []
      }
      api_keys: {
        Row: {
          id: string
          key_hash: string
          name: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          key_hash: string
          name: string
          active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['api_keys']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      search_restaurants_by_location: {
        Args: {
          lat: number
          lng: number
          radius_km?: number
          health_goal?: string | null
          p_limit?: number
          p_offset?: number
        }
        Returns: Array<{
          id: string
          name: string
          description: string | null
          logo_url: string | null
          country_code: string
          currency: string
          distance_km: number
        }>
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// ----------------------------------------------------------------
// Convenience aliases
// ----------------------------------------------------------------
export type Restaurant = Database['public']['Tables']['restaurants']['Row']
export type RestaurantInsert = Database['public']['Tables']['restaurants']['Insert']
export type RestaurantUpdate = Database['public']['Tables']['restaurants']['Update']

export type Menu = Database['public']['Tables']['menus']['Row']
export type MenuInsert = Database['public']['Tables']['menus']['Insert']
export type MenuUpdate = Database['public']['Tables']['menus']['Update']

export type MenuNutrition = Database['public']['Tables']['menu_nutrition']['Row']
export type MenuNutritionInsert = Database['public']['Tables']['menu_nutrition']['Insert']

export type Order = Database['public']['Tables']['orders']['Row']
export type OrderInsert = Database['public']['Tables']['orders']['Insert']

export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']

export type CommissionConfig = Database['public']['Tables']['commission_config']['Row']
export type ApiKey = Database['public']['Tables']['api_keys']['Row']

export type HealthGoal =
  | 'weight_loss' | 'muscle_gain' | 'maintenance' | 'energy'
  | 'detox' | 'heart_health' | 'diabetes_friendly' | 'vegan'
  | 'vegetarian' | 'gluten_free' | 'keto' | 'paleo'

export type OrderStatus =
  | 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled'

export type AppRole = 'restaurant_owner' | 'nutritionist' | 'platform_admin'

export type PaymentProvider = 'stripe' | 'mercadopago'
