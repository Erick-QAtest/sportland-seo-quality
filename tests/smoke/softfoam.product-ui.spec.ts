
import { test, expect } from '@playwright/test';
import { ProductPage } from '../../pages/ProductPage';

test('SF-006: talla 22 permite iniciar compra', async ({ page }) => {

  // ARRANGE: crear el Page Object
  const product = new ProductPage(page);

  const productPath =
    '/products/tenis-puma-ftr-connect-fs-copia';

  const variantId = '46698382426335';
  const selectedSize = '22';

  // ACT: navegar al producto
  await product.goto(
    productPath,
    variantId,
    selectedSize
  );

  // ASSERT 1: producto correcto
  await expect(
    product.productHeading
  ).toContainText('Tenis Puma Ftr Connect Fs');

  // ASSERT 2: variante y talla correctas
  const destination = new URL(page.url());

  expect(destination.pathname).toBe(productPath);

  expect(
    destination.searchParams.get('variant')
  ).toBe(variantId);

  expect(
    destination.searchParams.get('size')
  ).toBe(selectedSize);

  // ASSERT 3: disponibilidad visible
  await expect(
    product.availabilityMessage(selectedSize)
  ).toBeVisible();

  // ASSERT 4: botón habilitado
  await expect(
    product.addToCartButton
  ).toBeEnabled();
});
