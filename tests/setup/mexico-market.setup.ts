import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = 'https://sportlandmx.com';

const marketState = path.join(
  __dirname,
  '../../playwright/.auth/mexico.json'
);

setup('seleccionar mercado México', async ({ page }) => {
  // Crear la carpeta para el estado si todavía no existe.
  await fs.mkdir(
    path.dirname(marketState),
    { recursive: true }
  );

  // Seleccionar México mediante Shopify Localization.
  const response = await page.request.post(
    `${BASE_URL}/localization`,
    {
      form: {
        form_type: 'localization',
        utf8: '✓',
        _method: 'put',
        country_code: 'MX',
        language_code: 'es',
        return_to: '/',
      },
    }
  );

  expect(response.ok()).toBeTruthy();

  // Comprobar que Shopify no mantuvo el mercado estadounidense.
  await page.goto(BASE_URL, {
    waitUntil: 'domcontentloaded',
  });

  expect(
    new URL(page.url()).pathname,
    'Shopify mantuvo el mercado de Estados Unidos'
  ).not.toMatch(/^\/en-us(?:\/|$)/);

  // Guardar cookies y preferencias para los demás tests.
  await page.context().storageState({
    path: marketState,
  });
});