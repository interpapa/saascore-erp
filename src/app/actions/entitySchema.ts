'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ActionActor } from './entities';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { writeAuditLog } from '@/lib/core/auditLogger';

import { 
  INDUSTRY_TEMPLATES, 
  type IndustryTemplate, 
  type CustomFieldDefinition 
} from '@/lib/core/industryTemplates';


export async function getTenantEntitySchemaAction(
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; schema?: CustomFieldDefinition[]; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    // 1. Consultar tabla relacional tenant_entity_schema
    const { data, error } = await supabaseAdmin
      .from('tenant_entity_schema')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) {
      return { success: true, schema: data as CustomFieldDefinition[] };
    }

    // 2. Fallback: tenants.metadata.entity_schema
    const { data: tenantData } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();

    const fallbackSchema: CustomFieldDefinition[] = Array.isArray(tenantData?.metadata?.entity_schema)
      ? tenantData.metadata.entity_schema
      : [];

    return { success: true, schema: fallbackSchema };
  } catch (err: any) {
    return { success: false, error: err.message, schema: [] };
  }
}

export async function saveTenantEntitySchemaAction(
  tenantId: string,
  fields: CustomFieldDefinition[],
  actor: ActionActor
): Promise<{ success: boolean; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    // Guardar siempre en tenants.metadata.entity_schema para disponibilidad instantánea
    const { data: tenantData } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();

    await supabaseAdmin
      .from('tenants')
      .update({
        metadata: {
          ...(tenantData?.metadata || {}),
          entity_schema: fields,
        }
      })
      .eq('id', tenantId);

    // Intentar también en tenant_entity_schema si la tabla existe
    try {
      await supabaseAdmin.from('tenant_entity_schema').delete().eq('tenant_id', tenantId);
      if (fields.length > 0) {
        await supabaseAdmin.from('tenant_entity_schema').insert(
          fields.map((f, idx) => ({
            tenant_id: tenantId,
            field_key: f.field_key,
            field_label: f.field_label,
            field_type: f.field_type,
            options: f.options || [],
            is_required: !!f.is_required,
            sort_order: f.sort_order ?? idx,
          }))
        );
      }
    } catch {
      // Ignorar si la tabla no ha sido creada aún
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'tenant.updated',
      target_type: 'entity_schema',
      target_id: tenantId,
      metadata: { fields_count: fields.length },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function applyIndustryTemplateAction(
  tenantId: string,
  templateKey: IndustryTemplate,
  actor: ActionActor
): Promise<{ success: boolean; schema?: CustomFieldDefinition[]; error?: string }> {
  try {
    const template = INDUSTRY_TEMPLATES[templateKey];
    if (!template) {
      return { success: false, error: 'Plantilla de industria no encontrada.' };
    }

    const res = await saveTenantEntitySchemaAction(tenantId, template.fields, actor);
    if (!res.success) throw new Error(res.error);

    return { success: true, schema: template.fields };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
