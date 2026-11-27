import { test, expect } from '../fixtures/softfoam.fixture';
import { routes } from '../../data/routes';
import { gotoRespectingRateLimit, skipIfBlocked } from '../../services/rate-limit';

test('SF-001: el artículo SoftFoam carga correctamente', async ({ page }) => {
  // ARRANGE: definimos la URL que queremos probar.
  const url = 'https://sportlandmx.com' + routes.softfoamArticle;

  // ACT: navegamos al artículo.
  const response = await gotoRespectingRateLimit(page, url);
  skipIfBlocked(response, routes.softfoamArticle);

  // ASSERT: comprobamos la respuesta del servidor.
  expect(response?.status()).toBe(200);

  // ASSERT: comprobamos que existe un H1 visible.
  await expect(page.locator('h1').first()).toBeVisible();
});




test('SF-002: el usuario puede seleccionar una talla MX', async ({ softfoamArticle }) => {

    // ARRANGE: navegar al artículo
    await softfoamArticle.goto();
  
    // ASSERT: comprobar que el selector está disponible
    await expect(softfoamArticle.sizeSelector).toBeVisible();
    await expect(softfoamArticle.sizeSelector).toBeEnabled();
  
    // ARRANGE: obtener tallas seleccionables
    const sizes = await softfoamArticle.getAvailableSizes();
    const selectedSize = sizes[0];
  
    // ACT: seleccionar una talla
    await softfoamArticle.selectSize(selectedSize);
  
    // ASSERT: verificar la selección
    await expect(softfoamArticle.sizeSelector).toHaveValue(selectedSize);
  });
  
  

  
test('SF-003: la talla se transmite a la colección', async ({ page, softfoamArticle }) => {
    // ARRANGE
    await softfoamArticle.goto();
  
    const sizes = await softfoamArticle.getAvailableSizes();
    const selectedSize = sizes[0];
  
    // ACT
    await softfoamArticle.selectSize(selectedSize);
    await softfoamArticle.submitSize();
  
    // ASSERT: verificar navegación
    await expect(page).toHaveURL(
      /\/collections\/tenis-puma-con-softfoam-y-softfoam/
    );
  
    // ASSERT: verificar reglas de negocio
    const destination = new URL(page.url());
  
    expect(
      destination.searchParams.get('filter.v.option.tamaño')
    ).toBe(selectedSize);
    expect(
      destination.searchParams.get('filter.v.availability')
    ).toBe('1');
  });
