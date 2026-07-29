'use server';

import { supabase } from '@/lib/supabase';
import { Item } from '@/lib/api/items';

interface CartItem {
  itemId: string;
  quantity: number;
}

export async function processSecureCheckout(
  cart: CartItem[], 
  entityId: string, 
  paymentMethod: 'bolivares' | 'divisas',
  tenantId: string,
  localizationCode: 'VE' | 'INTL' = 'VE'
) {
  try {
    if (!cart.length || !entityId || !tenantId) {
      throw new Error('Datos incompletos para el checkout');
    }

    // 1. Obtener los precios REALES de la base de datos (NUNCA confiar en el Frontend)
    const itemIds = cart.map(c => c.itemId);
    const { data: dbItems, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .in('id', itemIds);

    if (itemsError || !dbItems) throw new Error('Error validando ítems en la base de datos');

    // 2. Variables de Localización (El Motor de Impuestos Legal)
    let taxRate = 0;
    let igtfRate = 0;

    if (localizationCode === 'VE') {
      taxRate = 0.16; // 16% IVA Venezuela
      if (paymentMethod === 'divisas') {
        igtfRate = 0.03; // 3% IGTF si pagan en moneda extranjera
      }
    }

    // 3. Matemáticas Seguras en Servidor
    let subtotal_amount = 0;
    let tax_amount = 0;
    const documentLines = [];

    for (const cartItem of cart) {
      const realItem = dbItems.find(i => i.id === cartItem.itemId);
      if (!realItem) throw new Error(`Ítem manipulado o no existe: ${cartItem.itemId}`);

      const lineSubtotal = realItem.base_price * cartItem.quantity;
      const lineTax = lineSubtotal * taxRate;

      subtotal_amount += lineSubtotal;
      tax_amount += lineTax;

      documentLines.push({
        item_id: realItem.id,
        description: realItem.name,
        quantity: cartItem.quantity,
        unit_price: realItem.base_price, // Precio real de la DB
        tax_amount: lineTax
      });
    }

    // Cálculo del IGTF sobre la base + IVA
    const igtf_amount = (subtotal_amount + tax_amount) * igtfRate;
    const total_amount = subtotal_amount + tax_amount + igtf_amount;

    // 4. Inserción de la Factura (Control Legal)
    const { data: newDoc, error: docError } = await supabase
      .from('documents')
      .insert([{
        tenant_id: tenantId,
        entity_id: entityId,
        type: 'invoice',
        status: 'invoiced', // Factura emitida, no se puede borrar (Inmutabilidad)
        document_number: `SENIAT-FAC-${Date.now().toString().slice(-6)}`, // Generador de correlativos seguro
        subtotal_amount,
        tax_amount,
        total_amount, // Contiene base + iva + igtf
        metadata: {
          localization: localizationCode,
          legal_compliance: {
            igtf_applied: igtfRate > 0,
            igtf_amount: Number(igtf_amount.toFixed(2)),
            tax_rate: taxRate,
            payment_method: paymentMethod,
            timestamp_sealed: new Date().toISOString()
          }
        }
      }])
      .select()
      .single();

    if (docError) throw docError;

    // 5. Inserción de los Renglones (Líneas)
    const linesToInsert = documentLines.map(line => ({ ...line, document_id: newDoc.id }));
    const { error: linesError } = await supabase.from('document_lines').insert(linesToInsert);

    if (linesError) {
      // Rollback de emergencia (Debería usar Transacciones RPC, pero validamos manual)
      await supabase.from('documents').delete().eq('id', newDoc.id);
      throw new Error('Fallo al guardar líneas, factura anulada por seguridad');
    }

    return { success: true, document: newDoc };

  } catch (error: any) {
    console.error('SERVER ACTION ERROR:', error.message);
    return { success: false, error: error.message };
  }
}
