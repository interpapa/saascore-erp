/**
 * Rendo Plugin System Types
 * Definitions for third-party modules, hooks, and UI extensions.
 */

import { DomainEvents, EventName } from '../events/eventBus';

export type FilterHookName = 
  | 'checkout:before_process'
  | 'checkout:tax_calculation'
  | 'payroll:before_disburse'
  | 'invoice:render_metadata';

export type ActionHookName = 
  | 'checkout:after_save'
  | 'customer:created'
  | 'system:boot';

export type FilterHandler<T = unknown> = (payload: T) => Promise<T> | T;
export type ActionHandler<T = unknown> = (payload: T) => Promise<void> | void;

export interface UIExtension {
  id: string;
  targetSlot: 'pos.sidebar' | 'dashboard.widget' | 'invoice.header' | 'settings.tab';
  label: string;
  componentName: string; // Dynamic component mapping
  icon?: string;
  order?: number;
}

export interface SaaSPlugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  enabled: boolean;

  /**
   * Filter hooks transform data as it passes through core pipelines.
   * e.g., modifying tax rates before checkout completes.
   */
  filters?: Partial<Record<FilterHookName, FilterHandler>>;

  /**
   * Action hooks run side-effects at designated lifecycle points.
   */
  actions?: Partial<Record<ActionHookName, ActionHandler>>;

  /**
   * Subscriptions to asynchronous domain events.
   */
  eventListeners?: {
    [E in EventName]?: (payload: DomainEvents[E]) => Promise<void> | void;
  };

  /**
   * UI components/widgets injected into core layout slots.
   */
  uiExtensions?: UIExtension[];

  /**
   * Lifecycle hook when plugin is activated.
   */
  onActivate?: () => Promise<void> | void;

  /**
   * Lifecycle hook when plugin is deactivated.
   */
  onDeactivate?: () => Promise<void> | void;
}
