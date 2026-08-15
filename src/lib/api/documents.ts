import { supabase } from '@/lib/supabase';

export interface DocumentLine {
  id?: string;
  document_id?: string;
  item_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_amount: number;
  subtotal?: number;
  total?: number;
  metadata?: Record<string, any>;
}

export interface Document {
  id: string;
  entity_id: string;
  type: 'invoice' | 'quote' | 'work_order' | 'purchase_order' | 'whatsapp_log' | 'journal_entry' | 'payroll_slip';
  document_number: string | null;
  status: 'draft' | 'in_progress' | 'invoiced' | 'annulled' | 'paid' | 'partial';
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  issue_date: string;
  due_date: string | null;
  metadata: Record<string, any>;
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Joins
  lines?: DocumentLine[];
  entity?: any;
}

export type CreateDocumentInput = Omit<Document, 'id' | 'created_at' | 'updated_at' | 'subtotal_amount' | 'total_amount' | 'tax_amount'> & {
  tenant_id?: string;
  lines: Omit<DocumentLine, 'id' | 'document_id' | 'subtotal' | 'total'>[];
};

export async function createDocumentWithLines(data: CreateDocumentInput) {
  const { lines, ...docData } = data;

  // Calculamos los totales en JS antes de enviar
  const subtotal_amount = lines.reduce((acc, line) => acc + (line.quantity * line.unit_price), 0);
  const tax_amount = lines.reduce((acc, line) => acc + line.tax_amount, 0);
  const total_amount = subtotal_amount + tax_amount;

  // Adaptar el tipo de documento según compatibilidad de base de datos
  let finalType = docData.type;
  if (finalType === 'quote') {
    finalType = 'quotation' as any; // schema_v1 usa 'quotation'
  }

  let insertData: any = {
    ...docData,
    type: finalType,
    subtotal_amount,
    tax_amount,
    total_amount,
  };

  // Insertamos el documento principal
  let { data: newDoc, error: docError } = await supabase
    .from('documents')
    .insert([insertData])
    .select()
    .single();

  if (docError && (docError.message.includes('due_date') || docError.message.includes('issue_date') || docError.message.includes('notes') || docError.message.includes('column'))) {
    // Fallback A: If DB schema is missing issue_date / due_date / notes columns (schema_v1)
    const cleanInsert = { ...insertData };
    delete cleanInsert.issue_date;
    delete cleanInsert.due_date;
    delete cleanInsert.notes;
    
    cleanInsert.metadata = {
      ...cleanInsert.metadata,
      issue_date: docData.issue_date,
      due_date: docData.due_date,
      notes: docData.notes,
    };

    const retry = await supabase
      .from('documents')
      .insert([cleanInsert])
      .select()
      .single();
    
    newDoc = retry.data;
    docError = retry.error;
  }

  if (docError && (docError.message.includes('constraint') || docError.message.includes('type'))) {
    // Fallback B: If DB fails due to document type CHECK constraints (e.g. quote, service_order, etc.)
    // Store type: 'invoice' (always supported) and save real type in metadata
    const cleanInsert = { ...insertData };
    delete cleanInsert.issue_date;
    delete cleanInsert.due_date;
    delete cleanInsert.notes;
    
    cleanInsert.type = 'invoice';
    cleanInsert.metadata = {
      ...cleanInsert.metadata,
      real_type: docData.type,
      issue_date: docData.issue_date,
      due_date: docData.due_date,
      notes: docData.notes,
    };

    const retry = await supabase
      .from('documents')
      .insert([cleanInsert])
      .select()
      .single();
    
    newDoc = retry.data;
    docError = retry.error;
  }

  if (docError) {
    console.error('Error creating document:', docError.message, docError.details, docError);
    throw docError;
  }

  // Insertamos las líneas atadas al ID del documento recién creado
  const linesToInsert = lines.map(line => ({
    ...line,
    document_id: newDoc.id
  }));

  const { error: linesError } = await supabase
    .from('document_lines')
    .insert(linesToInsert);

  if (linesError) {
    console.error('Error creating document lines:', linesError.message, linesError.details, linesError);
    await supabase.from('documents').delete().eq('id', newDoc.id);
    throw linesError;
  }

  return newDoc as Document;
}

export async function getDocuments(type?: Document['type']) {
  let query = supabase
    .from('documents')
    .select(`
      *,
      entity:entities (name, type, metadata)
    `)
    .order('created_at', { ascending: false });

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching documents:', error.message, error.details, error);
    throw error;
  }

  return data as Document[];
}

export async function updateDocumentStatus(id: string, status: Document['status']) {
  const { data, error } = await supabase
    .from('documents')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating document status:', error);
    throw error;
  }

  return data as Document;
}
