/**
 * Tipe database DEWIS yang digunakan hingga Tahap 6.
 * Regenerasikan dari Supabase CLI setelah perubahan skema lanjutan.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type AppRole = 'super_admin' | 'admin' | 'editor' | 'visitor'
export type PublicationStatus = 'draft' | 'published' | 'archived'
export type VerificationStatus = 'pending' | 'verified' | 'rejected'
export type CoordinateMethod = 'device_gps' | 'map_pin' | 'external_reference'
export type ReservationStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed'
export type MessageStatus = 'new' | 'read' | 'replied' | 'archived'

type Table<Row, Insert> = {
  Row: Row
  Insert: Insert
  Update: Partial<Insert>
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        { id: string; full_name: string | null; avatar_url: string | null; role: AppRole; is_active: boolean; created_at: string; updated_at: string },
        { id: string; full_name?: string | null; avatar_url?: string | null; role?: AppRole; is_active?: boolean; created_at?: string; updated_at?: string }
      >
      destinations: Table<
        { id: string; slug: string; name: string; category: string; eyebrow: string | null; description: string; image_url: string | null; status: string; details: string[]; data_source: string | null; data_status: string; updated_year: number | null; sort_order: number; latitude: number | null; longitude: number | null; gps_accuracy_m: number | null; coordinate_source: string | null; coordinate_method: CoordinateMethod | null; coordinate_captured_at: string | null; coordinate_updated_by: string | null; verification_status: VerificationStatus; verification_note: string | null; verified_at: string | null; verified_by: string | null; reviewed_at: string | null; reviewed_by: string | null; publication_status: PublicationStatus; created_by: string | null; created_at: string; updated_at: string },
        { id?: string; slug: string; name: string; category: string; eyebrow?: string | null; description?: string; image_url?: string | null; status?: string; details?: string[]; data_source?: string | null; data_status?: string; updated_year?: number | null; sort_order?: number; latitude?: number | null; longitude?: number | null; gps_accuracy_m?: number | null; coordinate_source?: string | null; coordinate_method?: CoordinateMethod | null; coordinate_captured_at?: string | null; coordinate_updated_by?: string | null; verification_status?: VerificationStatus; verification_note?: string | null; verified_at?: string | null; verified_by?: string | null; reviewed_at?: string | null; reviewed_by?: string | null; publication_status?: PublicationStatus; created_by?: string | null; created_at?: string; updated_at?: string }
      >
      destination_media: Table<
        { id: string; destination_id: string; storage_path: string; caption: string | null; alt_text: string; credit: string | null; is_cover: boolean; sort_order: number; is_published: boolean; uploaded_by: string | null; file_size_bytes: number | null; mime_type: string | null; created_at: string; updated_at: string },
        { id?: string; destination_id: string; storage_path: string; caption?: string | null; alt_text?: string; credit?: string | null; is_cover?: boolean; sort_order?: number; is_published?: boolean; uploaded_by?: string | null; file_size_bytes?: number | null; mime_type?: string | null; created_at?: string; updated_at?: string }
      >
      reservations: Table<
        { id: string; booking_code: string; destination_id: string; visitor_name: string; email: string | null; whatsapp: string; visit_date: string; participant_count: number; visitor_notes: string | null; status: ReservationStatus; admin_notes: string | null; processed_by: string | null; processed_at: string | null; privacy_consent_at: string | null; created_at: string; updated_at: string },
        { id?: string; booking_code?: string; destination_id: string; visitor_name: string; email?: string | null; whatsapp: string; visit_date: string; participant_count: number; visitor_notes?: string | null; status?: ReservationStatus; admin_notes?: string | null; processed_by?: string | null; processed_at?: string | null; privacy_consent_at?: string | null; created_at?: string; updated_at?: string }
      >
      contact_messages: Table<
        { id: string; visitor_name: string; email: string | null; phone: string | null; subject: string | null; message: string; status: MessageStatus; processed_by: string | null; processed_at: string | null; privacy_consent_at: string | null; created_at: string; updated_at: string },
        { id?: string; visitor_name: string; email?: string | null; phone?: string | null; subject?: string | null; message: string; status?: MessageStatus; processed_by?: string | null; processed_at?: string | null; privacy_consent_at?: string | null; created_at?: string; updated_at?: string }
      >
      site_settings: Table<
        { key: string; value: Json; is_public: boolean; updated_by: string | null; updated_at: string },
        { key: string; value?: Json; is_public?: boolean; updated_by?: string | null; updated_at?: string }
      >
      audit_logs: Table<
        { id: string; user_id: string | null; action: string; entity_table: string | null; entity_id: string | null; summary: string | null; metadata: Json; created_at: string },
        { id?: string; user_id?: string | null; action: string; entity_table?: string | null; entity_id?: string | null; summary?: string | null; metadata?: Json; created_at?: string }
      >
    }
    Views: Record<string, never>
    Functions: {
      current_app_role: { Args: Record<PropertyKey, never>; Returns: AppRole | null }
      set_destination_media_cover: { Args: { p_media_id: string }; Returns: undefined }
      submit_public_reservation: { Args: { p_destination_id: string; p_visitor_name: string; p_email: string | null; p_whatsapp: string; p_visit_date: string; p_participant_count: number; p_visitor_notes: string | null; p_privacy_consent: boolean }; Returns: { booking_code: string }[] }
      submit_public_contact_message: { Args: { p_visitor_name: string; p_email: string | null; p_phone: string | null; p_subject: string | null; p_message: string; p_privacy_consent: boolean }; Returns: boolean }
    }
    Enums: { app_role: AppRole }
    CompositeTypes: Record<string, never>
  }
}
