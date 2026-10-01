'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { ActionActor } from './entities';
import { isValidUUID, isTemporaryId } from '@/lib/core/uuid';

export interface ModuleStaffMember {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string; // ej. 'Master Barber', 'Groomer Senior', 'Ortodoncista'
  specialty?: string;
  commissionPercent: number; // ej. 50 (representa 50%)
  avatar: string; // emoji o URL
  module: 'barberia' | 'grooming' | 'odontologia' | 'general';
  isActive: boolean;
  licenseNumber?: string;
}

// Plantillas sugeridas de arranque cuando el tenant es nuevo
const STARTER_STAFF: Record<string, Omit<ModuleStaffMember, 'id'>[]> = {
  barberia: [
    { name: 'Carlos "Master" Fade', role: 'Master Barber', specialty: 'Degradados & Navaja', commissionPercent: 50, avatar: '✂️', module: 'barberia', isActive: true },
    { name: 'Alejandro Estilista', role: 'Barbero Integral', specialty: 'Ritual de Barba & Tijera', commissionPercent: 50, avatar: '💈', module: 'barberia', isActive: true },
    { name: 'Daniel Barbero', role: 'Barbero Junior', specialty: 'Cortes Clásicos & Niños', commissionPercent: 45, avatar: '🔥', module: 'barberia', isActive: true },
  ],
  grooming: [
    { name: 'Valentina Pet Stylist', role: 'Groomer Senior', specialty: 'Corte a Tijera & Poodles', commissionPercent: 45, avatar: '🐩', module: 'grooming', isActive: true },
    { name: 'Marcos Canino', role: 'Bañador & Deslanador', specialty: 'Doble Manto & Grandes', commissionPercent: 40, avatar: '🐕', module: 'grooming', isActive: true },
    { name: 'Sofía Estilista', role: 'Especialista en Gatos & Spa', specialty: 'Felinos & Baños Medicados', commissionPercent: 50, avatar: '🐈', module: 'grooming', isActive: true },
  ],
  odontologia: [
    { name: 'Dra. Valentina Morales', role: 'Ortodoncista', specialty: 'Brackets & Alineadores', commissionPercent: 45, avatar: '🦷', module: 'odontologia', isActive: true, licenseNumber: 'OD-5582' },
    { name: 'Dr. Roberto Mendoza', role: 'Endodoncista', specialty: 'Conductometría & Microscopía', commissionPercent: 50, avatar: '🔬', module: 'odontologia', isActive: true, licenseNumber: 'OD-4190' },
    { name: 'Dra. Carmen Salazar', role: 'Periodoncista', specialty: 'Salud Gingival & Implantes', commissionPercent: 45, avatar: '⚕️', module: 'odontologia', isActive: true, licenseNumber: 'OD-6234' },
  ],
};

/**
 * Obtiene el personal del módulo para el tenant
 */
export async function getModuleStaffAction(
  tenantId: string,
  moduleType: 'barberia' | 'grooming' | 'odontologia',
  actor: ActionActor
): Promise<{ success: boolean; staff?: ModuleStaffMember[]; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    // Consultar entidades de tipo employee
    const { data, error } = await supabaseAdmin
      .from('entities')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('type', 'employee')
      .order('name', { ascending: true });

    if (error) {
      console.error('[getModuleStaffAction Error]:', error);
      return { success: false, error: error.message };
    }

    const rawEmployees = data || [];
    const moduleStaff: ModuleStaffMember[] = [];

    for (const row of rawEmployees) {
      const meta = (row.metadata || {}) as any;

      if (moduleType === 'barberia') {
        const isBarber = Boolean(
          meta.is_barber === true ||
          meta.barber_config?.is_active === true ||
          meta.module === 'barberia' ||
          (Array.isArray(meta.modules) && meta.modules.includes('barberia')) ||
          (typeof meta.role_title === 'string' && /barbero|barber|estilista|peluquero/i.test(meta.role_title)) ||
          (typeof meta.role === 'string' && /barbero|barber|estilista|peluquero/i.test(meta.role))
        );

        if (isBarber) {
          const cfg = meta.barber_config || {};
          moduleStaff.push({
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            role: cfg.role || meta.role || meta.role_title || 'Barbero',
            specialty: cfg.specialty || meta.specialty || 'Corte & Estilo',
            commissionPercent: typeof cfg.commission_percent === 'number'
              ? cfg.commission_percent
              : typeof meta.commission_percent === 'number'
                ? meta.commission_percent
                : 50,
            avatar: cfg.avatar || meta.avatar || '✂️',
            module: 'barberia',
            isActive: row.status !== 'inactive' && cfg.is_active !== false,
          });
        }
      } else if (moduleType === 'odontologia') {
        const isDentist = Boolean(
          meta.is_dentist === true ||
          meta.is_doctor === true ||
          meta.dentist_config?.is_active === true ||
          meta.module === 'odontologia' ||
          (Array.isArray(meta.modules) && meta.modules.includes('odontologia')) ||
          (typeof meta.role_title === 'string' && /odont[oó]log|dentist|doctor|ortodonc|cirujan|higien/i.test(meta.role_title)) ||
          (typeof meta.role === 'string' && /odont[oó]log|dentist|doctor|ortodonc|cirujan|higien/i.test(meta.role))
        );

        if (isDentist) {
          const cfg = meta.dentist_config || {};
          moduleStaff.push({
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            role: cfg.role || meta.role || meta.role_title || 'Odontólogo',
            specialty: cfg.specialty || meta.specialty || 'Odontología General',
            commissionPercent: typeof cfg.commission_percent === 'number'
              ? cfg.commission_percent
              : typeof meta.commission_percent === 'number'
                ? meta.commission_percent
                : 45,
            avatar: cfg.avatar || meta.avatar || '🦷',
            module: 'odontologia',
            isActive: row.status !== 'inactive' && cfg.is_active !== false,
            licenseNumber: cfg.license_number || meta.licenseNumber || meta.license_number || '',
          });
        }
      } else if (moduleType === 'grooming') {
        const isGroomer = Boolean(
          meta.is_groomer === true ||
          meta.groomer_config?.is_active === true ||
          meta.module === 'grooming' ||
          (Array.isArray(meta.modules) && meta.modules.includes('grooming')) ||
          (typeof meta.role_title === 'string' && /groomer|canin|peluquer.*canin|bañador|banyador/i.test(meta.role_title)) ||
          (typeof meta.role === 'string' && /groomer|canin|peluquer.*canin|bañador|banyador/i.test(meta.role))
        );

        if (isGroomer) {
          const cfg = meta.groomer_config || {};
          moduleStaff.push({
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            role: cfg.role || meta.role || meta.role_title || 'Groomer Senior',
            specialty: cfg.specialty || meta.specialty || 'Corte & Baño',
            commissionPercent: typeof cfg.commission_percent === 'number'
              ? cfg.commission_percent
              : typeof meta.commission_percent === 'number'
                ? meta.commission_percent
                : 45,
            avatar: cfg.avatar || meta.avatar || '🐩',
            module: 'grooming',
            isActive: row.status !== 'inactive' && cfg.is_active !== false,
          });
        }
      }
    }

    // Si la empresa no tiene ningún colaborador registrado en el sistema, sugerir plantilla inicial
    if (moduleStaff.length === 0 && rawEmployees.length === 0 && STARTER_STAFF[moduleType]) {
      const defaults = STARTER_STAFF[moduleType].map((st, idx) => ({
        ...st,
        id: `starter-${moduleType}-${idx + 1}`,
      }));
      return { success: true, staff: defaults };
    }

    return { success: true, staff: moduleStaff };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Guarda o actualiza un profesional dentro del módulo
 */
export async function saveModuleStaffAction(
  tenantId: string,
  staffInput: {
    id?: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    role: string;
    specialty?: string;
    commissionPercent: number;
    avatar?: string;
    module: 'barberia' | 'grooming' | 'odontologia';
    isActive?: boolean;
    licenseNumber?: string;
  },
  actor: ActionActor
): Promise<{ success: boolean; staff?: ModuleStaffMember; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    if (!staffInput.name || !staffInput.name.trim()) {
      return { success: false, error: 'El nombre del profesional es requerido.' };
    }

    const isUpdate = staffInput.id && isValidUUID(staffInput.id) && !isTemporaryId(staffInput.id);

    let existingMeta: Record<string, any> = {};
    if (isUpdate) {
      const { data: existingEntity } = await supabaseAdmin
        .from('entities')
        .select('metadata')
        .eq('id', staffInput.id)
        .eq('tenant_id', tenantId)
        .single();
      if (existingEntity?.metadata) {
        existingMeta = existingEntity.metadata as Record<string, any>;
      }
    }

    const currentModules: string[] = Array.isArray(existingMeta.modules) ? [...existingMeta.modules] : [];
    if (!currentModules.includes(staffInput.module)) {
      currentModules.push(staffInput.module);
    }

    const metadata: Record<string, any> = {
      ...existingMeta,
      modules: currentModules,
      role: staffInput.role || existingMeta.role || 'Especialista',
      specialty: staffInput.specialty || existingMeta.specialty || '',
      commission_percent: Number(staffInput.commissionPercent) || existingMeta.commission_percent || 50,
      avatar: staffInput.avatar || existingMeta.avatar || (staffInput.module === 'barberia' ? '✂️' : staffInput.module === 'grooming' ? '🐕' : '🦷'),
      module: staffInput.module,
      licenseNumber: staffInput.licenseNumber || existingMeta.licenseNumber || '',
    };

    if (staffInput.module === 'barberia') {
      metadata.is_barber = staffInput.isActive !== false;
      metadata.barber_config = {
        is_active: staffInput.isActive !== false,
        role: staffInput.role,
        specialty: staffInput.specialty || '',
        commission_percent: Number(staffInput.commissionPercent) || 50,
        avatar: staffInput.avatar || '✂️',
      };
    } else if (staffInput.module === 'odontologia') {
      metadata.is_dentist = staffInput.isActive !== false;
      metadata.dentist_config = {
        is_active: staffInput.isActive !== false,
        role: staffInput.role,
        specialty: staffInput.specialty || '',
        license_number: staffInput.licenseNumber || '',
        commission_percent: Number(staffInput.commissionPercent) || 45,
        avatar: staffInput.avatar || '🦷',
      };
    } else if (staffInput.module === 'grooming') {
      metadata.is_groomer = staffInput.isActive !== false;
      metadata.groomer_config = {
        is_active: staffInput.isActive !== false,
        role: staffInput.role,
        specialty: staffInput.specialty || '',
        commission_percent: Number(staffInput.commissionPercent) || 45,
        avatar: staffInput.avatar || '🐩',
      };
    }

    if (isUpdate) {
      const { data, error } = await supabaseAdmin
        .from('entities')
        .update({
          name: staffInput.name.trim(),
          email: staffInput.email || null,
          phone: staffInput.phone || null,
          status: staffInput.isActive === false ? 'inactive' : 'active',
          metadata,
        })
        .eq('id', staffInput.id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) return { success: false, error: error.message };

      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'module_staff.updated',
        target_type: 'entity',
        target_id: staffInput.id,
        metadata: { name: staffInput.name, module: staffInput.module, commission: staffInput.commissionPercent },
      });

      return {
        success: true,
        staff: {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: metadata.role,
          specialty: metadata.specialty,
          commissionPercent: metadata.commission_percent,
          avatar: metadata.avatar,
          module: staffInput.module,
          isActive: data.status !== 'inactive',
          licenseNumber: metadata.licenseNumber,
        },
      };
    } else {
      const { data, error } = await supabaseAdmin
        .from('entities')
        .insert({
          tenant_id: tenantId,
          type: 'employee',
          name: staffInput.name.trim(),
          email: staffInput.email || null,
          phone: staffInput.phone || null,
          status: staffInput.isActive === false ? 'inactive' : 'active',
          metadata,
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };

      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'module_staff.created',
        target_type: 'entity',
        target_id: data.id,
        metadata: { name: staffInput.name, module: staffInput.module, commission: staffInput.commissionPercent },
      });

      return {
        success: true,
        staff: {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: metadata.role,
          specialty: metadata.specialty,
          commissionPercent: metadata.commission_percent,
          avatar: metadata.avatar,
          module: staffInput.module,
          isActive: data.status !== 'inactive',
          licenseNumber: metadata.licenseNumber,
        },
      };
    }
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Desactiva o elimina un miembro del equipo del módulo
 */
export async function toggleModuleStaffStatusAction(
  tenantId: string,
  staffId: string,
  isActive: boolean,
  actor: ActionActor
): Promise<{ success: boolean; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    if (!isValidUUID(staffId) || isTemporaryId(staffId)) {
      return { success: true };
    }

    const { error } = await supabaseAdmin
      .from('entities')
      .update({ status: isActive ? 'active' : 'inactive' })
      .eq('id', staffId)
      .eq('tenant_id', tenantId);

    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
