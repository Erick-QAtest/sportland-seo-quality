import type { APIRequestContext } from '@playwright/test';
import { XMLParser } from 'fast-xml-parser';

const SPORTLAND_ORIGIN = 'https://sportlandmx.com';

export type SitemapKind = 'index' | 'urlset';

export type SitemapLocale =
  | 'mx-default'
  | 'en-US'
  | 'de-DE'
  | 'other';

export interface SitemapParseResult {
  kind: SitemapKind;
  urls: string[];
}

export interface FetchedSitemap {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  contentType: string;
  kind: SitemapKind;
  urls: string[];
}

interface SitemapEntry {
  loc?: unknown;
}

interface ParsedSitemap {
  sitemapindex?: {
    sitemap?: SitemapEntry | SitemapEntry[];
  };
  urlset?: {
    url?: SitemapEntry | SitemapEntry[];
  };
}

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
});

function asArray<T>(
  value: T | T[] | undefined
): T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function extractUrls(
  entries: SitemapEntry[]
): string[] {
  const urls = entries
    .map(entry => entry.loc)
    .filter((value): value is string => {
      if (typeof value !== 'string') {
        return false;
      }

      try {
        const url = new URL(value.trim());

        return (
          url.protocol === 'http:' ||
          url.protocol === 'https:'
        );
      } catch {
        return false;
      }
    })
    .map(value => value.trim());

  return [...new Set(urls)];
}

export function classifySitemapLocale(
  url: string
): SitemapLocale {
  const parsedUrl = new URL(url);

  if (parsedUrl.origin !== SPORTLAND_ORIGIN) {
    return 'other';
  }

  const { pathname } = parsedUrl;

  if (
    pathname === '/en-us' ||
    pathname.startsWith('/en-us/')
  ) {
    return 'en-US';
  }

  if (
    pathname === '/de-de' ||
    pathname.startsWith('/de-de/')
  ) {
    return 'de-DE';
  }

  return 'mx-default';
}

export function parseSitemapXml(
  xml: string
): SitemapParseResult {
  const parsed = parser.parse(xml) as ParsedSitemap;

  if (parsed.sitemapindex) {
    return {
      kind: 'index',
      urls: extractUrls(
        asArray(parsed.sitemapindex.sitemap)
      ),
    };
  }

  if (parsed.urlset) {
    return {
      kind: 'urlset',
      urls: extractUrls(
        asArray(parsed.urlset.url)
      ),
    };
  }

  throw new Error(
    'El XML no contiene sitemapindex ni urlset'
  );
}

export async function fetchSitemap(
  request: APIRequestContext,
  sitemapUrl: string
): Promise<FetchedSitemap> {
  const response = await request.get(sitemapUrl, {
    failOnStatusCode: false,
    timeout: 30_000,
  });

  const status = response.status();
  const contentType =
    response.headers()['content-type'] ?? '';

  if (status !== 200) {
    throw new Error(
      `Sitemap HTTP ${status}: ${sitemapUrl}`
    );
  }

  const isXml = /^(application|text)\/xml\b/i
    .test(contentType);

  if (!isXml) {
    throw new Error(
      `Content-Type no XML: ${contentType || 'ausente'}`
    );
  }

  const xml = await response.text();
  const parsed = parseSitemapXml(xml);

  return {
    requestedUrl: sitemapUrl,
    finalUrl: response.url(),
    status,
    contentType,
    kind: parsed.kind,
    urls: parsed.urls,
  };
}