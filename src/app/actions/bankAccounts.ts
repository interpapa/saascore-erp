'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ActionActor } from '@/app/actions/entities';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';

export interface BankAccount {
  id: string;
  tenant_id: string;
  bank_name: string;
  account_type: string; // 'corriente' | 'ahorro' | 'pago_movil' | 'zelle' | 'otro'
  account_number: string;
  holder_name: string;
  tax_id?: string; // Cédula / RIF del titular
  phone?: string; // Teléfono para Pago Móvil
  email?: string; // Correo para Zelle / PayPal
  notes?: string;
  created_at?: string;
}

function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const code = error.code || '';
  const msg = (error.message || '').toLowerCase();
  return (
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
}

export async function getBankAccountsAction(tenantId: string, actor: ActionActor) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.', accounts: [] };
    }

    if (!tenantId) {
      return { success: true, accounts: [] };
    }

    // 1. Intentar consultar tabla física
    const { data, error } = await supabaseAdmin
      .from('bank_accounts')
      .select('*')
      .eq('tenant_id', tenantId);

    if (!error && data && data.length > 0) {
      return { success: true, accounts: data as BankAccount[] };
    }

    // 2. Fallback a tenants.metadata.bank_accounts
    try {
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('metadata')
        .eq('id', tenantId)
        .maybeSingle();

      const emulated = Array.isArray(tenant?.metadata?.bank_accounts) ? tenant.metadata.bank_accounts : [];
      return { success: true, accounts: emulated as BankAccount[] };
    } catch (fallbackErr) {
      console.warn('[getBankAccountsAction] Fallback error:', fallbackErr);
      return { success: true, accounts: [] };
    }
  } catch (err: any) {
    console.error('[getBankAccountsAction]', err);
    return { success: false, error: (err as Error).message, accounts: [] };
  }
}

export async function createBankAccountAction(
  input: Omit<BankAccount, 'id' | 'tenant_id'>,
  tenantId: string,
  actor: ActionActor,
) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!tenantId || !input.bank_name || !input.holder_name) {
      return { success: false, error: 'Banco y Nombre del Titular son obligatorios.' };
    }

    const newAccount: BankAccount = {
      id: `acc-${Date.now()}-${Math.random().toString(36).slice(-4)}`,
      tenant_id: tenantId,
      ...input,
      created_at: new Date().toISOString(),
    };

    // 1. Intentar insertar en tabla física
    const { error, data } = await supabaseAdmin
      .from('bank_accounts')
      .insert({ ...input, tenant_id: tenantId })
      .select()
      .single();

    if (!error && data) {
      return { success: true, account: data as BankAccount };
    }

    // 2. Fallback a tenants.metadata.bank_accounts si la tabla no existe o falla
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .maybeSingle();

    if (tenant) {
      const currentAccounts = Array.isArray(tenant.metadata?.bank_accounts) ? tenant.metadata.bank_accounts : [];
      const updatedAccounts = [newAccount, ...currentAccounts];
      await supabaseAdmin
        .from('tenants')
        .update({
          metadata: {
            ...(tenant.metadata || {}),
            bank_accounts: updatedAccounts,
          },
        })
        .eq('id', tenantId);

      return { success: true, account: newAccount };
    }

    throw new Error(error?.message || 'No se pudo guardar la cuenta bancaria.');
  } catch (err: any) {
    console.error('[createBankAccountAction]', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteBankAccountAction(
  accountId: string,
  tenantId: string,
  actor: ActionActor
) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!tenantId || !accountId) {
      return { success: false, error: 'ID de cuenta y empresa son requeridos.' };
    }

    // 1. Intentar borrar en tabla física
    await supabaseAdmin
      .from('bank_accounts')
      .delete()
      .eq('id', accountId)
      .eq('tenant_id', tenantId);

    // 2. Fallback a tenants.metadata.bank_accounts
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .maybeSingle();

    if (tenant && Array.isArray(tenant.metadata?.bank_accounts)) {
      const filtered = tenant.metadata.bank_accounts.filter((a: any) => a.id !== accountId);
      await supabaseAdmin
        .from('tenants')
        .update({
          metadata: {
            ...(tenant.metadata || {}),
            bank_accounts: filtered,
          },
        })
        .eq('id', tenantId);
    }

    return { success: true };
  } catch (err: any) {
    console.error('[deleteBankAccountAction Error]:', err);
    return { success: false, error: (err as Error).message };
  }
}

