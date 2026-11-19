import {
    test,
    expect,
  } from '@playwright/test';

  import {
    auditInternationalSeoCluster,
    type InternationalMarket,
    type InternationalMarketExpectation,
    type InternationalSeoExpectation,
    type InternationalSeoSnapshot,
  } from '../../services/international-seo-auditor';

  import {
    captureInternationalSeoSnapshot,
  } from '../../services/international-seo-extractor';

  interface MarketConfig {
    market: InternationalMarket;
    prefix: string;
    htmlLang: string;
    hreflang: string;
  }

  interface RouteCluster {
    name: string;
    pathname: string;
  }

  const SPORTLAND_ORIGIN =
    'https://sportlandmx.com';

  const MARKET_CONFIGS:
    readonly MarketConfig[] = [
      {
        market: 'mx-default',
        prefix: '',
        htmlLang: 'es',
        hreflang: 'es',
      },
      {
        market: 'en-US',
        prefix: '/en-us',
        htmlLang: 'en',
        hreflang: 'en-US',
      },
      {
        market: 'de-DE',
        prefix: '/de-de',
        htmlLang: 'de',
        hreflang: 'de-DE',
      },
    ];

  const ROUTE_CLUSTERS:
    readonly RouteCluster[] = [
      {
        name: 'hub de tecnologías',
        pathname: '/pages/tecnologias-de-tenis',
      },
      {
        name: 'artículo de SoftFoam',
        pathname:
          '/blogs/noticias/cuales-son-los-beneficios-de-las-plantilla-soft-foam-puma',
      },
      {
        name: 'colección de SoftFoam',
        pathname:
          '/collections/tenis-puma-con-softfoam-y-softfoam',
      },
      {
        name: 'producto Adidas Advantage K',
        pathname: '/products/adidas-advantage-k',
      },
    ];

  function buildMarketUrl(
    prefix: string,
    pathname: string
  ): string {
    return `${SPORTLAND_ORIGIN}${prefix}${pathname}`;
  }

  function buildExpectation(
    pathname: string
  ): InternationalSeoExpectation {
    const markets:
      InternationalMarketExpectation[] =
      MARKET_CONFIGS.map(config => ({
        market: config.market,
        url: buildMarketUrl(
          config.prefix,
          pathname
        ),
        htmlLang: config.htmlLang,
        hreflang: config.hreflang,
      }));

    return {
      markets,
      xDefaultUrl: buildMarketUrl(
        '',
        pathname
      ),
    };
  }

  test.describe(
    'SEO-007: señales SEO internacionales',
    () => {
      test.setTimeout(120_000);

      test.beforeEach(async ({ page }) => {
        await page.route(
          '**/*',
          async route => {
            const resourceType =
              route.request().resourceType();

            const unnecessaryResource = [
              'image',
              'font',
              'media',
            ].includes(resourceType);

            if (unnecessaryResource) {
              await route.abort();
              return;
            }

            await route.continue();
          }
        );
      });

      for (const routeCluster of ROUTE_CLUSTERS) {
        test(
          `valida ${routeCluster.name}`,
          async ({ page }) => {
            const expectation =
              buildExpectation(
                routeCluster.pathname
              );

            const snapshots:
              InternationalSeoSnapshot[] = [];

            for (
              const marketExpectation
              of expectation.markets
            ) {
              await test.step(
                `Capturar ${marketExpectation.market}`,
                async () => {
                  const snapshot =
                    await captureInternationalSeoSnapshot(
                      page,
                      marketExpectation.market,
                      marketExpectation.url
                    );

                  snapshots.push(snapshot);
                }
              );
            }

            const audit =
              auditInternationalSeoCluster(
                snapshots,
                expectation
              );

            console.log(
              `Clúster: ${routeCluster.name}`
            );

            console.table(
              snapshots.map(snapshot => ({
                market: snapshot.market,
                status: snapshot.status,
                htmlLang: snapshot.htmlLang,
                title: snapshot.title,
                canonicalCount:
                  snapshot.canonicals.length,
                hreflangs:
                  snapshot.alternates
                    .map(alternate =>
                      alternate.hreflang
                    )
                    .join(', '),
              }))
            );

            console.log(
              'Resumen SEO internacional:',
              {
                findings:
                  audit.findings.length,
                errors: audit.errors.length,
                warnings:
                  audit.warnings.length,
                blocksGate:
                  audit.blocksGate,
              }
            );

            if (audit.findings.length > 0) {
              console.table(
                audit.findings.map(
                  finding => ({
                    severity:
                      finding.severity,
                    code: finding.code,
                    market:
                      finding.market ??
                      'cluster',
                    message:
                      finding.message,
                  })
                )
              );
            }

            expect(
              audit.errors,
              `${routeCluster.name} contiene errores técnicos`
            ).toEqual([]);

            expect(
              audit.blocksGate
            ).toBe(false);
          }
        );
      }
    }
  );
