'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { revalidatePath } from 'next/cache';
import { ActionActor } from './entities';
import Decimal from 'decimal.js';
import { sanitizeUUID } from '@/lib/core/uuid';
import { createKernelJournalEntry } from '@/lib/core/kernel/ledgerKernel';
import {
  createProvidencia00093Document,
  FiscalPartyInfo,
  FiscalDocumentLineInput,
  DigitalInvoicePayload,
  sanitizeVenezuelanTaxId,
} from '@/lib/fiscal/digitalInvoicing';

export interface CreateProvidencia00093InvoiceInput {
  entity_id?: string | null;
  document_number?: string;
  control_number?: string;
  control_range?: string;
  seller: FiscalPartyInfo;
  buyer: FiscalPartyInfo;
  lines: FiscalDocumentLineInput[];
  bcv_rate: number;
  bcv_rate_date?: string;
  apply_igtf?: boolean;
  retention_iva_rate?: number; // 75 o 100
  retention_islr_rate?: number; // 1, 2 o 5
  retention_voucher_number?: string;
  contingency_mode?: boolean;
  notes?: string | null;
}

/**
 * Genera el siguiente número de control telemático de imprenta digital para el tenant.
 * Formato: 00-000001, 00-000002...
 */
async function generateNextControlNumber(tenantId: string): Promise<string> {
  try {
    const { data: lastDoc } = await supabaseAdmin
      .from('documents')
      .select('metadata')
      .eq('tenant_id', tenantId)
      .eq('type', 'invoice')
      .order('created_at', { ascending: false })
      .limit(20);

    let nextSeq = 1;
    if (lastDoc && lastDoc.length > 0) {
      for (const d of lastDoc) {
        const meta = (typeof d.metadata === 'object' && d.metadata !== null) ? (d.metadata as Record<string, any>) : {};
        const ctrl = meta.control_number || meta.digital_invoice?.controlNumber;
        if (ctrl && typeof ctrl === 'string') {
          const match = ctrl.match(/(\d+)$/);
          if (match) {
            nextSeq = Math.max(nextSeq, parseInt(match[1], 10) + 1);
            break;
          }
        }
      }
    }

    return `00-${String(nextSeq).padStart(6, '0')}`;
  } catch {
    return `00-${String(Date.now()).slice(-6)}`;
  }
}

/**
 * Genera el siguiente folio de factura ordinario (FAC-000001).
 */
async function generateNextInvoiceNumber(tenantId: string): Promise<string> {
  try {
    const { data: lastDoc } = await supabaseAdmin
      .from('documents')
      .select('document_number')
      .eq('tenant_id', tenantId)
      .eq('type', 'invoice')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextSeq = 1;
    if (lastDoc?.document_number) {
      const match = lastDoc.document_number.match(/(\d+)$/);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    } else {
      const { count } = await supabaseAdmin
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('type', 'invoice');
      nextSeq = (count || 0) + 1;
    }

    return `FAC-${String(nextSeq).padStart(6, '0')}`;
  } catch {
    return `FAC-${String(Date.now()).slice(-6)}`;
  }
}

/**
 * Emite una Factura Digital conforme a la Providencia Administrativa N.º SNAT/2026/00093.
 * Incluye marca temporal con segundos, bimoneda BCV, domicilio fiscal del comprador,
 * hash SHA-256, QR y asiento contable NIIF con retenciones de IVA/ISLR.
 */
export async function createProvidencia00093InvoiceAction(
  input: CreateProvidencia00093InvoiceInput,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; document?: any; digitalInvoice?: DigitalInvoicePayload; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }
    if (!tenantId) throw new Error('Empresa (tenant_id) requerida.');

    if (!input.lines || input.lines.length === 0) {
      return { success: false, error: 'La factura debe contener al menos una línea de producto o servicio.' };
    }

    // 1. Resolver números fiscales y de control telemático
    const docNumber = input.document_number || (await generateNextInvoiceNumber(tenantId));
    const controlNumber = input.control_number || (await generateNextControlNumber(tenantId));
    const controlRange = input.control_range || 'Desde N° 00-000001 hasta N° 00-500000';

    // 2. Construir el documento canónico validado de la Providencia 00093
    const digitalInvoice = createProvidencia00093Document({
      documentNumber: docNumber,
      controlNumber,
      controlRange,
      seller: input.seller,
      buyer: input.buyer,
      lines: input.lines,
      bcvRate: input.bcv_rate,
      bcvRateDate: input.bcv_rate_date,
      applyIgtf: input.apply_igtf,
      retentionIvaRate: input.retention_iva_rate,
      retentionIslrRate: input.retention_islr_rate,
      retentionVoucherNumber: input.retention_voucher_number,
      contingencyMode: input.contingency_mode,
    });

    const safeEntityId = input.entity_id && input.entity_id !== tenantId
      ? sanitizeUUID(input.entity_id) || null
      : null;

    // 3. Estructurar inserción en tabla documents
    const insertData: any = {
      tenant_id: tenantId,
      entity_id: safeEntityId,
      type: 'invoice',
      status: digitalInvoice.totals.netPayableUsd === 0 ? 'paid' : 'invoiced',
      document_number: digitalInvoice.documentNumber,
      subtotal_amount: digitalInvoice.totals.taxableAmountUsd + digitalInvoice.totals.exemptAmountUsd,
      tax_amount: digitalInvoice.totals.ivaAmountUsd,
      total_amount: digitalInvoice.totals.totalAmountUsd,
      issue_date: digitalInvoice.issueTimestamp,
      notes: input.notes || null,
      metadata: {
        providencia: 'SNAT/2026/00093',
        gaceta_oficial: '43.484',
        digital_invoice: digitalInvoice,
        control_number: digitalInvoice.controlNumber,
        control_range: digitalInvoice.controlRange,
        digital_hash_sha256: digitalInvoice.digitalHashSha256,
        qr_payload: digitalInvoice.qrPayload,
        bcv_rate: digitalInvoice.totals.bcvRate,
        bcv_rate_date: digitalInvoice.totals.bcvRateDate,
        total_ves: digitalInvoice.totals.totalAmountVes,
        net_payable_usd: digitalInvoice.totals.netPayableUsd,
        net_payable_ves: digitalInvoice.totals.netPayableVes,
        buyer_fiscal_address: digitalInvoice.buyer.fiscalAddress,
        buyer_tax_id: digitalInvoice.buyer.taxId,
        buyer_business_name: digitalInvoice.buyer.businessName,
        retentions: {
          voucher_number: digitalInvoice.totals.retentionVoucherNumber,
          iva_rate: digitalInvoice.totals.retentionIvaRate,
          iva_amount_usd: digitalInvoice.totals.retentionIvaAmountUsd,
          iva_amount_ves: digitalInvoice.totals.retentionIvaAmountVes,
          islr_rate: digitalInvoice.totals.retentionIslrRate,
          islr_amount_usd: digitalInvoice.totals.retentionIslrAmountUsd,
          islr_amount_ves: digitalInvoice.totals.retentionIslrAmountVes,
        },
        contingency_mode: digitalInvoice.contingencyMode,
        created_by: actor.email,
        lines: digitalInvoice.lines,
      },
    };

    let { data: newDoc, error: docError } = await supabaseAdmin
      .from('documents')
      .insert([insertData])
      .select()
      .single();

    // Fallback de resiliencia si columnas nativas no existen en la base de datos
    if (docError && (docError.message.includes('column') || docError.message.includes('schema') || docError.message.includes('notes'))) {
      delete insertData.issue_date;
      delete insertData.notes;
      const retry = await supabaseAdmin.from('documents').insert([insertData]).select().single();
      newDoc = retry.data;
      docError = retry.error;
    }

    if (docError) {
      throw new Error('Error al registrar factura digital en documents: ' + docError.message);
    }

    // 4. Inserción de líneas en document_lines
    if (digitalInvoice.lines.length > 0) {
      const linesToInsert = digitalInvoice.lines.map((l) => ({
        document_id: newDoc.id,
        item_id: sanitizeUUID(l.itemId) || null,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unitPriceUsd,
        tax_amount: l.taxAmountUsd,
      }));

      const { error: linesError } = await supabaseAdmin.from('document_lines').insert(linesToInsert);
      if (linesError) {
        console.warn('Nota: Inserción en document_lines omitida; líneas preservadas en metadata.lines');
      }
    }

    // 5. Asiento Contable Automático de Partida Doble NIIF
    try {
      const journalLines: Array<{ account_code: string; account_name: string; debit: number; credit: number; description?: string }> = [];

      // A. Cuentas por Cobrar (Clientes) por el monto neto a cobrar
      if (digitalInvoice.totals.netPayableUsd > 0) {
        journalLines.push({
          account_code: '1.1.02.01',
          account_name: 'Cuentas por Cobrar (Clientes)',
          debit: digitalInvoice.totals.netPayableUsd,
          credit: 0,
          description: `Factura Digital ${digitalInvoice.documentNumber} - ${digitalInvoice.buyer.businessName}`,
        });
      }

      // B. Anticipo de IVA Retenido (75% / 100%) si el cliente es Contribuyente Especial
      if (digitalInvoice.totals.retentionIvaAmountUsd && digitalInvoice.totals.retentionIvaAmountUsd > 0) {
        journalLines.push({
          account_code: '1.1.03.01',
          account_name: 'Anticipo de Impuestos - Retención IVA por Compensar',
          debit: digitalInvoice.totals.retentionIvaAmountUsd,
          credit: 0,
          description: `Retención IVA Comprobante ${digitalInvoice.totals.retentionVoucherNumber || 'S/N'} - Fac ${digitalInvoice.documentNumber}`,
        });
      }

      // C. Anticipo de ISLR Retenido si aplica
      if (digitalInvoice.totals.retentionIslrAmountUsd && digitalInvoice.totals.retentionIslrAmountUsd > 0) {
        journalLines.push({
          account_code: '1.1.03.02',
          account_name: 'Anticipo de Impuestos - Retención ISLR por Compensar',
          debit: digitalInvoice.totals.retentionIslrAmountUsd,
          credit: 0,
          description: `Retención ISLR Factura ${digitalInvoice.documentNumber}`,
        });
      }

      // D. Ingresos por Ventas (Base Gravada + Exentos)
      const salesIncome = Number(
        new Decimal(digitalInvoice.totals.taxableAmountUsd)
          .plus(digitalInvoice.totals.exemptAmountUsd)
          .toFixed(2)
      );

      if (salesIncome > 0) {
        journalLines.push({
          account_code: '4.1.01',
          account_name: 'Ventas de Productos / Servicios',
          debit: 0,
          credit: salesIncome,
          description: `Venta Factura Digital ${digitalInvoice.documentNumber}`,
        });
      }

      // E. Débito Fiscal IVA 16% por Pagar
      if (digitalInvoice.totals.ivaAmountUsd > 0) {
        journalLines.push({
          account_code: '2.1.02.01',
          account_name: 'Débito Fiscal IVA por Pagar',
          debit: 0,
          credit: digitalInvoice.totals.ivaAmountUsd,
          description: `Débito Fiscal IVA Factura ${digitalInvoice.documentNumber}`,
        });
      }

      // F. Débito IGTF por Pagar (3%) si aplica
      if (digitalInvoice.totals.igtfAmountUsd > 0) {
        journalLines.push({
          account_code: '2.1.02.02',
          account_name: 'Débito IGTF por Pagar (3%)',
          debit: 0,
          credit: digitalInvoice.totals.igtfAmountUsd,
          description: `IGTF Factura ${digitalInvoice.documentNumber}`,
        });
      }

      // Validar balance y ejecutar el asiento contable NIIF
      if (journalLines.length >= 2) {
        await createKernelJournalEntry({
          tenant_id: tenantId,
          document_id: newDoc.id,
          entry_date: new Date().toISOString(),
          description: `Facturación Digital Providencia 00093 ${digitalInvoice.documentNumber} - ${digitalInvoice.buyer.businessName}`,
          lines: journalLines,
        });
      }
    } catch (accountingErr) {
      console.warn('[Contabilidad NIIF]: Asiento contable no generado:', (accountingErr as Error).message);
    }

    // 6. Actualización de Saldo y Deuda del Cliente si se suministró entity_id
    if (safeEntityId && digitalInvoice.totals.netPayableUsd > 0) {
      try {
        const { data: entityData } = await supabaseAdmin
          .from('entities')
          .select('metadata')
          .eq('id', safeEntityId)
          .single();

        if (entityData) {
          const curMeta = (typeof entityData.metadata === 'object' && entityData.metadata !== null)
            ? (entityData.metadata as Record<string, any>)
            : {};
          const curDebt = new Decimal(curMeta.outstanding_debt || curMeta.balance || 0);
          const newDebt = curDebt.plus(digitalInvoice.totals.netPayableUsd).toNumber();

          await supabaseAdmin
            .from('entities')
            .update({
              metadata: {
                ...curMeta,
                outstanding_debt: newDebt,
                balance: newDebt,
                last_invoiced_at: new Date().toISOString(),
              },
            })
            .eq('id', safeEntityId);
        }
      } catch (clientErr) {
        console.warn('[Entities]: Actualización de saldo de cliente diferida:', (clientErr as Error).message);
      }
    }

    // 7. Registro de Auditoría Forense (Exigencia de 10 Años de la Providencia 00093)
    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'digital_invoice.providencia_00093.created',
      target_type: 'document',
      target_id: newDoc.id,
      metadata: {
        document_number: digitalInvoice.documentNumber,
        control_number: digitalInvoice.controlNumber,
        control_range: digitalInvoice.controlRange,
        total_usd: digitalInvoice.totals.totalAmountUsd,
        total_ves: digitalInvoice.totals.totalAmountVes,
        digital_hash: digitalInvoice.digitalHashSha256,
        contingency_mode: digitalInvoice.contingencyMode,
        buyer_tax_id: digitalInvoice.buyer.taxId,
      },
    });

    revalidatePath('/ventas');
    revalidatePath('/contabilidad');
    revalidatePath('/caja');

    return {
      success: true,
      document: newDoc,
      digitalInvoice,
    };
  } catch (err: any) {
    console.error('[createProvidencia00093InvoiceAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Conversión de Cotización (Preventa / Pedido) a Nota de Entrega (Despacho) y luego a Factura Digital.
 * El flujo indispensable para Distribuidoras y Mayoristas.
 */
export async function convertQuoteToDeliveryAndInvoiceAction(
  params: {
    quoteId: string;
    step: 'to_delivery_order' | 'to_fiscal_invoice';
    fiscalParams?: {
      seller: FiscalPartyInfo;
      buyer: FiscalPartyInfo;
      bcvRate: number;
      applyIgtf?: boolean;
      retentionIvaRate?: number;
      retentionVoucherNumber?: string;
    };
  },
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; documentId?: string; document?: any; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    // 1. Obtener la cotización original
    const { data: quote, error: quoteErr } = await supabaseAdmin
      .from('documents')
      .select('*, entity:entities(*)')
      .eq('id', params.quoteId)
      .eq('tenant_id', tenantId)
      .single();

    if (quoteErr || !quote) {
      return { success: false, error: 'Documento original no encontrado.' };
    }

    const lines: FiscalDocumentLineInput[] = Array.isArray(quote.metadata?.lines)
      ? quote.metadata.lines
      : [];

    if (params.step === 'to_delivery_order') {
      // Generar Nota de Entrega / Despacho
      const nextDeliveryNum = `NE-${String(Date.now()).slice(-6)}`;
      const { data: deliveryDoc, error: delErr } = await supabaseAdmin
        .from('documents')
        .insert([{
          tenant_id: tenantId,
          entity_id: quote.entity_id,
          type: 'work_order', // Tipo interno para notas de entrega
          status: 'in_progress',
          document_number: nextDeliveryNum,
          subtotal_amount: quote.subtotal_amount,
          tax_amount: quote.tax_amount,
          total_amount: quote.total_amount,
          notes: `Despacho generado desde Cotización ${quote.document_number}`,
          metadata: {
            ...quote.metadata,
            actual_type: 'delivery_order',
            source_quote_id: quote.id,
            source_quote_number: quote.document_number,
            dispatched_at: new Date().toISOString(),
          },
        }])
        .select()
        .single();

      if (delErr) throw new Error('Error al generar Nota de Entrega: ' + delErr.message);

      // Actualizar cotización a 'completed'
      await supabaseAdmin
        .from('documents')
        .update({ status: 'completed' })
        .eq('id', quote.id);

      return { success: true, documentId: deliveryDoc.id, document: deliveryDoc };
    }

    if (params.step === 'to_fiscal_invoice') {
      if (!params.fiscalParams) {
        return { success: false, error: 'Se requieren los parámetros fiscales para emitir la Factura Digital.' };
      }

      const invoiceRes = await createProvidencia00093InvoiceAction(
        {
          entity_id: quote.entity_id,
          seller: params.fiscalParams.seller,
          buyer: params.fiscalParams.buyer,
          lines,
          bcv_rate: params.fiscalParams.bcvRate,
          apply_igtf: params.fiscalParams.applyIgtf,
          retention_iva_rate: params.fiscalParams.retentionIvaRate,
          retention_voucher_number: params.fiscalParams.retentionVoucherNumber,
          notes: `Facturado a partir de ${quote.document_number}`,
        },
        tenantId,
        actor
      );

      if (!invoiceRes.success || !invoiceRes.document) {
        return { success: false, error: invoiceRes.error || 'Fallo en facturación digital.' };
      }

      // Marcar documento origen como 'invoiced'
      await supabaseAdmin
        .from('documents')
        .update({
          status: 'invoiced',
          metadata: {
            ...quote.metadata,
            linked_invoice_id: invoiceRes.document.id,
            linked_invoice_number: invoiceRes.document.document_number,
          },
        })
        .eq('id', quote.id);

      return { success: true, documentId: invoiceRes.document.id, document: invoiceRes.document };
    }

    return { success: false, error: 'Paso de conversión no reconocido.' };
  } catch (err: any) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Registra un Comprobante de Retención Fiscal de IVA o ISLR entregado por un Contribuyente Especial.
 * Reduce el saldo adeudado del cliente y genera el asiento contable de compensación.
 */
export async function recordFiscalRetentionVoucherAction(
  params: {
    invoiceId: string;
    voucherNumber: string;
    voucherDate: string;
    retentionIvaRate?: number; // 75 o 100
    retentionIslrRate?: number; // 1, 2, 5
  },
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; netPayableUsd?: number; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const { data: invoice, error: invErr } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', params.invoiceId)
      .eq('tenant_id', tenantId)
      .single();

    if (invErr || !invoice) {
      return { success: false, error: 'Factura fiscal no encontrada.' };
    }

    const curMeta = (typeof invoice.metadata === 'object' && invoice.metadata !== null)
      ? (invoice.metadata as Record<string, any>)
      : {};

    const ivaAmount = new Decimal(invoice.tax_amount || 0);
    const subtotal = new Decimal(invoice.subtotal_amount || 0);
    const total = new Decimal(invoice.total_amount || 0);

    let retIvaUsd = new Decimal(0);
    let retIslrUsd = new Decimal(0);

    if (params.retentionIvaRate && params.retentionIvaRate > 0) {
      retIvaUsd = ivaAmount.times(new Decimal(params.retentionIvaRate).dividedBy(100)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    }
    if (params.retentionIslrRate && params.retentionIslrRate > 0) {
      retIslrUsd = subtotal.times(new Decimal(params.retentionIslrRate).dividedBy(100)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    }

    const totalRetentions = retIvaUsd.plus(retIslrUsd);
    const newNetPayable = Decimal.max(0, total.minus(totalRetentions)).toNumber();

    // Actualizar metadata de la factura con el comprobante
    const updatedRetentions = {
      voucher_number: params.voucherNumber,
      voucher_date: params.voucherDate,
      retention_iva_rate: params.retentionIvaRate || 0,
      retention_iva_amount_usd: retIvaUsd.toNumber(),
      retention_islr_rate: params.retentionIslrRate || 0,
      retention_islr_amount_usd: retIslrUsd.toNumber(),
      net_payable_usd: newNetPayable,
    };

    await supabaseAdmin
      .from('documents')
      .update({
        metadata: {
          ...curMeta,
          retentions: updatedRetentions,
          net_payable_usd: newNetPayable,
        },
      })
      .eq('id', invoice.id);

    // Ajustar cuenta del cliente
    if (invoice.entity_id && totalRetentions.toNumber() > 0) {
      const { data: ent } = await supabaseAdmin.from('entities').select('metadata').eq('id', invoice.entity_id).single();
      if (ent) {
        const entMeta = (typeof ent.metadata === 'object' && ent.metadata !== null) ? (ent.metadata as Record<string, any>) : {};
        const curDebt = new Decimal(entMeta.outstanding_debt || entMeta.balance || 0);
        const newDebt = Decimal.max(0, curDebt.minus(totalRetentions)).toNumber();

        await supabaseAdmin.from('entities').update({
          metadata: {
            ...entMeta,
            outstanding_debt: newDebt,
            balance: newDebt,
          },
        }).eq('id', invoice.entity_id);
      }
    }

    // Asiento contable de compensación por retención recibida
    try {
      await createKernelJournalEntry({
        tenant_id: tenantId,
        document_id: invoice.id,
        entry_date: params.voucherDate || new Date().toISOString(),
        description: `Comprobante Retención ${params.voucherNumber} - Factura ${invoice.document_number}`,
        lines: [
          {
            account_code: '1.1.03.01',
            account_name: 'Anticipo de Impuestos - Retención IVA por Compensar',
            debit: retIvaUsd.toNumber(),
            credit: 0,
            description: `Retención IVA Comprobante ${params.voucherNumber}`,
          },
          ...(retIslrUsd.toNumber() > 0 ? [{
            account_code: '1.1.03.02',
            account_name: 'Anticipo de Impuestos - Retención ISLR por Compensar',
            debit: retIslrUsd.toNumber(),
            credit: 0,
            description: `Retención ISLR Comprobante ${params.voucherNumber}`,
          }] : []),
          {
            account_code: '1.1.02.01',
            account_name: 'Cuentas por Cobrar (Clientes)',
            debit: 0,
            credit: totalRetentions.toNumber(),
            description: `Abono por Retención Recibida Comprobante ${params.voucherNumber}`,
          },
        ],
      });
    } catch (accErr) {
      console.warn('[Contabilidad NIIF]: Asiento de compensación diferido:', (accErr as Error).message);
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'digital_invoice.retention_recorded',
      target_type: 'document',
      target_id: invoice.id,
      metadata: {
        voucher_number: params.voucherNumber,
        retention_amount_usd: totalRetentions.toNumber(),
        new_net_payable: newNetPayable,
      },
    });

    revalidatePath('/ventas');
    revalidatePath('/contabilidad');

    return { success: true, netPayableUsd: newNetPayable };
  } catch (err: any) {
    return { success: false, error: (err as Error).message };
  }
}
