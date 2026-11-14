
import { test as base } from '@playwright/test';
import { SoftfoamArticlePage } from '../../pages/SoftfoamArticlePage';

type Fixtures = {
  softfoamArticle: SoftfoamArticlePage;
};

export const test = base.extend<Fixtures>({
  softfoamArticle: async ({ page }, use) => {
    const article = new SoftfoamArticlePage(page);

    await use(article);
  },
});

export { expect } from '@playwright/test';
