
import { test, expect } from '@playwright/test';

const scenarios = [
  {
    name: 'Talla 22 disponible',
    available: true
  },
  {
    name: 'Talla 22 agotada',
    available: false
  }
];

test.describe('SF-005: disponibilidad de variantes', () => {
  for (const scenario of scenarios) {
    test(scenario.name, async ({ page }) => {

      const origin = 'https://sportland.test';
      const productPath = '/products/puma.js';

      // Simulamos una página local
      await page.route(`${origin}/`, route =>
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: '<html><body>QA Lab</body></html>'
        })
      );

      // Mock de la API
      await page.route(`${origin}${productPath}`, route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            variants: [{
              id: 46698382426335,
              title: '22',
              available: scenario.available
            }]
          })
        })
      );

      await page.goto(origin);

      // Consultar respuesta simulada
      const product = await page.evaluate(async path => {
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      }, productPath);

      const variant = product.variants.find(
        (v: { title: string }) => v.title === '22'
      );

      expect(variant).toBeDefined();
      expect(variant.available).toBe(scenario.available);
    });
  }
});
