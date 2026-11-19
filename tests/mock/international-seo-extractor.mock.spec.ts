import {
    test,
    expect,
    type Page,
  } from '@playwright/test';

  import {
    captureInternationalSeoSnapshot,
  } from '../../services/international-seo-extractor';

  async function mockHtmlPage(
    page: Page,
    url: string,
    html: string
  ): Promise<void> {
    await page.route(
      url,
      async route => {
        await route.fulfill({
          status: 200,
          contentType:
            'text/html; charset=utf-8',
          body: html,
        });
      }
    );
  }

  test.describe(
    'SEO-007: extractor internacional',
    () => {
      test(
        'extrae lang, title, canonical y hreflang del DOM',
        async ({ page }) => {
          const pageUrl =
            'https://sportland.test/en-us/pages/example';

          await mockHtmlPage(
            page,
            pageUrl,
            `
              <!doctype html>
              <html lang="en">
                <head>
                  <title>Thanks for subscribing – SPORTLAND MX</title>

                  <link
                    rel="canonical"
                    href="/en-us/pages/example"
                  >

                  <link
                    rel="alternate"
                    hreflang="x-default"
                    href="/pages/example"
                  >

                  <link
                    rel="alternate"
                    hreflang="es"
                    href="/pages/example"
                  >

                  <link
                    rel="alternate"
                    hreflang="en-US"
                    href="/en-us/pages/example"
                  >

                  <link
                    rel="alternate"
                    hreflang="de-DE"
                    href="/de-de/pages/example"
                  >
                </head>

                <body>
                  <h1>Example</h1>
                </body>
              </html>
            `
          );

          const snapshot =
            await captureInternationalSeoSnapshot(
              page,
              'en-US',
              pageUrl
            );

          expect(snapshot).toEqual({
            market: 'en-US',
            requestedUrl: pageUrl,
            finalUrl: pageUrl,
            status: 200,
            htmlLang: 'en',
            title:
              'Thanks for subscribing – SPORTLAND MX',
            canonicals: [
              pageUrl,
            ],
            alternates: [
              {
                hreflang:
                  'x-default',
                href:
                  'https://sportland.test/pages/example',
              },
              {
                hreflang: 'es',
                href:
                  'https://sportland.test/pages/example',
              },
              {
                hreflang:
                  'en-US',
                href: pageUrl,
              },
              {
                hreflang:
                  'de-DE',
                href:
                  'https://sportland.test/de-de/pages/example',
              },
            ],
          });
        }
      );

      test(
        'conserva duplicados para que el auditor pueda detectarlos',
        async ({ page }) => {
          const pageUrl =
            'https://sportland.test/en-us/pages/duplicates';

          await mockHtmlPage(
            page,
            pageUrl,
            `
              <!doctype html>
              <html lang="en">
                <head>
                  <title>Duplicate signals</title>

                  <link
                    rel="canonical"
                    href="/canonical-one"
                  >

                  <link
                    rel="canonical"
                    href="/canonical-two"
                  >

                  <link
                    rel="alternate"
                    hreflang="en-US"
                    href="/alternate-one"
                  >

                  <link
                    rel="alternate"
                    hreflang="EN-us"
                    href="/alternate-two"
                  >
                </head>

                <body>
                  <h1>Duplicates</h1>
                </body>
              </html>
            `
          );

          const snapshot =
            await captureInternationalSeoSnapshot(
              page,
              'en-US',
              pageUrl
            );

          expect(
            snapshot.canonicals
          ).toEqual([
            'https://sportland.test/canonical-one',
            'https://sportland.test/canonical-two',
          ]);

          expect(
            snapshot.alternates
          ).toEqual([
            {
              hreflang: 'en-US',
              href:
                'https://sportland.test/alternate-one',
            },
            {
              hreflang: 'EN-us',
              href:
                'https://sportland.test/alternate-two',
            },
          ]);
        }
      );

      test(
        'rechaza un timeout inválido antes de navegar',
        async ({ page }) => {
          await expect(
            captureInternationalSeoSnapshot(
              page,
              'mx-default',
              'https://sportland.test/pages/example',
              {
                timeoutMs: 0,
              }
            )
          ).rejects.toThrow(
            'timeoutMs debe ser un entero mayor que cero'
          );
        }
      );
    }
  );
