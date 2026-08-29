import { test, expect } from '@playwright/test';
test.setTimeout(180000);
test('Flujo completo de QA con screenshots', async ({ page }) => {
  // 1. Login
  await page.goto('https://saascore-erp.vercel.app/dashboard');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle', { timeout: 120000 });
  await page.screenshot({ path: 'login.png' });

  // Verificar que un módulo carga sin error (Cliente CRM)
  await page.click('a[href="/clientes"]');
  await page.waitForSelector('[data-test-id="clientes-page"]');
  await expect(page.locator('text=Directorio CRM')).toBeVisible();
  await page.screenshot({ path: 'module_clientes.png' });

  // 2. Crear usuario
  await page.click('a[href="/usuarios"]');
  await page.waitForSelector('[data-test-id="usuarios-page"]');
  await page.click('button:has-text("Nuevo Usuario")');
  await page.fill('input[name="name"]', 'Usuario QA');
  await page.fill('input[name="email"]', 'qa_user@example.com');
  await page.selectOption('select[name="role"]', 'admin');
  await page.click('button:has-text("Guardar")');
  await expect(page.locator('text=Usuario QA')).toBeVisible();
  await page.screenshot({ path: 'usuario.png' });

  // 3. Crear cliente
  await page.click('a[href="/clientes"]');
  await page.waitForSelector('[data-test-id="clientes-page"]');
  await page.click('button:has-text("Nuevo Cliente")');
  await page.fill('input[name="company"]', 'Cliente QA');
  await page.fill('input[name="contact"]', 'qa_contact@example.com');
  await page.click('button:has-text("Guardar")');
  await expect(page.locator('text=Cliente QA')).toBeVisible();
  await page.screenshot({ path: 'cliente.png' });

  // 4. Crear producto
  await page.click('a[href="/catalogo"]');
  await page.waitForSelector('[data-test-id="catalogo-page"]');
  await page.click('button:has-text("Nuevo Ítem")');
  await page.fill('input[name="name"]', 'Producto QA');
  await page.fill('input[name="price"]', '100');
  await page.fill('input[name="sku"]', 'QA-001');
  await page.click('button:has-text("Guardar")');
  await expect(page.locator('text=Producto QA')).toBeVisible();
  await page.screenshot({ path: 'producto.png' });

  // 5. Generar factura
  await page.click('a[href="/ventas"]');
  await page.waitForSelector('[data-test-id="ventas-page"]');
  await page.click('button:has-text("Nueva Factura")');
  await page.selectOption('select[name="clientId"]', { label: 'Cliente QA' });
  await page.click('button:has-text("Añadir Ítem")');
  await page.selectOption('select[name="productId"]', { label: 'Producto QA' });
  await page.fill('input[name="quantity"]', '2');
  await page.click('button:has-text("Guardar Ítem")');
  await page.click('button:has-text("Crear Factura")');
  await expect(page.locator('text=Factura creada')).toBeVisible();
  await page.screenshot({ path: 'factura.png' });

  // 6. Pago mixto
  await page.click('button:has-text("Registrar Pago")');
  await page.fill('input[name="amountCash"]', '150');
  await page.fill('input[name="amountTransfer"]', '50');
  await page.click('button:has-text("Confirmar Pago")');
  await expect(page.locator('text=Pago registrado')).toBeVisible();
  await page.screenshot({ path: 'pago.png' });

  // 7. Cierre de caja
  await page.click('a[href="/caja"]');
  await page.waitForSelector('[data-test-id="caja-page"]');
  await page.click('button:has-text("Cierre Z")');
  await page.click('button:has-text("Confirmar")');
  await expect(page.locator('text=Cierre Z completado')).toBeVisible();
  await page.screenshot({ path: 'cierre.png' });

  console.log('✅ QA flow completed');
});
