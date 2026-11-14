
import { type Page, type Locator } from '@playwright/test';

export class ProductPage {
  readonly page: Page;
  readonly productHeading: Locator;
  readonly addToCartButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.productHeading = page.getByRole('heading', {
      level: 1
    });

    this.addToCartButton = page.getByRole('button', {
      name: /Agregar al carrito/i
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

    await this.page.goto(url.toString());
  }

  availabilityMessage(size: string): Locator {
    return this.page.getByText(
      `Talla ${size} disponible para envío inmediato`,
      { exact: false }
    );
  }
    
  }

