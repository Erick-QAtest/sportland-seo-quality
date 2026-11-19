import { test, expect } from '@playwright/test';

import type {
  FetchedSitemap,
  SitemapKind,
} from '../../services/seo-crawler';

import {
  discoverSitemapGraph,
  type SitemapFetcher,
} from '../../services/sitemap-discovery';

const ROOT =
  'https://sportlandmx.com/sitemap.xml';

function createSitemap(
  url: string,
  kind: SitemapKind,
  urls: string[]
): FetchedSitemap {
  return {
    requestedUrl: url,
    finalUrl: url,
    status: 200,
    contentType: 'application/xml',
    kind,
    urls,
  };
}

function createFetcher(
  sitemapGraph: Map<string, FetchedSitemap>
): SitemapFetcher {
  return async sitemapUrl => {
    const sitemap = sitemapGraph.get(sitemapUrl);

    if (!sitemap) {
      throw new Error(
        `Sitemap simulado no encontrado: ${sitemapUrl}`
      );
    }

    return sitemap;
  };
}

test.describe(
  'SEO-006: descubrimiento de sitemaps',
  () => {
    test('recorre hijos y elimina páginas duplicadas', async () => {
      const products =
        'https://sportlandmx.com/sitemap_products.xml';

      const pages =
        'https://sportlandmx.com/sitemap_pages.xml';

      const graph = new Map<string, FetchedSitemap>([
        [
          ROOT,
          createSitemap(
            ROOT,
            'index',
            [products, pages, products]
          ),
        ],
        [
          products,
          createSitemap(
            products,
            'urlset',
            [
              'https://sportlandmx.com/products/puma',
              'https://sportlandmx.com/products/puma',
            ]
          ),
        ],
        [
          pages,
          createSitemap(
            pages,
            'urlset',
            [
              'https://sportlandmx.com/pages/tecnologias',
              'https://example.com/external-page',
            ]
          ),
        ],
      ]);

      const result = await discoverSitemapGraph(
        ROOT,
        createFetcher(graph)
      );

      expect(
        result.sitemaps.map(
          sitemap => sitemap.requestedUrl
        )
      ).toEqual([
        ROOT,
        products,
        pages,
      ]);

      expect(result.pageUrls).toEqual([
        'https://sportlandmx.com/products/puma',
        'https://sportlandmx.com/pages/tecnologias',
      ]);

      expect(result.externalPageUrls).toEqual([
        'https://example.com/external-page',
      ]);
    });

    test('rechaza sitemaps hijos externos', async () => {
      const externalSitemap =
        'https://example.com/sitemap.xml';

      const graph = new Map<string, FetchedSitemap>([
        [
          ROOT,
          createSitemap(
            ROOT,
            'index',
            [externalSitemap]
          ),
        ],
      ]);

      await expect(
        discoverSitemapGraph(
          ROOT,
          createFetcher(graph)
        )
      ).rejects.toThrow(
        `Sitemap hijo externo no permitido: ${externalSitemap}`
      );
    });

    test('detiene grafos que superan el límite', async () => {
      const first =
        'https://sportlandmx.com/first.xml';

      const second =
        'https://sportlandmx.com/second.xml';

      const graph = new Map<string, FetchedSitemap>([
        [
          ROOT,
          createSitemap(
            ROOT,
            'index',
            [first, second]
          ),
        ],
        [
          first,
          createSitemap(
            first,
            'urlset',
            []
          ),
        ],
        [
          second,
          createSitemap(
            second,
            'urlset',
            []
          ),
        ],
      ]);

      await expect(
        discoverSitemapGraph(
          ROOT,
          createFetcher(graph),
          {
            maxSitemaps: 2,
          }
        )
      ).rejects.toThrow(
        'Límite de 2 sitemaps excedido'
      );
    });
  }
);