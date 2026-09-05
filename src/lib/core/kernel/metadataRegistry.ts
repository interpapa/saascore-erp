/**
 * Rendo Kernel - Dynamic Metadata & UDF Registry
 * 
 * Permite registrar y validar esquemas dinámicos de campos personalizados (UDFs)
 * por tenant en la columna JSONB `metadata` sin alterar la estructura física de PostgreSQL.
 */

import { z } from 'zod';

export type EntityTarget = 'customer' | 'supplier' | 'product' | 'invoice' | 'employee';

export interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select';
  required?: boolean;
  options?: string[]; // Para tipo select
}

class MetadataRegistry {
  private definitions: Map<string, FieldDefinition[]> = new Map();

  /**
   * Registra campos personalizados para una entidad de un tenant.
   */
  public registerFields(tenantId: string, target: EntityTarget, fields: FieldDefinition[]): void {
    const key = `${tenantId}:${target}`;
    this.definitions.set(key, fields);
  }

  /**
   * Obtiene la lista de campos personalizados registrados.
   */
  public getFields(tenantId: string, target: EntityTarget): FieldDefinition[] {
    const key = `${tenantId}:${target}`;
    return this.definitions.get(key) || [];
  }

  /**
   * Construye un esquema Zod dinámico para validar los campos ingresados.
   */
  public buildSchema(tenantId: string, target: EntityTarget): z.ZodObject<Record<string, z.ZodTypeAny>> {
    const fields = this.getFields(tenantId, target);
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const field of fields) {
      let schema: z.ZodTypeAny;

      switch (field.type) {
        case 'number':
          schema = z.number({ message: `${field.label} debe ser un número.` });
          break;
        case 'boolean':
          schema = z.boolean();
          break;
        case 'date':
          schema = z.string();
          break;
        case 'select':
          if (field.options && field.options.length > 0) {
            schema = z.enum(field.options as [string, ...string[]]);
          } else {
            schema = z.string();
          }
          break;
        default:
          schema = z.string();
      }

      if (!field.required) {
        schema = schema.optional().nullable();
      }

      shape[field.name] = schema;
    }

    return z.object(shape);
  }

  /**
   * Valida un objeto metadata contra el registro del tenant.
   */
  public validate(tenantId: string, target: EntityTarget, metadata: Record<string, unknown>): { valid: boolean; data?: unknown; error?: string } {
    try {
      const schema = this.buildSchema(tenantId, target);
      const parsed = schema.parse(metadata);
      return { valid: true, data: parsed };
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'issues' in err) {
        const issues = (err as Record<string, unknown>).issues;
        if (Array.isArray(issues)) {
          const msg = issues.map((i: unknown) => (i as Record<string, string>).message).join(', ');
          return { valid: false, error: msg };
        }
      }
      return { valid: false, error: (err as Error).message || 'Error de validación de metadatos' };
    }
  }
}

export const metadataRegistry = new MetadataRegistry();
