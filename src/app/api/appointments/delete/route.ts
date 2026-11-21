import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { isValidUUID, isTemporaryId } from '@/lib/core/uuid';

export const dynamic = 'force-dynamic';

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, tenantId, actor } = body || {};

    if (!id || !tenantId) {
      return NextResponse.json(
        { success: false, error: 'ID de cita y Tenant ID requeridos.' },
        { status: 400 }
      );
    }

    // Validar acceso si viene actor
    if (actor) {
      const securityCheck = await validateUserTenantAccess(actor, tenantId);
      if (!securityCheck.authorized) {
        return NextResponse.json(
          { success: false, error: securityCheck.error || 'Acceso denegado.' },
          { status: 403 }
        );
      }
    }

    if (isTemporaryId(id) || !isValidUUID(id)) {
      return NextResponse.json({ success: true, localOnly: true });
    }

    // 1. Intentar borrar en appointments
    const { error } = await supabaseAdmin
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      if (isMissingTableError(error)) {
        const { error: docError } = await supabaseAdmin
          .from('documents')
          .delete()
          .eq('id', id)
          .eq('tenant_id', tenantId);
        if (docError) {
          return NextResponse.json(
            { success: false, error: docError.message },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
    }

    // 2. Audit log no bloqueante
    if (actor?.email) {
      try {
        await writeAuditLog({
          tenant_id: tenantId,
          actor_email: actor.email,
          actor_role: actor.role || 'authenticated',
          action: 'entity.deleted',
          target_type: 'appointment',
          target_id: id,
          metadata: { action: 'appointment_deleted_via_rest_api' },
        });
      } catch (auditErr) {
        console.warn('[API /api/appointments/delete] Audit log error (non-blocking):', auditErr);
      }
    }

    return NextResponse.json({ success: true }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err: any) {
    console.error('[API /api/appointments/delete Error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Error interno del servidor al eliminar la cita' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  return POST(req);
}
