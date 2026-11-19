import {
    test,
    expect,
  } from '@playwright/test';

  import {
    auditInternationalSeoCluster,
    type HreflangAlternate,
    type InternationalMarket,
    type InternationalSeoExpectation,
    type InternationalSeoSnapshot,
  } from '../../services/international-seo-auditor';

  const MX_URL =
    'https://sportlandmx.com/pages/2do-suscribete';

  const US_URL =
    'https://sportlandmx.com/en-us/pages/2do-suscribete';

  const DE_URL =
    'https://sportlandmx.com/de-de/pages/2do-suscribete';

  const EXPECTATION = {
    xDefaultUrl: MX_URL,
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
  } satisfies InternationalSeoExpectation;

  const LOCALIZED_TITLES:
    Record<
      InternationalMarket,
      string
    > = {
      'mx-default':
        'Gracias por suscribirte – SPORTLAND MX',
      'en-US':
        'Thanks for subscribing – SPORTLAND MX',
      'de-DE':
        'Danke für deine Anmeldung – SPORTLAND MX',
    };

  function createAlternates():
    HreflangAlternate[] {
    return [
      {
        hreflang: 'x-default',
        href: MX_URL,
      },
      {
        hreflang: 'es',
        href: MX_URL,
      },
      {
        hreflang: 'en-US',
        href: US_URL,
      },
      {
        hreflang: 'de-DE',
        href: DE_URL,
      },
    ];
  }

  function createSnapshot(
    market: InternationalMarket,
    overrides:
      Partial<
        Omit<
          InternationalSeoSnapshot,
          'market'
        >
      > = {}
  ): InternationalSeoSnapshot {
    const marketExpectation =
      EXPECTATION.markets.find(
        item =>
          item.market === market
      );

    if (!marketExpectation) {
      throw new Error(
        `Mercado sin configuración: ${market}`
      );
    }

    return {
      market,
      requestedUrl:
        marketExpectation.url,
      finalUrl:
        marketExpectation.url,
      status: 200,
      htmlLang:
        marketExpectation.htmlLang,
      title:
        LOCALIZED_TITLES[market],
      canonicals: [
        marketExpectation.url,
      ],
      alternates:
        createAlternates(),
      ...overrides,
    };
  }

  function createHealthyCluster():
    InternationalSeoSnapshot[] {
    return [
      createSnapshot('mx-default'),
      createSnapshot('en-US'),
      createSnapshot('de-DE'),
    ];
  }

  test.describe(
    'SEO-007: auditor internacional',
    () => {
      test(
        'acepta un cluster internacional correcto',
        () => {
          const result =
            auditInternationalSeoCluster(
              createHealthyCluster(),
              EXPECTATION
            );

          expect(result).toEqual({
            findings: [],
            errors: [],
            warnings: [],
            blocksGate: false,
          });
        }
      );

      test(
        'reporta títulos idénticos como warning no bloqueante',
        () => {
          const sharedTitle =
            'Gracias por suscribirte – SPORTLAND MX';

          const snapshots = [
            createSnapshot(
              'mx-default',
              {
                title: sharedTitle,
              }
            ),
            createSnapshot(
              'en-US',
              {
                title: sharedTitle,
              }
            ),
            createSnapshot(
              'de-DE',
              {
                title: sharedTitle,
              }
            ),
          ];

          const result =
            auditInternationalSeoCluster(
              snapshots,
              EXPECTATION
            );

          expect(
            result.errors
          ).toEqual([]);

          expect(
            result.warnings.map(
              finding =>
                finding.code
            )
          ).toEqual([
            'identical-titles',
          ]);

          expect(
            result.blocksGate
          ).toBe(false);
        }
      );

      test(
        'bloquea lang, canonical y URL final incorrectos',
        () => {
          const snapshots =
            createHealthyCluster();

          snapshots[1] =
            createSnapshot(
              'en-US',
              {
                finalUrl: MX_URL,
                htmlLang: 'es',
                canonicals: [
                  MX_URL,
                ],
              }
            );

          const result =
            auditInternationalSeoCluster(
              snapshots,
              EXPECTATION
            );

          const codes =
            result.errors.map(
              finding =>
                finding.code
            );

          expect(codes).toEqual(
            expect.arrayContaining([
              'final-url-mismatch',
              'html-lang-mismatch',
              'canonical-mismatch',
            ])
          );

          expect(
            result.blocksGate
          ).toBe(true);
        }
      );

      test(
        'detecta hreflang faltante y destino incorrecto',
        () => {
          const brokenAlternates =
            createAlternates()
              .filter(
                alternate =>
                  alternate.hreflang !==
                  'de-DE'
              )
              .map(alternate =>
                alternate.hreflang ===
                'en-US'
                  ? {
                      ...alternate,
                      href: MX_URL,
                    }
                  : alternate
              );

          const snapshots =
            createHealthyCluster();

          snapshots[1] =
            createSnapshot(
              'en-US',
              {
                alternates:
                  brokenAlternates,
              }
            );

          const result =
            auditInternationalSeoCluster(
              snapshots,
              EXPECTATION
            );

          const codes =
            result.errors.map(
              finding =>
                finding.code
            );

          expect(codes).toEqual(
            expect.arrayContaining([
              'missing-hreflang',
              'hreflang-target-mismatch',
            ])
          );

          expect(
            result.blocksGate
          ).toBe(true);
        }
      );

      test(
        'normaliza mayúsculas y detecta hreflang duplicado o inesperado',
        () => {
          const alternates = [
            ...createAlternates(),
            {
              hreflang: 'EN-us',
              href: US_URL,
            },
            {
              hreflang: 'fr-FR',
              href:
                'https://sportlandmx.com/fr-fr/pages/2do-suscribete',
            },
          ];

          const snapshots =
            createHealthyCluster();

          snapshots[2] =
            createSnapshot(
              'de-DE',
              {
                alternates,
              }
            );

          const result =
            auditInternationalSeoCluster(
              snapshots,
              EXPECTATION
            );

          expect(
            result.errors.map(
              finding =>
                finding.code
            )
          ).toContain(
            'duplicate-hreflang'
          );

          expect(
            result.warnings.map(
              finding =>
                finding.code
            )
          ).toContain(
            'unexpected-hreflang'
          );

          expect(
            result.blocksGate
          ).toBe(true);
        }
      );

      test(
        'bloquea HTTP no 200, title vacío y canonical ausente',
        () => {
          const snapshots =
            createHealthyCluster();

          snapshots[2] =
            createSnapshot(
              'de-DE',
              {
                status: 404,
                title: '   ',
                canonicals: [],
              }
            );

          const result =
            auditInternationalSeoCluster(
              snapshots,
              EXPECTATION
            );

          expect(
            result.errors.map(
              finding =>
                finding.code
            )
          ).toEqual(
            expect.arrayContaining([
              'http-status',
              'missing-title',
              'canonical-count',
            ])
          );

          expect(
            result.blocksGate
          ).toBe(true);
        }
      );

      test(
        'bloquea cuando falta un mercado',
        () => {
          const snapshots = [
            createSnapshot(
              'mx-default'
            ),
            createSnapshot(
              'en-US'
            ),
          ];

          const result =
            auditInternationalSeoCluster(
              snapshots,
              EXPECTATION
            );

          expect(
            result.errors.map(
              finding =>
                finding.code
            )
          ).toContain(
            'missing-market-snapshot'
          );

          expect(
            result.blocksGate
          ).toBe(true);
        }
      );
    }
  );
