import type {
    Page,
  } from '@playwright/test';

  import type {
    InternationalMarket,
    InternationalSeoSnapshot,
  } from './international-seo-auditor';

  const DEFAULT_TIMEOUT_MS = 30_000;

  export interface SnapshotExtractionInput {
    market: InternationalMarket;
    requestedUrl: string;
    status: number;
  }

  export interface SnapshotCaptureOptions {
    timeoutMs?: number;
  }

  function validateTimeout(
    timeoutMs: number
  ): void {
    if (
      !Number.isInteger(timeoutMs) ||
      timeoutMs <= 0
    ) {
      throw new Error(
        'timeoutMs debe ser un entero mayor que cero'
      );
    }
  }

  export async function extractInternationalSeoSnapshot(
    page: Page,
    input: SnapshotExtractionInput
  ): Promise<InternationalSeoSnapshot> {
    const signals = await page.evaluate(
      () => {
        const links = Array.from(
          document.querySelectorAll<HTMLLinkElement>(
            'link[rel][href]'
          )
        );

        const hasRel = (
          link: HTMLLinkElement,
          expectedRel: string
        ): boolean => {
          return link.rel
            .toLowerCase()
            .split(/\s+/)
            .includes(expectedRel);
        };

        const canonicals = links
          .filter(link =>
            hasRel(
              link,
              'canonical'
            )
          )
          .map(link => link.href);

        const alternates = links
          .filter(link =>
            hasRel(
              link,
              'alternate'
            )
          )
          .filter(link =>
            link.hasAttribute(
              'hreflang'
            )
          )
          .map(link => ({
            hreflang:
              link
                .getAttribute(
                  'hreflang'
                )
                ?.trim() ?? '',
            href: link.href,
          }));

        return {
          htmlLang:
            document.documentElement
              .getAttribute('lang')
              ?.trim() ?? '',
          title:
            document.title.trim(),
          canonicals,
          alternates,
        };
      }
    );

    return {
      market: input.market,
      requestedUrl:
        input.requestedUrl,
      finalUrl: page.url(),
      status: input.status,
      htmlLang:
        signals.htmlLang,
      title:
        signals.title,
      canonicals:
        signals.canonicals,
      alternates:
        signals.alternates,
    };
  }

  export async function captureInternationalSeoSnapshot(
    page: Page,
    market: InternationalMarket,
    requestedUrl: string,
    options: SnapshotCaptureOptions = {}
  ): Promise<InternationalSeoSnapshot> {
    const timeoutMs =
      options.timeoutMs ??
      DEFAULT_TIMEOUT_MS;

    validateTimeout(timeoutMs);

    new URL(requestedUrl);

    const response = await page.goto(
      requestedUrl,
      {
        waitUntil:
          'domcontentloaded',
        timeout: timeoutMs,
      }
    );

    if (!response) {
      throw new Error(
        `Navegación sin respuesta HTTP: ${requestedUrl}`
      );
    }

    return extractInternationalSeoSnapshot(
      page,
      {
        market,
        requestedUrl,
        status:
          response.status(),
      }
    );
  }
