import { test, expect } from '@playwright/test';

import {
  classifySitemapLocale,
  parseSitemapXml,
} from '../../services/seo-crawler';

test.describe('SEO-006: parser de sitemap', () => {
  test('extrae sitemaps hijos de un sitemap index', () => {
    const xml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <sitemapindex>
        <sitemap>
          <loc>https://sportlandmx.com/sitemap_products.xml</loc>
        </sitemap>
        <sitemap>
          <loc>https://sportlandmx.com/sitemap_pages.xml</loc>
        </sitemap>
      </sitemapindex>
    `;

    const result = parseSitemapXml(xml);

    expect(result).toEqual({
      kind: 'index',
      urls: [
        'https://sportlandmx.com/sitemap_products.xml',
        'https://sportlandmx.com/sitemap_pages.xml',
      ],
    });
  });

  test('extrae URLs, elimina duplicados e ignora protocolos inválidos', () => {
    const xml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset>
        <url>
          <loc>https://sportlandmx.com/pages/tecnologias-de-tenis</loc>
        </url>
        <url>
          <loc>https://sportlandmx.com/pages/tecnologias-de-tenis</loc>
        </url>
        <url>
          <loc>ftp://sportlandmx.com/archivo</loc>
        </url>
      </urlset>
    `;

    const result = parseSitemapXml(xml);

    expect(result).toEqual({
      kind: 'urlset',
      urls: [
        'https://sportlandmx.com/pages/tecnologias-de-tenis',
      ],
    });
  });

  test('decodifica entidades XML en URLs de Shopify', () => {
    const xml = `
      <sitemapindex>
        <sitemap>
          <loc>
            https://sportlandmx.com/sitemap_products_1.xml?from=4552782217270&amp;to=15492080730335
          </loc>
        </sitemap>
      </sitemapindex>
    `;

    const result = parseSitemapXml(xml);

    expect(result.urls).toEqual([
      'https://sportlandmx.com/sitemap_products_1.xml?from=4552782217270&to=15492080730335',
    ]);
  });

  test('clasifica mercados sin confundir dominios externos', () => {
    const cases = [
      {
        url: 'https://sportlandmx.com/products/puma',
        expected: 'mx-default',
      },
      {
        url: 'https://sportlandmx.com/en-us/products/puma',
        expected: 'en-US',
      },
      {
        url: 'https://sportlandmx.com/de-de/products/puma',
        expected: 'de-DE',
      },
      {
        url: 'https://example.com/en-us/products/puma',
        expected: 'other',
      },
    ] as const;

    for (const scenario of cases) {
      expect(
        classifySitemapLocale(scenario.url)
      ).toBe(scenario.expected);
    }
  });

  test('rechaza XML que no representa un sitemap', () => {
    const xml = `
      <rss>
        <channel>Contenido ajeno al sitemap</channel>
      </rss>
    `;

    expect(() => parseSitemapXml(xml)).toThrow(
      'El XML no contiene sitemapindex ni urlset'
    );
  });
});