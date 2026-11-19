import { test, expect } from '@playwright/test';

import {
  classifySitemapPageUrl,
  sampleSitemapPageUrls,
} from '../../services/url-sampler';

test.describe('URL sampler: clasificación y muestreo', () => {
  test('clasifica mercado y tipo de página', () => {
    const scenarios = [
      {
        url: 'https://sportlandmx.com/',
        locale: 'mx-default',
        pageType: 'home',
      },
      {
        url: 'https://sportlandmx.com/products/puma-caven',
        locale: 'mx-default',
        pageType: 'product',
      },
      {
        url: 'https://sportlandmx.com/en-us/collections/sale',
        locale: 'en-US',
        pageType: 'collection',
      },
      {
        url: 'https://sportlandmx.com/de-de/pages/marken',
        locale: 'de-DE',
        pageType: 'page',
      },
      {
        url: 'https://sportlandmx.com/blogs/noticias',
        locale: 'mx-default',
        pageType: 'blog',
      },
      {
        url: 'https://sportlandmx.com/blogs/noticias/que-es-softfoam',
        locale: 'mx-default',
        pageType: 'article',
      },
      {
        url: 'https://sportlandmx.com/agents.md',
        locale: 'mx-default',
        pageType: 'agentic',
      },
    ] as const;

    for (const scenario of scenarios) {
      expect(
        classifySitemapPageUrl(scenario.url)
      ).toMatchObject({
        locale: scenario.locale,
        pageType: scenario.pageType,
      });
    }
  });

  test('clasifica dominios externos y rutas desconocidas', () => {
    expect(
      classifySitemapPageUrl(
        'https://example.com/products/external'
      )
    ).toMatchObject({
      locale: 'other',
      pageType: 'product',
    });

    expect(
      classifySitemapPageUrl(
        'https://sportlandmx.com/search'
      )
    ).toMatchObject({
      locale: 'mx-default',
      pageType: 'other',
    });
  });

  test('limita y elimina duplicados dentro de cada bucket', () => {
    const urls = [
      'https://sportlandmx.com/products/c',
      'https://sportlandmx.com/products/a',
      'https://sportlandmx.com/products/b',
      'https://sportlandmx.com/products/a',

      'https://sportlandmx.com/pages/c',
      'https://sportlandmx.com/pages/a',
      'https://sportlandmx.com/pages/b',

      'https://sportlandmx.com/en-us/products/c',
      'https://sportlandmx.com/en-us/products/a',
      'https://sportlandmx.com/en-us/products/b',
    ];

    const result = sampleSitemapPageUrls(
      urls,
      {
        perBucket: 2,
      }
    );

    expect(
      result.map(item => item.url)
    ).toEqual([
      'https://sportlandmx.com/en-us/products/a',
      'https://sportlandmx.com/en-us/products/b',
      'https://sportlandmx.com/pages/a',
      'https://sportlandmx.com/pages/b',
      'https://sportlandmx.com/products/a',
      'https://sportlandmx.com/products/b',
    ]);
  });

  test('produce la misma muestra aunque cambie el orden de entrada', () => {
    const urls = [
      'https://sportlandmx.com/products/z',
      'https://sportlandmx.com/products/a',
      'https://sportlandmx.com/products/m',
      'https://sportlandmx.com/pages/tecnologias',
      'https://sportlandmx.com/en-us/products/shoe',
    ];

    const originalSample =
      sampleSitemapPageUrls(urls);

    const reversedSample =
      sampleSitemapPageUrls(
        [...urls].reverse()
      );

    expect(reversedSample).toEqual(
      originalSample
    );
  });

  test('filtra por mercado y tipo de página', () => {
    const urls = [
      'https://sportlandmx.com/products/mx-product',
      'https://sportlandmx.com/pages/mx-page',
      'https://sportlandmx.com/en-us/products/us-product',
      'https://sportlandmx.com/en-us/pages/us-page',
      'https://sportlandmx.com/de-de/pages/de-page',
    ];

    const result = sampleSitemapPageUrls(
      urls,
      {
        locales: ['en-US'],
        pageTypes: ['page'],
        perBucket: 1,
      }
    );

    expect(result).toEqual([
      {
        url: 'https://sportlandmx.com/en-us/pages/us-page',
        locale: 'en-US',
        pageType: 'page',
      },
    ]);
  });

  test('rechaza límites inválidos', () => {
    expect(() =>
      sampleSitemapPageUrls([], {
        perBucket: 0,
      })
    ).toThrow(
      'perBucket debe ser un entero mayor que cero'
    );

    expect(() =>
      sampleSitemapPageUrls([], {
        perBucket: 1.5,
      })
    ).toThrow(
      'perBucket debe ser un entero mayor que cero'
    );
  });
});