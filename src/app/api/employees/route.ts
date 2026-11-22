import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { isValidUUID, isTemporaryId } from '@/lib/core/uuid';

export const dynamic = 'force-dynamic';

interface ExecutionStep {
  step: string;
  label: string;
  status: 'ok' | 'error' | 'warning' | 'skipped';
  details?: string;
  timestamp: string;
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const trace: ExecutionStep[] = [];
  const logStep = (step: string, label: string, status: ExecutionStep['status'], details?: string) => {
    trace.push({ step, label, status, details, timestamp: new Date().toISOString() });
  };

  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId') || '';
    const actorEmail = searchParams.get('actorEmail') || searchParams.get('email') || '';
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    logStep('init', 'Recepción de consulta de colaboradores', 'ok', `Tenant: ${tenantId}, Email: ${actorEmail || 'Anónimo'}`);

    if (!tenantId) {
      logStep('param_validation', 'Validación de Tenant ID', 'error', 'ID de empresa ausente');
      return NextResponse.json({
        success: false,
        error: 'Tenant ID requerido',
        errorCode: 'MISSING_TENANT_ID',
        trace,
      }, { status: 400 });
    }

    // 1. Verificación de seguridad
    if (actorEmail) {
      const securityCheck = await validateUserTenantAccess({ email: actorEmail }, tenantId);
      if (!securityCheck.authorized) {
        logStep('security_check', 'Validación de acceso multi-tenant', 'error', securityCheck.error || 'Acceso denegado');
        return NextResponse.json({
          success: false,
          error: securityCheck.error || 'Acceso denegado a esta empresa.',
          errorCode: 'UNAUTHORIZED_TENANT_ACCESS',
          trace,
        }, { status: 403 });
      }
      logStep('security_check', 'Validación de acceso multi-tenant', 'ok', `Rol: ${securityCheck.effectiveRole || 'autorizado'}`);
    } else {
      logStep('security_check', 'Validación de acceso multi-tenant', 'warning', 'Consulta ejecutada sin actor explícito');
    }

    // 2. Consulta a Base de Datos
    logStep('db_query', 'Consulta en tabla entities (type = employee)', 'ok', `Consultando hasta ${limit} registros`);
    
    let { data: employees, error: dbError } = await supabaseAdmin
      .from('entities')
      .select('id, tenant_id, type, name, email, phone, tax_id, address, status, metadata, created_at, updated_at, deleted_at')
      .eq('tenant_id', tenantId)
      .eq('type', 'employee')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(0, limit - 1);

    if (dbError) {
      logStep('db_query', 'Error al consultar tabla entities', 'error', `[${dbError.code}] ${dbError.message}`);
      return NextResponse.json({
        success: false,
        error: `Error de base de datos al obtener colaboradores: ${dbError.message}`,
        errorCode: dbError.code || 'DB_QUERY_FAILED',
        dbDiagnostic: {
          code: dbError.code,
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
        },
        trace,
        durationMs: Date.now() - startTime,
      }, { status: 500 });
    }

    logStep('db_query', 'Registros recuperados exitosamente', 'ok', `${employees?.length || 0} colaboradores encontrados`);

    // 3. Mapeo seguro
    const mapped = (employees || []).map(e => ({
      ...e,
      is_resource: Boolean((e as any).is_resource || e.metadata?.is_resource),
      metadata: {
        ...e.metadata,
        is_resource: Boolean((e as any).is_resource || e.metadata?.is_resource),
        resource_type: e.metadata?.resource_type || (Boolean((e as any).is_resource || e.metadata?.is_resource) ? 'space' : 'human')
      }
    }));

    logStep('serialize', 'Serialización y normalización de colaboradores', 'ok', `${mapped.length} registros listos`);

    return NextResponse.json({
      success: true,
      employees: mapped,
      trace,
      durationMs: Date.now() - startTime,
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err: any) {
    logStep('unhandled_exception', 'Excepción no controlada en endpoint de colaboradores', 'error', err?.message || 'Error desconocido');
    return NextResponse.json({
      success: false,
      error: err?.message || 'Error interno del servidor al procesar colaboradores',
      errorCode: 'INTERNAL_SERVER_ERROR',
      trace,
      durationMs: Date.now() - startTime,
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const trace: ExecutionStep[] = [];
  const logStep = (step: string, label: string, status: ExecutionStep['status'], details?: string) => {
    trace.push({ step, label, status, details, timestamp: new Date().toISOString() });
  };

  try {
    const body = await req.json().catch(() => ({}));
    const { action = 'create', tenantId, entityId, payload, actor } = body || {};

    logStep('init', 'Recepción de solicitud de colaborador', 'ok', `Acción: ${action}, Tenant: ${tenantId}`);

    if (!tenantId) {
      logStep('validation', 'Validación de Tenant ID', 'error', 'ID de empresa ausente');
      return NextResponse.json({
        success: false,
        error: 'Tenant ID requerido',
        errorCode: 'MISSING_TENANT_ID',
        trace,
      }, { status: 400 });
    }

    // 1. Verificación de Seguridad
    if (actor?.email) {
      const securityCheck = await validateUserTenantAccess(actor, tenantId);
      if (!securityCheck.authorized) {
        logStep('security_check', 'Validación de acceso multi-tenant', 'error', securityCheck.error || 'Acceso denegado');
        return NextResponse.json({
          success: false,
          error: securityCheck.error || 'Acceso denegado a esta empresa.',
          errorCode: 'UNAUTHORIZED_TENANT_ACCESS',
          trace,
        }, { status: 403 });
      }
      logStep('security_check', 'Validación de acceso multi-tenant', 'ok', `Rol: ${securityCheck.effectiveRole || 'autorizado'}`);
    }

    // ==========================================
    // ACCIÓN 1: CREATE
    // ==========================================
    if (action === 'create') {
      if (!payload?.name || !payload.name.trim()) {
        logStep('validation', 'Validación de payload', 'error', 'El nombre es obligatorio');
        return NextResponse.json({
          success: false,
          error: 'El nombre del colaborador es requerido.',
          errorCode: 'MISSING_NAME',
          trace,
        }, { status: 400 });
      }

      logStep('db_insert', 'Preparación de inserción en entities', 'ok', `Nombre: ${payload.name}`);

      const insertRecord = {
        tenant_id: tenantId,
        type: 'employee',
        name: payload.name.trim(),
        email: payload.email?.trim() || null,
        phone: payload.phone?.trim() || null,
        tax_id: payload.tax_id || null,
        address: payload.address || null,
        status: payload.status || 'active',
        metadata: payload.metadata || {},
      };

      const { data: createdEntity, error: insertError } = await supabaseAdmin
        .from('entities')
        .insert([insertRecord])
        .select()
        .single();

      if (insertError) {
        logStep('db_insert', 'Error en base de datos al insertar colaborador', 'error', `[${insertError.code}] ${insertError.message}`);
        console.error('[API /api/employees POST Create Error]:', insertError);
        return NextResponse.json({
          success: false,
          error: `Error al guardar en la base de datos: ${insertError.message}`,
          errorCode: insertError.code || 'DB_INSERT_FAILED',
          dbDiagnostic: {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            attemptedPayload: { ...insertRecord, metadataSummary: Object.keys(insertRecord.metadata) },
          },
          trace,
          durationMs: Date.now() - startTime,
        }, { status: 500 });
      }

      logStep('db_insert', 'Colaborador creado con éxito en PostgreSQL', 'ok', `ID: ${createdEntity.id}`);

      // Audit Log
      if (actor?.email) {
        try {
          await writeAuditLog({
            tenant_id: tenantId,
            actor_email: actor.email,
            actor_role: actor.role || 'owner',
            action: 'entity.updated',
            target_type: 'entity',
            target_id: createdEntity.id,
            metadata: { action: 'created', type: 'employee', name: payload.name },
          });
        } catch {}
      }

      return NextResponse.json({
        success: true,
        employee: createdEntity,
        trace,
        durationMs: Date.now() - startTime,
      }, { status: 200 });
    }

    // ==========================================
    // ACCIÓN 2: UPDATE
    // ==========================================
    if (action === 'update') {
      if (!entityId) {
        logStep('validation', 'Validación de ID de colaborador', 'error', 'ID ausente para actualización');
        return NextResponse.json({
          success: false,
          error: 'ID de colaborador requerido para actualización.',
          errorCode: 'MISSING_ENTITY_ID',
          trace,
        }, { status: 400 });
      }

      if (isTemporaryId(entityId) || !isValidUUID(entityId)) {
        logStep('validation', 'ID temporal detectado', 'ok', 'Omitiendo persistencia de ID temporal');
        return NextResponse.json({ success: true, localOnly: true, trace });
      }

      logStep('db_update', 'Actualización en entities', 'ok', `ID: ${entityId}`);

      const updateData: any = {};
      if (payload.name !== undefined) updateData.name = payload.name.trim();
      if (payload.email !== undefined) updateData.email = payload.email ? payload.email.trim() : null;
      if (payload.phone !== undefined) updateData.phone = payload.phone ? payload.phone.trim() : null;
      if (payload.status !== undefined) updateData.status = payload.status;
      if (payload.metadata !== undefined) updateData.metadata = payload.metadata;
      updateData.updated_at = new Date().toISOString();

      const { data: updatedEntity, error: updateError } = await supabaseAdmin
        .from('entities')
        .update(updateData)
        .eq('id', entityId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (updateError) {
        logStep('db_update', 'Error al actualizar colaborador en base de datos', 'error', `[${updateError.code}] ${updateError.message}`);
        console.error('[API /api/employees POST Update Error]:', updateError);
        return NextResponse.json({
          success: false,
          error: `Error al actualizar colaborador: ${updateError.message}`,
          errorCode: updateError.code || 'DB_UPDATE_FAILED',
          dbDiagnostic: {
            code: updateError.code,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            attemptedUpdates: Object.keys(updateData),
          },
          trace,
          durationMs: Date.now() - startTime,
        }, { status: 500 });
      }

      logStep('db_update', 'Colaborador actualizado exitosamente', 'ok', `ID: ${entityId}`);

      // Audit Log
      if (actor?.email) {
        try {
          await writeAuditLog({
            tenant_id: tenantId,
            actor_email: actor.email,
            actor_role: actor.role || 'owner',
            action: 'entity.updated',
            target_type: 'entity',
            target_id: entityId,
            metadata: { action: 'updated', type: 'employee' },
          });
        } catch {}
      }

      return NextResponse.json({
        success: true,
        employee: updatedEntity,
        trace,
        durationMs: Date.now() - startTime,
      }, { status: 200 });
    }

    // ==========================================
    // ACCIÓN 3: DELETE (SOFT DELETE)
    // ==========================================
    if (action === 'delete') {
      if (!entityId) {
        return NextResponse.json({ success: false, error: 'ID requerido.', trace }, { status: 400 });
      }

      if (isTemporaryId(entityId) || !isValidUUID(entityId)) {
        return NextResponse.json({ success: true, localOnly: true, trace });
      }

      logStep('db_delete', 'Soft-delete de colaborador en entities', 'ok', `ID: ${entityId}`);

      const { error: deleteError } = await supabaseAdmin
        .from('entities')
        .update({ deleted_at: new Date().toISOString(), status: 'inactive' })
        .eq('id', entityId)
        .eq('tenant_id', tenantId);

      if (deleteError) {
        logStep('db_delete', 'Error en soft-delete', 'error', deleteError.message);
        return NextResponse.json({
          success: false,
          error: `Error al eliminar colaborador: ${deleteError.message}`,
          errorCode: deleteError.code || 'DB_DELETE_FAILED',
          dbDiagnostic: deleteError,
          trace,
        }, { status: 500 });
      }

      logStep('db_delete', 'Colaborador eliminado con éxito', 'ok');
      return NextResponse.json({ success: true, trace }, { status: 200 });
    }

    return NextResponse.json({ success: false, error: `Acción no soportada: ${action}`, trace }, { status: 400 });
  } catch (err: any) {
    logStep('unhandled_exception', 'Excepción no controlada en POST /api/employees', 'error', err?.message);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Error interno del servidor',
      errorCode: 'INTERNAL_SERVER_ERROR',
      trace,
      durationMs: Date.now() - startTime,
    }, { status: 500 });
  }
}
