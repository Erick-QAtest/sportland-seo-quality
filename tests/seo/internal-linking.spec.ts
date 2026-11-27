import { test, expect } from '@playwright/test';
import { linkingRules } from '../../data/linking-rules';
import { auditLinks } from '../../services/link-auditor';
import { gotoRespectingRateLimit, getRespectingRateLimit, skipIfBlocked } from '../../services/rate-limit';

const BASE_URL = 'https://sportlandmx.com';

for (const rule of linkingRules) {
  test(`SF-004: ${rule.id} ${rule.type}`, async ({ page }) => {

    // ARRANGE: abrir la página de origen
    const sourceUrl = new URL(rule.source, BASE_URL);

    const pageResponse = await gotoRespectingRateLimit(
      page,
      sourceUrl.toString()
    );
    skipIfBlocked(pageResponse, rule.source);

    // ASSERT: la página de origen debe responder HTTP 200
    expect(pageResponse?.status()).toBe(200);

    // ACT: ejecutar nuestro servicio de auditoría
    const links = await auditLinks(page, rule.target);

    // REPORT: mostrar enlaces y clasificación
    console.log(
      `${rule.id}: ${links.length} enlace(s) hacia ${rule.target}`
    );

    console.table(links);

    // ASSERT: debe existir al menos un enlace
    expect(
      links.length,
      `No se encontraron enlaces hacia ${rule.target}`
    ).toBeGreaterThan(0);

    // ASSERT: todos los enlaces deben tener texto
    for (const link of links) {
      expect(
        link.text.length,
        `El enlace ${link.href} no tiene texto`
      ).toBeGreaterThan(0);
    }

    // ASSERT: comprobar respuesta HTTP sin redirecciones
    const destinationUrl = new URL(
      rule.target,
      BASE_URL
    );

    const response = await getRespectingRateLimit(
      page.request,
      destinationUrl.toString(),
      { maxRedirects: 0 }
    );
    skipIfBlocked(response, rule.target);

    expect(
      response.status(),
      `El destino ${destinationUrl.toString()} respondió HTTP ${response.status()}`
    ).toBe(200);

  });
}