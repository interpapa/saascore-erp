export interface RecordPhoto {
  id: string;
  url: string;
  name?: string;
  caption?: string;
  category?: 'foto_antes' | 'foto_despues' | 'rx' | 'receta' | 'general';
  created_at?: string;
}

export interface EntityRecord {
  id: string;
  tenant_id: string;
  entity_id: string;
  record_type: 'clinical_note' | 'dental_chart' | 'prescription' | 'visit_note' | 'custom';
  record_date: string;
  title: string;
  body: string;
  metadata?: {
    photos?: RecordPhoto[];
    [key: string]: any;
  };
  created_by?: string;
  created_at?: string;
}

export interface CreateEntityRecordInput {
  entity_id: string;
  record_type: 'clinical_note' | 'dental_chart' | 'prescription' | 'visit_note' | 'custom';
  record_date?: string;
  title: string;
  body: string;
  metadata?: {
    photos?: RecordPhoto[];
    [key: string]: any;
  };
}

export interface EntityAttachment {
  id: string;
  tenant_id: string;
  entity_id: string;
  record_id?: string | null;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  category: 'foto_antes' | 'foto_despues' | 'rx' | 'receta' | 'documento' | 'general';
  description?: string;
  uploaded_by?: string;
  created_at: string;
}

export interface CreateEntityAttachmentInput {
  entity_id: string;
  record_id?: string | null;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  category: 'foto_antes' | 'foto_despues' | 'rx' | 'receta' | 'documento' | 'general';
  description?: string;
}
