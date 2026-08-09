import { supabase } from '@/lib/supabase';

export interface Entity {
  id: string;
  tenant_id: string | null;
  type: 'customer' | 'supplier' | 'employee' | 'lead' | 'branch';
  name: string;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  address: string | null;
  metadata: Record<string, any>;
  status: string;
  created_at: string;
  updated_at: string;
}

export type CreateEntityInput = Omit<Entity, 'id' | 'created_at' | 'updated_at' | 'tenant_id'> & { tenant_id?: string | null };

export async function getEntities(type?: Entity['type']) {
  let query = supabase
    .from('entities')
    .select('*')
    .order('created_at', { ascending: false });

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching entities:', error.message, error.details, error.hint, error);
    throw error;
  }

  return data as Entity[];
}

export async function createEntity(entity: CreateEntityInput) {
  const { data, error } = await supabase
    .from('entities')
    .insert([entity])
    .select()
    .single();

  if (error) {
    console.error('Error creating entity:', error);
    throw error;
  }

  return data as Entity;
}

export async function updateEntity(id: string, updates: Partial<CreateEntityInput>) {
  const { data, error } = await supabase
    .from('entities')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating entity:', error);
    throw error;
  }

  return data as Entity;
}

export async function deleteEntity(id: string) {
  const { error } = await supabase
    .from('entities')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting entity:', error);
    throw error;
  }
}
