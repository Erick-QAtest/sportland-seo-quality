import { test, expect } from '@playwright/test';
import { readCsv } from '../../services/csv';

/*
 * Guías de compra (24-nov-2026): reglas del formato que monetiza con afiliados.
 *
 *  - Aviso de afiliado visible (lo exige Amazon Afiliados).
 *  - Todo enlace a Amazon lleva rel="sponsored" (lo pide Google para enlaces pagados).
 *  - Pocos enlaces de afiliado: uno por modelo, no 10 a 40.
 *  - Sin precios escritos a mano junto al afiliado (Amazon no lo permite).
 *  - Los enlaces internos de la escalera hacia la compra existen.
 *  - El video propio está insertado cuando la guía tiene uno.
 *
 * DATOS: data/seo/guias-compra-2026-11-24.csv
 */
const GUIAS = readCsv('data/seo/guias-compra-2026-11-24.csv');
const AMAZON = 'a[href*="amazon.com.mx"], a[href*="amzn.to"], a[href*="link.amazon"]';

test.describe('Guías de compra con afiliados @flujo-critico', () => {
  for (const guia of GUIAS) {
    test(`${guia.guia} cumple el formato de guía de compra`, async ({ page }) => {
      const response = await page.goto(guia.guia);
      expect(response?.status(), 'la guía responde').toBe(200);
      const body = page.locator('.blog-post-content');

      await test.step('aviso de afiliado visible', async () => {
        await expect(body.locator('.sl-aff-disclosure')).toBeVisible();
      });

      await test.step('enlaces de Amazon: sponsored y pocos', async () => {
        const links = body.locator(AMAZON);
        const total = await links.count();
        expect(total, 'al menos un enlace de afiliado').toBeGreaterThan(0);
        expect(total, 'demasiados enlaces de afiliado').toBeLessThanOrEqual(Number(guia.max_afiliados));
        for (const rel of await links.evaluateAll((as) => as.map((a) => a.getAttribute('rel') ?? ''))) {
          expect(rel).toContain('sponsored');
        }
      });

      await test.step('sin precios fijos junto al afiliado', async () => {
        for (const text of await body.locator('.sl-pick').allInnerTexts()) {
          expect(text, 'precio escrito a mano en una recomendación').not.toMatch(/\$\s?\d/);
        }
      });

      for (const destino of guia.enlaces_internos.split('|').filter(Boolean)) {
        await test.step(`enlace interno → ${destino}`, async () => {
          await expect(body.locator(`a[href="${destino}"]`).first()).toBeAttached();
        });
      }

      if (guia.video) {
        await test.step(`video propio ${guia.video}`, async () => {
          await expect(body.locator(`iframe[src*="${guia.video}"]`)).toHaveCount(1);
        });
      }
    });
  }

  // Enlaces entrantes: un artículo fuerte le pasa autoridad a la guía.
  for (const guia of GUIAS.filter((g) => g.enlazada_desde)) {
    for (const origen of guia.enlazada_desde.split('|')) {
      test(`${origen} enlaza a ${guia.guia}`, async ({ page }) => {
        const response = await page.goto(origen);
        expect(response?.status(), 'el artículo de origen responde').toBe(200);
        await expect(
          page.locator('.blog-post-content').locator(`a[href="${guia.guia}"]`).first()
        ).toBeAttached();
      });
    }
  }
});
