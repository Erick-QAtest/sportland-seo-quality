import {
    classifySitemapLocale,
    type SitemapLocale,
  } from './seo-crawler';

  const DEFAULT_PER_BUCKET = 2;

  const LOCALE_PREFIX_PATTERN =
    /^\/(?:en-us|de-de)(?=\/|$)/;

  export type SitemapPageType =
    | 'home'
    | 'product'
    | 'collection'
    | 'page'
    | 'blog'
    | 'article'
    | 'agentic'
    | 'other';

  export interface ClassifiedSitemapUrl {
    url: string;
    locale: SitemapLocale;
    pageType: SitemapPageType;
  }

  export interface SitemapSampleOptions {
    perBucket?: number;
    locales?: readonly SitemapLocale[];
    pageTypes?: readonly SitemapPageType[];
  }

  function normalizeMarketPath(
    pathname: string
  ): string {
    const normalizedPath = pathname.replace(
      LOCALE_PREFIX_PATTERN,
      ''
    );

    return normalizedPath || '/';
  }

  function matchesPathGroup(
    pathname: string,
    rootPath: string
  ): boolean {
    return (
      pathname === rootPath ||
      pathname.startsWith(`${rootPath}/`)
    );
  }

  function validatePerBucket(
    perBucket: number
  ): void {
    if (
      !Number.isInteger(perBucket) ||
      perBucket <= 0
    ) {
      throw new Error(
        'perBucket debe ser un entero mayor que cero'
      );
    }
  }

  export function classifySitemapPageType(
    url: string
  ): SitemapPageType {
    const parsedUrl = new URL(url);

    const pathname = normalizeMarketPath(
      parsedUrl.pathname
    );

    if (pathname === '/') {
      return 'home';
    }

    if (pathname === '/agents.md') {
      return 'agentic';
    }

    if (matchesPathGroup(pathname, '/products')) {
      return 'product';
    }

    if (
      matchesPathGroup(pathname, '/collections')
    ) {
      return 'collection';
    }

    if (matchesPathGroup(pathname, '/pages')) {
      return 'page';
    }

    if (matchesPathGroup(pathname, '/blogs')) {
      const segments = pathname
        .split('/')
        .filter(Boolean);

      return segments.length >= 3
        ? 'article'
        : 'blog';
    }

    return 'other';
  }

  export function classifySitemapPageUrl(
    url: string
  ): ClassifiedSitemapUrl {
    const normalizedUrl = new URL(
      url.trim()
    ).toString();

    return {
      url: normalizedUrl,
      locale: classifySitemapLocale(
        normalizedUrl
      ),
      pageType: classifySitemapPageType(
        normalizedUrl
      ),
    };
  }

  export function sampleSitemapPageUrls(
    pageUrls: readonly string[],
    options: SitemapSampleOptions = {}
  ): ClassifiedSitemapUrl[] {
    const perBucket =
      options.perBucket ?? DEFAULT_PER_BUCKET;

    validatePerBucket(perBucket);

    const allowedLocales = options.locales
      ? new Set(options.locales)
      : undefined;

    const allowedPageTypes = options.pageTypes
      ? new Set(options.pageTypes)
      : undefined;

    const normalizedUrls = [
      ...new Set(
        pageUrls.map(url =>
          new URL(url.trim()).toString()
        )
      ),
    ].sort((left, right) =>
      left.localeCompare(right)
    );

    const bucketCounts = new Map<
      string,
      number
    >();

    const sample: ClassifiedSitemapUrl[] = [];

    for (const url of normalizedUrls) {
      const classifiedUrl =
        classifySitemapPageUrl(url);

      if (
        allowedLocales &&
        !allowedLocales.has(classifiedUrl.locale)
      ) {
        continue;
      }

      if (
        allowedPageTypes &&
        !allowedPageTypes.has(
          classifiedUrl.pageType
        )
      ) {
        continue;
      }

      const bucketKey = [
        classifiedUrl.locale,
        classifiedUrl.pageType,
      ].join(':');

      const currentCount =
        bucketCounts.get(bucketKey) ?? 0;

      if (currentCount >= perBucket) {
        continue;
      }

      bucketCounts.set(
        bucketKey,
        currentCount + 1
      );

      sample.push(classifiedUrl);
    }

    return sample;
  }
