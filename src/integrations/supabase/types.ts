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
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          module: string
          user_id: string | null
          user_name: string | null
          vendor_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          module: string
          user_id?: string | null
          user_name?: string | null
          vendor_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          module?: string
          user_id?: string | null
          user_name?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      alerts: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          message: string
          portal: string | null
          read: boolean | null
          severity: string
          title: string
          type: string
          vendor_id: string | null
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          message: string
          portal?: string | null
          read?: boolean | null
          severity?: string
          title: string
          type?: string
          vendor_id?: string | null
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          message?: string
          portal?: string | null
          read?: boolean | null
          severity?: string
          title?: string
          type?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          attendance_date: string
          check_in: string | null
          check_out: string | null
          created_at: string
          employee_id: string
          hours_worked: number | null
          id: string
          method: string | null
          network: string | null
          status: string | null
          vendor_id: string | null
        }
        Insert: {
          attendance_date?: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id: string
          hours_worked?: number | null
          id?: string
          method?: string | null
          network?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Update: {
          attendance_date?: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id?: string
          hours_worked?: number | null
          id?: string
          method?: string | null
          network?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_settings: {
        Row: {
          created_at: string
          enabled: boolean
          feature_id: string
          id: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_id: string
          id?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_id?: string
          id?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          about: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          status: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          about?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          status?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          about?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          status?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json
          title: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      credit_notes: {
        Row: {
          cgst: number | null
          created_at: string
          created_by: string | null
          id: string
          igst: number | null
          note_date: string
          note_number: string
          order_id: string | null
          party_name: string
          reason: string | null
          sgst: number | null
          status: string | null
          total_amount: number
          vendor_id: string | null
        }
        Insert: {
          cgst?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          igst?: number | null
          note_date?: string
          note_number: string
          order_id?: string | null
          party_name: string
          reason?: string | null
          sgst?: number | null
          status?: string | null
          total_amount?: number
          vendor_id?: string | null
        }
        Update: {
          cgst?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          igst?: number | null
          note_date?: string
          note_number?: string
          order_id?: string | null
          party_name?: string
          reason?: string | null
          sgst?: number | null
          status?: string | null
          total_amount?: number
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          block_reason: string | null
          blocked_at: string | null
          channels: string[] | null
          city: string | null
          created_at: string
          email: string | null
          first_order_date: string | null
          id: string
          is_blocked: boolean | null
          last_order_date: string | null
          name: string
          phone: string | null
          pincode: string | null
          source: string | null
          state: string | null
          total_orders: number | null
          total_returns: number | null
          total_spent: number | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          address?: string | null
          block_reason?: string | null
          blocked_at?: string | null
          channels?: string[] | null
          city?: string | null
          created_at?: string
          email?: string | null
          first_order_date?: string | null
          id?: string
          is_blocked?: boolean | null
          last_order_date?: string | null
          name: string
          phone?: string | null
          pincode?: string | null
          source?: string | null
          state?: string | null
          total_orders?: number | null
          total_returns?: number | null
          total_spent?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          address?: string | null
          block_reason?: string | null
          blocked_at?: string | null
          channels?: string[] | null
          city?: string | null
          created_at?: string
          email?: string | null
          first_order_date?: string | null
          id?: string
          is_blocked?: boolean | null
          last_order_date?: string | null
          name?: string
          phone?: string | null
          pincode?: string | null
          source?: string | null
          state?: string | null
          total_orders?: number | null
          total_returns?: number | null
          total_spent?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      debit_notes: {
        Row: {
          cgst: number | null
          created_at: string
          created_by: string | null
          id: string
          igst: number | null
          note_date: string
          note_number: string
          order_id: string | null
          party_name: string
          reason: string | null
          sgst: number | null
          status: string | null
          total_amount: number
          vendor_id: string | null
        }
        Insert: {
          cgst?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          igst?: number | null
          note_date?: string
          note_number: string
          order_id?: string | null
          party_name: string
          reason?: string | null
          sgst?: number | null
          status?: string | null
          total_amount?: number
          vendor_id?: string | null
        }
        Update: {
          cgst?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          igst?: number | null
          note_date?: string
          note_number?: string
          order_id?: string | null
          party_name?: string
          reason?: string | null
          sgst?: number | null
          status?: string | null
          total_amount?: number
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debit_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      dropdown_options: {
        Row: {
          created_at: string | null
          field_type: string
          id: string
          is_default: boolean | null
          label: string
          sort_order: number | null
          value: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          field_type: string
          id?: string
          is_default?: boolean | null
          label: string
          sort_order?: number | null
          value: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          field_type?: string
          id?: string
          is_default?: boolean | null
          label?: string
          sort_order?: number | null
          value?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          biometric_id: string | null
          created_at: string
          department: string | null
          id: string
          join_date: string | null
          leaves_used: number | null
          monthly_salary: number | null
          name: string
          per_piece_rate: number | null
          phone: string | null
          role: string
          status: string | null
          total_leaves: number | null
          type: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          biometric_id?: string | null
          created_at?: string
          department?: string | null
          id?: string
          join_date?: string | null
          leaves_used?: number | null
          monthly_salary?: number | null
          name: string
          per_piece_rate?: number | null
          phone?: string | null
          role: string
          status?: string | null
          total_leaves?: number | null
          type?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          biometric_id?: string | null
          created_at?: string
          department?: string | null
          id?: string
          join_date?: string | null
          leaves_used?: number | null
          monthly_salary?: number | null
          name?: string
          per_piece_rate?: number | null
          phone?: string | null
          role?: string
          status?: string | null
          total_leaves?: number | null
          type?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          paid_by: string | null
          payment_mode: string | null
          receipt: boolean | null
          vendor_id: string | null
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          paid_by?: string | null
          payment_mode?: string | null
          receipt?: boolean | null
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          paid_by?: string | null
          payment_mode?: string | null
          receipt?: boolean | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          aging_days: number | null
          available_quantity: number | null
          brand: string | null
          channel_allocations: Json | null
          created_at: string
          id: string
          low_stock_threshold: number | null
          master_quantity: number | null
          portal: string | null
          product_name: string
          reserved_quantity: number | null
          sku_id: string
          updated_at: string
          vendor_id: string | null
          warehouse: string | null
        }
        Insert: {
          aging_days?: number | null
          available_quantity?: number | null
          brand?: string | null
          channel_allocations?: Json | null
          created_at?: string
          id?: string
          low_stock_threshold?: number | null
          master_quantity?: number | null
          portal?: string | null
          product_name: string
          reserved_quantity?: number | null
          sku_id: string
          updated_at?: string
          vendor_id?: string | null
          warehouse?: string | null
        }
        Update: {
          aging_days?: number | null
          available_quantity?: number | null
          brand?: string | null
          channel_allocations?: Json | null
          created_at?: string
          id?: string
          low_stock_threshold?: number | null
          master_quantity?: number | null
          portal?: string | null
          product_name?: string
          reserved_quantity?: number | null
          sku_id?: string
          updated_at?: string
          vendor_id?: string | null
          warehouse?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          gst_percent: number | null
          hsn_code: string | null
          id: string
          invoice_id: string
          product_name: string
          quantity: number
          rate: number
          total: number
        }
        Insert: {
          gst_percent?: number | null
          hsn_code?: string | null
          id?: string
          invoice_id: string
          product_name: string
          quantity?: number
          rate?: number
          total?: number
        }
        Update: {
          gst_percent?: number | null
          hsn_code?: string | null
          id?: string
          invoice_id?: string
          product_name?: string
          quantity?: number
          rate?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          cgst: number | null
          created_at: string
          created_by: string | null
          due_date: string | null
          finalized: boolean
          gstin: string | null
          id: string
          igst: number | null
          invoice_date: string
          invoice_number: string
          order_id: string | null
          party_name: string
          pdf_url: string | null
          sgst: number | null
          status: string | null
          total_amount: number
          type: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          cgst?: number | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          finalized?: boolean
          gstin?: string | null
          id?: string
          igst?: number | null
          invoice_date?: string
          invoice_number: string
          order_id?: string | null
          party_name: string
          pdf_url?: string | null
          sgst?: number | null
          status?: string | null
          total_amount?: number
          type?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          cgst?: number | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          finalized?: boolean
          gstin?: string | null
          id?: string
          igst?: number | null
          invoice_date?: string
          invoice_number?: string
          order_id?: string | null
          party_name?: string
          pdf_url?: string | null
          sgst?: number | null
          status?: string | null
          total_amount?: number
          type?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inward_stock: {
        Row: {
          created_at: string
          grn_number: string
          id: string
          items: Json
          notes: string | null
          po_id: string | null
          purchase_invoice_id: string | null
          quality_status: string | null
          received_by: string | null
          received_date: string
          supplier_name: string
          total_received: number | null
          total_rejected: number | null
          updated_at: string
          vendor_id: string | null
          warehouse: string | null
        }
        Insert: {
          created_at?: string
          grn_number: string
          id?: string
          items?: Json
          notes?: string | null
          po_id?: string | null
          purchase_invoice_id?: string | null
          quality_status?: string | null
          received_by?: string | null
          received_date?: string
          supplier_name: string
          total_received?: number | null
          total_rejected?: number | null
          updated_at?: string
          vendor_id?: string | null
          warehouse?: string | null
        }
        Update: {
          created_at?: string
          grn_number?: string
          id?: string
          items?: Json
          notes?: string | null
          po_id?: string | null
          purchase_invoice_id?: string | null
          quality_status?: string | null
          received_by?: string | null
          received_date?: string
          supplier_name?: string
          total_received?: number | null
          total_rejected?: number | null
          updated_at?: string
          vendor_id?: string | null
          warehouse?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inward_stock_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inward_stock_purchase_invoice_id_fkey"
            columns: ["purchase_invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          assigned_to: string | null
          city: string | null
          company_name: string
          contact_person: string
          created_at: string
          created_by: string | null
          email: string | null
          gstin: string | null
          id: string
          imported_via: string | null
          notes: string | null
          phone: string | null
          priority: Database["public"]["Enums"]["lead_priority"] | null
          source: string | null
          state: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          value: number | null
          vendor_id: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          city?: string | null
          company_name: string
          contact_person: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          imported_via?: string | null
          notes?: string | null
          phone?: string | null
          priority?: Database["public"]["Enums"]["lead_priority"] | null
          source?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          value?: number | null
          vendor_id?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          city?: string | null
          company_name?: string
          contact_person?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          imported_via?: string | null
          notes?: string | null
          phone?: string | null
          priority?: Database["public"]["Enums"]["lead_priority"] | null
          source?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          value?: number | null
          vendor_id?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          employee_id: string
          end_date: string
          id: string
          leave_type: string | null
          permission_from: string | null
          permission_to: string | null
          reason: string | null
          start_date: string
          status: string
          type: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          leave_type?: string | null
          permission_from?: string | null
          permission_to?: string | null
          reason?: string | null
          start_date: string
          status?: string
          type?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string | null
          permission_from?: string | null
          permission_to?: string | null
          reason?: string | null
          start_date?: string
          status?: string
          type?: string
          updated_at?: string
          vendor_id?: string | null
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
      marketing_config: {
        Row: {
          channel: string
          config: Json
          created_at: string
          enabled: boolean | null
          id: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          channel: string
          config?: Json
          created_at?: string
          enabled?: boolean | null
          id?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          channel?: string
          config?: Json
          created_at?: string
          enabled?: boolean | null
          id?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      onboarding_requests: {
        Row: {
          access_enabled: boolean | null
          business_name: string
          business_type: string | null
          created_at: string
          documents: string[] | null
          email: string
          gstin: string | null
          id: string
          owner_name: string
          phone: string | null
          platforms: string[] | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["onboarding_status"]
          subscription_expiry: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at: string
        }
        Insert: {
          access_enabled?: boolean | null
          business_name: string
          business_type?: string | null
          created_at?: string
          documents?: string[] | null
          email: string
          gstin?: string | null
          id?: string
          owner_name: string
          phone?: string | null
          platforms?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["onboarding_status"]
          subscription_expiry?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at?: string
        }
        Update: {
          access_enabled?: boolean | null
          business_name?: string
          business_type?: string | null
          created_at?: string
          documents?: string[] | null
          email?: string
          gstin?: string | null
          id?: string
          owner_name?: string
          phone?: string | null
          platforms?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["onboarding_status"]
          subscription_expiry?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          gst_percent: number | null
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sku: string | null
          total: number
          unit_price: number
        }
        Insert: {
          gst_percent?: number | null
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          sku?: string | null
          total?: number
          unit_price?: number
        }
        Update: {
          gst_percent?: number | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sku?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          commission: number | null
          created_at: string
          created_by: string | null
          customer_address: string | null
          customer_city: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          customer_pincode: string | null
          customer_state: string | null
          delivered_date: string | null
          id: string
          order_date: string
          order_number: string
          portal: string
          shipped_date: string | null
          shipping_fee: number | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
          vendor_id: string | null
          video_captured: boolean | null
          video_quality: string | null
        }
        Insert: {
          commission?: number | null
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_city?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_pincode?: string | null
          customer_state?: string | null
          delivered_date?: string | null
          id?: string
          order_date?: string
          order_number: string
          portal: string
          shipped_date?: string | null
          shipping_fee?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          vendor_id?: string | null
          video_captured?: boolean | null
          video_quality?: string | null
        }
        Update: {
          commission?: number | null
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_city?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_pincode?: string | null
          customer_state?: string | null
          delivered_date?: string | null
          id?: string
          order_date?: string
          order_number?: string
          portal?: string
          shipped_date?: string | null
          shipping_fee?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          vendor_id?: string | null
          video_captured?: boolean | null
          video_quality?: string | null
        }
        Relationships: []
      }
      product_health: {
        Row: {
          created_at: string
          id: string
          last_checked_at: string | null
          portal_status: Json
          product_id: string | null
          product_name: string
          rating: number | null
          review_count: number | null
          sku_mapping_id: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_checked_at?: string | null
          portal_status?: Json
          product_id?: string | null
          product_name: string
          rating?: number | null
          review_count?: number | null
          sku_mapping_id?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_checked_at?: string | null
          portal_status?: Json
          product_id?: string | null
          product_name?: string
          rating?: number | null
          review_count?: number | null
          sku_mapping_id?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_health_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_health_sku_mapping_id_fkey"
            columns: ["sku_mapping_id"]
            isOneToOne: false
            referencedRelation: "sku_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          brand: string | null
          category: string | null
          created_at: string
          created_by: string | null
          gst_percent: number | null
          hsn_code: string | null
          id: string
          image_url: string | null
          mrp: number
          name: string
          portals_enabled: string[] | null
          sku: string
          status: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          base_price?: number
          brand?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          gst_percent?: number | null
          hsn_code?: string | null
          id?: string
          image_url?: string | null
          mrp?: number
          name: string
          portals_enabled?: string[] | null
          sku: string
          status?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          base_price?: number
          brand?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          gst_percent?: number | null
          hsn_code?: string | null
          id?: string
          image_url?: string | null
          mrp?: number
          name?: string
          portals_enabled?: string[] | null
          sku?: string
          status?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_invoices: {
        Row: {
          bill_date: string
          bill_number: string
          cgst: number | null
          created_at: string
          due_date: string | null
          id: string
          igst: number | null
          items: Json
          notes: string | null
          payment_mode: string | null
          payment_status: string | null
          po_id: string | null
          sgst: number | null
          subtotal: number
          supplier_bill_number: string | null
          supplier_gstin: string | null
          supplier_name: string
          total_amount: number
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          bill_date?: string
          bill_number: string
          cgst?: number | null
          created_at?: string
          due_date?: string | null
          id?: string
          igst?: number | null
          items?: Json
          notes?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          po_id?: string | null
          sgst?: number | null
          subtotal?: number
          supplier_bill_number?: string | null
          supplier_gstin?: string | null
          supplier_name: string
          total_amount?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          bill_date?: string
          bill_number?: string
          cgst?: number | null
          created_at?: string
          due_date?: string | null
          id?: string
          igst?: number | null
          items?: Json
          notes?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          po_id?: string | null
          sgst?: number | null
          subtotal?: number
          supplier_bill_number?: string | null
          supplier_gstin?: string | null
          supplier_name?: string
          total_amount?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoices_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          cgst: number | null
          created_at: string
          created_by: string | null
          expected_delivery: string | null
          id: string
          igst: number | null
          items: Json
          notes: string | null
          order_date: string
          payment_terms: string | null
          po_number: string
          sgst: number | null
          status: string
          subtotal: number
          supplier_address: string | null
          supplier_email: string | null
          supplier_gstin: string | null
          supplier_name: string
          supplier_phone: string | null
          total_amount: number
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          cgst?: number | null
          created_at?: string
          created_by?: string | null
          expected_delivery?: string | null
          id?: string
          igst?: number | null
          items?: Json
          notes?: string | null
          order_date?: string
          payment_terms?: string | null
          po_number: string
          sgst?: number | null
          status?: string
          subtotal?: number
          supplier_address?: string | null
          supplier_email?: string | null
          supplier_gstin?: string | null
          supplier_name: string
          supplier_phone?: string | null
          total_amount?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          cgst?: number | null
          created_at?: string
          created_by?: string | null
          expected_delivery?: string | null
          id?: string
          igst?: number | null
          items?: Json
          notes?: string | null
          order_date?: string
          payment_terms?: string | null
          po_number?: string
          sgst?: number | null
          status?: string
          subtotal?: number
          supplier_address?: string | null
          supplier_email?: string | null
          supplier_gstin?: string | null
          supplier_name?: string
          supplier_phone?: string | null
          total_amount?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      reconciliation_logs: {
        Row: {
          created_at: string
          date: string
          difference: number | null
          expected_orders: number | null
          id: string
          notes: string | null
          portal: string
          processed_orders: number | null
          status: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          difference?: number | null
          expected_orders?: number | null
          id?: string
          notes?: string | null
          portal: string
          processed_orders?: number | null
          status?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          difference?: number | null
          expected_orders?: number | null
          id?: string
          notes?: string | null
          portal?: string
          processed_orders?: number | null
          status?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_by: string | null
          file_url: string | null
          format: string | null
          generated_at: string
          id: string
          name: string
          scheduled: boolean | null
          size: string | null
          type: string
          vendor_id: string | null
        }
        Insert: {
          created_by?: string | null
          file_url?: string | null
          format?: string | null
          generated_at?: string
          id?: string
          name: string
          scheduled?: boolean | null
          size?: string | null
          type: string
          vendor_id?: string | null
        }
        Update: {
          created_by?: string | null
          file_url?: string | null
          format?: string | null
          generated_at?: string
          id?: string
          name?: string
          scheduled?: boolean | null
          size?: string | null
          type?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      returns: {
        Row: {
          claim_status: string | null
          created_at: string
          customer_name: string
          evidence_urls: string[] | null
          id: string
          order_id: string | null
          order_number: string
          portal: string
          reason: string | null
          refund_amount: number | null
          requested_at: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["return_status"]
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          claim_status?: string | null
          created_at?: string
          customer_name: string
          evidence_urls?: string[] | null
          id?: string
          order_id?: string | null
          order_number: string
          portal: string
          reason?: string | null
          refund_amount?: number | null
          requested_at?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          claim_status?: string | null
          created_at?: string
          customer_name?: string
          evidence_urls?: string[] | null
          id?: string
          order_id?: string | null
          order_number?: string
          portal?: string
          reason?: string | null
          refund_amount?: number | null
          requested_at?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount: number
          commission: number | null
          created_at: string
          id: string
          locked: boolean
          net_amount: number
          portal: string
          reference_orders: string[] | null
          settlement_date: string | null
          settlement_id: string
          status: Database["public"]["Enums"]["settlement_status"]
          tax: number | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          amount?: number
          commission?: number | null
          created_at?: string
          id?: string
          locked?: boolean
          net_amount?: number
          portal: string
          reference_orders?: string[] | null
          settlement_date?: string | null
          settlement_id: string
          status?: Database["public"]["Enums"]["settlement_status"]
          tax?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          commission?: number | null
          created_at?: string
          id?: string
          locked?: boolean
          net_amount?: number
          portal?: string
          reference_orders?: string[] | null
          settlement_date?: string | null
          settlement_id?: string
          status?: Database["public"]["Enums"]["settlement_status"]
          tax?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      sku_mappings: {
        Row: {
          amazon_price: number | null
          amazon_sku: string | null
          amazon_url: string | null
          blinkit_price: number | null
          blinkit_sku: string | null
          blinkit_url: string | null
          brand: string | null
          created_at: string
          firstcry_price: number | null
          firstcry_sku: string | null
          firstcry_url: string | null
          flipkart_price: number | null
          flipkart_sku: string | null
          flipkart_url: string | null
          id: string
          master_sku_id: string
          meesho_price: number | null
          meesho_sku: string | null
          meesho_url: string | null
          mrp: number | null
          own_website_price: number | null
          own_website_sku: string | null
          own_website_url: string | null
          product_name: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          amazon_price?: number | null
          amazon_sku?: string | null
          amazon_url?: string | null
          blinkit_price?: number | null
          blinkit_sku?: string | null
          blinkit_url?: string | null
          brand?: string | null
          created_at?: string
          firstcry_price?: number | null
          firstcry_sku?: string | null
          firstcry_url?: string | null
          flipkart_price?: number | null
          flipkart_sku?: string | null
          flipkart_url?: string | null
          id?: string
          master_sku_id: string
          meesho_price?: number | null
          meesho_sku?: string | null
          meesho_url?: string | null
          mrp?: number | null
          own_website_price?: number | null
          own_website_sku?: string | null
          own_website_url?: string | null
          product_name: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          amazon_price?: number | null
          amazon_sku?: string | null
          amazon_url?: string | null
          blinkit_price?: number | null
          blinkit_sku?: string | null
          blinkit_url?: string | null
          brand?: string | null
          created_at?: string
          firstcry_price?: number | null
          firstcry_sku?: string | null
          firstcry_url?: string | null
          flipkart_price?: number | null
          flipkart_sku?: string | null
          flipkart_url?: string | null
          id?: string
          master_sku_id?: string
          meesho_price?: number | null
          meesho_sku?: string | null
          meesho_url?: string | null
          mrp?: number | null
          own_website_price?: number | null
          own_website_sku?: string | null
          own_website_url?: string | null
          product_name?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      social_messages: {
        Row: {
          ai_confidence: number | null
          auto_reply_flow: string | null
          auto_reply_triggered: boolean | null
          category: string | null
          channel: string
          conversation_history: Json | null
          converted_to_task: boolean | null
          created_at: string
          escalated_to: string | null
          follow_up_date: string | null
          follow_up_status: string | null
          human_replied: boolean | null
          id: string
          preview: string | null
          saved_to_contacts: boolean | null
          sender: string
          sender_phone: string | null
          status: string | null
          subject: string | null
          task_category: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          ai_confidence?: number | null
          auto_reply_flow?: string | null
          auto_reply_triggered?: boolean | null
          category?: string | null
          channel: string
          conversation_history?: Json | null
          converted_to_task?: boolean | null
          created_at?: string
          escalated_to?: string | null
          follow_up_date?: string | null
          follow_up_status?: string | null
          human_replied?: boolean | null
          id?: string
          preview?: string | null
          saved_to_contacts?: boolean | null
          sender: string
          sender_phone?: string | null
          status?: string | null
          subject?: string | null
          task_category?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          ai_confidence?: number | null
          auto_reply_flow?: string | null
          auto_reply_triggered?: boolean | null
          category?: string | null
          channel?: string
          conversation_history?: Json | null
          converted_to_task?: boolean | null
          created_at?: string
          escalated_to?: string | null
          follow_up_date?: string | null
          follow_up_status?: string | null
          human_replied?: boolean | null
          id?: string
          preview?: string | null
          saved_to_contacts?: boolean | null
          sender?: string
          sender_phone?: string | null
          status?: string | null
          subject?: string | null
          task_category?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      tailor_work: {
        Row: {
          completed: number | null
          created_at: string
          employee_id: string
          id: string
          pending: number | null
          product_name: string
          rate_per_piece: number | null
          received: number | null
          sku: string | null
          total_earned: number | null
          vendor_id: string | null
          work_date: string
        }
        Insert: {
          completed?: number | null
          created_at?: string
          employee_id: string
          id?: string
          pending?: number | null
          product_name: string
          rate_per_piece?: number | null
          received?: number | null
          sku?: string | null
          total_earned?: number | null
          vendor_id?: string | null
          work_date?: string
        }
        Update: {
          completed?: number | null
          created_at?: string
          employee_id?: string
          id?: string
          pending?: number | null
          product_name?: string
          rate_per_piece?: number | null
          received?: number | null
          sku?: string | null
          total_earned?: number | null
          vendor_id?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "tailor_work_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          portal: string | null
          priority: string
          status: string
          title: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          portal?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          portal?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          gst_address: string | null
          gst_business_name: string | null
          gst_number: string | null
          gst_status: string | null
          gst_verified: boolean | null
          id: string
          join_date: string | null
          name: string
          phone: string | null
          status: string | null
          subscription_plan: string | null
          subscription_status: string | null
          total_orders: number | null
          total_products: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          gst_address?: string | null
          gst_business_name?: string | null
          gst_number?: string | null
          gst_status?: string | null
          gst_verified?: boolean | null
          id?: string
          join_date?: string | null
          name: string
          phone?: string | null
          status?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          total_orders?: number | null
          total_products?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          gst_address?: string | null
          gst_business_name?: string | null
          gst_number?: string | null
          gst_status?: string | null
          gst_verified?: boolean | null
          id?: string
          join_date?: string | null
          name?: string
          phone?: string | null
          status?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          total_orders?: number | null
          total_products?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      videos: {
        Row: {
          captured_at: string | null
          created_at: string
          expires_at: string | null
          file_name: string | null
          file_size: string | null
          id: string
          internal_status: string | null
          invoice_image: boolean | null
          notes: string | null
          order_id: string
          resolution: string | null
          retention_days: number | null
          updated_at: string
          vendor_id: string | null
          verified_by: string | null
          video_status: string | null
        }
        Insert: {
          captured_at?: string | null
          created_at?: string
          expires_at?: string | null
          file_name?: string | null
          file_size?: string | null
          id?: string
          internal_status?: string | null
          invoice_image?: boolean | null
          notes?: string | null
          order_id: string
          resolution?: string | null
          retention_days?: number | null
          updated_at?: string
          vendor_id?: string | null
          verified_by?: string | null
          video_status?: string | null
        }
        Update: {
          captured_at?: string | null
          created_at?: string
          expires_at?: string | null
          file_name?: string | null
          file_size?: string | null
          id?: string
          internal_status?: string | null
          invoice_image?: boolean | null
          notes?: string | null
          order_id?: string
          resolution?: string | null
          retention_days?: number | null
          updated_at?: string
          vendor_id?: string | null
          verified_by?: string | null
          video_status?: string | null
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          capacity: number | null
          created_at: string
          id: string
          location: string | null
          name: string
          status: string | null
          storage_cost_per_day: number | null
          updated_at: string
          utilized: number | null
          vendor_id: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          id?: string
          location?: string | null
          name: string
          status?: string | null
          storage_cost_per_day?: number | null
          updated_at?: string
          utilized?: number | null
          vendor_id?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          status?: string | null
          storage_cost_per_day?: number | null
          updated_at?: string
          utilized?: number | null
          vendor_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_vendor_data: { Args: { _vendor_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "vendor" | "operations"
      lead_priority: "low" | "medium" | "high"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "negotiation"
        | "won"
        | "lost"
      onboarding_status: "submitted" | "under_review" | "approved" | "rejected"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "rto"
        | "returned"
      return_status:
        | "requested"
        | "approved"
        | "rejected"
        | "pickup_scheduled"
        | "picked_up"
        | "received"
        | "refund_initiated"
        | "closed"
      settlement_status:
        | "pending"
        | "processing"
        | "completed"
        | "disputed"
        | "failed"
      subscription_status:
        | "trial"
        | "fully_paid"
        | "partially_paid"
        | "expired"
        | "suspended"
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
      app_role: ["admin", "vendor", "operations"],
      lead_priority: ["low", "medium", "high"],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "negotiation",
        "won",
        "lost",
      ],
      onboarding_status: ["submitted", "under_review", "approved", "rejected"],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "rto",
        "returned",
      ],
      return_status: [
        "requested",
        "approved",
        "rejected",
        "pickup_scheduled",
        "picked_up",
        "received",
        "refund_initiated",
        "closed",
      ],
      settlement_status: [
        "pending",
        "processing",
        "completed",
        "disputed",
        "failed",
      ],
      subscription_status: [
        "trial",
        "fully_paid",
        "partially_paid",
        "expired",
        "suspended",
      ],
    },
  },
} as const
