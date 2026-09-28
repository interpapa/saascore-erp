'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ActionActor } from './entities';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';

export interface CustomerHistoryItem {
  id: string;
  document_number: string;
  created_at: string;
  doc_label: string;
  doc_subtype: string;
  total_amount: number;
  total_local: number;
  currency_symbol: string;
  payment_method: string;
  processed_by: string;
  status: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[];
}

export interface CustomerHistoryResult {
  customer: {
    id: string;
    name: string;
    tax_id: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    created_at: string;
  };
  metrics: {
    totalSpentUSD: number;
    totalSpentVES: number;
    purchaseCount: number;
    averageTicketUSD: number;
    lastPurchaseDate: string | null;
    favoritePaymentMethod: string;
  };
  purchases: CustomerHistoryItem[];
}

export async function getCustomerHistoryAction(
  tenantId: string,
  customerId: string,
  actor: ActionActor
): Promise<{ success: boolean; data?: CustomerHistoryResult; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!tenantId || !customerId || customerId === 'generic_counter_customer') {
      return { success: false, error: 'Cliente no válido para consulta de historial.' };
    }

    // 1. Obtener datos del cliente
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('entities')
      .select('id, name, tax_id, phone, email, address, created_at')
      .eq('id', customerId)
      .eq('tenant_id', tenantId)
      .single();

    if (customerError || !customer) {
      return { success: false, error: 'Cliente no encontrado.' };
    }

    // 2. Obtener últimas 25 ventas emitidas al cliente
    const { data: documents, error: docsError } = await supabaseAdmin
      .from('documents')
      .select('id, document_number, total_amount, metadata, created_at')
      .eq('tenant_id', tenantId)
      .eq('entity_id', customerId)
      .eq('type', 'invoice')
      .order('created_at', { ascending: false })
      .limit(25);

    if (docsError) {
      console.warn('Error al buscar compras del cliente:', docsError.message);
    }

    const docsList = documents || [];
    let totalSpentUSD = 0;
    let totalSpentVES = 0;
    const paymentMethodCounts: Record<string, number> = {};

    const purchases: CustomerHistoryItem[] = docsList.map((doc: any) => {
      const totalUSD = Number(doc.total_amount) || 0;
      totalSpentUSD += totalUSD;

      const rate = Number(doc.metadata?.exchange_rate) || 36.5;
      const totalVES = Number(doc.metadata?.total_local) || (totalUSD * rate);
      totalSpentVES += totalVES;

      const method = doc.metadata?.payment_method || 'Efectivo';
      paymentMethodCounts[method] = (paymentMethodCounts[method] || 0) + 1;

      const rawLines = doc.metadata?.cart_lines || [];
      const items = Array.isArray(rawLines)
        ? rawLines.map((l: any) => ({
            description: l.description || 'Producto',
            quantity: Number(l.quantity) || 1,
            unit_price: Number(l.unit_price) || 0,
            total: Number(l.total) || (Number(l.unit_price || 0) * Number(l.quantity || 1))
          }))
        : [];

      return {
        id: doc.id,
        document_number: doc.document_number || 'DOC-S/N',
        created_at: doc.created_at,
        doc_label: doc.metadata?.doc_label || (doc.metadata?.charge_taxes ? 'Factura Fiscal' : 'Orden de Entrega'),
        doc_subtype: doc.metadata?.doc_subtype || (doc.metadata?.charge_taxes ? 'fiscal_invoice' : 'delivery_order'),
        total_amount: totalUSD,
        total_local: totalVES,
        currency_symbol: doc.metadata?.currency_symbol || 'Bs.',
        payment_method: method,
        processed_by: doc.metadata?.processed_by || 'Caja',
        status: doc.status || 'invoiced',
        items
      };
    });

    // Calcular método preferido
    let favoritePaymentMethod = 'Efectivo';
    let maxCount = 0;
    for (const [method, count] of Object.entries(paymentMethodCounts)) {
      if (count > maxCount) {
        maxCount = count;
        favoritePaymentMethod = method;
      }
    }

    const purchaseCount = docsList.length;
    const averageTicketUSD = purchaseCount > 0 ? Number((totalSpentUSD / purchaseCount).toFixed(2)) : 0;

    return {
      success: true,
      data: {
        customer: {
          id: customer.id,
          name: customer.name,
          tax_id: customer.tax_id,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          created_at: customer.created_at
        },
        metrics: {
          totalSpentUSD: Number(totalSpentUSD.toFixed(2)),
          totalSpentVES: Number(totalSpentVES.toFixed(2)),
          purchaseCount,
          averageTicketUSD,
          lastPurchaseDate: docsList[0]?.created_at || null,
          favoritePaymentMethod: purchaseCount > 0 ? favoritePaymentMethod : 'N/A'
        },
        purchases
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al obtener historial del cliente.' };
  }
}
