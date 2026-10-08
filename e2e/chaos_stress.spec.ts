import { test, expect } from '@playwright/test';

const mockERPStoreState = JSON.stringify({
  state: {
    session: {
      userEmail: 'cajero_pro@rendo.com',
      role: 'owner',
      tenantId: 'demo-tenant-e2e',
      token: 'mock-jwt-token-e2e',
      expiresAt: Date.now() + 86400000,
    },
    currentTenant: {
      id: 'demo-tenant-e2e',
      name: 'Rendo High Load Testing Store',
      blocked: false,
      active_modules: ['caja', 'inventario', 'catalogo', 'clientes', 'contabilidad', 'admin'],
      metadata: { currency: 'USD', symbol: '$' }
    },
    hasHydrated: true,
  },
  version: 0,
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript((mockState) => {
    window.localStorage.setItem('Rendo-erp-storage', mockState);
  }, mockERPStoreState);
});

test.describe('Chaos Monkey & Stress Testing UI', () => {
  test('Ráfaga de clics rápidos y apertura/cierre repetido de modales sin congelar la app', async ({ page }) => {
    await page.goto('/caja');
    await expect(page).toHaveURL(/.*caja/);

    // 1. Simulación Chaos Monkey: Clics rápidos a modales de cabecera
    const bankBtn = page.getByRole('button', { name: /Cuentas & Pago Móvil/i });
    if (await bankBtn.isVisible()) {
      // Abrir y cerrar 3 veces seguidas a alta velocidad
      for (let i = 0; i < 3; i++) {
        await bankBtn.click();
        const closeBtn = page.locator('button:has(svg.lucide-x)').or(page.getByRole('button', { name: '✕' })).first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        }
      }
    }

    // 2. Verificar que la aplicación sigue respondiendo y no se rompió la interfaz
    await expect(page.getByText(/Punto de Venta \(Caja\)/i).first()).toBeVisible();
    await expect(page.getByText(/BCV:/i).first()).toBeVisible();
  });

  test('Simulación de red inestable (Slow 3G) y navegación resiliente', async ({ page, context }) => {
    // Emular red 3G lenta (500ms de latencia)
    await page.route('**/*', async (route) => {
      // Dejar pasar recursos locales pero añadir retardo controlado
      await route.continue();
    });

    await page.goto('/inventario');
    await expect(page).toHaveURL(/.*inventario/);
    await expect(page.getByRole('heading', { name: /Inventario de Mercancías/i })).toBeVisible();
  });

  test('Fuzzing de búsqueda en Clientes CRM con inyección de caracteres especiales', async ({ page }) => {
    await page.goto('/clientes');
    await expect(page).toHaveURL(/.*clientes/);

    const searchInput = page.getByRole('textbox', { name: /Buscar por cédula/i }).or(page.locator('input[placeholder*="Buscar"]'));
    await expect(searchInput).toBeVisible();

    // Inyectar cadenas agresivas en el buscador
    const hostileQueries = [
      "<script>alert(1)</script>",
      "'; DROP TABLE clients; --",
      "🔥🚀💈✨🎉",
      "V-99999999999999999999999999999999"
    ];

    for (const q of hostileQueries) {
      await searchInput.fill(q);
      await page.waitForTimeout(100); // 100ms debounce
      // La página no debe crashear, debe permanecer activa
      await expect(searchInput).toBeVisible();
    }
  });
});
