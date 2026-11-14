
import { test, expect } from '@playwright/test';

test('SF-005: la variante 22 coincide con Shopify', async ({
  page,
  request
}) => {
  // ARRANGE: producto y variante investigados
  const productPath =
    '/products/tenis-puma-ftr-connect-fs-copia';

  const selectedSize = '22';
  const variantId = '46698382426335';

  const productUrl = new URL(
    productPath,
    'https://sportlandmx.com'
  );

  productUrl.searchParams.set('variant', variantId);
  productUrl.searchParams.set('size', selectedSize);

  
const endpoint = `https://sportlandmx.com${productPath}.js`;

let response = await request.get(endpoint);

if (response.status() === 429) {
  const retryAfter = Number(
    response.headers()['retry-after'] ?? '60'
  );

  if (!Number.isFinite(retryAfter) ||
      retryAfter < 0 ||
      retryAfter > 120) {
    throw new Error('Retry-After inválido o excesivo');
  }

  console.log(`Rate limited. Retry after ${retryAfter}s`);

  await new Promise(resolve =>
    setTimeout(resolve, retryAfter * 1000)
  );

  response = await request.get(endpoint);
}

expect(
  response.status(),
  'Shopify debe responder HTTP 200'
).toBe(200);

  const product = await response.json();

  // ASSERT: identificar la variante seleccionada
  const variant = product.variants.find(
    (v: { id: number }) =>
      String(v.id) === variantId
  );

  expect(variant).toBeDefined();
  expect(variant.title).toBe(selectedSize);
  expect(variant.available).toBe(true);

  // ACT 2: abrir la ficha de producto
  await page.goto(productUrl.toString());

  // ASSERT: la URL conserva la variante
  await expect(page).toHaveURL(
    /variant=46698382426335/
  );

  // ASSERT: el botón de compra está habilitado
  await expect(
    page.getByRole('button', {
      name: /Agregar al carrito/i
    })
  ).toBeEnabled();
});
