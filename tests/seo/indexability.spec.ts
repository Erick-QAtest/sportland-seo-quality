
import { test, expect } from '@playwright/test';
import { seoPages } from '../../data/seo-pages';
import { gotoRespectingRateLimit, skipIfBlocked } from '../../services/rate-limit';

const BASE_URL = 'https://sportlandmx.com';

for (const seoPage of seoPages) {
  test(`SEO-004: indexabilidad de ${seoPage.name}`, async ({ page }) => {

    // ARRANGE: abrir la página
    const url = new URL(seoPage.path, BASE_URL);
    const response = await gotoRespectingRateLimit(page, url.toString());
    skipIfBlocked(response, seoPage.path);

    // ASSERT 1: respuesta HTTP correcta
    expect(response?.status()).toBe(200);

    // ACT: obtener directivas meta robots
    const robotsMeta = page.locator(
      'meta[name="robots" i], meta[name="googlebot" i]'
    );

    const directives = await robotsMeta.evaluateAll(elements =>
      elements.map(element =>
        element.getAttribute('content') ?? ''
      )
    );

    // ACT: obtener directivas HTTP
    const xRobotsTag =
      response?.headers()['x-robots-tag'] ?? '';

    // REPORT: mostrar las directivas encontradas
    console.log(`${seoPage.name}:`, {
      expectedIndexability: seoPage.expectedIndexability,
      directives,
      xRobotsTag,
    });

    // Combinar las directivas
    const allDirectives = [
      ...directives,
      xRobotsTag,
    ].join(', ');

    // ASSERT 2: validar según la regla de negocio
    if (seoPage.expectedIndexability === 'indexable') {
      expect(
        allDirectives,
        `${seoPage.name} no debería tener noindex`
      ).not.toMatch(/\bnoindex\b/i);

    } else {
      expect(
        allDirectives,
        `${seoPage.name} debería tener noindex`
      ).toMatch(/\bnoindex\b/i);
    }

  });
}
