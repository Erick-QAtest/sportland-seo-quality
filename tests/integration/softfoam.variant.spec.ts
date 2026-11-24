
import { test, expect } from '@playwright/test';

test('SF-005: la variante 22 coincide con Shopify', async ({
  page,
  request,
}) => {
  // ARRANGE: producto y variante investigados
  const productPath =
    '/products/tenis-puma-ftr-connect-fs-copia';

  const selectedSize = '22';
  const variantId = '46698382426335';

  const baseUrl = 'https://sportlandmx.com';

  const productUrl = new URL(productPath, baseUrl);

  productUrl.searchParams.set('variant', variantId);
  productUrl.searchParams.set('size', selectedSize);

  // ACT 1: consultar los datos públicos del producto
  const endpoint = `${baseUrl}${productPath}.js`;

  const response = await request.get(endpoint, {
    timeout: 10_000,
    failOnStatusCode: false,
  });

  // BLOCKER: límite de solicitudes de Shopify
  if (response.status() === 429) {
    const retryAfter =
      response.headers()['retry-after'] ?? 'no indicado';

    throw new Error(
      `BLOCKED — RATE_LIMITED: Shopify respondió HTTP 429. ` +
      `Retry-After: ${retryAfter}. ` +
      `No fue posible verificar la variante ${variantId}.`
    );
  }

  // ASSERT 1: respuesta HTTP correcta
  expect(
    response.status(),
    `El endpoint respondió HTTP ${response.status()}`
  ).toBe(200);

  const product = await response.json();

  // ASSERT 2: encontrar la variante
  const variant = product.variants.find(
    (v: { id: number }) =>
      String(v.id) === variantId
  );

  if (!variant) {
    throw new Error(
      `La variante ${variantId} no existe en el producto`
    );
  }

  // ASSERT 3: validar talla y disponibilidad
  expect(variant.title).toBe(selectedSize);
  expect(variant.available).toBe(true);

  // ACT 2: abrir la ficha de producto
  const pageResponse = await page.goto(
    productUrl.toString()
  );

  expect(pageResponse?.status()).toBe(200);

  // ASSERT 4: conservar la variante seleccionada
  await expect(page).toHaveURL(
    new RegExp(`variant=${variantId}`)
  );

  // ASSERT 5: permitir iniciar la compra
  await expect(
    page.getByRole('button', {
      name: /Agregar al carrito/i,
    })
  ).toBeEnabled();
});
