
import type { Page } from '@playwright/test';

export type LinkCategory =
  | 'commercial'
  | 'navigation'
  | 'editorial'
  | 'unclassified';

export interface LinkDetail {
  text: string;
  category: LinkCategory;
  parentTag: string;
  parentClass: string;
  href: string;
}

export async function auditLinks(
  page: Page,
  target: string
): Promise<LinkDetail[]> {

  const links = page.locator('main a[href]');

  return links.evaluateAll((elements, expectedTarget) => {
    return elements
      .filter(element => {
        const anchor = element as HTMLAnchorElement;
        const url = new URL(anchor.href);

        return (
          url.origin === 'https://sportlandmx.com' &&
          url.pathname === expectedTarget
        );
      })
      .map(element => {
        const anchor = element as HTMLAnchorElement;
        const parent = anchor.parentElement;

        const parentTag = parent?.tagName ?? 'UNKNOWN';
        const parentClass =
          parent?.className?.toString() ?? '';

        let category: LinkCategory = 'unclassified';

        if (parentClass.includes('commerce-actions')) {
          category = 'commercial';
        } else if (parentTag === 'NAV') {
          category = 'navigation';
        } else if (parentTag === 'P') {
          category = 'editorial';
        }

        return {
          text: (anchor.innerText || '')
            .trim()
            .replace(/\s+/g, ' ')
            .slice(0, 100),
          category,
          parentTag,
          parentClass,
          href: anchor.href
        };
      });
  }, target);
}
