import {
  test,
  expect,
} from '@playwright/test';

import {
  auditHttpUrl,
  type HttpAuditResult,
} from '../../services/http-transport';

import {
  discoverSitemapUrls,
} from '../../services/sitemap-discovery';

import {
  sampleSitemapPageUrls,
  type ClassifiedSitemapUrl,
} from '../../services/url-sampler';

const ROOT_SITEMAP =
  'https://sportlandmx.com/sitemap.xml';

const PACING_MS = 750;

const HTTP_PAGE_TYPES = [
  'home',
  'page',
  'blog',
  'article',
  'agentic',
] as const;

const BROWSER_PAGE_TYPES = [
  'product',
  'collection',
] as const;

interface HttpAuditedSample {
  sampledUrl: ClassifiedSitemapUrl;
  audit: HttpAuditResult;
}

interface BrowserAuditedSample {
  sampledUrl: ClassifiedSitemapUrl;
  finalUrl: string;
  status: number;
  redirected: boolean;
  h1Count: number;
  title: string;
}

interface AuditFailure {
  channel: 'http' | 'browser';
  sampledUrl: ClassifiedSitemapUrl;
  error: string;
}

function errorMessage(
  error: unknown
): string {
  return error instanceof Error
    ? error.message
    : String(error);
}

function pause(
  milliseconds: number
): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

test.describe(
  'SEO-006: salud de URLs del sitemap',
  () => {
    test.setTimeout(180_000);

    test(
      'audita contenido informativo por HTTP y comercio en navegador',
      async ({ request, page }) => {
        const discovery =
          await discoverSitemapUrls(
            request,
            ROOT_SITEMAP,
            {
              maxSitemaps: 50,
            }
          );

        const httpSample =
          sampleSitemapPageUrls(
            discovery.pageUrls,
            {
              perBucket: 1,
              pageTypes:
                HTTP_PAGE_TYPES,
            }
          );

        const browserSample =
          sampleSitemapPageUrls(
            discovery.pageUrls,
            {
              perBucket: 1,
              pageTypes:
                BROWSER_PAGE_TYPES,
            }
          );

        const httpResults:
          HttpAuditedSample[] = [];

        const browserResults:
          BrowserAuditedSample[] = [];

        const failures: AuditFailure[] = [];

        /*
         * HTTP ligero para contenido informativo.
         * La pausa es intencional para respetar
         * la infraestructura de Shopify.
         */
        for (
          const sampledUrl of httpSample
        ) {
          try {
            const audit =
              await auditHttpUrl(
                request,
                sampledUrl.url,
                {
                  maxRedirects: 5,
                  timeoutMs: 15_000,
                  allowExternalRedirects:
                    false,
                }
              );

            httpResults.push({
              sampledUrl,
              audit,
            });
          } catch (error) {
            failures.push({
              channel: 'http',
              sampledUrl,
              error:
                errorMessage(error),
            });
          }

          await pause(PACING_MS);
        }

        /*
         * Reducimos recursos secundarios.
         * El documento HTML, CSS y JavaScript
         * siguen cargándose normalmente.
         */
        await page.route(
          '**/*',
          async route => {
            const resourceType =
              route.request()
                .resourceType();

            if (
              [
                'image',
                'font',
                'media',
              ].includes(resourceType)
            ) {
              await route.abort();
              return;
            }

            await route.continue();
          }
        );

        /*
         * Productos y colecciones se validan
         * mediante Chromium porque Shopify
         * limita clientes HTTP genéricos.
         */
        for (
          const sampledUrl of browserSample
        ) {
          try {
            const response =
              await page.goto(
                sampledUrl.url,
                {
                  waitUntil:
                    'domcontentloaded',
                  timeout: 30_000,
                }
              );

            if (!response) {
              throw new Error(
                'Navegación sin respuesta HTTP'
              );
            }

            const finalUrl =
              new URL(
                page.url()
              ).toString();

            const title =
              await page.title();

            const h1Count =
              await page
                .locator('h1')
                .count();

            browserResults.push({
              sampledUrl,
              finalUrl,
              status:
                response.status(),
              redirected:
                finalUrl !==
                sampledUrl.url,
              h1Count,
              title,
            });
          } catch (error) {
            failures.push({
              channel: 'browser',
              sampledUrl,
              error:
                errorMessage(error),
            });
          }

          await pause(PACING_MS);
        }

        const blockingHttpResults =
          httpResults.filter(
            result =>
              result.audit.blocksGate
          );

        const unhealthyBrowserResults =
          browserResults.filter(
            result =>
              result.status < 200 ||
              result.status >= 300 ||
              result.h1Count === 0 ||
              result.title.trim()
                .length === 0
          );

        console.log(
          'Auditoría de salud:',
          {
            discovered:
              discovery.pageUrls.length,
            httpSampled:
              httpSample.length,
            browserSampled:
              browserSample.length,
            httpAudited:
              httpResults.length,
            browserAudited:
              browserResults.length,
            failures:
              failures.length,
            blockingHttp:
              blockingHttpResults.length,
            unhealthyBrowser:
              unhealthyBrowserResults
                .length,
          }
        );

        console.log(
          'Contenido informativo · HTTP'
        );

        console.table(
          httpResults.map(
            ({ sampledUrl, audit }) => ({
              locale:
                sampledUrl.locale,
              pageType:
                sampledUrl.pageType,
              status:
                audit.finalStatus,
              redirects:
                audit.redirects.length,
              severity:
                audit.severity,
              url:
                sampledUrl.url,
            })
          )
        );

        console.log(
          'Comercio · navegador'
        );

        console.table(
          browserResults.map(
            result => ({
              locale:
                result.sampledUrl
                  .locale,
              pageType:
                result.sampledUrl
                  .pageType,
              status:
                result.status,
              redirected:
                result.redirected,
              h1:
                result.h1Count,
              title:
                result.title.slice(
                  0,
                  70
                ),
              url:
                result.sampledUrl
                  .url,
            })
          )
        );

        if (failures.length > 0) {
          console.log(
            'Errores de auditoría'
          );

          console.table(
            failures.map(
              failure => ({
                channel:
                  failure.channel,
                locale:
                  failure.sampledUrl
                    .locale,
                pageType:
                  failure.sampledUrl
                    .pageType,
                url:
                  failure.sampledUrl
                    .url,
                error:
                  failure.error,
              })
            )
          );
        }

        expect(
          httpSample.length
        ).toBeGreaterThan(0);

        expect(
          browserSample.length
        ).toBeGreaterThan(0);

        expect.soft(
          failures,
          'No debe haber errores de transporte o navegación'
        ).toEqual([]);

        expect.soft(
          blockingHttpResults.map(
            ({ sampledUrl, audit }) => ({
              url:
                sampledUrl.url,
              status:
                audit.finalStatus,
              severity:
                audit.severity,
            })
          ),
          'El contenido informativo no debe bloquear el gate'
        ).toEqual([]);

        expect.soft(
          unhealthyBrowserResults.map(
            result => ({
              url:
                result.sampledUrl
                  .url,
              status:
                result.status,
              h1:
                result.h1Count,
              title:
                result.title,
            })
          ),
          'Productos y colecciones deben cargar correctamente en navegador'
        ).toEqual([]);

        expect(
          httpResults.length +
            browserResults.length +
            failures.length
        ).toBe(
          httpSample.length +
            browserSample.length
        );
      }
    );
  }
);