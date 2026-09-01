/**
 * SaaSCore ERP - Aging Engine (Cuentas por Cobrar AR & Cuentas por Pagar AP)
 * 
 * Calcula la antigüedad de saldos vencidos organizados en rangos temporales:
 * - Al día (0 a 30 días)
 * - 31 a 60 días
 * - 61 a 90 días
 * - Más de 90 días (Mora Crítica)
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface AgingBucket {
  entityId: string;
  entityName: string;
  entityType: 'customer' | 'supplier';
  current: number;       // 0 - 30 días
  days31to60: number;    // 31 - 60 días
  days61to90: number;    // 61 - 90 días
  over90: number;        // > 90 días
  totalDebt: number;
}

export async function calculateAgingReport(
  tenantId: string,
  type: 'customer' | 'supplier' = 'customer'
): Promise<{ success: boolean; data: AgingBucket[]; summary: { total: number; overdue: number }; error?: string }> {
  try {
    const docType = type === 'customer' ? 'invoice' : 'purchase_order';

    // Obtener documentos pendientes de cobro/pago
    const { data: docs, error } = await supabaseAdmin
      .from('documents')
      .select('id, entity_id, total_amount, created_at, status, entities(name)')
      .eq('tenant_id', tenantId)
      .eq('type', docType)
      .is('deleted_at', null);

    if (error) throw error;

    const bucketsMap = new Map<string, AgingBucket>();
    const now = Date.now();
    let grandTotal = 0;
    let grandOverdue = 0;

    for (const doc of docs || []) {
      if (!doc.entity_id) continue;
      const entityName = (doc.entities as { name?: string } | undefined)?.name ?? 'Desconocido';
      const docDate = new Date(doc.created_at).getTime();
      const ageDays = Math.floor((now - docDate) / (1000 * 60 * 60 * 24));
      const amount = Number(doc.total_amount || 0);

      let bucket = bucketsMap.get(doc.entity_id);
      if (!bucket) {
        bucket = {
          entityId: doc.entity_id,
          entityName,
          entityType: type,
          current: 0,
          days31to60: 0,
          days61to90: 0,
          over90: 0,
          totalDebt: 0,
        };
        bucketsMap.set(doc.entity_id, bucket);
      }

      bucket.totalDebt += amount;
      grandTotal += amount;

      if (ageDays <= 30) {
        bucket.current += amount;
      } else if (ageDays <= 60) {
        bucket.days31to60 += amount;
        grandOverdue += amount;
      } else if (ageDays <= 90) {
        bucket.days61to90 += amount;
        grandOverdue += amount;
      } else {
        bucket.over90 += amount;
        grandOverdue += amount;
      }
    }

    return {
      success: true,
      data: Array.from(bucketsMap.values()),
      summary: {
        total: Number(grandTotal.toFixed(2)),
        overdue: Number(grandOverdue.toFixed(2)),
      },
    };
  } catch (err: unknown) {
    console.error('[AgingEngine Error]:', (err as Error).message);
    return { success: false, data: [], summary: { total: 0, overdue: 0 }, error: (err as Error).message };
  }
}
