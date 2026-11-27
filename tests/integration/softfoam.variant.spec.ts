
import { test, expect } from '@playwright/test';
import { gotoRespectingRateLimit, getRespectingRateLimit, skipIfBlocked } from '../../services/rate-limit';

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

  // BLOCKER: si Shopify sigue frenando (429), la prueba queda omitida.
  const response = await getRespectingRateLimit(request, endpoint, { timeout: 10_000 });
  skipIfBlocked(response, `${productPath}.js (variante ${variantId})`);

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
  const pageResponse = await gotoRespectingRateLimit(
    page,
    productUrl.toString()
  );
  skipIfBlocked(pageResponse, productPath);

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
