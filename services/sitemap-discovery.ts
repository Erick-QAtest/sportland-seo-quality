import type {
    APIRequestContext,
  } from '@playwright/test';

  import {
    fetchSitemap,
    type FetchedSitemap,
  } from './seo-crawler';

  const DEFAULT_MAX_SITEMAPS = 50;

  export type SitemapFetcher = (
    sitemapUrl: string
  ) => Promise<FetchedSitemap>;

  export interface SitemapDiscoveryOptions {
    maxSitemaps?: number;
  }

  export interface SitemapDiscoveryResult {
    rootUrl: string;
    sitemaps: FetchedSitemap[];
    pageUrls: string[];
    externalPageUrls: string[];
  }

  function assertSameOrigin(
    url: string,
    allowedOrigin: string,
    resourceType: string
  ): void {
    const origin = new URL(url).origin;

    if (origin !== allowedOrigin) {
      throw new Error(
        `${resourceType} externo no permitido: ${url}`
      );
    }
  }

  function validateMaxSitemaps(
    maxSitemaps: number
  ): void {
    if (
      !Number.isInteger(maxSitemaps) ||
      maxSitemaps <= 0
    ) {
      throw new Error(
        'maxSitemaps debe ser un entero mayor que cero'
      );
    }
  }

  export async function discoverSitemapGraph(
    rootUrl: string,
    fetcher: SitemapFetcher,
    options: SitemapDiscoveryOptions = {}
  ): Promise<SitemapDiscoveryResult> {
    const maxSitemaps =
      options.maxSitemaps ?? DEFAULT_MAX_SITEMAPS;

    validateMaxSitemaps(maxSitemaps);

    const allowedOrigin = new URL(rootUrl).origin;

    const queue = [rootUrl];
    const scheduled = new Set(queue);
    const visited = new Set<string>();

    const sitemaps: FetchedSitemap[] = [];
    const pageUrls = new Set<string>();
    const externalPageUrls = new Set<string>();

    while (queue.length > 0) {
      const currentUrl = queue.shift();

      if (!currentUrl || visited.has(currentUrl)) {
        continue;
      }

      if (visited.size >= maxSitemaps) {
        throw new Error(
          `Límite de ${maxSitemaps} sitemaps excedido`
        );
      }

      assertSameOrigin(
        currentUrl,
        allowedOrigin,
        'Sitemap'
      );

      visited.add(currentUrl);

      const sitemap = await fetcher(currentUrl);

      assertSameOrigin(
        sitemap.finalUrl,
        allowedOrigin,
        'Redirección de sitemap'
      );

      sitemaps.push(sitemap);

      if (sitemap.kind === 'index') {
        for (const childUrl of sitemap.urls) {
          assertSameOrigin(
            childUrl,
            allowedOrigin,
            'Sitemap hijo'
          );

          if (!scheduled.has(childUrl)) {
            scheduled.add(childUrl);
            queue.push(childUrl);
          }
        }

        continue;
      }

      for (const pageUrl of sitemap.urls) {
        const pageOrigin = new URL(pageUrl).origin;

        if (pageOrigin === allowedOrigin) {
          pageUrls.add(pageUrl);
        } else {
          externalPageUrls.add(pageUrl);
        }
      }
    }

    return {
      rootUrl,
      sitemaps,
      pageUrls: [...pageUrls],
      externalPageUrls: [...externalPageUrls],
    };
  }

  export async function discoverSitemapUrls(
    request: APIRequestContext,
    rootUrl: string,
    options: SitemapDiscoveryOptions = {}
  ): Promise<SitemapDiscoveryResult> {
    return discoverSitemapGraph(
      rootUrl,
      sitemapUrl => fetchSitemap(
        request,
        sitemapUrl
      ),
      options
    );
  }