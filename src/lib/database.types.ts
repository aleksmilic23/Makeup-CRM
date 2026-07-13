export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          created_at: string
          name: string
          phone: string | null
          email: string | null
          skin_type: string | null
          allergies: string | null
          notes: string | null
          avatar_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          phone?: string | null
          email?: string | null
          skin_type?: string | null
          allergies?: string | null
          notes?: string | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          phone?: string | null
          email?: string | null
          skin_type?: string | null
          allergies?: string | null
          notes?: string | null
          avatar_url?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          id: string
          created_at: string
          name: string
          description: string | null
          duration_minutes: number
          price: number
          color: string
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          description?: string | null
          duration_minutes?: number
          price?: number
          color?: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          description?: string | null
          duration_minutes?: number
          price?: number
          color?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          id: string
          created_at: string
          client_id: string
          service_id: string
          scheduled_at: string
          duration_minutes: number
          price: number
          status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          client_id: string
          service_id: string
          scheduled_at: string
          duration_minutes?: number
          price?: number
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          client_id?: string
          service_id?: string
          scheduled_at?: string
          duration_minutes?: number
          price?: number
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: string
          created_at: string
          name: string
          brand: string | null
          category: string
          stock: number
          low_stock_threshold: number
          cost: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          brand?: string | null
          category: string
          stock?: number
          low_stock_threshold?: number
          cost?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          brand?: string | null
          category?: string
          stock?: number
          low_stock_threshold?: number
          cost?: number | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          id: string
          created_at: string
          invoice_number: string
          client_id: string
          appointment_id: string | null
          status: 'draft' | 'sent' | 'paid' | 'void'
          issue_date: string
          due_date: string | null
          event_date: string | null
          notes: string | null
          subtotal: number
          tax_rate: number
          tax_amount: number
          total: number
          deposit_percentage: number | null
          deposit_amount: number | null
          deposit_paid_at: string | null
          sent_at: string | null
          paid_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          invoice_number: string
          client_id: string
          appointment_id?: string | null
          status?: 'draft' | 'sent' | 'paid' | 'void'
          issue_date?: string
          due_date?: string | null
          event_date?: string | null
          notes?: string | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          deposit_percentage?: number | null
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          sent_at?: string | null
          paid_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          invoice_number?: string
          client_id?: string
          appointment_id?: string | null
          status?: 'draft' | 'sent' | 'paid' | 'void'
          issue_date?: string
          due_date?: string | null
          event_date?: string | null
          notes?: string | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          deposit_percentage?: number | null
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          sent_at?: string | null
          paid_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          }
        ]
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          quantity: number
          unit_price: number
          amount: number
          sort_order: number
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          quantity?: number
          unit_price?: number
          amount?: number
          sort_order?: number
        }
        Update: {
          id?: string
          invoice_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          amount?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      next_invoice_number: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {
      appointment_status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
      invoice_status: 'draft' | 'sent' | 'paid' | 'void'
    }
    CompositeTypes: Record<string, never>
  }
}

export type Client = Database['public']['Tables']['clients']['Row']
export type ClientInsert = Database['public']['Tables']['clients']['Insert']
export type Service = Database['public']['Tables']['services']['Row']
export type ServiceInsert = Database['public']['Tables']['services']['Insert']
export type Appointment = Database['public']['Tables']['appointments']['Row']
export type AppointmentInsert = Database['public']['Tables']['appointments']['Insert']
export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row']
export type InvoiceItemInsert = Database['public']['Tables']['invoice_items']['Insert']

export type AppointmentWithRelations = Appointment & {
  clients: Client
  services: Service
}

export type InvoiceWithRelations = Invoice & {
  clients: Client
  invoice_items: InvoiceItem[]
}
