
import { test, expect } from '@playwright/test';
import { seoPages } from '../../data/seo-pages';

const BASE_URL = 'https://sportlandmx.com';

for (const seoPage of seoPages) {
  test(`SEO-003: H1 de ${seoPage.name}`, async ({ page }) => {

    // ARRANGE: abrir la página
    await page.goto(BASE_URL + seoPage.path);

    // ACT: localizar los H1 visibles
    const headings = page.locator('h1:visible');

    const texts = await headings.allTextContents();

    // REPORT: mostrar los encabezados
    console.log(`${seoPage.name}: ${texts.length} H1`);
    console.table(texts);

    // ASSERT: debe existir al menos un H1
    expect(texts.length).toBeGreaterThan(0);
    expect(
        texts.length,
        `SEO-003: ${seoPage.name} no tiene un H1 visible`
      ).toBeGreaterThan(0);
  });
}
