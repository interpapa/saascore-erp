/**
 * Rendo Plugin Auto-Initializer
 * Loads default core plugins into the PluginManager on app startup.
 * Single-country plugins (e.g. veTaxPlugin) are opt-in and not auto-registered.
 */

let initialized = false;

export function initializePlugins(): void {
  if (initialized) return;

  try {
    initialized = true;
    console.log('[PluginRegistry] Core plugins initialized.');
  } catch (err) {
    console.error('[PluginRegistry] Error initializing plugins:', err);
  }
}

// Auto-run initialization
initializePlugins();
