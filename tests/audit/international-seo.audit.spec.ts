import {
    test,
    expect,
  } from '@playwright/test';

  import {
    auditInternationalSeoCluster,
    type InternationalSeoExpectation,
    type InternationalSeoSnapshot,
  } from '../../services/international-seo-auditor';

  import {
    captureInternationalSeoSnapshot,
  } from '../../services/international-seo-extractor';

  const MX_URL =
    'https://sportlandmx.com/pages/2do-suscribete';

  const US_URL =
    'https://sportlandmx.com/en-us/pages/2do-suscribete';

  const DE_URL =
    'https://sportlandmx.com/de-de/pages/2do-suscribete';

  const EXPECTATION: InternationalSeoExpectation = {
    markets: [
      {
        market: 'mx-default',
        url: MX_URL,
        htmlLang: 'es',
        hreflang: 'es',
      },
      {
        market: 'en-US',
        url: US_URL,
        htmlLang: 'en',
        hreflang: 'en-US',
      },
      {
        market: 'de-DE',
        url: DE_URL,
        htmlLang: 'de',
        hreflang: 'de-DE',
      },
    ],
    xDefaultUrl: MX_URL,
  };

  test.describe(
    'SEO-007: señales SEO internacionales',
    () => {
      test.setTimeout(90_000);

      test(
        'valida el clúster MX, US y DE',
        async ({ page }) => {
          await page.route('**/*', async route => {
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
          });

          const snapshots:
            InternationalSeoSnapshot[] = [];

          for (
            const marketExpectation
            of EXPECTATION.markets
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

          const audit =
            auditInternationalSeoCluster(
              snapshots,
              EXPECTATION
            );

          console.log(
            'Resumen SEO internacional:',
            {
              snapshots: snapshots.length,
              findings: audit.findings.length,
              errors: audit.errors.length,
              warnings: audit.warnings.length,
              blocksGate: audit.blocksGate,
            }
          );

          if (audit.findings.length > 0) {
            console.table(
              audit.findings.map(finding => ({
                severity: finding.severity,
                code: finding.code,
                market:
                  finding.market ?? 'cluster',
                url: finding.url ?? '',
                message: finding.message,
              }))
            );
          }

          expect(
            audit.errors,
            'El clúster internacional contiene errores técnicos'
          ).toEqual([]);

          expect(
            audit.blocksGate,
            'Los errores internacionales no deben permitir continuar'
          ).toBe(false);
        }
      );
    }
  );
