
import { expect, type Page, type Locator } from '@playwright/test';
import { routes } from '../data/routes';
import { getSelectableSizes } from '../helpers/getSelectableSizes';
import { gotoRespectingRateLimit, skipIfBlocked } from '../services/rate-limit';

export class SoftfoamArticlePage {
  readonly page: Page;
  readonly sizeSelector: Locator;
  readonly sizeForm: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sizeSelector = page.locator('#sf3-size-choice');
    this.sizeForm = page.locator('#sf3-size-form');
  }

  async goto(): Promise<void> {
    // Si Shopify frena (429), la prueba queda omitida, no en rojo.
    const response = await gotoRespectingRateLimit(
      this.page,
      'https://sportlandmx.com' + routes.softfoamArticle
    );
    skipIfBlocked(response, routes.softfoamArticle);
  }

  async getAvailableSizes(): Promise<string[]> {
    return getSelectableSizes(this.sizeSelector);
  }

  async selectSize(size: string): Promise<void> {
    await this.sizeSelector.selectOption(size);
  }

  async submitSize(): Promise<void> {
    await this.sizeForm
      .locator('button[type="submit"], input[type="submit"]')
      .click();
  }
}
