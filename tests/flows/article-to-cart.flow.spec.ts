import { test, expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { readCsv } from '../../services/csv';
import {
  validateRelatedBlock,
  type AvailabilityLookup,
} from '../../services/related-products';
import { ArticlePage } from '../../pages/ArticlePage';
import { ProductPage } from '../../pages/ProductPage';

// DATOS: la fuente de verdad es el CSV, no una lista copiada aquí.
const MAPPING = readCsv('data/seo/fase1-colecciones-2026-11-23.csv');

// Un solo lugar que sabe tratar el límite de Shopify (429).
// Esperar lo que el servidor PIDE (Retry-After) no es un "sleep" frágil:
// es cortesía con la API, con un tope para no colgar el test.
// Devuelve la respuesta, o 'BLOCKED' si Shopify siguió frenando.
// NUEVO (cambio 1): maxWaitSeconds permite a cada llamador fijar su tope.
async function fetchRespectingRateLimit(
  request: APIRequestContext,
  url: string,
  attempts = 3,
  maxWaitSeconds = 30
): Promise<APIResponse | 'BLOCKED'> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const response = await request.get(url, { failOnStatusCode: false });

    if (response.status() !== 429) {
      return response;
    }

    if (attempt < attempts) {
      const retryAfter = Math.min(
        Number(response.headers()['retry-after'] ?? 5),
        maxWaitSeconds
      );
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    }
  }

  return 'BLOCKED';
}

// ORÁCULO: Shopify dice si cada producto está disponible.
// Sirve para VERIFICAR lo que muestra la página (parte A),
// no para manejar el recorrido del usuario (parte B).
async function checkAvailability(
  request: APIRequestContext,
  productPaths: string[]
): Promise<AvailabilityLookup> {
  const result: AvailabilityLookup = {};

  for (const productPath of productPaths) {
    // NUEVO (cambio 2): presupuesto chico, 2 intentos y como máximo 10 s
    // de espera por producto. Si aun así hay 429, queda BLOCKED (anotado)
    // en vez de colgar el test.
    const response = await fetchRespectingRateLimit(request, `${productPath}.js`, 2, 10);

    // 429 persistente = no sabemos el estado: es BLOCKED, no falla.
    if (response === 'BLOCKED') {
      result[productPath] = 'BLOCKED';
      continue;
    }

    result[productPath] = response.ok()
      ? Boolean((await response.json()).available)
      : false;
  }

  return result;
}

// PARTE A: un test por artículo del CSV (data-driven).
test.describe('Flujo 1A: artículo → bloque de productos @flujo-critico', () => {
  // NUEVO (cambio 3): el tiempo del test debe cubrir el peor caso.
  // Peor caso: 4 productos × 10 s de espera + ~10 s de carga = ~50 s.
  // 90 s deja margen sin permitir que un test se cuelgue minutos.
  test.describe.configure({ timeout: 90_000 });

  for (const row of MAPPING) {
    test(`${row.handle} → ${row.coleccion}`, async ({ page, request }) => {
      const article = new ArticlePage(page);

      // ARRANGE + ACT: abrir el artículo
      const response = await article.goto(row.path);

      // ASSERT 1: la página existe y no redirige
      expect(response?.status(), 'El artículo debe responder 200').toBe(200);
      expect(
        response?.request().redirectedFrom(),
        'El artículo no debe redirigir'
      ).toBeNull();

      // ACT 2: extraer el bloque y consultar el oráculo
      const snapshot = await article.readRelatedBlock();
      const availability = await checkAvailability(request, snapshot.productPaths);

      // Un verde con productos sin verificar no es un verde completo.
      // Lo dejamos anotado para que se vea en el reporte.
      const blocked = Object.values(availability)
        .filter(state => state === 'BLOCKED').length;

      if (blocked > 0) {
        test.info().annotations.push({
          type: 'BLOCKED',
          description: `${blocked} producto(s) sin verificar: Shopify respondió 429`,
        });
      }

      // Evidencia en el reporte, en lugar de console.log
      await test.info().attach('bloque.json', {
        body: JSON.stringify({ snapshot, availability }, null, 2),
        contentType: 'application/json',
      });

      // ASSERT 2: todas las invariantes
      const violations = validateRelatedBlock(snapshot, row.coleccion, availability);

      expect(
        violations,
        violations.map(v => `${v.rule}: ${v.message}`).join('\n')
      ).toEqual([]);
    });
  }
});

// PARTE B: recorrido completo, como un usuario, hasta el carrito.
// Solo usa lo que usa un cliente: página, clics y carrito. Nada de .js.
test('Flujo 1B: SoftFoam → producto → carrito @flujo-critico', async ({ page }) => {
  test.setTimeout(60_000);

  const article = new ArticlePage(page);
  const product = new ProductPage(page);

  await test.step('1. Abrir el artículo de SoftFoam', async () => {
    const response = await article.goto(
      '/blogs/noticias/cuales-son-los-beneficios-de-las-plantilla-soft-foam-puma'
    );
    expect(response?.status(), 'El artículo debe responder 200').toBe(200);
    // Falla rápido y claro si el bloque no está, en vez de esperar 30 s.
    await expect(article.productCards.first()).toBeVisible({ timeout: 10_000 });
  });

  await test.step('2. Ir del artículo al producto con un clic', async () => {
    await article.productCards.first().locator('h3 a').click();
    await expect(page).toHaveURL(/\/products\//);
    await expect(product.productHeading).toBeVisible();
  });

  // El handle sirve para reconocer el producto dentro del carrito.
  const productHandle = new URL(page.url()).pathname.split('/products/')[1];

  // Elegir talla como un usuario: mirando qué botones están habilitados.
  const size = await test.step('3. Elegir la primera talla disponible en la página', async () => {
    return product.firstAvailableSize();
  });

  // El tema exige TOCAR la talla; ?variant= en la URL no la selecciona.
  await test.step(`4. Seleccionar talla ${size} y agregar al carrito`, async () => {
    await product.selectSize(size);
    await expect(product.addToCartButton).toBeEnabled();
    await product.addToCartButton.click();
  });

  // El carrito confirma el producto Y la talla que el usuario tocó.
  await test.step('5. Verificar el carrito real de Shopify', async () => {
    await expect
      .poll(
        async () => {
          // Si /cart.js responde 429, devolvemos false y poll reintenta.
          const response = await page.request.get('/cart.js', { failOnStatusCode: false });
          if (!response.ok()) return false;

          const cart = await response.json();
          return cart.items.some(
            (item: { handle: string; variant_options: string[] }) =>
              item.handle === productHandle && item.variant_options.includes(size)
          );
        },
        { message: `El carrito debe tener ${productHandle} en talla ${size}`, timeout: 15_000 }
      )
      .toBe(true);
  });
});