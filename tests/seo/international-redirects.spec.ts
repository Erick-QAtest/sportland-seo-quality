
import { test, expect } from '@playwright/test';
import { getRespectingRateLimit, skipIfBlocked } from '../../services/rate-limit';

const baseURL = 'https://sportlandmx.com';

const phase = process.env.SEO_PHASE ?? 'pre';

type RedirectStatus =
  | 'REDIRECT_OK'
  | 'LOCALE_ACTIVE'
  | 'NEEDS_REVIEW';

const routes = [
  {
    old: '/de-us/blogs/noticias/cuales-son-los-beneficios-de-las-plantilla-soft-foam-puma',
    target: '/blogs/noticias/cuales-son-los-beneficios-de-las-plantilla-soft-foam-puma',
  },
  {
    old: '/de-de/blogs/noticias/cloudfoam-adidas-que-es-y-cuales-son-sus-beneficios',
    target: '/blogs/noticias/cloudfoam-adidas-que-es-y-cuales-son-sus-beneficios',
  },
  {
    old: '/de-de/blogs/noticias/cuales-son-los-beneficios-de-las-plantilla-soft-foam-puma',
    target: '/blogs/noticias/cuales-son-los-beneficios-de-las-plantilla-soft-foam-puma',
  },
  {
    old: '/en-us/blogs/noticias/cuales-son-los-beneficios-de-las-plantilla-soft-foam-puma',
    target: '/blogs/noticias/cuales-son-los-beneficios-de-las-plantilla-soft-foam-puma',
  },
  {
    old: '/de-de/blogs/noticias/como-saber-si-mis-air-force-1-son-originales',
    target: '/blogs/noticias/como-saber-si-mis-air-force-1-son-originales',
  },
  {
    old: '/de-us/blogs/originales-o-fake/eiqueta-de-converse-originales-revision-detallada',
    target: '/blogs/originales-o-fake/eiqueta-de-converse-originales-revision-detallada',
  },
];

test.describe('SPORTLAND SEO — International Redirects', () => {

  for (const route of routes) {

    test(`International SEO: ${route.old}`, async ({ request }) => {

      // 1. Consultar la URL internacional sin seguir redirecciones.
      const oldResponse = await getRespectingRateLimit(
        request,
        baseURL + route.old,
        { maxRedirects: 0 }
      );
      skipIfBlocked(oldResponse, route.old);

      const status = oldResponse.status();

      const location =
        oldResponse.headers()['location'];

      // 2. Normalizar el destino de la redirección.
      const destinationURL = location
        ? new URL(location, baseURL + route.old)
        : null;

      const destination =
        destinationURL?.pathname ?? null;

      const sameOrigin =
        destinationURL?.origin === new URL(baseURL).origin;

      // 3. Clasificar la URL internacional.
      let result: RedirectStatus;

      if (
        status === 301 &&
        sameOrigin &&
        destination === route.target
      ) {
        result = 'REDIRECT_OK';
      } else if (status === 200) {
        result = 'LOCALE_ACTIVE';
      } else {
        result = 'NEEDS_REVIEW';
      }

      // 4. Verificar que el artículo español funcione.
      const targetResponse = await getRespectingRateLimit(
        request,
        baseURL + route.target
      );
      skipIfBlocked(targetResponse, route.target);

      const targetStatus = targetResponse.status();

      // 5. Mostrar el resultado.
      console.log('\n=== SPORTLAND INTERNATIONAL SEO ===');

      console.log({
        source: route.old,
        status,
        destination,
        expectedTarget: route.target,
        targetStatus,
        result,
        phase,
      });

      // 6. El artículo español debe responder HTTP 200.
      expect(
        targetStatus,
        `El artículo español ${route.target} no responde HTTP 200`
      ).toBe(200);

      // 7. Validaciones por fase.
      if (phase === 'pre') {

        // Antes de desactivar mercados, aceptamos
        // páginas regionales todavía activas.
        // Pero rechazamos redirecciones incorrectas.
        expect(
          result,
          `La URL ${route.old} necesita revisión`
        ).not.toBe('NEEDS_REVIEW');

      } else if (phase === 'post') {

        // Después de desactivar los mercados,
        // todas las URLs del lote deben redirigir.
        expect(
          result,
          `La URL ${route.old} no tiene un 301 correcto`
        ).toBe('REDIRECT_OK');

      } else {
        throw new Error(
          `SEO_PHASE inválido: ${phase}. Usa pre o post.`
        );
      }

    });

  }

});
