/**
 * SaaSCore ERP Event Bus
 * Decentralized, strongly-typed event listener & emitter system.
 * Allows core modules and third-party plugins to subscribe to domain events.
 */

export interface SaleCompletedPayload {
  saleId: string;
  tenantId: string;
  actorId?: string;
  total: number;
  currency: string;
  items: Array<{
    itemId: string;
    quantity: number;
    unitPrice: number;
  }>;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface PayrollProcessedPayload {
  payrollId: string;
  tenantId: string;
  actorId: string;
  periodStart: string;
  periodEnd: string;
  totalDisbursed: number;
  employeeCount: number;
  timestamp: string;
}

export interface InventoryStockChangedPayload {
  itemId: string;
  tenantId: string;
  previousStock: number;
  newStock: number;
  reason: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'RETURN';
  timestamp: string;
}

export interface AuditLoggedPayload {
  tenantId: string;
  actorId: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export type DomainEvents = {
  'sale.completed': SaleCompletedPayload;
  'sale.failed': { tenantId: string; reason: string; actorId?: string };
  'payroll.processed': PayrollProcessedPayload;
  'inventory.stock_changed': InventoryStockChangedPayload;
  'audit.logged': AuditLoggedPayload;
};

export type EventName = keyof DomainEvents;
export type EventHandler<T extends EventName> = (payload: DomainEvents[T]) => Promise<void> | void;

class EventBus {
  private listeners: Map<EventName, Set<(payload: unknown) => void | Promise<void>>> = new Map();

  /**
   * Subscribe a plugin or module listener to a domain event.
   */
  public on<T extends EventName>(event: T, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as (payload: unknown) => void | Promise<void>);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(handler as (payload: unknown) => void | Promise<void>);
    };
  }

  /**
   * Emit a domain event. All registered handlers will execute concurrently.
   * Plugin handler failures are caught safely so core execution is never disrupted.
   */
  public async emit<T extends EventName>(event: T, payload: DomainEvents[T]): Promise<void> {
    const handlers = this.listeners.get(event);
    if (!handlers || handlers.size === 0) return;

    const executions = Array.from(handlers).map(async (handler) => {
      try {
        await handler(payload);
      } catch (err) {
        console.error(`[EventBus] Error executing handler for event "${event}":`, err);
      }
    });

    await Promise.allSettled(executions);
  }

  /**
   * Remove all handlers (useful for testing or hot reloading).
   */
  public clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
