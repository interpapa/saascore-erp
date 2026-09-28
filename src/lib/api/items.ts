import { supabase } from '@/lib/supabase';

export interface ItemMetadata {
  unit_of_measure?: string;
  min_stock?: number;
  max_stock?: number;
  location?: string;
  barcode?: string;
  preferred_supplier_name?: string;
  brand?: string;
  notes?: string;
  duration_minutes?: number;
  buffer_time_minutes?: number;
  is_group_session?: boolean;
  max_capacity?: number;
  [key: string]: unknown;
}

export interface Item {
  id: string;
  tenant_id: string | null;
  type: 'product' | 'service' | 'subscription';
  sku: string | null;
  name: string;
  description?: string | null;
  category?: string | null;
  base_price: number;
  cost: number;
  stock_quantity: number;
  metadata: ItemMetadata;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CreateItemInput = Omit<Item, 'id' | 'created_at' | 'updated_at' | 'tenant_id'> & { tenant_id?: string | null };

export async function getItems(type?: Item['type']) {
  let query = supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false });

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching items:', error.message, error.details, error.hint, error);
    throw error;
  }

  return data as Item[];
}

export async function createItem(item: CreateItemInput) {
  const { data, error } = await supabase
    .from('items')
    .insert([item])
    .select()
    .single();

  if (error) {
    console.error('Error creating item:', error);
    throw error;
  }

  return data as Item;
}

export async function updateItem(id: string, updates: Partial<CreateItemInput>) {
  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating item:', error);
    throw error;
  }

  return data as Item;
}

export async function deleteItem(id: string) {
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
}
