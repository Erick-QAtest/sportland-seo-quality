import { test, expect } from '@playwright/test';

import {
  classifySitemapLocale,
  fetchSitemap,
} from '../../services/seo-crawler';

const ROOT_SITEMAP =
  'https://sportlandmx.com/sitemap.xml';

test(
  'SEO-006: contrato del sitemap raíz',
  async ({ request }) => {
    const sitemap = await fetchSitemap(
      request,
      ROOT_SITEMAP
    );

    console.log('Sitemap raíz:', {
      status: sitemap.status,
      contentType: sitemap.contentType,
      kind: sitemap.kind,
      childSitemaps: sitemap.urls.length,
    });

    console.table(
      sitemap.urls.map(url => ({
        locale: classifySitemapLocale(url),
        url,
      }))
    );

    expect(sitemap.status).toBe(200);
    expect(sitemap.contentType).toContain(
      'application/xml'
    );
    expect(sitemap.finalUrl).toBe(ROOT_SITEMAP);
    expect(sitemap.kind).toBe('index');
    expect(sitemap.urls.length).toBeGreaterThan(0);

    for (const url of sitemap.urls) {
      expect(new URL(url).origin).toBe(
        'https://sportlandmx.com'
      );
    }
  }
);