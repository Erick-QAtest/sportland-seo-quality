import { type Page, type Locator } from '@playwright/test';
import type { RelatedBlockSnapshot } from '../services/related-products';

export class ArticlePage {
  readonly page: Page;
  readonly relatedSection: Locator;
  readonly productCards: Locator;
  readonly collectionLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.relatedSection = page.locator('section.sl-related-section');
    this.productCards = this.relatedSection.locator('article.sl-product-card');
    this.collectionLink = this.relatedSection.locator('header a');
  }

  async goto(articlePath: string) {
    return this.page.goto(articlePath);
  }

  // Extrae datos, no decide nada. Las decisiones están en el servicio.
  async readRelatedBlock(): Promise<RelatedBlockSnapshot> {
    const present = (await this.relatedSection.count()) > 0;
    if (!present) return { present, collectionHref: null, productPaths: [] };

    const collectionHref = await this.collectionLink.first().getAttribute('href');
    const hrefs = await this.productCards
      .locator('h3 a')
      .evaluateAll(links => links.map(a => (a as HTMLAnchorElement).getAttribute('href') ?? ''));

    const productPaths = hrefs.map(h =>
      new URL(h, 'https://sportlandmx.com').pathname.replace(/^\/[a-z]{2}-[a-z]{2}(?=\/)/, '')
    );
    return { present, collectionHref, productPaths };
  }
}