/**
 * Example Third-Party / Community Plugin: Venezuela Tax & Fiscal Printer Plugin
 * 
 * Demonstrates how external developers can hook into SaaSCore ERP
 * without modifying a single line of core code.
 * Set enabled to false by default to maintain core tenant tax engine neutrality.
 */

import { SaaSPlugin } from '@/lib/core/plugins/pluginTypes';

export const veTaxPlugin: SaaSPlugin = {
  id: 'plugin-ve-tax-fiscal',
  name: 'Venezuela Fiscal & IGTF Extension',
  version: '1.0.0',
  author: 'Comunidad SaaSCore VE',
  description: 'Procesa impuestos específicos de Venezuela (IGTF 3%) e integra notificaciones fiscales al completar ventas.',
  enabled: false, // Disabled by default for neutral tenant tax configuration

  filters: {
    'checkout:tax_calculation': (payload) => {
      // Example: If payment method is foreign currency (cash_usd), apply IGTF 3%
      if (payload.paymentMethod === 'cash_usd') {
        payload.extraTaxes = payload.extraTaxes || [];
        payload.extraTaxes.push({
          name: 'IGTF (Impuesto a Grandes Transacciones Financieras)',
          rate: 0.03,
          amount: payload.subtotal * 0.03,
        });
      }
      return payload;
    },
  },

  eventListeners: {
    'sale.completed': async (payload) => {
      console.log(`[Plugin VE Tax] ¡Venta detectada! ID: ${payload.saleId}, Total: $${payload.total}`);
      console.log(`[Plugin VE Tax] Generando número de control fiscal inmutable para Venezuela...`);
    },
  },

  uiExtensions: [
    {
      id: 've-fiscal-widget',
      targetSlot: 'pos.sidebar',
      label: 'Control Fiscal SENIAT',
      componentName: 'VEFiscalStatusWidget',
      order: 10,
    },
  ],

  onActivate: () => {
    console.log('[Plugin VE Tax] Activado correctamente.');
  },
};
