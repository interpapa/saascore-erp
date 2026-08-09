/**
 * SaaSCore ERP Kernel - Plugin Execution Sandbox
 * 
 * Envoltorio aislado que ejecuta funciones o hooks de plugins con tolerancia a fallos.
 * Si un plugin de terceros lanza un error o timeout, el Kernel captura la excepción
 * y evita que el ERP o la transacción principal se rompan.
 */

import { writeAuditLog } from '@/lib/core/auditLogger';

export interface SandboxExecutionOptions {
  pluginId: string;
  actionName: string;
  tenantId: string;
  timeoutMs?: number;
}

export async function executeInSandbox<T>(
  fn: () => Promise<T> | T,
  options: SandboxExecutionOptions
): Promise<{ success: boolean; result?: T; error?: string }> {
  const timeoutMs = options.timeoutMs || 3000; // 3 segundos máx por ejecución de plugin

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout de sandbox excedido (${timeoutMs}ms)`)), timeoutMs);
    });

    const result = await Promise.race([Promise.resolve(fn()), timeoutPromise]);
    return { success: true, result };
  } catch (err: any) {
    console.error(`[PluginSandbox Error] Plugin "${options.pluginId}" falló en "${options.actionName}":`, err.message);

    // Registrar falla sin romper el flujo principal
    writeAuditLog({
      tenant_id: options.tenantId,
      actor_email: 'plugin-sandbox',
      actor_role: 'system',
      action: 'permission.denied',
      target_type: 'plugin',
      target_id: options.pluginId,
      metadata: { action: options.actionName, error: err.message },
    }).catch(() => {});

    return { success: false, error: err.message };
  }
}
