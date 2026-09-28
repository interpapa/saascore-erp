/**
 * Rendo Action Kernel - Centralized Server Action Engine (Estilo Odoo 17)
 * 
 * Pipeline universal para Server Actions que centraliza y automatiza:
 * 1. Autenticación Zero-Trust (verificación criptográfica JWT)
 * 2. Inyección y validación de contexto multi-tenant
 * 3. Comprobación de licencia/módulo activo por tenant (con caché en memoria)
 * 4. Autorización granular RBAC por rol
 * 5. Protección contra spam y abuso (Rate Limiter)
 * 6. Validación y sanitización estricta de datos de entrada (Zod)
 * 7. Registro automático en auditoría inmutable (WORM)
 * 8. Manejo de revalidación de caché de Next.js
 * 9. Envoltorio estándar de respuesta { success, data, error }
 */

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ModuleId, assertModuleEnabled } from './moduleRegistry';
import { validateUserTenantAccess, SecurityActor } from '../tenantSecurity';
import { checkPermission, UserRole } from '@/lib/rbac';
import { checkRateLimit } from '../rateLimiter';
import { writeAuditLog, AuditAction } from '../auditLogger';
import { eventBus, DomainEvents } from '../events/eventBus';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface ActionContext {
  tenantId: string;
  actor: SecurityActor & { role: UserRole };
  supabase: typeof supabaseAdmin;
  emit: <K extends keyof DomainEvents>(event: K, payload: DomainEvents[K]) => Promise<void>;
  revalidate: (path: string) => void;
}

export interface ActionDefinition<TSchema extends z.ZodTypeAny, TResult> {
  /** Módulo del catálogo al que pertenece la acción (ej: 'catalogo', 'calendario', 'caja') */
  module: ModuleId;
  /** Permiso RBAC requerido si aplica (ej: 'inventario', 'finanzas') */
  permission?: string;
  /** Tipo de limitación de tasa ('read' | 'mutation' | 'checkout') */
  rateLimitType?: 'read' | 'mutation' | 'checkout';
  /** Esquema Zod de validación de los datos de entrada */
  schema?: TSchema;
  /** Configuración para registro automático de auditoría */
  audit?: {
    action: AuditAction;
    targetType: string;
    getTargetId?: (result: TResult, input: z.infer<TSchema>) => string | undefined;
  };
  /** Rutas que deben revalidarse automáticamente al completarse con éxito */
  revalidatePaths?: string[] | ((result: TResult, input: z.infer<TSchema>) => string[]);
  /** Lógica de negocio pura de la acción */
  handler: (params: { input: z.infer<TSchema>; ctx: ActionContext }) => Promise<TResult>;
}

export type ActionResponse<T> = 
  | { success: true; data: T; error?: never }
  | { success: false; error: string; code?: string; data?: never };

/**
 * Fábrica universal de Server Actions para módulos de Rendo ERP.
 * 
 * Permite definir una nueva función de negocio en cualquier módulo en pocas líneas
 * de código, garantizando seguridad, verificación modular y auditoría de forma transparente.
 */
export function createModuleAction<TSchema extends z.ZodTypeAny, TResult>(
  def: ActionDefinition<TSchema, TResult>
) {
  return async (
    rawInput: unknown,
    tenantId: string,
    actor: SecurityActor
  ): Promise<ActionResponse<TResult>> => {
    try {
      // 1. Rate Limiting Guard
      const rateCheck = checkRateLimit(actor?.email || 'anonymous', def.rateLimitType || 'mutation');
      if (!rateCheck.allowed) {
        return { 
          success: false, 
          error: `Demasiadas peticiones. Por favor espera ${rateCheck.retryAfterSec || 5} segundos.`, 
          code: 'RATE_LIMIT' 
        };
      }

      // 2. Zero-Trust Multi-Tenant Auth Guard
      const auth = await validateUserTenantAccess(actor, tenantId);
      if (!auth.authorized) {
        return { 
          success: false, 
          error: auth.error || 'Acceso no autorizado a esta empresa.', 
          code: 'UNAUTHORIZED' 
        };
      }

      // 3. Module Activation Guard (aprovecha la caché con TTL de 30s de moduleRegistry)
      const modCheck = await assertModuleEnabled(tenantId, def.module);
      if (!modCheck.authorized) {
        return { 
          success: false, 
          error: modCheck.error || `El módulo "${def.module}" está desactivado para esta empresa.`, 
          code: 'MODULE_DISABLED' 
        };
      }

      // 4. RBAC Permission Guard
      if (def.permission && !checkPermission(actor.role, def.permission)) {
        await writeAuditLog({
          tenant_id: tenantId,
          actor_email: actor.email,
          actor_role: actor.role,
          action: 'permission.denied',
          target_type: 'action_kernel',
          metadata: { module: def.module, permission: def.permission },
        });
        return { 
          success: false, 
          error: `Permiso insuficiente para realizar esta operación (${def.permission}).`, 
          code: 'FORBIDDEN' 
        };
      }

      // 5. Schema Validation (Zod)
      let parsedInput: any = rawInput;
      if (def.schema) {
        const parseRes = def.schema.safeParse(rawInput);
        if (!parseRes.success) {
          const firstError = parseRes.error.issues?.[0]?.message || 'Datos de entrada inválidos.';
          return { 
            success: false, 
            error: firstError, 
            code: 'VALIDATION_ERROR' 
          };
        }
        parsedInput = parseRes.data;
      }

      // 6. Inyección de Contexto y Ejecución de Lógica de Negocio
      const ctx: ActionContext = {
        tenantId,
        actor: actor as SecurityActor & { role: UserRole },
        supabase: supabaseAdmin,
        emit: (evt, payload) => eventBus.emit(evt, payload),
        revalidate: (path: string) => revalidatePath(path),
      };

      const result = await def.handler({ input: parsedInput, ctx });

      // 7. Auditoría Automática
      if (def.audit) {
        const targetId = def.audit.getTargetId 
          ? def.audit.getTargetId(result, parsedInput) 
          : (typeof (result as any)?.id === 'string' ? (result as any).id : undefined);

        await writeAuditLog({
          tenant_id: tenantId,
          actor_email: actor.email,
          actor_role: actor.role,
          action: def.audit.action,
          target_type: def.audit.targetType,
          target_id: targetId,
          metadata: { input: parsedInput },
        });
      }

      // 8. Revalidación de Rutas
      if (def.revalidatePaths) {
        const paths = typeof def.revalidatePaths === 'function' 
          ? def.revalidatePaths(result, parsedInput) 
          : def.revalidatePaths;

        for (const p of paths) {
          try { revalidatePath(p); } catch {}
        }
      }

      return { success: true, data: result };
    } catch (err: unknown) {
      const errorMsg = (err as Error)?.message || 'Ocurrió un error inesperado al procesar la acción.';
      console.error(`[ActionKernel Error][${def.module}]:`, errorMsg);
      return { 
        success: false, 
        error: errorMsg, 
        code: 'INTERNAL_ERROR' 
      };
    }
  };
}
