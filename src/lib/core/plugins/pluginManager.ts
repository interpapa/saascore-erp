/**
 * SaaSCore ERP Plugin Manager
 * Central registry that loads, enables, and manages third-party ERP plugins.
 */

import { SaaSPlugin, FilterHookName, ActionHookName, UIExtension } from './pluginTypes';
import { eventBus, EventName } from '../events/eventBus';

class PluginManager {
  private plugins: Map<string, SaaSPlugin> = new Map();
  private eventUnsubscribers: Map<string, Array<() => void>> = new Map();

  /**
   * Register and activate a plugin in the ERP system.
   */
  public async registerPlugin(plugin: SaaSPlugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[PluginManager] Plugin "${plugin.id}" is already registered. Re-registering.`);
      await this.unregisterPlugin(plugin.id);
    }

    this.plugins.set(plugin.id, plugin);

    // Register event listeners with eventBus
    if (plugin.enabled && plugin.eventListeners) {
      const unsubscribers: Array<() => void> = [];
      
      for (const [eventName, handler] of Object.entries(plugin.eventListeners)) {
        if (handler) {
          const unsub = eventBus.on(eventName as EventName, handler as any); // eslint-disable-line
          unsubscribers.push(unsub);
        }
      }

      this.eventUnsubscribers.set(plugin.id, unsubscribers);
    }

    if (plugin.enabled && plugin.onActivate) {
      try {
        await plugin.onActivate();
      } catch (err) {
        console.error(`[PluginManager] Error in onActivate for plugin "${plugin.id}":`, err);
      }
    }

    console.log(`[PluginManager] Plugin "${plugin.name}" (v${plugin.version}) registered successfully.`);
  }

  /**
   * Unregister and clean up a plugin.
   */
  public async unregisterPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    // Unsubscribe event listeners
    const unsubs = this.eventUnsubscribers.get(pluginId);
    if (unsubs) {
      unsubs.forEach((unsub) => unsub());
      this.eventUnsubscribers.delete(pluginId);
    }

    if (plugin.onDeactivate) {
      try {
        await plugin.onDeactivate();
      } catch (err) {
        console.error(`[PluginManager] Error in onDeactivate for plugin "${pluginId}":`, err);
      }
    }

    this.plugins.delete(pluginId);
  }

  /**
   * Run a filter hook pipeline. Each enabled plugin receives the payload,
   * transforms it, and passes it to the next plugin.
   */
  public async applyFilters<T>(hookName: FilterHookName, payload: T): Promise<T> {
    let currentPayload = payload;

    for (const plugin of this.plugins.values()) {
      if (!plugin.enabled || !plugin.filters?.[hookName]) continue;

      try {
        const handler = plugin.filters[hookName]!;
        currentPayload = (await handler(currentPayload)) as T;
      } catch (err) {
        console.error(`[PluginManager] Error executing filter "${hookName}" in plugin "${plugin.id}":`, err);
      }
    }

    return currentPayload;
  }

  /**
   * Run action side-effects across all enabled plugins.
   */
  public async doAction<T>(hookName: ActionHookName, payload: T): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (!plugin.enabled || !plugin.actions?.[hookName]) continue;

      try {
        const handler = plugin.actions[hookName]!;
        await handler(payload);
      } catch (err) {
        console.error(`[PluginManager] Error executing action "${hookName}" in plugin "${plugin.id}":`, err);
      }
    }
  }

  /**
   * Retrieve active UI extensions for a specific UI slot.
   */
  public getUIExtensions(slot: UIExtension['targetSlot']): UIExtension[] {
    const extensions: UIExtension[] = [];

    for (const plugin of this.plugins.values()) {
      if (!plugin.enabled || !plugin.uiExtensions) continue;

      const matching = plugin.uiExtensions.filter((ext) => ext.targetSlot === slot);
      extensions.push(...matching);
    }

    return extensions.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * List all registered plugins.
   */
  public getRegisteredPlugins(): Array<Omit<SaaSPlugin, 'filters' | 'actions' | 'eventListeners'>> {
    return Array.from(this.plugins.values()).map(({ id, name, version, author, description, enabled }) => ({
      id,
      name,
      version,
      author,
      description,
      enabled,
    }));
  }
}

export const pluginManager = new PluginManager();

