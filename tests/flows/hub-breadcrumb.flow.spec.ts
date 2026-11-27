import { test, expect } from '@playwright/test';
import { readCsv } from '../../services/csv';

/*
 * Hub de actividades (24-nov-2026): cada guía de "mejores tenis para…"
 * pertenece al hub /pages/tenis-segun-actividad-y-necesidad.
 *
 * El tema lo resuelve con el metacampo de artículo custom.hub:
 *   - breadcrumb visible con enlace al hub,
 *   - BreadcrumbList cuyo 3er elemento es el hub,
 *   - el hub enlaza de vuelta a la guía.
 *
 * DATOS: data/seo/hub-actividad-2026-11-24.csv
 */
const GUIAS = readCsv('data/seo/hub-actividad-2026-11-24.csv');

test.describe('Guías ↔ hub de actividades @flujo-critico', () => {
  for (const g of GUIAS) {
    test(`${g.guia} pertenece al hub`, async ({ page }) => {
      expect((await page.goto(g.guia))?.status()).toBe(200);

      await test.step('enlace visible al hub', async () => {
        await expect(page.locator(`a[href="${g.hub}"]`).first()).toBeAttached();
      });

      await test.step('BreadcrumbList incluye el hub', async () => {
        const schemas = await page
          .locator('script[type="application/ld+json"]')
          .evaluateAll((n) => n.map((s) => s.textContent ?? ''));
        const crumbs = schemas.filter((s) => s.includes('BreadcrumbList')).map((s) => JSON.parse(s));
        expect(crumbs.length, 'falta BreadcrumbList').toBeGreaterThan(0);
        const urls = crumbs[0].itemListElement.map((i: { item?: string }) => i.item ?? '');
        expect(urls.some((u: string) => u.endsWith(g.hub)), '¿se publicó el tema?').toBe(true);
      });
    });
  }

  test('la home enlaza al hub de actividades', async ({ page }) => {
    expect((await page.goto('/'))?.status()).toBe(200);
    await expect(page.locator(`a.sportland-guide-card--actividad[href="${GUIAS[0].hub}"]`)).toHaveCount(1);
  });

  test('el hub enlaza a todas sus guías', async ({ page }) => {
    expect((await page.goto(GUIAS[0].hub))?.status()).toBe(200);
    for (const g of GUIAS) {
      await expect(page.locator(`a[href="${g.guia}"]`).first(), g.guia).toBeAttached();
    }
  });
});
