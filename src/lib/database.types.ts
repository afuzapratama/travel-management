// ============================================
// SUPABASE DATABASE TYPES
// Auto-generated style for type safety
// ============================================

export interface Database {
  public: {
    Tables: {
      access_keys: {
        Row: {
          id: string;
          role: 'agent' | 'admin';
          key_value: string;
          label: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['access_keys']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['access_keys']['Insert']>;
      };
      agents: {
        Row: {
          id: string;
          name: string;
          company_name: string;
          phone: string;
          email: string;
          address: string;
          access_key_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agents']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['agents']['Insert']>;
      };
      bookings: {
        Row: {
          id: string;
          agent_id: string | null;
          status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
          // flight info
          flight_number: string;
          route_from: string;
          route_to: string;
          route_from_detail: string;
          route_to_detail: string;
          departure_date: string;
          departure_time: string;
          // bill to
          bill_to_name: string;
          bill_to_phone: string;
          bill_to_email: string;
          // invoice
          invoice_number: string;
          invoice_date: string;
          due_date: string;
          po_number: string;
          payment_status: 'belum-lunas' | 'lunas' | 'dp';
          payment_status_note: string;
          // financials
          service_fee: number;
          discount: number;
          // payment info
          bank_name: string;
          account_name: string;
          account_number: string;
          // company (for invoice)
          company_name: string;
          company_address: string;
          company_phone: string;
          company_email: string;
          company_website: string;
          company_logo_url: string;
          company_signature_url: string;
          signer_name: string;
          signer_position: string;
          // misc
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>;
      };
      passengers: {
        Row: {
          id: string;
          booking_id: string;
          name: string;
          type: 'ADT' | 'CHD' | 'INF';
          dob: string;
          passport: string;
          passport_expiry: string;
          booking_ref: string;
          price: number;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['passengers']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['passengers']['Insert']>;
      };
    };
  };
}
