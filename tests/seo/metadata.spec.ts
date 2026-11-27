
import { test, expect } from '@playwright/test';
import { seoPages } from '../../data/seo-pages';
import { gotoRespectingRateLimit, skipIfBlocked } from '../../services/rate-limit';

const BASE_URL = 'https://sportlandmx.com';

for (const seoPage of seoPages) {
  test(`${seoPage.id}: metadatos de ${seoPage.name}`, async ({ page }) => {

    // ARRANGE: construir la URL de la página
    const expectedUrl = new URL(seoPage.path, BASE_URL);

    // ACT: navegar a la página
    const response = await gotoRespectingRateLimit(page, expectedUrl.toString());
    skipIfBlocked(response, seoPage.path);

    // ASSERT 1: comprobar respuesta HTTP
    expect(response?.status()).toBe(200);

    // ASSERT 2: comprobar el título
    await expect(page).toHaveTitle(seoPage.keyword);

    // ASSERT 3: comprobar la meta descripción
    const description = page.locator('meta[name="description"]');

    await expect(description).toHaveCount(1);

    const descriptionText = await description.getAttribute('content');

    expect(
      descriptionText?.trim().length ?? 0
    ).toBeGreaterThan(0);

    // ASSERT 4: comprobar el canonical
    const canonical = page.locator('link[rel="canonical"]');

    await expect(canonical).toHaveCount(1);

    const href = await canonical.getAttribute('href');

    expect(href).toBeTruthy();

    const canonicalUrl = new URL(href!, page.url());

    expect(canonicalUrl.origin).toBe(BASE_URL);
    expect(canonicalUrl.pathname).toBe(seoPage.path);

  });
}
