import { test, expect } from '@playwright/test';

import {
  classifySitemapLocale,
  type SitemapLocale,
} from '../../services/seo-crawler';

import {
  discoverSitemapUrls,
} from '../../services/sitemap-discovery';

const ROOT_SITEMAP =
  'https://sportlandmx.com/sitemap.xml';

function emptyLocaleSummary(): Record<
  SitemapLocale,
  number
> {
  return {
    'mx-default': 0,
    'en-US': 0,
    'de-DE': 0,
    other: 0,
  };
}

test.describe(
  'SEO-006: auditoría de descubrimiento',
  () => {
    test.setTimeout(120_000);

    test(
      'descubre las URLs publicadas en los sitemaps',
      async ({ request }) => {
        const discovery = await discoverSitemapUrls(
          request,
          ROOT_SITEMAP,
          {
            maxSitemaps: 50,
          }
        );

        const sitemapSummary = emptyLocaleSummary();
        const pageSummary = emptyLocaleSummary();

        for (const sitemap of discovery.sitemaps) {
          const locale = classifySitemapLocale(
            sitemap.requestedUrl
          );

          sitemapSummary[locale] += 1;
        }

        for (const pageUrl of discovery.pageUrls) {
          const locale = classifySitemapLocale(
            pageUrl
          );

          pageSummary[locale] += 1;
        }

        console.log('Descubrimiento:', {
          rootUrl: discovery.rootUrl,
          sitemaps: discovery.sitemaps.length,
          pages: discovery.pageUrls.length,
          externalPages:
            discovery.externalPageUrls.length,
        });

        console.table(
          Object.keys(pageSummary).map(locale => ({
            locale,
            sitemaps:
              sitemapSummary[
                locale as SitemapLocale
              ],
            pages:
              pageSummary[
                locale as SitemapLocale
              ],
          }))
        );

        expect(
          discovery.sitemaps.length
        ).toBeGreaterThan(1);

        expect(
          discovery.pageUrls.length
        ).toBeGreaterThan(0);

        expect(
          discovery.externalPageUrls
        ).toEqual([]);
      }
    );
  }
);