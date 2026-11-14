
import { test, expect } from '@playwright/test';
import { seoPages } from '../../data/seo-pages';
import { canCrawl } from '../../services/robots-auditor';

const BASE_URL = 'https://sportlandmx.com';
const ROBOTS_URL = `${BASE_URL}/robots.txt`;

for (const seoPage of seoPages) {

  test(`SEO-005: rastreo de ${seoPage.name}`, async ({ request }) => {

    // ARRANGE: obtener robots.txt
    const response = await request.get(ROBOTS_URL);

    // ASSERT 1: robots.txt debe responder correctamente
    expect(response.status()).toBe(200);

    const robotsText = await response.text();

    // ASSERT 2: comprobar que contiene reglas
    expect(robotsText).toMatch(/^\s*user-agent\s*:/im);

    // ACT: analizar la URL de la página
    const pageUrl = new URL(
      seoPage.path,
      BASE_URL
    ).toString();

    const allowed = canCrawl(
      robotsText,
      ROBOTS_URL,
      pageUrl,
      'Googlebot'
    );

    // REPORT
    console.log(`${seoPage.name}:`, {
      url: pageUrl,
      googlebotAllowed: allowed,
    });

    // ASSERT 3: nuestras páginas SEO deben ser rastreables
    expect(
      allowed,
      `Googlebot no puede rastrear ${seoPage.name}`
    ).toBe(true);

  });
}
