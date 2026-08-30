import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ActionActor } from '@/app/actions/entities';

export interface BankAccount {
  id: string;
  tenant_id: string;
  bank_name: string;
  account_type: string;
  account_number: string;
  holder_name: string;
  notes?: string;
}

export async function getBankAccountsAction(tenantId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('bank_accounts')
      .select('*')
      .eq('tenant_id', tenantId);
    if (error) throw error;
    return { success: true, accounts: data as BankAccount[] };
  } catch (err: any) {
    console.error('[getBankAccountsAction]', err);
    return { success: false, error: err.message };
  }
}

export async function createBankAccountAction(
  input: Omit<BankAccount, 'id' | 'tenant_id'>,
  tenantId: string,
  actor: ActionActor,
) {
  try {
    const { error, data } = await supabaseAdmin
      .from('bank_accounts')
      .insert({ ...input, tenant_id: tenantId })
      .single();
    if (error) throw error;
    return { success: true, account: data as BankAccount };
  } catch (err: any) {
    console.error('[createBankAccountAction]', err);
    return { success: false, error: err.message };
  }
}
