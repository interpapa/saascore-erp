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
  type: 'invoice' | 'quote' | 'work_order';
  document_number: string | null;
  status: 'draft' | 'invoiced' | 'annulled';
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

  // Calculamos los totales en JS antes de enviar (Supabase también puede hacerlo en la DB, pero lo requerimos aquí para insertar)
  const subtotal_amount = lines.reduce((acc, line) => acc + (line.quantity * line.unit_price), 0);
  const tax_amount = lines.reduce((acc, line) => acc + line.tax_amount, 0);
  const total_amount = subtotal_amount + tax_amount;

  // Insertamos el documento principal
  const { data: newDoc, error: docError } = await supabase
    .from('documents')
    .insert([{ ...docData, subtotal_amount, tax_amount, total_amount }])
    .select()
    .single();

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
    // Idealmente haríamos rollback aquí si tuviéramos RPC, por ahora borramos el doc huérfano
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
