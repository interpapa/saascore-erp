import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { assertModuleEnabled } from '@/lib/core/kernel/moduleRegistry';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { ActionActor } from '@/app/actions/entities';
import { CreateItemActionInput } from '@/app/actions/items';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action = 'create', input, id, tenantId, actor } = body as {
      action?: 'create' | 'update' | 'delete';
      input?: CreateItemActionInput;
      id?: string;
      tenantId: string;
      actor: ActionActor;
    };

    if (!tenantId || !actor) {
      return NextResponse.json(
        { success: false, error: 'Empresa activa y credenciales de usuario requeridas.' },
        { status: 400 }
      );
    }

    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return NextResponse.json(
        { success: false, error: securityCheck.error || 'Acceso denegado a la empresa.' },
        { status: 403 }
      );
    }

    const moduleCheck = await assertModuleEnabled(tenantId, 'catalogo');
    if (!moduleCheck.authorized) {
      const invCheck = await assertModuleEnabled(tenantId, 'inventario');
      const dentalCheck = await assertModuleEnabled(tenantId, 'odontologia');
      if (!invCheck.authorized && !dentalCheck.authorized) {
        return NextResponse.json(
          { success: false, error: 'El módulo de Catálogo/Inventario está inactivo.' },
          { status: 400 }
        );
      }
    }

    if (action === 'create') {
      if (!input || !input.name?.trim()) {
        return NextResponse.json(
          { success: false, error: 'El nombre del artículo o servicio es obligatorio.' },
          { status: 400 }
        );
      }

      const insertData: any = {
        tenant_id: tenantId,
        type: input.type || 'product',
        sku: input.sku || null,
        name: input.name.trim(),
        description: input.description || null,
        category: input.category || null,
        base_price: Number(input.base_price || 0),
        cost: Number(input.cost || 0),
        stock: input.type === 'product' ? Number(input.stock_quantity ?? 0) : null,
        is_active: input.is_active ?? true,
        metadata: input.metadata || {},
      };

      let { data: newItem, error } = await supabaseAdmin
        .from('items')
        .insert([insertData])
        .select()
        .single();

      if (error && (error.message.includes('stock') || error.message.includes('column'))) {
        delete insertData.stock;
        insertData.stock_quantity = input.type === 'product' ? Number(input.stock_quantity ?? 0) : null;
        const retry = await supabaseAdmin
          .from('items')
          .insert([insertData])
          .select()
          .single();
        newItem = retry.data;
        error = retry.error;
      }

      if (error) {
        return NextResponse.json(
          { success: false, error: 'Error al registrar el artículo: ' + error.message },
          { status: 500 }
        );
      }

      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'item.updated',
        target_type: 'item',
        target_id: newItem.id,
        metadata: { action: 'created', name: input.name, price: input.base_price },
      });

      return NextResponse.json({ success: true, item: newItem });
    }

    if (action === 'update') {
      if (!id) {
        return NextResponse.json({ success: false, error: 'ID de ítem requerido.' }, { status: 400 });
      }

      const updatePayload: any = { ...(input || {}) };
      if (updatePayload.stock_quantity !== undefined) {
        updatePayload.stock = updatePayload.stock_quantity;
        delete updatePayload.stock_quantity;
      }

      let { data: updatedItem, error } = await supabaseAdmin
        .from('items')
        .update(updatePayload)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error && (error.message.includes('stock') || error.message.includes('column'))) {
        delete updatePayload.stock;
        if (input?.stock_quantity !== undefined) {
          updatePayload.stock_quantity = input.stock_quantity;
        }
        const retry = await supabaseAdmin
          .from('items')
          .update(updatePayload)
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .select()
          .single();
        updatedItem = retry.data;
        error = retry.error;
      }

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, item: updatedItem });
    }

    if (action === 'delete') {
      if (!id) {
        return NextResponse.json({ success: false, error: 'ID de ítem requerido.' }, { status: 400 });
      }

      let { error } = await supabaseAdmin
        .from('items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error && (error.message.includes('deleted_at') || error.message.includes('column'))) {
        const retry = await supabaseAdmin
          .from('items')
          .update({ is_active: false })
          .eq('id', id)
          .eq('tenant_id', tenantId);
        error = retry.error;
      }

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Acción no reconocida.' }, { status: 400 });
  } catch (err: any) {
    console.error('[/api/inventory/items Error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
