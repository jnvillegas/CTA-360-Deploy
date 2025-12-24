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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          appointment_type: string
          created_at: string
          created_by: string | null
          doctor_id: string
          duration_minutes: number
          id: string
          notes: string | null
          patient_id: string
          reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          appointment_type: string
          created_at?: string
          created_by?: string | null
          doctor_id: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          appointment_type?: string
          created_at?: string
          created_by?: string | null
          doctor_id?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id?: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_savings_cases: {
        Row: {
          created_at: string
          created_by: string | null
          current_medication: Json | null
          current_monthly_cost: number | null
          current_projected_cost: number | null
          current_projected_period_months: number | null
          diagnosis: string
          evaluating_doctor_id: string | null
          id: string
          initial_medication: Json
          initial_monthly_cost: number
          initial_projected_cost: number | null
          intervention_cost: number
          intervention_date: string | null
          intervention_description: string | null
          intervention_type: string
          medical_record_id: string | null
          monthly_savings: number | null
          observations: string | null
          patient_id: string
          prescription_id: string | null
          projected_period_months: number
          projected_savings: number | null
          savings_percentage: number | null
          status: Database["public"]["Enums"]["cost_savings_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_medication?: Json | null
          current_monthly_cost?: number | null
          current_projected_cost?: number | null
          current_projected_period_months?: number | null
          diagnosis: string
          evaluating_doctor_id?: string | null
          id?: string
          initial_medication: Json
          initial_monthly_cost: number
          initial_projected_cost?: number | null
          intervention_cost?: number
          intervention_date?: string | null
          intervention_description?: string | null
          intervention_type: string
          medical_record_id?: string | null
          monthly_savings?: number | null
          observations?: string | null
          patient_id: string
          prescription_id?: string | null
          projected_period_months: number
          projected_savings?: number | null
          savings_percentage?: number | null
          status?: Database["public"]["Enums"]["cost_savings_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_medication?: Json | null
          current_monthly_cost?: number | null
          current_projected_cost?: number | null
          current_projected_period_months?: number | null
          diagnosis?: string
          evaluating_doctor_id?: string | null
          id?: string
          initial_medication?: Json
          initial_monthly_cost?: number
          initial_projected_cost?: number | null
          intervention_cost?: number
          intervention_date?: string | null
          intervention_description?: string | null
          intervention_type?: string
          medical_record_id?: string | null
          monthly_savings?: number | null
          observations?: string | null
          patient_id?: string
          prescription_id?: string | null
          projected_period_months?: number
          projected_savings?: number | null
          savings_percentage?: number | null
          status?: Database["public"]["Enums"]["cost_savings_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_savings_cases_evaluating_doctor_id_fkey"
            columns: ["evaluating_doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_savings_cases_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_savings_cases_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_savings_cases_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_savings_documents: {
        Row: {
          case_id: string
          created_at: string
          description: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          uploaded_by: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          description?: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          description?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_savings_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cost_savings_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_savings_timeline: {
        Row: {
          case_id: string
          created_at: string
          description: string
          event_date: string
          event_type: Database["public"]["Enums"]["timeline_event_type"]
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          description: string
          event_date?: string
          event_type: Database["public"]["Enums"]["timeline_event_type"]
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          description?: string
          event_date?: string
          event_type?: Database["public"]["Enums"]["timeline_event_type"]
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_savings_timeline_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cost_savings_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          license_number: string | null
          phone: string | null
          specialty: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          license_number?: string | null
          phone?: string | null
          specialty: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          license_number?: string | null
          phone?: string | null
          specialty?: string
          updated_at?: string
        }
        Relationships: []
      }
      medical_records: {
        Row: {
          appointment_id: string | null
          attachments: Json | null
          chief_complaint: string | null
          created_at: string
          diagnosis: string | null
          doctor_id: string
          follow_up: string | null
          id: string
          lab_orders: string | null
          patient_id: string
          physical_exam: string | null
          prescriptions: string | null
          present_illness: string | null
          treatment_plan: string | null
          updated_at: string
          visit_date: string
        }
        Insert: {
          appointment_id?: string | null
          attachments?: Json | null
          chief_complaint?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id: string
          follow_up?: string | null
          id?: string
          lab_orders?: string | null
          patient_id: string
          physical_exam?: string | null
          prescriptions?: string | null
          present_illness?: string | null
          treatment_plan?: string | null
          updated_at?: string
          visit_date: string
        }
        Update: {
          appointment_id?: string | null
          attachments?: Json | null
          chief_complaint?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string
          follow_up?: string | null
          id?: string
          lab_orders?: string | null
          patient_id?: string
          physical_exam?: string | null
          prescriptions?: string | null
          present_illness?: string | null
          treatment_plan?: string | null
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          priority: Database["public"]["Enums"]["notification_priority"]
          read_at: string | null
          related_id: string | null
          related_table: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          related_id?: string | null
          related_table?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          related_id?: string | null
          related_table?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string | null
          birth_date: string
          blood_type: string | null
          chronic_conditions: string | null
          city: string | null
          copayment_percentage: number | null
          created_at: string
          created_by: string | null
          current_medications: string | null
          document_number: string
          document_type: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          gender: string
          id: string
          insurance_authorization_required: boolean | null
          insurance_number: string | null
          insurance_plan: string | null
          insurance_provider: string | null
          insurance_status: string | null
          is_judicial_case: boolean | null
          judicial_court: string | null
          judicial_file_number: string | null
          judicial_lawyer_contact: string | null
          judicial_lawyer_name: string | null
          judicial_notes: string | null
          judicial_status: string | null
          last_name: string
          mobile_phone: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          birth_date: string
          blood_type?: string | null
          chronic_conditions?: string | null
          city?: string | null
          copayment_percentage?: number | null
          created_at?: string
          created_by?: string | null
          current_medications?: string | null
          document_number: string
          document_type: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          gender: string
          id?: string
          insurance_authorization_required?: boolean | null
          insurance_number?: string | null
          insurance_plan?: string | null
          insurance_provider?: string | null
          insurance_status?: string | null
          is_judicial_case?: boolean | null
          judicial_court?: string | null
          judicial_file_number?: string | null
          judicial_lawyer_contact?: string | null
          judicial_lawyer_name?: string | null
          judicial_notes?: string | null
          judicial_status?: string | null
          last_name: string
          mobile_phone?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          allergies?: string | null
          birth_date?: string
          blood_type?: string | null
          chronic_conditions?: string | null
          city?: string | null
          copayment_percentage?: number | null
          created_at?: string
          created_by?: string | null
          current_medications?: string | null
          document_number?: string
          document_type?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          gender?: string
          id?: string
          insurance_authorization_required?: boolean | null
          insurance_number?: string | null
          insurance_plan?: string | null
          insurance_provider?: string | null
          insurance_status?: string | null
          is_judicial_case?: boolean | null
          judicial_court?: string | null
          judicial_file_number?: string | null
          judicial_lawyer_contact?: string | null
          judicial_lawyer_name?: string | null
          judicial_notes?: string | null
          judicial_status?: string | null
          last_name?: string
          mobile_phone?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          created_at: string
          diagnosis: string | null
          doctor_id: string
          id: string
          instructions: string | null
          medical_record_id: string | null
          medications: Json
          patient_id: string
          status: string
          updated_at: string
          valid_until: string
        }
        Insert: {
          created_at?: string
          diagnosis?: string | null
          doctor_id: string
          id?: string
          instructions?: string | null
          medical_record_id?: string | null
          medications: Json
          patient_id: string
          status?: string
          updated_at?: string
          valid_until: string
        }
        Update: {
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string
          id?: string
          instructions?: string | null
          medical_record_id?: string | null
          medications?: Json
          patient_id?: string
          status?: string
          updated_at?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          license_number: string | null
          phone: string | null
          role: string
          specialty: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          license_number?: string | null
          phone?: string | null
          role?: string
          specialty?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          license_number?: string | null
          phone?: string | null
          role?: string
          specialty?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      treatment_adherence: {
        Row: {
          authorization_days: number
          authorization_profile: Database["public"]["Enums"]["authorization_profile"]
          checkup_margin_days: number
          created_at: string
          created_by: string | null
          cycles_per_month: number
          daily_dose: number
          days_remaining: number | null
          dose_unit: string
          estimated_depletion_date: string | null
          id: string
          is_active: boolean
          managed_quantity: number
          medication_name: string
          next_authorization_start_date: string | null
          next_checkup_date: string | null
          notes: string | null
          patient_id: string
          payer_file_number: string
          payer_type: string
          prescription_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["adherence_status"]
          treatment_type: Database["public"]["Enums"]["treatment_type"]
          units_per_box: number
          updated_at: string
        }
        Insert: {
          authorization_days?: number
          authorization_profile?: Database["public"]["Enums"]["authorization_profile"]
          checkup_margin_days?: number
          created_at?: string
          created_by?: string | null
          cycles_per_month?: number
          daily_dose: number
          days_remaining?: number | null
          dose_unit?: string
          estimated_depletion_date?: string | null
          id?: string
          is_active?: boolean
          managed_quantity: number
          medication_name: string
          next_authorization_start_date?: string | null
          next_checkup_date?: string | null
          notes?: string | null
          patient_id: string
          payer_file_number: string
          payer_type: string
          prescription_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["adherence_status"]
          treatment_type?: Database["public"]["Enums"]["treatment_type"]
          units_per_box: number
          updated_at?: string
        }
        Update: {
          authorization_days?: number
          authorization_profile?: Database["public"]["Enums"]["authorization_profile"]
          checkup_margin_days?: number
          created_at?: string
          created_by?: string | null
          cycles_per_month?: number
          daily_dose?: number
          days_remaining?: number | null
          dose_unit?: string
          estimated_depletion_date?: string | null
          id?: string
          is_active?: boolean
          managed_quantity?: number
          medication_name?: string
          next_authorization_start_date?: string | null
          next_checkup_date?: string | null
          notes?: string | null
          patient_id?: string
          payer_file_number?: string
          payer_type?: string
          prescription_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["adherence_status"]
          treatment_type?: Database["public"]["Enums"]["treatment_type"]
          units_per_box?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_adherence_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_adherence_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      adherence_status: "sufficient" | "warning" | "critical" | "depleted"
      authorization_profile: "fast" | "medium" | "slow"
      cost_savings_status:
        | "en_evaluacion"
        | "intervenido"
        | "completado"
        | "sin_optimizacion"
      notification_priority: "low" | "medium" | "high" | "urgent"
      notification_type:
        | "appointment_reminder"
        | "prescription_expiring"
        | "case_assigned"
        | "case_status_changed"
        | "system_alert"
      timeline_event_type:
        | "created"
        | "status_change"
        | "intervention"
        | "note"
        | "completed"
      treatment_type: "prolonged" | "finish"
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
      adherence_status: ["sufficient", "warning", "critical", "depleted"],
      authorization_profile: ["fast", "medium", "slow"],
      cost_savings_status: [
        "en_evaluacion",
        "intervenido",
        "completado",
        "sin_optimizacion",
      ],
      notification_priority: ["low", "medium", "high", "urgent"],
      notification_type: [
        "appointment_reminder",
        "prescription_expiring",
        "case_assigned",
        "case_status_changed",
        "system_alert",
      ],
      timeline_event_type: [
        "created",
        "status_change",
        "intervention",
        "note",
        "completed",
      ],
      treatment_type: ["prolonged", "finish"],
    },
  },
} as const
