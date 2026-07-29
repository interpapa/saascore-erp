import { supabase } from '@/lib/supabase';

export interface Client {
  id: string;
  tenant_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  total_debt: number;
  created_at: string;
}

export type CreateClientInput = Omit<Client, 'id' | 'tenant_id' | 'created_at' | 'total_debt'>;

export async function getClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }

  return data as Client[];
}

export async function createClient(client: CreateClientInput) {
  // Obtenemos la sesión actual para inyectar el tenant_id
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('No authenticated user');

  const { data, error } = await supabase
    .from('clients')
    .insert([{
      ...client,
      tenant_id: session.user.id
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating client:', error);
    throw error;
  }

  return data as Client;
}

export async function updateClient(id: string, updates: Partial<CreateClientInput>) {
  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating client:', error);
    throw error;
  }

  return data as Client;
}

export async function deleteClient(id: string) {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
}
