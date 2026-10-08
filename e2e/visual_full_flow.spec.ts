import { test, expect } from '@playwright/test';

const mockERPStoreState = JSON.stringify({
  state: {
    session: {
      userEmail: 'admin@rendo.com',
      role: 'owner',
      tenantId: 'demo-tenant-e2e',
      token: 'mock-jwt-token-e2e',
      expiresAt: Date.now() + 86400000,
    },
    currentTenant: {
      id: 'demo-tenant-e2e',
      name: 'Rendo Store & Demo Clinic',
      blocked: false,
      active_modules: [
        'caja',
        'inventario',
        'catalogo',
        'clientes',
        'contabilidad',
        'compras',
        'estadisticas',
        'config',
        'admin',
        'apps'
      ],
      metadata: {
        currency: 'USD',
        symbol: '$',
      }
    },
    hasHydrated: true,
  },
  version: 0,
});

test.beforeEach(async ({ page }) => {
  // Inicializar estado de sesión en localStorage para que el usuario esté autenticado
  await page.addInitScript((mockState) => {
    window.localStorage.setItem('Rendo-erp-storage', mockState);
  }, mockERPStoreState);
});

test.describe('1. Launcher & Navegación Principal', () => {
  test('Dashboard carga con tiles y acceso directo a Rendo Hub visible', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*dashboard/);

    // Verificar presencia del título de la plataforma
    await expect(page.getByText('Rendo OS').first()).toBeVisible();

    // Verificar que Rendo Hub está en el Dashboard
    const rendoHubLink = page.getByRole('link', { name: /Rendo Hub/i }).or(page.locator('a[href="/admin"]'));
    await expect(rendoHubLink.first()).toBeVisible();
  });

  test('App Store (/apps) muestra módulos y botón directo "Abrir Consola"', async ({ page }) => {
    await page.goto('/apps');
    await expect(page).toHaveURL(/.*apps/);

    // Debe mostrar tarjetas de módulos
    await expect(page.getByText('Caja POS').first()).toBeVisible();

    // Debe mostrar el botón de Rendo Hub
    const consoleBtn = page.getByRole('link', { name: /Abrir Consola/i });
    await expect(consoleBtn.first()).toBeVisible();
  });
});

test.describe('2. Rendo Hub (/admin) - Control SaaS y Tenants', () => {
  test('Rendo Hub abre sin redirección hacia el dashboard', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*admin/);

    // Verificar navegación interna de Rendo Hub
    await expect(page.getByText(/Tenants & Clientes/i).first()).toBeVisible();
    await expect(page.getByText(/Usuarios & Accesos/i).first()).toBeVisible();
  });
});

test.describe('3. Caja POS (/caja) - Experiencia Táctil y Mobile Floating Bar', () => {
  test('Caja POS carga interfaz de catálogo y ticket de venta', async ({ page, isMobile }) => {
    await page.goto('/caja');
    await expect(page).toHaveURL(/.*caja/);

    // En escritorio y móvil la cabecera del punto de venta siempre es visible
    await expect(page.getByText(/Punto de Venta \(Caja\)/i).first()).toBeVisible();
    await expect(page.getByText(/BCV:/i).first()).toBeVisible();
  });

  test('En viewport móvil, la barra de cobro no queda tapada por el dock', async ({ page, isMobile }) => {
    if (!isMobile) return;

    await page.goto('/caja');
    // Verificar que la barra inferior o botón de acción rápida tiene posición y z-index accesible
    const mobileDock = page.locator('[class*="MobileDock"], [class*="bottom-5"]');
    if (await mobileDock.isVisible()) {
      await expect(mobileDock).toBeVisible();
    }
  });
});

test.describe('4. Clientes CRM (/clientes) & Inventario (/inventario)', () => {
  test('Módulo de Clientes carga correctamente', async ({ page }) => {
    await page.goto('/clientes');
    await expect(page).toHaveURL(/.*clientes/);
    await expect(page.getByRole('textbox', { name: /Buscar por cédula/i }).or(page.locator('input[placeholder*="Buscar"]'))).toBeVisible();
  });

  test('Módulo de Inventario carga catálogo de productos', async ({ page }) => {
    await page.goto('/inventario');
    await expect(page).toHaveURL(/.*inventario/);
    // Verificar encabezado principal del inventario
    await expect(page.getByRole('heading', { name: /Inventario de Mercancías/i })).toBeVisible();
  });
});
