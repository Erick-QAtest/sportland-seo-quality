
import { test, expect } from '@playwright/test';
import { routes } from '../../data/routes';

test('SF-001: el artículo SoftFoam carga correctamente', async ({ page }) => {
  // ARRANGE: definimos la URL que queremos probar.
  const url = 'https://sportlandmx.com' + routes.softfoamArticle;

  // ACT: navegamos al artículo.
  const response = await page.goto(url);

  // ASSERT: comprobamos la respuesta del servidor.
  expect(response?.status()).toBe(200);

  // ASSERT: comprobamos que existe un H1 visible.
  await expect(page.locator('h1').first()).toBeVisible();
});


test('SF-002: el usuario puede seleccionar una talla MX', async ({ page }) => {
    // ARRANGE: abrir el artículo
    await page.goto(
      'https://sportlandmx.com' + routes.softfoamArticle
    );
  
    // Localizar el selector
    const sizeSelector = page.locator('#sf3-size-choice');
  
    // ASSERT: debe existir y estar disponible
    await expect(sizeSelector).toBeVisible();
    await expect(sizeSelector).toBeEnabled();
  
    // Obtener las opciones con un valor no vacío
    const sizes = await sizeSelector.locator('option').evaluateAll(
      options => options
        .map(option => (option as HTMLOptionElement).value)
        .filter(value => value !== '')
    );
  
    expect(sizes.length).toBeGreaterThan(0);
  
    // ACT: seleccionar la primera opción válida
    const selectedSize = sizes[0];
    await sizeSelector.selectOption(selectedSize);
  
    // ASSERT: comprobar que se seleccionó
    await expect(sizeSelector).toHaveValue(selectedSize);
  });


test('SF-003: la talla se transmite a la colección', async ({ page }) => {
    // ARRANGE: abrir el artículo
    await page.goto(
      'https://sportlandmx.com' + routes.softfoamArticle
    );
  
    const sizeSelector = page.locator('#sf3-size-choice');
  
    // Obtener una talla válida
    const sizes = await sizeSelector.locator('option').evaluateAll(
      options => options
        .map(option => (option as HTMLOptionElement).value)
        .filter(value => value !== '')
    );
  
    expect(sizes.length).toBeGreaterThan(0);
    const selectedSize = sizes[0];
  
    // ACT: seleccionar talla y enviar el formulario
    await sizeSelector.selectOption(selectedSize);
  
    const form = page.locator('#sf3-size-form');
    await form.locator('button[type="submit"], input[type="submit"]').click();
  
    // ASSERT: comprobar la colección destino
    await expect(page).toHaveURL(/\/collections\/tenis-puma-con-softfoam-y-softfoam/);
  
    // Comprobar filtro de disponibilidad
    const destination = new URL(page.url());
    // DEBUG: observar qué información recibe Shopify
    
  expect(
    destination.searchParams.get('filter.v.option.tamaño')
  ).toBe(selectedSize);
  
    expect(destination.searchParams.get('filter.v.availability')).toBe('1');
  });


