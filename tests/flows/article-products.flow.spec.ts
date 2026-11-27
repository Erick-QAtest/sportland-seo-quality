import { test, expect } from '@playwright/test';
import { readCsv } from '../../services/csv';

/*
 * Monetización con producto propio (24-nov-2026): los artículos de Converse
 * muestran Converse originales en stock en lugar de un CTA genérico.
 *
 * Qué protege:
 *  1. Cada enlace a producto sigue dentro del cuerpo del artículo.
 *  2. Cada producto enlazado sigue DISPONIBLE. Un artículo que manda a un
 *     producto agotado pierde la venta: este test avisa para cambiarlo.
 *
 * DATOS: data/seo/productos-en-articulos-2026-11-24.csv
 */
const LINKS = readCsv('data/seo/productos-en-articulos-2026-11-24.csv');

const byOrigin = new Map<string, typeof LINKS>();
for (const link of LINKS) {
  byOrigin.set(link.origen, [...(byOrigin.get(link.origen) ?? []), link]);
}

test.describe('Artículos → productos en stock @flujo-critico', () => {
  for (const [origen, links] of byOrigin) {
    test(`${origen} muestra ${links.length} enlaces de compra`, async ({ page }) => {
      const response = await page.goto(origen);
      expect(response?.status(), 'el artículo responde').toBe(200);

      const body = page.locator('.blog-post-content');
      for (const link of links) {
        await test.step(`${link.texto} → ${link.destino}`, async () => {
          await expect(
            body.locator(`a[href="${link.destino}"]`).filter({ hasText: link.texto })
          ).toHaveCount(1);
        });
      }
    });
  }

  test('los productos enlazados siguen disponibles', async ({ request }) => {
    const productos = [...new Set(LINKS.map((l) => l.destino))].filter((d) =>
      d.startsWith('/products/')
    );

    for (const producto of productos) {
      // /products/<handle>.js es el JSON público del tema: trae "available".
      const response = await request.get(`${producto}.js`, { failOnStatusCode: false });
      if (response.status() === 429) {
        test.info().annotations.push({ type: 'BLOCKED', description: producto });
        continue;
      }
      expect(response.status(), producto).toBe(200);
      const data = await response.json();
      expect(data.available, `${producto} está agotado: cámbialo en el artículo`).toBe(true);
    }
  });
});
