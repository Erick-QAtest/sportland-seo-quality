import { type Page, type Locator } from '@playwright/test';
import { gotoRespectingRateLimit, skipIfBlocked } from '../services/rate-limit';

export class ProductPage {
  readonly page: Page;
  readonly productHeading: Locator;
  readonly addToCartButton: Locator;
  readonly sizePicker: Locator;

  constructor(page: Page) {
    this.page = page;

    this.productHeading = page.getByRole('heading', {
      level: 1
    });

    this.addToCartButton = page.getByRole('button', {
      name: /Agregar al carrito/i
    });

    // Las tallas viven en un radiogroup llamado "Selecciona tu talla".
    // Localizar por rol y nombre refleja lo que ve el usuario.
    this.sizePicker = page.getByRole('radiogroup', {
      name: 'Selecciona tu talla'
    });
  }

  async goto(
    productPath: string,
    variantId: string,
    size: string
  ): Promise<void> {
    const url = new URL(
      productPath,
      'https://sportlandmx.com'
    );

    url.searchParams.set('variant', variantId);
    url.searchParams.set('size', size);

    // Si Shopify frena (429), la prueba queda omitida, no en rojo.
    const response = await gotoRespectingRateLimit(this.page, url.toString());
    skipIfBlocked(response, productPath);
  }

  // El botón de una talla concreta, solo dentro del selector.
  // exact: true evita que "25" también encuentre "25.5".
  sizeButton(size: string): Locator {
    return this.sizePicker.getByRole('button', {
      name: size,
      exact: true
    });
  }

  // Elegir talla como lo hace un usuario, con un clic.
  async selectSize(size: string): Promise<void> {
    await this.sizeButton(size).click();
  }

  // La primera talla que el usuario PUEDE tocar (botón habilitado).
  // Así decide un humano; no hace falta consultar ninguna API.
  async firstAvailableSize(): Promise<string> {
    const firstEnabled = this.sizePicker.locator('button:enabled').first();
    await firstEnabled.waitFor({ state: 'visible' });
    return (await firstEnabled.innerText()).trim();
  }

  availabilityMessage(size: string): Locator {
    return this.page.getByText(
      `Talla ${size} disponible para envío inmediato`,
      { exact: false }
    );
  }
}