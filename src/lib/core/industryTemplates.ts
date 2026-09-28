export interface CustomFieldDefinition {
  id?: string;
  field_key: string;
  field_label: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  options?: string[];
  is_required?: boolean;
  applies_to?: string;
  sort_order?: number;
}

export type IndustryTemplate = 'medicina' | 'odontologia' | 'barberia_estetica' | 'taller_mecanico' | 'comercial_general';

export const INDUSTRY_TEMPLATES: Record<IndustryTemplate, { label: string; icon: string; fields: CustomFieldDefinition[] }> = {
  medicina: {
    label: 'Consultorio Médico / Clínica',
    icon: '🏥',
    fields: [
      { field_key: 'blood_type', field_label: 'Grupo Sanguíneo', field_type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], sort_order: 1 },
      { field_key: 'allergies', field_label: 'Alergias Conocidas', field_type: 'text', sort_order: 2 },
      { field_key: 'chronic_diseases', field_label: 'Patologías Crónicas', field_type: 'text', sort_order: 3 },
      { field_key: 'insurance_provider', field_label: 'Aseguradora / Póliza', field_type: 'text', sort_order: 4 },
      { field_key: 'emergency_phone', field_label: 'Contacto de Emergencia', field_type: 'text', sort_order: 5 },
    ]
  },
  odontologia: {
    label: 'Consultorio Odontológico',
    icon: '🦷',
    fields: [
      { field_key: 'anesthesia_sensitivity', field_label: 'Sensibilidad / Alergia a Anestesia', field_type: 'select', options: ['No presenta', 'Lidocaína', 'Mepivacaína', 'Otra'], sort_order: 1 },
      { field_key: 'brushing_frequency', field_label: 'Frecuencia de Cepillado', field_type: 'select', options: ['1 vez al día', '2 veces al día', '3 o más veces'], sort_order: 2 },
      { field_key: 'last_dental_cleaning', field_label: 'Última Limpieza Dental', field_type: 'date', sort_order: 3 },
      { field_key: 'has_orthodontics', field_label: 'Tratamiento Ortodoncia Activo', field_type: 'boolean', sort_order: 4 },
      { field_key: 'dental_notes', field_label: 'Observaciones Bucales', field_type: 'text', sort_order: 5 },
    ]
  },
  barberia_estetica: {
    label: 'Barbería / Peluquería / Estética',
    icon: '✂️',
    fields: [
      { field_key: 'preferred_style', field_label: 'Estilo / Corte Habitual', field_type: 'text', sort_order: 1 },
      { field_key: 'dye_shade', field_label: 'Tono / Tinte Habitual', field_type: 'text', sort_order: 2 },
      { field_key: 'skin_sensitivity', field_label: 'Sensibilidad en Cuero Cabelludo', field_type: 'select', options: ['Normal', 'Sensible', 'Muy Sensible'], sort_order: 3 },
      { field_key: 'courtesy_drink', field_label: 'Bebida de Cortesía Favorita', field_type: 'text', sort_order: 4 },
    ]
  },
  taller_mecanico: {
    label: 'Taller Mecánico / Automotriz',
    icon: '🚗',
    fields: [
      { field_key: 'vehicle_plate', field_label: 'Placa del Vehículo', field_type: 'text', sort_order: 1 },
      { field_key: 'vehicle_brand_model', field_label: 'Marca y Modelo', field_type: 'text', sort_order: 2 },
      { field_key: 'vehicle_year', field_label: 'Año del Vehículo', field_type: 'number', sort_order: 3 },
      { field_key: 'vin_serial', field_label: 'Serial de Carrocería (VIN)', field_type: 'text', sort_order: 4 },
      { field_key: 'last_mileage', field_label: 'Último Kilometraje', field_type: 'number', sort_order: 5 },
    ]
  },
  comercial_general: {
    label: 'Comercio General / Bodegón / Distribuidor',
    icon: '🏬',
    fields: [
      { field_key: 'credit_limit', field_label: 'Límite de Crédito ($)', field_type: 'number', sort_order: 1 },
      { field_key: 'payment_terms', field_label: 'Condición de Pago', field_type: 'select', options: ['Contado', '7 días', '15 días', '30 días'], sort_order: 2 },
      { field_key: 'client_category', field_label: 'Categoría de Cliente', field_type: 'select', options: ['Minorista', 'Mayorista', 'VIP', 'Corporativo'], sort_order: 3 },
      { field_key: 'sales_rep', field_label: 'Vendedor Asignado', field_type: 'text', sort_order: 4 },
    ]
  }
};
